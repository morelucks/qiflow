import { randomBytes, createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';
import { PAYMENT_CODE_PREFIX } from '../constants/index.js';
import { PAYMENT_TRANSITIONS, TERMINAL_PAYMENT_STATUSES } from '../types/payment.js';
import type { PaymentStatus } from '../types/payment.js';

/**
 * Generate a short, URL-safe payment code.
 * Format: pay_<6 alphanumeric chars>  e.g. "pay_82hd91"
 */
export function generatePaymentCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes)
    .map((b) => chars[b % chars.length] as string)
    .join('');
  return `${PAYMENT_CODE_PREFIX}${suffix}`;
}

/**
 * Returns true if the given status transition is valid.
 */
export function isValidStatusTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

/**
 * Returns true if the payment is in a terminal state (no further transitions).
 */
export function isTerminalStatus(status: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.has(status);
}

/**
 * Format a Qi amount for display (e.g. "1000" → "1,000 Qi").
 */
export function formatQiAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} Qi`;
  return `${num.toLocaleString('en-US')} Qi`;
}

/**
 * Returns true if a payment link is outside its valid window.
 */
export function isPaymentExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Compute SHA-256 hash of a string (for API key storage).
 * Raw API keys are never stored — only this hash.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Timing-safe comparison of two strings.
 * Use this instead of === when comparing secrets (prevents timing attacks).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return cryptoTimingSafeEqual(Buffer.from(a), Buffer.from(b));
}
