import { create } from 'zustand';
import { CartItem, Product, SaleWithItems } from '../shared/types';
import { useToastStore } from './useToastStore';

interface PosState {
  cart: CartItem[];
  barcodeInput: string;
  discountAmount: number;
  paidAmount: number;
  paymentType: 'CASH' | 'CARD';
  selectedCustomerId: number | null;
  isCheckingOut: boolean;
  lastCompletedSale: SaleWithItems | null;

  setBarcodeInput: (input: string) => void;
  setDiscountAmount: (discount: number) => void;
  setPaidAmount: (paid: number) => void;
  setPaymentType: (type: 'CASH' | 'CARD') => void;
  setSelectedCustomerId: (id: number | null) => void;
  setLastCompletedSale: (sale: SaleWithItems | null) => void;

  // Cart actions
  scanBarcode: (barcode: string) => Promise<boolean>;
  addProductToCart: (product: Product) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;

  // Checkout
  executeCheckout: () => Promise<SaleWithItems | null>;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  barcodeInput: '',
  discountAmount: 0,
  paidAmount: 0,
  paymentType: 'CASH',
  selectedCustomerId: null,
  isCheckingOut: false,
  lastCompletedSale: null,

  setBarcodeInput: (barcodeInput) => set({ barcodeInput }),

  setDiscountAmount: (amount) => {
    const subtotal = get().cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const clampedDiscount = Math.max(0, Math.min(amount, subtotal));
    const netTotal = subtotal - clampedDiscount;

    set((state) => ({
      discountAmount: clampedDiscount,
      // If paymentType is CARD or paidAmount was equal to netTotal, update paidAmount
      paidAmount: state.paymentType === 'CARD' ? netTotal : Math.max(state.paidAmount, netTotal),
    }));
  },

  setPaidAmount: (paidAmount) => set({ paidAmount }),

  setPaymentType: (paymentType) => {
    const subtotal = get().cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const netTotal = subtotal - get().discountAmount;

    set({
      paymentType,
      paidAmount: paymentType === 'CARD' ? netTotal : netTotal,
    });
  },

  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),

  setLastCompletedSale: (lastCompletedSale) => set({ lastCompletedSale }),

  scanBarcode: async (barcode) => {
    const { addToast } = useToastStore.getState();
    const trimmed = barcode.trim();
    if (!trimmed) return false;

    let targetProduct: Product | null = null;

    if (window.electronAPI) {
      targetProduct = await window.electronAPI.getProductByBarcode(trimmed);
    }

    if (!targetProduct) {
      addToast(`لم يتم العثور على منتج بهذا الباركود: [${trimmed}]`, 'error');
      set({ barcodeInput: '' });
      return false;
    }

    get().addProductToCart(targetProduct);
    set({ barcodeInput: '' });
    return true;
  },

  addProductToCart: (product) => {
    const { addToast } = useToastStore.getState();

    if (product.currentStock <= 0) {
      addToast(`المنتج [${product.name}] نافذ من المخزن بالكامل!`, 'error');
      return;
    }

    set((state) => {
      const existingIndex = state.cart.findIndex((i) => i.productId === product.id);
      let updatedCart: CartItem[];

      if (existingIndex >= 0) {
        const existingItem = state.cart[existingIndex];
        if (existingItem.quantity >= product.currentStock) {
          addToast(
            `لا يمكن زيادة الكمية! المتوفر بالمخزن لمنتج [${product.name}] هو (${product.currentStock} قطعة) فقط.`,
            'error'
          );
          return state;
        }

        const newQty = existingItem.quantity + 1;
        updatedCart = [...state.cart];
        updatedCart[existingIndex] = {
          ...existingItem,
          quantity: newQty,
          lineTotal: newQty * existingItem.salePrice,
        };
      } else {
        updatedCart = [
          ...state.cart,
          {
            productId: product.id,
            barcode: product.barcode,
            name: product.name,
            salePrice: product.salePrice,
            quantity: 1,
            currentStock: product.currentStock,
            lineTotal: product.salePrice,
          },
        ];
      }

      const subtotal = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);
      const clampedDiscount = Math.min(state.discountAmount, subtotal);
      const netTotal = subtotal - clampedDiscount;

      return {
        cart: updatedCart,
        discountAmount: clampedDiscount,
        paidAmount: state.paymentType === 'CARD' ? netTotal : Math.max(state.paidAmount, netTotal),
      };
    });
  },

  updateQuantity: (productId, newQty) => {
    const { addToast } = useToastStore.getState();

    if (newQty <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => {
      const item = state.cart.find((i) => i.productId === productId);
      if (item && newQty > item.currentStock) {
        addToast(
          `الكمية المطلوبة (${newQty}) تتجاوز المتوفر بالمخزن (${item.currentStock} قطعة)!`,
          'error'
        );
        return state;
      }

      const updatedCart = state.cart.map((i) =>
        i.productId === productId
          ? { ...i, quantity: newQty, lineTotal: newQty * i.salePrice }
          : i
      );

      const subtotal = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);
      const clampedDiscount = Math.min(state.discountAmount, subtotal);
      const netTotal = subtotal - clampedDiscount;

      return {
        cart: updatedCart,
        discountAmount: clampedDiscount,
        paidAmount: state.paymentType === 'CARD' ? netTotal : Math.max(state.paidAmount, netTotal),
      };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const updatedCart = state.cart.filter((i) => i.productId !== productId);
      const subtotal = updatedCart.reduce((sum, item) => sum + item.lineTotal, 0);
      const clampedDiscount = Math.min(state.discountAmount, subtotal);
      const netTotal = subtotal - clampedDiscount;

      return {
        cart: updatedCart,
        discountAmount: clampedDiscount,
        paidAmount: state.paymentType === 'CARD' ? netTotal : Math.max(state.paidAmount, netTotal),
      };
    });
  },

  clearCart: () =>
    set({
      cart: [],
      discountAmount: 0,
      paidAmount: 0,
      barcodeInput: '',
      selectedCustomerId: null,
    }),

  executeCheckout: async () => {
    const { cart, discountAmount, paidAmount, paymentType, selectedCustomerId } = get();
    const { addToast } = useToastStore.getState();

    if (cart.length === 0) {
      addToast('السلة فارغة! اضف منتجات أولاً قبل إتمام البيع.', 'error');
      return null;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const netTotal = subtotal - discountAmount;

    // Full Payment Guard Check
    if (paidAmount < netTotal) {
      addToast(
        `المبلغ المدفوع (${paidAmount} ج.م) أقل من الصافي المطلوب (${netTotal} ج.م)! المبيعات الآجلة غير مفعلة.`,
        'error'
      );
      return null;
    }

    set({ isCheckingOut: true });

    if (window.electronAPI) {
      const res = await window.electronAPI.createSale({
        customerId: selectedCustomerId || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.salePrice,
        })),
        discountAmount,
        paidAmount,
        paymentType,
      });

      set({ isCheckingOut: false });

      if (res.success && res.data) {
        addToast(`تم إتمام البيع بنجاح! رقم الفاتورة: [${res.data.invoiceNumber}]`, 'success');
        get().clearCart();
        set({ lastCompletedSale: res.data });
        return res.data;
      } else {
        addToast(res.error || 'فشلت عملية إتمام البيع', 'error');
        return null;
      }
    }

    set({ isCheckingOut: false });
    addToast('وضع العرض التوضيحي', 'info');
    return null;
  },
}));
