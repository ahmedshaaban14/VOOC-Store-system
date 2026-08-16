import React from 'react';
import { Construction } from 'lucide-react';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  sectionKey?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-slate-900/40 rounded-2xl border border-slate-800 backdrop-blur-md">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 animate-pulse">
        <Construction className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-2">{title}</h2>
      <p className="text-xs text-slate-400 max-w-md leading-relaxed">{description}</p>
      <div className="mt-6 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-amber-400 font-medium">
        سيتم تطوير هذه الشاشة في المراحل القادمة
      </div>
    </div>
  );
};
