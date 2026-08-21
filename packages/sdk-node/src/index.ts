/**
 * QiFlow Node.js SDK — https://qiflow.io/docs/sdks
 * Zero dependencies; uses the global fetch (Node 18+).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Currency = 'QI' | 'QUAI';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface Payment {
  id: string;
  paymentCode: string;
  amount: string;
  currency: Currency | string;
  description: string | null;
  status: PaymentStatus;
  receivingAddress: string;
  txHash: string | null;
  checkoutUrl: string;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface CreatePaymentParams {
  amount: number;
  currency?: Currency;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsParams {
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentLink {
  id: string;
  linkCode: string;
  name: string;
  amount: string | null;
  currency: string;
  description: string | null;
  fixedAmount: boolean;
  isActive: boolean;
  uses?: number;
  url: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePaymentLinkParams {
  name: string;
  amount?: number | string;
  currency?: Currency;
  description?: string;
  fixedAmount?: boolean;
  isActive?: boolean;
}

export type UpdatePaymentLinkParams = Partial<CreatePaymentLinkParams> & { amount?: number | string | null };

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  /** Only on create / rotate. */
  secret?: string;
  secretPrefix?: string;
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

export interface WebhookTestResult {
  webhookId: string;
  url: string;
  event: string;
  ok: boolean;
  statusCode: number | null;
  durationMs: number;
  responseBody: string | null;
  error: string | null;
}

export interface WebhookEvent {
  event: 'payment.completed' | 'payment.failed' | 'webhook.test' | string;
  payment: {
    id: string;
    paymentCode: string;
    amount: string;
    currency: string;
    status: PaymentStatus | string;
    txHash: string | null;
    receivingAddress?: string;
    completedAt: string | null;
  };
  [key: string]: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: { code?: string; message: string; details?: Record<string, string[]> };
}

export class QiFlowError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'QiFlowError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface QiFlowOptions {
  /** Secret API key from Dashboard → Settings → API keys (qiflow_live_…). */
  apiKey: string;
  /** API base URL. Defaults to https://api.qiflow.io */
  baseUrl?: string;
  /** Custom fetch (tests, polyfills). */
  fetch?: typeof fetch;
  /** Request timeout in ms (default 15000). */
  timeoutMs?: number;
}

// ── Webhook signature verification (standalone; mirrors the server) ──────────

const SIGNATURE_PREFIX = 'sha256=';

export interface VerifySignatureParams {
  /** Raw request body bytes exactly as received. */
  rawBody: Buffer | string;
  /** Endpoint signing secret (whsec_…). */
  secret: string;
  /** Value of the X-QiFlow-Signature header. */
  signature: string | null | undefined;
  /** Value of the X-QiFlow-Timestamp header (unix seconds). Pass to enforce freshness. */
  timestamp?: string | number | null;
  /** Max age in seconds (default 300). */
  toleranceSeconds?: number;
  /** For tests. */
  now?: number;
}

export function verifySignature(params: VerifySignatureParams): boolean {
  const { rawBody, secret, signature, timestamp, toleranceSeconds = 300, now = Math.floor(Date.now() / 1000) } = params;
  if (!signature || !signature.startsWith(SIGNATURE_PREFIX)) return false;
  if (timestamp !== undefined && timestamp !== null) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || ts <= 0 || Math.abs(now - ts) > toleranceSeconds) return false;
  }
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const received = signature.slice(SIGNATURE_PREFIX.length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

/** Verify and parse a webhook request; throws QiFlowError(401) when invalid. */
export function constructEvent(params: VerifySignatureParams): WebhookEvent {
  if (!verifySignature(params)) {
    throw new QiFlowError(401, 'INVALID_SIGNATURE', 'Webhook signature or timestamp is invalid');
  }
  const text = typeof params.rawBody === 'string' ? params.rawBody : params.rawBody.toString('utf8');
  return JSON.parse(text) as WebhookEvent;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class QiFlow {
  static readonly webhooks = { verifySignature, constructEvent };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: QiFlowOptions) {
    if (!options?.apiKey) throw new Error('QiFlow: apiKey is required');
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.qiflow.io').replace(/\/+$/, '');
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    if (!this.fetchImpl) throw new Error('QiFlow: global fetch not available (Node 18+ required) — pass options.fetch');
  }

  /** Low-level request; returns the full envelope. */
  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<ApiEnvelope<T>> {
    const url = new URL(this.baseUrl + path);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': '@qiflow/sdk/0.1.0 node',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }
    let json: ApiEnvelope<T>;
    try {
      json = (await res.json()) as ApiEnvelope<T>;
    } catch {
      throw new QiFlowError(res.status, 'BAD_RESPONSE', `Non-JSON response (HTTP ${res.status})`);
    }
    if (!res.ok || json.success === false) {
      throw new QiFlowError(res.status, json.error?.code ?? 'REQUEST_FAILED', json.error?.message ?? `HTTP ${res.status}`, json.error?.details);
    }
    return json;
  }

  private async data<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    return (await this.request<T>(method, path, body, query)).data as T;
  }

  readonly payments = {
    create: (params: CreatePaymentParams) => this.data<Payment>('POST', '/v1/payments', params),
    retrieve: (idOrCode: string) => this.data<Payment>('GET', `/v1/payments/${encodeURIComponent(idOrCode)}`),
    list: async (params: ListPaymentsParams = {}) => {
      const env = await this.request<Payment[]>('GET', '/v1/payments', undefined, params as Record<string, string | number | undefined>);
      return { data: env.data ?? [], pagination: env.pagination };
    },
  };

  readonly paymentLinks = {
    create: (params: CreatePaymentLinkParams) => this.data<PaymentLink>('POST', '/v1/payment-links', params),
    retrieve: (id: string) => this.data<PaymentLink>('GET', `/v1/payment-links/${encodeURIComponent(id)}`),
    update: (id: string, params: UpdatePaymentLinkParams) => this.data<PaymentLink>('PUT', `/v1/payment-links/${encodeURIComponent(id)}`, params),
    deactivate: (id: string) => this.data<{ message?: string }>('DELETE', `/v1/payment-links/${encodeURIComponent(id)}`),
    list: async (params: { page?: number; limit?: number } = {}) => {
      const env = await this.request<PaymentLink[]>('GET', '/v1/payment-links', undefined, params);
      return { data: env.data ?? [], pagination: env.pagination };
    },
  };

  readonly webhookEndpoints = {
    create: (params: { url: string; events?: string[] }) => this.data<Webhook>('POST', '/v1/webhooks', params),
    list: () => this.data<Webhook[]>('GET', '/v1/webhooks'),
    rotateSecret: (id: string) => this.data<Webhook>('PUT', `/v1/webhooks/${encodeURIComponent(id)}`),
    delete: (id: string) => this.data<{ message?: string }>('DELETE', `/v1/webhooks/${encodeURIComponent(id)}`),
    test: (id: string) => this.data<WebhookTestResult>('POST', `/v1/webhooks/${encodeURIComponent(id)}/test`),
    deliveries: (params: { limit?: number } = {}) => this.data<WebhookDelivery[]>('GET', '/v1/webhooks/deliveries', undefined, params),
    retryDelivery: (deliveryId: string) => this.data<WebhookDelivery>('POST', `/v1/webhooks/deliveries/${encodeURIComponent(deliveryId)}/retry`),
  };
}

export default QiFlow;
