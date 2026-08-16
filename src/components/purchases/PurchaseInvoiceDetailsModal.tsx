import React from 'react';
import { Truck, Calendar, Hash, Package } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/formatters';
import { PurchaseWithItems } from '../../shared/types';

interface PurchaseInvoiceDetailsModalProps {
  purchase: PurchaseWithItems | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseInvoiceDetailsModal: React.FC<PurchaseInvoiceDetailsModalProps> = ({
  purchase,
  isOpen,
  onClose,
}) => {
  if (!purchase) return null;

  const changeAmount = Math.max(0, purchase.paidAmount - purchase.totalAmount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل فاتورة الشراء: ${purchase.invoiceNumber}`}
      maxWidth="xl"
    >
      <div className="space-y-5 text-right font-sans">
        {/* Header Info */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">رقم الفاتورة</span>
            <span className="font-mono font-bold text-blue-400 flex items-center gap-1 mt-0.5">
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span>{purchase.invoiceNumber}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">اسم المورد</span>
            <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
              <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{purchase.supplierName || 'عام'}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">تاريخ الشراء</span>
            <span className="text-slate-200 font-mono text-[11px] flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{new Date(purchase.createdAt).toLocaleString('ar-EG')}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">حالة السداد</span>
            <div className="mt-0.5">
              <Badge variant="success">مدفوعة بالكامل</Badge>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-400" />
            <span>قائمة الأصناف المشتراة بالمخزن ({purchase.items.length})</span>
          </h4>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">الصنف</th>
                  <th className="px-4 py-2.5">الباركود</th>
                  <th className="px-4 py-2.5">تكلفة التوحيد (Unit Cost)</th>
                  <th className="px-4 py-2.5">الكمية المشتراة</th>
                  <th className="px-4 py-2.5">إجمالي التكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {purchase.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="px-4 py-2.5 font-bold text-slate-100 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.productName || `منتج #${item.productId}`}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{item.productBarcode || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-300">{formatCurrency(item.unitCost)}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">
                      +{item.quantity} قطعة
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-100">{formatCurrency(item.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-sm text-emerald-400">
            <span>إجمالي تكلفة الفاتورة:</span>
            <span>{formatCurrency(purchase.totalAmount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>المبلغ المدفوع للمورد:</span>
              <span className="font-mono font-bold text-slate-100">{formatCurrency(purchase.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>المتبقي للمحل:</span>
              <span className="font-mono font-bold text-amber-400">{formatCurrency(changeAmount)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
