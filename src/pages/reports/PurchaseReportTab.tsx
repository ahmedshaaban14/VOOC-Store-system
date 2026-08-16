import React from 'react';
import { ShoppingBag, Hash, AlertTriangle, Truck } from 'lucide-react';
import { useReportsStore } from '../../store/useReportsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/formatters';

export const PurchaseReportTab: React.FC = () => {
  const { purchasesData, isLoading } = useReportsStore();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-200">غير مصرح بالوصول</h3>
        <p className="text-xs text-slate-400 mt-1">تقرير المشتريات والموردين متاح فقط لمدير النظام (Admin).</p>
      </div>
    );
  }

  if (isLoading && !purchasesData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري تحميل تقرير المشتريات...</p>
      </div>
    );
  }

  if (!purchasesData || purchasesData.rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        لا توجد فواتير مشتريات مسجلة في هذه الفترة الزمنية.
      </div>
    );
  }

  const { summary, rows } = purchasesData;

  return (
    <div className="space-y-6 font-sans">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-400 block">عدد فواتير الشراء</span>
          <p className="text-lg font-bold font-mono text-slate-100 mt-1">{summary.totalPurchases}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-400 block">إجمالي المشتريات</span>
          <p className="text-lg font-bold font-mono text-slate-100 mt-1">{formatCurrency(summary.totalAmount)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-400 block">إجمالي المرتجعات للموردين</span>
          <p className="text-lg font-bold font-mono text-rose-400 mt-1">-{formatCurrency(summary.totalReturns)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 backdrop-blur-md">
          <span className="text-xs font-semibold text-indigo-300 block">صافي المشتريات</span>
          <p className="text-lg font-bold font-mono text-indigo-400 mt-1">{formatCurrency(summary.netPurchases)}</p>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <span>قائمة فواتير المشتريات ({rows.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">رقم فاتورة الشراء</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
                <th className="px-4 py-3">المورد</th>
                <th className="px-4 py-3">إجمالي الفاتورة</th>
                <th className="px-4 py-3">المبلغ المسدد</th>
                <th className="px-4 py-3 text-center">عدد الأصناف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{row.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(row.createdAt).toLocaleString('ar-EG')}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-semibold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{row.supplierName}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-100 font-mono">
                    {formatCurrency(row.totalAmount)}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400">
                    {formatCurrency(row.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-blue-400">
                    {row.itemsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
