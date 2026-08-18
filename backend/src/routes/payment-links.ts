import { Router } from 'express';
import { PaymentLinksController } from '../controllers/payment-links.controller.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';

const router = Router();

// Public routes for hosted link checkout
router.get('/public/:linkCode', PaymentLinksController.getPublicLink);
router.post('/public/:linkCode/checkout', PaymentLinksController.checkoutFromLink);

// Protected routes (Require JWT Bearer or X-API-Key)
router.use(requireAuthOrApiKey);

router.get('/', PaymentLinksController.listPaymentLinks);
router.post('/', PaymentLinksController.createPaymentLink);
router.get('/:id', PaymentLinksController.getPaymentLink);
router.put('/:id', PaymentLinksController.updatePaymentLink);
router.delete('/:id', PaymentLinksController.deletePaymentLink);

export default router;
