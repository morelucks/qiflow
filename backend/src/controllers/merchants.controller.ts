import type { Request, Response, NextFunction } from 'express';
import { MerchantsService } from '../services/merchants.service.js';
import { updateMerchantSchema } from '../schemas/merchants.schema.js';

export class MerchantsController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const data = await MerchantsService.getMerchantProfile(merchantId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = req.merchant!.id;
      const input = updateMerchantSchema.parse(req.body);
      const data = await MerchantsService.updateMerchantProfile(merchantId, input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
