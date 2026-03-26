import { supabaseAdmin } from '../config/supabase.js';

function applyTaskScope(query, { workerId, villageId }) {
	if (workerId && villageId) {
		return query.or(`assigned_worker_id.eq.${workerId},and(assigned_worker_id.is.null,village_id.eq.${villageId})`);
	}

	if (workerId) {
		return query.eq('assigned_worker_id', workerId);
	}

	if (villageId) {
		return query.eq('village_id', villageId);
	}

	return query;
}

export async function listTasksForWorker({ workerId, villageId, status }) {
	let query = supabaseAdmin
		.from('tasks')
		.select('*, bin:bins(id,label,fill_level,fill_status,location_lat,location_lng,location_address)')
		.order('created_at', { ascending: false });

	query = applyTaskScope(query, { workerId, villageId });

	if (status) {
		query = query.eq('status', status);
	}

	const { data, error } = await query;
	if (error) throw error;
	return data || [];
}

export async function getTaskById(taskId) {
	const { data, error } = await supabaseAdmin
		.from('tasks')
		.select('*, bin:bins(id,label,fill_level,fill_status,location_lat,location_lng,location_address)')
		.eq('id', taskId)
		.single();

	if (error) throw error;
	return data;
}

export async function startTaskById({ taskId, workerId }) {
	const { data, error } = await supabaseAdmin
		.from('tasks')
		.update({ status: 'in_progress', started_at: new Date().toISOString() })
		.eq('id', taskId)
		.eq('assigned_worker_id', workerId)
		.in('status', ['pending', 'assigned'])
		.select('*, bin:bins(id,label,fill_level,fill_status,location_lat,location_lng,location_address)')
		.single();

	if (error) throw error;
	return data;
}

export async function completeTaskById({ taskId, workerId, proofPhotoUrl }) {
	const updates = {
		status: 'done',
		completed_at: new Date().toISOString(),
	};

	if (proofPhotoUrl) {
		updates.proof_photo_url = proofPhotoUrl;
	}

	const { data, error } = await supabaseAdmin
		.from('tasks')
		.update(updates)
		.eq('id', taskId)
		.eq('assigned_worker_id', workerId)
		.in('status', ['in_progress', 'assigned'])
		.select('*, bin:bins(id,label,fill_level,fill_status,location_lat,location_lng,location_address)')
		.single();

	if (error) throw error;
	return data;
}

export async function insertTaskStatusLog({ taskId, previousStatus, nextStatus, changedBy }) {
	const { error } = await supabaseAdmin.from('task_status_log').insert({
		task_id: taskId,
		old_status: previousStatus,
		new_status: nextStatus,
		changed_by_worker: changedBy,
		changed_at: new Date().toISOString(),
	});

	if (error) {
		return false;
	}

	return true;
}
