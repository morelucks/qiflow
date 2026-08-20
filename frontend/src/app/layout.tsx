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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-[#F0F0F5] antialiased selection:bg-mint-soft selection:text-mint">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
