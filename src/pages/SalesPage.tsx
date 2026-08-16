import React, { useEffect, useTransition } from 'react';
import { Receipt, Search, RefreshCw, Hash, Eye, Printer } from 'lucide-react';
import { useSalesStore } from '../store/useSalesStore';
import { usePrintStore } from '../store/usePrintStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';
import { InvoiceDetailsModal } from '../components/pos/InvoiceDetailsModal';
import { InvoicePreviewModal } from '../components/printing/InvoicePreviewModal';

export const SalesPage: React.FC = () => {
  const {
    salesList,
    selectedSaleDetails,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadSales,
    fetchSaleDetails,
    setSelectedSaleDetails,
  } = useSalesStore();

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

  const [, startTransition] = useTransition();

  useEffect(() => {
    loadSales();
    loadPrintSettings();
  }, [loadSales, loadPrintSettings]);

  const filteredSales = salesList.filter((s) =>
    s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDetails = async (saleId: number) => {
    await fetchSaleDetails(saleId);
  };

  const handleQuickPrint = async (saleId: number) => {
    if (!window.electronAPI) return;
    const saleDetails = await window.electronAPI.getSaleDetails(saleId);
    if (!saleDetails) return;

    const printData = convertSaleToPrintData(saleDetails);
    if (printSettings.showPreviewBeforePrint) {
      openPreview(printData);
    } else {
      await printInvoice(printData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-500" />
            <span>سجل فواتير المبيعات</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            استعراض سجل جميع فواتير البيع الصادرة ومراجعة تفاصيل المبالغ وإعادة طباعة الإيصالات
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadSales()}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة (مثال: INV-000001)..."
            value={searchQuery}
            onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">رقم الفاتورة</th>
              <th className="px-4 py-3">العميل</th>
              <th className="px-4 py-3">تاريخ ووقت البيع</th>
              <th className="px-4 py-3">طريقة الدفع</th>
              <th className="px-4 py-3">المجموع قبل الخصم</th>
              <th className="px-4 py-3">الخصم</th>
              <th className="px-4 py-3">الصافي المطلوب</th>
              <th className="px-4 py-3">المبلغ المدفوع</th>
              <th className="px-4 py-3 text-center">الإجراءات والطباعة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  لا توجد فواتير مبيعات مسجلة
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{s.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-semibold">
                    {s.customerName ? (
                      <span className="text-blue-300">{s.customerName}</span>
                    ) : (
                      <span className="text-slate-400">عميل نقدي</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(s.createdAt).toLocaleString('ar-EG')}
                  </td>
                  <td className="px-4 py-3">
                    {s.paymentType === 'CASH' ? (
                      <Badge variant="success">كاش</Badge>
                    ) : (
                      <Badge variant="info">بطاقة</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatCurrency(s.totalAmount)}</td>
                  <td className="px-4 py-3 text-amber-400 font-mono">
                    {s.discountAmount > 0 ? `-${formatCurrency(s.discountAmount)}` : '0'}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(s.netAmount)}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{formatCurrency(s.paidAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetails(s.id)}
                        className="text-blue-400 hover:bg-blue-600/10 text-[11px] px-2"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickPrint(s.id)}
                        className="text-emerald-400 hover:bg-emerald-600/10 text-[11px] px-2"
                        title="إعادة طباعة الفاتورة (80mm)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        sale={selectedSaleDetails}
        isOpen={selectedSaleDetails !== null}
        onClose={() => setSelectedSaleDetails(null)}
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
