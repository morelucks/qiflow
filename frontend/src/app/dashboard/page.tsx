'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatAmount, formatDate } from '@/lib/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonTableRows } from '@/components/ui/Skeleton';
import { IconCard, IconCheck, IconChevronRight, IconInbox, IconKey, IconBell, IconWallet, IconPlus, IconLink, IconRefresh, IconZap } from '@/components/icons';

function sumBy(rows: { currency: string; amount: string; count: number }[], currency: string) {
  return rows.find((r) => r.currency === currency);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient<DashboardStats>('/merchants/me/stats');
    if (res.success && res.data) setStats(res.data);
    else setError(res.error?.message || 'Could not load your dashboard.');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const qi = stats ? sumBy(stats.received, 'QI') : undefined;
  const quai = stats ? sumBy(stats.received, 'QUAI') : undefined;
  const todayQi = stats ? sumBy(stats.receivedToday, 'QI') : undefined;
  const todayQuai = stats ? sumBy(stats.receivedToday, 'QUAI') : undefined;
  const completed = stats?.payments.byStatus.COMPLETED ?? 0;
  const pending =
    (stats?.payments.byStatus.CREATED ?? 0) +
    (stats?.payments.byStatus.PENDING ?? 0) +
    (stats?.payments.byStatus.PROCESSING ?? 0);

  const setupSteps = stats
    ? [
        { done: stats.setup.walletSet, label: 'Set your receiving wallet', href: '/dashboard/settings', icon: <IconWallet size={16} /> },
        { done: stats.setup.hasPayment, label: 'Create your first payment', href: '/dashboard/payments/new', icon: <IconPlus size={16} /> },
        { done: stats.setup.hasWebhook, label: 'Add a webhook endpoint', href: '/dashboard/webhooks', icon: <IconBell size={16} /> },
        { done: stats.setup.hasApiKey, label: 'Generate an API key', href: '/dashboard/settings', icon: <IconKey size={16} /> },
      ]
    : [];
  const remaining = setupSteps.filter((s) => !s.done).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Your payment activity at a glance."
        actions={
          <>
            <Button variant="outline" size="md" leftIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
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

      {error && (
        <Card className="border-rose-500/40 flex items-center justify-between gap-4">
          <p className="text-sm text-rose-200">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </Card>
      )}

      {/* Setup checklist — only while something is left to do */}
      {!loading && stats && remaining > 0 && (
        <Card className="border-mint/30">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <IconZap size={16} className="text-mint" />
                Finish setting up
              </span>
            }
            description={`${setupSteps.length - remaining} of ${setupSteps.length} done — a few minutes to go live.`}
          />
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {setupSteps.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={`group flex items-center gap-3 h-12 px-3 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint
                    ${s.done ? 'border-violet/15 text-slate-400' : 'border-violet/30 text-white hover:border-mint/50 hover:bg-white/5'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border ${s.done ? 'bg-mint/15 border-mint/40 text-mint' : 'bg-violet-soft border-violet/40 text-slate-200'}`}
                  >
                    {s.done ? <IconCheck size={14} /> : s.icon}
                  </span>
                  <span className={`text-sm font-medium ${s.done ? 'line-through decoration-slate-600' : ''}`}>{s.label}</span>
                  {!s.done && <IconChevronRight size={16} className="ml-auto text-slate-500 group-hover:text-mint" />}
                  {s.done && <span className="ml-auto text-[11px] text-mint font-semibold">Done</span>}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* KPIs */}
      <section aria-label="Key metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-indigo/60 border border-violet/25 p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Received (all time)"
              accent="mint"
              icon={<IconCard size={18} />}
              value={
                <span className="flex flex-col">
                  <span>{formatAmount(qi?.amount ?? '0', 'QI')}</span>
                  {quai && <span className="text-base font-semibold text-slate-300">{formatAmount(quai.amount, 'QUAI')}</span>}
                </span>
              }
              hint={`${completed} completed payment${completed === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Received today"
              value={
                <span className="flex flex-col">
                  <span>{formatAmount(todayQi?.amount ?? '0', 'QI')}</span>
                  {todayQuai && <span className="text-base font-semibold text-slate-300">{formatAmount(todayQuai.amount, 'QUAI')}</span>}
                </span>
              }
              hint="Since midnight, local time"
            />
            <StatCard label="Payments" value={stats?.payments.total ?? 0} hint="All statuses" />
            <StatCard
              label="Awaiting / confirming"
              value={pending}
              hint={pending > 0 ? 'Open checkout sessions' : 'Nothing in flight'}
              accent={pending > 0 ? 'violet' : 'none'}
            />
          </>
        )}
      </section>

      {/* Recent payments */}
      <Card flush>
        <div className="px-5 py-4 border-b border-violet/15 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Recent payments</h2>
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center gap-1 text-sm text-mint hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded"
          >
            View all <IconChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <table className="w-full">
            <tbody className="divide-y divide-violet/15">
              <SkeletonTableRows rows={4} cols={4} />
            </tbody>
          </table>
        ) : !stats || stats.recent.length === 0 ? (
          <EmptyState
            icon={<IconInbox size={22} />}
            title="No payments yet"
            description="Create a payment or share a payment link — completed checkouts show up here in real time."
            action={
              <Link href="/dashboard/payments/new">
                <Button variant="primary" size="sm" leftIcon={<IconPlus size={14} />}>
                  Create your first payment
                </Button>
              </Link>
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
                  <th className="px-5 py-3 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet/15">
                {stats.recent.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs text-white">{p.paymentCode}</div>
                      {p.description && <div className="text-xs text-slate-400 truncate max-w-[220px]">{p.description}</div>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white tabular-nums">{formatAmount(p.amount, p.currency)}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-400 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick links */}
      <section aria-label="Shortcuts" className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/dashboard/payment-links', title: 'Payment links', desc: 'Reusable links for products, tips and invoices.', icon: <IconLink size={18} /> },
          { href: '/dashboard/webhooks', title: 'Webhooks', desc: 'Get signed events when payments complete.', icon: <IconBell size={18} /> },
          { href: '/dashboard/settings', title: 'API keys', desc: 'Integrate the Payments API into your stack.', icon: <IconKey size={18} /> },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group rounded-2xl bg-indigo/60 border border-violet/25 p-5 hover:border-violet/60 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-[border-color,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <span aria-hidden="true" className="w-9 h-9 rounded-xl bg-violet-soft border border-violet/40 text-mint flex items-center justify-center">
              {q.icon}
            </span>
            <p className="mt-3 text-sm font-semibold text-white group-hover:text-mint transition-colors">{q.title}</p>
            <p className="mt-1 text-xs text-slate-400">{q.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
