import { z } from 'zod';

export const walletNonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
});

export const walletVerifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  message: z.string().min(1, 'Message is required'),
  signature: z.string().min(1, 'Signature is required'),
  businessName: z.string().max(100).optional(),
});

export type WalletNonceInput = z.infer<typeof walletNonceSchema>;
export type WalletVerifyInput = z.infer<typeof walletVerifySchema>;
