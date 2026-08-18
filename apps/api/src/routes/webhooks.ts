import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';
import {
  generateWebhookSecret,
  encryptWebhookSecret,
  decryptWebhookSecret,
} from '../lib/webhook-crypto.js';
import { createWebhookSchema, updateWebhookSchema } from '../schemas/webhook.js';
import {
  signPayload,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_EVENT_HEADER,
} from '@qiflow/shared';

const router = Router();

// All webhook endpoints require authentication (JWT or API key)
router.use(requireAuthOrApiKey);

// ── POST / (Register Webhook) ─────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const input = createWebhookSchema.parse(req.body);

    const rawSecret = generateWebhookSecret();
    const encryptedSecret = encryptWebhookSecret(rawSecret);

    const webhook = await prisma.webhook.create({
      data: {
        merchantId,
        url: input.url,
        events: input.events,
        secret: encryptedSecret,
        isActive: input.isActive,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        secret: rawSecret,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET / (List Webhooks) ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;

    const webhooks = await prisma.webhook.findMany({
      where: { merchantId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id (Rotate Secret & Update Webhook) ─────────────────────────────────
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;
    const input = updateWebhookSchema.parse(req.body);

    const existing = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Webhook endpoint not found',
        },
      });
      return;
    }

    const rawSecret = generateWebhookSecret();
    const encryptedSecret = encryptWebhookSecret(rawSecret);

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        secret: encryptedSecret,
        ...(input.url && { url: input.url }),
        ...(input.events && { events: input.events }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        url: updated.url,
        events: updated.events,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        secret: rawSecret,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /deliveries (List Delivery Logs) ──────────────────────────────────────
router.get('/deliveries', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const limit = Math.min(
      100,
      Math.max(1, parseInt((req.query.limit as string) || '20', 10))
    );

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
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch webhook deliveries',
      },
    });
  }
});

// ── POST /deliveries/:id/retry (Retry Webhook Delivery) ───────────────────────
router.post(
  '/deliveries/:id/retry',
  async (req: Request, res: Response) => {
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
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook delivery log not found',
          },
        });
        return;
      }

      if (!delivery.webhook.isActive) {
        res.status(400).json({
          success: false,
          error: {
            code: 'WEBHOOK_INACTIVE',
            message: 'Webhook endpoint is inactive',
          },
        });
        return;
      }

      const secret = decryptWebhookSecret(delivery.webhook.secret);
      const rawBody = Buffer.from(JSON.stringify(delivery.payload));
      const signature = signPayload(rawBody, secret);
      const timestamp = Math.floor(Date.now() / 1000);

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let status: 'DELIVERED' | 'FAILED' = 'FAILED';

      try {
        const response = await fetch(delivery.webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [WEBHOOK_SIGNATURE_HEADER]: signature,
            [WEBHOOK_TIMESTAMP_HEADER]: timestamp.toString(),
            [WEBHOOK_EVENT_HEADER]: delivery.event,
          },
          body: rawBody,
          signal: AbortSignal.timeout(10_000),
        });

        statusCode = response.status;
        responseBody = (await response.text()).slice(0, 1024);
        status = response.ok ? 'DELIVERED' : 'FAILED';
      } catch (err: unknown) {
        responseBody =
          err instanceof Error ? err.message.slice(0, 1024) : String(err).slice(0, 1024);
        status = 'FAILED';
        statusCode = 500;
      }

      const updated = await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempt: delivery.attempt + 1,
          status,
          statusCode,
          responseBody,
          deliveredAt: status === 'DELIVERED' ? new Date() : null,
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
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retry webhook dispatch',
        },
      });
    }
  }
);

// ── DELETE /:id (Delete Webhook) ───────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

    const existing = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Webhook endpoint not found',
        },
      });
      return;
    }

    await prisma.webhook.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: {
        message: 'Webhook endpoint revoked successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
