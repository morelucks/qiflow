'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaymentLink } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatAmount } from '@/lib/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { IconCheck, IconCopy, IconExternal, IconLink, IconPlus } from '@/components/icons';

const emptyForm = { name: '', amount: '', currency: 'QI', description: '', fixedAmount: true, isActive: true };

export default function PaymentLinksPage() {
  const toast = useToast();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient<PaymentLink[]>('/v1/payment-links');
    if (res.success && Array.isArray(res.data)) setLinks(res.data);
    else setError(res.error?.message || 'Could not load payment links.');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (link: PaymentLink) => {
    setEditingId(link.id);
    setForm({
      name: link.name,
      amount: link.amount ? String(link.amount) : '',
      currency: link.currency,
      description: link.description || '',
      fixedAmount: link.fixedAmount,
      isActive: link.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) return setFormError('Give the link a name.');
    if (form.fixedAmount && (!form.amount || parseFloat(form.amount) <= 0)) return setFormError('Enter a fixed amount greater than 0, or let the customer choose.');
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      amount: form.fixedAmount && form.amount ? parseFloat(form.amount) : undefined,
      currency: form.currency,
      description: form.description.trim() || undefined,
      fixedAmount: form.fixedAmount,
      isActive: form.isActive,
    };
    const res = await apiClient(editingId ? `/v1/payment-links/${editingId}` : '/v1/payment-links', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.success) {
      setModalOpen(false);
      toast.success(editingId ? 'Link updated' : 'Payment link created', form.name.trim());
      load();
    } else {
      setFormError(res.error?.message || 'Failed to save payment link.');
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this link? Customers who open it will see it as unavailable.')) return;
    const res = await apiClient(`/v1/payment-links/${id}`, { method: 'DELETE' });
    if (res.success) {
      setModalOpen(false);
      toast.success('Link deactivated');
      load();
    } else {
      toast.error('Could not deactivate', res.error?.message);
    }
  };

  const linkUrl = (l: PaymentLink) => l.url || `${window.location.origin}/pay/link/${l.linkCode}`;
  const copy = async (l: PaymentLink) => {
    await navigator.clipboard.writeText(linkUrl(l));
    setCopiedId(l.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment links"
        description="Reusable links for products, services, tips and invoices — share them anywhere."
        actions={
          <Button variant="primary" size="md" leftIcon={<IconPlus size={16} />} onClick={openCreate}>
            New link
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <Card flush>
          <EmptyState title="Couldn't load payment links" description={error} action={<Button variant="outline" size="sm" onClick={load}>Try again</Button>} />
        </Card>
      ) : links.length === 0 ? (
        <Card flush>
          <EmptyState
            icon={<IconLink size={22} />}
            title="No payment links yet"
            description="Create a link once and reuse it — each visit spins up a fresh checkout session."
            action={
              <Button variant="primary" size="sm" leftIcon={<IconPlus size={14} />} onClick={openCreate}>
                Create your first link
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {links.map((link) => (
            <li key={link.id}>
              <Card className="h-full flex flex-col gap-4 hover:border-violet/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{link.name}</h3>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{link.description || 'No description'}</p>
                  </div>
                  <Badge status={link.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                <div className="rounded-xl bg-ink/50 border border-violet/20 px-4 py-3 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Amount</span>
                  <span className="font-bold text-white tabular-nums">
                    {link.fixedAmount && link.amount ? formatAmount(link.amount, link.currency) : 'Customer chooses'}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-400 tabular-nums">{link.uses ?? 0} uses</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Copy link"
                      onClick={() => copy(link)}
                      leftIcon={copiedId === link.id ? <IconCheck size={14} className="text-mint" /> : <IconCopy size={14} />}
                    >
                      {copiedId === link.id ? 'Copied' : 'Copy'}
                    </Button>
                    <a href={linkUrl(link)} target="_blank" rel="noreferrer" aria-label="Open link">
                      <Button variant="ghost" size="sm" leftIcon={<IconExternal size={14} />}>
                        Open
                      </Button>
                    </a>
                    <Button variant="outline" size="sm" onClick={() => openEdit(link)}>
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit payment link' : 'New payment link'}>
        <form onSubmit={save} className="space-y-4" noValidate>
          <Input
            label="Name"
            required
            placeholder="e.g. Digital download, Tip jar"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />

          <div className="flex items-center gap-3">
            <input
              id="fixedAmount"
              type="checkbox"
              checked={form.fixedAmount}
              onChange={(e) => setForm({ ...form, fixedAmount: e.target.checked })}
              className="w-4 h-4 rounded border-violet/40 bg-ink text-mint focus:ring-mint focus:ring-offset-0"
            />
            <label htmlFor="fixedAmount" className="text-sm text-slate-200">
              Fixed amount
            </label>
          </div>

          {form.fixedAmount && (
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <Input
                label="Amount"
                type="number"
                inputMode="decimal"
                step="0.00000001"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="font-semibold tabular-nums"
              />
              <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-28">
                <option value="QI">QI</option>
                <option value="QUAI">QUAI</option>
              </Select>
            </div>
          )}

          <Textarea
            label="Description"
            hint="Optional — shown to customers on the checkout page."
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {editingId && (
            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-violet/40 bg-ink text-mint focus:ring-mint focus:ring-offset-0"
              />
              <label htmlFor="isActive" className="text-sm text-slate-200">
                Active (accepting payments)
              </label>
            </div>
          )}

          {formError && (
            <p role="alert" className="text-sm text-rose-300">
              {formError}
            </p>
          )}

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-violet/15">
            {editingId ? (
              <Button type="button" variant="danger" size="sm" onClick={() => deactivate(editingId)}>
                Deactivate
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="md" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" loading={submitting}>
                {editingId ? 'Save changes' : 'Create link'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
