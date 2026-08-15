import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create Payment' };

export default function NewPaymentPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Payment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate a new payment session and get a shareable checkout link.
        </p>
      </div>

      {/* Form — wired up in issue #5 (Dashboard UI) using POST /v1/payments (issue #4) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Amount (Qi)
          </label>
          <input
            id="amount"
            type="number"
            min="0"
            step="any"
            placeholder="50"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="description"
            type="text"
            placeholder="Nike Air Force 1 — Order #1024"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="expiry"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Expires in
          </label>
          <select
            id="expiry"
            defaultValue="1800"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          >
            <option value="900">15 minutes</option>
            <option value="1800">30 minutes</option>
            <option value="3600">1 hour</option>
            <option value="86400">24 hours</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          Generate Payment Link
        </button>
      </div>
    </div>
  );
}
