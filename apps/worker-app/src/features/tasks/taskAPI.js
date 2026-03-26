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
  const hasFiles = payload?.beforePhotoFile || payload?.afterPhotoFile || payload?.proofPhotoFile;
  if (hasFiles) {
    const formData = new FormData();
    if (payload.beforePhotoFile) formData.append('before_photo', payload.beforePhotoFile);
    if (payload.afterPhotoFile) formData.append('after_photo', payload.afterPhotoFile);
    if (payload.proofPhotoFile) formData.append('proof_photo', payload.proofPhotoFile);
    const { data } = await api.patch(`/tasks/${taskId}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.patch(`/tasks/${taskId}/complete`, payload);
  return data;
}
