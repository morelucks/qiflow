import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
});

redisClient.on('error', (err) => {
    logger.warn({ err }, 'Redis connection error — rate limiting will fall back to in-memory store');
});

redisClient.on('connect', () => {
    logger.info('Redis connected');
});