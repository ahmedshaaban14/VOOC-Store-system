import { create } from 'zustand';
import { Product, StockMovement, StockAdjustmentInput } from '../shared/types';
import { useToastStore } from './useToastStore';

interface InventoryState {
  inventoryItems: Product[];
  movements: StockMovement[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: number | 'ALL';
  stockFilter: 'ALL' | 'LOW' | 'OUT';

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: number | 'ALL') => void;
  setStockFilter: (filter: 'ALL' | 'LOW' | 'OUT') => void;

  loadInventoryData: () => Promise<void>;
  applyStockAdjustment: (input: StockAdjustmentInput) => Promise<boolean>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  inventoryItems: [],
  movements: [],
  isLoading: false,
  searchQuery: '',
  selectedCategory: 'ALL',
  stockFilter: 'ALL',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setStockFilter: (stockFilter) => set({ stockFilter }),

  loadInventoryData: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const items = await window.electronAPI.getInventoryItems();
        const logs = await window.electronAPI.getStockMovements();
        if (items) set({ inventoryItems: items });
        if (logs) set({ movements: logs });
      } catch (err) {
        console.error('Error loading inventory data:', err);
      }
    }
    set({ isLoading: false });
  },

  applyStockAdjustment: async (input) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.adjustStock(input);
      if (res.success && res.data) {
        addToast('تمت عملية تسوية المخزون وتسجيل الحركة بنجاح', 'success');
        await get().loadInventoryData();
        return true;
      } else {
        addToast(res.error || 'فشلت عملية تعديل المخزون', 'error');
        return false;
      }
    }
    addToast('وضع العرض التوضيحي', 'info');
    return false;
  },
}));
