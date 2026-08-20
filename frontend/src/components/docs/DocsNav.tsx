'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { DOCS_SECTIONS } from '@/lib/docs';
import { IconChevronRight } from '../icons';

export function DocsNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = DOCS_SECTIONS.find((s) => s.href === pathname) ?? DOCS_SECTIONS[0]!;

  const list = (
    <ul className="space-y-0.5">
      {DOCS_SECTIONS.map((s) => {
        const active = pathname === s.href;
        return (
          <li key={s.href}>
            <Link
              href={s.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 h-10 px-3 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint
                ${active ? 'bg-violet-soft text-white border border-violet/40 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              {active && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-mint" />}
              {s.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile: disclosure */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="docs-nav-mobile"
          onClick={() => setOpen((v) => !v)}
          className="w-full h-11 px-4 rounded-xl bg-indigo/60 border border-violet/30 flex items-center justify-between text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
        >
          <span>
            <span className="text-slate-400">Docs / </span>
            {current.title}
          </span>
          <IconChevronRight size={16} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        {open && (
          <div id="docs-nav-mobile" className="mt-2 p-2 rounded-xl bg-indigo/60 border border-violet/30">
            {list}
          </div>
        )}
      </div>

      {/* Desktop: sticky sidebar */}
      <nav aria-label="Docs sections" className="hidden lg:block sticky top-28 self-start w-56 shrink-0">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Merchant docs</p>
        {list}
        <div className="mt-6 px-3">
          <Link href="/dashboard/settings" className="text-xs text-mint hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded">
            Get an API key →
          </Link>
        </div>
      </nav>
    </>
  );
}
