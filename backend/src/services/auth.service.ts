import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { verifyMessage } from 'ethers';
import { prisma } from '../lib/prisma.js';
import { generateTokens, generateApiKey, verifyRefreshToken } from '../lib/auth.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import type { WalletNonceInput, WalletVerifyInput } from '../schemas/wallet-auth.schema.js';
import { createError } from '../middleware/errorHandler.js';
import { redisClient } from '../lib/redis.js';

// In-memory fallback for nonces when Redis is unavailable or in testing
const nonceMemoryStore = new Map<string, string>();

export class AuthService {
  static async getWalletNonce(input: WalletNonceInput) {
    const address = input.address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = `Sign in to QiFlow with nonce: ${nonce}`;

    try {
      await redisClient.setex(`wallet_nonce:${address}`, 300, nonce);
    } catch {
      // Redis fallback
      nonceMemoryStore.set(address, nonce);
      setTimeout(() => nonceMemoryStore.delete(address), 300000);
    }

    return { address, nonce, message };
  }

  static async verifyWalletSignature(input: WalletVerifyInput) {
    const address = input.address.toLowerCase();
    let recoveredAddress: string;

    try {
      recoveredAddress = verifyMessage(input.message, input.signature).toLowerCase();
    } catch {
      throw createError('Invalid wallet signature.', 401, 'INVALID_SIGNATURE');
    }

    if (recoveredAddress !== address) {
      throw createError('Signature address does not match requested wallet address.', 401, 'INVALID_SIGNATURE');
    }

    // Verify stored nonce
    let cachedNonce: string | null = null;
    try {
      cachedNonce = await redisClient.get(`wallet_nonce:${address}`);
      if (cachedNonce) {
        await redisClient.del(`wallet_nonce:${address}`);
      }
    } catch {
      // Fallback
    }

    if (!cachedNonce) {
      cachedNonce = nonceMemoryStore.get(address) || null;
      if (cachedNonce) {
        nonceMemoryStore.delete(address);
      }
    }

    if (cachedNonce && !input.message.includes(cachedNonce)) {
      throw createError('Signature message nonce mismatch or expired.', 401, 'INVALID_NONCE');
    }

    // Find or create merchant by wallet address
    let merchant = await prisma.merchant.findFirst({
      where: {
        walletAddress: {
          equals: input.address,
          mode: 'insensitive',
        },
      },
    });

    let isNewMerchant = false;
    let apiKey = null;

    if (!merchant) {
      isNewMerchant = true;
      const businessName = input.businessName || `Wallet Merchant (${input.address.slice(0, 6)}...${input.address.slice(-4)})`;
      
      merchant = await prisma.merchant.create({
        data: {
          email: null,
          passwordHash: null,
          businessName,
          walletAddress: input.address,
        },
      });

      const generatedKey = generateApiKey('live');
      const createdApiKey = await prisma.apiKey.create({
        data: {
          merchantId: merchant.id,
          keyHash: generatedKey.keyHash,
          keyPrefix: generatedKey.keyPrefix,
          lastFour: generatedKey.lastFour,
          name: 'Default Live Key',
        },
      });

      apiKey = {
        id: createdApiKey.id,
        name: createdApiKey.name,
        rawKey: generatedKey.rawKey,
        createdAt: createdApiKey.createdAt,
      };
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
      isNewMerchant,
      apiKey,
    };
  }

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

    if (!merchant || !merchant.passwordHash) {
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
