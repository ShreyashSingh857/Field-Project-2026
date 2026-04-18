import api from '../../services/axiosInstance';

function unwrapApiError(err) {
  const message = err?.response?.data?.error || err?.response?.data?.message || err?.message;
  throw new Error(message || 'Request failed');
}

export async function loginWorkerWithSupabase(employee_id, password) {
  try {
    const { data } = await api.post('/workers/login', { employee_id, password });
    return { token: 'cookie', worker: data?.worker };
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function getCurrentWorkerSession() {
  try {
    const { data } = await api.get('/workers/me');
    if (!data?.worker) return null;
    return { token: 'cookie', worker: data.worker };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      return null;
    }
    return unwrapApiError(err);
  }
}

export async function logoutWorkerSession() {
  try {
    await api.post('/workers/logout');
    return true;
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function changeWorkerPassword(current_password, new_password) {
  try {
    const { data } = await api.patch('/workers/me/password', { current_password, new_password });
    return data;
  } catch (err) {
    return unwrapApiError(err);
  }
}
