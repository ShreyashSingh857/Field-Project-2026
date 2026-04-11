import { supabaseAdmin } from '../config/supabase.js';

function tally(rows, field) {
	return rows.reduce((acc, row) => ((acc[row?.[field] || 'unknown'] = (acc[row?.[field] || 'unknown'] || 0) + 1), acc), {});
}

export async function buildOperationalSummary() {
	const [issuesRes, tasksRes] = await Promise.all([
		supabaseAdmin.from('issue_reports').select('status,created_at,updated_at'),
		supabaseAdmin.from('tasks').select('status,due_at,completed_at,created_at'),
	]);
	if (issuesRes.error) throw issuesRes.error;
	if (tasksRes.error) throw tasksRes.error;
	return {
		issues: tally(issuesRes.data || [], 'status'),
		tasks: tally(tasksRes.data || [], 'status'),
	};
}