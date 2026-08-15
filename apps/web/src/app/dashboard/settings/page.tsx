import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your wallet address, API keys, and profile.
        </p>
      </div>

      {/* Wallet address — wired up in issue #5 (Dashboard UI) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Receiving Wallet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Payments will be sent directly to this Qi address. Never reused across sessions.
        </p>
        <input
          type="text"
          placeholder="Your Qi wallet address"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono"
        />
        <button className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Save address
        </button>
      </div>

      {/* API Keys — wired up in issue #15 (API key security) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">API Keys</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your secret key is shown once when generated. Store it securely.
        </p>
        <div className="px-4 py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
          <p className="text-sm text-gray-400">No API keys yet</p>
          <button className="mt-3 text-sm text-brand-600 dark:text-brand-400 hover:underline">
            Generate API key →
          </button>
        </div>
      </div>
    </div>
  );
}
