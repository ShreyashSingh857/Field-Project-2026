import { Router } from 'express';
import { createAnnouncement, deleteAnnouncement, getAnnouncements, updateAnnouncement } from '../controllers/announcementController.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { validateBody } from '../middleware/validateRequest.js';
import { announcementCreateSchema, announcementUpdateSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/announcements?village_id=...  (public — no auth required)
router.get('/', getAnnouncements);
router.post('/', verifyAdminJWT, validateBody(announcementCreateSchema), createAnnouncement);
router.patch('/:id', verifyAdminJWT, validateBody(announcementUpdateSchema), updateAnnouncement);
router.delete('/:id', verifyAdminJWT, deleteAnnouncement);

export default router;
