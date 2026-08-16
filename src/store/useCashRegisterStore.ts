import { create } from 'zustand';
import { CashTransaction, CashRegisterSummary } from '../shared/types';
import { useToastStore } from './useToastStore';

interface CashRegisterState {
  summary: CashRegisterSummary;
  transactions: CashTransaction[];
  isLoading: boolean;
  isOpeningModalOpen: boolean;
  isDepositModalOpen: boolean;
  isWithdrawalModalOpen: boolean;

  setIsOpeningModalOpen: (open: boolean) => void;
  setIsDepositModalOpen: (open: boolean) => void;
  setIsWithdrawalModalOpen: (open: boolean) => void;

  loadCashRegister: () => Promise<void>;
  openRegister: (amount: number) => Promise<boolean>;
  manualDeposit: (amount: number, notes?: string) => Promise<boolean>;
  manualWithdrawal: (amount: number, notes?: string) => Promise<boolean>;
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => ({
  summary: {
    openingBalance: 0,
    cashSales: 0,
    cashPurchases: 0,
    salesReturns: 0,
    purchaseReturns: 0,
    manualIn: 0,
    manualOut: 0,
    currentBalance: 0,
    transactionCount: 0,
  },
  transactions: [],
  isLoading: false,
  isOpeningModalOpen: false,
  isDepositModalOpen: false,
  isWithdrawalModalOpen: false,

  setIsOpeningModalOpen: (isOpeningModalOpen) => set({ isOpeningModalOpen }),
  setIsDepositModalOpen: (isDepositModalOpen) => set({ isDepositModalOpen }),
  setIsWithdrawalModalOpen: (isWithdrawalModalOpen) => set({ isWithdrawalModalOpen }),

  loadCashRegister: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const [sum, txs] = await Promise.all([
          window.electronAPI.getCashRegisterSummary(),
          window.electronAPI.getCashTransactions(),
        ]);
        if (sum) set({ summary: sum });
        if (txs) set({ transactions: txs });
      } catch (err) {
        console.error('Error loading cash register state:', err);
      }
    }
    set({ isLoading: false });
  },

  openRegister: async (amount) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.openCashRegister(amount);
      if (res.success) {
        addToast(`تم إيداع الرصيد الافتتاحي بنجاح (${amount} ج.م)`, 'success');
        set({ isOpeningModalOpen: false });
        await get().loadCashRegister();
        return true;
      } else {
        addToast(res.error || 'فشل فتح الخزينة', 'error');
        return false;
      }
    }
    return false;
  },

  manualDeposit: async (amount, notes) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.manualCashIn(amount, notes);
      if (res.success) {
        addToast(`تم إيداع المبلغ بنجاح (${amount} ج.م)`, 'success');
        set({ isDepositModalOpen: false });
        await get().loadCashRegister();
        return true;
      } else {
        addToast(res.error || 'فشل تسجيل الإيداع', 'error');
        return false;
      }
    }
    return false;
  },

  manualWithdrawal: async (amount, notes) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.manualCashOut(amount, notes);
      if (res.success) {
        addToast(`تم سحب المبلغ بنجاح (${amount} ج.م)`, 'success');
        set({ isWithdrawalModalOpen: false });
        await get().loadCashRegister();
        return true;
      } else {
        addToast(res.error || 'فشل تسجيل السحب', 'error');
        return false;
      }
    }
    return false;
  },
}));
