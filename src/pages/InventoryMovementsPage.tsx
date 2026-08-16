import React, { useEffect, useState, useTransition } from 'react';
import { History, Search, Filter, RefreshCw, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StockMovementType } from '../shared/types';

export const InventoryMovementsPage: React.FC = () => {
  const { movements, isLoading, loadInventoryData } = useInventoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<StockMovementType | 'ALL'>('ALL');
  const [, startTransition] = useTransition();

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Movement Type Arabic Translation & Color Helpers
  const renderMovementBadge = (type: StockMovementType) => {
    switch (type) {
      case 'PURCHASE':
        return <Badge variant="success">مشتريات (+)</Badge>;
      case 'SALE':
        return <Badge variant="info">مبيعات (-)</Badge>;
      case 'SALE_RETURN':
        return <Badge variant="warning">مرتجع مبيعات (+)</Badge>;
      case 'PURCHASE_RETURN':
        return <Badge variant="danger">مرتجع مشتريات (-)</Badge>;
      case 'ADJUSTMENT':
      default:
        return <Badge variant="default">تسوية مخزنية</Badge>;
    }
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      (m.productName && m.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.productBarcode && m.productBarcode.includes(searchQuery)) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'ALL' || m.movementType === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-500" />
            <span>سجل وحركات المخزون</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سجل دقيق ومفصل لجميع حركات الإضافة والخصم والتسويات بالمخزن مع الرصيد السابق والجديد
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadInventoryData()}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث بالمنتج، الباركود، أو رقم المرجع..."
            value={searchQuery}
            onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Movement Type Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full sm:w-56 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">جميع حركات المخزون</option>
            <option value="PURCHASE">مشتريات (+)</option>
            <option value="SALE">مبيعات (-)</option>
            <option value="SALE_RETURN">مرتجع مبيعات (+)</option>
            <option value="PURCHASE_RETURN">مرتجع مشتريات (-)</option>
            <option value="ADJUSTMENT">تسويات يدويّة</option>
          </select>
        </div>
      </div>

      {/* Movement Logs Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">تاريخ ووقت الحركة</th>
              <th className="px-4 py-3">المنتج</th>
              <th className="px-4 py-3">الباركود</th>
              <th className="px-4 py-3">نوع الحركة</th>
              <th className="px-4 py-3">الرصيد السابق</th>
              <th className="px-4 py-3">التغيير</th>
              <th className="px-4 py-3">الرصيد الجديد</th>
              <th className="px-4 py-3">المرجع</th>
              <th className="px-4 py-3">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  لا توجد حركات مخزون مسجلة طابق البحث
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const isPositive = m.quantityChange > 0;

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(m.createdAt).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-blue-400" />
                      <span>{m.productName || 'منتج محذوف'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{m.productBarcode || '-'}</td>
                    <td className="px-4 py-3">{renderMovementBadge(m.movementType)}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{m.previousStock} قطعة</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        <span>{isPositive ? `+${m.quantityChange}` : m.quantityChange}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">{m.newStock} قطعة</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{m.referenceId || '-'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{m.notes || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
