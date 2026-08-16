import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, Hash, CheckCircle2, ArrowRight, Package, Truck } from 'lucide-react';
import { usePurchaseReturnsStore } from '../store/usePurchaseReturnsStore';
import { usePurchasesStore } from '../store/usePurchasesStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';

export const PurchaseReturnsPage: React.FC = () => {
  const {
    purchaseReturnsList,
    selectedPurchase,
    returnableItems,
    searchInvoiceQuery,
    isProcessing,
    isLoading,
    setSearchInvoiceQuery,
    updateReturnQty,
    clearSelection,
    loadPurchaseReturnsList,
    loadReturnablePurchaseDetails,
    executePurchaseReturn,
  } = usePurchaseReturnsStore();

  const { purchasesList, loadPurchases } = usePurchasesStore();

  const [notesInput, setNotesInput] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  useEffect(() => {
    loadPurchaseReturnsList();
    loadPurchases();
  }, [loadPurchaseReturnsList, loadPurchases]);

  const handleSearchInvoice = async (purchaseIdToFetch?: number) => {
    if (purchaseIdToFetch) {
      await loadReturnablePurchaseDetails(purchaseIdToFetch);
      return;
    }

    const trimmed = searchInvoiceQuery.trim();
    if (!trimmed) return;

    const matchedPurchase = purchasesList.find(
      (p) => p.invoiceNumber.toLowerCase() === trimmed.toLowerCase() || String(p.id) === trimmed
    );

    if (matchedPurchase) {
      await loadReturnablePurchaseDetails(matchedPurchase.id);
    } else {
      alert(`لم يتم العثور على فاتورة مشتريات برقم [${trimmed}]`);
    }
  };

  const totalRefundAmount = returnableItems.reduce(
    (sum, item) => sum + (item.returnQty || 0) * item.unitCost,
    0
  );

  const handleConfirmReturn = async () => {
    const res = await executePurchaseReturn(notesInput);
    if (res) {
      setNotesInput('');
      loadPurchases();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-500" />
            <span>إدارة مرتجعات المشتريات (إرجاع بضاعة للمورد)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إرجاع البضاعة التالفة أو الزائدة للموردين وخصمها من رصيد المخزون واسترداد النقدية
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            إرجاع بضاعة للمورد
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadPurchaseReturnsList();
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            سجل مرتجعات المشتريات ({purchaseReturnsList.length})
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-5">
          {/* Invoice Lookup Bar */}
          {!selectedPurchase ? (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" />
                <span>ابحث عن فاتورة المشتريات المراد إرجاع أصناف منها للمورد</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ادخل رقم فاتورة الشراء (مثال: PUR-000001)..."
                    value={searchInvoiceQuery}
                    onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSearchInvoice()}
                  disabled={isLoading || !searchInvoiceQuery.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white w-full sm:w-auto"
                >
                  <Search className="w-4 h-4" />
                  <span>بحث عن الفاتورة</span>
                </Button>
              </div>

              {/* Quick Pick Recent Purchases Table */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">أحدث فواتير المشتريات للاختيار السريع:</span>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900/90 text-slate-400">
                      <tr>
                        <th className="px-3 py-2">رقم الفاتورة</th>
                        <th className="px-3 py-2">المورد</th>
                        <th className="px-3 py-2">التاريخ</th>
                        <th className="px-3 py-2">إجمالي الفاتورة</th>
                        <th className="px-3 py-2 text-center">اختيار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {purchasesList.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/60">
                          <td className="px-3 py-2 font-mono font-bold text-blue-400">{p.invoiceNumber}</td>
                          <td className="px-3 py-2 font-bold flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span>{p.supplierName || 'عام'}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">
                            {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-3 py-2 font-bold text-emerald-400">{formatCurrency(p.totalAmount)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleSearchInvoice(p.id)}
                              className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded font-bold text-[11px] transition-colors"
                            >
                              تحديد للفاتورة
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Selected Invoice Purchase Return Execution Screen */
            <div className="space-y-4">
              {/* Selected Invoice Details Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">
                      مرتجع للفاتورة رقم: <span className="font-mono text-purple-400">{selectedPurchase.invoiceNumber}</span>
                    </h3>
                    <Badge variant="info">
                      المورد: {selectedPurchase.supplierName || 'عام'}
                    </Badge>
                  </div>
                  <p className="text-slate-400">
                    تاريخ الشراء: {new Date(selectedPurchase.createdAt).toLocaleString('ar-EG')} | الإجمالي الأصلي:{' '}
                    <span className="font-bold text-emerald-400">{formatCurrency(selectedPurchase.totalAmount)}</span>
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تغيير الفاتورة</span>
                </Button>
              </div>

              {/* Items Return Table */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">الصنف</th>
                      <th className="px-4 py-3">الباركود</th>
                      <th className="px-4 py-3">الكمية المشتراة</th>
                      <th className="px-4 py-3">تم إرجاعه سابقاً</th>
                      <th className="px-4 py-3 text-purple-400">المتبقي للإرجاع</th>
                      <th className="px-4 py-3 text-blue-400">المخزون الحالي بالمعرض</th>
                      <th className="px-4 py-3">التكلفة الأصلية</th>
                      <th className="px-4 py-3">الكمية المراد إرجاعها للمورد</th>
                      <th className="px-4 py-3">المبلغ المسترد من المورد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {returnableItems.map((item) => {
                      const maxAllowed = Math.min(item.returnableQty, item.currentStock);
                      const lineRefund = (item.returnQty || 0) * item.unitCost;
                      return (
                        <tr key={item.productId} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.productName}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">{item.productBarcode}</td>
                          <td className="px-4 py-3 font-mono">{item.quantity} قطعة</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{item.alreadyReturnedQty} قطعة</td>
                          <td className="px-4 py-3 font-mono font-bold text-purple-400">
                            {item.returnableQty} قطعة
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-blue-400">
                            {item.currentStock} قطعة
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-28">
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                value={item.returnQty || ''}
                                onChange={(e) => updateReturnQty(item.productId, Number(e.target.value))}
                                disabled={maxAllowed === 0}
                                className="w-full px-2.5 py-1 text-center font-mono font-bold rounded-lg bg-slate-950 border border-slate-700 text-purple-300 text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                            {formatCurrency(lineRefund)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Refund & Confirm Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-96 space-y-1">
                  <label className="text-[11px] text-slate-400 block">ملاحظات المرتجع للمورد (اختياري)</label>
                  <input
                    type="text"
                    placeholder="سبب الإرجاع: بضاعة تالفة / عيوب تصنيع..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <div className="text-left font-sans">
                    <span className="text-[11px] text-slate-400 block">إجمالي المسترد من المورد:</span>
                    <span className="font-mono text-lg font-bold text-purple-400">
                      {formatCurrency(totalRefundAmount)}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleConfirmReturn}
                    disabled={isProcessing || totalRefundAmount === 0}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-purple-950/50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'جاري التنفيذ...' : 'تأكيد مرتجع الشراء وخصم المخزون'}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">رقم سند المرتجع</th>
                  <th className="px-4 py-3">فاتورة الشراء الأصلية</th>
                  <th className="px-4 py-3">تاريخ الإرجاع</th>
                  <th className="px-4 py-3">إجمالي المسترد</th>
                  <th className="px-4 py-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {purchaseReturnsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      لا توجد عمليات مرتجع مشتريات مسجلة
                    </td>
                  </tr>
                ) : (
                  purchaseReturnsList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-purple-400">{r.returnNumber}</td>
                      <td className="px-4 py-3 font-mono text-blue-400">
                        {r.purchaseInvoiceNumber || `مشتريات #${r.purchaseId}`}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(r.createdAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-400">
                        {formatCurrency(r.refundAmount)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{r.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
