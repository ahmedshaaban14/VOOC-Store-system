import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { useThemeStore } from '../store/useThemeStore';
import {
  mockDashboardSummary,
  mockSalesOverTime,
  mockTopSellingProducts,
  mockCashMovement,
} from '../data/mockData';

export const DashboardPage: React.FC = () => {
  const summary = mockDashboardSummary;
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const gridColor = isLight ? '#cbd5e1' : '#1e293b';
  const axisColor = isLight ? '#334155' : '#64748b';
  const tooltipBg = isLight ? '#ffffff' : '#0f172a';
  const tooltipBorder = isLight ? '#cbd5e1' : '#334155';
  const tooltipText = isLight ? '#0f172a' : '#f8fafc';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">لوحة التحكم الرئيسية</h2>
          <p className="text-sm text-slate-400 mt-1">نظرة عامة على أداء المتجر والمبيعات والمخزون اليومي</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            تحديث تلقائي مفعّل
          </span>
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(summary.todaySales)}
          icon={TrendingUp}
          color="blue"
          trend={{ value: '14%', isPositive: true }}
        />
        <StatCard
          title="مشتريات اليوم"
          value={formatCurrency(summary.todayPurchases)}
          icon={ShoppingBag}
          color="purple"
          subtext="2 فواتير جديدة"
        />
        <StatCard
          title="أرباح اليوم"
          value={formatCurrency(summary.todayProfit)}
          icon={DollarSign}
          color="emerald"
          trend={{ value: '8.5%', isPositive: true }}
        />
        <StatCard
          title="قيمة المخزون"
          value={formatCurrency(summary.currentInventoryValue)}
          icon={Wallet}
          color="cyan"
          subtext="سعر الشراء الإجمالي"
        />
        <StatCard
          title="عدد المنتجات"
          value={formatNumber(summary.totalProductsCount)}
          icon={Package}
          color="blue"
          subtext="عنصر مخزني متاح"
        />
        <StatCard
          title="منتجات منخفضة"
          value={formatNumber(summary.lowStockProductsCount)}
          icon={AlertTriangle}
          color="rose"
          subtext="تحتاج إعادة طلب"
        />
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Purchases Graph (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-base">مخطط المبيعات والمشتريات الأسبوعي</h3>
              <p className="text-xs text-slate-400">مقارنة حجم المبيعات بالمشتريات للأيام الأخيرة</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-slate-300">المبيعات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span className="text-slate-300">المشتريات</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockSalesOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" stroke={axisColor} fontSize={12} tickLine={false} />
                <YAxis stroke={axisColor} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: tooltipText, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: tooltipText, fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="المشتريات" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Summary (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-base">ملخص حركة الصندوق اليومية</h3>
            <p className="text-xs text-slate-400 mt-1">توزيع الإيرادات والمصروفات اليومية</p>

            <div className="mt-6 space-y-4">
              {mockCashMovement.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-semibold text-slate-200">{item.type}</span>
                  </div>
                  <span className="text-sm font-black font-mono text-slate-100">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-400 font-bold">
            <span>صافي الرصيد النظري</span>
            <span className="font-black text-sm font-mono text-blue-500">{formatCurrency(6400)}</span>
          </div>
        </div>
      </div>

      {/* Top Products & Low Stock Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products Bar Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-slate-100 text-base">المنتجات الأكثر مبيعاً هذا الشهر</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopSellingProducts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} fontSize={12} />
                <YAxis dataKey="name" type="category" width={140} stroke={axisColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: tooltipText, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: tooltipText, fontWeight: 'bold' }}
                  formatter={(val: number) => [`${val} قطعة`, 'عدد القطعات المباعة']}
                />
                <Bar dataKey="salesCount" radius={[0, 4, 4, 0]}>
                  {mockTopSellingProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#60a5fa' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>تنبيهات نواقص المخزون</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">منتجات وصلت للحد الأدنى وتطلب إعادة التزويد</p>
            </div>
            <Badge variant="warning">5 منتجات</Badge>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-rose-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-200">فستان سهرة كلاسيكي أسود</p>
                  <p className="text-[10px] text-slate-400 font-mono">الباركود: 629110001003</p>
                </div>
              </div>
              <div className="text-left">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  المتبقي: 4 قطع
                </span>
                <p className="text-[10px] text-slate-400 mt-1">الحد الأدنى: 5 قطع</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-amber-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-200">حذاء رياضي سفري أبيض</p>
                  <p className="text-[10px] text-slate-400 font-mono">الباركود: 629110001006</p>
                </div>
              </div>
              <div className="text-left">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  المتبقي: 2 قطعة
                </span>
                <p className="text-[10px] text-slate-400 mt-1">الحد الأدنى: 5 قطع</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
