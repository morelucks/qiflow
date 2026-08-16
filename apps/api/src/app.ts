import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import merchantsRouter from './routes/merchants.js';

export function createApp() {
  const app = express();

  // ── Trust proxy ─────────────────────────────────────────────────────────
  app.set('trust proxy', 1);

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    })
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── Global rate limiter (generous defaults — tighten per-route as needed) ─
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    })
  );

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/merchants', merchantsRouter);

  // ── 404 + error handlers (must be last) ───────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
