import { Router } from 'express';
import { randomBytes, createHmac } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';
import type { Request, Response } from 'express';

const router = Router();

const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid HTTPS/HTTP URL'),
  events: z.array(z.string()).default(['payment.completed', 'payment.failed']),
});

router.use(requireAuthOrApiKey);

// ── POST / (Register webhook endpoint) ──────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const input = createWebhookSchema.parse(req.body);

    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const webhook = await prisma.webhook.create({
      data: {
        merchantId,
        url: input.url,
        secret,
        events: input.events,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook endpoint data', details: err.errors },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook endpoint' },
    });
  }
});

// ── GET / (List registered webhooks) ────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;

    const webhooks = await prisma.webhook.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        secretPrefix: `${w.secret.slice(0, 10)}...`,
        events: w.events,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhooks' },
    });
  }
});

// ── DELETE /:id (Revoke webhook endpoint) ────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

    const webhook = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' },
      });
      return;
    }

    await prisma.webhook.delete({ where: { id: webhook.id } });

    res.json({
      success: true,
      data: { message: 'Webhook endpoint deleted successfully' },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook endpoint' },
    });
  }
});

// ── GET /deliveries (List delivery logs) ─────────────────────────────────────
router.get('/deliveries', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

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

    res.json({
      success: true,
      data: deliveries.map((d) => ({
        id: d.id,
        url: d.webhook.url,
        paymentCode: d.payment.paymentCode,
        event: d.event,
        status: d.status,
        statusCode: d.statusCode,
        attempt: d.attempt,
        deliveredAt: d.deliveredAt,
        createdAt: d.createdAt,
      })),
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch webhook deliveries' },
    });
  }
});

// ── POST /deliveries/:id/retry (Retry webhook dispatch) ─────────────────────
router.post('/deliveries/:id/retry', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

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
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook delivery log not found' },
      });
      return;
    }

    const payloadString = JSON.stringify(delivery.payload);
    const signature = createHmac('sha256', delivery.webhook.secret).update(payloadString).digest('hex');

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

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        statusCode: updated.statusCode,
        attempt: updated.attempt,
        deliveredAt: updated.deliveredAt,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retry webhook dispatch' },
    });
  }
});

export default router;
