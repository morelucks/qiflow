import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { verifyMessage, getAddress } from 'ethers';
import { prisma } from '../lib/prisma.js';
import { generateTokens, generateApiKey, verifyRefreshToken } from '../lib/auth.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import type { WalletNonceInput, WalletVerifyInput } from '../schemas/wallet-auth.schema.js';
import { createError } from '../middleware/errorHandler.js';
import { redisClient } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { DEPLOYED_CONTRACTS } from '@qiflow/shared';

// ── Wallet (SIWE-style) authentication ────────────────────────────────────────
// Every challenge is a full EIP-4361 message bound to our domain. The server stores
// the exact message it issued (keyed by lowercase address) and only accepts a
// signature over that exact string, once. This prevents replay of any other
// signed payload and phishing via generic "sign this nonce" prompts.

const WALLET_NONCE_TTL_SECONDS = 300;
const walletNonceKey = (address: string) => `wallet_nonce:${address}`;

// In-memory fallback when Redis is unavailable (single-process only; logged as a warning).
const nonceMemoryStore = new Map<string, { message: string; expiresAt: number }>();

function buildSiweMessage(address: string, nonce: string, issuedAt: Date, expiresAt: Date): string {
  const frontendUrl = new URL(env.FRONTEND_URL);
  // EIP-4361 expects the EIP-55 checksummed address in the message body.
  const checksummed = getAddress(address);
  return [
    `${frontendUrl.host} wants you to sign in with your Ethereum account:`,
    checksummed,
    '',
    'Sign in to QiFlow',
    '',
    `URI: ${frontendUrl.origin}`,
    'Version: 1',
    `Chain ID: ${DEPLOYED_CONTRACTS.CYPRUS1.CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
}

async function storeIssuedMessage(address: string, message: string): Promise<void> {
  try {
    await redisClient.setex(walletNonceKey(address), WALLET_NONCE_TTL_SECONDS, message);
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — storing wallet nonce in memory');
    nonceMemoryStore.set(address, { message, expiresAt: Date.now() + WALLET_NONCE_TTL_SECONDS * 1000 });
  }
}

/** Atomically fetch-and-delete the issued message so each challenge is single-use. */
async function consumeIssuedMessage(address: string): Promise<string | null> {
  try {
    const stored = await redisClient.getdel(walletNonceKey(address));
    if (stored) return stored;
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — reading wallet nonce from memory');
  }
  const entry = nonceMemoryStore.get(address);
  nonceMemoryStore.delete(address);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.message;
}

export class AuthService {
  static async getWalletNonce(input: WalletNonceInput) {
    const address = input.address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + WALLET_NONCE_TTL_SECONDS * 1000);
    const message = buildSiweMessage(address, nonce, issuedAt, expiresAt);

    await storeIssuedMessage(address, message);

    return { address, nonce, message, expiresAt };
  }

  static async verifyWalletSignature(input: WalletVerifyInput) {
    const address = input.address.toLowerCase();

    // 1. A challenge must have been issued for this address and must be unexpired.
    //    Consume it first so a failed attempt cannot be retried with the same message.
    const issuedMessage = await consumeIssuedMessage(address);
    if (!issuedMessage) {
      throw createError(
        'No active sign-in challenge for this address. Request a new nonce.',
        401,
        'NONCE_EXPIRED',
      );
    }

    // 2. The signed message must be exactly the one we issued.
    if (input.message !== issuedMessage) {
      throw createError('Signed message does not match the issued challenge.', 401, 'INVALID_NONCE');
    }

    // 3. The signature must recover to the claimed address.
    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(input.message, input.signature).toLowerCase();
    } catch {
      throw createError('Invalid wallet signature.', 401, 'INVALID_SIGNATURE');
    }
    if (recoveredAddress !== address) {
      throw createError('Signature address does not match requested wallet address.', 401, 'INVALID_SIGNATURE');
    }

    // Find or create merchant by (lowercased) wallet address
    let merchant = await prisma.merchant.findUnique({
      where: { walletAddress: address },
    });

    let isNewMerchant = false;
    let apiKey = null;

    if (!merchant) {
      isNewMerchant = true;
      const businessName =
        input.businessName || `Wallet Merchant (${address.slice(0, 6)}...${address.slice(-4)})`;

      merchant = await prisma.merchant.create({
        data: {
          email: null,
          passwordHash: null,
          businessName,
          walletAddress: address,
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

    let merchant;
    try {
      merchant = await prisma.merchant.create({
        data: {
          email: input.email,
          passwordHash,
          businessName: input.businessName,
          walletAddress: input.walletAddress ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined)?.join(',') ?? '';
        if (target.includes('wallet')) {
          throw createError('This wallet address is already linked to another merchant account.', 409, 'WALLET_IN_USE');
        }
        throw createError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
      }
      throw err;
    }

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
