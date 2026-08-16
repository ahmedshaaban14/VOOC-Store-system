import { create } from 'zustand';
import { Supplier } from '../shared/types';
import { useToastStore } from './useToastStore';

interface SuppliersState {
  suppliers: Supplier[];
  searchQuery: string;
  isLoading: boolean;
  isModalOpen: boolean;
  editingSupplier: Supplier | null;

  setSearchQuery: (query: string) => void;
  setIsModalOpen: (open: boolean) => void;
  setEditingSupplier: (supplier: Supplier | null) => void;

  loadSuppliers: () => Promise<void>;
  addSupplier: (name: string, phone?: string, address?: string) => Promise<boolean>;
  updateSupplier: (id: number, name: string, phone?: string, address?: string) => Promise<boolean>;
  deleteSupplier: (id: number) => Promise<boolean>;
}

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  suppliers: [],
  searchQuery: '',
  isLoading: false,
  isModalOpen: false,
  editingSupplier: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsModalOpen: (isModalOpen) => set({ isModalOpen }),
  setEditingSupplier: (editingSupplier) => set({ editingSupplier, isModalOpen: editingSupplier !== null }),

  loadSuppliers: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getSuppliers();
        if (fetched) set({ suppliers: fetched });
      } catch (err) {
        console.error('Error fetching suppliers:', err);
      }
    }
    set({ isLoading: false });
  },

  addSupplier: async (name, phone, address) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.createSupplier({ name, phone, address });
      if (res.success && res.data) {
        addToast('تمت إضافة المورد بنجاح', 'success');
        await get().loadSuppliers();
        return true;
      } else {
        addToast(res.error || 'فشلت إضافة المورد', 'error');
        return false;
      }
    }
    return false;
  },

  updateSupplier: async (id, name, phone, address) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.updateSupplier(id, { name, phone, address });
      if (res.success) {
        addToast('تم تعديل بيانات المورد بنجاح', 'success');
        await get().loadSuppliers();
        return true;
      } else {
        addToast(res.error || 'فشل تعديل المورد', 'error');
        return false;
      }
    }
    return false;
  },

  deleteSupplier: async (id) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteSupplier(id);
      if (res.success) {
        addToast('تم حذف المورد بنجاح', 'success');
        await get().loadSuppliers();
        return true;
      } else {
        addToast(res.error || 'تعذر حذف المورد', 'error');
        return false;
      }
    }
    return false;
  },
}));
