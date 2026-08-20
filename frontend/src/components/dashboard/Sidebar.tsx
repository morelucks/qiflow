'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { IconHome, IconCard, IconLink, IconBell, IconSettings, IconPlus, IconLogOut, IconX, IconQiLogo } from '../icons';
import { logout } from '@/lib/api-client';

export const navItems = [
  { href: '/dashboard', label: 'Overview', icon: IconHome, exact: true },
  { href: '/dashboard/payments', label: 'Payments', icon: IconCard },
  { href: '/dashboard/payment-links', label: 'Payment Links', icon: IconLink },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: IconBell },
  { href: '/dashboard/settings', label: 'Settings', icon: IconSettings },
];

interface SidebarProps {
  /** Mobile drawer open state (ignored on lg+ where the sidebar is always visible). */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Close the drawer on route change and on Escape
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-label="Dashboard navigation"
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-indigo/95 lg:bg-indigo/50 border-r border-violet/20 backdrop-blur-xl
          transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-violet/20">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <span className="w-8 h-8 rounded-full border-2 border-violet bg-indigo/60 flex items-center justify-center text-mint shadow-glow-violet">
              <IconQiLogo size={12} />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Qi<span className="text-mint">Flow</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden w-10 h-10 -mr-2 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-violet-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Primary action */}
        <div className="px-4 pt-4">
          <Link
            href="/dashboard/payments/new"
            className="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-mint text-ink text-sm font-semibold hover:bg-[#26eed2] motion-safe:active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-indigo"
          >
            <IconPlus size={16} />
            New payment
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint
                  ${active ? 'bg-violet-soft text-white border border-violet/40' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'}`}
              >
                <Icon size={18} className={active ? 'text-mint' : 'text-slate-400 group-hover:text-slate-200'} />
                {label}
                {active && <span aria-hidden="true" className="ml-auto w-1.5 h-1.5 rounded-full bg-mint" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-violet/20 space-y-1">
          <Link
            href="/docs"
            className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <span aria-hidden="true" className="text-slate-400 font-mono text-xs w-[18px] text-center">{'{}'}</span>
            API docs
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 h-10 px-3 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <IconLogOut size={18} className="text-slate-400" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
