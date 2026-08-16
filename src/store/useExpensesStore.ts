import { create } from 'zustand';
import { Expense, CreateExpenseInput, UpdateExpenseInput, ExpenseFilterInput } from '../shared/types';
import { useToastStore } from './useToastStore';

interface ExpensesState {
  expenses: Expense[];
  filters: ExpenseFilterInput;
  isLoading: boolean;
  isModalOpen: boolean;
  editingExpense: Expense | null;
  deletingExpenseId: number | null;

  todayTotal: number;
  monthTotal: number;
  grandTotal: number;

  setFilterParam: (key: keyof ExpenseFilterInput, value: any) => void;
  resetFilters: () => void;
  openCreateModal: () => void;
  openEditModal: (expense: Expense) => void;
  closeModal: () => void;
  setDeletingExpenseId: (id: number | null) => void;

  loadExpenses: () => Promise<void>;
  createExpense: (data: CreateExpenseInput) => Promise<boolean>;
  updateExpense: (id: number, data: UpdateExpenseInput) => Promise<boolean>;
  deleteExpense: (id: number) => Promise<boolean>;
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  expenses: [],
  filters: {},
  isLoading: false,
  isModalOpen: false,
  editingExpense: null,
  deletingExpenseId: null,

  todayTotal: 0,
  monthTotal: 0,
  grandTotal: 0,

  setFilterParam: (key, value) => {
    const current = get().filters;
    set({ filters: { ...current, [key]: value } });
    get().loadExpenses();
  },

  resetFilters: () => {
    set({ filters: {} });
    get().loadExpenses();
  },

  openCreateModal: () => set({ isModalOpen: true, editingExpense: null }),
  openEditModal: (expense) => set({ isModalOpen: true, editingExpense: expense }),
  closeModal: () => set({ isModalOpen: false, editingExpense: null }),
  setDeletingExpenseId: (deletingExpenseId) => set({ deletingExpenseId }),

  loadExpenses: async () => {
    if (!window.electronAPI) return;
    const { filters } = get();
    set({ isLoading: true });

    try {
      const expenses = await window.electronAPI.getExpenses(filters);

      // Compute Summary Metrics
      const todayStr = new Date().toISOString().slice(0, 10);
      const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

      let todayTotal = 0;
      let monthTotal = 0;
      let grandTotal = 0;

      for (const e of expenses) {
        const amt = Number(e.amount) || 0;
        grandTotal += amt;

        if (e.expenseDate?.startsWith(todayStr)) {
          todayTotal += amt;
        }
        if (e.expenseDate?.startsWith(currentMonthStr)) {
          monthTotal += amt;
        }
      }

      set({
        expenses,
        todayTotal,
        monthTotal,
        grandTotal,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      set({ isLoading: false });
    }
  },

  createExpense: async (data) => {
    if (!window.electronAPI) return false;
    const { addToast } = useToastStore.getState();

    try {
      const res = await window.electronAPI.createExpense(data);
      if (res.success && res.data) {
        addToast(`تم تسجيل المصروف (${res.data.category}) بمبلغ ${res.data.amount} ج.م بنجاح`, 'success');
        get().closeModal();
        await get().loadExpenses();
        return true;
      } else {
        addToast(res.error || 'فشل تسجيل المصروف', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ غير متوقع', 'error');
      return false;
    }
  },

  updateExpense: async (id, data) => {
    if (!window.electronAPI) return false;
    const { addToast } = useToastStore.getState();

    try {
      const res = await window.electronAPI.updateExpense(id, data);
      if (res.success && res.data) {
        addToast(`تم تعديل المصروف بنجاح`, 'success');
        get().closeModal();
        await get().loadExpenses();
        return true;
      } else {
        addToast(res.error || 'فشل تعديل المصروف', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ غير متوقع', 'error');
      return false;
    }
  },

  deleteExpense: async (id) => {
    if (!window.electronAPI) return false;
    const { addToast } = useToastStore.getState();

    try {
      const res = await window.electronAPI.deleteExpense(id);
      if (res.success) {
        addToast('تم حذف المصروف واسترداد قيمته إلى الخزينة بنجاح', 'success');
        set({ deletingExpenseId: null });
        await get().loadExpenses();
        return true;
      } else {
        addToast(res.error || 'فشل حذف المصروف', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ غير متوقع', 'error');
      return false;
    }
  },
}));
