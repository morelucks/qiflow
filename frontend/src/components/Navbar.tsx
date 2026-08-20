'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-ink/80 backdrop-blur-2xl border-b border-violet/10 shadow-lg py-3.5'
          : 'bg-ink/40 backdrop-blur-xl border-b border-violet/5 py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border-2 border-violet flex items-center justify-center shadow-glow-violet group-hover:scale-105 transition-transform bg-indigo/40">
            {/* Mint Upward Triangle Arrow */}
            <svg
              className="w-4 h-4 text-mint transform group-hover:-translate-y-0.5 transition-transform"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="12,4 22,20 2,20" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">
            Qi<span className="text-mint">Flow</span>
          </span>
        </Link>

        {/* Navigation Links (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A5A3B8]">
          <Link href="#features" className="nav-link hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="nav-link hover:text-white transition-colors">
            How It Works
          </Link>
          <Link href="#trust-bar" className="nav-link hover:text-white transition-colors">
            Network Stats
          </Link>
          <Link href="/auth/login" className="nav-link hover:text-white transition-colors">
            Log in
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="md:hidden text-sm text-[#A5A3B8] hover:text-white font-medium transition-colors px-2 py-1"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="bg-mint text-ink font-semibold text-sm px-5 py-2.5 rounded-xl shadow-glow-mint hover:bg-[#26eed2] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
