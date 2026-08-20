import type { Webhook } from '@prisma/client';
import {
  signPayload,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_DELIVERY_TIMEOUT_MS,
} from '@qiflow/shared';
import { decryptWebhookSecret } from './webhook-crypto.js';

export interface DeliveryAttemptResult {
  ok: boolean;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number;
  sentAt: Date;
}

/**
 * Sign and POST one webhook event to the endpoint. Shared by the queue worker,
 * manual retries, and the "send test event" action so every path signs identically.
 */
export async function sendSignedWebhook(
  webhook: Pick<Webhook, 'url' | 'secret'>,
  event: string,
  payload: Record<string, unknown>,
  timeoutMs: number = WEBHOOK_DELIVERY_TIMEOUT_MS,
): Promise<DeliveryAttemptResult> {
  const secret = decryptWebhookSecret(webhook.secret);
  const body = JSON.stringify(payload);
  const signature = signPayload(Buffer.from(body), secret);
  const timestamp = Math.floor(Date.now() / 1000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QiFlow-Webhooks/1.0',
        [WEBHOOK_SIGNATURE_HEADER]: signature,
        [WEBHOOK_TIMESTAMP_HEADER]: timestamp.toString(),
        [WEBHOOK_EVENT_HEADER]: event,
      },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      responseBody: text.substring(0, 1024),
      error: null,
      durationMs: Date.now() - started,
      sentAt: new Date(),
    };
  } catch (err: unknown) {
    let message: string;
    if (err instanceof Error) {
      message =
        err.name === 'AbortError' || err.message.includes('aborted')
          ? `Timeout: endpoint did not respond within ${Math.round(timeoutMs / 1000)}s`
          : err.message;
    } else {
      message = String(err);
    }
    return {
      ok: false,
      statusCode: null,
      responseBody: message.substring(0, 1024),
      error: message,
      durationMs: Date.now() - started,
      sentAt: new Date(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
