import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Base shimmer block. Size it with className (w-*, h-*). */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );
}

/** A few lines of "text". */
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
        <tr key={r} className="animate-pulse">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-6 py-4">
              <div className={`h-3 rounded bg-gray-200 dark:bg-gray-800 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16 ml-auto' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stacked list-row placeholder (e.g. endpoints, API keys). */
export function SkeletonListRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-3 animate-pulse">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-2.5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="h-7 w-20 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

/** Card-shaped placeholder (matches <Card>). */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-10 w-full rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      <div className="flex justify-between">
        <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-7 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

/** Whole-page placeholder: heading + stat cards + a table card. Used for route transitions and the auth gate. */
export function SkeletonPage() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-3 animate-pulse">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <Skeleton className="h-4 w-40" />
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            <SkeletonTableRows rows={5} cols={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
