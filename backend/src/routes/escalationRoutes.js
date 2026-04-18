import { Router } from 'express';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { getEscalations, resolveEscalationById } from '../controllers/escalationController.js';
import { validateBody } from '../middleware/validateRequest.js';
import { escalationResolveSchema } from '../validation/schemas.js';

const router = Router();

router.get('/', verifyAdminJWT, getEscalations);
router.patch('/:id/resolve', verifyAdminJWT, validateBody(escalationResolveSchema), resolveEscalationById);

export default router;
