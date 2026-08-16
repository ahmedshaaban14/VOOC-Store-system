import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  trend,
  color = 'blue',
}) => {
  const colorMap = {
    blue: 'from-blue-500/10 to-blue-600/5 text-blue-400 border-blue-500/20 icon-bg-blue-500/20',
    emerald: 'from-emerald-500/10 to-emerald-600/5 text-emerald-400 border-emerald-500/20 icon-bg-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 text-amber-400 border-amber-500/20 icon-bg-amber-500/20',
    rose: 'from-rose-500/10 to-rose-600/5 text-rose-400 border-rose-500/20 icon-bg-rose-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 text-purple-400 border-purple-500/20 icon-bg-purple-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 text-cyan-400 border-cyan-500/20 icon-bg-cyan-500/20',
  };

  const iconBgMap = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 transition-all duration-200 hover:shadow-md bg-gradient-to-br',
        colorMap[color]
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 tracking-wide">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-100 tracking-tight font-mono">{value}</h3>

          {trend && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  'font-bold px-2 py-0.5 rounded-full',
                  trend.isPositive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
              <span className="text-slate-400 font-medium">{subtext || 'مقارنة بالأمس'}</span>
            </div>
          )}

          {!trend && subtext && (
            <p className="mt-2 text-xs text-slate-400 font-medium">{subtext}</p>
          )}
        </div>

        <div className={cn('p-3.5 rounded-xl border border-white/10 shadow-inner', iconBgMap[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
