import api from '../../services/axiosInstance';

export async function loginWorkerWithSupabase(employee_id, password) {
  const { data } = await api.post('/workers/login', { employee_id, password });
  return { token: 'cookie', worker: data?.worker };
}

export async function getCurrentWorkerSession() {
  const { data } = await api.get('/workers/me');
  if (!data?.worker) return null;
  return { token: 'cookie', worker: data.worker };
}

export async function logoutWorkerSession() {
  await api.post('/workers/logout');
  return true;
}

export async function changeWorkerPassword(current_password, new_password) {
  const { data } = await api.patch('/workers/me/password', { current_password, new_password });
  return data;
}
