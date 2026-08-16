import type { Request, Response, NextFunction } from 'express';
import { hashApiKey, verifyAccessToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedMerchant {
  id: string;
  email: string;
  businessName?: string;
  walletAddress?: string | null;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      merchant?: AuthenticatedMerchant;
      apiKeyId?: string;
    }
  }
}

// ── JWT Bearer Token Auth Middleware (for merchant dashboard) ────────────────
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing token in Authorization header' },
      });
      return;
    }

    const payload = verifyAccessToken(token);

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
      select: { id: true, email: true, businessName: true, walletAddress: true },
    });

    if (!merchant) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Merchant account no longer exists' },
      });
      return;
    }

    req.merchant = merchant;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
    });
  }
}

// ── API Key Auth Middleware (for programmatic /v1/* endpoints) ────────────────
export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    if (!apiKeyHeader) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing X-API-Key header' },
      });
      return;
    }

    const keyHash = hashApiKey(apiKeyHeader.trim());

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        merchant: {
          select: { id: true, email: true, businessName: true, walletAddress: true },
        },
      },
    });

    if (!apiKey || !apiKey.isActive || !apiKey.merchant) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked API key' },
      });
      return;
    }

    req.merchant = apiKey.merchant;
    req.apiKeyId = apiKey.id;

    // Debounce last_used_at update (only update if null or older than 60 seconds)
    const now = new Date();
    if (!apiKey.lastUsedAt || now.getTime() - apiKey.lastUsedAt.getTime() > 60_000) {
      prisma.apiKey
        .update({
          where: { id: apiKey.id },
          data: { lastUsedAt: now },
        })
        .catch((err: unknown) => {
          // Log background update error without failing the request
          console.error('Failed to update API key lastUsedAt:', err);
        });
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication error verifying API key' },
    });
  }
}

// ── Flexible Auth (Accepts either JWT Bearer OR API Key) ──────────────────────
export async function requireAuthOrApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const hasBearer = req.headers.authorization?.startsWith('Bearer ');
  const hasApiKey = Boolean(req.headers['x-api-key']);

  if (hasApiKey) {
    return requireApiKey(req, res, next);
  }
  if (hasBearer) {
    return requireAuth(req, res, next);
  }

  res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required (Bearer token or X-API-Key)' },
  });
}
