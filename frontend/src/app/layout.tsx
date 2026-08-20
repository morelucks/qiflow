import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'QiFlow — Payment Gateway for Quai',
    template: '%s | QiFlow',
  },
  description:
    'Accept Qi payments instantly on Quai Network. Create payment links, integrate via REST API, and receive HMAC-signed webhooks.',
  openGraph: {
    title: 'QiFlow — Payment Gateway for Quai',
    description: 'Integrate once. Accept Qi everywhere.',
    siteName: 'QiFlow',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-ink text-white antialiased selection:bg-mint-soft selection:text-mint">
        {children}
      </body>
    </html>
  );
}
