import React, { useId } from 'react';

const fieldBase =
  'w-full h-10 px-3.5 rounded-xl bg-ink/60 border text-sm text-white placeholder:text-slate-500 ' +
  'transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-mint/60 focus:border-mint/60 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

interface FieldShellProps {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  id: string;
  children: React.ReactNode;
  className?: string;
}

function FieldShell({ label, hint, error, required, id, children, className = '' }: FieldShellProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-200">
          {label}
          {required && <span className="text-mint ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  mono?: boolean;
  containerClassName?: string;
}

export function Input({ label, hint, error, mono, id, required, className = '', containerClassName, ...props }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={fieldId} className={containerClassName}>
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={`${fieldBase} ${error ? 'border-rose-500/60' : 'border-violet/30'} ${mono ? 'font-mono' : ''} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export function Select({ label, hint, error, id, required, className = '', containerClassName, children, ...props }: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={fieldId} className={containerClassName}>
      <select
        id={fieldId}
        required={required}
        className={`${fieldBase} ${error ? 'border-rose-500/60' : 'border-violet/30'} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export function Textarea({ label, hint, error, id, required, className = '', containerClassName, ...props }: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={fieldId} className={containerClassName}>
      <textarea
        id={fieldId}
        required={required}
        className={`${fieldBase} h-auto py-2.5 ${error ? 'border-rose-500/60' : 'border-violet/30'} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}
