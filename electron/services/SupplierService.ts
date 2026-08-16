import { eq, sql } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { suppliers, purchases } from '../db/schema';
import { Supplier, ServiceResult } from '../../src/shared/types';

export class SupplierService {
  // Get all suppliers with invoice counts
  static async getAllSuppliers(): Promise<Supplier[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          phone: suppliers.phone,
          address: suppliers.address,
          balance: suppliers.balance,
          createdAt: suppliers.createdAt,
          invoiceCount: sql<number>`count(${purchases.id})`.mapWith(Number),
        })
        .from(suppliers)
        .leftJoin(purchases, eq(suppliers.id, purchases.supplierId))
        .groupBy(suppliers.id)
        .all();

      return result as Supplier[];
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      return [];
    }
  }

  // Create Supplier
  static async createSupplier(data: {
    name: string;
    phone?: string;
    address?: string;
  }): Promise<ServiceResult<Supplier>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        return { success: false, error: 'اسم المورد مطلوب' };
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(suppliers)
        .values({
          name: trimmedName,
          phone: data.phone ? data.phone.trim() : null,
          address: data.address ? data.address.trim() : null,
          balance: 0,
          createdAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();
      return { success: true, data: { ...inserted, invoiceCount: 0 } as Supplier };
    } catch (err: any) {
      console.error('Error creating supplier:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء إضافة المورد' };
    }
  }

  // Update Supplier
  static async updateSupplier(
    id: number,
    data: { name?: string; phone?: string; address?: string }
  ): Promise<ServiceResult<Supplier>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const updated = db
        .update(suppliers)
        .set({
          ...(data.name && { name: data.name.trim() }),
          ...(data.phone !== undefined && { phone: data.phone ? data.phone.trim() : null }),
          ...(data.address !== undefined && { address: data.address ? data.address.trim() : null }),
        })
        .where(eq(suppliers.id, id))
        .returning()
        .get();

      saveDatabaseToDisk();
      return { success: true, data: updated as Supplier };
    } catch (err: any) {
      console.error('Error updating supplier:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل المورد' };
    }
  }

  // Delete Supplier with Safety Check
  static async deleteSupplier(id: number): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      // Check if purchase invoices exist for this supplier
      const supplierPurchases = db
        .select()
        .from(purchases)
        .where(eq(purchases.supplierId, id))
        .all();

      if (supplierPurchases && supplierPurchases.length > 0) {
        return {
          success: false,
          error: `لا يمكن حذف المورد! يوجد حالياً [${supplierPurchases.length}] فواتير شراء مرتبطة بحسابه.`,
        };
      }

      db.delete(suppliers).where(eq(suppliers.id, id)).run();

      saveDatabaseToDisk();
      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error deleting supplier:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حذف المورد' };
    }
  }
}
