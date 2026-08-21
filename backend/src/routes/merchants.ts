import { Router } from 'express';
import { MerchantsController } from '../controllers/merchants.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Dashboard-only (JWT) — API keys must not be able to mint or revoke other keys.
router.use(requireAuth);

router.get('/me', MerchantsController.getProfile);
router.put('/me', MerchantsController.updateProfile);
router.get('/me/stats', MerchantsController.getStats);
router.post('/me/public-key/rotate', MerchantsController.rotatePublicKey);
router.get('/me/api-keys', MerchantsController.listApiKeys);
router.post('/me/api-keys', MerchantsController.createApiKey);
router.delete('/me/api-keys/:id', MerchantsController.revokeApiKey);

export default router;
