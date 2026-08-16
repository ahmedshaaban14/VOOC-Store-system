import { create } from 'zustand';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../shared/types';
import { useToastStore } from './useToastStore';

interface CustomersState {
  customers: Customer[];
  searchQuery: string;
  isLoading: boolean;
  isModalOpen: boolean;
  editingCustomer: Customer | null;
  deletingCustomerId: number | null;

  setSearchQuery: (query: string) => void;
  openCreateModal: () => void;
  openEditModal: (customer: Customer) => void;
  closeModal: () => void;
  setDeletingCustomerId: (id: number | null) => void;

  loadCustomers: () => Promise<void>;
  createCustomer: (data: CreateCustomerInput) => Promise<boolean>;
  updateCustomer: (id: number, data: UpdateCustomerInput) => Promise<boolean>;
  deleteCustomer: (id: number) => Promise<boolean>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  searchQuery: '',
  isLoading: false,
  isModalOpen: false,
  editingCustomer: null,
  deletingCustomerId: null,

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().loadCustomers();
  },

  openCreateModal: () => set({ isModalOpen: true, editingCustomer: null }),
  openEditModal: (customer) => set({ isModalOpen: true, editingCustomer: customer }),
  closeModal: () => set({ isModalOpen: false, editingCustomer: null }),
  setDeletingCustomerId: (deletingCustomerId) => set({ deletingCustomerId }),

  loadCustomers: async () => {
    if (!window.electronAPI) return;
    const { searchQuery } = get();
    set({ isLoading: true });

    try {
      const customers = await window.electronAPI.getCustomers(searchQuery);
      set({ customers, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      set({ isLoading: false });
    }
  },

  createCustomer: async (data) => {
    if (!window.electronAPI) return false;
    const { addToast } = useToastStore.getState();

    try {
      const res = await window.electronAPI.createCustomer(data);
      if (res.success && res.data) {
        addToast(`تم إضافة العميل [${res.data.name}] بنجاح`, 'success');
        get().closeModal();
        await get().loadCustomers();
        return true;
      } else {
        addToast(res.error || 'فشل إضافة العميل', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ غير متوقع', 'error');
      return false;
    }
  },

  updateCustomer: async (id, data) => {
    if (!window.electronAPI) return false;
    const { addToast } = useToastStore.getState();

    try {
      const res = await window.electronAPI.updateCustomer(id, data);
      if (res.success && res.data) {
        addToast(`تم تعديل بيانات العميل [${res.data.name}] بنجاح`, 'success');
        get().closeModal();
        await get().loadCustomers();
        return true;
      } else {
        addToast(res.error || 'فشل تعديل العميل', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ غير متوقع', 'error');
      return false;
    }
  },

  deleteCustomer: async (id) => {
    if (!window.electronAPI) return false;
    const { addToast } = useToastStore.getState();

    try {
      const res = await window.electronAPI.deleteCustomer(id);
      if (res.success) {
        addToast('تم حذف العميل بنجاح', 'success');
        set({ deletingCustomerId: null });
        await get().loadCustomers();
        return true;
      } else {
        addToast(res.error || 'فشل حذف العميل', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'حدث خطأ غير متوقع', 'error');
      return false;
    }
  },
}));
