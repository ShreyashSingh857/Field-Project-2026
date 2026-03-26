import { Router } from 'express';
import multer from 'multer';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { getListings, createListing, deleteListing } from '../controllers/marketplaceController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'), false);
  },
});

router.get('/', verifySupabaseAuth, getListings);
router.post('/', verifySupabaseAuth, upload.single('photo'), createListing);
router.delete('/:id', verifySupabaseAuth, deleteListing);

export default router;
