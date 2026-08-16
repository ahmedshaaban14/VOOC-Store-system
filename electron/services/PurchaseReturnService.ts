import { eq, desc, sql } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import {
  purchases,
  purchaseItems,
  purchaseReturns,
  purchaseReturnItems,
  products,
  stockMovements,
  cashTransactions,
} from '../db/schema';
import {
  CreatePurchaseReturnInput,
  ReturnablePurchaseItem,
  PurchaseReturn,
  Purchase,
  ServiceResult,
} from '../../src/shared/types';
import { AuditLogService } from './AuditLogService';

export class PurchaseReturnService {
  // Generate safe sequential purchase return number (e.g. PRET-000001)
  private static generateReturnNumber(): string {
    const db = getDb();
    if (!db) return `PRET-${Date.now().toString().slice(-6)}`;

    try {
      const result = db.select({ maxId: sql<number>`max(${purchaseReturns.id})` }).from(purchaseReturns).get();
      const nextId = (result?.maxId || 0) + 1;
      return `PRET-${String(nextId).padStart(6, '0')}`;
    } catch (e) {
      console.warn('Fallback purchase return numbering:', e);
      return `PRET-${Date.now().toString().slice(-6)}`;
    }
  }

  // Get returnable details & calculate remaining returnable quantities for a purchase invoice
  static async getReturnablePurchaseDetails(
    purchaseId: number
  ): Promise<{ purchase: Purchase; items: ReturnablePurchaseItem[] } | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const purchase = db.select().from(purchases).where(eq(purchases.id, purchaseId)).get();
      if (!purchase) return null;

      const rawItems = db
        .select({
          id: purchaseItems.id,
          purchaseId: purchaseItems.purchaseId,
          productId: purchaseItems.productId,
          productName: products.name,
          productBarcode: products.barcode,
          quantity: purchaseItems.quantity,
          unitCost: purchaseItems.unitCost,
          totalCost: purchaseItems.totalCost,
          currentStock: products.currentStock,
        })
        .from(purchaseItems)
        .leftJoin(products, eq(purchaseItems.productId, products.id))
        .where(eq(purchaseItems.purchaseId, purchaseId))
        .all();

      const returnableItems: ReturnablePurchaseItem[] = [];

      for (const item of rawItems) {
        // Sum already returned quantity for this purchase item
        const previousReturns = db
          .select({
            totalReturned: sql<number>`COALESCE(SUM(${purchaseReturnItems.quantity}), 0)`.mapWith(Number),
          })
          .from(purchaseReturnItems)
          .leftJoin(purchaseReturns, eq(purchaseReturnItems.returnId, purchaseReturns.id))
          .where(sql`${purchaseReturns.purchaseId} = ${purchaseId} AND ${purchaseReturnItems.productId} = ${item.productId}`)
          .get();

        const alreadyReturnedQty = previousReturns?.totalReturned || 0;
        const returnableQty = Math.max(0, item.quantity - alreadyReturnedQty);

        returnableItems.push({
          ...item,
          productName: item.productName || `منتج #${item.productId}`,
          productBarcode: item.productBarcode || '',
          originalPurchasedQty: item.quantity,
          alreadyReturnedQty,
          returnableQty,
          returnQty: 0,
          currentStock: item.currentStock || 0,
        });
      }

      return {
        purchase: { ...purchase, status: purchase.status as 'COMPLETED' },
        items: returnableItems,
      };
    } catch (err) {
      console.error('Error fetching returnable purchase details:', err);
      return null;
    }
  }

  // Atomic Purchase Return Transaction Execution
  static async createPurchaseReturn(input: CreatePurchaseReturnInput): Promise<ServiceResult<PurchaseReturn>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const details = await this.getReturnablePurchaseDetails(input.purchaseId);
      if (!details) {
        return { success: false, error: 'فاتورة المشتريات المحددة غير موجودة!' };
      }

      const { purchase, items: returnableItems } = details;

      if (!input.items || input.items.length === 0) {
        return { success: false, error: 'يرجى تحديد صنف واحد على الأقل لإرجاعه!' };
      }

      let calculatedRefund = 0;
      const validReturnItemsList: { productId: number; returnQty: number; unitCost: number }[] = [];

      for (const returnReq of input.items) {
        if (!returnReq.returnQty || returnReq.returnQty <= 0) continue;

        const targetItem = returnableItems.find((i) => i.productId === returnReq.productId);
        if (!targetItem) {
          return { success: false, error: `المنتج رقم [${returnReq.productId}] غير مدرج بهذه الفاتورة` };
        }

        // 1. Purchase Quantity Rule
        if (returnReq.returnQty > targetItem.returnableQty) {
          return {
            success: false,
            error: `لا يمكن إرجاع كمية أكبر من الكمية المشتراة! الكمية المتاحة للإرجاع للمنتج [${targetItem.productName}] هي (${targetItem.returnableQty} قطعة) فقط.`,
          };
        }

        // 2. Stock Availability Guard (currentStock >= returnQty)
        if (targetItem.currentStock < returnReq.returnQty) {
          return {
            success: false,
            error: `الكمية المرتجعة للمنتج [${targetItem.productName}] هي (${returnReq.returnQty} قطعة)، بينما المخزون الحالي بالمعرض (${targetItem.currentStock} قطعة) فقط! لا يمكن إرجاع ما ليس موجوداً بالمخزن.`,
          };
        }

        const lineRefund = returnReq.returnQty * targetItem.unitCost; // Stored historical purchase unit cost
        calculatedRefund += lineRefund;

        validReturnItemsList.push({
          productId: returnReq.productId,
          returnQty: returnReq.returnQty,
          unitCost: targetItem.unitCost,
        });
      }

      if (validReturnItemsList.length === 0) {
        return { success: false, error: 'لم يتم تحديد أي كميات صالحة للإرجاع!' };
      }

      const now = new Date().toISOString();
      const returnNumber = this.generateReturnNumber();

      // Multi-Record Atomic Transaction
      const insertedReturn = db
        .insert(purchaseReturns)
        .values({
          returnNumber,
          purchaseId: input.purchaseId,
          totalAmount: calculatedRefund,
          refundAmount: calculatedRefund,
          paymentType: 'CASH',
          notes: input.notes || `مرتجع مشتريات للفاتورة رقم ${purchase.invoiceNumber}`,
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
        const newStock = previousStock - itemReq.returnQty;

        // a. Insert Purchase Return Item
        const insertedItem = db
          .insert(purchaseReturnItems)
          .values({
            returnId,
            productId: itemReq.productId,
            quantity: itemReq.returnQty,
            unitCost: itemReq.unitCost,
            totalCost: itemReq.returnQty * itemReq.unitCost,
          })
          .returning()
          .get();

        insertedReturnItems.push({
          ...insertedItem,
          productName: prod.name,
          productBarcode: prod.barcode,
        });

        // b. Decrease Stock in Products table (-qty)
        db.update(products)
          .set({
            currentStock: newStock,
            updatedAt: now,
          })
          .where(eq(products.id, itemReq.productId))
          .run();

        // c. Create Stock Movement Ledger Entry (PURCHASE_RETURN, -qty)
        db.insert(stockMovements)
          .values({
            productId: itemReq.productId,
            movementType: 'PURCHASE_RETURN',
            quantityChange: -itemReq.returnQty,
            previousStock,
            newStock,
            referenceId: returnNumber,
            notes: `مرتجع مشتريات فاتورة ${purchase.invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      // d. Record Cash IN Transaction (Supplier refunds cash to store)
      db.insert(cashTransactions)
        .values({
          type: 'IN',
          amount: calculatedRefund,
          category: 'مرتجع مشتريات',
          referenceType: 'PURCHASE_RETURN',
          referenceId: returnNumber,
          notes: `تحصيل قيمة مرتجع مشتريات نقدي للفاتورة ${purchase.invoiceNumber}`,
          createdAt: now,
        })
        .run();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CREATE_PURCHASE_RETURN',
        'PURCHASE_RETURN',
        returnId,
        `تم إضافة مرتجع مشتريات رقم ${returnNumber} للفاتورة ${purchase.invoiceNumber} بمبلغ ${calculatedRefund} ج.م`,
        { returnNumber, invoiceNumber: purchase.invoiceNumber, refundAmount: calculatedRefund }
      );

      return {
        success: true,
        data: {
          ...insertedReturn,
          paymentType: insertedReturn.paymentType as 'CASH' | 'CARD',
          purchaseInvoiceNumber: purchase.invoiceNumber,
          items: insertedReturnItems,
        },
      };
    } catch (err: any) {
      console.error('Error executing purchase return:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تنفيذ مرتجع المشتريات' };
    }
  }

  // Get All Purchase Returns
  static async getAllPurchaseReturns(): Promise<PurchaseReturn[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: purchaseReturns.id,
          returnNumber: purchaseReturns.returnNumber,
          purchaseId: purchaseReturns.purchaseId,
          purchaseInvoiceNumber: purchases.invoiceNumber,
          totalAmount: purchaseReturns.totalAmount,
          refundAmount: purchaseReturns.refundAmount,
          paymentType: purchaseReturns.paymentType,
          notes: purchaseReturns.notes,
          createdAt: purchaseReturns.createdAt,
        })
        .from(purchaseReturns)
        .leftJoin(purchases, eq(purchaseReturns.purchaseId, purchases.id))
        .orderBy(desc(purchaseReturns.createdAt))
        .all();

      return result as PurchaseReturn[];
    } catch (err) {
      console.error('Error fetching purchase returns:', err);
      return [];
    }
  }
}
