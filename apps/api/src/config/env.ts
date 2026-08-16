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

  // Rate limiting
  RATE_LIMIT_AUTH_LOGIN_MAX: z.coerce.number().default(5),
  RATE_LIMIT_AUTH_LOGIN_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_AUTH_REGISTER_MAX: z.coerce.number().default(3),
  RATE_LIMIT_AUTH_REGISTER_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_AUTH_REFRESH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_AUTH_REFRESH_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_API_MAX: z.coerce.number().default(100),
  RATE_LIMIT_API_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_UNAUTH_MAX: z.coerce.number().default(30),
  RATE_LIMIT_UNAUTH_WINDOW_MS: z.coerce.number().default(60_000),
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