import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { registerDevice, unregisterDevice, sendPushNotification, sendPushToUserById } from '../controllers/pushController';

const router = Router();

router.post('/register', authenticate, registerDevice);
router.post('/unregister', authenticate, unregisterDevice);
router.post('/send', authenticate, requireAdmin, sendPushNotification);
router.post('/send-to-user', authenticate, requireAdmin, sendPushToUserById);

export default router;
