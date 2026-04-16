const SLA_HOURS = { 1: 24, 2: 72, 3: 168 };

export function calculateTaskDueAt(priority = 2, baseTime = new Date()) {
	const due = new Date(baseTime);
	due.setHours(due.getHours() + (SLA_HOURS[priority] || SLA_HOURS[2]));
	return due.toISOString();
}

export function getSlaStatus(dueAt, completedAt = null, now = new Date()) {
	if (completedAt) return 'completed';
	if (!dueAt) return 'unknown';
	const remaining = new Date(dueAt).getTime() - new Date(now).getTime();
	if (remaining < 0) return 'overdue';
	if (remaining <= 24 * 60 * 60 * 1000) return 'due_soon';
	return 'on_track';
}