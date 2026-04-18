import { supabaseAdmin } from '../config/supabase.js';
import { calculateTaskDueAt, getSlaStatus } from './slaService.js';

function buildEscalationRecord(kind, row, dueAt, reason) {
	const status = getSlaStatus(dueAt, row.completed_at || null);
	return {
		kind,
		id: row.id,
		title: row.title || row.description?.slice(0, 80) || `${kind} escalation`,
		status: row.status,
		due_at: dueAt,
		sla_status: status,
		overdue: status === 'overdue',
		reason,
		location_address: row.location_address || null,
		village_id: row.village_id || null,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

export async function listOpenEscalations(limit = 100) {
	const [issuesRes, tasksRes] = await Promise.all([
		supabaseAdmin
			.from('issue_reports')
			.select('id,description,status,location_address,village_id,created_at,updated_at,created_task_id,reviewed_by,rejection_reason,priority')
			.in('status', ['open', 'assigned'])
			.order('created_at', { ascending: false })
			.limit(limit),
		supabaseAdmin
			.from('tasks')
			.select('id,title,description,status,due_at,completed_at,location_address,village_id,created_at,updated_at,priority')
			.in('status', ['pending', 'assigned', 'in_progress'])
			.order('created_at', { ascending: false })
			.limit(limit),
	]);
	if (issuesRes.error) throw issuesRes.error;
	if (tasksRes.error) throw tasksRes.error;

	const issues = (issuesRes.data || []).map((row) => {
		const dueAt = calculateTaskDueAt(row.priority || 2, row.created_at);
		return buildEscalationRecord('issue', row, dueAt, 'Open issue older than SLA threshold');
	}).filter((row) => row.sla_status === 'overdue');

	const tasks = (tasksRes.data || [])
		.map((row) => {
			const dueAt = row.due_at || calculateTaskDueAt(row.priority || 2, row.created_at);
			return buildEscalationRecord('task', row, dueAt, 'Task not completed before SLA deadline');
		})
		.filter((row) => row.sla_status === 'overdue');

	return [...issues, ...tasks].slice(0, limit);
}

export async function resolveEscalation(escalationId, adminId, kind = 'issue') {
	const table = kind === 'task' ? 'tasks' : 'issue_reports';
	const updates = kind === 'task'
		? { status: 'done', updated_at: new Date().toISOString() }
		: { status: 'resolved', reviewed_by: adminId, updated_at: new Date().toISOString() };

	const { data, error } = await supabaseAdmin
		.from(table)
		.update(updates)
		.eq('id', escalationId)
		.select('*')
		.single();
	if (error) throw error;
	return data;
}