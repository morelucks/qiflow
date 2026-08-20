'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// ── Types shared with /v1/inline.js ───────────────────────────────────────────

export interface InlinePaymentResult {
  paymentCode: string;
  status: string;
  txHash: string | null;
  amount?: string;
  currency?: string;
}

export interface InlineOptions {
  /** Server-created payment (recommended). */
  paymentCode?: string;
  /** Client-only: publishable key + amount. */
  key?: string;
  amount?: number | string;
  currency?: 'QI' | 'QUAI';
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  mode?: 'modal' | 'popup';
  /** ms after COMPLETED before the modal closes; false to keep it open. Default 2000. */
  autoCloseMs?: number | false;
  onSuccess?: (payment: InlinePaymentResult) => void;
  onFailed?: (payment: InlinePaymentResult) => void;
  onStatus?: (status: string, event: Record<string, unknown>) => void;
  onError?: (error: { code?: string; message: string }) => void;
  onClose?: () => void;
}

export interface InlineHandle {
  open: () => InlineHandle;
  close: () => void;
  url: string;
}

interface QiFlowGlobal {
  inline: (opts: InlineOptions) => InlineHandle;
  open: (opts: InlineOptions) => InlineHandle;
  version: string;
  origin: string;
}

declare global {
  interface Window {
    QiFlow?: QiFlowGlobal;
  }
}

export const DEFAULT_SCRIPT_URL = 'https://app.qiflow.io/v1/inline.js';

// ── Script loader (once per page) ─────────────────────────────────────────────

let loadPromise: Promise<QiFlowGlobal> | null = null;

export function loadQiFlow(scriptUrl: string = DEFAULT_SCRIPT_URL): Promise<QiFlowGlobal> {
  if (typeof window === 'undefined') return Promise.reject(new Error('QiFlow Inline is browser-only'));
  if (window.QiFlow?.inline) return Promise.resolve(window.QiFlow);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    const script = existing ?? document.createElement('script');
    const done = () => (window.QiFlow?.inline ? resolve(window.QiFlow) : reject(new Error('QiFlow Inline failed to initialise')));
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => { loadPromise = null; reject(new Error(`Failed to load ${scriptUrl}`)); }, { once: true });
    if (!existing) {
      script.src = scriptUrl;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return loadPromise;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseQiFlowInlineOptions {
  /** Override when self-hosting or using a preview environment. */
  scriptUrl?: string;
}

export function useQiFlowInline({ scriptUrl = DEFAULT_SCRIPT_URL }: UseQiFlowInlineOptions = {}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const handleRef = useRef<InlineHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadQiFlow(scriptUrl)
      .then(() => !cancelled && setReady(true))
      .catch((e: Error) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [scriptUrl]);

  const open = useCallback(
    async (options: InlineOptions): Promise<InlineHandle> => {
      const qf = await loadQiFlow(scriptUrl);
      handleRef.current?.close();
      const handle = qf.inline(options).open();
      handleRef.current = handle;
      return handle;
    },
    [scriptUrl],
  );

  const close = useCallback(() => handleRef.current?.close(), []);

  return { ready, error, open, close };
}

// ── Button ────────────────────────────────────────────────────────────────────

export interface QiFlowButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onError'>, InlineOptions {
  scriptUrl?: string;
  children?: ReactNode;
}

/** Drop-in button: `<QiFlowButton paymentCode="pay_…" onSuccess={…}>Pay 12 QI</QiFlowButton>` */
export function QiFlowButton({
  scriptUrl,
  children = 'Pay with QiFlow',
  paymentCode, key: publicKey, amount, currency, description, reference, metadata, mode, autoCloseMs,
  onSuccess, onFailed, onStatus, onError, onClose,
  disabled, onClick, ...buttonProps
}: QiFlowButtonProps) {
  const { ready, open } = useQiFlowInline({ scriptUrl });
  return (
    <button
      type="button"
      disabled={disabled || !ready}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        open({ paymentCode, key: publicKey, amount, currency, description, reference, metadata, mode, autoCloseMs, onSuccess, onFailed, onStatus, onError, onClose }).catch(
          (err: Error) => onError?.({ message: err.message }),
        );
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
