import api from '../../services/axiosInstance';

export const loginAdminAPI = async (email, password) => {
    try {
        const { data } = await api.post('/admin/login', { email, password });
        return data;
    } catch (err) {
        throw new Error(err.response?.data?.error || err.message || 'Login failed');
    }
};

export function logoutAdmin() {
    api.post('/admin/logout').catch(() => {});
    localStorage.removeItem('admin_user');
}

export async function fetchCurrentAdmin() {
    const { data } = await api.get('/admin/me');
    return data?.admin;
}
