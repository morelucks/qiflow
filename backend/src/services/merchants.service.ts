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
