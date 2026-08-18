import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schema.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body);
      const result = await AuthService.registerMerchant(input);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await AuthService.loginMerchant(input);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const input = refreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshTokens(input.refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err) {
      next(err);
    }
  }
}
