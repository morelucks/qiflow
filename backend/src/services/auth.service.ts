import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateTokens, generateApiKey, verifyRefreshToken } from '../lib/auth.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { createError } from '../middleware/errorHandler.js';

export class AuthService {
  static async registerMerchant(input: RegisterInput) {
    const existing = await prisma.merchant.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw createError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const merchant = await prisma.merchant.create({
      data: {
        email: input.email,
        passwordHash,
        businessName: input.businessName,
        walletAddress: input.walletAddress ?? null,
      },
    });

    // Create default API key using generateApiKey utility
    const generatedKey = generateApiKey('live');

    const apiKey = await prisma.apiKey.create({
      data: {
        merchantId: merchant.id,
        keyHash: generatedKey.keyHash,
        keyPrefix: generatedKey.keyPrefix,
        lastFour: generatedKey.lastFour,
        name: 'Default Live Key',
      },
    });

    const tokens = generateTokens(merchant.id, merchant.email);

    return {
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        walletAddress: merchant.walletAddress,
        createdAt: merchant.createdAt,
      },
      tokens,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        rawKey: generatedKey.rawKey,
        createdAt: apiKey.createdAt,
      },
    };
  }

  static async loginMerchant(input: LoginInput) {
    const merchant = await prisma.merchant.findUnique({
      where: { email: input.email },
    });

    if (!merchant) {
      throw createError('Invalid email address or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, merchant.passwordHash);

    if (!isPasswordValid) {
      throw createError('Invalid email address or password.', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokens(merchant.id, merchant.email);

    return {
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        walletAddress: merchant.walletAddress,
        createdAt: merchant.createdAt,
      },
      tokens,
    };
  }

  static async refreshTokens(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw createError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
    });

    if (!merchant) {
      throw createError('Merchant associated with token no longer exists.', 401, 'MERCHANT_NOT_FOUND');
    }

    return generateTokens(merchant.id, merchant.email);
  }
}
