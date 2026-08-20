import React from 'react';

interface SkeletonProps {
  className?: string;
}

const shimmer = 'motion-safe:animate-pulse rounded-md bg-violet/15';

/** Base shimmer block. Size it with className (w-*, h-*). */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`${shimmer} ${className}`} />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Table body placeholder — renders inside a <tbody>. */
export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-5 py-4">
              <div className={`${shimmer} h-3 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16 ml-auto' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stacked list-row placeholder (endpoints, API keys). */
export function SkeletonListRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-violet/15" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className={`${shimmer} h-3 w-2/3`} />
            <div className={`${shimmer} h-2.5 w-1/3`} />
          </div>
          <div className={`${shimmer} h-8 w-20 rounded-xl`} />
        </div>
      ))}
    </div>
  );
}

/** Card-shaped placeholder (matches <Card>). */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`rounded-2xl bg-indigo/60 border border-violet/25 p-6 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`${shimmer} h-4 w-1/2`} />
        <div className={`${shimmer} h-5 w-16 rounded-full`} />
      </div>
      <div className={`${shimmer} h-3 w-3/4`} />
      <div className={`${shimmer} h-10 w-full rounded-xl`} />
      <div className="flex justify-between">
        <div className={`${shimmer} h-3 w-12`} />
        <div className={`${shimmer} h-8 w-28 rounded-xl`} />
      </div>
    </div>
  );
}

/** Whole-page placeholder: heading + stat cards + a table card. */
export function SkeletonPage() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-indigo/60 border border-violet/25 p-5 space-y-3">
            <div className={`${shimmer} h-3 w-24`} />
            <div className={`${shimmer} h-8 w-28`} />
            <div className={`${shimmer} h-2.5 w-16`} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-indigo/60 border border-violet/25 overflow-hidden">
        <div className="px-5 py-4 border-b border-violet/15">
          <Skeleton className="h-4 w-40" />
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-violet/15">
            <SkeletonTableRows rows={5} cols={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
