import React from 'react';

export interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: React.ReactNode;
}

export function ParamTable({ params, caption }: { params: Param[]; caption?: string }) {
  return (
    <div className="not-prose overflow-x-auto rounded-xl border border-violet/20">
      <table className="w-full text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-violet/15 bg-ink/40">
            <th className="px-4 py-2.5 font-medium">Field</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-violet/15">
          {params.map((p) => (
            <tr key={p.name} className="align-top">
              <td className="px-4 py-2.5 whitespace-nowrap">
                <code className="font-mono text-xs text-white">{p.name}</code>
                {p.required && <span className="ml-1.5 text-[10px] font-semibold uppercase text-mint">required</span>}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-violet-200 whitespace-nowrap">{p.type}</td>
              <td className="px-4 py-2.5 text-slate-300">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
