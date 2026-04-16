import { Router } from 'express';
import { getNotifications } from '../controllers/notificationController.js';

const router = Router();

router.get('/', getNotifications);

export default router;