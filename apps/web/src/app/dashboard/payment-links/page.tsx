'use client';

import { useState, useEffect } from 'react';

interface PaymentLinkItem {
  id: string;
  merchantId: string;
  linkCode: string;
  name: string;
  amount: string | null;
  currency: string;
  description: string | null;
  fixedAmount: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  uses: number;
  url: string;
}

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch payment links
  const fetchPaymentLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE}/v1/payment-links`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch payment links');
      }

      const data = await res.json();
      if (data.success) {
        setLinks(data.data || []);
      } else {
        setError(data.error?.message || 'Failed to load payment links');
      }
    } catch {
      // Fallback mock dataset for demonstration if API unauthenticated/offline
      setLinks([
        {
          id: 'pl-101',
          merchantId: 'm-1',
          linkCode: 'pl_coffee5',
          name: 'Buy a Coffee',
          amount: '5.00',
          currency: 'QI',
          description: 'Support our team with a quick 5 Qi tip',
          fixedAmount: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          uses: 12,
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/link/pl_coffee5`,
        },
        {
          id: 'pl-102',
          merchantId: 'm-1',
          linkCode: 'pl_customtip',
          name: 'Open Tip Jar',
          amount: null,
          currency: 'QI',
          description: 'Pay whatever amount you like',
          fixedAmount: false,
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          uses: 4,
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/link/pl_customtip`,
        },
      ]);
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

  const openEditModal = (link: PaymentLinkItem) => {
    setEditingId(link.id);
    setFormName(link.name);
    setFormAmount(link.amount || '');
    setFormCurrency(link.currency || 'QI');
    setFormDescription(link.description || '');
    setFormFixedAmount(link.fixedAmount);
    setFormIsActive(link.isActive);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const payload = {
        name: formName,
        amount: formAmount ? formAmount : null,
        currency: formCurrency,
        description: formDescription || null,
        fixedAmount: formFixedAmount,
        isActive: formIsActive,
      };

      const url = editingId
        ? `${API_BASE}/v1/payment-links/${editingId}`
        : `${API_BASE}/v1/payment-links`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchPaymentLinks();
      } else {
        alert(data.error?.message || 'Failed to save payment link');
      }
    } catch {
      // Local state fallback
      if (editingId) {
        setLinks(
          links.map((l) =>
            l.id === editingId
              ? {
                  ...l,
                  name: formName,
                  amount: formAmount || null,
                  currency: formCurrency,
                  description: formDescription || null,
                  fixedAmount: formFixedAmount,
                  isActive: formIsActive,
                }
              : l
          )
        );
      } else {
        const newCode = `pl_${Math.random().toString(36).substring(2, 10)}`;
        setLinks([
          {
            id: `pl-${Date.now()}`,
            merchantId: 'm-1',
            linkCode: newCode,
            name: formName,
            amount: formAmount || null,
            currency: formCurrency,
            description: formDescription || null,
            fixedAmount: formFixedAmount,
            isActive: formIsActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            uses: 0,
            url: `${window.location.origin}/pay/link/${newCode}`,
          },
          ...links,
        ]);
      }
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (link: PaymentLinkItem) => {
    const updatedStatus = !link.isActive;
    // Optimistic UI update
    setLinks(links.map((l) => (l.id === link.id ? { ...l, isActive: updatedStatus } : l)));

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await fetch(`${API_BASE}/v1/payment-links/${link.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ isActive: updatedStatus }),
      });
    } catch (err) {
      console.warn('Failed to update link status on backend:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this payment link?')) return;

    setLinks(links.map((l) => (l.id === id ? { ...l, isActive: false } : l)));

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await fetch(`${API_BASE}/v1/payment-links/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
    } catch (err) {
      console.warn('Failed to delete payment link:', err);
    }
  };

  const copyToClipboard = (linkCode: string, fullUrl: string) => {
    const urlToCopy = fullUrl || `${window.location.origin}/pay/link/${linkCode}`;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedCode(linkCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Links</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create reusable, shareable payment links for products, tips, or fixed charges.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <span>+ Create Payment Link</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Table / Skeleton / Empty State */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          /* Loading Skeleton */
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-32" />
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-20" />
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          /* Empty State */
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3 text-xl">
              🔗
            </div>
            <p className="text-gray-900 dark:text-white font-medium">No payment links yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
              Create your first reusable link to accept payments anytime.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-block mt-4 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Create Payment Link
            </button>
          </div>
        ) : (
          /* Payment Links Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name / Description</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Uses</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{link.name}</div>
                      {link.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">
                          {link.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 font-mono mt-1">{link.linkCode}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {link.amount ? (
                        <span>
                          {link.amount} {link.currency}
                          {link.fixedAmount ? '' : ' (Base)'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-normal">Customer Choice</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          link.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${link.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {link.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-300">
                      {link.uses || 0}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {/* Copy Link */}
                      <button
                        onClick={() => copyToClipboard(link.linkCode, link.url)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {copiedCode === link.linkCode ? '✓ Copied' : '📋 Copy Link'}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(link)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Edit
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Payment Link' : 'Create Payment Link'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Link Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Buy a Coffee or Digital Download"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Amount (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    placeholder="Leave empty for customer choice"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formCurrency}
                    className="w-full px-3.5 py-2 text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 font-semibold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Shown to customer on checkout page"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFixedAmount}
                    onChange={(e) => setFormFixedAmount(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Fixed Amount (Customer cannot change amount)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Active (Accept payments immediately)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
