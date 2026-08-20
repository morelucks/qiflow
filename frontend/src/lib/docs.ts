/** Shared constants for the merchant docs. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface DocsSection {
  href: string;
  title: string;
  description: string;
}

export const DOCS_SECTIONS: DocsSection[] = [
  { href: '/docs', title: 'Quickstart', description: 'Accept your first payment in five steps.' },
  { href: '/docs/authentication', title: 'Authentication', description: 'API keys and the X-API-Key header.' },
  { href: '/docs/payments', title: 'Payments', description: 'Create and track one-time payments.' },
  { href: '/docs/payment-links', title: 'Payment links', description: 'Reusable links for products and tips.' },
  { href: '/docs/checkout', title: 'Hosted checkout', description: 'What your customer sees, and how it confirms.' },
  { href: '/docs/webhooks', title: 'Webhooks', description: 'Signed events when payments complete or fail.' },
  { href: '/docs/errors', title: 'Errors & limits', description: 'Error envelope, codes, rate limits.' },
];
