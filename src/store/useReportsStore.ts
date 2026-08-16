import { create } from 'zustand';
import {
  ReportDatePreset,
  ReportFilter,
  DashboardAnalytics,
  SalesReport,
  PurchaseReport,
  ProfitReport,
  InventoryReport,
  CashReport,
  ReportExportOptions,
} from '../shared/types';
import { useToastStore } from './useToastStore';

export type ReportsSubTab = 'dashboard' | 'sales' | 'purchases' | 'profit' | 'inventory' | 'cash';

interface ReportsState {
  activeTab: ReportsSubTab;
  datePreset: ReportDatePreset;
  fromDate: string;
  toDate: string;
  filters: ReportFilter;

  dashboardData: DashboardAnalytics | null;
  salesData: SalesReport | null;
  purchasesData: PurchaseReport | null;
  profitData: ProfitReport | null;
  inventoryData: InventoryReport | null;
  cashData: CashReport | null;

  isLoading: boolean;
  isExporting: boolean;
  error: string | null;

  setActiveTab: (tab: ReportsSubTab) => void;
  setDatePreset: (preset: ReportDatePreset) => void;
  setCustomDateRange: (from: string, to: string) => void;
  setFilterParam: (key: keyof ReportFilter, value: any) => void;
  resetFilters: () => void;

  loadCurrentReport: () => Promise<void>;
  loadDashboard: () => Promise<void>;
  loadSalesReport: () => Promise<void>;
  loadPurchasesReport: () => Promise<void>;
  loadProfitReport: () => Promise<void>;
  loadInventoryReport: () => Promise<void>;
  loadCashReport: () => Promise<void>;
  exportReport: (format: 'csv' | 'pdf') => Promise<boolean>;
}

export function computePresetDateRange(preset: ReportDatePreset): { fromDate: string; toDate: string } {
  const now = new Date();
  const formatYmd = (d: Date) => d.toISOString().slice(0, 10);

  const todayStr = formatYmd(now);

  switch (preset) {
    case 'today':
      return { fromDate: todayStr, toDate: todayStr };

    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYmd(y);
      return { fromDate: yStr, toDate: yStr };
    }

    case 'last7days': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { fromDate: formatYmd(d), toDate: todayStr };
    }

    case 'last30days': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { fromDate: formatYmd(d), toDate: todayStr };
    }

    case 'thisMonth': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: formatYmd(d), toDate: todayStr };
    }

    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { fromDate: formatYmd(start), toDate: formatYmd(end) };
    }

    case 'custom':
    default:
      return { fromDate: todayStr, toDate: todayStr };
  }
}

export const useReportsStore = create<ReportsState>((set, get) => {
  const initialRange = computePresetDateRange('thisMonth');

  return {
    activeTab: 'dashboard',
    datePreset: 'thisMonth',
    fromDate: initialRange.fromDate,
    toDate: initialRange.toDate,
    filters: {},

    dashboardData: null,
    salesData: null,
    purchasesData: null,
    profitData: null,
    inventoryData: null,
    cashData: null,

    isLoading: false,
    isExporting: false,
    error: null,

    setActiveTab: (tab) => {
      set({ activeTab: tab });
      get().loadCurrentReport();
    },

    setDatePreset: (preset) => {
      if (preset === 'custom') {
        set({ datePreset: 'custom' });
      } else {
        const { fromDate, toDate } = computePresetDateRange(preset);
        set({ datePreset: preset, fromDate, toDate });
        get().loadCurrentReport();
      }
    },

    setCustomDateRange: (from, to) => {
      set({ datePreset: 'custom', fromDate: from, toDate: to });
      get().loadCurrentReport();
    },

    setFilterParam: (key, value) => {
      const currentFilters = get().filters;
      set({ filters: { ...currentFilters, [key]: value } });
      get().loadCurrentReport();
    },

    resetFilters: () => {
      const range = computePresetDateRange('thisMonth');
      set({
        datePreset: 'thisMonth',
        fromDate: range.fromDate,
        toDate: range.toDate,
        filters: {},
      });
      get().loadCurrentReport();
    },

    loadCurrentReport: async () => {
      const { activeTab } = get();
      switch (activeTab) {
        case 'dashboard':
          return get().loadDashboard();
        case 'sales':
          return get().loadSalesReport();
        case 'purchases':
          return get().loadPurchasesReport();
        case 'profit':
          return get().loadProfitReport();
        case 'inventory':
          return get().loadInventoryReport();
        case 'cash':
          return get().loadCashReport();
      }
    },

    loadDashboard: async () => {
      if (!window.electronAPI?.reports) return;
      const { fromDate, toDate, filters } = get();
      set({ isLoading: true, error: null });

      try {
        const res = await window.electronAPI.reports.getDashboard({
          ...filters,
          fromDate,
          toDate,
        });

        if (res.success && res.data) {
          set({ dashboardData: res.data, isLoading: false });
        } else {
          set({ isLoading: false, error: res.error || 'فشل جلب بيانات التحليلات' });
        }
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'حدث خطأ غير متوقع' });
      }
    },

    loadSalesReport: async () => {
      if (!window.electronAPI?.reports) return;
      const { fromDate, toDate, filters } = get();
      set({ isLoading: true, error: null });

      try {
        const res = await window.electronAPI.reports.getSales({
          ...filters,
          fromDate,
          toDate,
        });

        if (res.success && res.data) {
          set({ salesData: res.data, isLoading: false });
        } else {
          set({ isLoading: false, error: res.error || 'فشل جلب تقرير المبيعات' });
        }
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'حدث خطأ غير متوقع' });
      }
    },

    loadPurchasesReport: async () => {
      if (!window.electronAPI?.reports) return;
      const { fromDate, toDate, filters } = get();
      set({ isLoading: true, error: null });

      try {
        const res = await window.electronAPI.reports.getPurchases({
          ...filters,
          fromDate,
          toDate,
        });

        if (res.success && res.data) {
          set({ purchasesData: res.data, isLoading: false });
        } else {
          set({ isLoading: false, error: res.error || 'فشل جلب تقرير المشتريات' });
        }
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'حدث خطأ غير متوقع' });
      }
    },

    loadProfitReport: async () => {
      if (!window.electronAPI?.reports) return;
      const { fromDate, toDate, filters } = get();
      set({ isLoading: true, error: null });

      try {
        const res = await window.electronAPI.reports.getProfit({
          ...filters,
          fromDate,
          toDate,
        });

        if (res.success && res.data) {
          set({ profitData: res.data, isLoading: false });
        } else {
          set({ isLoading: false, error: res.error || 'فشل جلب تقرير الأرباح' });
        }
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'حدث خطأ غير متوقع' });
      }
    },

    loadInventoryReport: async () => {
      if (!window.electronAPI?.reports) return;
      const { filters } = get();
      set({ isLoading: true, error: null });

      try {
        const res = await window.electronAPI.reports.getInventory(filters);

        if (res.success && res.data) {
          set({ inventoryData: res.data, isLoading: false });
        } else {
          set({ isLoading: false, error: res.error || 'فشل جلب تقرير المخزون' });
        }
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'حدث خطأ غير متوقع' });
      }
    },

    loadCashReport: async () => {
      if (!window.electronAPI?.reports) return;
      const { fromDate, toDate, filters } = get();
      set({ isLoading: true, error: null });

      try {
        const res = await window.electronAPI.reports.getCash({
          ...filters,
          fromDate,
          toDate,
        });

        if (res.success && res.data) {
          set({ cashData: res.data, isLoading: false });
        } else {
          set({ isLoading: false, error: res.error || 'فشل جلب تقرير الخزينة' });
        }
      } catch (err: any) {
        set({ isLoading: false, error: err.message || 'حدث خطأ غير متوقع' });
      }
    },

    exportReport: async (format) => {
      if (!window.electronAPI?.reports) return false;
      const { addToast } = useToastStore.getState();
      const {
        activeTab,
        fromDate,
        toDate,
        salesData,
        purchasesData,
        profitData,
        inventoryData,
        cashData,
      } = get();

      set({ isExporting: true });

      let exportOptions: ReportExportOptions | null = null;
      const dateRangeText = `من ${fromDate} إلى ${toDate}`;

      if (activeTab === 'sales' && salesData) {
        exportOptions = {
          title: 'تقرير المبيعات والفواتير',
          filename: 'sales_report',
          format,
          dateRangeText,
          summary: [
            { label: 'عدد الفواتير', value: salesData.summary.totalInvoices },
            { label: 'إجمالي المبيعات', value: `${salesData.summary.grossSales} ج.م` },
            { label: 'إجمالي الخصومات', value: `${salesData.summary.totalDiscounts} ج.م` },
            { label: 'إجمالي المرتجعات', value: `${salesData.summary.totalReturns} ج.م` },
            { label: 'صافي المبيعات', value: `${salesData.summary.netSales} ج.م` },
            { label: 'المبيعات النقدية', value: `${salesData.summary.totalCash} ج.م` },
            { label: 'مبيعات البطاقة', value: `${salesData.summary.totalCard} ج.م` },
          ],
          headers: [
            'رقم الفاتورة',
            'التاريخ والوقت',
            'البائع',
            'طريقة الدفع',
            'المجموع',
            'الخصم',
            'الصافي',
            'المدفوع',
            'الباقي',
            'عدد القطع',
          ],
          rows: salesData.rows.map((r) => [
            r.invoiceNumber,
            new Date(r.createdAt).toLocaleString('ar-EG'),
            r.sellerName || 'غير محدد',
            r.paymentType,
            r.totalAmount,
            r.discountAmount,
            r.netAmount,
            r.paidAmount,
            r.changeAmount,
            r.itemsCount,
          ]),
        };
      } else if (activeTab === 'purchases' && purchasesData) {
        exportOptions = {
          title: 'تقرير فواتير المشتريات والموردين',
          filename: 'purchases_report',
          format,
          dateRangeText,
          summary: [
            { label: 'عدد فواتير المشتريات', value: purchasesData.summary.totalPurchases },
            { label: 'إجمالي المشتريات', value: `${purchasesData.summary.totalAmount} ج.م` },
            { label: 'إجمالي المرتجعات', value: `${purchasesData.summary.totalReturns} ج.م` },
            { label: 'صافي المشتريات', value: `${purchasesData.summary.netPurchases} ج.م` },
          ],
          headers: ['رقم الفاتورة', 'التاريخ والوقت', 'المورد', 'إجمالي الفاتورة', 'المدفوع', 'عدد الأصناف'],
          rows: purchasesData.rows.map((r) => [
            r.invoiceNumber,
            new Date(r.createdAt).toLocaleString('ar-EG'),
            r.supplierName || 'عام',
            r.totalAmount,
            r.paidAmount,
            r.itemsCount,
          ]),
        };
      } else if (activeTab === 'profit' && profitData) {
        exportOptions = {
          title: 'تقرير الأرباح والتكلفة التاريخية',
          filename: 'profit_report',
          format,
          dateRangeText,
          summary: [
            { label: 'إجمالي المبيعات', value: `${profitData.summary.grossSales} ج.م` },
            { label: 'الخصومات المطبقة', value: `${profitData.summary.totalDiscounts} ج.م` },
            { label: 'مرتجع المبيعات', value: `${profitData.summary.salesReturnsAmount} ج.م` },
            { label: 'صافي المبيعات', value: `${profitData.summary.netSales} ج.م` },
            { label: 'تكلفة البضاعة المباعة (COGS)', value: `${profitData.summary.totalCogs} ج.م` },
            { label: 'إجمالي الربح الصافي', value: `${profitData.summary.grossProfit} ج.م` },
            { label: 'هامش الربح', value: `${profitData.summary.profitMarginPercent.toFixed(1)}%` },
          ],
          headers: [
            'اسم الصنف',
            'الباركود',
            'الكمية المباعة',
            'الإيراد الإجمالي',
            'المرتجع',
            'صافي الإيراد',
            'التكلفة التاريخية للوحدة',
            'إجمالي التكلفة (COGS)',
            'إجمالي الربح',
            'هامش الربح %',
          ],
          rows: profitData.rows.map((r) => [
            r.productName,
            r.productBarcode || '-',
            r.quantitySold,
            r.revenue,
            r.returnedQty,
            r.netRevenue,
            r.historicalUnitCost,
            r.totalCogs,
            r.grossProfit,
            `${r.profitMarginPercent.toFixed(1)}%`,
          ]),
        };
      } else if (activeTab === 'inventory' && inventoryData) {
        const isAdmin = inventoryData.summary.totalInventoryValue !== undefined;
        exportOptions = {
          title: 'تقرير المخزون وحالة الأصناف',
          filename: 'inventory_report',
          format,
          summary: [
            { label: 'إجمالي الأصناف', value: inventoryData.summary.totalProducts },
            { label: 'إجمالي قطع المخزون', value: inventoryData.summary.totalStockQuantity },
            { label: 'أصناف متوفرة', value: inventoryData.summary.inStockCount },
            { label: 'أصناف منخفضة المخزون', value: inventoryData.summary.lowStockCount },
            { label: 'أصناف نفدت تماماً', value: inventoryData.summary.outOfStockCount },
            ...(isAdmin
              ? [{ label: 'القيمة التقديرية للمخزون', value: `${inventoryData.summary.totalInventoryValue} ج.م` }]
              : []),
          ],
          headers: [
            'اسم الصنف',
            'الباركود',
            'القسم',
            'المخزون الحالي',
            'الحد الأدنى',
            'سعر البيع',
            ...(isAdmin ? ['سعر التكلفة', 'القيمة الإجمالية'] : []),
            'الحالة',
          ],
          rows: inventoryData.rows.map((r) => [
            r.name,
            r.barcode,
            r.categoryName || 'بدون قسم',
            r.currentStock,
            r.minStockLevel,
            r.salePrice,
            ...(isAdmin ? [r.purchasePrice || 0, r.totalValue || 0] : []),
            r.status === 'OUT' ? 'نفد' : r.status === 'LOW' ? 'منخفض' : 'متوفر',
          ]),
        };
      } else if (activeTab === 'cash' && cashData) {
        exportOptions = {
          title: 'تقرير حركة الخزينة والنقدية',
          filename: 'cash_report',
          format,
          dateRangeText,
          summary: [
            { label: 'إجمالي الوارد (IN)', value: `${cashData.summary.totalIn} ج.م` },
            { label: 'إجمالي المنصرف (OUT)', value: `${cashData.summary.totalOut} ج.م` },
            { label: 'مبيعات نقدية', value: `${cashData.summary.cashSales} ج.م` },
            { label: 'مشتريات نقدية', value: `${cashData.summary.cashPurchases} ج.م` },
            { label: 'مرتجع مبيعات', value: `${cashData.summary.salesReturns} ج.م` },
            { label: 'مرتجع مشتريات', value: `${cashData.summary.purchaseReturns} ج.م` },
            { label: 'الرصيد النقدي الحالي', value: `${cashData.summary.currentBalance} ج.م` },
          ],
          headers: ['التاريخ والوقت', 'النوع', 'المبلغ', 'البند / التصنيف', 'المرجع', 'ملاحظات'],
          rows: cashData.rows.map((r) => [
            new Date(r.createdAt).toLocaleString('ar-EG'),
            r.type === 'IN' ? 'وارد' : 'منصرف',
            r.amount,
            r.category,
            r.referenceId || '-',
            r.notes || '-',
          ]),
        };
      }

      if (!exportOptions) {
        set({ isExporting: false });
        addToast('لا توجد بيانات متاحة للتصدير في هذا التبويب', 'error');
        return false;
      }

      try {
        const method = format === 'pdf' ? window.electronAPI.reports.exportPdf : window.electronAPI.reports.exportCsv;
        const res = await method(exportOptions);
        set({ isExporting: false });

        if (res.success && res.data?.success) {
          addToast(`تم تصدير ملف ${format.toUpperCase()} بنجاح`, 'success');
          return true;
        } else if (res.data?.error === 'تم إلغاء التصدير') {
          return false;
        } else {
          addToast(res.error || res.data?.error || 'فشل تصدير التقرير', 'error');
          return false;
        }
      } catch (err: any) {
        set({ isExporting: false });
        addToast(err.message || 'حدث خطأ أثناء التصدير', 'error');
        return false;
      }
    },
  };
});
