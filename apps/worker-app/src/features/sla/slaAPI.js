import api from '../../services/axiosInstance';

export async function fetchSLAStatus(taskId) {
	const { data } = await api.get(`/tasks/${taskId}`);
	return {
		due_at: data?.due_at,
		created_at: data?.created_at,
		status: data?.status,
	};
}

export function getSLAColor(dueAt) {
	if (!dueAt) return '#16A34A';
	const now = new Date();
	const due = new Date(dueAt);
	const ms = due.getTime() - now.getTime();
	if (ms < 0) return '#DC2626';
	if (ms <= 24 * 60 * 60 * 1000) return '#D97706';
	return '#16A34A';
}
