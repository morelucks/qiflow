'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MerchantProfile, Payment } from '@/types';
import { apiClient } from '@/lib/api-client';
import { addressLedger } from '@qiflow/shared/address';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { IconAlert, IconCheck, IconCopy, IconExternal, IconWallet } from '@/components/icons';

export default function NewPaymentPage() {
  const toast = useToast();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('QI');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<{
    paymentCode: string;
    checkoutUrl: string;
    receivingAddress: string;
    amount: string;
    currency: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient<MerchantProfile>('/merchants/me').then((res) => {
      if (res.success && res.data) setProfile(res.data);
      setProfileLoading(false);
    });
  }, []);

  const hasWallet = Boolean(profile?.walletAddress);
  const walletLedger = profile?.walletAddress ? addressLedger(profile.walletAddress) : null;

  useEffect(() => {
    if (walletLedger) setCurrency(walletLedger);
  }, [walletLedger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!hasWallet) {
      setError('Set your receiving wallet in Settings before creating payments.');
      return;
    }
    setLoading(true);
    const res = await apiClient<Payment>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(amount), currency, description: description || undefined }),
    });
    setLoading(false);
    if (res.success && res.data) {
      const p = res.data;
      setCreatedPayment({
        paymentCode: p.paymentCode,
        receivingAddress: p.receivingAddress,
        amount: p.amount,
        currency: p.currency,
        checkoutUrl: p.checkoutUrl || `${window.location.origin}/pay/${p.paymentCode}`,
      });
      toast.success('Payment created', `Checkout link ready for ${p.amount} ${p.currency}.`);
    } else {
      setError(res.error?.message || 'Failed to create payment.');
    }
  };

  const copyUrl = async () => {
    if (!createdPayment?.checkoutUrl) return;
    await navigator.clipboard.writeText(createdPayment.checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setCreatedPayment(null);
    setAmount('');
    setDescription('');
    setError(null);
  };

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/payments" className="text-xs text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded">
            ← Back to payments
          </Link>
        }
        title="Create payment"
        description="Generate a one-time checkout link. The customer pays straight to your receiving wallet."
      />

      {!profileLoading && !hasWallet && (
        <Card className="border-amber-500/40 flex gap-3">
          <IconAlert size={20} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">Receiving wallet required</p>
            <p className="text-slate-300">
              Payments are sent directly to your wallet, so add a Quai Network address before creating one.
            </p>
            <Link href="/dashboard/settings" className="inline-block">
              <Button variant="primary" size="sm" leftIcon={<IconWallet size={14} />}>
                Set receiving wallet
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {profileLoading ? (
        <Card className="space-y-4" aria-busy="true">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </Card>
      ) : !hasWallet ? null : !createdPayment ? (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <Input
                label="Amount"
                required
                type="number"
                inputMode="decimal"
                step="0.00000001"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="font-semibold tabular-nums"
              />
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={Boolean(walletLedger)}
                className="w-28 font-semibold"
              >
                <option value="QI">QI</option>
                <option value="QUAI">QUAI</option>
              </Select>
            </div>
            {walletLedger && (
              <p className="-mt-2 text-xs text-slate-400">
                Your receiving wallet is a {walletLedger} address, so payments are in {walletLedger}. Change it in Settings to accept{' '}
                {walletLedger === 'QI' ? 'QUAI' : 'QI'}.
              </p>
            )}
            <Input
              label="Description"
              hint="Optional — shown to the customer on checkout."
              placeholder="e.g. Order #1049 or Freelance invoice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
            />
            {error && (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Generate checkout link
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="space-y-6">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="w-11 h-11 rounded-2xl bg-mint/15 border border-mint/40 text-mint flex items-center justify-center">
              <IconCheck size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Payment created</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {createdPayment.amount} {createdPayment.currency} · <span className="font-mono text-xs">{createdPayment.paymentCode}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-ink/60 border border-violet/25 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Checkout link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                aria-label="Checkout URL"
                value={createdPayment.checkoutUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-10 px-3 rounded-xl bg-indigo/60 border border-violet/25 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-mint/60"
              />
              <Button variant="secondary" size="md" onClick={copyUrl} leftIcon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={createdPayment.checkoutUrl} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="primary" size="md" className="w-full" leftIcon={<IconExternal size={14} />}>
                Open checkout page
              </Button>
            </a>
            <Button variant="outline" size="md" className="flex-1" onClick={reset}>
              Create another
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
