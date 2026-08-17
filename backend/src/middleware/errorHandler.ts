import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Central error handler — must be registered last (after all routes).
 */
export const errorHandler: ErrorRequestHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  }

  const body: Record<string, string> = { error: message };
  if (err.code !== undefined) {
    body['code'] = err.code;
  }
  res.status(statusCode).json(body);
};

/**
 * 404 handler — must be registered after all routes, before errorHandler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

/**
 * Helper to create typed API errors.
 */
export function createError(message: string, statusCode: number, code?: string): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  if (code !== undefined) err.code = code;
  return err;
}
