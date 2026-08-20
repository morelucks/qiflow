'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative bg-ink pt-16 pb-12 border-t border-violet/20 overflow-hidden">
      {/* Top Gradient Accent Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-violet to-transparent opacity-80" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-6">
          {/* Logo Left */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-violet flex items-center justify-center shadow-glow-violet bg-indigo/60">
              <svg className="w-3.5 h-3.5 text-mint" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12,4 22,20 2,20" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Qi<span className="text-mint">Flow</span>
            </span>
          </div>

          {/* Links Center */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#features" className="hover:text-mint transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-mint transition-colors">
              How It Works
            </Link>
            <Link href="/terms" className="hover:text-mint transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-mint transition-colors">
              Privacy Policy
            </Link>
            <a
              href="https://github.com/morelucks/qiflow"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-mint transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Copyright Right with Dynamic Year */}
          <div className="text-xs text-slate-400 font-medium">
            © <span suppressHydrationWarning>{currentYear}</span> QiFlow Protocol. Built for Quai Network.
          </div>
        </div>
      </div>
    </footer>
  );
}
