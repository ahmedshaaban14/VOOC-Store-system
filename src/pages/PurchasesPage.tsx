import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  Truck,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  DollarSign,
  CreditCard,
  RotateCcw,
  Package,
} from 'lucide-react';

import { usePurchasePosStore } from '../store/usePurchasePosStore';
import { useSuppliersStore } from '../store/useSuppliersStore';
import { useProductsStore } from '../store/useProductsStore';
import { Button } from '../components/ui/Button';
import { ProductImage } from '../components/ui/ProductImage';
import { formatCurrency } from '../utils/formatters';
import { PurchaseInvoiceDetailsModal } from '../components/purchases/PurchaseInvoiceDetailsModal';

export const PurchasesPage: React.FC = () => {
  const {
    selectedSupplierId,
    cart,
    barcodeInput,
    paidAmount,
    paymentType,
    isCheckingOut,
    lastCompletedPurchase,
    setSelectedSupplierId,
    setBarcodeInput,
    setPaidAmount,
    setPaymentType,
    setLastCompletedPurchase,
    scanBarcode,
    addProductToCart,
    updateQuantity,
    updateUnitCost,
    removeItem,
    clearCart,
    executeCheckout,
  } = usePurchasePosStore();

  const { suppliers, loadSuppliers, setIsModalOpen: setIsSupplierModalOpen } = useSuppliersStore();
  const { products, loadProducts } = useProductsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
    barcodeInputRef.current?.focus();
  }, [loadSuppliers, loadProducts]);

  const ensureBarcodeFocused = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (barcodeInput.trim()) {
        await scanBarcode(barcodeInput);
        ensureBarcodeFocused();
      }
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const changeAmount = Math.max(0, paidAmount - totalAmount);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
  );

  const handleCheckoutClick = async () => {
    const purchaseResult = await executeCheckout();
    if (purchaseResult) {
      loadProducts(); // refresh stock & purchase price
    }
    ensureBarcodeFocused();
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" />
            <span>تسجيل فواتير المشتريات (شراء بضاعة)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            إدخال المشتريات من الموردين وتعديل تكلفة القطعة وزيادة رصيد المخزون فورياً
          </p>
        </div>
      </div>

      {/* Supplier Selection Top Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Truck className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200 shrink-0">اختر المورد:</span>
          <select
            value={selectedSupplierId || ''}
            onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-bold"
          >
            <option value="">-- اختر المورد من القائمة --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.phone ? `(${s.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSupplierModalOpen(true)}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>مورد جديد</span>
        </Button>
      </div>

      {/* Main Split Grid (Left: Products & Scanner / Right: Purchase Cart & Checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Barcode Scanner & Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          {/* USB Barcode Scanner Bar */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-blue-600/40 backdrop-blur-md flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Barcode className="w-6 h-6 animate-pulse" />
            </div>

            <div className="flex-1">
              <label className="text-[11px] font-bold text-blue-300 block mb-0.5">
                ماسح الباركود USB (Purchase Barcode Scanner)
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="امسح باركود صنف الملابس لإضافته لسلة المشتريات..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-400"
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
              إضافة
            </Button>
          </div>

          {/* Search Products */}
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث عن صنف للاختيار السريع..."
                value={searchQuery}
                onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  addProductToCart(p);
                  ensureBarcodeFocused();
                }}
                className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/60 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
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
                  <div>
                    <span className="text-[9px] text-slate-400 block">التكلفة الحالية</span>
                    <span className="font-semibold text-slate-300">{formatCurrency(p.purchasePrice)}</span>
                  </div>
                  <span className="font-mono text-[10px] text-blue-400 font-bold">{p.currentStock} قطعة</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE: Purchase Cart & Invoice Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4 flex flex-col justify-between min-h-[580px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span>سلة أصناف الفاتورة الشراء</span>
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

              {/* Cart List */}
              <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>سلة المشتريات فارغة</p>
                    <p className="text-[10px] text-slate-600 mt-1">اختر المورد ثم امسح الباركود لإضافة الأصناف</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-200">{item.name}</h4>
                          <span className="font-mono text-[10px] text-slate-400">{item.barcode}</span>
                        </div>
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

                      {/* Quantity & Unit Cost Editable Controls */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 items-center">
                        {/* Quantity */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                          <button
                            onClick={() => {
                              updateQuantity(item.productId, item.quantity - 1);
                              ensureBarcodeFocused();
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:bg-slate-800"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-blue-400">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              updateQuantity(item.productId, item.quantity + 1);
                              ensureBarcodeFocused();
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:bg-slate-800"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Editable Unit Cost */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 shrink-0">التكلفة:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.unitCost}
                            onChange={(e) => updateUnitCost(item.productId, Number(e.target.value))}
                            className="w-full px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-left font-mono font-bold text-emerald-400 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="text-left font-mono text-[11px] text-slate-300 font-bold">
                        إجمالي الصنف: {formatCurrency(item.lineTotal)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Checkout & Payment Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm font-bold text-emerald-400">
                <span className="text-slate-100">إجمالي فاتورة الشراء:</span>
                <span className="font-mono text-base">{formatCurrency(totalAmount)}</span>
              </div>

              {/* Payment Type Selector */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 block">طريقة سداد المورد</label>
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

              {/* Paid & Change Calculation */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">المبلغ المدفوع للمورد</label>
                  <input
                    type="number"
                    step="1"
                    min={totalAmount}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    disabled={paymentType === 'CARD'}
                    className="w-full px-2.5 py-1.5 text-left font-mono font-bold text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">المتبقي للمحل</label>
                  <div className="w-full px-2.5 py-1.5 text-left font-mono font-bold text-xs rounded-xl bg-slate-950 border border-slate-800 text-amber-400 flex items-center justify-between">
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckoutClick}
                disabled={!selectedSupplierId || cart.length === 0 || isCheckingOut || paidAmount < totalAmount}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isCheckingOut ? 'جاري الاعتماد والخصم...' : 'إتمام الفاتورة وزيادة المخزون'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Purchase Receipt Modal */}
      <PurchaseInvoiceDetailsModal
        purchase={lastCompletedPurchase}
        isOpen={lastCompletedPurchase !== null}
        onClose={() => setLastCompletedPurchase(null)}
      />
    </div>
  );
};
