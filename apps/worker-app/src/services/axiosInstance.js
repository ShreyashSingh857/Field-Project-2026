import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove stale client-side auth state before redirect.
      localStorage.removeItem('worker_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('worker_token');
      sessionStorage.removeItem('token');

      const currentPath = window.location.pathname || '/';
      const reqUrl = String(error.config?.url || '');
      const isAlreadyOnLogin = currentPath === '/login';
      const isAuthCall = reqUrl.includes('/workers/login') || reqUrl.includes('/workers/logout');

      if (!isAlreadyOnLogin && !isAuthCall) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
