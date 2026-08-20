import React from 'react';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const methodTone: Record<Method, string> = {
  GET: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  POST: 'bg-mint-soft text-mint border-mint/30',
  PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

interface EndpointProps {
  method: Method;
  path: string;
  auth?: 'api-key' | 'public';
  id?: string;
  children?: React.ReactNode;
}

/** Method chip + path + auth badge; acts as a subsection anchor. */
export function Endpoint({ method, path, auth = 'api-key', id, children }: EndpointProps) {
  return (
    <div id={id} className="not-prose scroll-mt-24 rounded-2xl border border-violet/25 bg-indigo/40 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center h-6 px-2 rounded-md text-[11px] font-bold tracking-wide border ${methodTone[method]}`}>{method}</span>
        <code className="font-mono text-sm text-white break-all">{path}</code>
        <span
          className={`ml-auto inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium border ${
            auth === 'public' ? 'border-white/10 text-slate-300' : 'border-violet/40 text-violet-200 bg-violet-soft'
          }`}
        >
          {auth === 'public' ? 'Public' : 'X-API-Key'}
        </span>
      </div>
      {children && <div className="space-y-4 text-sm text-slate-300">{children}</div>}
    </div>
  );
}
