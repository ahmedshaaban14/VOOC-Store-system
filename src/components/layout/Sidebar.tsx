import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ShoppingBag,
  Receipt,
  RotateCcw,
  Undo2,
  Warehouse,
  ArrowLeftRight,
  Users,
  Truck,
  Wallet,
  DollarSign,
  BarChart3,
  Shirt,
  ShieldCheck,
  Database,
  ShieldAlert,
  Printer,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { NavigationTab } from '../../shared/types';
import { cn } from '../../utils/cn';

interface NavigationItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavigationItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, adminOnly: true },
  { id: 'pos', label: 'نقطة البيع (POS)', icon: ShoppingCart, badge: 'رئيسي' },
  { id: 'products', label: 'الأصناف والمنتجات', icon: Package },
  { id: 'sales', label: 'سجل المبيعات', icon: Receipt },
  { id: 'sales_returns', label: 'مرتجع المبيعات', icon: RotateCcw },
  { id: 'purchases', label: 'المشتريات', icon: ShoppingBag, adminOnly: true },
  { id: 'purchase_returns', label: 'مرتجع المشتريات', icon: Undo2, adminOnly: true },
  { id: 'inventory', label: 'المخزون الحالي', icon: Warehouse, adminOnly: true },
  { id: 'inventory_movements', label: 'حركة المخزون', icon: ArrowLeftRight, adminOnly: true },
  { id: 'customers', label: 'إدارة العملاء', icon: Users },
  { id: 'suppliers', label: 'إدارة الموردين', icon: Truck, adminOnly: true },
  { id: 'cash_register', label: 'خزينة النقدية', icon: Wallet, adminOnly: true },
  { id: 'expenses', label: 'المصروفات', icon: DollarSign, adminOnly: true },
  { id: 'reports', label: 'التقارير والتحليلات', icon: BarChart3 },
  { id: 'print_settings', label: 'إعدادات الطباعة', icon: Printer, adminOnly: true },
  { id: 'users', label: 'إدارة المستخدمين', icon: ShieldCheck, adminOnly: true },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, adminOnly: true },
  { id: 'audit_logs', label: 'سجل العمليات', icon: ShieldAlert, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, sidebarOpen } = useAppStore();
  const { currentUser } = useAuthStore();

  const isSeller = currentUser?.role === 'SELLER';

  const visibleNavItems = navItems.filter((item) => {
    if (isSeller) {
      // Seller can access POS, Products, Sales, and Sales Returns only
      return ['pos', 'products', 'sales', 'sales_returns'].includes(item.id);
    }
    return true; // Admin sees all
  });

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 border-l border-slate-800/80 flex flex-col transition-all duration-300 z-30 select-none shrink-0',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* App Branding */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 bg-slate-950/40 gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 shrink-0">
          <Shirt className="w-6 h-6" />
        </div>
        {sidebarOpen && (
          <div className="truncate">
            <h1 className="font-bold text-slate-100 text-base leading-tight truncate">VOOC Store</h1>
            <p className="text-xs text-slate-400 font-medium truncate">متجر الملابس</p>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group text-right',
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {sidebarOpen && <span className="truncate flex-1">{item.label}</span>}

              {sidebarOpen && item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Developer Attribution Footer */}
      {sidebarOpen && (
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/20 text-center select-none">
          <p className="text-[10px] text-slate-500 font-medium tracking-tight">Made by: Eng Ahmed Shaaban</p>
          <p className="text-[9px] text-slate-600 font-mono">01112112568</p>
        </div>
      )}
    </aside>
  );
};
