'use client';

import { useState, useEffect } from 'react';
import type { PaymentLink } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { apiClient } from '../../../lib/api-client';
import { formatAmount } from '../../../lib/formatters';
import { SkeletonCard } from '../../../components/ui/Skeleton';

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('QI');
  const [formDescription, setFormDescription] = useState('');
  const [formFixedAmount, setFormFixedAmount] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPaymentLinks = async () => {
    setLoading(true);
    try {
      const res = await apiClient<PaymentLink[]>('/v1/payment-links');
      if (res.success && Array.isArray(res.data)) {
        setLinks(res.data);
      } else {
        setLinks([]);
      }
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentLinks();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormAmount('');
    setFormCurrency('QI');
    setFormDescription('');
    setFormFixedAmount(true);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (link: PaymentLink) => {
    setEditingId(link.id);
    setFormName(link.name);
    setFormAmount(link.amount ? link.amount.toString() : '');
    setFormCurrency(link.currency);
    setFormDescription(link.description || '');
    setFormFixedAmount(link.fixedAmount);
    setFormIsActive(link.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        amount: formFixedAmount && formAmount ? parseFloat(formAmount) : undefined,
        currency: formCurrency,
        description: formDescription.trim() || undefined,
        fixedAmount: formFixedAmount,
        isActive: formIsActive,
      };

      const endpoint = editingId ? `/v1/payment-links/${editingId}` : '/v1/payment-links';
      const method = editingId ? 'PUT' : 'POST';

      const res = await apiClient(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsModalOpen(false);
        fetchPaymentLinks();
      } else {
        alert(res.error?.message || 'Failed to save payment link');
      }
    } catch {
      alert('Error saving payment link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this payment link?')) return;
    try {
      await apiClient(`/v1/payment-links/${id}`, { method: 'DELETE' });
      fetchPaymentLinks();
    } catch {
      alert('Failed to deactivate link');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Payment Links
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create reusable links for selling products, services, or accepting donations with Qi or Quai
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreateModal}>
          + Create Payment Link
        </Button>
      </div>

      {/* Grid of Payment Links */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : links.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No payment links created yet</p>
          <p className="text-xs text-gray-400 mt-1">Click Create Payment Link above to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <Card key={link.id} className="flex flex-col justify-between space-y-4 hover:border-brand-500/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                    {link.name}
                  </h3>
                  <Badge status={link.isActive ? 'COMPLETED' : 'EXPIRED'} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {link.description || 'No description provided.'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Amount</span>
                <span className="font-extrabold text-gray-900 dark:text-white">
                  {link.fixedAmount && link.amount ? formatAmount(link.amount, link.currency) : 'Customer Decides'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 text-[11px]">Uses: {link.uses || 0}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        link.url || `${window.location.origin}/pay/link/${link.linkCode}`,
                        link.id
                      )
                    }
                  >
                    {copiedCode === link.id ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEditModal(link)}>
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal for Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Payment Link' : 'Create New Payment Link'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Link Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Digital Art Download or Supporter Tip Jar"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id="fixedAmount"
              checked={formFixedAmount}
              onChange={(e) => setFormFixedAmount(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800"
            />
            <label htmlFor="fixedAmount" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Fixed Amount Request
            </label>
          </div>

          {formFixedAmount && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="QI">QI</option>
                  <option value="QUAI">QUAI</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide context or instructions for your customers..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
            {editingId ? (
              <Button type="button" variant="danger" size="sm" onClick={() => handleDeactivate(editingId)}>
                Deactivate Link
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                {editingId ? 'Save Changes' : 'Create Link'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
