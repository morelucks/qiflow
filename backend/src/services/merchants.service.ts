import { prisma } from '../lib/prisma.js';
import type { UpdateMerchantInput } from '../schemas/merchants.schema.js';

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
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!merchant) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Merchant profile not found' };
    }

    return merchant;
  }

  static async updateMerchantProfile(merchantId: string, input: UpdateMerchantInput) {
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
  }
}
