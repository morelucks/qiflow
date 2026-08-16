import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const webhookQueue = new Queue('webhook-deliveries', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'webhookBackoff',
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export interface WebhookJobData {
  webhookId: string;
  paymentId: string;
  event: string;
  payload: any;
}

/**
 * Enqueue webhook delivery jobs for all active webhook configurations of a merchant
 * that are registered to receive the specified event.
 */
export async function enqueueWebhookEvent(
  merchantId: string,
  paymentId: string,
  event: string,
  payload: any
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      merchantId,
      isActive: true,
      events: {
        has: event,
      },
    },
  });

  for (const webhook of webhooks) {
    await webhookQueue.add(
      'deliver',
      {
        webhookId: webhook.id,
        paymentId,
        event,
        payload,
      },
      {
        attempts: 5,
        backoff: {
          type: 'webhookBackoff',
        },
      }
    );
  }
}
