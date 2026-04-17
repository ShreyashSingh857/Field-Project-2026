// backend/src/routes/binsRoutes.js
import { Router } from 'express';
import {
  listBins, getBin, reverseGeocodeBinLocation, createBin, updateBin, deleteBin,
  listRecyclingCenters, createRecyclingCenter,
  updateRecyclingCenter, deleteRecyclingCenter,
} from '../controllers/binsController.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validateRequest.js';
import { createBinSchema, updateBinSchema } from '../validation/schemas.js';

const router = Router();

// ── Smart Bins ─────────────────────────────────────────────────────────────
router.get('/', listBins);
router.get('/reverse-geocode', reverseGeocodeBinLocation);
router.get('/:id', getBin);
router.post('/', verifyAdminJWT, requireRole('ward_member'), validateBody(createBinSchema), createBin);
router.patch('/:id', verifyAdminJWT, requireRole('ward_member'), validateBody(updateBinSchema), updateBin);
router.delete('/:id', verifyAdminJWT, requireRole('ward_member'), deleteBin);

export default router;
