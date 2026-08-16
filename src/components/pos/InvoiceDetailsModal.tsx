import React from 'react';
import { ShoppingBag, Calendar, Hash, Package, Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../utils/formatters';
import { SaleWithItems } from '../../shared/types';
import { usePrintStore } from '../../store/usePrintStore';

interface InvoiceDetailsModalProps {
  sale: SaleWithItems | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const { printInvoice, openPreview, settings, isPrinting, convertSaleToPrintData } =
    usePrintStore();

  if (!sale) return null;

  const changeAmount = Math.max(0, sale.paidAmount - sale.netAmount);

  const handlePrintClick = async () => {
    const printData = convertSaleToPrintData(sale);
    if (settings.showPreviewBeforePrint) {
      openPreview(printData);
    } else {
      await printInvoice(printData);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل الفاتورة: ${sale.invoiceNumber}`} maxWidth="xl">
      <div className="space-y-5 text-right font-sans">
        {/* Receipt Header Info */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">رقم الفاتورة</span>
            <span className="font-mono font-bold text-blue-400 flex items-center gap-1 mt-0.5">
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span>{sale.invoiceNumber}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">العميل</span>
            <span className="text-slate-200 font-semibold text-xs mt-0.5 block truncate">
              {sale.customerName ? (
                <span className="text-blue-300">
                  {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                </span>
              ) : (
                <span className="text-slate-400">عميل نقدي (بدون عميل)</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">تاريخ البيع</span>
            <span className="text-slate-200 font-mono text-[11px] flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{new Date(sale.createdAt).toLocaleString('ar-EG')}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">طريقة الدفع</span>
            <div className="mt-0.5">
              {sale.paymentType === 'CASH' ? (
                <Badge variant="success">كاش (نقدي)</Badge>
              ) : (
                <Badge variant="info">بطاقة (Card)</Badge>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">حالة الفاتورة</span>
            <div className="mt-0.5">
              <Badge variant="success">مدفوعة بالكامل</Badge>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-blue-400" />
            <span>قائمة أصناف الفاتورة ({sale.items.length})</span>
          </h4>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">الصنف</th>
                  <th className="px-4 py-2.5">الباركود</th>
                  <th className="px-4 py-2.5">السعر الفردي</th>
                  <th className="px-4 py-2.5">الكمية</th>
                  <th className="px-4 py-2.5">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="px-4 py-2.5 font-bold text-slate-100 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.productName || `منتج #${item.productId}`}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{item.productBarcode || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-300">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-blue-400">{item.quantity} قطعة</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-400">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Financial Breakdown */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>المجموع الفرعي (Subtotal):</span>
            <span className="font-semibold">{formatCurrency(sale.totalAmount)}</span>
          </div>

          {sale.discountAmount > 0 && (
            <div className="flex items-center justify-between text-amber-400">
              <span>الخصم المطبق (Discount):</span>
              <span className="font-semibold">- {formatCurrency(sale.discountAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm font-bold text-emerald-400">
            <span>المبلغ الصافي المطلوب (Net Total):</span>
            <span>{formatCurrency(sale.netAmount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>المبلغ المدفوع:</span>
              <span className="font-mono font-bold text-slate-100">{formatCurrency(sale.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>المتبقي للعميل (Change):</span>
              <span className="font-mono font-bold text-amber-400">{formatCurrency(changeAmount)}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handlePrintClick}
            disabled={isPrinting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'جاري إرسال الأمر للطابعة...' : 'طباعة الفاتورة (80mm)'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
