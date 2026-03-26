import { Router } from 'express';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { updateUser } from '../controllers/userController.js';

const router = Router();

router.patch('/:id', verifySupabaseAuth, updateUser);

export default router;
