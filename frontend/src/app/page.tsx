import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-600 dark:text-brand-400">QiFlow</span>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm px-4 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          Built on Quai Network
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white max-w-3xl leading-tight">
          The payment gateway<br />for{' '}
          <span className="text-brand-600 dark:text-brand-400">Qi</span>
        </h1>

        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-xl">
          Accept Qi payments with a simple API and shareable payment links.
          No blockchain knowledge required.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Link
            href="/auth/register"
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Start accepting Qi →
          </Link>
          <Link
            href="#how-it-works"
            className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 font-medium px-8 py-3 rounded-lg transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section id="how-it-works" className="px-6 py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Integrate once. Accept Qi everywhere.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🔗',
                title: 'Payment Links',
                desc: 'Generate a checkout URL in seconds. Share via WhatsApp, X, email, or anywhere.',
              },
              {
                icon: '⚡',
                title: 'Developer API',
                desc: 'POST /v1/payments and get a checkout URL back. Straightforward REST API.',
              },
              {
                icon: '🔔',
                title: 'Webhooks',
                desc: 'Get notified the moment a payment completes. HMAC-signed for security.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 px-6 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} QiFlow. MIT License.
      </footer>
    </main>
  );
}
