'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { PaymentLink } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { apiClient } from '../../../../lib/api-client';
import { formatAmount } from '../../../../lib/formatters';

export default function PaymentLinkCheckoutPage({ params }: { params: { linkCode: string } }) {
  const { linkCode } = params;
  const [linkData, setLinkData] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [activePaymentCode, setActivePaymentCode] = useState<string | null>(null);

  const fetchLink = async () => {
    try {
      const res = await apiClient<PaymentLink>(`/v1/payment-links/public/${linkCode}`);
      if (res.success && res.data) {
        setLinkData(res.data);
      } else {
        setError(res.error?.message || 'Payment link not found');
      }
    } catch {
      setError('Unable to load payment link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLink();
  }, [linkCode]);

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData) return;

    try {
      setCreatingSession(true);
      const res = await apiClient<{ paymentCode: string }>(`/v1/payment-links/public/${linkCode}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          customAmount: !linkData.fixedAmount && customAmount ? parseFloat(customAmount) : undefined,
        }),
      });

      if (res.success && res.data?.paymentCode) {
        setActivePaymentCode(res.data.paymentCode);
      } else {
        alert('Failed to initialize checkout session');
      }
    } catch {
      alert('Error creating checkout session');
    } finally {
      setCreatingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-500">Loading payment link...</p>
        </div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Link Error</h2>
          <p className="text-xs text-gray-500">{error || 'This link is inactive or invalid.'}</p>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (activePaymentCode) {
    window.location.href = `/pay/${activePaymentCode}`;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Redirecting to checkout session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[11px] font-bold uppercase tracking-wider">
            <span>QiFlow Payment Link</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white pt-2">
            {linkData.merchantName || 'Merchant Link'}
          </h1>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{linkData.name}</p>
          {linkData.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{linkData.description}</p>
          )}
        </div>

        <form onSubmit={handleCreateCheckout} className="space-y-5">
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 text-center space-y-2">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              {linkData.fixedAmount ? 'Fixed Amount' : 'Enter Payment Amount'}
            </span>

            {linkData.fixedAmount ? (
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {linkData.amount ? formatAmount(linkData.amount, linkData.currency) : '0.00 QI'}
              </div>
            ) : (
              <div className="flex items-center gap-2 max-w-xs mx-auto pt-1">
                <input
                  type="number"
                  step="0.00000001"
                  required
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2 text-center text-xl font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-base font-bold text-brand-600 dark:text-brand-400">
                  {linkData.currency}
                </span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            loading={creatingSession}
            variant="primary"
            size="lg"
            className="w-full !rounded-2xl"
          >
            Proceed to Pay →
          </Button>
        </form>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <Link href="/" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              QiFlow Payment Gateway
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
