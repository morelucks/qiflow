import React from 'react';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'mint';

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  mint: 'bg-mint-soft text-mint border-mint/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  neutral: 'bg-white/5 text-slate-300 border-white/10',
};

const statusMap: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  COMPLETED: { label: 'Completed', tone: 'success' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CREATED: { label: 'Awaiting payment', tone: 'warning', pulse: true },
  PENDING: { label: 'Pending', tone: 'warning', pulse: true },
  PROCESSING: { label: 'Confirming', tone: 'info', pulse: true },
  FAILED: { label: 'Failed', tone: 'danger' },
  DEAD: { label: 'Gave up', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  ACTIVE: { label: 'Active', tone: 'mint' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
};

interface BadgeProps {
  status: string;
  /** Override the auto label. */
  label?: string;
  tone?: Tone;
  className?: string;
}

export function Badge({ status, label, tone, className = '' }: BadgeProps) {
  const meta = statusMap[status] ?? { label: status, tone: 'neutral' as Tone };
  const t = tone ?? meta.tone;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11px] font-semibold border ${toneClasses[t]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full bg-current ${meta.pulse ? 'motion-safe:animate-pulse' : ''}`}
      />
      {label ?? meta.label}
    </span>
  );
}
