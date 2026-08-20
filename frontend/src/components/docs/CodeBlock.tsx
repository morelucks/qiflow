'use client';

import { useState } from 'react';
import { IconCheck, IconCopy } from '../icons';

export interface CodeTab {
  label: string;
  code: string;
  /** Shown in the window title, e.g. "bash" or "node" */
  lang?: string;
}

interface CodeBlockProps {
  /** Single snippet… */
  code?: string;
  lang?: string;
  /** …or tabs (cURL / Node.js / Python). */
  tabs?: CodeTab[];
  title?: string;
  className?: string;
}

/** Flat code window with copy button and optional language tabs. */
export function CodeBlock({ code, lang, tabs, title, className = '' }: CodeBlockProps) {
  const items: CodeTab[] = tabs && tabs.length > 0 ? tabs : [{ label: lang ?? 'code', code: code ?? '', lang }];
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = items[Math.min(active, items.length - 1)] ?? items[0]!;

  const copy = async () => {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`not-prose rounded-2xl bg-[#141033] border border-violet/30 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-2 px-4 h-11 border-b border-violet/20 bg-ink/40">
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {items.length > 1 ? (
            <div role="tablist" aria-label="Code language" className="flex items-center gap-1">
              {items.map((t, i) => (
                <button
                  key={t.label}
                  role="tab"
                  type="button"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint
                    ${i === active ? 'bg-violet-soft text-white border border-violet/40' : 'text-slate-400 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-mono text-slate-400 truncate">{title ?? current.lang ?? current.label}</span>
          )}
          {items.length > 1 && title && <span className="ml-3 text-xs font-mono text-slate-500 truncate hidden sm:inline">{title}</span>}
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-mint bg-violet-soft border border-violet/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          aria-label="Copy code"
        >
          {copied ? <IconCheck size={13} className="text-mint" /> : <IconCopy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-slate-200" tabIndex={0}>
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
