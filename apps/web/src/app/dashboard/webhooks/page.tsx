import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Webhooks' };

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure endpoints to receive payment event notifications.
        </p>
      </div>
      {/* Wired up in issue #7 (Webhook System) and issue #19 (HMAC signing) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-6 py-16 text-center">
        <p className="text-gray-400 dark:text-gray-600 text-sm">No webhook endpoints configured</p>
        <button className="inline-block mt-3 text-sm text-brand-600 dark:text-brand-400 hover:underline">
          Add endpoint →
        </button>
      </div>
    </div>
  );
}
