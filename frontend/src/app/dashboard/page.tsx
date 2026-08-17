import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dashboard' };

// Placeholder stat card — replace with real data from GET /merchants/me/stats (issue #4)
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your payment activity at a glance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Received" value="— Qi" sub="All time" />
        <StatCard label="Today" value="— Qi" sub="Last 24 hours" />
        <StatCard label="Transactions" value="—" sub="All time" />
      </div>

      {/* Recent payments */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Payments</h2>
          <Link
            href="/dashboard/payments"
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            View all
          </Link>
        </div>

        {/* Empty state — replaced once payments API (issue #4) is integrated */}
        <div className="px-6 py-16 text-center">
          <p className="text-gray-400 dark:text-gray-600 text-sm">No payments yet</p>
          <Link
            href="/dashboard/payments/new"
            className="inline-block mt-3 text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            Create your first payment →
          </Link>
        </div>
      </div>
    </div>
  );
}
