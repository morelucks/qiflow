'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NewPaymentPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          description: description || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedPayment(data.data);
      } else {
        alert(data.error?.message || 'Failed to create payment');
      }
    } catch {
      alert('Network error creating payment');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!createdPayment) return;
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

      {!createdPayment ? (
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
                value={createdPayment.checkoutUrl}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-mono"
              />
              <button
                onClick={copyUrl}
                className="px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors whitespace-nowrap"
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
