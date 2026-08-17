import { z } from 'zod';

export const createPaymentLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== undefined && val !== '' ? String(val) : undefined)),
  currency: z.string().default('QI'),
  description: z.string().max(500).optional(),
  fixedAmount: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updatePaymentLinkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => (val !== undefined && val !== null && val !== '' ? String(val) : val === null ? null : undefined)),
  currency: z.string().optional(),
  description: z.string().max(500).nullable().optional(),
  fixedAmount: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>;
