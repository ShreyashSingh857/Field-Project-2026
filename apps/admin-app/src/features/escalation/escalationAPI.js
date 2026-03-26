import api from '../../services/axiosInstance';

export async function fetchOverdueItems() {
  const { data } = await api.get('/escalations');
  return data?.escalations || [];
}

export async function markResolved(escalationId) {
  const { data } = await api.patch(`/escalations/${escalationId}/resolve`);
  return data?.escalation || data;
}

export async function updateEscalationStatus(escalationId, status) {
  if (status === 'resolved') return markResolved(escalationId);
  const { data } = await api.patch(`/issues/${escalationId}`, { status });
  return data;
}

export async function getEscalationById(escalationId) {
  const list = await fetchOverdueItems();
  return list.find((e) => e.id === escalationId) || null;
}

export async function addEscalationComment(escalationId, commentData) {
  const { data } = await api.patch(`/issues/${escalationId}`, {
    rejection_reason: typeof commentData === 'string' ? commentData : commentData?.note,
  });
  return data;
}

export async function reassignWorker(escalationId, newWorkerId, notes) {
  const payload = { status: 'assigned', assigned_worker_id: newWorkerId };
  if (notes) payload.rejection_reason = notes;
  const { data } = await api.patch(`/issues/${escalationId}`, payload);
  return data;
}

export const markTaskResolved = markResolved;
export const reassignTask = reassignWorker;
export async function escalateTask(taskId, escalationReason) {
  const { data } = await api.patch(`/issues/${taskId}`, {
    status: 'assigned',
    rejection_reason: escalationReason,
  });
  return data;
}
export async function addResolutionNote(taskId, note) {
  const { data } = await api.patch(`/issues/${taskId}`, { rejection_reason: note });
  return data;
}
export async function getAvailableWorkers() {
  const { data } = await api.get('/workers');
  return data?.workers || [];
}
