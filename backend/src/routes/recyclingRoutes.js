// backend/src/routes/recyclingRoutes.js
import { Router } from 'express';
import {
  listRecyclingCenters, createRecyclingCenter,
  updateRecyclingCenter, deleteRecyclingCenter,
} from '../controllers/binsController.js';
import { verifyAdminKey } from '../middleware/verifyAdminKey.js';
import { validateBody } from '../middleware/validateRequest.js';
import { createRecyclingSchema, updateRecyclingSchema } from '../validation/schemas.js';

const router = Router();

router.get('/', listRecyclingCenters);
router.post('/', verifyAdminKey, validateBody(createRecyclingSchema), createRecyclingCenter);       // admin
router.patch('/:id', verifyAdminKey, validateBody(updateRecyclingSchema), updateRecyclingCenter);  // admin
router.delete('/:id', verifyAdminKey, deleteRecyclingCenter); // admin

export default router;
