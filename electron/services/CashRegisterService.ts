import { desc, sql, eq } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { cashTransactions } from '../db/schema';
import { CashTransaction, CashRegisterSummary, ServiceResult } from '../../src/shared/types';
import { AuditLogService } from './AuditLogService';

export class CashRegisterService {
  // Get all cash audit ledger transactions
  static async getTransactions(): Promise<CashTransaction[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select()
        .from(cashTransactions)
        .orderBy(desc(cashTransactions.createdAt))
        .all();

      return result as CashTransaction[];
    } catch (err) {
      console.error('Error fetching cash transactions:', err);
      return [];
    }
  }

  // Get current live cash balance from cash_transactions ledger
  static async getCurrentBalance(): Promise<number> {
    const db = getDb();
    if (!db) return 0;

    try {
      const inResult = db
        .select({ total: sql<number>`COALESCE(SUM(${cashTransactions.amount}), 0)`.mapWith(Number) })
        .from(cashTransactions)
        .where(eq(cashTransactions.type, 'IN'))
        .get();

      const outResult = db
        .select({ total: sql<number>`COALESCE(SUM(${cashTransactions.amount}), 0)`.mapWith(Number) })
        .from(cashTransactions)
        .where(eq(cashTransactions.type, 'OUT'))
        .get();

      const totalIn = inResult?.total || 0;
      const totalOut = outResult?.total || 0;

      return totalIn - totalOut;
    } catch (err) {
      console.error('Error calculating cash balance:', err);
      return 0;
    }
  }

  // Get detailed cash summary metrics
  static async getSummary(): Promise<CashRegisterSummary> {
    const db = getDb();
    if (!db) {
      return {
        openingBalance: 0,
        cashSales: 0,
        cashPurchases: 0,
        salesReturns: 0,
        purchaseReturns: 0,
        manualIn: 0,
        manualOut: 0,
        currentBalance: 0,
        transactionCount: 0,
      };
    }

    try {
      const allTx = db.select().from(cashTransactions).all();

      let openingBalance = 0;
      let cashSales = 0;
      let cashPurchases = 0;
      let salesReturns = 0;
      let purchaseReturns = 0;
      let manualIn = 0;
      let manualOut = 0;

      for (const tx of allTx) {
        const amt = tx.amount || 0;
        if (tx.category === 'رصيد افتتاحي') openingBalance += amt;
        else if (tx.category === 'مبيعات نقدية') cashSales += amt;
        else if (tx.category === 'مشتريات نقدية') cashPurchases += amt;
        else if (tx.category === 'مرتجع مبيعات') salesReturns += amt;
        else if (tx.category === 'مرتجع مشتريات') purchaseReturns += amt;
        else if (tx.category === 'إيداع نقدي') manualIn += amt;
        else if (tx.category === 'سحب نقدي') manualOut += amt;
      }

      const currentBalance = await this.getCurrentBalance();

      return {
        openingBalance,
        cashSales,
        cashPurchases,
        salesReturns,
        purchaseReturns,
        manualIn,
        manualOut,
        currentBalance,
        transactionCount: allTx.length,
      };
    } catch (err) {
      console.error('Error fetching cash summary:', err);
      return {
        openingBalance: 0,
        cashSales: 0,
        cashPurchases: 0,
        salesReturns: 0,
        purchaseReturns: 0,
        manualIn: 0,
        manualOut: 0,
        currentBalance: 0,
        transactionCount: 0,
      };
    }
  }

  // Open Register with Opening Balance (Session Registration)
  static async openRegister(amount: number): Promise<ServiceResult<CashTransaction>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'مبلغ الرصيد الافتتاحي يجب أن يكون أكبر من 0' };
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const existingOpening = db
        .select()
        .from(cashTransactions)
        .where(sql`${cashTransactions.category} = 'رصيد افتتاحي' AND ${cashTransactions.createdAt} LIKE ${todayStr + '%'}`)
        .get();

      if (existingOpening) {
        return {
          success: false,
          error: `تم تسجيل رصيد افتتاحي اليوم بالفعل بمبلغ (${existingOpening.amount} ج.م)!`,
        };
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(cashTransactions)
        .values({
          type: 'IN',
          amount,
          category: 'رصيد افتتاحي',
          notes: 'إيداع الرصيد الافتتاحي اليومي لخزينة المحل',
          createdAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'OPEN_CASH_REGISTER',
        'CASH_REGISTER',
        inserted.id,
        `تم فتح الخزينة وإيداع رصيد افتتاحي بمبلغ ${amount} ج.م`,
        { amount }
      );

      return { success: true, data: inserted as CashTransaction };
    } catch (err: any) {
      console.error('Error opening register:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء فتح الخزينة' };
    }
  }

  // Manual Cash Deposit (Manual Cash IN)
  static async manualCashIn(amount: number, notes?: string): Promise<ServiceResult<CashTransaction>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'مبلغ الإيداع يجب أن يكون أكبر من 0' };
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(cashTransactions)
        .values({
          type: 'IN',
          amount,
          category: 'إيداع نقدي',
          notes: notes || 'إيداع نقدي يدوي بالخزينة',
          createdAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CASH_IN',
        'CASH_TRANSACTION',
        inserted.id,
        `تم تسجيل إيداع نقدي يدوي بالخزينة بمبلغ ${amount} ج.م`,
        { amount, notes }
      );

      return { success: true, data: inserted as CashTransaction };
    } catch (err: any) {
      console.error('Error recording cash deposit:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الإيداع النقدي' };
    }
  }

  // Manual Cash Withdrawal (Manual Cash OUT) with Negative Balance Protection
  static async manualCashOut(amount: number, notes?: string): Promise<ServiceResult<CashTransaction>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'مبلغ السحب يجب أن يكون أكبر من 0' };
      }

      const currentBalance = await this.getCurrentBalance();
      if (amount > currentBalance) {
        return {
          success: false,
          error: `الرصيد الحالي بالخزينة (${currentBalance} ج.م) لا يكفي لسحب مبلغ (${amount} ج.م)!`,
        };
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(cashTransactions)
        .values({
          type: 'OUT',
          amount,
          category: 'سحب نقدي',
          notes: notes || 'سحب نقدي يدوي من الخزينة',
          createdAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CASH_OUT',
        'CASH_TRANSACTION',
        inserted.id,
        `تم تسجيل سحب نقدي يدوي من الخزينة بمبلغ ${amount} ج.م`,
        { amount, notes }
      );

      return { success: true, data: inserted as CashTransaction };
    } catch (err: any) {
      console.error('Error recording cash withdrawal:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل السحب النقدي' };
    }
  }
}
