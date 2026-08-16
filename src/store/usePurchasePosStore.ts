import { create } from 'zustand';
import { PurchaseCartItem, Product, PurchaseWithItems } from '../shared/types';
import { useToastStore } from './useToastStore';

interface PurchasePosState {
  selectedSupplierId: number | null;
  cart: PurchaseCartItem[];
  barcodeInput: string;
  paidAmount: number;
  paymentType: 'CASH' | 'CARD';
  isCheckingOut: boolean;
  lastCompletedPurchase: PurchaseWithItems | null;

  setSelectedSupplierId: (id: number | null) => void;
  setBarcodeInput: (input: string) => void;
  setPaidAmount: (amount: number) => void;
  setPaymentType: (type: 'CASH' | 'CARD') => void;
  setLastCompletedPurchase: (purchase: PurchaseWithItems | null) => void;

  // Cart Actions
  scanBarcode: (barcode: string) => Promise<boolean>;
  addProductToCart: (product: Product) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateUnitCost: (productId: number, unitCost: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;

  // Checkout
  executeCheckout: () => Promise<PurchaseWithItems | null>;
}

export const usePurchasePosStore = create<PurchasePosState>((set, get) => ({
  selectedSupplierId: null,
  cart: [],
  barcodeInput: '',
  paidAmount: 0,
  paymentType: 'CASH',
  isCheckingOut: false,
  lastCompletedPurchase: null,

  setSelectedSupplierId: (selectedSupplierId) => set({ selectedSupplierId }),
  setBarcodeInput: (barcodeInput) => set({ barcodeInput }),
  setPaidAmount: (paidAmount) => set({ paidAmount }),

  setPaymentType: (paymentType) => {
    const total = get().cart.reduce((sum, item) => sum + item.lineTotal, 0);
    set({
      paymentType,
      paidAmount: paymentType === 'CARD' ? total : total,
    });
  },

  setLastCompletedPurchase: (lastCompletedPurchase) => set({ lastCompletedPurchase }),

  scanBarcode: async (barcode) => {
    const { addToast } = useToastStore.getState();
    const trimmed = barcode.trim();
    if (!trimmed) return false;

    let targetProduct: Product | null = null;
    if (window.electronAPI) {
      targetProduct = await window.electronAPI.getProductByBarcode(trimmed);
    }

    if (!targetProduct) {
      addToast(`المنتج غير موجود بجدول الأصناف: [${trimmed}]`, 'error');
      set({ barcodeInput: '' });
      return false;
    }

    get().addProductToCart(targetProduct);
    set({ barcodeInput: '' });
    return true;
  },

  addProductToCart: (product) => {
    set((state) => {
      const existingIndex = state.cart.findIndex((i) => i.productId === product.id);
      let updatedCart: PurchaseCartItem[];

      if (existingIndex >= 0) {
        const existingItem = state.cart[existingIndex];
        const newQty = existingItem.quantity + 1;
        updatedCart = [...state.cart];
        updatedCart[existingIndex] = {
          ...existingItem,
          quantity: newQty,
          lineTotal: newQty * existingItem.unitCost,
        };
      } else {
        updatedCart = [
          ...state.cart,
          {
            productId: product.id,
            barcode: product.barcode,
            name: product.name,
            unitCost: product.purchasePrice || 0,
            quantity: 1,
            lineTotal: product.purchasePrice || 0,
          },
        ];
      }

      const total = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);

      return {
        cart: updatedCart,
        paidAmount: state.paymentType === 'CARD' ? total : Math.max(state.paidAmount, total),
      };
    });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => {
      const updatedCart = state.cart.map((i) =>
        i.productId === productId
          ? { ...i, quantity, lineTotal: quantity * i.unitCost }
          : i
      );
      const total = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);

      return {
        cart: updatedCart,
        paidAmount: state.paymentType === 'CARD' ? total : Math.max(state.paidAmount, total),
      };
    });
  },

  updateUnitCost: (productId, unitCost) => {
    const validCost = Math.max(0, unitCost);
    set((state) => {
      const updatedCart = state.cart.map((i) =>
        i.productId === productId
          ? { ...i, unitCost: validCost, lineTotal: i.quantity * validCost }
          : i
      );
      const total = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);

      return {
        cart: updatedCart,
        paidAmount: state.paymentType === 'CARD' ? total : Math.max(state.paidAmount, total),
      };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const updatedCart = state.cart.filter((i) => i.productId !== productId);
      const total = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);

      return {
        cart: updatedCart,
        paidAmount: state.paymentType === 'CARD' ? total : Math.max(state.paidAmount, total),
      };
    });
  },

  clearCart: () =>
    set({
      cart: [],
      paidAmount: 0,
      barcodeInput: '',
    }),

  executeCheckout: async () => {
    const { selectedSupplierId, cart, paidAmount, paymentType } = get();
    const { addToast } = useToastStore.getState();

    if (!selectedSupplierId) {
      addToast('يرجى اختيار المورد أولاً قبل إتمام الفاتورة!', 'error');
      return null;
    }

    if (cart.length === 0) {
      addToast('سلة المشتريات فارغة! اضف أصنافاً أولاً.', 'error');
      return null;
    }

    const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);

    if (paidAmount < total) {
      addToast(`المبلغ المدفوع (${paidAmount} ج.م) أقل من إجمالي الفاتورة (${total} ج.م)!`, 'error');
      return null;
    }

    set({ isCheckingOut: true });

    if (window.electronAPI) {
      const res = await window.electronAPI.createPurchase({
        supplierId: selectedSupplierId,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
        paidAmount,
        paymentType,
      });

      set({ isCheckingOut: false });

      if (res.success && res.data) {
        addToast(`تم إتمام فاتورة الشراء وزيادة المخزون بنجاح! رقم الفاتورة: [${res.data.invoiceNumber}]`, 'success');
        get().clearCart();
        set({ lastCompletedPurchase: res.data });
        return res.data;
      } else {
        addToast(res.error || 'فشلت عملية الشراء', 'error');
        return null;
      }
    }

    set({ isCheckingOut: false });
    return null;
  },
}));
