import React, { useEffect } from 'react';
import {
  BarChart3,
  Receipt,
  ShoppingBag,
  Percent,
  Warehouse,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { useReportsStore, ReportsSubTab } from '../store/useReportsStore';
import { useAuthStore } from '../store/useAuthStore';
import { ReportFilters } from '../components/reports/ReportFilters';
import { ReportsDashboardTab } from './reports/ReportsDashboardTab';
import { SalesReportTab } from './reports/SalesReportTab';
import { PurchaseReportTab } from './reports/PurchaseReportTab';
import { ProfitReportTab } from './reports/ProfitReportTab';
import { InventoryReportTab } from './reports/InventoryReportTab';
import { CashReportTab } from './reports/CashReportTab';

interface SubTabItem {
  id: ReportsSubTab;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const SUB_TABS: SubTabItem[] = [
  { id: 'dashboard', label: 'لوحة المؤشرات والتحليلات', icon: TrendingUp },
  { id: 'sales', label: 'تقرير المبيعات', icon: Receipt },
  { id: 'purchases', label: 'تقرير المشتريات', icon: ShoppingBag, adminOnly: true },
  { id: 'profit', label: 'تقرير الأرباح والتكلفة', icon: Percent, adminOnly: true },
  { id: 'inventory', label: 'تقرير المخزون', icon: Warehouse },
  { id: 'cash', label: 'تقرير حركة الخزينة', icon: Wallet, adminOnly: true },
];

export const ReportsPage: React.FC = () => {
  const { activeTab, setActiveTab, loadCurrentReport } = useReportsStore();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    loadCurrentReport();
  }, [loadCurrentReport]);

  const availableTabs = SUB_TABS.filter((t) => !t.adminOnly || isAdmin);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ReportsDashboardTab />;
      case 'sales':
        return <SalesReportTab />;
      case 'purchases':
        return <PurchaseReportTab />;
      case 'profit':
        return <ProfitReportTab />;
      case 'inventory':
        return <InventoryReportTab />;
      case 'cash':
        return <CashReportTab />;
      default:
        return <ReportsDashboardTab />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Main Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <span>التقارير المالية والتحليلات البيانية</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            متابعة دقيقة للأداء المالي، المبيعات، الأرباح بحماية التكلفة التاريخية، والمخزون وحركة الخزينة
          </p>
        </div>
      </div>

      {/* Sub-Tabs Pill Navigation */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-x-auto">
        {availableTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Unified Filters Toolbar (Date Presets + Pickers + CSV/PDF Export) */}
      <ReportFilters showExportButtons={activeTab !== 'dashboard'} />

      {/* Dynamic Tab Content */}
      <div className="pt-2">{renderActiveTabContent()}</div>
    </div>
  );
};
