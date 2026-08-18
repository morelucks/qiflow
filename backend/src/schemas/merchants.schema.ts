import { z } from 'zod';

export const updateMerchantSchema = z.object({
  businessName: z.string().min(1).max(100).optional(),
  walletAddress: z.string().optional(),
});

export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
