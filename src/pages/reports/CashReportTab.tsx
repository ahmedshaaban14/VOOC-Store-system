import React from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import { useReportsStore } from '../../store/useReportsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';

export const CashReportTab: React.FC = () => {
  const { cashData, isLoading } = useReportsStore();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-200">غير مصرح بالوصول</h3>
        <p className="text-xs text-slate-400 mt-1">تقرير الخزينة وحركة النقدية متاح فقط لمدير النظام (Admin).</p>
      </div>
    );
  }

  if (isLoading && !cashData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري تحميل تقرير حركة الخزينة...</p>
      </div>
    );
  }

  if (!cashData || cashData.rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        لا توجد حركات نقدية مسجلة في هذه الفترة الزمنية.
      </div>
    );
  }

  const { summary, rows } = cashData;

  return (
    <div className="space-y-6 font-sans">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي الوارد (IN)</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            +{formatCurrency(summary.totalIn)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي المنصرف (OUT)</span>
          <span className="text-sm font-bold font-mono text-rose-400 mt-1 block">
            -{formatCurrency(summary.totalOut)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مبيعات نقدية</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {formatCurrency(summary.cashSales)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مشتريات نقدية</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {formatCurrency(summary.cashPurchases)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مرتجع مبيعات</span>
          <span className="text-sm font-bold font-mono text-amber-400 mt-1 block">
            -{formatCurrency(summary.salesReturns)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مرتجع مشتريات</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            +{formatCurrency(summary.purchaseReturns)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
          <span className="text-[10px] text-emerald-300 block">الرصيد النقدي الحالي</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            {formatCurrency(summary.currentBalance)}
          </span>
        </div>
      </div>

      {/* Cash Ledger Transactions Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>سجل حركات الخزينة ({rows.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">التاريخ والوقت</th>
                <th className="px-4 py-3">نوع الحركة</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">البند / التصنيف</th>
                <th className="px-4 py-3">رقم المرجع</th>
                <th className="px-4 py-3">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(row.createdAt).toLocaleString('ar-EG')}
                  </td>
                  <td className="px-4 py-3">
                    {row.type === 'IN' ? (
                      <Badge variant="success">وارد (IN)</Badge>
                    ) : (
                      <Badge variant="danger">منصرف (OUT)</Badge>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 font-mono font-bold ${
                      row.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.type === 'IN' ? '+' : '-'}
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-semibold">{row.category}</td>
                  <td className="px-4 py-3 font-mono text-blue-400">{row.referenceId || '-'}</td>
                  <td className="px-4 py-3 text-slate-400">{row.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
