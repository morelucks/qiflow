export default function TrustBar() {
  const stats = [
    { value: '< 100ms', label: 'Average Settlement Time' },
    { value: '99.99%', label: 'Infrastructure Uptime' },
    { value: '$0.00', label: 'Protocol Platform Fees' },
  ];

  return (
    <section id="trust-bar" className="relative bg-indigo/30 backdrop-blur-md py-14 overflow-hidden">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-mint to-violet opacity-40" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold text-[#6B6885] uppercase tracking-widest">
            Built for speed &amp; performance on Quai
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-violet/15">
          {stats.map((stat) => (
            <div key={stat.label} className="pt-6 md:pt-0 px-4">
              <div className="text-4xl sm:text-5xl font-extrabold text-mint tracking-tight mb-2 drop-shadow-sm font-sans">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-[#A5A3B8]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Gradient Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet via-mint to-transparent opacity-40" />
    </section>
  );
}
