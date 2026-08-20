import { z } from 'zod';

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Wallet address must be a 0x-prefixed 40-hex-character Quai address')
  .transform((a) => a.toLowerCase());

export const updateMerchantSchema = z.object({
  businessName: z.string().min(1).max(100).optional(),
  // null clears the wallet; omitted leaves it unchanged
  walletAddress: walletAddressSchema.nullable().optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(60).default('API Key'),
  environment: z.enum(['live', 'test']).default('live'),
});

export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
