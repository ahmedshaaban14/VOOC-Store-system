import React from 'react';
import {
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useReportsStore } from '../../store/useReportsStore';
import { Button } from '../ui/Button';
import { ReportDatePreset } from '../../shared/types';

const PRESETS: { id: ReportDatePreset; label: string }[] = [
  { id: 'today', label: 'اليوم' },
  { id: 'yesterday', label: 'أمس' },
  { id: 'last7days', label: 'آخر 7 أيام' },
  { id: 'last30days', label: 'آخر 30 يوم' },
  { id: 'thisMonth', label: 'هذا الشهر' },
  { id: 'lastMonth', label: 'الشهر السابق' },
  { id: 'custom', label: 'فترة مخصصة' },
];

interface ReportFiltersProps {
  showExportButtons?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ showExportButtons = true }) => {
  const {
    datePreset,
    fromDate,
    toDate,
    isLoading,
    isExporting,
    setDatePreset,
    setCustomDateRange,
    loadCurrentReport,
    resetFilters,
    exportReport,
  } = useReportsStore();

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3 font-sans">
      {/* Date Presets Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 ml-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>الفترة الزمنية:</span>
          </span>

          {PRESETS.map((p) => {
            const isActive = datePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCurrentReport()}
            disabled={isLoading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs px-2.5"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-slate-400 hover:text-slate-200 text-xs px-2"
            title="إعادة ضبط"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {showExportButtons && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportReport('csv')}
                disabled={isExporting || isLoading}
                className="bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/60 text-xs px-2.5"
                title="تصدير ملف Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportReport('pdf')}
                disabled={isExporting || isLoading}
                className="bg-rose-950/60 text-rose-300 border border-rose-700/50 hover:bg-rose-900/60 text-xs px-2.5"
                title="تصدير ملف PDF جاهز للطباعة"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Custom Date Pickers (Shown if Preset is Custom) */}
      {datePreset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">من تاريخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setCustomDateRange(e.target.value, toDate)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">إلى تاريخ:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setCustomDateRange(fromDate, e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500 text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
};
