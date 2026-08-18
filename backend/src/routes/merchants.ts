import { Router } from 'express';
import { MerchantsController } from '../controllers/merchants.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/me', MerchantsController.getProfile);
router.put('/me', MerchantsController.updateProfile);

export default router;
