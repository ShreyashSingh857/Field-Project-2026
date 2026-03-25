// backend/src/routes/binsRoutes.js
import { Router } from 'express';
import {
  listBins, getBin, createBin, updateBin, deleteBin,
  listRecyclingCenters, createRecyclingCenter,
  updateRecyclingCenter, deleteRecyclingCenter,
} from '../controllers/binsController.js';
import { verifyAdminKey } from '../middleware/verifyAdminKey.js';

const router = Router();

// ── Smart Bins ─────────────────────────────────────────────────────────────
router.get('/', listBins);
router.get('/:id', getBin);
router.post('/', verifyAdminKey, createBin);         // admin
router.patch('/:id', verifyAdminKey, updateBin);     // admin
router.delete('/:id', verifyAdminKey, deleteBin);    // admin

export default router;
