import { Router } from 'express';
import {
	completeTask,
	completeTaskUpload,
	getTask,
	listTasks,
	startTask,
} from '../controllers/taskController.js';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';

const router = Router();

router.use(verifySupabaseAuth);

router.get('/', listTasks);
router.get('/:id', getTask);
router.patch('/:id/start', startTask);
router.patch('/:id/complete', completeTaskUpload, completeTask);

export default router;
