import React from 'react';
import { Printer, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { InvoicePrintData } from '../../shared/types';
import { usePrintStore } from '../../store/usePrintStore';

interface InvoicePreviewModalProps {
  data: InvoicePrintData | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (data: InvoicePrintData) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  data,
  isOpen,
  onClose,
  onPrint,
}) => {
  const { printInvoice, isPrinting } = usePrintStore();

  if (!data) return null;

  const handlePrint = async () => {
    if (onPrint) {
      onPrint(data);
    } else {
      const res = await printInvoice(data);
      if (res.success) {
        onClose();
      }
    }
  };

  const formattedDate = new Date(data.createdAt).toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الفاتورة الحرارية (80mm)"
      maxWidth="md"
    >
      <div className="space-y-4 text-right font-sans">
        {/* Receipt Simulation Container (80mm Thermal look) */}
        <div className="flex justify-center p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="w-full max-w-[320px] bg-white text-black p-4 rounded-lg shadow-2xl font-mono text-xs select-none">
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h3 className="font-bold text-sm text-black">
                {data.storeName || 'VOOC Store'}
              </h3>
              {data.storeAddress && (
                <p className="text-[10px] text-gray-700 mt-0.5">{data.storeAddress}</p>
              )}
              {data.storePhone && (
                <p className="text-[10px] text-gray-700">هاتف: {data.storePhone}</p>
              )}
            </div>

            {/* Metadata */}
            <div className="py-2 border-b border-dashed border-black text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">رقم الفاتورة:</span>
                <span className="font-bold">{data.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">التاريخ:</span>
                <span>{formattedDate}</span>
              </div>
              {data.sellerName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">الكاشير:</span>
                  <span>{data.sellerName}</span>
                </div>
              )}
              {data.customerName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">العميل:</span>
                  <span>{data.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">طريقة الدفع:</span>
                <span>{data.paymentType === 'CARD' ? 'بطاقة (Card)' : 'نقدي (Cash)'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2">
              <table className="w-full text-right text-[10.5px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="pb-1 text-right">الصنف</th>
                    <th className="pb-1 text-center">الكمية</th>
                    <th className="pb-1 text-center">السعر</th>
                    <th className="pb-1 text-left">المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 font-semibold">{item.productName}</td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-center">{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-1 text-left font-bold">{Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="pt-2 border-t border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(data.totalAmount)}</span>
              </div>

              {data.discountAmount > 0 && (
                <div className="flex justify-between font-bold text-gray-800">
                  <span>الخصم:</span>
                  <span>- {formatCurrency(data.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 my-1 border-t border-b border-black font-bold text-sm">
                <span>الصافي المطلوب:</span>
                <span>{formatCurrency(data.netAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span>المبلغ المدفوع:</span>
                <span>{formatCurrency(data.paidAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span>المتبقي (الباقي):</span>
                <span>{formatCurrency(data.changeAmount || 0)}</span>
              </div>
            </div>

            {/* Barcode Mock */}
            <div className="text-center pt-3 pb-1">
              <p className="font-mono text-xs tracking-widest font-bold">
                * {data.invoiceNumber} *
              </p>
            </div>

            {/* Footer Note */}
            {data.footerNote && (
              <div className="pt-2 border-t border-dashed border-black text-center text-[9.5px] text-gray-700 whitespace-pre-line leading-relaxed">
                {data.footerNote}
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPrinting}>
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handlePrint}
            disabled={isPrinting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'جاري إرسال الأمر للطابعة...' : 'طباعة الفاتورة الآن'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
