import { eq, sql, or, like, desc } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { customers, sales } from '../db/schema';
import { Customer, CreateCustomerInput, UpdateCustomerInput, ServiceResult } from '../../src/shared/types';
import { AuditLogService } from './AuditLogService';

export class CustomerService {
  // Get all customers with computed sales count and total purchased
  static async getAllCustomers(search?: string): Promise<Customer[]> {
    const db = getDb();
    if (!db) return [];

    try {
      let query = db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          address: customers.address,
          notes: customers.notes,
          points: customers.points,
          balance: customers.balance,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
          salesCount: sql<number>`count(${sales.id})`.mapWith(Number),
          totalPurchased: sql<number>`COALESCE(sum(${sales.netAmount}), 0)`.mapWith(Number),
        })
        .from(customers)
        .leftJoin(sales, eq(customers.id, sales.customerId))
        .groupBy(customers.id)
        .orderBy(desc(customers.id));

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        const filtered = db
          .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            address: customers.address,
            notes: customers.notes,
            points: customers.points,
            balance: customers.balance,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
            salesCount: sql<number>`count(${sales.id})`.mapWith(Number),
            totalPurchased: sql<number>`COALESCE(sum(${sales.netAmount}), 0)`.mapWith(Number),
          })
          .from(customers)
          .leftJoin(sales, eq(customers.id, sales.customerId))
          .where(or(like(customers.name, term), like(customers.phone, term)))
          .groupBy(customers.id)
          .orderBy(desc(customers.id))
          .all();

        return filtered as Customer[];
      }

      const result = query.all();
      return result as Customer[];
    } catch (err) {
      console.error('Error fetching customers:', err);
      return [];
    }
  }

  // Get customer by ID
  static async getCustomerById(id: number): Promise<Customer | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const result = db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          address: customers.address,
          notes: customers.notes,
          points: customers.points,
          balance: customers.balance,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
          salesCount: sql<number>`count(${sales.id})`.mapWith(Number),
          totalPurchased: sql<number>`COALESCE(sum(${sales.netAmount}), 0)`.mapWith(Number),
        })
        .from(customers)
        .leftJoin(sales, eq(customers.id, sales.customerId))
        .where(eq(customers.id, id))
        .groupBy(customers.id)
        .get();

      return (result as Customer) || null;
    } catch (err) {
      console.error('Error fetching customer by id:', err);
      return null;
    }
  }

  // Create Customer
  static async createCustomer(data: CreateCustomerInput): Promise<ServiceResult<Customer>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const trimmedName = data.name?.trim();
      if (!trimmedName) {
        return { success: false, error: 'اسم العميل مطلوب' };
      }

      const trimmedPhone = data.phone ? data.phone.trim() : null;
      const trimmedAddress = data.address ? data.address.trim() : null;
      const trimmedNotes = data.notes ? data.notes.trim() : null;

      // Optional duplicate phone check
      if (trimmedPhone) {
        const existingWithPhone = db
          .select()
          .from(customers)
          .where(eq(customers.phone, trimmedPhone))
          .get();

        if (existingWithPhone) {
          return {
            success: false,
            error: `يوجد عميل مسجل بالفعل بنفس رقم الهاتف (${trimmedPhone}): [${existingWithPhone.name}]`,
          };
        }
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(customers)
        .values({
          name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
          notes: trimmedNotes,
          points: 0,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CREATE_CUSTOMER',
        'CUSTOMER',
        inserted.id,
        `تم إضافة عميل جديد: ${trimmedName}`,
        { customerId: inserted.id, name: trimmedName, phone: trimmedPhone }
      );

      return {
        success: true,
        data: {
          ...inserted,
          salesCount: 0,
          totalPurchased: 0,
        } as Customer,
      };
    } catch (err: any) {
      console.error('Error creating customer:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء إضافة العميل' };
    }
  }

  // Update Customer
  static async updateCustomer(id: number, data: UpdateCustomerInput): Promise<ServiceResult<Customer>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const existing = db.select().from(customers).where(eq(customers.id, id)).get();
      if (!existing) {
        return { success: false, error: 'العميل غير موجود في النظام' };
      }

      if (data.name !== undefined && !data.name.trim()) {
        return { success: false, error: 'اسم العميل لا يمكن أن يكون فارغاً' };
      }

      const trimmedPhone = data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined;

      // Duplicate phone check if phone changed
      if (trimmedPhone && trimmedPhone !== existing.phone) {
        const duplicate = db
          .select()
          .from(customers)
          .where(eq(customers.phone, trimmedPhone))
          .get();

        if (duplicate && duplicate.id !== id) {
          return {
            success: false,
            error: `رقم الهاتف (${trimmedPhone}) مسجل لعميل آخر: [${duplicate.name}]`,
          };
        }
      }

      const now = new Date().toISOString();
      const updated = db
        .update(customers)
        .set({
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(trimmedPhone !== undefined && { phone: trimmedPhone }),
          ...(data.address !== undefined && { address: data.address ? data.address.trim() : null }),
          ...(data.notes !== undefined && { notes: data.notes ? data.notes.trim() : null }),
          updatedAt: now,
        })
        .where(eq(customers.id, id))
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'UPDATE_CUSTOMER',
        'CUSTOMER',
        id,
        `تم تعديل بيانات العميل: ${updated.name}`,
        { customerId: id, name: updated.name }
      );

      // Re-fetch with stats
      const fullCustomer = await this.getCustomerById(id);
      return { success: true, data: (fullCustomer || updated) as Customer };
    } catch (err: any) {
      console.error('Error updating customer:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل بيانات العميل' };
    }
  }

  // Delete Customer with Safety Deletion Protection
  static async deleteCustomer(id: number): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const existing = db.select().from(customers).where(eq(customers.id, id)).get();
      if (!existing) {
        return { success: false, error: 'العميل غير موجود في النظام' };
      }

      // Check whether the customer is referenced by existing sales/invoices
      const salesCountResult = db
        .select({ count: sql<number>`count(${sales.id})`.mapWith(Number) })
        .from(sales)
        .where(eq(sales.customerId, id))
        .get();

      const invoiceCount = salesCountResult?.count || 0;
      if (invoiceCount > 0) {
        return {
          success: false,
          error: `لا يمكن حذف العميل [${existing.name}] لوجود (${invoiceCount}) فاتورة مبيعات مرتبطة بسجله في النظام!`,
        };
      }

      // Safe to delete
      db.delete(customers).where(eq(customers.id, id)).run();
      saveDatabaseToDisk();

      await AuditLogService.log(
        'DELETE_CUSTOMER',
        'CUSTOMER',
        id,
        `تم حذف العميل: ${existing.name}`,
        { customerId: id, name: existing.name }
      );

      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حذف العميل' };
    }
  }
}
