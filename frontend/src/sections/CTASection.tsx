import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="relative py-28 px-6 max-w-5xl mx-auto overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-mint/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Gradient Border Card Wrapper */}
      <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-mint via-violet to-transparent shadow-card-lg">
        <div className="rounded-2xl bg-indigo/90 backdrop-blur-2xl p-10 sm:p-16 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Ready to accept Qi on Quai Network?
          </h2>
          <p className="text-[#A5A3B8] font-light text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Join forward-thinking merchants and developers building the next generation of decentralized commerce.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-mint text-ink font-bold text-base px-9 py-4 rounded-xl shadow-glow-mint hover:bg-[#26eed2] hover:scale-105 active:scale-95 transition-all"
            >
              Get Started Now — It&apos;s Free →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
