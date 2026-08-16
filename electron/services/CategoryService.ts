import { eq, sql } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { categories, products } from '../db/schema';
import { Category, ServiceResult } from '../../src/shared/types';

export class CategoryService {
  // Get all categories with assigned product counts
  static async getAllCategories(): Promise<Category[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          createdAt: categories.createdAt,
          productCount: sql<number>`count(${products.id})`.mapWith(Number),
        })
        .from(categories)
        .leftJoin(products, eq(categories.id, products.categoryId))
        .groupBy(categories.id)
        .all();

      return result as Category[];
    } catch (err) {
      console.error('Failed fetching categories:', err);
      return [];
    }
  }

  // Create Category
  static async createCategory(data: { name: string; description?: string }): Promise<ServiceResult<Category>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        return { success: false, error: 'اسم القسم مطلوب' };
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(categories)
        .values({
          name: trimmedName,
          description: data.description ? data.description.trim() : null,
          createdAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();
      return { success: true, data: { ...inserted, productCount: 0 } as Category };
    } catch (err: any) {
      console.error('Error creating category:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء إضافة القسم' };
    }
  }

  // Update Category
  static async updateCategory(
    id: number,
    data: { name?: string; description?: string }
  ): Promise<ServiceResult<Category>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const updated = db
        .update(categories)
        .set({
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description ? data.description.trim() : null }),
        })
        .where(eq(categories.id, id))
        .returning()
        .get();

      saveDatabaseToDisk();
      return { success: true, data: updated as Category };
    } catch (err: any) {
      console.error('Error updating category:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل القسم' };
    }
  }

  // Delete Category (With product assignment protection)
  static async deleteCategory(id: number): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      // Check if products exist assigned to this category
      const assignedProducts = db
        .select()
        .from(products)
        .where(eq(products.categoryId, id))
        .all();

      if (assignedProducts && assignedProducts.length > 0) {
        return {
          success: false,
          error: `لا يمكن حذف هذا القسم! يوجد حالياً [${assignedProducts.length}] منتج مضاف تحت هذا القسم. قم بنقل أو حذف المنتجات أولاً.`,
        };
      }

      db.delete(categories).where(eq(categories.id, id)).run();

      saveDatabaseToDisk();
      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error deleting category:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حذف القسم' };
    }
  }
}
