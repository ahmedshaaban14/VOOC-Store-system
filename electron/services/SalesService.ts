import { eq, desc, sql } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { sales, saleItems, products, stockMovements, cashTransactions, users, customers } from '../db/schema';
import { CreateSaleInput, SaleWithItems, Sale, ServiceResult } from '../../src/shared/types';
import { AuthService } from './AuthService';
import { AuditLogService } from './AuditLogService';

export class SalesService {
  // Generate safe sequential invoice number (e.g. INV-000001)
  private static generateInvoiceNumber(): string {
    const db = getDb();
    if (!db) return `INV-${Date.now().toString().slice(-6)}`;

    try {
      const result = db.select({ maxId: sql<number>`max(${sales.id})` }).from(sales).get();
      const nextId = (result?.maxId || 0) + 1;
      return `INV-${String(nextId).padStart(6, '0')}`;
    } catch (e) {
      console.warn('Fallback invoice numbering:', e);
      return `INV-${Date.now().toString().slice(-6)}`;
    }
  }

  // Atomic Sales Execution
  static async createSale(input: CreateSaleInput): Promise<ServiceResult<SaleWithItems>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      // 1. Basic Cart Validation
      if (!input.items || input.items.length === 0) {
        return { success: false, error: 'لا يمكن إتمام البيع: سلة المشتريات فارغة' };
      }

      // 2. Quantity & Stock Availability Check (Before Any State Mutation)
      for (const item of input.items) {
        if (!item.quantity || item.quantity <= 0) {
          return { success: false, error: 'كمية المنتج يجب أن تكون أكبر من الصفر' };
        }
        if (item.unitPrice < 0) {
          return { success: false, error: 'سعر البيع لا يمكن أن يكون سالباً' };
        }

        const product = db.select().from(products).where(eq(products.id, item.productId)).get();
        if (!product) {
          return { success: false, error: `المنتج رقم (${item.productId}) غير موجود في قاعدة البيانات` };
        }

        if (product.currentStock < item.quantity) {
          return {
            success: false,
            error: `الكمية المطلوبة من المنتج [${product.name}] (${item.quantity}) غير متوفرة بالمخزن! الرصيد المتاح: (${product.currentStock})`,
          };
        }
      }

      // 3. Financial Calculation & Validation
      let subtotal = 0;
      for (const item of input.items) {
        subtotal += item.quantity * item.unitPrice;
      }

      const discount = Math.max(0, input.discountAmount || 0);
      if (discount > subtotal) {
        return { success: false, error: 'قيمة الخصم لا يمكن أن تتجاوز إجمالي الفاتورة' };
      }

      const netAmount = subtotal - discount;
      const paidAmount = Number(input.paidAmount);

      // Guard: Full payment is strictly required (No debts/receivables allowed)
      if (paidAmount < netAmount) {
        return {
          success: false,
          error: `المبلغ المدفوع (${paidAmount} ج.م) أقل من الصافي المطلوب (${netAmount} ج.م)! المبيعات الآجلة غير مفعلة.`,
        };
      }

      const now = new Date().toISOString();
      const invoiceNumber = this.generateInvoiceNumber();

      const currentUser = await AuthService.getCurrentUser();

      // Optional Customer Check
      const validCustomerId = input.customerId ? Number(input.customerId) : null;
      let customerName: string | null = null;
      let customerPhone: string | null = null;

      if (validCustomerId) {
        const cust = db.select().from(customers).where(eq(customers.id, validCustomerId)).get();
        if (cust) {
          customerName = cust.name;
          customerPhone = cust.phone || null;
        }
      }

      // 5. Atomic Multi-Table Transaction Execution
      const insertedSale = db
        .insert(sales)
        .values({
          customerId: validCustomerId,
          invoiceNumber,
          totalAmount: subtotal,
          discountAmount: discount,
          netAmount,
          paidAmount,
          paymentType: input.paymentType,
          createdByUserId: currentUser ? currentUser.id : null,
          createdAt: now,
        })
        .returning()
        .get();

      const saleId = insertedSale.id;
      const insertedItemsList: any[] = [];

      // 6. Process Line Items: Snapshot Costs + Decrement Stock + Stock Movement
      for (const item of input.items) {
        const product = db.select().from(products).where(eq(products.id, item.productId)).get()!;
        const lineTotal = item.quantity * item.unitPrice;
        const unitCost = product.purchasePrice || 0;
        const totalCost = item.quantity * unitCost;

        // a. Insert Line Item with Historical Unit Cost Snapshot
        const insertedItem = db
          .insert(saleItems)
          .values({
            saleId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: lineTotal,
            unitCost,
            totalCost,
          })
          .returning()
          .get();

        insertedItemsList.push({
          ...insertedItem,
          productName: product.name,
          productBarcode: product.barcode,
        });

        const previousStock = product.currentStock;
        const newStock = previousStock - item.quantity;

        // b. Update Product Stock
        db.update(products)
          .set({
            currentStock: newStock,
            updatedAt: now,
          })
          .where(eq(products.id, item.productId))
          .run();

        // c. Record Stock Movement Ledger Entry
        db.insert(stockMovements)
          .values({
            productId: item.productId,
            movementType: 'SALE',
            quantityChange: -item.quantity,
            previousStock,
            newStock,
            referenceId: invoiceNumber,
            notes: `فاتورة مبيعات ${invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      // d. Record Cash Transaction if CASH sale (log net amount received)
      if (input.paymentType === 'CASH') {
        db.insert(cashTransactions)
          .values({
            type: 'IN',
            amount: netAmount,
            category: 'مبيعات نقدية',
            referenceType: 'SALE',
            referenceId: invoiceNumber,
            notes: `تحصيل فاتورة مبيعات نقدية رقم ${invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      saveDatabaseToDisk();

      const saleWithDetails: SaleWithItems = {
        ...insertedSale,
        customerName,
        customerPhone,
        paymentType: insertedSale.paymentType as 'CASH' | 'CARD',
        items: insertedItemsList,
      };

      const auditMeta: Record<string, any> = {
        invoiceNumber,
        totalAmount: netAmount,
        itemsCount: insertedItemsList.length,
      };
      if (validCustomerId) {
        auditMeta.customerId = validCustomerId;
      }

      await AuditLogService.log(
        'CREATE_SALE',
        'SALE',
        saleWithDetails.id,
        `تم إنشاء فاتورة مبيعات جديدة رقم ${invoiceNumber} بقيمة إجمالية ${netAmount} ج.م`,
        auditMeta
      );

      return { success: true, data: saleWithDetails };
    } catch (err: any) {
      console.error('Error creating sale transaction:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تنفيذ عملية البيع' };
    }
  }

  // Get All Sales Invoices
  static async getAllSales(): Promise<Sale[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: sales.id,
          customerId: sales.customerId,
          customerName: customers.name,
          customerPhone: customers.phone,
          invoiceNumber: sales.invoiceNumber,
          totalAmount: sales.totalAmount,
          discountAmount: sales.discountAmount,
          netAmount: sales.netAmount,
          paidAmount: sales.paidAmount,
          paymentType: sales.paymentType,
          createdByUserId: sales.createdByUserId,
          createdByName: users.displayName,
          createdAt: sales.createdAt,
        })
        .from(sales)
        .leftJoin(users, eq(sales.createdByUserId, users.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .orderBy(desc(sales.createdAt))
        .all();

      return result as Sale[];
    } catch (err) {
      console.error('Error fetching sales:', err);
      return [];
    }
  }

  // Get Sale Details by ID
  static async getSaleDetails(saleId: number): Promise<SaleWithItems | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const sale = db
        .select({
          id: sales.id,
          customerId: sales.customerId,
          customerName: customers.name,
          customerPhone: customers.phone,
          invoiceNumber: sales.invoiceNumber,
          totalAmount: sales.totalAmount,
          discountAmount: sales.discountAmount,
          netAmount: sales.netAmount,
          paidAmount: sales.paidAmount,
          paymentType: sales.paymentType,
          createdByUserId: sales.createdByUserId,
          createdByName: users.displayName,
          createdAt: sales.createdAt,
        })
        .from(sales)
        .leftJoin(users, eq(sales.createdByUserId, users.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(eq(sales.id, saleId))
        .get();

      if (!sale) return null;

      const items = db
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

      return {
        ...sale,
        paymentType: sale.paymentType as 'CASH' | 'CARD',
        items: items as any[],
      };
    } catch (err) {
      console.error('Error fetching sale details:', err);
      return null;
    }
  }
}
