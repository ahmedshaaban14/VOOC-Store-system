import { create } from 'zustand';
import { Product, Category } from '../shared/types';
import { mockProducts, mockCategories } from '../data/mockData';
import { useToastStore } from './useToastStore';

interface ProductsState {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  selectedCategory: number | 'ALL';
  viewMode: 'grid' | 'table';
  isAddModalOpen: boolean;
  editingProduct: Product | null;
  isLoading: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (categoryId: number | 'ALL') => void;
  setViewMode: (mode: 'grid' | 'table') => void;
  setIsAddModalOpen: (open: boolean) => void;
  setEditingProduct: (product: Product | null) => void;

  // Actions
  loadProducts: () => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateProduct: (id: number, productData: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: mockProducts,
  categories: mockCategories,
  searchQuery: '',
  selectedCategory: 'ALL',
  viewMode: 'grid',
  isAddModalOpen: false,
  editingProduct: null,
  isLoading: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setViewMode: (viewMode) => set({ viewMode }),
  setIsAddModalOpen: (isAddModalOpen) => set({ isAddModalOpen }),
  setEditingProduct: (editingProduct) => set({ editingProduct, isAddModalOpen: editingProduct !== null }),

  loadProducts: async () => {
    set({ isLoading: true });
    if (window.electronAPI) {
      try {
        const fetchedProducts = await window.electronAPI.getProducts();
        const fetchedCategories = await window.electronAPI.getCategories();
        if (fetchedProducts) {
          set({ products: fetchedProducts });
        }
        if (fetchedCategories) {
          set({ categories: fetchedCategories });
        }
      } catch (err) {
        console.warn('Electron API call failed, using fallback:', err);
      }
    }
    set({ isLoading: false });
  },

  addProduct: async (productData) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.createProduct(productData);
      if (res.success && res.data) {
        addToast('تمت إضافة المنتج بنجاح إلى قاعدة البيانات', 'success');
        await get().loadProducts();
        return true;
      } else {
        addToast(res.error || 'فشلت عملية إضافة المنتج', 'error');
        return false;
      }
    }

    const newProduct: Product = {
      ...productData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ products: [newProduct, ...state.products] }));
    addToast('تمت إضافة المنتج بنجاح (وضع العرض التوضيحي)', 'success');
    return true;
  },

  updateProduct: async (id, productData) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.updateProduct(id, productData);
      if (res.success && res.data) {
        addToast('تم حفظ تعديلات المنتج بنجاح', 'success');
        await get().loadProducts();
        return true;
      } else {
        addToast(res.error || 'فشلت عملية تعديل المنتج', 'error');
        return false;
      }
    }

    set((state) => ({
      products: state.products.map((p) =>
        p.id === id
          ? { ...p, ...productData, updatedAt: new Date().toISOString() }
          : p
      ),
    }));
    addToast('تم حفظ تعديلات المنتج بنجاح', 'success');
    return true;
  },

  deleteProduct: async (id) => {
    const { addToast } = useToastStore.getState();
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteProduct(id);
      if (res.success) {
        addToast('تم حذف المنتج بنجاح', 'success');
        await get().loadProducts();
        return true;
      } else {
        addToast(res.error || 'فشلت عملية حذف المنتج', 'error');
        return false;
      }
    }

    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
    addToast('تم حذف المنتج بنجاح', 'success');
    return true;
  },
}));
