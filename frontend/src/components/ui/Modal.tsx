'use client';

import React, { useEffect, useId, useRef } from 'react';
import { IconX } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/** Accessible dialog: Escape closes, overlay click closes, focus moves in and is restored on close. */
export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    lastActive.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element inside the panel (or the panel itself)
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])',
      );
      (first ?? panelRef.current)?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      (lastActive.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/70 backdrop-blur-sm motion-safe:animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${widths[size]} rounded-2xl bg-indigo border border-violet/40 shadow-card-lg p-6 space-y-5 outline-none motion-safe:animate-slide-up`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-violet/20 pb-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-white tracking-tight">
              {title}
            </h3>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 -mr-2 -mt-1 w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-violet-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <IconX size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
