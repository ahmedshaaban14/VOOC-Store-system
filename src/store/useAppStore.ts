import { create } from 'zustand';
import { NavigationTab } from '../shared/types';

interface AppState {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  storeName: string;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  currencySymbol: 'ج.م',
  setCurrencySymbol: (currencySymbol) => set({ currencySymbol }),
  storeName: 'VOOC Store',
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
