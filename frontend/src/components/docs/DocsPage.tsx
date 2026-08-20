import React from 'react';
import Link from 'next/link';
import { DOCS_SECTIONS } from '@/lib/docs';
import { IconChevronRight } from '../icons';

interface DocsPageProps {
  title: string;
  lede: React.ReactNode;
  children: React.ReactNode;
  /** Current href — used for prev/next links. */
  href: string;
}

/** Page wrapper: heading, lede, prose body, prev/next footer. */
export function DocsPage({ title, lede, children, href }: DocsPageProps) {
  const idx = DOCS_SECTIONS.findIndex((s) => s.href === href);
  const prev = idx > 0 ? DOCS_SECTIONS[idx - 1] : null;
  const next = idx >= 0 && idx < DOCS_SECTIONS.length - 1 ? DOCS_SECTIONS[idx + 1] : null;
  return (
    <article className="min-w-0">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-base sm:text-lg text-slate-300 leading-relaxed max-w-prose">{lede}</p>
      </header>
      <div className="docs-prose space-y-10">{children}</div>
      <nav aria-label="Previous and next" className="mt-16 pt-8 border-t border-violet/20 grid sm:grid-cols-2 gap-4">
        {prev ? (
          <Link href={prev.href} className="group rounded-2xl border border-violet/25 bg-indigo/40 p-4 hover:border-violet/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint">
            <span className="text-xs text-slate-400">Previous</span>
            <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-white group-hover:text-mint">
              <IconChevronRight size={14} className="rotate-180" /> {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className="group rounded-2xl border border-violet/25 bg-indigo/40 p-4 text-right hover:border-violet/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint">
            <span className="text-xs text-slate-400">Next</span>
            <span className="mt-1 flex items-center justify-end gap-1 text-sm font-semibold text-white group-hover:text-mint">
              {next.title} <IconChevronRight size={14} />
            </span>
          </Link>
        )}
      </nav>
    </article>
  );
}

/** Section heading with anchor. */
export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl sm:text-2xl font-bold tracking-tight text-white pt-2">
      <a href={`#${id}`} className="hover:text-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded">
        {children}
      </a>
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-base font-semibold text-white">
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm sm:text-[15px] leading-relaxed text-slate-300 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-white [&_code]:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-mint [&_a]:underline [&_a]:underline-offset-4">{children}</p>;
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-8 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="relative pl-12 [counter-increment:step] before:content-[counter(step)] before:absolute before:left-0 before:top-0 before:w-8 before:h-8 before:rounded-full before:bg-mint before:text-ink before:text-sm before:font-bold before:flex before:items-center before:justify-center">
      <h3 className="text-base font-semibold text-white pt-1">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </li>
  );
}
