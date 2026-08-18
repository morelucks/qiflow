import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid HTTPS/HTTP URL'),
  events: z.array(z.string()).default(['payment.completed', 'payment.failed']),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
