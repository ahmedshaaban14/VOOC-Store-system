import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingDown,
  Tag,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useExpensesStore } from '../store/useExpensesStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';

const EXPENSE_CATEGORIES = [
  'إيجار',
  'كهرباء',
  'مياه',
  'مرتبات',
  'نقل وشحن',
  'صيانة',
  'أدوات ومشتريات',
  'أخرى',
];

export const ExpensesPage: React.FC = () => {
  const {
    expenses,
    filters,
    isLoading,
    isModalOpen,
    editingExpense,
    deletingExpenseId,
    todayTotal,
    monthTotal,
    grandTotal,
    setFilterParam,
    resetFilters,
    openCreateModal,
    openEditModal,
    closeModal,
    setDeletingExpenseId,
    loadExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useExpensesStore();

  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Form State
  const [category, setCategory] = useState('إيجار');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    if (editingExpense) {
      const isPredefined = EXPENSE_CATEGORIES.includes(editingExpense.category);
      if (isPredefined) {
        setCategory(editingExpense.category);
        setCustomCategory('');
      } else {
        setCategory('أخرى');
        setCustomCategory(editingExpense.category);
      }
      setAmount(String(editingExpense.amount));
      setExpenseDate(editingExpense.expenseDate || new Date().toISOString().slice(0, 10));
      setNotes(editingExpense.notes || '');
    } else {
      setCategory('إيجار');
      setCustomCategory('');
      setAmount('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
    setFormError(null);
  }, [editingExpense, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category === 'أخرى' && customCategory.trim() ? customCategory.trim() : category;

    if (!finalCategory) {
      setFormError('يرجى اختيار أو تحديد تصنيف المصروف');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من 0');
      return;
    }

    if (!expenseDate) {
      setFormError('يرجى تحديد تاريخ المصروف');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      category: finalCategory,
      amount: numAmount,
      expenseDate,
      notes: notes.trim() || undefined,
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, payload);
    } else {
      await createExpense(payload);
    }

    setIsSubmitting(false);
  };

  const deletingExpense = expenses.find((e) => e.id === deletingExpenseId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-rose-500" />
            <span>المصروفات والإيجارات</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تسجيل مصروفات المحل (إيجار، كهرباء، مرتبات، صيانة) وخصمها آلياً من الخزينة النقدية
          </p>
        </div>

        {isAdmin && (
          <Button onClick={openCreateModal} className="flex items-center gap-2 self-start sm:self-auto bg-rose-600 hover:bg-rose-700">
            <Plus className="w-4 h-4" />
            <span>إضافة مصروف جديد</span>
          </Button>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">مصروفات اليوم</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-amber-400 mt-2">
            {formatCurrency(todayTotal)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">من بداية اليوم الحالي</span>
        </div>

        {/* This Month's Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">مصروفات الشهر الحالي</span>
            <div className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 mt-2">
            {formatCurrency(monthTotal)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">إجمالي المصروفات للشهر الجاري</span>
        </div>

        {/* Grand Total Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">إجمالي المصروفات (المسجلة)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-slate-100 mt-2">
            {formatCurrency(grandTotal)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">{expenses.length} حركة مصروف</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>التصنيف:</span>
              </span>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilterParam('category', e.target.value || undefined)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">جميع التصنيفات</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">من:</span>
              <input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => setFilterParam('fromDate', e.target.value || undefined)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">إلى:</span>
              <input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => setFilterParam('toDate', e.target.value || undefined)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث في الوصف أو الملاحظات..."
                value={filters.search || ''}
                onChange={(e) => setFilterParam('search', e.target.value || undefined)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-slate-400 hover:text-slate-200 text-xs px-2.5"
            title="إعادة ضبط الفلاتر"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط</span>
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-400" />
            <span>سجل حركات المصروفات ({expenses.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">تاريخ المصروف</th>
                <th className="px-4 py-3">التصنيف</th>
                <th className="px-4 py-3">الوصف والملاحظات</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">المستخدم</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>جاري تحميل المصروفات...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                    لا توجد مصروفات مسجلة تطابق اختياراتك.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {e.expenseDate}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="warning">{e.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-semibold">
                      {e.notes || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400 text-sm">
                      -{formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{e.userName || 'مدير النظام'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(e)}
                            className="p-1.5 rounded-lg bg-slate-800/80 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpenseId(e.id)}
                            className="p-1.5 rounded-lg bg-slate-800/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                            title="حذف واسترداد للخزينة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">تصنيف المصروف *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">تاريخ المصروف *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {category === 'أخرى' && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">حدد التصنيف المخصص *</label>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="مثال: ترخيص، ضيافة، دعاية وإعلان..."
                required
              />
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">مبلغ المصروف (ج.م) *</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              سيتم خصم هذا المبلغ فوراً من رصيد الخزينة النقدية الحالية.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">الوصف والملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="تفاصيل المصروف أو المستلم أو رقم الإيصال..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={closeModal} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">
              {isSubmitting ? 'جاري الحفظ...' : editingExpense ? 'حفظ التعديلات' : 'تسجيل المصروف'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Expense Confirmation Modal */}
      {deletingExpenseId && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingExpenseId(null)}
          title="تأكيد حذف المصروف"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p>
                هل أنت متأكد من رغبتك في حذف المصروف{' '}
                <span className="font-bold text-slate-100">[{deletingExpense?.category}]</span> بقيمة{' '}
                <span className="font-bold font-mono text-rose-400">
                  {formatCurrency(deletingExpense?.amount || 0)}
                </span>
                ؟
                <span className="block text-[11px] text-emerald-400 mt-1.5">
                  ✓ سيتم استرداد مبلغ المصروف تلقائياً وإعادته إلى رصيد الخزينة النقدية.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeletingExpenseId(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteExpense(deletingExpenseId)}
              >
                تأكيد الحذف والاسترداد
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
