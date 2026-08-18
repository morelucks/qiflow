import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { registerLimiter, loginLimiter, refreshLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', refreshLimiter, AuthController.refresh);

export default router;