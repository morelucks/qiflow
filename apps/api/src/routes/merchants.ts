import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { generateApiKey } from '../lib/auth.js';
import { createApiKeySchema, updateProfileSchema } from '../schemas/auth.js';

const router = Router();

// All routes require JWT authentication
router.use(requireAuth);

// ── GET /merchants/me ─────────────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        email: true,
        businessName: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Merchant profile not found' },
      });
      return;
    }

    res.json({ success: true, data: merchant });
  } catch (err) {
    next(err);
  }
});

// ── PUT /merchants/me ─────────────────────────────────────────────────────────
router.put('/me', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;
    const input = updateProfileSchema.parse(req.body);

    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(input.businessName && { businessName: input.businessName }),
        ...(input.walletAddress !== undefined && { walletAddress: input.walletAddress }),
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        walletAddress: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: updatedMerchant });
  } catch (err) {
    next(err);
  }
});

// ── GET /merchants/me/stats ───────────────────────────────────────────────────
router.get('/me/stats', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;

    const [totalStats, todayStats, pendingCount] = await Promise.all([
      // Total COMPLETED payments
      prisma.payment.aggregate({
        where: { merchantId, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Today's COMPLETED payments
      prisma.payment.aggregate({
        where: {
          merchantId,
          status: 'COMPLETED',
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // PENDING + PROCESSING payments count
      prisma.payment.count({
        where: {
          merchantId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalReceived: totalStats._sum.amount ? totalStats._sum.amount.toString() : '0',
        totalTransactions: totalStats._count.id,
        todayRevenue: todayStats._sum.amount ? todayStats._sum.amount.toString() : '0',
        todayTransactions: todayStats._count.id,
        pendingPayments: pendingCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /merchants/me/api-keys ────────────────────────────────────────────────
router.get('/me/api-keys', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;

    const apiKeys = await prisma.apiKey.findMany({
      where: { merchantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastFour: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: apiKeys });
  } catch (err) {
    next(err);
  }
});

// ── POST /merchants/me/api-keys ───────────────────────────────────────────────
router.post('/me/api-keys', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;
    const input = createApiKeySchema.parse(req.body);

    const apiKeyData = generateApiKey('test');

    const apiKey = await prisma.apiKey.create({
      data: {
        merchantId,
        keyHash: apiKeyData.keyHash,
        keyPrefix: apiKeyData.keyPrefix,
        lastFour: apiKeyData.lastFour,
        name: input.name,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastFour: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...apiKey,
        rawKey: apiKeyData.rawKey,
        warning: 'Save this API key now. You will not be able to see it again.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /merchants/me/api-keys/:id ─────────────────────────────────────────
router.delete('/me/api-keys/:id', async (req, res, next) => {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, merchantId },
    });

    if (!apiKey) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'API key not found' },
      });
      return;
    }

    // Revoke key (soft delete)
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
