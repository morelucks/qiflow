import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';

const router = Router();

// Public route for hosted checkout page lookup
router.get('/public/code/:code', PaymentsController.getPublicPayment);

// Protected routes (Require JWT Bearer or X-API-Key)
router.use(requireAuthOrApiKey);

router.post('/', PaymentsController.createPayment);
router.get('/', PaymentsController.listPayments);
router.get('/:id', PaymentsController.getPayment);
router.post('/:id/simulate', PaymentsController.simulatePayment);

export default router;
