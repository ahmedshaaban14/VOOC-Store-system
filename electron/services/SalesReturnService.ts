import { eq, desc, sql } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import {
  sales,
  saleItems,
  salesReturns,
  salesReturnItems,
  products,
  stockMovements,
  cashTransactions,
} from '../db/schema';
import {
  CreateSalesReturnInput,
  ReturnableSaleItem,
  SalesReturn,
  Sale,
  ServiceResult,
} from '../../src/shared/types';
import { CashRegisterService } from './CashRegisterService';
import { AuditLogService } from './AuditLogService';

export class SalesReturnService {
  // Generate safe sequential sales return number (e.g. SRET-000001)
  private static generateReturnNumber(): string {
    const db = getDb();
    if (!db) return `SRET-${Date.now().toString().slice(-6)}`;

    try {
      const result = db.select({ maxId: sql<number>`max(${salesReturns.id})` }).from(salesReturns).get();
      const nextId = (result?.maxId || 0) + 1;
      return `SRET-${String(nextId).padStart(6, '0')}`;
    } catch (e) {
      console.warn('Fallback sales return numbering:', e);
      return `SRET-${Date.now().toString().slice(-6)}`;
    }
  }

  // Get returnable details & calculate remaining returnable quantities for a sale invoice
  static async getReturnableSaleDetails(
    saleId: number
  ): Promise<{ sale: Sale; items: ReturnableSaleItem[] } | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const sale = db.select().from(sales).where(eq(sales.id, saleId)).get();
      if (!sale) return null;

      const rawItems = db
        .select({
          id: saleItems.id,
          saleId: saleItems.saleId,
          productId: saleItems.productId,
          productName: products.name,
          productBarcode: products.barcode,
          quantity: saleItems.quantity,
          unitPrice: saleItems.unitPrice,
          totalPrice: saleItems.totalPrice,
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, saleId))
        .all();

      const returnableItems: ReturnableSaleItem[] = [];

      for (const item of rawItems) {
        // Sum already returned quantity for this item
        const previousReturns = db
          .select({
            totalReturned: sql<number>`COALESCE(SUM(${salesReturnItems.quantity}), 0)`.mapWith(Number),
          })
          .from(salesReturnItems)
          .leftJoin(salesReturns, eq(salesReturnItems.returnId, salesReturns.id))
          .where(sql`${salesReturns.saleId} = ${saleId} AND ${salesReturnItems.productId} = ${item.productId}`)
          .get();

        const alreadyReturnedQty = previousReturns?.totalReturned || 0;
        const returnableQty = Math.max(0, item.quantity - alreadyReturnedQty);

        returnableItems.push({
          ...item,
          productName: item.productName || `منتج #${item.productId}`,
          productBarcode: item.productBarcode || '',
          originalSoldQty: item.quantity,
          alreadyReturnedQty,
          returnableQty,
          returnQty: 0,
        });
      }

      return {
        sale: { ...sale, paymentType: (sale.paymentType === 'CARD' ? 'CARD' : 'CASH') as 'CASH' | 'CARD' },
        items: returnableItems,
      };
    } catch (err) {
      console.error('Error fetching returnable sale details:', err);
      return null;
    }
  }

  // Atomic Sales Return Transaction Execution
  static async createSalesReturn(input: CreateSalesReturnInput): Promise<ServiceResult<SalesReturn>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const details = await this.getReturnableSaleDetails(input.saleId);
      if (!details) {
        return { success: false, error: 'فاتورة المبيعات المحددة غير موجودة!' };
      }

      const { sale, items: returnableItems } = details;

      if (!input.items || input.items.length === 0) {
        return { success: false, error: 'يرجى تحديد صنف واحد على الأقل لإرجاعه!' };
      }

      let calculatedRefund = 0;
      const validReturnItemsList: { productId: number; returnQty: number; unitPrice: number }[] = [];

      for (const returnReq of input.items) {
        if (!returnReq.returnQty || returnReq.returnQty <= 0) continue;

        const targetItem = returnableItems.find((i) => i.productId === returnReq.productId);
        if (!targetItem) {
          return { success: false, error: `المنتج رقم [${returnReq.productId}] غير مدرج بهذه الفاتورة` };
        }

        if (returnReq.returnQty > targetItem.returnableQty) {
          return {
            success: false,
            error: `لا يمكن إرجاع كمية أكبر من الكمية المباعة! الكمية المتاحة للإرجاع للمنتج [${targetItem.productName}] هي (${targetItem.returnableQty} قطعة) فقط.`,
          };
        }

        const lineRefund = returnReq.returnQty * targetItem.unitPrice; // Stored historical sale unit price
        calculatedRefund += lineRefund;

        validReturnItemsList.push({
          productId: returnReq.productId,
          returnQty: returnReq.returnQty,
          unitPrice: targetItem.unitPrice,
        });
      }

      if (validReturnItemsList.length === 0) {
        return { success: false, error: 'لم يتم تحديد أي كميات صالحة للإرجاع!' };
      }

      // Check Cash Balance if original sale was CASH
      if (sale.paymentType === 'CASH') {
        const currentBalance = await CashRegisterService.getCurrentBalance();
        if (calculatedRefund > currentBalance) {
          return {
            success: false,
            error: `الرصيد الحالي بالخزينة (${currentBalance} ج.م) لا يكفي لدفع قيمة المرتجع النقدي (${calculatedRefund} ج.م)!`,
          };
        }
      }

      const now = new Date().toISOString();
      const returnNumber = this.generateReturnNumber();

      // Multi-Record Atomic Transaction
      const insertedReturn = db
        .insert(salesReturns)
        .values({
          returnNumber,
          saleId: input.saleId,
          totalAmount: calculatedRefund,
          refundAmount: calculatedRefund,
          paymentType: sale.paymentType === 'CARD' ? 'CARD' : 'CASH',
          notes: input.notes || `مرتجع مبيعات للفاتورة رقم ${sale.invoiceNumber}`,
          createdAt: now,
        })
        .returning()
        .get();

      const returnId = insertedReturn.id;
      const insertedReturnItems: any[] = [];

      for (const itemReq of validReturnItemsList) {
        const prod = db.select().from(products).where(eq(products.id, itemReq.productId)).get();
        if (!prod) throw new Error(`المنتج [${itemReq.productId}] غير موجود`);

        const previousStock = prod.currentStock;
        const newStock = previousStock + itemReq.returnQty;

        const origSaleItem = db
          .select()
          .from(saleItems)
          .where(eq(saleItems.saleId, input.saleId))
          .all()
          .find((si) => si.productId === itemReq.productId);

        const unitCost = Number(origSaleItem?.unitCost || prod.purchasePrice || 0);
        const totalCost = itemReq.returnQty * unitCost;

        // a. Insert Sales Return Item
        const insertedItem = db
          .insert(salesReturnItems)
          .values({
            returnId,
            productId: itemReq.productId,
            quantity: itemReq.returnQty,
            unitPrice: itemReq.unitPrice,
            totalPrice: itemReq.returnQty * itemReq.unitPrice,
            unitCost,
            totalCost,
          })
          .returning()
          .get();

        insertedReturnItems.push({
          ...insertedItem,
          productName: prod.name,
          productBarcode: prod.barcode,
        });

        // b. Increase Stock in Products table (+qty)
        db.update(products)
          .set({
            currentStock: newStock,
            updatedAt: now,
          })
          .where(eq(products.id, itemReq.productId))
          .run();

        // c. Create Stock Movement Ledger Entry (SALE_RETURN, +qty)
        db.insert(stockMovements)
          .values({
            productId: itemReq.productId,
            movementType: 'SALE_RETURN',
            quantityChange: itemReq.returnQty,
            previousStock,
            newStock,
            referenceId: returnNumber,
            notes: `مرتجع مبيعات فاتورة ${sale.invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      // d. Record Cash OUT Transaction if CASH sale
      if (sale.paymentType === 'CASH') {
        db.insert(cashTransactions)
          .values({
            type: 'OUT',
            amount: calculatedRefund,
            category: 'مرتجع مبيعات',
            referenceType: 'SALE_RETURN',
            referenceId: returnNumber,
            notes: `رد قيمة مرتجع مبيعات نقدي للفاتورة ${sale.invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CREATE_SALES_RETURN',
        'SALES_RETURN',
        returnId,
        `تم إضافة مرتجع مبيعات رقم ${returnNumber} للفاتورة ${sale.invoiceNumber} بمبلغ ${calculatedRefund} ج.م`,
        { returnNumber, invoiceNumber: sale.invoiceNumber, refundAmount: calculatedRefund }
      );

      return {
        success: true,
        data: {
          ...insertedReturn,
          paymentType: insertedReturn.paymentType as 'CASH' | 'CARD',
          saleInvoiceNumber: sale.invoiceNumber,
          items: insertedReturnItems,
        },
      };
    } catch (err: any) {
      console.error('Error executing sales return:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تنفيذ مرتجع المبيعات' };
    }
  }

  // Get All Sales Returns
  static async getAllSalesReturns(): Promise<SalesReturn[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: salesReturns.id,
          returnNumber: salesReturns.returnNumber,
          saleId: salesReturns.saleId,
          saleInvoiceNumber: sales.invoiceNumber,
          totalAmount: salesReturns.totalAmount,
          refundAmount: salesReturns.refundAmount,
          paymentType: salesReturns.paymentType,
          notes: salesReturns.notes,
          createdAt: salesReturns.createdAt,
        })
        .from(salesReturns)
        .leftJoin(sales, eq(salesReturns.saleId, sales.id))
        .orderBy(desc(salesReturns.createdAt))
        .all();

      return result as SalesReturn[];
    } catch (err) {
      console.error('Error fetching sales returns:', err);
      return [];
    }
  }
}
