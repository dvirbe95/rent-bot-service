import { Router } from 'express';
import { NotificationController } from '../notification.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();

router.get('/my', webAuth, NotificationController.getMyNotifications);
router.post('/test', webAuth, NotificationController.createTestNotification);
router.put('/:id/read', webAuth, NotificationController.markAsRead);
router.put('/read-all', webAuth, NotificationController.markAllAsRead);

export default router;
