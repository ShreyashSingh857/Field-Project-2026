import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// REQUEST interceptor — attach Supabase JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// RESPONSE interceptor — handle 401 (token expired / logged out)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token may be expired — attempt a silent refresh
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        // Retry the original request once with the new token
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return axios(error.config);
      }
      // Refresh failed — sign out cleanly
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
