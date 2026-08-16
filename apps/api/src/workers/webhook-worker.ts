import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { decryptWebhookSecret } from '../lib/webhook-crypto.js';
import { redisConnection } from '../lib/webhook-queue.js';
import {
  signPayload,
  WEBHOOK_RETRY_DELAYS_MS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_EVENT_HEADER,
} from '@qiflow/shared';
import { logger } from '../lib/logger.js';

let worker: Worker | null = null;

export function startWebhookWorker() {
  if (worker) return;

  worker = new Worker(
    'webhook-deliveries',
    async (job: Job) => {
      const { webhookId, paymentId, event, payload } = job.data;
      const attempt = job.attemptsMade + 1;

      // 1. Fetch webhook configuration
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        logger.info(`Webhook ${webhookId} not found or inactive. Skipping.`);
        return;
      }

      // 2. Decrypt secret
      const secret = decryptWebhookSecret(webhook.secret);

      // 3. Prepare payload and sign
      const rawBody = Buffer.from(JSON.stringify(payload));
      const signature = signPayload(rawBody, secret);
      const timestamp = Math.floor(Date.now() / 1000);

      // 4. Send POST request with 10s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let isSuccess = false;
      let errorMsg: string | null = null;

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [WEBHOOK_SIGNATURE_HEADER]: signature,
            [WEBHOOK_TIMESTAMP_HEADER]: timestamp.toString(),
            [WEBHOOK_EVENT_HEADER]: event,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        statusCode = response.status;
        isSuccess = response.status >= 200 && response.status < 300;

        const text = await response.text();
        responseBody = text.substring(0, 1024); // Truncate response to 1KB
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          errorMsg = 'Timeout: request took longer than 10 seconds';
        } else {
          errorMsg = err.message || String(err);
        }
        responseBody = errorMsg ? errorMsg.substring(0, 1024) : null;
      } finally {
        clearTimeout(timeoutId);
      }

      // 5. Determine status and retry timing
      let status: 'DELIVERED' | 'FAILED' | 'DEAD' = 'FAILED';
      let nextRetryAt: Date | null = null;
      let deliveredAt: Date | null = null;

      if (isSuccess) {
        status = 'DELIVERED';
        deliveredAt = new Date();
      } else if (attempt >= 5) {
        status = 'DEAD';
        logger.error(
          `Webhook delivery ${webhookId} failed on final attempt ${attempt}. Error: ${errorMsg || 'HTTP ' + statusCode}`
        );
      } else {
        status = 'FAILED';
        // Get retry delay for next attempt (which will be attempt + 1)
        const nextDelay = WEBHOOK_RETRY_DELAYS_MS[attempt] || 7_200_000;
        nextRetryAt = new Date(Date.now() + nextDelay);
      }

      // 6. Log attempt in DB
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          paymentId,
          event,
          payload,
          attempt,
          statusCode,
          responseBody,
          status,
          deliveredAt,
          nextRetryAt,
        },
      });

      // 7. If failed but not dead, throw error to trigger retry in BullMQ
      if (!isSuccess) {
        if (status === 'FAILED') {
          throw new Error(errorMsg || `Webhook request failed with status ${statusCode}`);
        }
      }
    },
    {
      connection: redisConnection,
      settings: {
        backoffStrategy(attemptsMade: number, type?: string) {
          if (type === 'webhookBackoff') {
            if (attemptsMade >= 5) {
              return -1;
            }
            return WEBHOOK_RETRY_DELAYS_MS[attemptsMade] || 7_200_000;
          }
          return -1;
        },
      },
    }
  );

  logger.info('BullMQ Webhook Worker started.');
}

export async function stopWebhookWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('BullMQ Webhook Worker stopped.');
  }
}
