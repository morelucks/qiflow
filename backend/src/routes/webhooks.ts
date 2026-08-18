import { Router } from 'express';
import { WebhooksController } from '../controllers/webhooks.controller.js';
import { requireAuthOrApiKey } from '../middleware/auth.js';

const router = Router();

router.use(requireAuthOrApiKey);

router.post('/', WebhooksController.createWebhook);
router.get('/', WebhooksController.listWebhooks);
router.put('/:id', WebhooksController.updateWebhook);
router.delete('/:id', WebhooksController.deleteWebhook);
router.get('/deliveries', WebhooksController.listDeliveries);
router.post('/deliveries/:id/retry', WebhooksController.retryDelivery);

export default router;
