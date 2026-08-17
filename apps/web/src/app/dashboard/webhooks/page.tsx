'use client';

import { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  url: string;
  secretPrefix: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  url: string;
  paymentCode: string;
  event: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD';
  statusCode: number | null;
  attempt: number;
  deliveredAt: string | null;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [webhooksRes, deliveriesRes] = await Promise.all([
        fetch(`${API_BASE}/v1/webhooks`, { headers }),
        fetch(`${API_BASE}/v1/webhooks/deliveries`, { headers }),
      ]);

      const webhooksData = await webhooksRes.json();
      const deliveriesData = await deliveriesRes.json();

      if (webhooksData.success && Array.isArray(webhooksData.data)) {
        setWebhooks(webhooksData.data);
      }
      if (deliveriesData.success && Array.isArray(deliveriesData.data)) {
        setDeliveries(deliveriesData.data);
      }
    } catch {
      // Ignore network errors gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/v1/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url: urlInput,
          events: ['payment.completed', 'payment.failed'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedSecret(data.data.secret);
        setUrlInput('');
        fetchData();
      } else {
        alert(data.error?.message || 'Failed to add webhook');
      }
    } catch {
      alert('Error creating webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${API_BASE}/v1/webhooks/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchData();
    } catch {
      alert('Failed to delete webhook');
    }
  };

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/v1/webhooks/deliveries/${id}/retry`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch {
      alert('Failed to retry dispatch');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Webhooks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure secure HTTPS endpoints to receive real-time payment notifications with HMAC SHA-256 signatures.
        </p>
      </div>

      {/* Add Webhook Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Add New Endpoint</h3>
        <form onSubmit={handleAddWebhook} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            required
            placeholder="https://example.com/api/webhooks/qiflow"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Endpoint'}
          </button>
        </form>

        {createdSecret && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1 text-xs">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">
              🔑 Webhook HMAC Secret Key Generated!
            </p>
            <p className="font-mono text-emerald-700 dark:text-emerald-400 break-all select-all">
              {createdSecret}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 pt-1">
              Store this secret securely. Use it to verify incoming <code className="font-mono">X-QiFlow-Signature</code> headers.
            </p>
          </div>
        )}
      </div>

      {/* Webhook Endpoints List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Active Endpoints</h3>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No webhooks registered yet.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {webhooks.map((w) => (
                <div key={w.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-mono font-bold text-gray-900 dark:text-white">{w.url}</p>
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>Secret: {w.secretPrefix}</span>
                      <span>•</span>
                      <span>Events: {w.events.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors self-start sm:self-auto"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Webhook Delivery Logs */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Delivery Logs</h3>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          {deliveries.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No delivery logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3">Payment Code</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Attempt</th>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-3.5 font-mono font-medium text-gray-900 dark:text-white">
                        {d.event}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-gray-600 dark:text-gray-300">
                        {d.paymentCode}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            d.status === 'DELIVERED'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {d.statusCode || (d.status === 'DELIVERED' ? 200 : 500)} {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-500">{d.attempt}</td>
                      <td className="px-6 py-3.5 text-gray-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleRetry(d.id)}
                          disabled={retryingId === d.id}
                          className="px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {retryingId === d.id ? 'Retrying...' : '🔄 Retry'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
