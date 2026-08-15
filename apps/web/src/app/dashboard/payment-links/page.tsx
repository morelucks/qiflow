import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Payment Links' };

export default function PaymentLinksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Links</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shareable links for your payment sessions.
          </p>
        </div>
        <Link
          href="/dashboard/payments/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Link
        </Link>
      </div>

      {/* Wired up in issue #5 (Dashboard UI) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-6 py-16 text-center">
        <p className="text-gray-400 dark:text-gray-600 text-sm">No payment links yet</p>
        <Link
          href="/dashboard/payments/new"
          className="inline-block mt-3 text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          Create your first payment link →
        </Link>
      </div>
    </div>
  );
}
