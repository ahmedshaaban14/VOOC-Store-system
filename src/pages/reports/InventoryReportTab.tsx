import React from 'react';
import { Warehouse, Package } from 'lucide-react';
import { useReportsStore } from '../../store/useReportsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';

export const InventoryReportTab: React.FC = () => {
  const { inventoryData, isLoading } = useReportsStore();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  if (isLoading && !inventoryData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري تحميل تقرير المخزون وحالة الأصناف...</p>
      </div>
    );
  }

  if (!inventoryData || inventoryData.rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        لا توجد أصناف مسجلة بالمخزن حالياً.
      </div>
    );
  }

  const { summary, rows } = inventoryData;

  return (
    <div className="space-y-6 font-sans">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي الأصناف</span>
          <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
            {summary.totalProducts} صنف
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">إجمالي عدد القطع</span>
          <span className="text-sm font-bold font-mono text-blue-400 mt-1 block">
            {summary.totalStockQuantity} قطعة
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-emerald-400 block">أصناف متوفرة</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            {summary.inStockCount} صنف
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-amber-400 block">منخفض المخزون</span>
          <span className="text-sm font-bold font-mono text-amber-400 mt-1 block">
            {summary.lowStockCount} صنف
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-rose-400 block">أصناف نفدت</span>
          <span className="text-sm font-bold font-mono text-rose-400 mt-1 block">
            {summary.outOfStockCount} صنف
          </span>
        </div>

        {isAdmin && (
          <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-800/40">
            <span className="text-[10px] text-teal-300 block">القيمة التقديرية</span>
            <span className="text-sm font-bold font-mono text-teal-400 mt-1 block">
              {formatCurrency(summary.totalInventoryValue || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Products Stock Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-blue-400" />
            <span>بيانات مخزون الأصناف ({rows.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">اسم الصنف</th>
                <th className="px-4 py-3">الباركود</th>
                <th className="px-4 py-3">القسم</th>
                <th className="px-4 py-3 text-center">المخزون الحالي</th>
                <th className="px-4 py-3 text-center">حد الطلب</th>
                <th className="px-4 py-3">سعر البيع</th>
                {isAdmin && (
                  <>
                    <th className="px-4 py-3">سعر التكلفة</th>
                    <th className="px-4 py-3">القيمة الإجمالية</th>
                  </>
                )}
                <th className="px-4 py-3 text-center">حالة التوفر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{row.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{row.barcode}</td>
                  <td className="px-4 py-3 text-slate-300">{row.categoryName}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-100">
                    {row.currentStock} قطعة
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">
                    {row.minStockLevel}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">{formatCurrency(row.salePrice)}</td>
                  {isAdmin && (
                    <>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {formatCurrency(row.purchasePrice || 0)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-400">
                        {formatCurrency(row.totalValue || 0)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-center">
                    {row.status === 'OUT' ? (
                      <Badge variant="danger">نفد المخزون</Badge>
                    ) : row.status === 'LOW' ? (
                      <Badge variant="warning">منخفض</Badge>
                    ) : (
                      <Badge variant="success">متوفر</Badge>
                    )}
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
