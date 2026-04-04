// backend/src/routes/binsRoutes.js
import { Router } from 'express';
import {
  listBins, getBin, createBin, updateBin, deleteBin,
  listRecyclingCenters, createRecyclingCenter,
  updateRecyclingCenter, deleteRecyclingCenter,
} from '../controllers/binsController.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// ── Smart Bins ─────────────────────────────────────────────────────────────
router.get('/', listBins);
router.get('/:id', getBin);
router.post('/', verifyAdminJWT, requireRole('ward_member'), createBin);
router.patch('/:id', verifyAdminJWT, requireRole('ward_member'), updateBin);
router.delete('/:id', verifyAdminJWT, requireRole('ward_member'), deleteBin);

export default router;
