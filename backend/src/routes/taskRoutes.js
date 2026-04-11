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
import { verifyToken } from '../services/jwtService.js';

const router = Router();

const verifyTaskReadAccess = async (req, res, next) => {
	const auth = req.headers.authorization || '';
	if (!auth.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'No token provided' });
	}
	const token = auth.slice(7);
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

router.post('/', verifyAdminJWT, createTaskByAdmin);
router.patch('/:id/status', verifyAdminJWT, updateTaskStatusByAdmin);

export default router;
