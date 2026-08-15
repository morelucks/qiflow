import type { Metadata } from 'next';

interface Props {
  params: { paymentCode: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { paymentCode } = params;
  return { title: `Pay — ${paymentCode}` };
}

export default async function CheckoutPage({ params }: Props) {
  const { paymentCode } = params;

  return (
    <div
      data-payment-code={paymentCode}
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Powered by</p>
          <p className="text-lg font-bold text-brand-600 dark:text-brand-400">QiFlow</p>
        </div>

        {/* Payment details — populated from GET /v1/payments/:code (issue #4) */}
        <div className="text-center space-y-2 mb-8">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Merchant Name
          </p>
          <p className="text-base text-gray-700 dark:text-gray-300">Payment description</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">— Qi</p>
        </div>

        {/* Status display */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full badge-pending">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
            Awaiting payment
          </span>
        </div>

        {/* Pay button — Pelagus wallet connection wired up in issue #6 */}
        <button
          type="button"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
          aria-label="Connect Pelagus wallet and pay"
        >
          Pay with Qi
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by{' '}
          <a href="/" className="hover:underline text-gray-500">
            qiflow.xyz
          </a>
        </p>
      </div>
    </div>
  );
}
