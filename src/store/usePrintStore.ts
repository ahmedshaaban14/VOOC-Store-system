import { create } from 'zustand';
import {
  PrinterInfo,
  PrintSettings,
  InvoicePrintData,
  SaleWithItems,
} from '../shared/types';
import { useToastStore } from './useToastStore';

interface PrintState {
  printers: PrinterInfo[];
  defaultPrinter: PrinterInfo | null;
  settings: PrintSettings;
  isLoadingPrinters: boolean;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  isPrinting: boolean;
  isTestPrinting: boolean;
  previewData: InvoicePrintData | null;
  isPreviewOpen: boolean;

  loadPrinters: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (newSettings: Partial<PrintSettings>) => Promise<boolean>;
  printInvoice: (data: InvoicePrintData) => Promise<{ success: boolean; error?: string }>;
  testPrint: (printerName?: string) => Promise<{ success: boolean; error?: string }>;
  openPreview: (data: InvoicePrintData) => void;
  closePreview: () => void;
  convertSaleToPrintData: (sale: SaleWithItems) => InvoicePrintData;
}

const DEFAULT_SETTINGS: PrintSettings = {
  autoPrint: true,
  printerName: '',
  paperWidth: '80mm',
  showPreviewBeforePrint: false,
  storeName: 'VOOC Store',
  storePhone: '01555600508',
  storeAddress: '',
  footerNote: 'شكراً لزيارتكم ونتمنى رؤيتكم دائماً\nالبضاعة المباعة ترد وتستبدل خلال 14 يوماً مع إحضار أصل الفاتورة',
};

export const usePrintStore = create<PrintState>((set, get) => ({
  printers: [],
  defaultPrinter: null,
  settings: DEFAULT_SETTINGS,
  isLoadingPrinters: false,
  isLoadingSettings: false,
  isSavingSettings: false,
  isPrinting: false,
  isTestPrinting: false,
  previewData: null,
  isPreviewOpen: false,

  loadPrinters: async () => {
    if (!window.electronAPI?.printing) return;
    set({ isLoadingPrinters: true });
    try {
      const res = await window.electronAPI.printing.getPrinters();
      if (res.success && res.data) {
        const def = res.data.find((p) => p.isDefault) || res.data[0] || null;
        set({ printers: res.data, defaultPrinter: def, isLoadingPrinters: false });
      } else {
        set({ isLoadingPrinters: false });
      }
    } catch (err) {
      console.error('Failed loading printers:', err);
      set({ isLoadingPrinters: false });
    }
  },

  loadSettings: async () => {
    if (!window.electronAPI?.printing) return;
    set({ isLoadingSettings: true });
    try {
      const res = await window.electronAPI.printing.getSettings();
      if (res.success && res.data) {
        set({ settings: res.data, isLoadingSettings: false });
      } else {
        set({ isLoadingSettings: false });
      }
    } catch (err) {
      console.error('Failed loading print settings:', err);
      set({ isLoadingSettings: false });
    }
  },

  saveSettings: async (newSettings) => {
    if (!window.electronAPI?.printing) return false;
    const { addToast } = useToastStore.getState();
    set({ isSavingSettings: true });
    try {
      const res = await window.electronAPI.printing.updateSettings(newSettings);
      set({ isSavingSettings: false });
      if (res.success && res.data) {
        set({ settings: res.data });
        addToast('تم حفظ إعدادات الطباعة بنجاح', 'success');
        return true;
      } else {
        addToast(res.error || 'فشل حفظ إعدادات الطباعة', 'error');
        return false;
      }
    } catch (err: any) {
      set({ isSavingSettings: false });
      addToast(err.message || 'حدث خطأ أثناء حفظ الإعدادات', 'error');
      return false;
    }
  },

  printInvoice: async (data) => {
    if (!window.electronAPI?.printing) {
      return { success: false, error: 'غير متصل ببيئة الطباعة المحلّية' };
    }
    const { addToast } = useToastStore.getState();
    set({ isPrinting: true });

    try {
      const res = await window.electronAPI.printing.printInvoice(data);
      set({ isPrinting: false });

      if (res.success && res.data?.success) {
        addToast(`تمت طباعة الفاتورة [${data.invoiceNumber}] بنجاح`, 'success');
        return { success: true };
      } else {
        const errMsg = res.error || res.data?.error || 'تعذرت الطباعة، تأكد من تشغيل وتوصيل الطابعة';
        addToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      set({ isPrinting: false });
      const errMsg = err.message || 'حدث خطأ غير متوقع أثناء الطباعة';
      addToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }
  },

  testPrint: async (printerName) => {
    if (!window.electronAPI?.printing) {
      return { success: false, error: 'غير متصل ببيئة الطباعة المحلّية' };
    }
    const { addToast } = useToastStore.getState();
    set({ isTestPrinting: true });

    try {
      const res = await window.electronAPI.printing.testPrint(printerName);
      set({ isTestPrinting: false });

      if (res.success && res.data?.success) {
        addToast('تم إرسال الفاتورة التجريبية إلى الطابعة بنجاح', 'success');
        return { success: true };
      } else {
        const errMsg = res.error || res.data?.error || 'فشل اختبار الطباعة، تأكد من تشغيل الطابعة';
        addToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      set({ isTestPrinting: false });
      const errMsg = err.message || 'حدث خطأ أثناء اختبار الطباعة';
      addToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }
  },

  openPreview: (data) => {
    set({ previewData: data, isPreviewOpen: true });
  },

  closePreview: () => {
    set({ previewData: null, isPreviewOpen: false });
  },

  convertSaleToPrintData: (sale) => {
    const { settings } = get();
    const changeAmount = Math.max(0, Number(sale.paidAmount) - Number(sale.netAmount));

    return {
      invoiceNumber: sale.invoiceNumber,
      createdAt: sale.createdAt,
      items: sale.items.map((i) => ({
        productName: i.productName || `منتج #${i.productId}`,
        productBarcode: i.productBarcode,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice), // Historical unit price preserved
        totalPrice: Number(i.totalPrice),
      })),
      totalAmount: Number(sale.totalAmount),
      discountAmount: Number(sale.discountAmount || 0),
      netAmount: Number(sale.netAmount),
      paidAmount: Number(sale.paidAmount),
      changeAmount,
      paymentType: sale.paymentType,
      customerName: sale.customerName || undefined,
      storeName: settings.storeName,
      storePhone: settings.storePhone,
      storeAddress: settings.storeAddress,
      footerNote: settings.footerNote,
    };
  },
}));
