import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  DollarSign,
  CreditCard,
  RotateCcw,
  Users,
} from 'lucide-react';

import { usePosStore } from '../store/usePosStore';
import { useProductsStore } from '../store/useProductsStore';
import { useCategoriesStore } from '../store/useCategoriesStore';
import { useCustomersStore } from '../store/useCustomersStore';
import { Button } from '../components/ui/Button';
import { ProductImage } from '../components/ui/ProductImage';
import { formatCurrency } from '../utils/formatters';
import { InvoiceDetailsModal } from '../components/pos/InvoiceDetailsModal';
import { InvoicePreviewModal } from '../components/printing/InvoicePreviewModal';
import { usePrintStore } from '../store/usePrintStore';

export const PosPage: React.FC = () => {
  const {
    cart,
    barcodeInput,
    discountAmount,
    paidAmount,
    paymentType,
    selectedCustomerId,
    isCheckingOut,
    lastCompletedSale,
    setBarcodeInput,
    setDiscountAmount,
    setPaidAmount,
    setPaymentType,
    setSelectedCustomerId,
    setLastCompletedSale,
    scanBarcode,
    addProductToCart,
    updateQuantity,
    removeItem,
    clearCart,
    executeCheckout,
  } = usePosStore();

  const { products, loadProducts } = useProductsStore();
  const { categories, loadCategories } = useCategoriesStore();
  const { customers, loadCustomers } = useCustomersStore();
  const {
    settings: printSettings,
    loadSettings: loadPrintSettings,
    printInvoice,
    openPreview,
    closePreview,
    previewData,
    isPreviewOpen,
    convertSaleToPrintData,
  } = usePrintStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [, startTransition] = useTransition();

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load products & categories & customers & print settings on mount
  useEffect(() => {
    loadProducts();
    loadCategories();
    loadCustomers();
    loadPrintSettings();
    barcodeInputRef.current?.focus();
  }, [loadProducts, loadCategories, loadCustomers, loadPrintSettings]);

  // Keep barcode input focused for fast scanner usage
  const ensureBarcodeFocused = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Handle USB Barcode Scanner Enter Key
  const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (barcodeInput.trim()) {
        await scanBarcode(barcodeInput);
        ensureBarcodeFocused();
      }
    }
  };

  // Computations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const netTotal = Math.max(0, subtotal - discountAmount);
  const changeAmount = Math.max(0, paidAmount - netTotal);

  // Filtered Products for left quick-select pane
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCheckoutClick = async () => {
    const saleResult = await executeCheckout();
    if (saleResult) {
      loadProducts(); // refresh stock counts

      // Handle Automatic Printing / Print Preview flow
      const printData = convertSaleToPrintData(saleResult);
      if (printSettings.showPreviewBeforePrint) {
        openPreview(printData);
      } else if (printSettings.autoPrint) {
        printInvoice(printData);
      }
    }
    ensureBarcodeFocused();
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-400" />
            <span>نقطة البيع السريع (POS Cashier)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            مسح الباركود، إضافة السلة، وحساب المجموع والمدفوع وإتمام الفواتير بسرعة
          </p>
        </div>

        {/* Dynamic Cart Count Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">إجمالي قطع السلة:</span>
          <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-mono font-bold text-xs">
            {cart.reduce((sum, i) => sum + i.quantity, 0)} قطعة
          </span>
        </div>
      </div>

      {/* Main POS Layout Split (Left: Catalog & Scanner / Right: Cart & Checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Barcode Scanner & Product Selector (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* USB Barcode Scanner Bar */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-blue-600/40 backdrop-blur-md shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Barcode className="w-6 h-6 animate-pulse" />
            </div>

            <div className="flex-1">
              <label className="text-[11px] font-bold text-blue-300 block mb-0.5">
                ماسح الباركود USB (Barcode Scanner)
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="امسح الباركود بالجهاز أو أدخله واضغط Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-400 transition-all"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                await scanBarcode(barcodeInput);
                ensureBarcodeFocused();
              }}
              className="shrink-0"
            >
              <span>إضافة</span>
            </Button>
          </div>

          {/* Search & Category Pills */}
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الباركود للاختيار السريع..."
                value={searchQuery}
                onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Quick-Select Grid (Hides purchase costs for privacy) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isOut = p.currentStock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    addProductToCart(p);
                    ensureBarcodeFocused();
                  }}
                  className={`p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/60 cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
                    isOut ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div>
                    <div className="h-20 w-full rounded-xl bg-slate-950 overflow-hidden mb-2 border border-slate-800/60 flex items-center justify-center text-slate-600">
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        fallbackIconSize={24}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                      {p.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 block">{p.barcode}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">{formatCurrency(p.salePrice)}</span>
                    <span className={`font-mono text-[10px] ${isOut ? 'text-rose-400' : 'text-slate-400'}`}>
                      {isOut ? 'نفذت' : `${p.currentStock} قطعة`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Cart & Checkout Section (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4 flex flex-col justify-between min-h-[580px]">
            <div>
              {/* Cart Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>سلة المبيعات الفعّالة</span>
                </h3>

                {cart.length > 0 && (
                  <button
                    onClick={() => clearCart()}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>تفريغ السلة</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>السلة فارغة حالياً</p>
                    <p className="text-[10px] text-slate-600 mt-1">امسح باركود المنتج أو انقر عليه للإضافة</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-200 truncate">{item.name}</h4>
                        <span className="font-mono text-[10px] text-slate-400 block">{item.barcode}</span>
                        <span className="font-semibold text-emerald-400 text-[11px]">
                          {formatCurrency(item.salePrice)}
                        </span>
                      </div>

                      {/* Quantity Adjuster */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
                        <button
                          onClick={() => {
                            updateQuantity(item.productId, item.quantity - 1);
                            ensureBarcodeFocused();
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-blue-400">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            updateQuantity(item.productId, item.quantity + 1);
                            ensureBarcodeFocused();
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-slate-100 min-w-[60px] text-left">
                          {formatCurrency(item.lineTotal)}
                        </span>
                        <button
                          onClick={() => {
                            removeItem(item.productId);
                            ensureBarcodeFocused();
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Checkout & Payment Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              {/* Financial Calculation Lines */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>المجموع الفرعي (Subtotal):</span>
                  <span className="font-mono font-semibold text-slate-200">{formatCurrency(subtotal)}</span>
                </div>

                {/* Discount Input */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0">خصم الفاتورة (Discount):</span>
                  <div className="relative w-28">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={subtotal}
                      placeholder="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-left font-mono text-xs rounded-lg bg-slate-950 border border-slate-800 text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Net Total Highlight */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-bold text-sm">
                  <span className="text-slate-100">المبلغ الصافي المطلوب:</span>
                  <span className="font-mono text-emerald-400 text-base">{formatCurrency(netTotal)}</span>
                </div>

                {/* Customer Selection (Optional) */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                  <span className="text-slate-400 shrink-0 text-xs flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>العميل (اختياري):</span>
                  </span>
                  <select
                    value={selectedCustomerId || ''}
                    onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                    className="w-48 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 truncate"
                  >
                    <option value="">عميل نقدي (بدون عميل)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('CASH')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentType === 'CASH'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>نقدي (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('CARD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentType === 'CARD'
                        ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>بطاقة (Card)</span>
                  </button>
                </div>
              </div>

              {/* Paid Amount & Change Calculation */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">المبلغ المدفوع من العميل</label>
                  <input
                    type="number"
                    step="1"
                    min={netTotal}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    disabled={paymentType === 'CARD'}
                    className="w-full px-2.5 py-1.5 text-left font-mono font-bold text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">المتبقي للعميل (Baqi)</label>
                  <div className="w-full px-2.5 py-1.5 text-left font-mono font-bold text-xs rounded-xl bg-slate-950 border border-slate-800 text-amber-400 flex items-center justify-between">
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Big Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckoutClick}
                disabled={cart.length === 0 || isCheckingOut || paidAmount < netTotal}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isCheckingOut ? 'جاري الحفظ والخصم...' : 'إتمام البيع وحفظ الفاتورة'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Invoice View Modal */}
      <InvoiceDetailsModal
        sale={lastCompletedSale}
        isOpen={lastCompletedSale !== null}
        onClose={() => setLastCompletedSale(null)}
      />

      {/* 80mm Thermal Receipt Print Preview Modal */}
      <InvoicePreviewModal
        data={previewData}
        isOpen={isPreviewOpen}
        onClose={closePreview}
      />
    </div>
  );
};
