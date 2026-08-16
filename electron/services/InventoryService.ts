import { eq, desc } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { products, stockMovements } from '../db/schema';
import { Product, StockMovement, StockAdjustmentInput, ServiceResult } from '../../src/shared/types';

export class InventoryService {
  // Get stock movement history audit logs with product details
  static async getStockMovements(): Promise<StockMovement[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: stockMovements.id,
          productId: stockMovements.productId,
          productName: products.name,
          productBarcode: products.barcode,
          movementType: stockMovements.movementType,
          quantityChange: stockMovements.quantityChange,
          previousStock: stockMovements.previousStock,
          newStock: stockMovements.newStock,
          referenceId: stockMovements.referenceId,
          notes: stockMovements.notes,
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .orderBy(desc(stockMovements.createdAt))
        .all();

      return result as StockMovement[];
    } catch (err) {
      console.error('Error fetching stock movements:', err);
      return [];
    }
  }

  // Atomic Stock Adjustment Transaction
  static async applyStockAdjustment(input: StockAdjustmentInput): Promise<ServiceResult<Product>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const targetProduct = db.select().from(products).where(eq(products.id, input.productId)).get();
      if (!targetProduct) {
        return { success: false, error: 'المنتج غير موجود في قاعدة البيانات' };
      }

      const previousStock = targetProduct.currentStock;
      const quantityChange = Number(input.quantityChange);

      if (isNaN(quantityChange) || quantityChange === 0) {
        return { success: false, error: 'كمية التغيير يجب أن تكون رقماً غير صغري' };
      }

      const newStock = previousStock + quantityChange;

      // Negative stock guard
      if (newStock < 0) {
        return {
          success: false,
          error: `عملية مرفوضة: الكمية المتوفرة بالمخزن (${previousStock} قطعة) فقط، ولا يمكن تنزيل رصيد المخزون ليصبح بالسالب!`,
        };
      }

      const now = new Date().toISOString();

      // Perform updates inside atomic database execution
      db.update(products)
        .set({
          currentStock: newStock,
          updatedAt: now,
        })
        .where(eq(products.id, input.productId))
        .run();

      db.insert(stockMovements)
        .values({
          productId: input.productId,
          movementType: input.movementType,
          quantityChange: quantityChange,
          previousStock: previousStock,
          newStock: newStock,
          referenceId: input.referenceId ? input.referenceId.trim() : 'تسوية يدوية',
          notes: input.notes ? input.notes.trim() : null,
          createdAt: now,
        })
        .run();

      saveDatabaseToDisk();

      const updatedProduct = db.select().from(products).where(eq(products.id, input.productId)).get();
      return { success: true, data: updatedProduct as Product };
    } catch (err: any) {
      console.error('Error applying stock movement:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل كمية المخزون' };
    }
  }
}
