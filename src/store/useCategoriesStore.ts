import { create } from 'zustand';
import { Category } from '../shared/types';
import { mockCategories } from '../data/mockData';
import { useToastStore } from './useToastStore';

interface CategoriesState {
  categories: Category[];
  isCategoryModalOpen: boolean;
  isLoading: boolean;

  setIsCategoryModalOpen: (open: boolean) => void;
  loadCategories: () => Promise<void>;
  addCategory: (name: string, description?: string) => Promise<boolean>;
  updateCategory: (id: number, name: string, description?: string) => Promise<boolean>;
  deleteCategory: (id: number) => Promise<boolean>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: mockCategories,
  isCategoryModalOpen: false,
  isLoading: false,

  setIsCategoryModalOpen: (isCategoryModalOpen) => set({ isCategoryModalOpen }),

  loadCategories: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getCategories();
        if (fetched) {
          set({ categories: fetched });
        }
      } catch (err) {
        console.error('Failed loading categories from DB:', err);
      }
    }
    set({ isLoading: false });
  },

  addCategory: async (name, description) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.createCategory({ name, description });
      if (res.success && res.data) {
        addToast('تمت إضافة القسم بنجاح', 'success');
        await get().loadCategories();
        return true;
      } else {
        addToast(res.error || 'فشلت إضافة القسم', 'error');
        return false;
      }
    }

    // Local fallback
    const newCat: Category = {
      id: Date.now(),
      name,
      description,
      productCount: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ categories: [...state.categories, newCat] }));
    addToast('تمت إضافة القسم بنجاح', 'success');
    return true;
  },

  updateCategory: async (id, name, description) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.updateCategory(id, { name, description });
      if (res.success) {
        addToast('تم تعديل بيانات القسم بنجاح', 'success');
        await get().loadCategories();
        return true;
      } else {
        addToast(res.error || 'فشل تعديل القسم', 'error');
        return false;
      }
    }

    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, name, description } : c
      ),
    }));
    addToast('تم تعديل بيانات القسم بنجاح', 'success');
    return true;
  },

  deleteCategory: async (id) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteCategory(id);
      if (res.success) {
        addToast('تم حذف القسم بنجاح', 'success');
        await get().loadCategories();
        return true;
      } else {
        addToast(res.error || 'تعذر حذف القسم', 'error');
        return false;
      }
    }

    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
    addToast('تم حذف القسم بنجاح', 'success');
    return true;
  },
}));
