'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Payment } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { apiClient } from '../../../lib/api-client';
import { formatDate, formatAmount, truncateAddress } from '../../../lib/formatters';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await apiClient<Payment[]>('/v1/payments');
      if (res.success && Array.isArray(res.data)) {
        setPayments(res.data);
      } else {
        setPayments([]);
      }
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleSimulate = async (id: string, status: 'COMPLETED' | 'FAILED') => {
    try {
      setSimulating(id);
      const res = await apiClient<Payment>(`/v1/payments/${id}/simulate`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      if (res.success && res.data) {
        await fetchPayments();
        if (selectedPayment?.id === id) {
          setSelectedPayment((prev) => (prev ? { ...prev, status: res.data!.status, txHash: res.data!.txHash } : null));
        }
      }
    } catch {
      alert('Failed to simulate payment');
    } finally {
      setSimulating(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch =
      p.paymentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Payments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time monitoring of all checkout sessions and network confirmations
          </p>
        </div>
        <Link href="/dashboard/payments/new">
          <Button variant="primary" size="md">
            + Create Payment
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <Card className="!p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'EXPIRED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {s === 'ALL' ? 'All Payments' : s}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </Card>

      {/* Table Card */}
      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Payment Code</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <SkeletonTableRows rows={6} cols={6} />
              </tbody>
            </table>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No payments found</p>
            <p className="text-xs text-gray-400 mt-1">Create a new payment or adjust your search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Payment Code</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900 dark:text-white">
                      {p.paymentCode}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {formatAmount(p.amount, p.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {p.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedPayment(p)}>
                        Details
                      </Button>

                      {p.status !== 'COMPLETED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={simulating === p.id}
                          onClick={() => handleSimulate(p.id, 'COMPLETED')}
                          className="!text-emerald-600 dark:!text-emerald-400 !bg-emerald-50 dark:!bg-emerald-950/40 hover:!bg-emerald-100"
                        >
                          Simulate Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      {selectedPayment && (
        <Modal
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title={`Payment Details — ${selectedPayment.paymentCode}`}
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Status</span>
              <Badge status={selectedPayment.status} />
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatAmount(selectedPayment.amount, selectedPayment.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Receiving Address</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {truncateAddress(selectedPayment.receivingAddress, 6)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Tx Hash</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {selectedPayment.txHash ? truncateAddress(selectedPayment.txHash, 6) : 'Pending on-chain...'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Checkout Link</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/pay/${selectedPayment.paymentCode}`,
                    selectedPayment.id
                  )
                }
                className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
              >
                {copiedCode === selectedPayment.id ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setSelectedPayment(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
