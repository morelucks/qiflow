import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { CreateWebhookInput } from '../schemas/webhooks.schema.js';
import { createError } from '../middleware/errorHandler.js';

export class WebhooksService {
  static async createWebhook(merchantId: string, input: CreateWebhookInput) {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = await prisma.webhook.create({
      data: {
        merchantId,
        url: input.url,
        secret,
        events: input.events,
        isActive: true,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  static async listWebhooks(merchantId: string) {
    const webhooks = await prisma.webhook.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      secretPrefix: `${w.secret.slice(0, 10)}...`,
      events: w.events,
      isActive: w.isActive,
      createdAt: w.createdAt,
    }));
  }

  static async deleteWebhook(merchantId: string, id: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });

    if (!webhook) {
      throw createError('Webhook endpoint not found', 404, 'NOT_FOUND');
    }

    await prisma.webhook.delete({ where: { id: webhook.id } });

    return { message: 'Webhook endpoint deleted successfully' };
  }

  static async listDeliveries(merchantId: string, limit: number) {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        webhook: {
          merchantId,
        },
      },
      include: {
        webhook: {
          select: { url: true },
        },
        payment: {
          select: { paymentCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return deliveries.map((d) => ({
      id: d.id,
      url: d.webhook.url,
      paymentCode: d.payment.paymentCode,
      event: d.event,
      status: d.status,
      statusCode: d.statusCode,
      attempt: d.attempt,
      deliveredAt: d.deliveredAt,
      createdAt: d.createdAt,
    }));
  }

  static async retryDelivery(merchantId: string, id: string) {
    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        id,
        webhook: { merchantId },
      },
      include: {
        webhook: true,
      },
    });

    if (!delivery) {
      throw createError('Webhook delivery log not found', 404, 'NOT_FOUND');
    }

    const payloadString = JSON.stringify(delivery.payload);
    const signature = crypto.createHmac('sha256', delivery.webhook.secret).update(payloadString).digest('hex');

    let statusCode = 200;
    let responseBody = JSON.stringify({ message: 'Simulated delivery success' });
    let status: 'DELIVERED' | 'FAILED' = 'DELIVERED';

    try {
      const response = await fetch(delivery.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-QiFlow-Signature': signature,
          'X-QiFlow-Event': delivery.event,
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000),
      });
      statusCode = response.status;
      responseBody = await response.text();
      status = response.ok ? 'DELIVERED' : 'FAILED';
    } catch (fetchErr: unknown) {
      status = 'FAILED';
      statusCode = 500;
      responseBody = fetchErr instanceof Error ? fetchErr.message : 'Fetch failed';
    }

    const updated = await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempt: delivery.attempt + 1,
        status,
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        deliveredAt: new Date(),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      statusCode: updated.statusCode,
      attempt: updated.attempt,
      deliveredAt: updated.deliveredAt,
    };
  }
}
