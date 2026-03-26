import api from '../../services/axiosInstance';

export async function fetchDashboardStats() {
	const [binsRes, tasksRes, issuesRes, workersRes] = await Promise.allSettled([
		api.get('/bins'),
		api.get('/tasks'),
		api.get('/issues'),
		api.get('/workers'),
	]);

	const bins = binsRes.status === 'fulfilled' ? binsRes.value.data?.bins || [] : [];
	const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data?.tasks || [] : [];
	const issues = issuesRes.status === 'fulfilled' ? issuesRes.value.data?.issues || [] : [];
	const workers = workersRes.status === 'fulfilled' ? workersRes.value.data?.workers || [] : [];
	const now = Date.now();
	const workerNameById = Object.fromEntries(workers.map((w) => [w.id, w.name || w.employee_id || 'Worker']));

	const binsNeedingAttention = bins.filter((b) => {
		const fillLevel = Number(b.fill_level ?? 0);
		const fillStatus = String(b.fill_status || '').toLowerCase();
		return fillLevel >= 80 || ['high', 'full', 'overflow'].includes(fillStatus);
	}).length;

	const recentActivity = [
		...tasks.slice(0, 5).map((task) => ({
			id: `task-${task.id}`,
			type: 'task',
			description: task.title || 'Task',
			location: task.location_address || 'N/A',
			status: task.status || 'pending',
			time: task.updated_at || task.created_at,
		})),
		...issues.slice(0, 5).map((issue) => ({
			id: `issue-${issue.id}`,
			type: 'issue',
			description: issue.description || 'Issue report',
			location: issue.location_address || 'N/A',
			status: issue.status || 'open',
			time: issue.updated_at || issue.created_at,
		})),
	]
		.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
		.slice(0, 8);

	const overdueItems = tasks
		.filter((task) => task.due_at && !['done', 'cancelled'].includes(task.status))
		.filter((task) => new Date(task.due_at).getTime() < now)
		.map((task) => {
			const daysOverdue = Math.max(1, Math.floor((now - new Date(task.due_at).getTime()) / 86400000));
			return {
				id: task.id,
				title: task.title || 'Task',
				workerName: task.assigned_worker_id ? workerNameById[task.assigned_worker_id] || 'Unassigned' : 'Unassigned',
				daysOverdue,
			};
		})
		.slice(0, 5);

	return {
		totalBins: bins.length,
		binsNeedingAttention,
		activeTasks: tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
		openIssues: issues.filter((i) => i.status === 'open').length,
		totalWorkers: workers.length,
		recentActivity,
		overdueItems,
	};
}
