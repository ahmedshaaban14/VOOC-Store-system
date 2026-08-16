import React from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  RotateCcw,
  ShoppingBag,
  Percent,
  Warehouse,
  Wallet,
  AlertTriangle,
  Package,
  Award,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useReportsStore } from '../../store/useReportsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { formatCurrency } from '../../utils/formatters';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const ReportsDashboardTab: React.FC = () => {
  const { dashboardData, isLoading } = useReportsStore();
  const { currentUser } = useAuthStore();
  const { theme } = useThemeStore();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isLight = theme === 'light';

  const gridColor = isLight ? '#cbd5e1' : '#1e293b';
  const axisColor = isLight ? '#334155' : '#64748b';
  const tooltipBg = isLight ? '#ffffff' : '#0f172a';
  const tooltipBorder = isLight ? '#cbd5e1' : '#334155';
  const tooltipText = isLight ? '#0f172a' : '#f8fafc';

  if (isLoading && !dashboardData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">جاري تحميل المؤشرات والتحليلات البيانية...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        لا توجد بيانات متاحة للعرض في هذه الفترة الزمنية.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">إجمالي المبيعات</span>
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono text-slate-100 mt-2">
            {formatCurrency(dashboardData.totalSales)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">قبل الخصم والمرتجع</span>
        </div>

        {/* Net Sales */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-900/30 bg-emerald-950/10 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-300">صافي المبيعات</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono text-emerald-400 mt-2">
            {formatCurrency(dashboardData.netSales)}
          </p>
          <span className="text-[10px] text-emerald-500/70 block mt-0.5">بعد الخصم والمرتجع</span>
        </div>

        {/* Total Invoices */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">عدد فواتير البيع</span>
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono text-slate-100 mt-2">
            {dashboardData.totalInvoices} فاتورة
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">خلال الفترة المحددة</span>
        </div>

        {/* Sales Returns */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">مرتجع المبيعات</span>
            <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold font-mono text-amber-400 mt-2">
            {formatCurrency(dashboardData.totalSalesReturns)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">مبالغ مستردة للعملاء</span>
        </div>

        {/* Admin Only Cards */}
        {isAdmin && (
          <>
            {/* Purchases */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">إجمالي المشتريات</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold font-mono text-slate-100 mt-2">
                {formatCurrency(dashboardData.totalPurchases || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">فواتير شراء البضاعة</span>
            </div>

            {/* Gross Profit */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-blue-900/40 bg-blue-950/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-300">إجمالي الربح الصافي</span>
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold font-mono text-blue-400 mt-2">
                {formatCurrency(dashboardData.grossProfit || 0)}
              </p>
              <span className="text-[10px] text-blue-400/80 block mt-0.5">
                هامش الربح: {(dashboardData.profitMargin || 0).toFixed(1)}%
              </span>
            </div>

            {/* Inventory Valuation */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">قيمة المخزون بسعر الشراء</span>
                <div className="w-7 h-7 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Warehouse className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold font-mono text-slate-100 mt-2">
                {formatCurrency(dashboardData.inventoryValue || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">إجمالي بضاعة المحل الحالية</span>
            </div>

            {/* Cash Balance */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">رصيد الخزينة الحالي</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-2">
                {formatCurrency(dashboardData.currentCashBalance || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">النقدية الفعلية المتاحة</span>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>مخطط نمو وتطور المبيعات اليومية</span>
            </h3>
            <span className="text-[11px] text-slate-500">ج.م / اليوم</span>
          </div>

          <div className="h-64 w-full">
            {dashboardData.salesTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                لا توجد مبيعات في الفترة الزمنية المحددة
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboardData.salesTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={10} tickLine={false} />
                  <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '11px',
                      direction: 'rtl',
                      color: tooltipText,
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="إجمالي المبيعات"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netSales"
                    name="صافي المبيعات"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#netGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Methods Distribution (4 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>توزيع المبيعات حسب طريقة الدفع</span>
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            {dashboardData.salesByPaymentType.length === 0 ? (
              <div className="text-slate-500 text-xs">لا توجد عمليات بيع مسجلة</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.salesByPaymentType}
                    dataKey="total"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {dashboardData.salesByPaymentType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${formatCurrency(Number(value))}`, 'القيمة']}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: tooltipText,
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Products & Stock Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 5 Products (8 Cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>أعلى 5 أصناف مبيعاً (Top 5 Products)</span>
            </h3>
            <span className="text-[11px] text-slate-500">حسب عدد القطع المباعة</span>
          </div>

          <div className="h-60 w-full">
            {dashboardData.topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                لا توجد مبيعات مسجلة في هذه الفترة
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" stroke={axisColor} fontSize={10} />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    stroke={axisColor}
                    fontSize={11}
                    width={120}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [
                      name === 'quantitySold' ? `${val} قطعة` : formatCurrency(Number(val)),
                      name === 'quantitySold' ? 'الكمية المباعة' : 'الإيراد',
                    ]}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: tooltipText,
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="quantitySold" fill="#3b82f6" radius={[0, 4, 4, 0]} name="الكمية المباعة" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stock Alerts Card (4 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>مؤشرات صحة المخزون</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              متابعة الأصناف التي تحتاج لإعادة طلب وتوريد سريع
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-300">إجمالي الأصناف المسجلة</span>
              </div>
              <span className="font-mono font-bold text-xs text-slate-100">
                {dashboardData.totalProducts} صنف
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-200">أصناف قاربت على النفاد (Low Stock)</span>
              </div>
              <span className="font-mono font-bold text-xs text-amber-400">
                {dashboardData.lowStockCount} صنف
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-rose-200">أصناف نفدت بالكامل (Out of Stock)</span>
              </div>
              <span className="font-mono font-bold text-xs text-rose-400">
                {dashboardData.outOfStockCount} صنف
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
