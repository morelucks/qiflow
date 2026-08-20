import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Remove default padding (tables, lists). */
  flush?: boolean;
  as?: 'div' | 'section' | 'article';
}

/** Elevated brand surface: indigo on ink with a violet hairline. One radius for all cards. */
export function Card({ children, className = '', flush = false, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={`rounded-2xl bg-indigo/60 border border-violet/25 ${flush ? '' : 'p-6'} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Card header row: title + optional description + optional right-side actions. */
export function CardHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
