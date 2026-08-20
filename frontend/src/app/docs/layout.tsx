import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DocsNav } from '@/components/docs/DocsNav';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'QiFlow merchant documentation — accept Qi and QUAI payments with hosted checkout, payment links and signed webhooks.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-white">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none fixed -top-40 right-[-10%] w-[520px] h-[520px] rounded-full bg-violet/15 blur-[140px]" />
      <main className="relative max-w-7xl mx-auto px-6 pt-28 sm:pt-32 pb-24">
        <div className="lg:flex lg:gap-12">
          <DocsNav />
          <div className="min-w-0 flex-1 max-w-3xl">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
