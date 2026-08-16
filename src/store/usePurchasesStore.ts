import { create } from 'zustand';
import { Purchase, PurchaseWithItems } from '../shared/types';

interface PurchasesState {
  purchasesList: Purchase[];
  selectedPurchaseDetails: PurchaseWithItems | null;
  searchQuery: string;
  isLoading: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedPurchaseDetails: (purchase: PurchaseWithItems | null) => void;

  loadPurchases: () => Promise<void>;
  fetchPurchaseDetails: (purchaseId: number) => Promise<PurchaseWithItems | null>;
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  purchasesList: [],
  selectedPurchaseDetails: null,
  searchQuery: '',
  isLoading: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedPurchaseDetails: (selectedPurchaseDetails) => set({ selectedPurchaseDetails }),

  loadPurchases: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getPurchasesList();
        if (fetched) set({ purchasesList: fetched });
      } catch (err) {
        console.error('Error fetching purchase invoices:', err);
      }
    }
    set({ isLoading: false });
  },

  fetchPurchaseDetails: async (purchaseId) => {
    if (window.electronAPI) {
      try {
        const details = await window.electronAPI.getPurchaseDetails(purchaseId);
        if (details) {
          set({ selectedPurchaseDetails: details });
          return details;
        }
      } catch (err) {
        console.error('Error fetching purchase details:', err);
      }
    }
    return null;
  },
}));
