import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Simple health check for uptime monitoring and load balancer probes.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'qiflow-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

export default router;
