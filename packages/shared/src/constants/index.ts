// Payment defaults
export const PAYMENT_EXPIRY_DEFAULT_SECONDS = 1800; // 30 minutes
export const PAYMENT_EXPIRY_MAX_SECONDS = 86_400; // 24 hours
export const PAYMENT_CODE_PREFIX = 'pay_';
export const PAYMENT_AMOUNT_MAX = '1000000'; // 1M Qi

// API key format
export const API_KEY_PREFIX = 'qf_live_';
export const API_KEY_DISPLAY_LENGTH = 16; // chars shown after generation (prefix only)

// Blockchain
export const CONFIRMATION_THRESHOLD_DEFAULT = 5;
export const QUAI_TESTNET_RPC = 'https://rpc.sandbox.quai.network';
export const QUAI_MAINNET_RPC = 'https://rpc.quai.network';

// Webhook retry schedule (delays in ms between attempts)
export const WEBHOOK_RETRY_DELAYS_MS = [
  0,          // attempt 1 — immediate
  60_000,     // attempt 2 — 1 minute
  300_000,    // attempt 3 — 5 minutes
  1_800_000,  // attempt 4 — 30 minutes
  7_200_000,  // attempt 5 — 2 hours
] as const;

export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000; // 10 seconds
export const WEBHOOK_MAX_ATTEMPTS = 5;
export const WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS = 300; // 5 minutes — replay protection

// Outgoing webhook request headers
export const WEBHOOK_SIGNATURE_HEADER = 'X-QiFlow-Signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'X-QiFlow-Timestamp';
export const WEBHOOK_EVENT_HEADER = 'X-QiFlow-Event';

// Auth
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';
export const BCRYPT_ROUNDS = 12;

// Rate limiting
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const AUTH_RATE_LIMIT_MAX = 10;

// Supported currencies
export const SUPPORTED_CURRENCIES = ['QI', 'QUAI'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
