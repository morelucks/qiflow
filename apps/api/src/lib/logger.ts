import { createRequire } from 'module';
import type { Logger, LoggerOptions } from 'pino';
import { env } from '../config/env.js';

// pino is CommonJS — use createRequire for NodeNext ESM compatibility
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const pinoFn = require('pino') as (opts: LoggerOptions) => Logger;

const baseOptions: LoggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Never log PII — redact common sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.passwordHash',
      'body.apiKey',
    ],
    censor: '[REDACTED]',
  },
};

// Only add pretty-print transport in non-production (avoids exactOptionalPropertyTypes conflict)
if (env.NODE_ENV !== 'production') {
  baseOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger: Logger = pinoFn(baseOptions);
