export interface Merchant {
  id: string;
  email: string;
  businessName?: string;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  merchantId: string;
  prefix: string; // e.g. "qf_live_aB3x" — display only, never the full key
  createdAt: string;
  revokedAt?: string;
}

export interface Webhook {
  id: string;
  merchantId: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
}

export type WebhookEvent =
  | 'payment.created'
  | 'payment.pending'
  | 'payment.processing'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.expired';

export interface WebhookPayload {
  event: WebhookEvent;
  paymentId: string;
  amount: string;
  currency: string;
  status: string;
  timestamp: string; // ISO 8601
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}
