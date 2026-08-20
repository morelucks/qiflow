import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

/** Brand button. Primary = mint on ink (matches landing CTAs). All variants keep a visible focus ring. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl whitespace-nowrap select-none ' +
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-ink ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none motion-safe:active:scale-[0.98]';

  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  const variants = {
    primary: 'bg-mint text-ink hover:bg-[#26eed2] shadow-[0_0_0_1px_rgba(0,230,168,0.25)] hover:shadow-glow-mint',
    secondary: 'bg-indigo text-white border border-violet/40 hover:bg-indigo-light hover:border-violet/70',
    outline: 'bg-transparent text-slate-200 border border-violet/30 hover:border-violet/60 hover:text-white',
    ghost: 'bg-transparent text-slate-300 hover:text-white hover:bg-violet-soft',
    danger: 'bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-500/40',
  };

  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full motion-safe:animate-spin"
          />
          <span>Working…</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 -ml-0.5" aria-hidden="true">{leftIcon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
