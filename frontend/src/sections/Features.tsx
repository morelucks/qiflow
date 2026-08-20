import FeatureCard from '../components/FeatureCard';

export default function Features() {
  const featuresList = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      title: 'Hosted Payment Links',
      description: 'Generate shareable checkout links in seconds. Send via messaging apps, email, or post directly on social media.',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: 'Developer REST API',
      description: 'Simple API key authentication. Issue payment sessions programmatically with minimal integration overhead.',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      title: 'HMAC Webhooks',
      description: 'Get notified instantly when a payment settles. Signed payloads ensure cryptographic authenticity.',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Quai Native Escrow',
      description: 'Built directly on top of Quai Network smart contract router for trustless, non-custodial transaction settlement.',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'QI & QUAI Support',
      description: 'Accept both Qi energy tokens and QUAI native assets effortlessly with auto-calculated exchange rates.',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Merchant Analytics',
      description: 'Comprehensive dashboard featuring real-time transaction logs, volume tracking, and webhook delivery retries.',
    },
  ];

  return (
    <section id="features" className="relative py-28 px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
        <h2 className="text-xs font-semibold text-mint uppercase tracking-widest">
          Protocol Infrastructure
        </h2>
        <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
          Integrate once. Accept Qi everywhere.
        </p>
        <p className="text-[#A5A3B8] font-light text-base sm:text-lg leading-relaxed">
          Everything you need to accept crypto payments on Quai Network without managing smart contracts or complex blockchain indexers.
        </p>
      </div>

      {/* 3-Column Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuresList.map((f) => (
          <FeatureCard
            key={f.title}
            icon={f.icon}
            title={f.title}
            description={f.description}
          />
        ))}
      </div>
    </section>
  );
}
