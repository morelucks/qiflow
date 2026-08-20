'use client';

import { useCallback, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AuthGuard } from '../auth/AuthGuard';
import { ToastProvider } from '../ui/Toast';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ink text-white flex">
        {/* Ambient brand glow (decorative) */}
        <div aria-hidden="true" className="pointer-events-none fixed -top-40 right-[-10%] w-[520px] h-[520px] rounded-full bg-violet/15 blur-[140px]" />
        <div aria-hidden="true" className="pointer-events-none fixed bottom-[-20%] left-[10%] w-[420px] h-[420px] rounded-full bg-mint/8 blur-[140px]" />

        <Sidebar open={menuOpen} onClose={close} />

        <div className="relative flex-1 min-w-0 flex flex-col">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main id="main" className="flex-1">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
              <AuthGuard>{children}</AuthGuard>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
