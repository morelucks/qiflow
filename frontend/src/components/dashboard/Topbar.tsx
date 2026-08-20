'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { MerchantProfile } from '@/types';
import { addressLedger } from '@qiflow/shared/address';
import { IconMenu, IconWallet, IconAlert } from '../icons';
import { navItems } from './Sidebar';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<MerchantProfile>('/merchants/me').then((res) => {
      if (!cancelled && res.success && res.data) setProfile(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]); // re-fetch on navigation so wallet changes in Settings show immediately

  const current =
    navItems.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)))?.label ??
    (pathname.includes('/payments/new') ? 'New payment' : 'Dashboard');
  const wallet = profile?.walletAddress ?? null;
  const ledger = wallet ? addressLedger(wallet) : null;

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 sm:px-6 lg:px-8 bg-ink/80 backdrop-blur-xl border-b border-violet/15">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="lg:hidden w-10 h-10 -ml-2 inline-flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-violet-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
      >
        <IconMenu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 leading-none hidden sm:block">Dashboard</p>
        <p className="text-sm font-semibold text-white truncate sm:mt-1">{current}</p>
      </div>

      {/* Wallet status chip */}
      {profile && (
        <Link
          href="/dashboard/settings"
          className={`hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint
            ${wallet ? 'border-violet/30 text-slate-200 hover:border-violet/60' : 'border-amber-500/40 text-amber-300 hover:border-amber-400'}`}
          title={wallet ?? 'No receiving wallet set'}
        >
          {wallet ? <IconWallet size={14} className="text-mint" /> : <IconAlert size={14} />}
          {wallet ? (
            <>
              <span className="font-mono">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
              <span className="text-slate-500">·</span>
              <span className="text-mint">{ledger}</span>
            </>
          ) : (
            'Set receiving wallet'
          )}
        </Link>
      )}

      {/* Merchant */}
      <Link
        href="/dashboard/settings"
        className="flex items-center gap-2.5 rounded-xl pl-1 pr-2 h-10 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
        aria-label="Account settings"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-indigo-light border border-violet/50 text-[11px] font-bold text-white flex items-center justify-center">
          {profile ? initials(profile.businessName) || 'Q' : '…'}
        </span>
        <span className="hidden md:block text-left leading-tight">
          <span className="block text-sm font-medium text-white max-w-[160px] truncate">{profile?.businessName ?? ' '}</span>
          <span className="block text-[11px] text-slate-400 max-w-[160px] truncate">
            {profile ? profile.email ?? 'Wallet account' : ' '}
          </span>
        </span>
      </Link>
    </header>
  );
}
