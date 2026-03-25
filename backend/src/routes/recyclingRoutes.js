// backend/src/routes/recyclingRoutes.js
import { Router } from 'express';
import {
  listRecyclingCenters, createRecyclingCenter,
  updateRecyclingCenter, deleteRecyclingCenter,
} from '../controllers/binsController.js';
import { verifyAdminKey } from '../middleware/verifyAdminKey.js';

const router = Router();

router.get('/', listRecyclingCenters);
router.post('/', verifyAdminKey, createRecyclingCenter);       // admin
router.patch('/:id', verifyAdminKey, updateRecyclingCenter);  // admin
router.delete('/:id', verifyAdminKey, deleteRecyclingCenter); // admin

export default router;
