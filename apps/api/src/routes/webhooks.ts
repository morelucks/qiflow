import { Router } from 'express';
import { requireAuthOrApiKey } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { generateWebhookSecret, encryptWebhookSecret } from '../lib/webhook-crypto.js';
import { createWebhookSchema, updateWebhookSchema } from '../schemas/webhook.js';

const router = Router();

// All webhook endpoints require authentication (JWT or API key)
router.use(requireAuthOrApiKey);

// ── POST /v1/webhooks (Register a Webhook) ───────────────────────────────────
router.post('/', async (req, res, next) => {
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
        secret: rawSecret, // shown once
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /v1/webhooks (List Webhooks) ──────────────────────────────────────────
router.get('/', async (req, res, next) => {
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

    res.json({ success: true, data: webhooks });
  } catch (err) {
    next(err);
  }
});

// ── PUT /v1/webhooks/:id (Rotate Secret & Update Webhook) ─────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const input = updateWebhookSchema.parse(req.body);

    // Verify webhook exists and belongs to the merchant
    const existing = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' },
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
        secret: rawSecret, // return rotated secret once
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /v1/webhooks/:id (Revoke/Delete Webhook) ───────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const existing = await prisma.webhook.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' },
      });
      return;
    }

    await prisma.webhook.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Webhook endpoint revoked successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
