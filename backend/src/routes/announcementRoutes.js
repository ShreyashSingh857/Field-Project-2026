import { Router } from 'express';
import { getAnnouncements } from '../controllers/announcementController.js';

const router = Router();

// GET /api/announcements?village_id=...  (public — no auth required)
router.get('/', getAnnouncements);

export default router;
