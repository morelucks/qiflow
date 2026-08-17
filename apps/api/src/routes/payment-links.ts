import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

// ── Validation Schemas ────────────────────────────────────────────────────────
export const createPaymentLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== undefined && val !== '' ? String(val) : undefined)),
  currency: z.string().default('QI'),
  description: z.string().max(500).optional(),
  fixedAmount: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updatePaymentLinkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => (val !== undefined && val !== null && val !== '' ? String(val) : val === null ? null : undefined)),
  currency: z.string().optional(),
  description: z.string().max(500).nullable().optional(),
  fixedAmount: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Helper to generate unique link code (pl_ + 8 random chars)
function generateLinkCode(): string {
  const randomChars = crypto.randomBytes(4).toString('hex');
  return `pl_${randomChars}`;
}

// Helper to generate unique payment code (pay_ + 8 random chars)
function generatePaymentCode(): string {
  const randomChars = crypto.randomBytes(4).toString('hex');
  return `pay_${randomChars}`;
}

// Helper to get checkout URL
function getCheckoutUrl(linkCode: string): string {
  const baseUrl = env.CHECKOUT_BASE_URL || env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/pay/link/${linkCode}`;
}

// ── PUBLIC ROUTE: Resolve Payment Link & Create Payment Session ──────────────
// GET /v1/payment-links/public/:linkCode
router.get('/public/:linkCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const linkCode = req.params.linkCode as string;

    const link = await prisma.paymentLink.findUnique({
      where: { linkCode },
      select: {
        id: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
            walletAddress: true,
          },
        },
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!link || !link.isActive) {
      res.status(404).json({
        success: false,
        error: {
          code: 'LINK_INACTIVE',
          message: 'This payment link is no longer active or does not exist.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: link.id,
        linkCode: link.linkCode,
        name: link.name,
        amount: link.amount ? link.amount.toString() : null,
        currency: link.currency,
        description: link.description,
        fixedAmount: link.fixedAmount,
        isActive: link.isActive,
        merchantName: link.merchant.businessName,
        receivingAddress: link.merchant.walletAddress || '0x0000000000000000000000000000000000000000',
        uses: link._count.payments,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/payment-links/public/:linkCode/checkout
// Creates a payment from template and returns redirect paymentCode
router.post('/public/:linkCode/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const linkCode = req.params.linkCode as string;
    const { customAmount } = req.body || {};

    const link = await prisma.paymentLink.findUnique({
      where: { linkCode },
      select: {
        id: true,
        merchantId: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!link || !link.isActive) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LINK_INACTIVE',
          message: 'This payment link is no longer active or does not exist.',
        },
      });
      return;
    }

    // Determine payment amount
    let finalAmount = link.amount ? link.amount.toString() : '5.00';
    if (!link.fixedAmount && customAmount) {
      finalAmount = String(customAmount);
    }

    const paymentCode = generatePaymentCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    const receivingAddress = link.merchant.walletAddress || '0x0000000000000000000000000000000000000000';

    const payment = await prisma.payment.create({
      data: {
        merchantId: link.merchantId,
        paymentLinkId: link.id,
        paymentCode,
        amount: finalAmount,
        currency: link.currency || 'QI',
        description: link.description || link.name,
        receivingAddress,
        status: 'CREATED',
        expiresAt,
      },
    });

    res.json({
      success: true,
      data: {
        paymentCode: payment.paymentCode,
        paymentId: payment.id,
        redirectUrl: `/pay/${payment.paymentCode}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PROTECTED ROUTES (Require Auth or API Key) ──────────────────────────────
router.use(requireAuthOrApiKey);

// GET /v1/payment-links (List Payment Links)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      prisma.paymentLink.findMany({
        where: { merchantId },
        select: {
          id: true,
          merchantId: true,
          linkCode: true,
          name: true,
          amount: true,
          currency: true,
          description: true,
          fixedAmount: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentLink.count({ where: { merchantId } }),
    ]);

    const formattedLinks = links.map((link) => ({
      id: link.id,
      merchantId: link.merchantId,
      linkCode: link.linkCode,
      name: link.name,
      amount: link.amount ? link.amount.toString() : null,
      currency: link.currency,
      description: link.description,
      fixedAmount: link.fixedAmount,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      uses: link._count.payments,
      url: getCheckoutUrl(link.linkCode),
    }));

    res.json({
      success: true,
      data: formattedLinks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/payment-links (Create Payment Link)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const input = createPaymentLinkSchema.parse(req.body);

    const linkCode = generateLinkCode();

    const link = await prisma.paymentLink.create({
      data: {
        merchantId,
        linkCode,
        name: input.name,
        amount: input.amount ? input.amount : null,
        currency: input.currency || 'QI',
        description: input.description || null,
        fixedAmount: input.fixedAmount ?? true,
        isActive: input.isActive ?? true,
      },
      select: {
        id: true,
        merchantId: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { payments: true },
        },
      },
    });

    const url = getCheckoutUrl(link.linkCode);

    res.status(201).json({
      success: true,
      data: {
        id: link.id,
        merchantId: link.merchantId,
        linkCode: link.linkCode,
        name: link.name,
        amount: link.amount ? link.amount.toString() : null,
        currency: link.currency,
        description: link.description,
        fixedAmount: link.fixedAmount,
        isActive: link.isActive,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        uses: link._count.payments,
        url,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/payment-links/:id (Get Single Payment Link)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

    const link = await prisma.paymentLink.findFirst({
      where: { id, merchantId },
      select: {
        id: true,
        merchantId: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!link) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment link not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: link.id,
        merchantId: link.merchantId,
        linkCode: link.linkCode,
        name: link.name,
        amount: link.amount ? link.amount.toString() : null,
        currency: link.currency,
        description: link.description,
        fixedAmount: link.fixedAmount,
        isActive: link.isActive,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        uses: link._count.payments,
        url: getCheckoutUrl(link.linkCode),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/payment-links/:id (Update Payment Link)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;
    const input = updatePaymentLinkSchema.parse(req.body);

    const existing = await prisma.paymentLink.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment link not found' },
      });
      return;
    }

    const updated = await prisma.paymentLink.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.amount !== undefined && { amount: input.amount ? input.amount : null }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.fixedAmount !== undefined && { fixedAmount: input.fixedAmount }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: {
        id: true,
        merchantId: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { payments: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        merchantId: updated.merchantId,
        linkCode: updated.linkCode,
        name: updated.name,
        amount: updated.amount ? updated.amount.toString() : null,
        currency: updated.currency,
        description: updated.description,
        fixedAmount: updated.fixedAmount,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        uses: updated._count.payments,
        url: getCheckoutUrl(updated.linkCode),
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/payment-links/:id (Soft Delete / Deactivate Payment Link)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

    const existing = await prisma.paymentLink.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment link not found' },
      });
      return;
    }

    // Soft delete (set isActive = false)
    const deactivated = await prisma.paymentLink.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      data: {
        id: deactivated.id,
        isActive: deactivated.isActive,
        message: 'Payment link deactivated successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
