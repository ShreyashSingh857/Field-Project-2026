import { Router } from 'express';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { getEscalations, resolveEscalationById } from '../controllers/escalationController.js';

const router = Router();

router.get('/', verifyAdminJWT, getEscalations);
router.patch('/:id/resolve', verifyAdminJWT, resolveEscalationById);

export default router;
