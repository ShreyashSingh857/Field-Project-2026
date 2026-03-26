import { Router } from 'express';
import { createAnnouncement, deleteAnnouncement, getAnnouncements, updateAnnouncement } from '../controllers/announcementController.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';

const router = Router();

// GET /api/announcements?village_id=...  (public — no auth required)
router.get('/', getAnnouncements);
router.post('/', verifyAdminJWT, createAnnouncement);
router.patch('/:id', verifyAdminJWT, updateAnnouncement);
router.delete('/:id', verifyAdminJWT, deleteAnnouncement);

export default router;
