'use client';

import { useState } from 'react';

export default function CodeWindow() {
  const [copied, setCopied] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.qiflow.io';
  const codeString = `curl -X POST ${apiBase}/v1/payments \\
  -H "X-API-Key: qiflow_live_9a8f..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 25.50,
    "currency": "QI",
    "description": "Order #8492"
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto group perspective-1000">
      <div className="relative min-w-0 overflow-hidden rounded-2xl bg-[#141033] border border-violet/40 p-4 sm:p-6 shadow-card-lg backdrop-blur-xl transform sm:rotate-x-3 group-hover:rotate-x-0 group-hover:border-violet/70 group-hover:shadow-glow-violet transition-all duration-500 ease-out">
        {/* macOS Dots Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet/20 pb-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-3 text-xs text-slate-400 font-mono truncate">bash — POST /v1/payments</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="text-xs font-mono text-slate-300 hover:text-mint transition-colors px-2.5 py-1 rounded-md bg-violet-soft border border-violet/30 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <span className="text-mint">✓</span> Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        {/* Syntax-Highlighted Code Body */}
        <pre className="font-mono text-xs sm:text-sm text-left overflow-x-auto max-w-full leading-relaxed p-2 [-webkit-overflow-scrolling:touch]">
          <code>
            <span className="text-mint font-semibold">curl</span>{' '}
            <span className="text-blue-400 font-medium">-X POST</span>{' '}
            <span className="text-[#D4C7FC]">{apiBase}/v1/payments</span>{' '}\{'\n'}
            {'  '}<span className="text-blue-400 font-medium">-H</span>{' '}
            <span className="text-[#D4C7FC]">&quot;X-API-Key: qiflow_live_9a8f...&quot;</span>{' '}\{'\n'}
            {'  '}<span className="text-blue-400 font-medium">-H</span>{' '}
            <span className="text-[#D4C7FC]">&quot;Content-Type: application/json&quot;</span>{' '}\{'\n'}
            {'  '}<span className="text-blue-400 font-medium">-d</span>{' '}
            <span className="text-white">&apos;{'{'}</span>{'\n'}
            {'    '}<span className="text-blue-400 font-medium">&quot;amount&quot;</span>:{' '}
            <span className="text-amber-400 font-medium">25.50</span>,{'\n'}
            {'    '}<span className="text-blue-400 font-medium">&quot;currency&quot;</span>:{' '}
            <span className="text-[#D4C7FC]">&quot;QI&quot;</span>,{'\n'}
            {'    '}<span className="text-blue-400 font-medium">&quot;description&quot;</span>:{' '}
            <span className="text-[#D4C7FC]">&quot;Order #8492&quot;</span>{'\n'}
            {'  '}<span className="text-white">{'}'}&apos;</span>
          </code>
        </pre>
      </div>
    </div>
  );
}
