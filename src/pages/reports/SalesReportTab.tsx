import React from 'react';
import { Hash, ShoppingCart } from 'lucide-react';
import { useReportsStore } from '../../store/useReportsStore';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';

export const SalesReportTab: React.FC = () => {
  const { salesData, isLoading } = useReportsStore();

  if (isLoading && !salesData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري تحميل تقرير المبيعات...</p>
      </div>
    );
  }

  if (!salesData || salesData.rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        لا توجد فواتير مبيعات مسجلة في هذه الفترة الزمنية.
      </div>
    );
  }

  const { summary, rows } = salesData;

  return (
    <div className="space-y-6 font-sans">
      {/* Sales Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">عدد الفواتير</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {summary.totalInvoices}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي المبيعات</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {formatCurrency(summary.grossSales)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي الخصم</span>
          <span className="text-sm font-bold font-mono text-amber-400 mt-1 block">
            -{formatCurrency(summary.totalDiscounts)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي المرتجع</span>
          <span className="text-sm font-bold font-mono text-rose-400 mt-1 block">
            -{formatCurrency(summary.totalReturns)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
          <span className="text-[10px] text-emerald-300 block">صافي المبيعات</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            {formatCurrency(summary.netSales)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مبيعات نقدية</span>
          <span className="text-sm font-bold font-mono text-slate-200 mt-1 block">
            {formatCurrency(summary.totalCash)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مبيعات بطاقة</span>
          <span className="text-sm font-bold font-mono text-blue-400 mt-1 block">
            {formatCurrency(summary.totalCard)}
          </span>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <span>قائمة فواتير المبيعات الصادرة ({rows.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">رقم الفاتورة</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
                <th className="px-4 py-3">البائع / الكاشير</th>
                <th className="px-4 py-3">طريقة الدفع</th>
                <th className="px-4 py-3">المجموع</th>
                <th className="px-4 py-3">الخصم</th>
                <th className="px-4 py-3">الصافي</th>
                <th className="px-4 py-3">المدفوع</th>
                <th className="px-4 py-3">الباقي</th>
                <th className="px-4 py-3 text-center">عدد الأصناف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{row.invoiceNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(row.createdAt).toLocaleString('ar-EG')}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-semibold">{row.sellerName}</td>
                  <td className="px-4 py-3">
                    {row.paymentType === 'بطاقة' ? (
                      <Badge variant="info">بطاقة</Badge>
                    ) : (
                      <Badge variant="success">كاش</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-amber-400 font-mono">
                    {row.discountAmount > 0 ? `-${formatCurrency(row.discountAmount)}` : '0'}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(row.netAmount)}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{formatCurrency(row.paidAmount)}</td>
                  <td className="px-4 py-3 font-mono text-amber-400">{formatCurrency(row.changeAmount)}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-blue-400">
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
