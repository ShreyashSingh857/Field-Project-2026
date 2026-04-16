import { Router } from 'express';
import multer from 'multer';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  getListings,
  createListing,
  updateListing,
  deleteListing,
  getPendingModerationQueue,
  approveListing,
  rejectListing,
  banSeller,
} from '../controllers/marketplaceController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'), false);
  },
});

// User endpoints
router.get('/', verifySupabaseAuth, getListings);
router.post('/', verifySupabaseAuth, upload.single('photo'), createListing);
router.patch('/:id', verifySupabaseAuth, upload.single('photo'), updateListing);
router.delete('/:id', verifySupabaseAuth, deleteListing);

// Admin moderation endpoints
router.get('/moderation/queue', verifyAdminJWT, requireRole('zilla_parishad'), getPendingModerationQueue);
router.post('/:id/approve', verifyAdminJWT, requireRole('zilla_parishad'), approveListing);
router.post('/:id/reject', verifyAdminJWT, requireRole('zilla_parishad'), rejectListing);
router.post('/sellers/:userId/ban', verifyAdminJWT, requireRole('zilla_parishad'), banSeller);

export default router;
