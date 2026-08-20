'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Payment } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatAmount, truncateAddress } from '@/lib/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { IconCopy, IconCheck, IconExternal, IconInbox, IconPlus, IconRefresh, IconSearch, IconZap } from '@/components/icons';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'EXPIRED', label: 'Expired' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];
const OPEN_STATUSES = new Set(['CREATED', 'PENDING', 'PROCESSING']);

export default function PaymentsPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const res = await apiClient<Payment[]>('/v1/payments?limit=100');
    if (res.success && Array.isArray(res.data)) setPayments(res.data);
    else setError(res.error?.message || 'Could not load payments.');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      const byFilter =
        filter === 'ALL' ? true : filter === 'OPEN' ? OPEN_STATUSES.has(p.status) : p.status === filter;
      const byQuery =
        !q ||
        p.paymentCode.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.txHash ?? '').toLowerCase().includes(q);
      return byFilter && byQuery;
    });
  }, [payments, filter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: payments.length, OPEN: 0, COMPLETED: 0, FAILED: 0, EXPIRED: 0 };
    for (const p of payments) {
      if (OPEN_STATUSES.has(p.status)) c.OPEN = (c.OPEN ?? 0) + 1;
      if (c[p.status] !== undefined) c[p.status] = (c[p.status] ?? 0) + 1;
    }
    return c;
  }, [payments]);

  const checkoutUrl = (p: Payment) => p.checkoutUrl || `${window.location.origin}/pay/${p.paymentCode}`;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const simulate = async (p: Payment) => {
    if (!confirm(`Mark ${p.paymentCode} as paid (test only)? This fires your webhooks.`)) return;
    setSimulating(p.id);
    const res = await apiClient<Payment>(`/v1/payments/${p.id}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    setSimulating(null);
    if (res.success && res.data) {
      toast.success('Payment marked as completed', p.paymentCode);
      await fetchPayments(true);
      if (selected?.id === p.id) setSelected((prev) => (prev ? { ...prev, status: res.data!.status, txHash: res.data!.txHash } : null));
    } else {
      toast.error('Simulation failed', res.error?.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Every checkout session, with live confirmation status from Quai Network."
        actions={
          <>
            <Button variant="outline" size="md" leftIcon={<IconRefresh size={16} />} onClick={() => fetchPayments(true)} disabled={loading}>
              Refresh
            </Button>
            <Link href="/dashboard/payments/new">
              <Button variant="primary" size="md" leftIcon={<IconPlus size={16} />}>
                New payment
              </Button>
            </Link>
          </>
        }
      />

      {/* Filters + search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`h-9 px-3 rounded-xl text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint
                  ${active ? 'bg-white text-ink' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-violet/20'}`}
              >
                {f.label}
                <span className={`tabular-nums text-[11px] ${active ? 'text-ink/60' : 'text-slate-500'}`}>{counts[f.key] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            aria-label="Search payments"
            placeholder="Search code, description, tx hash…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-ink/60 border border-violet/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-mint/60 focus:border-mint/60"
          />
        </div>
      </div>

      <Card flush className="overflow-hidden">
        {loading ? (
          <table className="w-full">
            <tbody className="divide-y divide-violet/15">
              <SkeletonTableRows rows={6} cols={6} />
            </tbody>
          </table>
        ) : error ? (
          <EmptyState
            title="Couldn't load payments"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={() => fetchPayments()}>
                Try again
              </Button>
            }
          />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<IconInbox size={22} />}
            title="No payments yet"
            description="Create a payment to get a hosted checkout link you can send to anyone."
            action={
              <Link href="/dashboard/payments/new">
                <Button variant="primary" size="sm" leftIcon={<IconPlus size={14} />}>
                  Create payment
                </Button>
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try a different status filter or clear the search."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter('ALL');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-violet/15">
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium hidden lg:table-cell">Description</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet/15">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="font-mono text-xs text-white hover:text-mint text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded"
                      >
                        {p.paymentCode}
                      </button>
                      <div className="lg:hidden text-xs text-slate-400 truncate max-w-[180px]">{p.description || ''}</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white tabular-nums whitespace-nowrap">{formatAmount(p.amount, p.currency)}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 hidden lg:table-cell max-w-xs truncate">{p.description || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Copy checkout link"
                          onClick={() => copy(checkoutUrl(p), p.id)}
                          leftIcon={copiedId === p.id ? <IconCheck size={14} className="text-mint" /> : <IconCopy size={14} />}
                        >
                          <span className="hidden sm:inline">{copiedId === p.id ? 'Copied' : 'Link'}</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelected(p)}>
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title="Payment details" description={selected.paymentCode}>
          <dl className="divide-y divide-violet/15 text-sm">
            {[
              ['Status', <Badge key="s" status={selected.status} />],
              ['Amount', <span key="a" className="font-semibold text-white tabular-nums">{formatAmount(selected.amount, selected.currency)}</span>],
              ['Description', <span key="d" className="text-slate-200">{selected.description || '—'}</span>],
              ['Receiving address', <span key="r" className="font-mono text-xs text-slate-200">{truncateAddress(selected.receivingAddress, 8)}</span>],
              [
                'Transaction',
                <span key="t" className="font-mono text-xs text-slate-200">
                  {selected.txHash ? truncateAddress(selected.txHash, 8) : 'Not yet on-chain'}
                </span>,
              ],
              ['Created', <span key="c" className="text-slate-200">{formatDate(selected.createdAt)}</span>],
              ['Expires', <span key="e" className="text-slate-200">{formatDate(selected.expiresAt)}</span>],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-slate-400">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <a href={checkoutUrl(selected)} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="secondary" size="md" className="w-full" leftIcon={<IconExternal size={14} />}>
                Open checkout
              </Button>
            </a>
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => copy(checkoutUrl(selected), selected.id)}
              leftIcon={copiedId === selected.id ? <IconCheck size={14} className="text-mint" /> : <IconCopy size={14} />}
            >
              {copiedId === selected.id ? 'Copied' : 'Copy link'}
            </Button>
          </div>

          {OPEN_STATUSES.has(selected.status) && (
            <div className="mt-4 rounded-xl border border-dashed border-violet/30 p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                <span className="text-slate-200 font-medium">Testing?</span> Mark as paid without a real transaction.
              </p>
              <Button
                variant="ghost"
                size="sm"
                loading={simulating === selected.id}
                onClick={() => simulate(selected)}
                leftIcon={<IconZap size={14} />}
              >
                Simulate paid
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
