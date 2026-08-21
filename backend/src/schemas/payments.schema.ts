import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.enum(['QI', 'QUAI']).default('QI'),
  description: z.string().max(255).optional(),
  paymentLinkId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const simulatePaymentSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED', 'EXPIRED']).default('COMPLETED'),
  txHash: z.string().optional(),
});

export const submitTransactionSchema = z.object({
  txHash: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'txHash must be a 0x-prefixed 32-byte hex hash')
    .transform((h) => h.toLowerCase()),
  payerAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
});

export const publicCreatePaymentSchema = z.object({
  publicKey: z.string().trim().regex(/^qiflow_pk_(live|test)_[a-f0-9]{32}$/, 'Invalid publishable key'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.enum(['QI', 'QUAI']).default('QI'),
  description: z.string().max(255).optional(),
  /** Merchant's own order id — makes the request idempotent per merchant. */
  reference: z.string().trim().min(1).max(64).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PublicCreatePaymentInput = z.infer<typeof publicCreatePaymentSchema>;
export type SubmitTransactionInput = z.infer<typeof submitTransactionSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
