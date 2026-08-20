import React from 'react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: 'mint' | 'violet' | 'none';
}

/** KPI tile. Big number baseline-aligned with its unit; subtle accent glow for the headline metric. */
export function StatCard({ label, value, hint, icon, accent = 'none' }: StatCardProps) {
  const ring =
    accent === 'mint'
      ? 'border-mint/30 shadow-[0_0_0_1px_rgba(0,230,168,0.08),0_12px_40px_-20px_rgba(0,230,168,0.45)]'
      : accent === 'violet'
        ? 'border-violet/40'
        : 'border-violet/25';
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-indigo/60 border ${ring} p-5`}>
      {accent === 'mint' && (
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-mint/10 blur-2xl" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon && <span aria-hidden="true" className="text-violet-300/80">{icon}</span>}
      </div>
      <div className="relative mt-3 text-3xl font-bold tracking-tight text-white tabular-nums">{value}</div>
      {hint && <p className="relative mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
