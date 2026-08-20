'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

/**
 * Inline checkout entry (client-only init): the merchant page opens this URL with a
 * publishable key + amount; we create the payment here (same origin as the API CORS
 * allows) and hand off to the normal checkout in embed mode.
 */
export default function InlineEntryPage() {
  return (
    <Suspense fallback={null}>
      <InlineEntry />
    </Suspense>
  );
}

function post(data: Record<string, unknown>) {
  const msg = { source: 'qiflow', version: 1, ...data };
  try {
    if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
  } catch {
    /* ignore */
  }
  try {
    if (window.opener && !window.opener.closed) window.opener.postMessage(msg, '*');
  } catch {
    /* ignore */
  }
}

function InlineEntry() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  useEffect(() => {
    const pk = params.get('pk');
    const amount = params.get('amount');
    if (!pk || !amount) {
      const err = { code: 'BAD_REQUEST', message: 'Missing publishable key or amount.' };
      setError(err);
      post({ type: 'error', ...err });
      return;
    }
    let metadata: Record<string, unknown> | undefined;
    const rawMeta = params.get('metadata');
    if (rawMeta) {
      try {
        metadata = JSON.parse(atob(rawMeta));
      } catch {
        metadata = undefined;
      }
    }
    const body = {
      publicKey: pk,
      amount: Number(amount),
      currency: params.get('currency') || 'QI',
      description: params.get('description') || undefined,
      reference: params.get('reference') || undefined,
      metadata,
    };
    apiClient<{ paymentCode: string }>('/v1/payments/public', { method: 'POST', body: JSON.stringify(body), skipAuthRefresh: true }).then((res) => {
      if (res.success && res.data?.paymentCode) {
        router.replace(`/pay/${res.data.paymentCode}?embed=1`);
      } else {
        const err = { code: res.error?.code, message: res.error?.message || 'Could not start checkout.' };
        setError(err);
        post({ type: 'error', ...err });
      }
    });
  }, [params, router]);

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-none sm:rounded-3xl bg-indigo/60 border border-violet/25 p-8 text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-white">Checkout unavailable</h1>
            <p className="text-sm text-slate-300">{error.message}</p>
            {error.code && <p className="text-[11px] font-mono text-slate-500">{error.code}</p>}
            <button
              type="button"
              onClick={() => post({ type: 'close' })}
              className="mt-2 h-10 px-4 rounded-xl bg-white/5 border border-violet/30 text-sm text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-mint border-t-transparent rounded-full motion-safe:animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Preparing secure checkout…</p>
          </>
        )}
      </div>
    </div>
  );
}
