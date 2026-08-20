import Link from 'next/link';
import CodeWindow from '../components/CodeWindow';

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-violet/25 rounded-full blur-[120px] pointer-events-none animate-drift" />
      <div className="absolute top-1/3 left-1/3 w-[450px] h-[450px] bg-mint/20 rounded-full blur-[120px] pointer-events-none animate-drift-reverse" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo/90 border border-violet/40 shadow-card backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-mint pulse-dot" />
          <span className="text-xs font-semibold text-white tracking-wide uppercase">
            Built on Quai Network
          </span>
        </div>

        {/* H1 Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
          The payment gateway for{' '}
          <span className="bg-gradient-to-r from-mint via-[#60ffe0] to-[#80ffdb] bg-clip-text text-transparent drop-shadow">
            Qi
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
          Accept instant Qi payments, generate hosted checkout links, and integrate programmable webhooks on Quai Network.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto bg-mint text-ink font-bold text-base px-8 py-4 rounded-xl shadow-glow-mint hover:bg-[#26eed2] hover:scale-105 active:scale-95 transition-all"
          >
            Start Accepting Qi →
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto bg-indigo/80 border border-violet/40 text-white font-medium text-base px-8 py-4 rounded-xl hover:bg-indigo-light hover:border-violet/60 transition-all backdrop-blur-md"
          >
            See How It Works
          </a>
        </div>

        {/* Code Window Container */}
        <div className="pt-10">
          <CodeWindow />
        </div>
      </div>
    </section>
  );
}
