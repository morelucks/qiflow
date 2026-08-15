// Payment status lifecycle:
// CREATED → PENDING → PROCESSING → COMPLETED
//                   ↘ FAILED
// PENDING → CANCELLED (merchant-initiated)
// PENDING → EXPIRED   (cron: expiresAt passed)
export enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/** Terminal states — no further transitions allowed */
export const TERMINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.COMPLETED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.EXPIRED,
]);

/** Valid state transitions map */
export const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, PaymentStatus[]>> = {
  [PaymentStatus.CREATED]: [PaymentStatus.PENDING, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED],
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
  [PaymentStatus.COMPLETED]: [],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.EXPIRED]: [],
};

export type Currency = 'QI' | 'QUAI';

export interface Payment {
  id: string;
  paymentCode: string;
  merchantId: string;
  amount: string;
  currency: Currency;
  description?: string;
  status: PaymentStatus;
  receivingAddress: string;
  txHash?: string;
  checkoutUrl: string;
  expiresAt: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreatePaymentInput {
  amount: string;
  currency?: Currency;
  description?: string;
  /** Expiry in seconds. Default: 1800 (30 min). Max: 86400 (24 hours). */
  expiresIn?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
