import { create } from 'zustand';
import { Sale, SaleWithItems } from '../shared/types';

interface SalesState {
  salesList: Sale[];
  selectedSaleDetails: SaleWithItems | null;
  searchQuery: string;
  isLoading: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedSaleDetails: (sale: SaleWithItems | null) => void;

  loadSales: () => Promise<void>;
  fetchSaleDetails: (saleId: number) => Promise<SaleWithItems | null>;
}

export const useSalesStore = create<SalesState>((set) => ({
  salesList: [],
  selectedSaleDetails: null,
  searchQuery: '',
  isLoading: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedSaleDetails: (selectedSaleDetails) => set({ selectedSaleDetails }),

  loadSales: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getSalesList();
        if (fetched) set({ salesList: fetched });
      } catch (err) {
        console.error('Error fetching sales history:', err);
      }
    }
    set({ isLoading: false });
  },

  fetchSaleDetails: async (saleId) => {
    if (window.electronAPI) {
      try {
        const details = await window.electronAPI.getSaleDetails(saleId);
        if (details) {
          set({ selectedSaleDetails: details });
          return details;
        }
      } catch (err) {
        console.error('Error fetching sale invoice details:', err);
      }
    }
    return null;
  },
}));
