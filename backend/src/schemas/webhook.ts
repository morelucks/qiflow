import { z } from 'zod';

export const webhookEventSchema = z.enum([
  'payment.created',
  'payment.pending',
  'payment.processing',
  'payment.completed',
  'payment.failed',
  'payment.cancelled',
  'payment.expired',
]);

export const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL format'),
  events: z.array(webhookEventSchema).min(1, 'At least one event must be selected'),
  isActive: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
  events: z.array(webhookEventSchema).min(1, 'At least one event must be selected').optional(),
  isActive: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
