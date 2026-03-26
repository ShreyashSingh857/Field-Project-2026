import api from '../../services/axiosInstance';

export async function loginWorkerWithSupabase(employee_id, password) {
  const { data } = await api.post('/workers/login', { employee_id, password });
  return { token: data?.token, worker: data?.worker };
}

export async function getCurrentWorkerSession() {
  const token = localStorage.getItem('worker_token');
  if (!token) return null;
  const { data } = await api.get('/workers/me');
  if (!data?.worker) return null;
  return { token, worker: data.worker };
}

export async function logoutWorkerSession() {
  return true;
}
