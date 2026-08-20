export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Payment {
  id: string;
  paymentCode: string;
  amount: string;
  currency: string;
  description: string | null;
  status: PaymentStatus;
  receivingAddress: string;
  txHash: string | null;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
  merchantName?: string;
  checkoutUrl?: string;
}

export interface PaymentLink {
  id: string;
  merchantId: string;
  linkCode: string;
  name: string;
  amount: string | null;
  currency: string;
  description: string | null;
  fixedAmount: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  uses?: number;
  url?: string;
  merchantName?: string;
  receivingAddress?: string;
}

export interface Webhook {
  id: string;
  url: string;
  secretPrefix: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  url: string;
  paymentCode: string;
  event: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD';
  statusCode: number | null;
  attempt: number;
  deliveredAt: string | null;
  createdAt: string;
}

export interface MerchantProfile {
  id: string;
  email: string | null;
  businessName: string;
  walletAddress: string | null;
  createdAt: string;
  apiKeys?: ApiKey[];
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  /** Only present in the create response — shown once. */
  rawKey?: string;
}

export interface WebhookTestResult {
  webhookId: string;
  url: string;
  event: string;
  ok: boolean;
  statusCode: number | null;
  durationMs: number;
  responseBody: string | null;
  error: string | null;
  sentAt: string;
}
