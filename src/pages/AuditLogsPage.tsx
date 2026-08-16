import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RotateCcw,
  User as UserIcon,
  Activity,
  FileText,
  Eye,
  X,
  Lock,
} from 'lucide-react';
import { useAuditLogStore } from '../store/useAuditLogStore';
import { useAuthStore } from '../store/useAuthStore';
import { AuditLog, AuditLogAction } from '../shared/types';
import { Button } from '../components/ui/Button';

export const AuditLogsPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { logs, isLoading, filters, setFilters, resetFilters, fetchLogs } = useAuditLogStore();

  const [selectedLogModal, setSelectedLogModal] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center dir-rtl">
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">غير مسموح بالوصول</h2>
          <p className="text-xs text-slate-400">
            سجل العمليات والرقابة يقتصر الوصول إليه حصرياً على مدير النظام (Admin).
          </p>
        </div>
      </div>
    );
  }

  // Format Action Badge Label and Variant
  const getActionBadge = (action: AuditLogAction) => {
    switch (action) {
      case 'LOGIN':
        return { label: 'تسجيل دخول', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'LOGOUT':
        return { label: 'تسجيل خروج', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
      case 'CHANGE_PASSWORD':
        return { label: 'تغيير كلمة المرور', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'CREATE_SALE':
        return { label: 'إنشاء مبيعات', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'CREATE_SALES_RETURN':
        return { label: 'مرتجع مبيعات', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'CREATE_PURCHASE':
        return { label: 'إنشاء شراء', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'CREATE_PURCHASE_RETURN':
        return { label: 'مرتجع مشتريات', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
      case 'CREATE_PRODUCT':
        return { label: 'إضافة منتج', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
      case 'UPDATE_PRODUCT':
        return { label: 'تعديل منتج', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
      case 'DELETE_PRODUCT':
        return { label: 'حذف منتج', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'CREATE_USER':
        return { label: 'إضافة مستخدم', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'UPDATE_USER':
        return { label: 'تعديل مستخدم', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' };
      case 'ACTIVATE_USER':
        return { label: 'تفعيل حساب', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'DEACTIVATE_USER':
        return { label: 'تعطيل حساب', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'OPEN_CASH_REGISTER':
        return { label: 'فتح الخزينة', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'CASH_IN':
        return { label: 'إيداع نقدي', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'CASH_OUT':
        return { label: 'سحب نقدي', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'BACKUP_DATABASE':
        return { label: 'نسخ احتياطي', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      case 'RESTORE_DATABASE':
        return { label: 'استعادة قاعدة البيانات', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      default:
        return { label: action, color: 'bg-slate-500/10 text-slate-300 border-slate-500/30' };
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (_e) {
      return isoString;
    }
  };

  return (
    <div className="p-6 space-y-6 dir-rtl font-sans text-slate-100">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight">سجل العمليات والرقابة (Audit Logs)</h1>
            <p className="text-xs text-slate-400 mt-1">
              سجل رقمي لمتابعة كافة الأنشطة والتغييرات المنفذة بالنظام لمنع التلاعب وتحديد المسؤوليات
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 border-slate-800 text-slate-300 hover:bg-slate-800"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>تصفية البحث في السجلات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالوصف، المستخدم، المعرف..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={filters.action || ''}
              onChange={(e) => setFilters({ action: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">جميع العمليات</option>
              <option value="LOGIN">تسجيل دخول</option>
              <option value="LOGOUT">تسجيل خروج</option>
              <option value="CREATE_SALE">إنشاء مبيعات</option>
              <option value="CREATE_SALES_RETURN">مرتجع مبيعات</option>
              <option value="CREATE_PURCHASE">إنشاء شراء</option>
              <option value="CREATE_PURCHASE_RETURN">مرتجع مشتريات</option>
              <option value="CREATE_PRODUCT">إضافة منتج</option>
              <option value="UPDATE_PRODUCT">تعديل منتج</option>
              <option value="DELETE_PRODUCT">حذف منتج</option>
              <option value="CREATE_USER">إضافة مستخدم</option>
              <option value="UPDATE_USER">تعديل مستخدم</option>
              <option value="OPEN_CASH_REGISTER">فتح الخزينة</option>
              <option value="CASH_IN">إيداع نقدي</option>
              <option value="CASH_OUT">سحب نقدي</option>
              <option value="BACKUP_DATABASE">نسخ احتياطي</option>
              <option value="RESTORE_DATABASE">استعادة قاعدة البيانات</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ startDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* End Date & Reset */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ endDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              title="إعادة ضبط الفلاتر"
              className="border-slate-800 text-slate-400 hover:text-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Log Table Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800/80 text-slate-400 font-semibold select-none">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">التاريخ والوقت</th>
                <th className="py-3.5 px-4">المستخدم</th>
                <th className="py-3.5 px-4">نوع العملية</th>
                <th className="py-3.5 px-4">الكيان / المعرف</th>
                <th className="py-3.5 px-4">الوصف والتفاصيل</th>
                <th className="py-3.5 px-4 text-center">التفاصيل</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50 text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Activity className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                    <span>جاري تحميل سجلات العمليات...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <span>لا توجد سجلات عمليات متطابقة مع شروط البحث الحالية</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{log.id}</td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-200">{log.displayName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({log.username})</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-300">
                          {log.entityType}
                          {log.entityId ? ` #${log.entityId}` : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLogModal(log)}
                          title="عرض تفاصيل السجل والبيانات الوصفية"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 relative text-right animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <FileText className="w-5 h-5" />
                <span>تفاصيل السجل رقم #{selectedLogModal.id}</span>
              </div>
              <button
                onClick={() => setSelectedLogModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">المستخدم:</span>
                  <span className="font-bold text-slate-200">
                    {selectedLogModal.displayName} ({selectedLogModal.username})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ التنفيذ:</span>
                  <span className="font-mono text-slate-200">{formatDate(selectedLogModal.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">نوع العملية:</span>
                  <span className="font-bold text-blue-400">{selectedLogModal.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الكيان والمعرف:</span>
                  <span className="font-mono text-slate-200">
                    {selectedLogModal.entityType} {selectedLogModal.entityId ? `#${selectedLogModal.entityId}` : ''}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">الوصف الكامل:</span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-medium">
                  {selectedLogModal.description}
                </p>
              </div>

              {selectedLogModal.metadata && (
                <div>
                  <span className="text-slate-400 block text-[10px] mb-1">البيانات الوصفية (Metadata JSON):</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto dir-ltr">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLogModal.metadata), null, 2);
                      } catch (_e) {
                        return selectedLogModal.metadata;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 text-left">
              <Button variant="outline" size="sm" onClick={() => setSelectedLogModal(null)}>
                إغلاق النافذة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
