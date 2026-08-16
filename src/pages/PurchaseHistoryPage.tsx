import React, { useEffect, useTransition } from 'react';
import { Truck, Search, RefreshCw, Hash, Eye, Package } from 'lucide-react';
import { usePurchasesStore } from '../store/usePurchasesStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';
import { PurchaseInvoiceDetailsModal } from '../components/purchases/PurchaseInvoiceDetailsModal';

export const PurchaseHistoryPage: React.FC = () => {
  const {
    purchasesList,
    selectedPurchaseDetails,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadPurchases,
    fetchPurchaseDetails,
    setSelectedPurchaseDetails,
  } = usePurchasesStore();

  const [, startTransition] = useTransition();

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const filteredPurchases = purchasesList.filter(
    (p) =>
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenDetails = async (purchaseId: number) => {
    await fetchPurchaseDetails(purchaseId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            <span>سجل فواتير المشتريات العامة</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سجل دقيق لجميع فواتير الشراء الواردة من الموردين وتكلفة البضاعة المقيدة بالمخزن
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadPurchases()}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو اسم المورد..."
            value={searchQuery}
            onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Purchase Invoices Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">رقم الفاتورة</th>
              <th className="px-4 py-3">المورد</th>
              <th className="px-4 py-3">تاريخ ووقت الشراء</th>
              <th className="px-4 py-3">إجمالي الفاتورة</th>
              <th className="px-4 py-3">المبلغ المدفوع</th>
              <th className="px-4 py-3">حالة الفاتورة</th>
              <th className="px-4 py-3 text-center">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  لا توجد فواتير مشتريات مسجلة
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{p.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{p.supplierName || 'عام'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(p.createdAt).toLocaleString('ar-EG')}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-400">
                    {formatCurrency(p.totalAmount)}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">{formatCurrency(p.paidAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="success">مدفوعة بالكامل</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDetails(p.id)}
                      className="text-blue-400 hover:bg-blue-600/10 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض الفاتورة</span>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      <PurchaseInvoiceDetailsModal
        purchase={selectedPurchaseDetails}
        isOpen={selectedPurchaseDetails !== null}
        onClose={() => setSelectedPurchaseDetails(null)}
      />
    </div>
  );
};
