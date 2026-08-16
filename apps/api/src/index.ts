import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startWebhookWorker, stopWebhookWorker } from './workers/webhook-worker.js';

const app = createApp();

// Start background workers
startWebhookWorker();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 QiFlow API running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`   Health: http://localhost:${env.PORT}/health`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await stopWebhookWorker();
    } catch (err) {
      logger.error({ err }, 'Error closing webhook worker');
    }
    process.exit(0);
  });

  // Force kill after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});
