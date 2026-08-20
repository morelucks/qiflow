'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiKey, MerchantProfile } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/formatters';
import { addressLedger } from '@qiflow/shared/address';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonListRows } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { IconCheck, IconCopy, IconKey, IconWallet } from '@/components/icons';

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export default function SettingsPage() {
  const toast = useToast();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [wallet, setWallet] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [savingWallet, setSavingWallet] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, k] = await Promise.all([apiClient<MerchantProfile>('/merchants/me'), apiClient<ApiKey[]>('/merchants/me/api-keys')]);
    if (p.success && p.data) {
      setProfile(p.data);
      setWallet(p.data.walletAddress ?? '');
    }
    if (k.success && Array.isArray(k.data)) setApiKeys(k.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trimmedWallet = wallet.trim();
  const previewLedger = trimmedWallet && WALLET_RE.test(trimmedWallet) ? addressLedger(trimmedWallet) : null;
  const savedLedger = profile?.walletAddress ? addressLedger(profile.walletAddress) : null;
  const walletDirty = (profile?.walletAddress ?? '') !== trimmedWallet.toLowerCase() && (profile?.walletAddress ?? '') !== trimmedWallet;

  const saveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError(null);
    if (trimmedWallet && !WALLET_RE.test(trimmedWallet)) return setWalletError('Enter a 0x-prefixed, 40-hex-character Quai Network address.');
    setSavingWallet(true);
    const res = await apiClient<MerchantProfile>('/merchants/me', {
      method: 'PUT',
      body: JSON.stringify({ walletAddress: trimmedWallet || null }),
    });
    setSavingWallet(false);
    if (res.success && res.data) {
      setProfile((p) => (p ? { ...p, walletAddress: res.data!.walletAddress } : p));
      setWallet(res.data.walletAddress ?? '');
      toast.success(trimmedWallet ? 'Receiving wallet saved' : 'Receiving wallet cleared', res.data.walletAddress ? `${addressLedger(res.data.walletAddress)} address` : undefined);
    } else {
      setWalletError(res.error?.message || 'Failed to save wallet address.');
    }
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('API key generated', 'Copy it now — it will not be shown again.');
    } else {
      toast.error('Could not generate key', res.error?.message);
    }
  };

  const revokeKey = async (k: ApiKey) => {
    if (!confirm(`Revoke "${k.name}"? Integrations using it stop working immediately.`)) return;
    setRevokingId(k.id);
    const res = await apiClient(`/merchants/me/api-keys/${k.id}`, { method: 'DELETE' });
    setRevokingId(null);
    if (res.success) {
      setApiKeys((prev) => prev.filter((x) => x.id !== k.id));
      toast.success('API key revoked', k.name);
    } else toast.error('Could not revoke key', res.error?.message);
  };

  const copyKey = async () => {
    if (!newRawKey) return;
    await navigator.clipboard.writeText(newRawKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1800);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" description="Your receiving wallet, API keys and account." />

      {/* Account */}
      <Card>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-gradient-to-br from-violet to-indigo-light border border-violet/50 text-sm font-bold text-white flex items-center justify-center">
              {profile?.businessName?.slice(0, 2).toUpperCase() || 'Q'}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{profile?.businessName ?? '—'}</p>
              <p className="text-sm text-slate-400 truncate">{profile?.email ?? 'Wallet-only account (no email)'}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Receiving wallet */}
      <Card className="space-y-5">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <IconWallet size={18} className="text-mint" />
              Receiving wallet
            </span>
          }
          description="Customer payments go straight to this address. Quai encodes the ledger in the address: a Qi address receives QI, a Quai address receives QUAI."
          actions={savedLedger ? <Badge status="ACTIVE" label={`${savedLedger} address`} /> : <Badge status="PENDING" label="Not set" />}
        />
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={saveWallet} className="space-y-3" noValidate>
            <Input
              label="Wallet address"
              placeholder="0x…"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              mono
              error={walletError ?? undefined}
              hint={
                previewLedger
                  ? `Detected a ${previewLedger} address — this account will accept ${previewLedger} payments.`
                  : 'Paste the address from Pelagus. Leave empty and save to clear it.'
              }
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="md" loading={savingWallet} disabled={!walletDirty && Boolean(profile?.walletAddress)}>
                Save address
              </Button>
              {profile?.walletAddress && walletDirty && (
                <Button type="button" variant="ghost" size="md" onClick={() => setWallet(profile.walletAddress ?? '')}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>

      {/* API keys */}
      <Card className="space-y-5">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <IconKey size={18} className="text-mint" />
              API keys
            </span>
          }
          description={
            <>
              Send the key in the <code className="font-mono text-xs">X-API-Key</code> header to call the Payments API. Secrets are shown once.
            </>
          }
        />

        <form onSubmit={createKey} className="flex flex-col sm:flex-row sm:items-end gap-2">
          <Input
            label="Key name"
            placeholder="e.g. Production server"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            maxLength={60}
            containerClassName="flex-1"
          />
          <Button type="submit" variant="primary" size="md" loading={creatingKey}>
            Generate key
          </Button>
        </form>

        {newRawKey && (
          <div className="rounded-xl bg-mint/10 border border-mint/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-mint">New key — copy it now, it won&apos;t be shown again</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-white break-all select-all">{newRawKey}</code>
              <Button variant="secondary" size="sm" onClick={copyKey} leftIcon={keyCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {keyCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-violet/20 overflow-hidden">
          {loading ? (
            <SkeletonListRows rows={2} />
          ) : apiKeys.length === 0 ? (
            <EmptyState title="No active API keys" description="Generate one to integrate QiFlow into your backend." className="py-10" />
          ) : (
            <ul className="divide-y divide-violet/15">
              {apiKeys.map((k) => (
                <li key={k.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{k.name}</p>
                    <p className="font-mono text-xs text-slate-300">
                      {k.keyPrefix}…{k.lastFour}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Created {formatDate(k.createdAt)} · {k.lastUsedAt ? `Last used ${formatDate(k.lastUsedAt)}` : 'Never used'}
                    </p>
                  </div>
                  <Button variant="danger" size="sm" loading={revokingId === k.id} onClick={() => revokeKey(k)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
