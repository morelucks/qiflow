'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Webhook, WebhookDelivery, WebhookTestResult } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListRows, SkeletonTableRows } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { IconBell, IconCheck, IconCopy, IconInbox, IconRefresh, IconSend, IconTrash } from '@/components/icons';

const DEFAULT_EVENTS = ['payment.completed', 'payment.failed'];

export default function WebhooksPage() {
  const toast = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, WebhookTestResult | { requestFailed: true; message: string }>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const [w, d] = await Promise.all([apiClient<Webhook[]>('/v1/webhooks'), apiClient<WebhookDelivery[]>('/v1/webhooks/deliveries')]);
    if (w.success && Array.isArray(w.data)) setWebhooks(w.data);
    else setError(w.error?.message || 'Could not load webhooks.');
    if (d.success && Array.isArray(d.data)) setDeliveries(d.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) return setUrlError('Enter a full URL starting with https:// (http:// is fine for local testing).');
    setSubmitting(true);
    const res = await apiClient<{ secret: string }>('/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url: trimmed, events: DEFAULT_EVENTS }),
    });
    setSubmitting(false);
    if (res.success && res.data) {
      setCreatedSecret(res.data.secret);
      setUrl('');
      toast.success('Endpoint added', 'Copy the signing secret — it is shown once.');
      load(true);
    } else {
      setUrlError(res.error?.message || 'Failed to add endpoint.');
    }
  };

  const remove = async (w: Webhook) => {
    if (!confirm(`Delete ${w.url}? Events will stop being sent to it.`)) return;
    const res = await apiClient(`/v1/webhooks/${w.id}`, { method: 'DELETE' });
    if (res.success) {
      toast.success('Endpoint deleted');
      load(true);
    } else toast.error('Could not delete endpoint', res.error?.message);
  };

  const test = async (id: string) => {
    setTestingId(id);
    const res = await apiClient<WebhookTestResult>(`/v1/webhooks/${id}/test`, { method: 'POST' });
    setTestingId(null);
    if (res.success && res.data) setTestResults((p) => ({ ...p, [id]: res.data! }));
    else setTestResults((p) => ({ ...p, [id]: { requestFailed: true, message: res.error?.message || 'Test request failed' } }));
  };

  const retry = async (id: string) => {
    setRetryingId(id);
    const res = await apiClient(`/v1/webhooks/deliveries/${id}/retry`, { method: 'POST' });
    setRetryingId(null);
    if (res.success) {
      toast.success('Delivery retried');
      load(true);
    } else toast.error('Retry failed', res.error?.message);
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    await navigator.clipboard.writeText(createdSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Receive signed, real-time events when payments complete or fail. Verify X-QiFlow-Signature with your endpoint secret."
        actions={
          <Button variant="outline" size="md" leftIcon={<IconRefresh size={16} />} onClick={() => load(true)} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* Add endpoint */}
      <Card className="space-y-4">
        <CardHeader title="Add endpoint" description={`Subscribed to ${DEFAULT_EVENTS.join(' and ')}.`} />
        <form onSubmit={add} className="flex flex-col sm:flex-row sm:items-start gap-3" noValidate>
          <Input
            label="Endpoint URL"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com/api/webhooks/qiflow"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={urlError ?? undefined}
            containerClassName="flex-1"
            mono
          />
          <Button type="submit" variant="primary" size="md" loading={submitting} className="sm:mt-[22px]">
            Add endpoint
          </Button>
        </form>

        {createdSecret && (
          <div className="rounded-xl bg-mint/10 border border-mint/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-mint">Signing secret — shown once, store it now</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-white break-all select-all">{createdSecret}</code>
              <Button variant="secondary" size="sm" onClick={copySecret} leftIcon={secretCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {secretCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-slate-300">
              Use it to verify <code className="font-mono">X-QiFlow-Signature</code> (HMAC-SHA256 over the raw body) and check{' '}
              <code className="font-mono">X-QiFlow-Timestamp</code> is recent.
            </p>
          </div>
        )}
      </Card>

      {/* Endpoints */}
      <Card flush>
        <div className="px-5 py-4 border-b border-violet/15">
          <h2 className="text-base font-semibold text-white">Endpoints</h2>
        </div>
        {loading ? (
          <SkeletonListRows rows={2} />
        ) : error ? (
          <EmptyState title="Couldn't load endpoints" description={error} action={<Button variant="outline" size="sm" onClick={() => load()}>Try again</Button>} />
        ) : webhooks.length === 0 ? (
          <EmptyState icon={<IconBell size={22} />} title="No endpoints yet" description="Add an HTTPS URL above to start receiving signed payment events." />
        ) : (
          <ul className="divide-y divide-violet/15">
            {webhooks.map((w) => {
              const result = testResults[w.id];
              return (
                <li key={w.id} className="p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-sm text-white break-all">{w.url}</p>
                      <p className="text-xs text-slate-400">
                        Secret <span className="font-mono">{w.secretPrefix}</span> · {w.events.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="secondary" size="sm" loading={testingId === w.id} onClick={() => test(w.id)} leftIcon={<IconSend size={14} />}>
                        Send test
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={`Delete ${w.url}`} onClick={() => remove(w)} leftIcon={<IconTrash size={14} />} className="text-rose-300 hover:text-rose-200">
                        Delete
                      </Button>
                    </div>
                  </div>
                  {result &&
                    ('requestFailed' in result ? (
                      <p role="status" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {result.message}
                      </p>
                    ) : (
                      <div
                        role="status"
                        className={`rounded-xl border px-3 py-2 text-xs space-y-1 ${result.ok ? 'border-mint/30 bg-mint/10 text-mint' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}
                      >
                        <p className="font-semibold">
                          {result.ok ? 'Delivered' : 'Failed'} — {result.statusCode !== null ? `HTTP ${result.statusCode}` : 'no response'} in {result.durationMs} ms
                        </p>
                        {(result.error || result.responseBody) && (
                          <p className="font-mono break-all opacity-80">{result.error || result.responseBody}</p>
                        )}
                      </div>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Delivery log */}
      <Card flush>
        <div className="px-5 py-4 border-b border-violet/15">
          <h2 className="text-base font-semibold text-white">Recent deliveries</h2>
        </div>
        {loading ? (
          <table className="w-full">
            <tbody className="divide-y divide-violet/15">
              <SkeletonTableRows rows={4} cols={6} />
            </tbody>
          </table>
        ) : deliveries.length === 0 ? (
          <EmptyState icon={<IconInbox size={22} />} title="No deliveries yet" description="Every attempt to reach your endpoints — including retries — will be logged here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-violet/15">
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Attempt</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">When</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet/15">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-white">{d.event}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300">{d.paymentCode}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={d.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 hidden sm:table-cell tabular-nums">
                      {d.attempt}
                      {d.statusCode ? <span className="text-slate-500"> · HTTP {d.statusCode}</span> : null}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" loading={retryingId === d.id} onClick={() => retry(d.id)} leftIcon={<IconRefresh size={14} />}>
                        Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
