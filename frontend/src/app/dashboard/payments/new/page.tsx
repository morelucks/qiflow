'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MerchantProfile, Payment } from '../../../../types';
import { apiClient } from '../../../../lib/api-client';

export default function NewPaymentPage() {
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
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient<MerchantProfile>('/merchants/me').then((res) => {
      if (res.success && res.data) setProfile(res.data);
      setProfileLoading(false);
    });
  }, []);

  const hasWallet = Boolean(profile?.walletAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || parseFloat(amount) <= 0) return;
    if (!hasWallet) {
      setError('Set your receiving wallet in Settings before creating payments.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient<Payment>('/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          description: description || undefined,
        }),
      });

      if (res.success && res.data) {
        const paymentData = res.data;
        const fallbackUrl = paymentData.paymentCode
          ? `${window.location.origin}/pay/${paymentData.paymentCode}`
          : '';
        setCreatedPayment({
          paymentCode: paymentData.paymentCode,
          receivingAddress: paymentData.receivingAddress,
          amount: paymentData.amount,
          checkoutUrl: paymentData.checkoutUrl || fallbackUrl,
        });
      } else {
        setError(res.error?.message || 'Failed to create payment');
      }
    } catch {
      setError('Network error creating payment');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!createdPayment?.checkoutUrl) return;
    navigator.clipboard.writeText(createdPayment.checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/payments"
          className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ← Back to Payments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
          Create Instant Payment
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate a one-time payment request with checkout link and deposit address.
        </p>
      </div>

      {!profileLoading && !hasWallet && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 space-y-2">
          <p className="font-semibold">Receiving wallet required</p>
          <p className="text-xs">
            Payments are sent straight to your wallet, so you need to add a Quai address before you can
            create a payment.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-block text-xs font-semibold underline underline-offset-2"
          >
            Set receiving wallet in Settings →
          </Link>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {profileLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasWallet ? null : !createdPayment ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.00000001"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="QI">QI</option>
                <option value="QUAI">QUAI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Order #1049 or Freelance invoice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-md transition-all text-sm disabled:opacity-50 mt-4"
          >
            {loading ? 'Generating...' : 'Generate Payment Session'}
          </button>
        </form>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Created!</h3>
            <p className="text-xs text-gray-500 mt-1">Code: {createdPayment.paymentCode}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2 text-left">
            <p className="text-[11px] font-semibold text-gray-400 uppercase">Checkout URL</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdPayment.checkoutUrl || ''}
                placeholder="Checkout URL unavailable"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-mono"
              />
              <button
                onClick={copyUrl}
                disabled={!createdPayment.checkoutUrl}
                className="px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/pay/${createdPayment.paymentCode}`}
              target="_blank"
              className="flex-1 px-4 py-2.5 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
            >
              Open Checkout Page ↗
            </Link>
            <button
              onClick={() => setCreatedPayment(null)}
              className="flex-1 px-4 py-2.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
