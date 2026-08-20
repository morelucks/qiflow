'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { IconCheck, IconAlert, IconX } from '../icons';

type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** ms; default 4500 (errors 7000) */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const tone: Record<ToastVariant, string> = {
  success: 'border-mint/40 text-mint',
  error: 'border-rose-500/40 text-rose-300',
  info: 'border-violet/50 text-slate-200',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++counter.current;
      const variant = opts.variant ?? 'info';
      setItems((prev) => [...prev.slice(-3), { ...opts, id, variant }]);
      const ms = opts.duration ?? (variant === 'error' ? 7000 : 4500);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Live region so screen readers announce toasts */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96 pointer-events-none"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl bg-indigo border ${tone[t.variant ?? 'info']} shadow-card px-4 py-3 motion-safe:animate-slide-up`}
          >
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              {t.variant === 'success' ? <IconCheck size={16} /> : t.variant === 'error' ? <IconAlert size={16} /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-slate-300 break-words">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 -mr-1 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-violet-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
