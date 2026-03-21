import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

api.interceptors.request.use(async (config) => {
	const { data: { session } } = await supabase.auth.getSession();
	if (session?.access_token) config.headers.Authorization = `Bearer ${session.access_token}`;
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			supabase.auth.signOut();
			window.location.href = '/login';
		}
		return Promise.reject(error);
	},
);

export default api;
