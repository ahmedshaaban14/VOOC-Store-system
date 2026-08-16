import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  KeyRound,
  History,
} from 'lucide-react';
import { useCashRegisterStore } from '../store/useCashRegisterStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';

export const CashRegisterPage: React.FC = () => {
  const {
    summary,
    transactions,
    isLoading,
    isOpeningModalOpen,
    isDepositModalOpen,
    isWithdrawalModalOpen,
    setIsOpeningModalOpen,
    setIsDepositModalOpen,
    setIsWithdrawalModalOpen,
    loadCashRegister,
    openRegister,
    manualDeposit,
    manualWithdrawal,
  } = useCashRegisterStore();

  const [amountInput, setAmountInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCashRegister();
  }, [loadCashRegister]);

  const resetForm = () => {
    setAmountInput('');
    setNotesInput('');
  };

  const handleOpenRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountInput);
    if (isNaN(num) || num <= 0) return;

    setIsSubmitting(true);
    const ok = await openRegister(num);
    setIsSubmitting(false);
    if (ok) resetForm();
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountInput);
    if (isNaN(num) || num <= 0) return;

    setIsSubmitting(true);
    const ok = await manualDeposit(num, notesInput);
    setIsSubmitting(false);
    if (ok) resetForm();
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountInput);
    if (isNaN(num) || num <= 0) return;

    setIsSubmitting(true);
    const ok = await manualWithdrawal(num, notesInput);
    setIsSubmitting(false);
    if (ok) resetForm();
  };

  const getCategoryBadge = (category: string, type: 'IN' | 'OUT') => {
    if (category === 'رصيد افتتاحي') return <Badge variant="info">رصيد افتتاحي</Badge>;
    if (category === 'مبيعات نقدية') return <Badge variant="success">مبيعات نقدية (+)</Badge>;
    if (category === 'مشتريات نقدية') return <Badge variant="danger">مشتريات نقدية (-)</Badge>;
    if (category === 'مرتجع مبيعات') return <Badge variant="warning">مرتجع مبيعات (-)</Badge>;
    if (category === 'مرتجع مشتريات') return <Badge variant="info">مرتجع مشتريات (+)</Badge>;
    if (category === 'إيداع نقدي') return <Badge variant="success">إيداع نقدي (+)</Badge>;
    if (category === 'سحب نقدي') return <Badge variant="danger">سحب نقدي (-)</Badge>;
    return <Badge variant={type === 'IN' ? 'success' : 'danger'}>{category}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            <span>خزينة المحل والنقدية (Cash Register)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            متابعة الرصيد النفعي الخزينة، المقبوضات والمدفوعات، الإيداعات والسحوبات اليدوية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCashRegister()}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث الخزينة</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetForm();
              setIsOpeningModalOpen(true);
            }}
            className="border-blue-600/40 text-blue-300 hover:bg-blue-600/10"
          >
            <KeyRound className="w-4 h-4 text-blue-400" />
            <span>فتح الخزينة (رصيد افتتاحي)</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setIsDepositModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إيداع نقدي (+)</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              resetForm();
              setIsWithdrawalModalOpen(true);
            }}
            className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30"
          >
            <MinusCircle className="w-4 h-4 text-rose-400" />
            <span>سحب نقدي (-)</span>
          </Button>
        </div>
      </div>

      {/* Main Current Balance Banner Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 z-10 text-right w-full md:w-auto">
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Wallet className="w-4 h-4" />
            <span>الرصيد النقدي الحالي بالخزينة (Current Cash Balance)</span>
          </span>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {formatCurrency(summary.currentBalance)}
          </div>
          <p className="text-[11px] text-slate-400">
            حركة الخزينة المحلّية مقيدة بسجل التدفقات النقدية لحماية الحسابات من أي أخطاء
          </p>
        </div>

        {/* Breakdown Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 z-10 w-full md:w-auto text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">رصيد افتتاحي</span>
            <span className="font-mono font-bold text-slate-200">{formatCurrency(summary.openingBalance)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-emerald-400 block">مبيعات كاش (+)</span>
            <span className="font-mono font-bold text-emerald-400">{formatCurrency(summary.cashSales)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-rose-400 block">مشتريات كاش (-)</span>
            <span className="font-mono font-bold text-rose-400">{formatCurrency(summary.cashPurchases)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-amber-400 block">مرتجع مبيعات (-)</span>
            <span className="font-mono font-bold text-amber-400">{formatCurrency(summary.salesReturns)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-purple-400 block">مرتجع مشتريات (+)</span>
            <span className="font-mono font-bold text-purple-400">{formatCurrency(summary.purchaseReturns)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">إيداع / سحب يدوي</span>
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(summary.manualIn - summary.manualOut)}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Ledger Audit Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <span>سجل تدفقات حركة الخزينة النقدية (Cash Audit Ledger)</span>
        </h3>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">تاريخ ووقت الحركة</th>
                <th className="px-4 py-3">نوع الحركة</th>
                <th className="px-4 py-3">التصنيف</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">الرقم المرجعي (فاتورة/سند)</th>
                <th className="px-4 py-3">ملاحظات والتفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    لا توجد حركات نقدية مسجلة بالخزينة حتى الآن
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {tx.type === 'IN' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>داخل (+)</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>خارج (-)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getCategoryBadge(tx.category, tx.type)}</td>
                    <td
                      className={`px-4 py-3 font-mono font-bold text-sm ${
                        tx.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'IN' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-400">{tx.referenceId || '-'}</td>
                    <td className="px-4 py-3 text-slate-300 text-[11px]">{tx.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Open Register (Opening Balance) */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title="تسجيل الرصيد الافتتاحي للخزينة"
        maxWidth="sm"
      >
        <form onSubmit={handleOpenRegisterSubmit} className="space-y-4 text-right">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              مبلغ الرصيد الافتتاحي (ج.م)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              placeholder="مثال: 5000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpeningModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'جاري التسجيل...' : 'اعتماد الرصيد الافتتاحي'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Manual Cash Deposit */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title="إيداع نقدي يدوي بالخزينة (+)"
        maxWidth="sm"
      >
        <form onSubmit={handleDepositSubmit} className="space-y-4 text-right">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">المبلغ المودع (ج.م)</label>
            <input
              type="number"
              step="1"
              min="1"
              required
              placeholder="مثال: 1000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">ملاحظات / سبب الإيداع</label>
            <input
              type="text"
              placeholder="إيداع سيولة إضافية / رأس مال..."
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDepositModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isSubmitting ? 'جاري الإيداع...' : 'تأكيد الإيداع النقدي'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Manual Cash Withdrawal */}
      <Modal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        title="سحب نقدي يدوي من الخزينة (-)"
        maxWidth="sm"
      >
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4 text-right">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">المبلغ المسحوب (ج.م)</label>
            <input
              type="number"
              step="1"
              min="1"
              max={summary.currentBalance}
              required
              placeholder="مثال: 500"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-slate-100 focus:outline-none focus:border-rose-500"
            />
            <span className="text-[10px] text-amber-400 mt-1 block">
              الرصيد المتاح للسحب حالياً: {formatCurrency(summary.currentBalance)}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">ملاحظات / سبب السحب</label>
            <input
              type="text"
              placeholder="مصروفات شخصية / توريد للبنك..."
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsWithdrawalModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || Number(amountInput) > summary.currentBalance}
              className="bg-rose-600 hover:bg-rose-500"
            >
              {isSubmitting ? 'جاري السحب...' : 'تأكيد السحب النقدي'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
