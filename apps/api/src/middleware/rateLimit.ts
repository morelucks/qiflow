import rateLimit, { type Options, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Request, Response } from 'express';
import { redisClient } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

interface RateLimitConfig {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    message: string;
}

function buildHandler(defaultMessage: string) {
    return (_req: Request, res: Response) => {
        const retryAfterHeader = res.getHeader('Retry-After');
        const retryAfter = typeof retryAfterHeader === 'string' ? parseInt(retryAfterHeader, 10) : 60;

        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: defaultMessage,
                retryAfter,
            },
        });
    };
}

export function createRateLimiter(config: RateLimitConfig) {
    const options: Partial<Options> = {
        windowMs: config.windowMs,
        max: config.max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: buildHandler(config.message),
        keyGenerator: config.keyGenerator ?? ((req: Request) => ipKeyGenerator(req.ip ?? 'unknown')),
    };

    if (redisClient.status === 'ready' || redisClient.status === 'connecting') {
        options.store = new RedisStore({
            sendCommand: (...args: string[]) =>
                (redisClient.call as (...a: string[]) => Promise<unknown>)(...args) as Promise<never>,
        });
    } else {
        logger.warn('Redis not ready — rate limiter falling back to in-memory store');
    }

    return rateLimit(options);
}

// ── Auth endpoint limiters (issue #24 — brute-force protection) ─────────────
export const loginLimiter = createRateLimiter({
    windowMs: env.RATE_LIMIT_AUTH_LOGIN_WINDOW_MS,
    max: env.RATE_LIMIT_AUTH_LOGIN_MAX,
    message: 'Too many login attempts. Please try again shortly.',
});

export const registerLimiter = createRateLimiter({
    windowMs: env.RATE_LIMIT_AUTH_REGISTER_WINDOW_MS,
    max: env.RATE_LIMIT_AUTH_REGISTER_MAX,
    message: 'Too many registration attempts. Please try again shortly.',
});

export const refreshLimiter = createRateLimiter({
    windowMs: env.RATE_LIMIT_AUTH_REFRESH_WINDOW_MS,
    max: env.RATE_LIMIT_AUTH_REFRESH_MAX,
    message: 'Too many refresh attempts. Please try again shortly.',
});