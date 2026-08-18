import type { Request, Response, NextFunction } from 'express';
import { PaymentsService } from '../services/payments.service.js';
import { createPaymentSchema, simulatePaymentSchema } from '../schemas/payments.schema.js';

export class PaymentsController {
  static async getPublicPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code as string;
      const data = await PaymentsService.getPublicPayment(code);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const merchant = req.merchant!;
      const input = createPaymentSchema.parse(req.body);
      const data = await PaymentsService.createPayment(merchant, input);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
      const status = req.query.status as string | undefined;

      const result = await PaymentsService.listPayments(merchantId, page, limit, status);
      res.json({ success: true, data: result.payments, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  static async getPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const data = await PaymentsService.getPayment(merchantId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async simulatePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const id = req.params.id as string;
      const input = simulatePaymentSchema.parse(req.body);
      const data = await PaymentsService.simulatePayment(merchantId, id, input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
