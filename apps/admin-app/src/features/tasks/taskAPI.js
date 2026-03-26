import api from '../../services/axiosInstance';

export async function fetchTasks() {
  const { data } = await api.get('/tasks');
  return data?.tasks || [];
}

export async function createTask(taskData) {
  const { data } = await api.post('/tasks', taskData);
  return data;
}

export async function assignWorker(taskId, workerId) {
  const { data } = await api.patch(`/tasks/${taskId}/status`, { status: 'assigned', assigned_worker_id: workerId });
  return data;
}

export async function cancelTask(taskId) {
  const { data } = await api.patch(`/tasks/${taskId}/status`, { status: 'cancelled' });
  return data;
}

export async function updateTaskStatus(taskId, status) {
  const { data } = await api.patch(`/tasks/${taskId}/status`, { status });
  return data;
}

export async function getTaskById(taskId) {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data;
}
