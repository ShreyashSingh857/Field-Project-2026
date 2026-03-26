import api from '../../services/axiosInstance';

export async function fetchTasks(params = {}) {
  const { data } = await api.get('/tasks', { params });
  return data.tasks || [];
}

export async function fetchTaskById(taskId) {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data;
}

export async function startTaskRequest(taskId) {
  const { data } = await api.patch(`/tasks/${taskId}/start`);
  return data;
}

export async function completeTaskRequest(taskId, payload = {}) {
  const { data } = await api.patch(`/tasks/${taskId}/complete`, payload);
  return data;
}
