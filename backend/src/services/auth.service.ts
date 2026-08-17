import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateTokens, generateApiKey, verifyRefreshToken } from '../lib/auth.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

export class AuthService {
  static async registerMerchant(input: RegisterInput) {
    const existing = await prisma.merchant.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw { statusCode: 409, code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' };
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
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' };
    }

    const isPasswordValid = await bcrypt.compare(input.password, merchant.passwordHash);

    if (!isPasswordValid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' };
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
      throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token.' };
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
    });

    if (!merchant) {
      throw { statusCode: 401, code: 'MERCHANT_NOT_FOUND', message: 'Merchant associated with token no longer exists.' };
    }

    return generateTokens(merchant.id, merchant.email);
  }
}
