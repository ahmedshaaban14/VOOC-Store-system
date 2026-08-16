import React from 'react';
import { Percent, Package, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useReportsStore } from '../../store/useReportsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/formatters';

export const ProfitReportTab: React.FC = () => {
  const { profitData, isLoading } = useReportsStore();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-200">غير مصرح بالوصول</h3>
        <p className="text-xs text-slate-400 mt-1">تقرير الأرباح والتكلفة مخصص فقط لمدير النظام (Admin).</p>
      </div>
    );
  }

  if (isLoading && !profitData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري حساب الأرباح بناءً على التكلفة التاريخية الدقيقة...</p>
      </div>
    );
  }

  if (!profitData || profitData.rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        لا توجد بيانات مبيعات أو أرباح مسجلة في هذه الفترة الزمنية.
      </div>
    );
  }

  const { summary, rows } = profitData;

  return (
    <div className="space-y-6 font-sans">
      {/* Historical Cost Protection Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/40 flex items-center gap-3 text-xs text-blue-300">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <p>
          <span className="font-bold">حماية التكلفة التاريخية مفعلة:</span> يتم احتساب تكلفة البضاعة المباعة (COGS) والأرباح بدقة متناهية بناءً على سعر شراء الصنف في لحظة تنفيذ كل عملية بيع.
        </p>
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي المبيعات</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {formatCurrency(summary.grossSales)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">الخصومات</span>
          <span className="text-sm font-bold font-mono text-amber-400 mt-1 block">
            -{formatCurrency(summary.totalDiscounts)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">مرتجع المبيعات</span>
          <span className="text-sm font-bold font-mono text-rose-400 mt-1 block">
            -{formatCurrency(summary.salesReturnsAmount)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-300 block">صافي المبيعات</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {formatCurrency(summary.netSales)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">تكلفة البضاعة (COGS)</span>
          <span className="text-sm font-bold font-mono text-amber-300 mt-1 block">
            {formatCurrency(summary.totalCogs)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
          <span className="text-[10px] text-emerald-300 block">إجمالي الربح الصافي</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            {formatCurrency(summary.grossProfit)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40">
          <span className="text-[10px] text-blue-300 block">هامش الربح</span>
          <span className="text-sm font-bold font-mono text-blue-400 mt-1 block">
            {summary.profitMarginPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Product-Level Profitability Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span>ربحية الأصناف والمنتجات المباعة ({rows.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">الصنف</th>
                <th className="px-4 py-3">الباركود</th>
                <th className="px-4 py-3 text-center">الكمية المباعة</th>
                <th className="px-4 py-3 text-center">المرتجع</th>
                <th className="px-4 py-3">صافي الإيراد</th>
                <th className="px-4 py-3">التكلفة التاريخية للوحدة</th>
                <th className="px-4 py-3">إجمالي التكلفة (COGS)</th>
                <th className="px-4 py-3">صافي الربح</th>
                <th className="px-4 py-3 text-center">هامش الربح %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((row) => (
                <tr key={row.productId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{row.productName}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{row.productBarcode || '-'}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-blue-400">
                    {row.quantitySold}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-rose-400">
                    {row.returnedQty > 0 ? `-${row.returnedQty}` : '0'}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {formatCurrency(row.netRevenue)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {formatCurrency(row.historicalUnitCost)}
                  </td>
                  <td className="px-4 py-3 font-mono text-amber-400">
                    {formatCurrency(row.totalCogs)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {formatCurrency(row.grossProfit)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-blue-400">
                    {row.profitMarginPercent.toFixed(1)}%
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
