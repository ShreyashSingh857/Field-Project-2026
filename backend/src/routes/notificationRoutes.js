import { Router } from 'express';
import { getNotifications, markAllAsRead, markNotificationAsRead } from '../controllers/notificationController.js';

const router = Router();

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.post('/read-all', markAllAsRead);

export default router;