import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { generateApiKey } from '../lib/auth.js';
import type { UpdateMerchantInput, CreateApiKeyInput } from '../schemas/merchants.schema.js';
import { createError } from '../middleware/errorHandler.js';

const apiKeySelect = {
  id: true,
  name: true,
  keyPrefix: true,
  lastFour: true,
  isActive: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

export class MerchantsService {
  static async getMerchantProfile(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        email: true,
        businessName: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
        apiKeys: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: apiKeySelect,
        },
      },
    });

    if (!merchant) {
      throw createError('Merchant profile not found', 404, 'NOT_FOUND');
    }

    return merchant;
  }

  static async updateMerchantProfile(merchantId: string, input: UpdateMerchantInput) {
    try {
      const updated = await prisma.merchant.update({
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
          createdAt: true,
          updatedAt: true,
        },
      });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw createError(
          'This wallet address is already linked to another merchant account.',
          409,
          'WALLET_IN_USE',
        );
      }
      throw err;
    }
  }

  // ── Dashboard stats ─────────────────────────────────────────────────────────

  static async getDashboardStats(merchantId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [merchant, completed, completedToday, statusCounts, recent, apiKeyCount, webhookCount] =
      await Promise.all([
        prisma.merchant.findUnique({ where: { id: merchantId }, select: { walletAddress: true } }),
        prisma.payment.groupBy({
          by: ['currency'],
          where: { merchantId, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.payment.groupBy({
          by: ['currency'],
          where: { merchantId, status: 'COMPLETED', completedAt: { gte: startOfToday } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.payment.groupBy({
          by: ['status'],
          where: { merchantId },
          _count: { _all: true },
        }),
        prisma.payment.findMany({
          where: { merchantId },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        prisma.apiKey.count({ where: { merchantId, isActive: true } }),
        prisma.webhook.count({ where: { merchantId, isActive: true } }),
      ]);

    const toTotals = (rows: typeof completed) =>
      rows.map((r) => ({
        currency: r.currency,
        amount: (r._sum.amount ?? 0).toString(),
        count: r._count._all,
      }));

    const byStatus: Record<string, number> = {};
    let totalPayments = 0;
    for (const row of statusCounts) {
      byStatus[row.status] = row._count._all;
      totalPayments += row._count._all;
    }

    return {
      received: toTotals(completed),
      receivedToday: toTotals(completedToday),
      payments: { total: totalPayments, byStatus },
      recent: recent.map((p) => ({
        id: p.id,
        paymentCode: p.paymentCode,
        amount: p.amount.toString(),
        currency: p.currency,
        description: p.description,
        status: p.status,
        txHash: p.txHash,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
      setup: {
        walletSet: Boolean(merchant?.walletAddress),
        hasApiKey: apiKeyCount > 0,
        hasWebhook: webhookCount > 0,
        hasPayment: totalPayments > 0,
      },
    };
  }

  // ── API keys ────────────────────────────────────────────────────────────────

  static async listApiKeys(merchantId: string) {
    return prisma.apiKey.findMany({
      where: { merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: apiKeySelect,
    });
  }

  /** Creates a key and returns the raw secret exactly once. */
  static async createApiKey(merchantId: string, input: CreateApiKeyInput) {
    const generated = generateApiKey(input.environment);
    const created = await prisma.apiKey.create({
      data: {
        merchantId,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        lastFour: generated.lastFour,
        name: input.name,
      },
      select: apiKeySelect,
    });
    return { ...created, rawKey: generated.rawKey };
  }

  static async revokeApiKey(merchantId: string, apiKeyId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id: apiKeyId, merchantId, isActive: true } });
    if (!key) {
      throw createError('API key not found', 404, 'NOT_FOUND');
    }
    await prisma.apiKey.update({ where: { id: key.id }, data: { isActive: false } });
    return { id: key.id, revoked: true };
  }
}
