import type { Request, Response, NextFunction } from 'express';
import { WebhooksService } from '../services/webhooks.service.js';
import { createWebhookSchema } from '../schemas/webhooks.schema.js';

export class WebhooksController {
  static async createWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const input = createWebhookSchema.parse(req.body);
      const data = await WebhooksService.createWebhook(merchantId, input);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listWebhooks(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const data = await WebhooksService.listWebhooks(merchantId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

static async updateWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const id = req.params.id as string;

    const data = await WebhooksService.updateWebhook(merchantId, id);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

  static async deleteWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const data = await WebhooksService.deleteWebhook(merchantId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async testWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const data = await WebhooksService.testWebhook(merchantId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
      const data = await WebhooksService.listDeliveries(merchantId, limit);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async retryDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const data = await WebhooksService.retryDelivery(merchantId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
