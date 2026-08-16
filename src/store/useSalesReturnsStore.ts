import { create } from 'zustand';
import { SalesReturn, Sale, ReturnableSaleItem } from '../shared/types';
import { useToastStore } from './useToastStore';

interface SalesReturnsState {
  salesReturnsList: SalesReturn[];
  selectedSale: Sale | null;
  returnableItems: ReturnableSaleItem[];
  searchInvoiceQuery: string;
  isProcessing: boolean;
  isLoading: boolean;

  setSearchInvoiceQuery: (query: string) => void;
  updateReturnQty: (productId: number, returnQty: number) => void;
  clearSelection: () => void;

  loadSalesReturnsList: () => Promise<void>;
  loadReturnableSaleDetails: (saleId: number) => Promise<boolean>;
  executeSalesReturn: (notes?: string) => Promise<SalesReturn | null>;
}

export const useSalesReturnsStore = create<SalesReturnsState>((set, get) => ({
  salesReturnsList: [],
  selectedSale: null,
  returnableItems: [],
  searchInvoiceQuery: '',
  isProcessing: false,
  isLoading: false,

  setSearchInvoiceQuery: (searchInvoiceQuery) => set({ searchInvoiceQuery }),

  updateReturnQty: (productId, returnQty) => {
    set((state) => ({
      returnableItems: state.returnableItems.map((item) => {
        if (item.productId === productId) {
          const clamped = Math.max(0, Math.min(returnQty, item.returnableQty));
          return { ...item, returnQty: clamped };
        }
        return item;
      }),
    }));
  },

  clearSelection: () =>
    set({
      selectedSale: null,
      returnableItems: [],
      searchInvoiceQuery: '',
    }),

  loadSalesReturnsList: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getSalesReturnsList();
        if (fetched) set({ salesReturnsList: fetched });
      } catch (err) {
        console.error('Error loading sales returns:', err);
      }
    }
    set({ isLoading: false });
  },

  loadReturnableSaleDetails: async (saleId) => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.getReturnableSaleDetails(saleId);
        if (res && res.sale) {
          set({
            selectedSale: res.sale,
            returnableItems: res.items,
            isLoading: false,
          });
          return true;
        }
      } catch (err) {
        console.error('Error fetching sale details for return:', err);
      }
    }
    set({ isLoading: false });
    return false;
  },

  executeSalesReturn: async (notes) => {
    const { selectedSale, returnableItems } = get();
    const { addToast } = useToastStore.getState();

    if (!selectedSale) {
      addToast('لم يتم اختيار فاتورة مبيعات!', 'error');
      return null;
    }

    const itemsToReturn = returnableItems
      .filter((i) => (i.returnQty || 0) > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.returnQty || 0,
        unitPrice: i.unitPrice,
        returnQty: i.returnQty || 0,
      }));

    if (itemsToReturn.length === 0) {
      addToast('يرجى تحديد كمية إرجاع لمنتج واحد على الأقل!', 'error');
      return null;
    }

    set({ isProcessing: true });

    if (window.electronAPI) {
      const res = await window.electronAPI.createSalesReturn({
        saleId: selectedSale.id,
        items: itemsToReturn,
        paymentType: selectedSale.paymentType || 'CASH',
        notes,
      });

      set({ isProcessing: false });

      if (res.success && res.data) {
        addToast(`تم إتمام مرتجع المبيعات بنجاح! رقم سند المرتجع: [${res.data.returnNumber}]`, 'success');
        get().clearSelection();
        await get().loadSalesReturnsList();
        return res.data;
      } else {
        addToast(res.error || 'فشل إتمام مرتجع المبيعات', 'error');
        return null;
      }
    }

    set({ isProcessing: false });
    return null;
  },
}));
