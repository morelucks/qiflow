import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { redisConnection } from '../lib/webhook-queue.js';
import { sendSignedWebhook } from '../lib/webhook-delivery.js';
import { WEBHOOK_RETRY_DELAYS_MS } from '@qiflow/shared';
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

      // 2-4. Sign and POST (shared with retries and test sends)
      const result = await sendSignedWebhook(webhook, event, payload);
      const statusCode = result.statusCode;
      const responseBody = result.responseBody;
      const isSuccess = result.ok;
      const errorMsg = result.error;
      if (!isSuccess) {
        logger.warn({ url: webhook.url, statusCode, error: errorMsg }, 'Webhook delivery attempt failed');
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
