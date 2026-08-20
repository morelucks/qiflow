import React from 'react';
import { IconAlert, IconShield, IconZap } from '../icons';

type Kind = 'info' | 'warning' | 'tip';

const tone: Record<Kind, { box: string; icon: React.ReactNode }> = {
  info: { box: 'border-violet/40 bg-violet-soft text-slate-200', icon: <IconShield size={16} className="text-violet-200" /> },
  warning: { box: 'border-amber-500/40 bg-amber-500/10 text-amber-100', icon: <IconAlert size={16} className="text-amber-300" /> },
  tip: { box: 'border-mint/40 bg-mint/10 text-slate-100', icon: <IconZap size={16} className="text-mint" /> },
};

export function Callout({ kind = 'info', title, children }: { kind?: Kind; title?: string; children: React.ReactNode }) {
  return (
    <div className={`not-prose rounded-xl border p-4 flex gap-3 text-sm ${tone[kind].box}`} role={kind === 'warning' ? 'alert' : undefined}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">{tone[kind].icon}</span>
      <div className="space-y-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed [&_code]:font-mono [&_code]:text-xs [&_code]:text-white">{children}</div>
      </div>
    </div>
  );
}
