import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Quai Network
  QUAI_RPC_URL: z.string().url().default('https://rpc.sandbox.quai.network'),
  QUAI_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),

  // Redis (optional at scaffold stage)
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Frontend URL (for CORS + checkout links)
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CHECKOUT_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Webhook signing — 32-byte AES-256-GCM key (64 hex chars)
  WEBHOOK_SECRET_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'WEBHOOK_SECRET_KEY must be a 32-byte hex string (64 hex chars)'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
