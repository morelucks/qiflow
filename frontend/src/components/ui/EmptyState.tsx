import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Honest empty state with a clear next action. */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 px-6 py-14 ${className}`}>
      {icon && (
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-2xl bg-violet-soft border border-violet/30 text-mint flex items-center justify-center"
        >
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-semibold text-white">{title}</p>
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
