import { eq, desc, sql } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { purchases, purchaseItems, products, stockMovements, cashTransactions, suppliers } from '../db/schema';
import { CreatePurchaseInput, PurchaseWithItems, Purchase, ServiceResult } from '../../src/shared/types';
import { AuditLogService } from './AuditLogService';

export class PurchaseService {
  // Generate safe sequential purchase invoice number (e.g. PUR-000001)
  private static generateInvoiceNumber(): string {
    const db = getDb();
    if (!db) return `PUR-${Date.now().toString().slice(-6)}`;

    try {
      const result = db.select({ maxId: sql<number>`max(${purchases.id})` }).from(purchases).get();
      const nextId = (result?.maxId || 0) + 1;
      return `PUR-${String(nextId).padStart(6, '0')}`;
    } catch (e) {
      console.warn('Fallback purchase invoice numbering:', e);
      return `PUR-${Date.now().toString().slice(-6)}`;
    }
  }

  // Atomic Purchase Transaction Execution
  static async createPurchase(input: CreatePurchaseInput): Promise<ServiceResult<PurchaseWithItems>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      // 1. Validate Supplier
      const supplierId = input.supplierId || 0;
      const supplier = db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();
      if (!supplier) {
        return { success: false, error: 'المورد المحدد غير موجود بقاعدة البيانات!' };
      }

      // 2. Validate Purchase Cart
      if (!input.items || input.items.length === 0) {
        return { success: false, error: 'سلة المشتريات فارغة! يرجى إضافة منتجات قبل إتمام الشراء.' };
      }

      for (const item of input.items) {
        if (!item.quantity || item.quantity <= 0) {
          return { success: false, error: 'الكمية لجميع أصناف المشتريات يجب أن تكون أكبر من 0' };
        }
        if (item.unitCost === undefined || item.unitCost < 0) {
          return { success: false, error: 'سعر تكلفة الشراء لا يمكن أن يكون بالسالب' };
        }
      }

      // 3. Calculate Total & Payment Validation
      const totalAmount = input.items.reduce(
        (sum, item) => sum + item.quantity * Number(item.unitCost),
        0
      );

      const paidAmount = Number(input.paidAmount);

      // Full Payment Guard for Purchases (paidAmount >= totalAmount)
      if (isNaN(paidAmount) || paidAmount < totalAmount) {
        return {
          success: false,
          error: `المبلغ المدفوع (${paidAmount || 0} ج.م) أقل من إجمالي فاتورة الشراء (${totalAmount} ج.م)! المشتريات الآجلة غير مفعلة.`,
        };
      }

      const now = new Date().toISOString();
      const invoiceNumber = this.generateInvoiceNumber();

      // 4. Multi-Record Atomic SQLite Transaction
      const insertedPurchase = db
        .insert(purchases)
        .values({
          supplierId: input.supplierId,
          invoiceNumber,
          totalAmount,
          paidAmount,
          status: 'COMPLETED',
          createdAt: now,
        })
        .returning()
        .get();

      const purchaseId = insertedPurchase.id;
      const insertedItemsList: any[] = [];

      for (const item of input.items) {
        const prod = db.select().from(products).where(eq(products.id, item.productId)).get();
        if (!prod) {
          throw new Error(`المنتج رقم [${item.productId}] غير موجود بقاعدة البيانات`);
        }

        const previousStock = prod.currentStock;
        const newStock = previousStock + item.quantity;
        const totalCost = item.quantity * Number(item.unitCost);

        // a. Insert Purchase Item (Historical Unit Cost preserved!)
        const insertedItem = db
          .insert(purchaseItems)
          .values({
            purchaseId,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: Number(item.unitCost),
            totalCost,
          })
          .returning()
          .get();

        insertedItemsList.push({
          ...insertedItem,
          productName: prod.name,
          productBarcode: prod.barcode,
        });

        // b. Increase Stock & Update Latest Purchase Price for Product
        db.update(products)
          .set({
            currentStock: newStock,
            purchasePrice: Number(item.unitCost), // Latest cost updated
            updatedAt: now,
          })
          .where(eq(products.id, item.productId))
          .run();

        // c. Record Stock Movement Ledger Entry (+qty)
        db.insert(stockMovements)
          .values({
            productId: item.productId,
            movementType: 'PURCHASE',
            quantityChange: item.quantity,
            previousStock,
            newStock,
            referenceId: invoiceNumber,
            notes: `فاتورة مشتريات من المورد [${supplier.name}] رقم ${invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      // d. Record Cash OUT Transaction for Cash Purchases (Amount = totalAmount net cost)
      if (input.paymentType === 'CASH') {
        db.insert(cashTransactions)
          .values({
            type: 'OUT',
            amount: totalAmount, // Actual purchase cost paid out
            category: 'مشتريات نقدية',
            referenceType: 'PURCHASE',
            referenceId: invoiceNumber,
            notes: `سداد فاتورة مشتريات نقدية للمورد [${supplier.name}] رقم ${invoiceNumber}`,
            createdAt: now,
          })
          .run();
      }

      saveDatabaseToDisk();

      const purchaseWithDetails: PurchaseWithItems = {
        ...insertedPurchase,
        status: insertedPurchase.status as 'COMPLETED' | 'PENDING' | 'CANCELLED',
        supplierName: supplier.name,
        paymentType: input.paymentType,
        items: insertedItemsList,
      };

      await AuditLogService.log(
        'CREATE_PURCHASE',
        'PURCHASE',
        purchaseWithDetails.id,
        `تم إضافة فاتورة شراء جديدة رقم ${invoiceNumber} من المورد ${supplier.name} بمبلغ ${insertedPurchase.totalAmount} ج.م`,
        { invoiceNumber, supplierName: supplier.name, totalAmount: insertedPurchase.totalAmount }
      );

      return { success: true, data: purchaseWithDetails };
    } catch (err: any) {
      console.error('Error creating purchase transaction:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تنفيذ عملية الشراء' };
    }
  }

  // Get All Purchase Invoices
  static async getAllPurchases(): Promise<Purchase[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: purchases.id,
          supplierId: purchases.supplierId,
          supplierName: suppliers.name,
          invoiceNumber: purchases.invoiceNumber,
          totalAmount: purchases.totalAmount,
          paidAmount: purchases.paidAmount,
          status: purchases.status,
          createdAt: purchases.createdAt,
        })
        .from(purchases)
        .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
        .orderBy(desc(purchases.createdAt))
        .all();

      return result as Purchase[];
    } catch (err) {
      console.error('Error fetching purchase invoices:', err);
      return [];
    }
  }

  // Get Purchase Invoice Details by ID
  static async getPurchaseDetails(purchaseId: number): Promise<PurchaseWithItems | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const purchase = db
        .select({
          id: purchases.id,
          supplierId: purchases.supplierId,
          supplierName: suppliers.name,
          invoiceNumber: purchases.invoiceNumber,
          totalAmount: purchases.totalAmount,
          paidAmount: purchases.paidAmount,
          status: purchases.status,
          createdAt: purchases.createdAt,
        })
        .from(purchases)
        .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
        .where(eq(purchases.id, purchaseId))
        .get();

      if (!purchase) return null;

      const items = db
        .select({
          id: purchaseItems.id,
          purchaseId: purchaseItems.purchaseId,
          productId: purchaseItems.productId,
          productName: products.name,
          productBarcode: products.barcode,
          quantity: purchaseItems.quantity,
          unitCost: purchaseItems.unitCost,
          totalCost: purchaseItems.totalCost,
        })
        .from(purchaseItems)
        .leftJoin(products, eq(purchaseItems.productId, products.id))
        .where(eq(purchaseItems.purchaseId, purchaseId))
        .all();

      return {
        ...purchase,
        supplierName: purchase.supplierName || undefined,
        status: purchase.status as 'COMPLETED' | 'PENDING' | 'CANCELLED',
        items: items as any[],
      };
    } catch (err) {
      console.error('Error fetching purchase details:', err);
      return null;
    }
  }
}
