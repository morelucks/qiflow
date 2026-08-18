import { Router } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';
import type { Request, Response } from 'express';

const router = Router();

const createPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.enum(['QI', 'QUAI']).default('QI'),
  description: z.string().max(255).optional(),
  paymentLinkId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const simulatePaymentSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED', 'EXPIRED']).default('COMPLETED'),
  txHash: z.string().optional(),
});

// ── GET /public/code/:code (Public — checkout page lookup) ─────────────────
router.get('/public/code/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const payment = await prisma.payment.findUnique({
      where: { paymentCode: code },
      include: {
        merchant: {
          select: {
            businessName: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment code not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        paymentCode: payment.paymentCode,
        amount: payment.amount.toString(),
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        receivingAddress: payment.receivingAddress,
        txHash: payment.txHash,
        merchantName: payment.merchant.businessName,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch public payment details' },
    });
  }
});

// ── All subsequent endpoints require Authentication (Bearer OR X-API-Key) ──
router.use(requireAuthOrApiKey);

// ── POST / (Create payment session) ─────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const input = createPaymentSchema.parse(req.body);

    const paymentCode = `pay_${randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    const receivingAddress =
      req.merchant?.walletAddress || '0x0000000000000000000000000000000000000000';

    const payment = await prisma.payment.create({
      data: {
        merchantId,
        paymentCode,
        amount: input.amount,
        currency: input.currency,
        receivingAddress,
        expiresAt,
        status: 'CREATED',
        ...(input.description ? { description: input.description } : {}),
        ...(input.paymentLinkId ? { paymentLinkId: input.paymentLinkId } : {}),
        ...(input.metadata ? { metadata: JSON.parse(JSON.stringify(input.metadata)) } : {}),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: payment.id,
        paymentCode: payment.paymentCode,
        amount: payment.amount.toString(),
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        receivingAddress: payment.receivingAddress,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
        checkoutUrl: `${process.env.CHECKOUT_BASE_URL || 'http://localhost:3000'}/pay/${payment.paymentCode}`,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payment parameters', details: err.errors },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create payment session' },
    });
  }
});

// ── GET / (List merchant payments) ──────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = { merchantId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        paymentCode: p.paymentCode,
        amount: p.amount.toString(),
        currency: p.currency,
        description: p.description,
        status: p.status,
        receivingAddress: p.receivingAddress,
        txHash: p.txHash,
        expiresAt: p.expiresAt,
        completedAt: p.completedAt,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payments' },
    });
  }
});

// ── GET /:id (Get single payment) ───────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

    const payment = await prisma.payment.findFirst({
      where: {
        merchantId,
        OR: [{ id }, { paymentCode: id }],
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        paymentCode: payment.paymentCode,
        amount: payment.amount.toString(),
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        receivingAddress: payment.receivingAddress,
        txHash: payment.txHash,
        expiresAt: payment.expiresAt,
        completedAt: payment.completedAt,
        createdAt: payment.createdAt,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payment' },
    });
  }
});

// ── POST /:id/simulate (Sandbox test simulation) ────────────────────────────
router.post('/:id/simulate', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;
    const input = simulatePaymentSchema.parse(req.body);

    const payment = await prisma.payment.findFirst({
      where: {
        merchantId,
        OR: [{ id }, { paymentCode: id }],
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment not found' },
      });
      return;
    }

    const txHash = input.txHash || `0x${randomBytes(32).toString('hex')}`;
    const completedAt = input.status === 'COMPLETED' ? new Date() : null;

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: input.status,
        txHash,
        completedAt,
      },
    });

    // Trigger webhook dispatches in background if active webhooks exist
    const webhooks = await prisma.webhook.findMany({
      where: { merchantId, isActive: true },
    });

    const eventName = input.status === 'COMPLETED' ? 'payment.completed' : 'payment.failed';
    for (const hook of webhooks) {
      if (hook.events.includes(eventName) || hook.events.includes('*')) {
        prisma.webhookDelivery
          .create({
            data: {
              webhookId: hook.id,
              paymentId: updatedPayment.id,
              event: eventName,
              payload: {
                event: eventName,
                paymentCode: updatedPayment.paymentCode,
                amount: updatedPayment.amount.toString(),
                currency: updatedPayment.currency,
                status: updatedPayment.status,
                txHash: updatedPayment.txHash,
                timestamp: new Date().toISOString(),
              },
              status: 'DELIVERED',
              statusCode: 200,
              responseBody: JSON.stringify({ received: true }),
              deliveredAt: new Date(),
            },
          })
          .catch(() => {});
      }
    }

    res.json({
      success: true,
      data: {
        id: updatedPayment.id,
        paymentCode: updatedPayment.paymentCode,
        status: updatedPayment.status,
        txHash: updatedPayment.txHash,
        completedAt: updatedPayment.completedAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid simulation input', details: err.errors },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to simulate payment status' },
    });
  }
});

export default router;
