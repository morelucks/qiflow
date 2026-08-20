import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 12;

export interface TokenPayload {
  merchantId: string;
  email: string | null;
}

export interface GeneratedApiKey {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
  lastFour: string;
}

// ── Password Utilities ────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT Utilities ─────────────────────────────────────────────────────────────
export function generateTokens(merchantId: string, email: string | null = null) {
  const payload: TokenPayload = { merchantId, email };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken, expiresIn: 900 }; // 15 minutes = 900s
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

// ── API Key Utilities ─────────────────────────────────────────────────────────
export function generateApiKey(environment: 'test' | 'live' = 'test'): GeneratedApiKey {
  const prefix = `qiflow_${environment}_`;
  const randomBytes = crypto.randomBytes(24).toString('hex'); // 48 chars
  const rawKey = `${prefix}${randomBytes}`;

  const keyHash = hashApiKey(rawKey);
  const keyPrefix = `${prefix}${randomBytes.substring(0, 4)}`;
  const lastFour = randomBytes.substring(randomBytes.length - 4);

  return {
    rawKey,
    keyHash,
    keyPrefix,
    lastFour,
  };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
