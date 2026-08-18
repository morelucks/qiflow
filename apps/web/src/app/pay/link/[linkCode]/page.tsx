'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LinkDetails {
  id: string;
  linkCode: string;
  name: string;
  amount: string | null;
  currency: string;
  description: string | null;
  fixedAmount: boolean;
  isActive: boolean;
  merchantName: string;
  receivingAddress: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PaymentLinkCheckoutPage({ params }: { params: { linkCode: string } }) {
  const { linkCode } = params;
  const [linkData, setLinkData] = useState<LinkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [activePaymentCode, setActivePaymentCode] = useState<string | null>(null);

  const fetchLink = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/payment-links/public/${linkCode}`);
      const data = await res.json();
      if (data.success) {
        setLinkData(data.data);
      } else {
        setError(data.error?.message || 'Payment link not found');
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
      const res = await fetch(`${API_BASE}/v1/payment-links/public/${linkCode}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customAmount: !linkData.fixedAmount && customAmount ? parseFloat(customAmount) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.data.paymentCode) {
        setActivePaymentCode(data.data.paymentCode);
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
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Link Error</h2>
          <p className="text-xs text-gray-500">{error || 'This link is inactive or invalid.'}</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (activePaymentCode) {
    // Redirect to the single checkout page for active payment code
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
            <span>⚡ QiFlow Payment Link</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white pt-2">
            {linkData.merchantName}
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
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {linkData.amount} <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">{linkData.currency}</span>
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

          <button
            type="submit"
            disabled={creatingSession}
            className="w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{creatingSession ? 'Initializing Checkout...' : 'Proceed to Pay →'}</span>
          </button>
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
