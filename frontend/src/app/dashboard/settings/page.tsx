'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiKey, MerchantProfile } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { apiClient } from '../../../lib/api-client';
import { formatDate } from '../../../lib/formatters';

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export default function SettingsPage() {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Wallet
  const [wallet, setWallet] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [walletMsg, setWalletMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // API keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [profileRes, keysRes] = await Promise.all([
      apiClient<MerchantProfile>('/merchants/me'),
      apiClient<ApiKey[]>('/merchants/me/api-keys'),
    ]);
    if (profileRes.success && profileRes.data) {
      setProfile(profileRes.data);
      setWallet(profileRes.data.walletAddress ?? '');
    }
    if (keysRes.success && Array.isArray(keysRes.data)) {
      setApiKeys(keysRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMsg(null);
    const trimmed = wallet.trim();
    if (trimmed && !WALLET_RE.test(trimmed)) {
      setWalletMsg({ type: 'err', text: 'Enter a valid 0x-prefixed 40-character Quai address.' });
      return;
    }
    setSavingWallet(true);
    const res = await apiClient<MerchantProfile>('/merchants/me', {
      method: 'PUT',
      body: JSON.stringify({ walletAddress: trimmed || null }),
    });
    setSavingWallet(false);
    if (res.success && res.data) {
      setProfile((p) => (p ? { ...p, walletAddress: res.data!.walletAddress } : p));
      setWallet(res.data.walletAddress ?? '');
      setWalletMsg({ type: 'ok', text: trimmed ? 'Receiving wallet saved.' : 'Receiving wallet cleared.' });
    } else {
      setWalletMsg({ type: 'err', text: res.error?.message || 'Failed to save wallet address.' });
    }
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyMsg(null);
    setNewRawKey(null);
    setCreatingKey(true);
    const res = await apiClient<ApiKey>('/merchants/me/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: keyName.trim() || 'API Key' }),
    });
    setCreatingKey(false);
    if (res.success && res.data) {
      setNewRawKey(res.data.rawKey ?? null);
      setKeyName('');
      setApiKeys((prev) => [res.data!, ...prev]);
    } else {
      setKeyMsg(res.error?.message || 'Failed to generate API key.');
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? Any integration using it will stop working immediately.')) return;
    setRevokingId(id);
    const res = await apiClient(`/merchants/me/api-keys/${id}`, { method: 'DELETE' });
    setRevokingId(null);
    if (res.success) {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } else {
      setKeyMsg(res.error?.message || 'Failed to revoke API key.');
    }
  };

  const copyKey = () => {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your receiving wallet, API keys, and profile.
        </p>
      </div>

      {/* Profile summary */}
      <Card className="space-y-1 text-sm">
        <p className="font-semibold text-gray-900 dark:text-white">{profile?.businessName ?? (loading ? 'Loading…' : '—')}</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          {profile?.email ?? 'Wallet-only account (no email)'}
        </p>
      </Card>

      {/* Receiving wallet */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Receiving Wallet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Customer payments are sent directly to this Quai address. You must set it before you can create
            payments or payment links.
          </p>
        </div>
        {!loading && !profile?.walletAddress && (
          <div className="p-3 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            No receiving wallet set yet — payments are disabled until you save one.
          </div>
        )}
        <form onSubmit={saveWallet} className="space-y-3">
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x…  (Quai / Qi address)"
            spellCheck={false}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono"
          />
          {walletMsg && (
            <p className={`text-xs ${walletMsg.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {walletMsg.text}
            </p>
          )}
          <Button type="submit" variant="primary" size="md" loading={savingWallet} disabled={loading}>
            Save address
          </Button>
        </form>
      </Card>

      {/* API keys */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">API Keys</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Use an API key in the <code className="font-mono text-xs">X-API-Key</code> header to call the
            Payments API. The secret is shown once when generated — store it securely.
          </p>
        </div>

        <form onSubmit={createKey} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. Production server)"
            maxLength={60}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
          <Button type="submit" variant="primary" size="md" loading={creatingKey}>
            Generate API key
          </Button>
        </form>

        {keyMsg && <p className="text-xs text-rose-600 dark:text-rose-400">{keyMsg}</p>}

        {newRawKey && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">New API key — copy it now, it won&apos;t be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono break-all select-all text-emerald-700 dark:text-emerald-400">{newRawKey}</code>
              <Button type="button" variant="secondary" size="sm" onClick={copyKey}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading keys…</p>
        ) : apiKeys.length === 0 ? (
          <div className="px-4 py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
            <p className="text-sm text-gray-400">No active API keys yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {apiKeys.map((k) => (
              <div key={k.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{k.name}</p>
                  <p className="font-mono text-gray-500">
                    {k.keyPrefix}…{k.lastFour}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Created {formatDate(k.createdAt)}
                    {k.lastUsedAt ? ` · Last used ${formatDate(k.lastUsedAt)}` : ' · Never used'}
                  </p>
                </div>
                <Button variant="danger" size="sm" loading={revokingId === k.id} onClick={() => revokeKey(k.id)}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
