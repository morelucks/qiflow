import { encryptWebhookSecret } from '../lib/webhook-crypto.js';
import { sendSignedWebhook } from '../lib/webhook-delivery.js';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { CreateWebhookInput } from '../schemas/webhooks.schema.js';
import { createError } from '../middleware/errorHandler.js';

export class WebhooksService {
  static async createWebhook(merchantId: string, input: CreateWebhookInput) {
    const rawSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const webhook = await prisma.webhook.create({
      data: {
        merchantId,
        url: input.url,
        secret: encryptWebhookSecret(rawSecret),
        events: input.events,
        isActive: true,
      },
    });
    return {
      id: webhook.id,
      url: webhook.url,
      secret: rawSecret,
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

  static async updateWebhook(
    merchantId: string,
    id: string,
  ) {
    const webhook = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });
    if (!webhook) {
      throw createError('Webhook endpoint not found', 404, 'NOT_FOUND');
    }
    const rawSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const updated = await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        secret: encryptWebhookSecret(rawSecret),
      },
    });

    return {
      id: updated.id,
      url: updated.url,
      secret: rawSecret,
      events: updated.events,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
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

    const result = await sendSignedWebhook(
      delivery.webhook,
      delivery.event,
      delivery.payload as Record<string, unknown>,
    );
    const status: 'DELIVERED' | 'FAILED' = result.ok ? 'DELIVERED' : 'FAILED';
    const statusCode = result.statusCode ?? 0;
    const responseBody = result.responseBody ?? '';

    const updated = await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempt: delivery.attempt + 1,
        status,
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        deliveredAt: result.ok ? result.sentAt : null,
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

  /**
   * Send a signed `webhook.test` event to the endpoint right now and report the result.
   * Lets merchants confirm reachability and signature verification before going live.
   */
  static async testWebhook(merchantId: string, id: string) {
    const webhook = await prisma.webhook.findFirst({ where: { id, merchantId } });
    if (!webhook) {
      throw createError('Webhook endpoint not found', 404, 'NOT_FOUND');
    }

    const payload = {
      event: 'webhook.test',
      test: true,
      webhookId: webhook.id,
      sentAt: new Date().toISOString(),
      payment: {
        id: '00000000-0000-0000-0000-000000000000',
        paymentCode: 'pay_test_000000000000',
        amount: '1.00000000',
        currency: 'QI',
        status: 'COMPLETED',
        txHash: `0x${'0'.repeat(64)}`,
      },
    };

    const result = await sendSignedWebhook(webhook, 'webhook.test', payload);

    return {
      webhookId: webhook.id,
      url: webhook.url,
      event: 'webhook.test',
      ok: result.ok,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      responseBody: result.responseBody,
      error: result.error,
      sentAt: result.sentAt,
    };
  }
}
