import type { Request, Response, NextFunction } from 'express';
import { MerchantsService } from '../services/merchants.service.js';
import { updateMerchantSchema, createApiKeySchema } from '../schemas/merchants.schema.js';

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

  static async listApiKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MerchantsService.listApiKeys(req.merchant!.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createApiKeySchema.parse(req.body ?? {});
      const data = await MerchantsService.createApiKey(req.merchant!.id, input);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async revokeApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MerchantsService.revokeApiKey(req.merchant!.id, req.params.id as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
