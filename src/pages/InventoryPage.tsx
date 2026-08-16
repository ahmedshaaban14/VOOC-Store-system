import { useEffect, useState, useTransition, FormEvent } from 'react';
import {
  Boxes,
  Search,
  Tag,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  DollarSign,
  Package,
} from 'lucide-react';

import { useInventoryStore } from '../store/useInventoryStore';
import { useCategoriesStore } from '../store/useCategoriesStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ProductImage } from '../components/ui/ProductImage';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Product, StockMovementType } from '../shared/types';

export const InventoryPage: React.FC = () => {
  const {
    inventoryItems,
    isLoading,
    searchQuery,
    selectedCategory,
    stockFilter,
    setSearchQuery,
    setSelectedCategory,
    setStockFilter,
    loadInventoryData,
    applyStockAdjustment,
  } = useInventoryStore();

  const { categories, loadCategories } = useCategoriesStore();

  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<StockMovementType>('ADJUSTMENT');
  const [quantityChange, setQuantityChange] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    loadInventoryData();
    loadCategories();
  }, [loadInventoryData, loadCategories]);

  // Total Inventory Valuation Calculation
  const totalInventoryValue = inventoryItems.reduce(
    (sum, item) => sum + item.currentStock * item.purchasePrice,
    0
  );
  const totalStockCount = inventoryItems.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = inventoryItems.filter(
    (item) => item.currentStock <= item.minStockLevel && item.currentStock > 0
  ).length;
  const outOfStockCount = inventoryItems.filter((item) => item.currentStock === 0).length;

  // Filtered List
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'ALL' || item.categoryId === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'LOW') {
      matchesStock = item.currentStock <= item.minStockLevel && item.currentStock > 0;
    } else if (stockFilter === 'OUT') {
      matchesStock = item.currentStock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleOpenAdjust = (product: Product) => {
    setSelectedProductForAdjust(product);
    setAdjustmentType('ADJUSTMENT');
    setQuantityChange('0');
    setNotes('');
    setReferenceId(`ADJ-${Date.now().toString().slice(-4)}`);
  };

  const handleAdjustSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;

    const changeVal = Number(quantityChange);
    if (isNaN(changeVal) || changeVal === 0) return;

    setIsSubmitting(true);
    const ok = await applyStockAdjustment({
      productId: selectedProductForAdjust.id,
      movementType: adjustmentType,
      quantityChange: changeVal,
      referenceId,
      notes,
    });
    setIsSubmitting(false);

    if (ok) {
      setSelectedProductForAdjust(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-500" />
            <span>جرد وتقييم المخزون</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            متابعة رصيد الأصناف بالمخزن وقيمة البضاعة الإجمالية وحركات التسوية المعتمدة
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadInventoryData()}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث بيانات الجرد</span>
        </Button>
      </div>

      {/* Summary Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">إجمالي قيمة المخزون</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              {formatCurrency(totalInventoryValue)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">إجمالي عدد القطع</span>
            <span className="text-lg font-bold text-slate-100 font-mono mt-0.5 block">
              {formatNumber(totalStockCount)} قطعة
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">أصناف بحد النفاذ</span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">
              {lowStockCount} أصناف
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">أصناف منتهية بالكامل</span>
            <span className="text-lg font-bold text-rose-400 font-mono mt-0.5 block">
              {outOfStockCount} أصناف
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Actions */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم المنتج أو الباركود..."
              value={searchQuery}
              onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="w-full sm:w-48 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">جميع الأقسام ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Status Pills Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setStockFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              stockFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setStockFilter('LOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              stockFilter === 'LOW'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            منخفض ({lowStockCount})
          </button>
          <button
            onClick={() => setStockFilter('OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              stockFilter === 'OUT'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            منتهي ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">المنتج</th>
              <th className="px-4 py-3">الباركود</th>
              <th className="px-4 py-3">سعر الشراء</th>
              <th className="px-4 py-3">سعر البيع</th>
              <th className="px-4 py-3">الكمية بالمخزن</th>
              <th className="px-4 py-3">إجمالي قيمة الصنف</th>
              <th className="px-4 py-3">حالة المخزون</th>
              <th className="px-4 py-3 text-center">إجراء تسوية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  لا توجد أصناف مطابقة لخيارات الفلترة
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isOut = item.currentStock === 0;
                const isLow = item.currentStock <= item.minStockLevel && !isOut;
                const itemValuation = item.currentStock * item.purchasePrice;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center text-slate-600">
                        <ProductImage
                          src={item.image}
                          alt={item.name}
                          fallbackIconSize={16}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span>{item.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{item.barcode}</td>
                    <td className="px-4 py-3 text-slate-400">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {formatCurrency(item.salePrice)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{item.currentStock} قطعة</td>
                    <td className="px-4 py-3 font-bold text-slate-100">
                      {formatCurrency(itemValuation)}
                    </td>
                    <td className="px-4 py-3">
                      {isOut ? (
                        <Badge variant="danger">نفذت الكمية</Badge>
                      ) : isLow ? (
                        <Badge variant="warning">منخفض جداً</Badge>
                      ) : (
                        <Badge variant="success">متوفر</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAdjust(item)}
                        className="text-blue-400 hover:bg-blue-600/10 text-[11px]"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>تسوية مخزنية</span>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controlled Stock Adjustment Modal */}
      <Modal
        isOpen={selectedProductForAdjust !== null}
        onClose={() => setSelectedProductForAdjust(null)}
        title={`تسوية مخزنية للمنتج: ${selectedProductForAdjust?.name || ''}`}
        maxWidth="md"
      >
        {selectedProductForAdjust && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-right">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">الرصيد الحالي بالمخزن:</span>
                <span className="font-mono font-bold text-blue-400">
                  {selectedProductForAdjust.currentStock} قطعة
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">الباركود:</span>
                <span className="font-mono text-slate-300">{selectedProductForAdjust.barcode}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">نوع التسوية</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as StockMovementType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ADJUSTMENT">تسوية مخزنية يدوية</option>
                <option value="PURCHASE">إضافة مشتريات (+)</option>
                <option value="SALE">خصم مبيعات (-)</option>
                <option value="SALE_RETURN">إرجاع مبيعات (+)</option>
                <option value="PURCHASE_RETURN">إرجاع مشتريات (-)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="مقدار التغيير في الكمية (+ أو -)"
                type="number"
                placeholder="مثال: 5 أو -3"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                required
              />

              <Input
                label="رقم المرجع (إذن تسوية / فاتورة)"
                placeholder="ADJ-1001"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            </div>

            <Input
              label="ملاحظات وسسبب التعديل"
              placeholder="مثال: جرد دوري / عجز بالقطع / تالف"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductForAdjust(null)}
              >
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الاعتماد...' : 'اعتماد حركة التسوية'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
