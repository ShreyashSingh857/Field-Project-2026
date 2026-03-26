import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import {
	completeTaskById,
	getTaskById,
	insertTaskStatusLog,
	listTasksForWorker,
	startTaskById,
} from '../models/taskModel.js';

const upload = multer({ storage: multer.memoryStorage() });
export const completeTaskUpload = upload.single('proof_photo');

function getWorkerContext(req) {
	const userMetadata = req.user?.user_metadata || {};
	const workerId = userMetadata.worker_id || req.query.worker_id || req.body.worker_id;
	const villageId = userMetadata.village_id || req.query.village_id || req.body.village_id;
	return { workerId, villageId };
}

async function uploadTaskProof(file, taskId) {
	if (!file) return null;

	const safeName = `${taskId}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
	const { error } = await supabaseAdmin.storage
		.from('task-proofs')
		.upload(safeName, file.buffer, { contentType: file.mimetype, upsert: true });

	if (error) {
		throw new Error(error.message || 'Failed to upload proof photo');
	}

	return safeName;
}

export async function listTasks(req, res) {
	try {
		const { workerId, villageId } = getWorkerContext(req);
		const tasks = await listTasksForWorker({
			workerId,
			villageId,
			status: req.query.status,
		});

		return res.json({ tasks });
	} catch (error) {
		return res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
	}
}

export async function getTask(req, res) {
	try {
		const task = await getTaskById(req.params.id);
		return res.json(task);
	} catch (error) {
		return res.status(404).json({ error: error.message || 'Task not found' });
	}
}

export async function startTask(req, res) {
	try {
		const { workerId } = getWorkerContext(req);
		if (!workerId) {
			return res.status(400).json({ error: 'Missing worker context in token metadata or request' });
		}

		const existingTask = await getTaskById(req.params.id);
		const task = await startTaskById({ taskId: req.params.id, workerId });

		if (!task) {
			return res.status(400).json({ error: 'Task cannot be started in current state' });
		}

		await insertTaskStatusLog({
			taskId: req.params.id,
			previousStatus: existingTask.status,
			nextStatus: 'in_progress',
			changedBy: req.user?.id || workerId,
		});

		return res.json(task);
	} catch (error) {
		return res.status(500).json({ error: error.message || 'Failed to start task' });
	}
}

export async function completeTask(req, res) {
	try {
		const { workerId } = getWorkerContext(req);
		if (!workerId) {
			return res.status(400).json({ error: 'Missing worker context in token metadata or request' });
		}

		const existingTask = await getTaskById(req.params.id);
		const uploadedPath = await uploadTaskProof(req.file, req.params.id);
		const proofPhotoUrl = req.body?.proof_photo_url || uploadedPath;
		const task = await completeTaskById({
			taskId: req.params.id,
			workerId,
			proofPhotoUrl,
		});

		if (!task) {
			return res.status(400).json({ error: 'Task cannot be completed in current state' });
		}

		await insertTaskStatusLog({
			taskId: req.params.id,
			previousStatus: existingTask.status,
			nextStatus: 'done',
			changedBy: req.user?.id || workerId,
		});

		return res.json(task);
	} catch (error) {
		return res.status(500).json({ error: error.message || 'Failed to complete task' });
	}
}
