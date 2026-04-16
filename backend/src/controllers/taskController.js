import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import { calculateTaskDueAt } from '../services/slaService.js';
import {
	completeTaskById,
	getTaskById,
	insertTaskStatusLog,
	listTasksForWorker,
	startTaskById,
} from '../models/taskModel.js';

const upload = multer({ storage: multer.memoryStorage() });
export const completeTaskUpload = upload.fields([
	{ name: 'before_photo', maxCount: 1 },
	{ name: 'after_photo', maxCount: 1 },
	{ name: 'proof_photo', maxCount: 1 },
]);

function getWorkerContext(req) {
	const userMetadata = req.user?.user_metadata || {};
	const workerId = req.worker?.id || userMetadata.worker_id || null;
	const villageId = req.worker?.village_id || userMetadata.village_id || null;
	return { workerId, villageId };
}

async function getVillageIdsForAdmin(admin) {
	let query = supabaseAdmin.from('villages').select('id');
	if (admin.role === 'zilla_parishad') query = query.eq('district', admin.jurisdiction_name);
	if (admin.role === 'block_samiti') query = query.eq('block_name', admin.jurisdiction_name);
	if (admin.role === 'gram_panchayat') query = query.eq('gram_panchayat_name', admin.jurisdiction_name);
	const { data } = await query;
	return (data || []).map((v) => v.id);
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

	const publicUrl = supabaseAdmin.storage.from('task-proofs').getPublicUrl(safeName).data?.publicUrl;
	return publicUrl || safeName;
}

export async function listTasks(req, res) {
	try {
		if (req.admin?.type === 'admin') {
			let query = supabaseAdmin
				.from('tasks')
				.select('*, bin:bins(id,label,fill_level,fill_status,location_lat,location_lng,location_address)')
				.order('created_at', { ascending: false });

			if (req.admin.role === 'ward_member') {
				query = query.eq('created_by_admin_id', req.admin.id);
			} else {
				const villageIds = await getVillageIdsForAdmin(req.admin);
				if (!villageIds.length) return res.json({ tasks: [] });
				query = query.in('village_id', villageIds);
			}

			if (req.query.status) query = query.eq('status', req.query.status);
			const { data, error } = await query;
			if (error) throw error;
			return res.json({ tasks: data || [] });
		}

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
		const beforeFile = req.files?.before_photo?.[0] || null;
		const afterFile = req.files?.after_photo?.[0] || null;
		const legacyFile = req.files?.proof_photo?.[0] || null;

		const beforePhotoUrl = await uploadTaskProof(beforeFile, req.params.id);
		const afterPhotoUrl = await uploadTaskProof(afterFile, req.params.id);
		const legacyProofUrl = await uploadTaskProof(legacyFile, req.params.id);

		let proofPhotoUrl = req.body?.proof_photo_url || legacyProofUrl;
		if (beforePhotoUrl || afterPhotoUrl) {
			proofPhotoUrl = JSON.stringify({
				before_photo_url: beforePhotoUrl || null,
				after_photo_url: afterPhotoUrl || null,
				proof_photo_url: legacyProofUrl || null,
			});
		}
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

export async function createTaskByAdmin(req, res) {
	try {
		const assignedWorkerId = req.body?.assigned_worker_id || null;
		const sourceIssueId = req.body?.source_issue_id || null;
		const payload = {
			type: req.body?.type || 'other',
			title: req.body?.title,
			description: req.body?.description || null,
			location_lat: req.body?.location_lat,
			location_lng: req.body?.location_lng,
			location_address: req.body?.location_address || null,
			status: assignedWorkerId ? 'assigned' : 'pending',
			priority: req.body?.priority || 2,
			assigned_worker_id: assignedWorkerId,
			village_id: req.body?.village_id || null,
			bin_id: req.body?.bin_id || null,
			source_issue_id: sourceIssueId,
			due_at: req.body?.due_at || calculateTaskDueAt(req.body?.priority || 2),
			created_by_admin_id: req.admin.id,
		};

		if (sourceIssueId) {
			const { data: issue } = await supabaseAdmin
				.from('issue_reports')
				.select('description,location_lat,location_lng,location_address,village_id')
				.eq('id', sourceIssueId)
				.maybeSingle();

			if (issue) {
				payload.title = payload.title || issue.description?.slice(0, 120) || 'Issue Resolution Task';
				payload.description = payload.description || issue.description || null;
				payload.location_lat = payload.location_lat ?? issue.location_lat;
				payload.location_lng = payload.location_lng ?? issue.location_lng;
				payload.location_address = payload.location_address || issue.location_address || null;
				payload.village_id = payload.village_id || issue.village_id || null;
			}
		}

		if (!payload.title || payload.location_lat == null || payload.location_lng == null) {
			return res.status(400).json({ error: 'title, location_lat and location_lng are required' });
		}

		const { data, error } = await supabaseAdmin.from('tasks').insert(payload).select('*').single();
		if (error) throw error;
		if (sourceIssueId) {
			await supabaseAdmin.from('issue_reports').update({ status: 'assigned', created_task_id: data.id, updated_at: new Date().toISOString() }).eq('id', sourceIssueId);
		}
		return res.status(201).json(data);
	} catch (error) {
		return res.status(500).json({ error: error.message || 'Failed to create task' });
	}
}

export async function updateTaskStatusByAdmin(req, res) {
	try {
		const { status, assigned_worker_id } = req.body || {};
		if (!status) return res.status(400).json({ error: 'status is required' });

		const updates = { status, updated_at: new Date().toISOString() };
		if (assigned_worker_id !== undefined) {
			updates.assigned_worker_id = assigned_worker_id;
		}

		const { data, error } = await supabaseAdmin
			.from('tasks')
			.update(updates)
			.eq('id', req.params.id)
			.select('*')
			.single();
		if (error) throw error;
		return res.json(data);
	} catch (error) {
		return res.status(500).json({ error: error.message || 'Failed to update task status' });
	}
}
