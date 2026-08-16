import { eq, and, gte, lte, like, desc, or } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { expenses, users, cashTransactions } from '../db/schema';
import { Expense, CreateExpenseInput, UpdateExpenseInput, ExpenseFilterInput, ServiceResult } from '../../src/shared/types';
import { CashRegisterService } from './CashRegisterService';
import { AuthService } from './AuthService';
import { AuditLogService } from './AuditLogService';

export class ExpenseService {
  // Get all expenses with filters and user display name
  static async getExpenses(filter?: ExpenseFilterInput): Promise<Expense[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const conditions: any[] = [];

      if (filter?.category && filter.category.trim()) {
        conditions.push(eq(expenses.category, filter.category.trim()));
      }

      if (filter?.fromDate) {
        conditions.push(gte(expenses.expenseDate, filter.fromDate));
      }

      if (filter?.toDate) {
        conditions.push(lte(expenses.expenseDate, filter.toDate));
      }

      if (filter?.search && filter.search.trim()) {
        const term = `%${filter.search.trim()}%`;
        conditions.push(
          or(like(expenses.notes, term), like(expenses.category, term))
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = db
        .select({
          id: expenses.id,
          category: expenses.category,
          amount: expenses.amount,
          notes: expenses.notes,
          expenseDate: expenses.expenseDate,
          userId: expenses.userId,
          userName: users.displayName,
          createdAt: expenses.createdAt,
          updatedAt: expenses.updatedAt,
        })
        .from(expenses)
        .leftJoin(users, eq(expenses.userId, users.id))
        .where(whereClause)
        .orderBy(desc(expenses.expenseDate), desc(expenses.id))
        .all();

      return result as Expense[];
    } catch (err) {
      console.error('Error fetching expenses:', err);
      return [];
    }
  }

  // Get expense by ID
  static async getExpenseById(id: number): Promise<Expense | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const result = db
        .select({
          id: expenses.id,
          category: expenses.category,
          amount: expenses.amount,
          notes: expenses.notes,
          expenseDate: expenses.expenseDate,
          userId: expenses.userId,
          userName: users.displayName,
          createdAt: expenses.createdAt,
          updatedAt: expenses.updatedAt,
        })
        .from(expenses)
        .leftJoin(users, eq(expenses.userId, users.id))
        .where(eq(expenses.id, id))
        .get();

      return (result as Expense) || null;
    } catch (err) {
      console.error('Error fetching expense by id:', err);
      return null;
    }
  }

  // Create Expense with Atomic Cash Register OUT Transaction
  static async createExpense(data: CreateExpenseInput): Promise<ServiceResult<Expense>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const trimmedCategory = data.category?.trim();
      if (!trimmedCategory) {
        return { success: false, error: 'تصنيف المصروف مطلوب' };
      }

      const numAmount = Number(data.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, error: 'مبلغ المصروف يجب أن يكون رقماً موجباً أكبر من 0' };
      }

      if (!data.expenseDate) {
        return { success: false, error: 'تاريخ المصروف مطلوب' };
      }

      // Negative Cash Register Balance Protection
      const currentBalance = await CashRegisterService.getCurrentBalance();
      if (numAmount > currentBalance) {
        return {
          success: false,
          error: `الرصيد الحالي بالخزينة (${currentBalance} ج.م) لا يكفي لتسجيل هذا المصروف (${numAmount} ج.م)!`,
        };
      }

      const currentUser = await AuthService.getCurrentUser();
      const now = new Date().toISOString();

      // 1. Insert Expense Record
      const insertedExpense = db
        .insert(expenses)
        .values({
          category: trimmedCategory,
          amount: numAmount,
          notes: data.notes ? data.notes.trim() : null,
          expenseDate: data.expenseDate,
          userId: currentUser ? currentUser.id : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      const expenseId = insertedExpense.id;

      // 2. Insert Corresponding CASH_OUT Transaction in Cash Register Ledger
      db.insert(cashTransactions)
        .values({
          type: 'OUT',
          amount: numAmount,
          category: 'مصروفات',
          referenceType: 'EXPENSE',
          referenceId: String(expenseId),
          notes: data.notes?.trim() || `مصروف: ${trimmedCategory}`,
          createdAt: now,
        })
        .run();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CREATE_EXPENSE',
        'EXPENSE',
        expenseId,
        `تم تسجيل مصروف بقيمة ${numAmount} ج.م (${trimmedCategory})`,
        { expenseId, category: trimmedCategory, amount: numAmount, date: data.expenseDate }
      );

      return {
        success: true,
        data: {
          ...insertedExpense,
          userName: currentUser ? currentUser.displayName : undefined,
        } as Expense,
      };
    } catch (err: any) {
      console.error('Error creating expense:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل المصروف' };
    }
  }

  // Update Expense with Atomic Cash Register Ledger Reconciliation
  static async updateExpense(id: number, data: UpdateExpenseInput): Promise<ServiceResult<Expense>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const existing = db.select().from(expenses).where(eq(expenses.id, id)).get();
      if (!existing) {
        return { success: false, error: 'المصروف غير موجود في النظام' };
      }

      const trimmedCategory = data.category !== undefined ? data.category.trim() : existing.category;
      if (!trimmedCategory) {
        return { success: false, error: 'تصنيف المصروف لا يمكن أن يكون فارغاً' };
      }

      const newAmount = data.amount !== undefined ? Number(data.amount) : existing.amount;
      if (isNaN(newAmount) || newAmount <= 0) {
        return { success: false, error: 'مبلغ المصروف يجب أن يكون رقماً موجباً أكبر من 0' };
      }

      // If amount increased, verify available cash balance
      if (newAmount > existing.amount) {
        const diff = newAmount - existing.amount;
        const currentBalance = await CashRegisterService.getCurrentBalance();
        if (diff > currentBalance) {
          return {
            success: false,
            error: `الرصيد المتاح بالخزينة (${currentBalance} ج.م) لا يكفي لتغطية زيادة المصروف بمقدار (${diff} ج.م)!`,
          };
        }
      }

      const now = new Date().toISOString();

      // 1. Update Expense Record
      const updatedExpense = db
        .update(expenses)
        .set({
          category: trimmedCategory,
          amount: newAmount,
          ...(data.notes !== undefined && { notes: data.notes ? data.notes.trim() : null }),
          ...(data.expenseDate && { expenseDate: data.expenseDate }),
          updatedAt: now,
        })
        .where(eq(expenses.id, id))
        .returning()
        .get();

      // 2. Reconcile Linked Cash Transaction
      const linkedTx = db
        .select()
        .from(cashTransactions)
        .where(and(eq(cashTransactions.referenceType, 'EXPENSE'), eq(cashTransactions.referenceId, String(id))))
        .get();

      if (linkedTx) {
        db.update(cashTransactions)
          .set({
            amount: newAmount,
            notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : `مصروف: ${trimmedCategory}`) : linkedTx.notes,
          })
          .where(eq(cashTransactions.id, linkedTx.id))
          .run();
      } else {
        // If missing, create new cash out
        db.insert(cashTransactions)
          .values({
            type: 'OUT',
            amount: newAmount,
            category: 'مصروفات',
            referenceType: 'EXPENSE',
            referenceId: String(id),
            notes: data.notes?.trim() || `مصروف: ${trimmedCategory}`,
            createdAt: now,
          })
          .run();
      }

      saveDatabaseToDisk();

      await AuditLogService.log(
        'UPDATE_EXPENSE',
        'EXPENSE',
        id,
        `تم تعديل المصروف #${id}: ${trimmedCategory} بمبلغ ${newAmount} ج.م`,
        { expenseId: id, category: trimmedCategory, amount: newAmount }
      );

      const fullExpense = await this.getExpenseById(id);
      return { success: true, data: (fullExpense || updatedExpense) as Expense };
    } catch (err: any) {
      console.error('Error updating expense:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل المصروف' };
    }
  }

  // Delete Expense with Atomic Cash Register Reversal
  static async deleteExpense(id: number): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const existing = db.select().from(expenses).where(eq(expenses.id, id)).get();
      if (!existing) {
        return { success: false, error: 'المصروف غير موجود في النظام' };
      }

      // 1. Delete Linked Cash Transaction from Ledger (reversing the cash OUT effect)
      db.delete(cashTransactions)
        .where(and(eq(cashTransactions.referenceType, 'EXPENSE'), eq(cashTransactions.referenceId, String(id))))
        .run();

      // 2. Delete Expense Record
      db.delete(expenses).where(eq(expenses.id, id)).run();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'DELETE_EXPENSE',
        'EXPENSE',
        id,
        `تم حذف المصروف #${id}: ${existing.category} بمبلغ ${existing.amount} ج.م واسترداد قيمته للخزينة`,
        { expenseId: id, category: existing.category, amount: existing.amount }
      );

      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حذف المصروف' };
    }
  }
}
