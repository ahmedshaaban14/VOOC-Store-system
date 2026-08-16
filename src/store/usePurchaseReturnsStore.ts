import { create } from 'zustand';
import { PurchaseReturn, Purchase, ReturnablePurchaseItem } from '../shared/types';
import { useToastStore } from './useToastStore';

interface PurchaseReturnsState {
  purchaseReturnsList: PurchaseReturn[];
  selectedPurchase: Purchase | null;
  returnableItems: ReturnablePurchaseItem[];
  searchInvoiceQuery: string;
  isProcessing: boolean;
  isLoading: boolean;

  setSearchInvoiceQuery: (query: string) => void;
  updateReturnQty: (productId: number, returnQty: number) => void;
  clearSelection: () => void;

  loadPurchaseReturnsList: () => Promise<void>;
  loadReturnablePurchaseDetails: (purchaseId: number) => Promise<boolean>;
  executePurchaseReturn: (notes?: string) => Promise<PurchaseReturn | null>;
}

export const usePurchaseReturnsStore = create<PurchaseReturnsState>((set, get) => ({
  purchaseReturnsList: [],
  selectedPurchase: null,
  returnableItems: [],
  searchInvoiceQuery: '',
  isProcessing: false,
  isLoading: false,

  setSearchInvoiceQuery: (searchInvoiceQuery) => set({ searchInvoiceQuery }),

  updateReturnQty: (productId, returnQty) => {
    set((state) => ({
      returnableItems: state.returnableItems.map((item) => {
        if (item.productId === productId) {
          const maxAllowed = Math.min(item.returnableQty, item.currentStock);
          const clamped = Math.max(0, Math.min(returnQty, maxAllowed));
          return { ...item, returnQty: clamped };
        }
        return item;
      }),
    }));
  },

  clearSelection: () =>
    set({
      selectedPurchase: null,
      returnableItems: [],
      searchInvoiceQuery: '',
    }),

  loadPurchaseReturnsList: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getPurchaseReturnsList();
        if (fetched) set({ purchaseReturnsList: fetched });
      } catch (err) {
        console.error('Error loading purchase returns:', err);
      }
    }
    set({ isLoading: false });
  },

  loadReturnablePurchaseDetails: async (purchaseId) => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.getReturnablePurchaseDetails(purchaseId);
        if (res && res.purchase) {
          set({
            selectedPurchase: res.purchase,
            returnableItems: res.items,
            isLoading: false,
          });
          return true;
        }
      } catch (err) {
        console.error('Error fetching purchase details for return:', err);
      }
    }
    set({ isLoading: false });
    return false;
  },

  executePurchaseReturn: async (notes) => {
    const { selectedPurchase, returnableItems } = get();
    const { addToast } = useToastStore.getState();

    if (!selectedPurchase) {
      addToast('لم يتم اختيار فاتورة مشتريات!', 'error');
      return null;
    }

    const itemsToReturn = returnableItems
      .filter((i) => (i.returnQty || 0) > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.returnQty || 0,
        unitCost: i.unitCost,
        returnQty: i.returnQty || 0,
      }));

    if (itemsToReturn.length === 0) {
      addToast('يرجى تحديد كمية إرجاع لمنتج واحد على الأقل!', 'error');
      return null;
    }

    set({ isProcessing: true });

    if (window.electronAPI) {
      const res = await window.electronAPI.createPurchaseReturn({
        purchaseId: selectedPurchase.id,
        items: itemsToReturn,
        paymentType: selectedPurchase.paymentType || 'CASH',
        notes,
      });

      set({ isProcessing: false });

      if (res.success && res.data) {
        addToast(`تم إتمام مرتجع المشتريات بنجاح! رقم سند المرتجع: [${res.data.returnNumber}]`, 'success');
        get().clearSelection();
        await get().loadPurchaseReturnsList();
        return res.data;
      } else {
        addToast(res.error || 'فشل إتمام مرتجع المشتريات', 'error');
        return null;
      }
    }

    set({ isProcessing: false });
    return null;
  },
}));
