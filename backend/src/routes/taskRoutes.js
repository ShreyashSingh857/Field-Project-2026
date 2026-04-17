import { Router } from 'express';
import {
	completeTask,
	completeTaskUpload,
	createTaskByAdmin,
	getTask,
	listTasks,
	startTask,
	updateTaskStatusByAdmin,
} from '../controllers/taskController.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { verifyWorkerJWT } from '../middleware/verifyWorkerJWT.js';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { validateBody } from '../middleware/validateRequest.js';
import { verifyToken } from '../services/jwtService.js';
import { getRequestToken } from '../utils/authToken.js';
import { taskCreateSchema, taskStatusUpdateSchema } from '../validation/schemas.js';

const router = Router();

const verifyTaskReadAccess = async (req, res, next) => {
  const token = getRequestToken(req);
  if (!token) {
		return res.status(401).json({ error: 'No token provided' });
	}

	try {
		const decoded = verifyToken(token);
		if (decoded?.type === 'admin') {
			req.admin = decoded;
			return next();
		}
		if (decoded?.type === 'worker') {
			req.worker = decoded;
			return next();
		}
	} catch (_e) {
		// fall through
	}
	return verifySupabaseAuth(req, res, next);
};

router.get('/', verifyTaskReadAccess, listTasks);
router.get('/:id', verifyTaskReadAccess, getTask);
router.patch('/:id/start', verifyWorkerJWT, startTask);
router.patch('/:id/complete', verifyWorkerJWT, completeTaskUpload, completeTask);

router.post('/', verifyAdminJWT, validateBody(taskCreateSchema), createTaskByAdmin);
router.patch('/:id/status', verifyAdminJWT, validateBody(taskStatusUpdateSchema), updateTaskStatusByAdmin);

export default router;
