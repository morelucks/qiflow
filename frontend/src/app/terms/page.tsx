import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <nav className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand-600 dark:text-brand-400">
          QiFlow
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/auth/register" className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16 flex-1">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last Updated: August 19, 2026</p>

        <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using QiFlow (&quot;the Service&quot;), you agree to be bound by these Terms of Service. QiFlow provides payment gateway and link creation infrastructure on the Quai Network.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Merchant Responsibilities</h2>
            <p>
              Merchants are responsible for maintaining the confidentiality of their account credentials and API keys. Any activities conducted using a merchant&apos;s API key or account are the sole responsibility of the account holder.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Blockchain Transactions & Fees</h2>
            <p>
              QiFlow facilitates payment settlement via smart contracts on the Quai Network. Transactions submitted to the Quai Network are immutable and non-reversible. Platform fees are governed by the contract configuration (up to a max fee cap of 10%).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Prohibited Uses</h2>
            <p>
              You agree not to use QiFlow for illegal goods, fraudulent operations, money laundering, or activities that violate applicable financial regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Limitation of Liability</h2>
            <p>
              QiFlow is provided &quot;as is&quot; without warranties of any kind. Under no circumstances shall QiFlow be liable for lost funds, network disruptions, or third-party wallet failures.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-gray-200 dark:border-gray-800 px-6 py-8 text-center text-sm text-gray-400 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto w-full">
        <span>© {new Date().getFullYear()} QiFlow. MIT License.</span>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}
