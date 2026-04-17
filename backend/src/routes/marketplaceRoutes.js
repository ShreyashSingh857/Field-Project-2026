import { Router } from 'express';
import multer from 'multer';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateRequest.js';
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
import {
  approveListingSchema,
  banSellerSchema,
  marketplaceCreateSchema,
  marketplaceUpdateSchema,
  rejectListingSchema,
} from '../validation/schemas.js';

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
router.post('/', verifySupabaseAuth, upload.single('photo'), validateBody(marketplaceCreateSchema), createListing);
router.patch('/:id', verifySupabaseAuth, upload.single('photo'), validateBody(marketplaceUpdateSchema), updateListing);
router.delete('/:id', verifySupabaseAuth, deleteListing);

// Admin moderation endpoints
router.get('/moderation/queue', verifyAdminJWT, requireRole('zilla_parishad'), getPendingModerationQueue);
router.post('/:id/approve', verifyAdminJWT, requireRole('zilla_parishad'), validateBody(approveListingSchema), approveListing);
router.post('/:id/reject', verifyAdminJWT, requireRole('zilla_parishad'), validateBody(rejectListingSchema), rejectListing);
router.post('/sellers/:userId/ban', verifyAdminJWT, requireRole('zilla_parishad'), validateBody(banSellerSchema), banSeller);

export default router;
