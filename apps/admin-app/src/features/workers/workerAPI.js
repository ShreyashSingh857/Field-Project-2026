import api from '../../services/axiosInstance';

function normalizeError(err, fallback) {
  if (err.response?.status === 404) return new Error('Workers resource not found.');
  return new Error(err.response?.data?.error || err.message || fallback);
}

export async function fetchWorkers() {
  try {
    const { data } = await api.get('/workers');
    return data?.workers || [];
  } catch (err) {
    throw normalizeError(err, 'Failed to fetch workers');
  }
}

export async function createWorker(workerData) {
  try {
    const { data } = await api.post('/workers', workerData);
    return {
      ...(data?.worker || data || {}),
      temp_password: data?.temp_password,
    };
  } catch (err) {
    throw normalizeError(err, 'Failed to create worker');
  }
}

export async function fetchAssignedAreaOptions() {
  try {
    const { data } = await api.get('/workers/area-options');
    return data?.options || [];
  } catch (err) {
    throw normalizeError(err, 'Failed to fetch area options');
  }
}

export async function deactivateWorker(workerId) {
  try {
    const { data } = await api.patch(`/workers/${workerId}/status`, { is_active: false });
    return data?.worker || data;
  } catch (err) {
    throw normalizeError(err, 'Failed to deactivate worker');
  }
}

export async function updateWorker(workerId, updates) {
  try {
    const { data } = await api.patch(`/workers/${workerId}`, updates);
    return data?.worker || data;
  } catch (err) {
    throw normalizeError(err, 'Failed to update worker');
  }
}

export async function getWorkerById(workerId) {
  try {
    const { data } = await api.get(`/workers/${workerId}`);
    return data?.worker || data;
  } catch (err) {
    throw normalizeError(err, 'Failed to fetch worker');
  }
}
