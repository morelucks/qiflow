import type { Request, Response, NextFunction } from 'express';
import { PaymentLinksService } from '../services/payment-links.service.js';
import { createPaymentLinkSchema, updatePaymentLinkSchema } from '../schemas/payment-links.schema.js';

export class PaymentLinksController {
  static async getPublicLink(req: Request, res: Response, next: NextFunction) {
    try {
      const linkCode = req.params.linkCode as string;
      const data = await PaymentLinksService.getPublicLink(linkCode);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async checkoutFromLink(req: Request, res: Response, next: NextFunction) {
    try {
      const linkCode = req.params.linkCode as string;
      const { customAmount } = req.body || {};
      const data = await PaymentLinksService.checkoutFromLink(linkCode, customAmount);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listPaymentLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

      const result = await PaymentLinksService.listPaymentLinks(merchantId, page, limit);
      res.json({ success: true, data: result.links, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  static async createPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const input = createPaymentLinkSchema.parse(req.body);
      const data = await PaymentLinksService.createPaymentLink(merchantId, input);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const data = await PaymentLinksService.getPaymentLink(merchantId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const input = updatePaymentLinkSchema.parse(req.body);
      const data = await PaymentLinksService.updatePaymentLink(merchantId, id, input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async deletePaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const data = await PaymentLinksService.deletePaymentLink(merchantId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
