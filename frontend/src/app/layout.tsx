import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'QiFlow — Payment Gateway for Quai',
    template: '%s | QiFlow',
  },
  description:
    'Accept Qi payments instantly. Create payment links, integrate via API, and get notified via webhooks. The simplest way to accept Qi.',
  openGraph: {
    title: 'QiFlow — Payment Gateway for Quai',
    description: 'Integrate once. Accept Qi everywhere.',
    siteName: 'QiFlow',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
