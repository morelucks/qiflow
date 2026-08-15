import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import {
  comparePassword,
  generateApiKey,
  generateTokens,
  hashPassword,
  verifyRefreshToken,
} from '../lib/auth.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '../schemas/auth.js';

const router = Router();

// ── Rate Limiters for Auth Endpoints ──────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 1 minute.',
    },
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again in 1 minute.',
    },
  },
});

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const existingMerchant = await prisma.merchant.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingMerchant) {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'A merchant account with this email already exists' },
      });
      return;
    }

    const passwordHash = await hashPassword(input.password);

    const merchant = await prisma.merchant.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        businessName: input.businessName,
        walletAddress: input.walletAddress || null,
      },
    });

    // Automatically generate a default API key for the new merchant
    const apiKeyData = generateApiKey('test');
    await prisma.apiKey.create({
      data: {
        merchantId: merchant.id,
        keyHash: apiKeyData.keyHash,
        keyPrefix: apiKeyData.keyPrefix,
        lastFour: apiKeyData.lastFour,
        name: 'Default Secret Key',
      },
    });

    const tokens = generateTokens(merchant.id, merchant.email);

    res.status(201).json({
      success: true,
      data: {
        merchant: {
          id: merchant.id,
          email: merchant.email,
          businessName: merchant.businessName,
          walletAddress: merchant.walletAddress,
          createdAt: merchant.createdAt,
        },
        tokens,
        apiKey: {
          rawKey: apiKeyData.rawKey,
          keyPrefix: apiKeyData.keyPrefix,
          lastFour: apiKeyData.lastFour,
          warning: 'Store this secret key securely. It will not be shown again.',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const merchant = await prisma.merchant.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!merchant) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const isValidPassword = await comparePassword(input.password, merchant.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const tokens = generateTokens(merchant.id, merchant.email);

    res.json({
      success: true,
      data: {
        merchant: {
          id: merchant.id,
          email: merchant.email,
          businessName: merchant.businessName,
          walletAddress: merchant.walletAddress,
        },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const input = refreshTokenSchema.parse(req.body);
    const payload = verifyRefreshToken(input.refreshToken);

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
      select: { id: true, email: true },
    });

    if (!merchant) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Merchant account no longer exists' },
      });
      return;
    }

    const tokens = generateTokens(merchant.id, merchant.email);

    res.json({
      success: true,
      data: { tokens },
    });
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' },
    });
  }
});

export default router;
