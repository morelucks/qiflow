import { createHmac } from 'crypto';
import { WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS } from '../constants/index.js';
import { timingSafeEqual } from './index.js';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Sign the raw request body bytes with HMAC-SHA256.
 * Always sign raw bytes — never re-serialize JSON (key order can change).
 *
 * @returns Header value, e.g. "sha256=<hex_digest>"
 */
export function signPayload(rawBody: Buffer, secret: string): string {
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  return `${SIGNATURE_PREFIX}${digest}`;
}

/**
 * Verify an incoming webhook signature using timing-safe comparison.
 * Merchants should use this pattern — never compare with ===.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  secret: string,
  signatureHeader: string
): boolean {
  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const received = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

/**
 * Reject replayed webhook requests older than the configured window (default 5 minutes).
 */
export function isWebhookTimestampValid(
  timestampSeconds: number,
  maxAgeSeconds: number = WEBHOOK_TIMESTAMP_MAX_AGE_SECONDS
): boolean {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timestampSeconds) <= maxAgeSeconds;
}
