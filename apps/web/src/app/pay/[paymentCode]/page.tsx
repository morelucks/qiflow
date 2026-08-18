'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PaymentDetails {
  id: string;
  paymentCode: string;
  amount: string;
  currency: string;
  description: string | null;
  status: 'CREATED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  receivingAddress: string;
  txHash: string | null;
  merchantName: string;
  expiresAt: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SingleCheckoutPage({ params }: { params: { paymentCode: string } }) {
  const { paymentCode } = params;
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);

  const fetchPayment = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/payments/public/code/${paymentCode}`);
      const data = await res.json();
      if (data.success) {
        setPayment(data.data);
      } else {
        setError(data.error?.message || 'Payment not found');
      }
    } catch {
      setError('Unable to load payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
    const interval = setInterval(fetchPayment, 3000);
    return () => clearInterval(interval);
  }, [paymentCode]);

  const copyAddress = () => {
    if (!payment) return;
    navigator.clipboard.writeText(payment.receivingAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWalletPay = async () => {
    if (!payment) return;
    try {
      setPaying(true);
      // Simulate wallet transaction trigger or developer payment confirmation
      const token = localStorage.getItem('accessToken');
      await fetch(`${API_BASE}/v1/payments/${payment.id}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      await fetchPayment();
    } catch {
      alert('Wallet payment error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-500">Loading checkout session...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Checkout Error</h2>
          <p className="text-xs text-gray-500">{error || 'This payment link or code is invalid.'}</p>
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

  const isCompleted = payment.status === 'COMPLETED';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    payment.receivingAddress
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Branding & Merchant */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[11px] font-bold uppercase tracking-wider">
            <span>⚡ QiFlow Secure Checkout</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white pt-2">
            {payment.merchantName}
          </h1>
          {payment.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{payment.description}</p>
          )}
        </div>

        {/* Amount Card */}
        <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 text-center space-y-1">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Total Due
          </span>
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {payment.amount} <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">{payment.currency}</span>
          </div>
        </div>

        {!isCompleted ? (
          <>
            {/* QR Code & Deposit Address */}
            <div className="space-y-4 text-center">
              <div className="inline-block p-3 bg-white rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Deposit Address QR Code" className="w-40 h-40 mx-auto" />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Deposit Address
                </p>
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono">
                  <span className="truncate max-w-[240px] text-gray-800 dark:text-gray-200">
                    {payment.receivingAddress}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="px-2.5 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handleWalletPay}
              disabled={paying}
              className="w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{paying ? 'Processing Wallet Transaction...' : 'Pay with Pelagus Wallet'}</span>
            </button>

            {/* Status Poller Indicator */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Awaiting transaction on Quai Network...
              </span>
            </div>
          </>
        ) : (
          /* Receipt State */
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-extrabold shadow-inner">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Confirmed!</h2>
              <p className="text-xs text-gray-500 mt-1">Transaction recorded on Quai Network.</p>
            </div>

            {payment.txHash && (
              <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl text-left space-y-1 border border-gray-200 dark:border-gray-700">
                <p className="text-[11px] font-semibold text-gray-400 uppercase">Transaction Hash</p>
                <p className="font-mono text-xs text-gray-800 dark:text-gray-200 truncate select-all">
                  {payment.txHash}
                </p>
              </div>
            )}
          </div>
        )}

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
