import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const submitTxLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many transaction submissions. Please wait a moment and try again.',
});

// Public routes for the hosted checkout page
router.get('/public/code/:code', PaymentsController.getPublicPayment);
router.post('/public/code/:code/tx', submitTxLimiter, PaymentsController.submitTransaction);

// Protected routes (Require JWT Bearer or X-API-Key)
router.use(requireAuthOrApiKey);

router.post('/', PaymentsController.createPayment);
router.get('/', PaymentsController.listPayments);
router.get('/:id', PaymentsController.getPayment);
router.post('/:id/simulate', PaymentsController.simulatePayment);

export default router;
