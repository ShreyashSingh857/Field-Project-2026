import api from '../../services/axiosInstance';

export const getListings = (filters = {}) => {
	const params = new URLSearchParams();
	if (filters.villageId) params.set('village_id', filters.villageId);
	if (filters.mineOnly) params.set('mine', 'true');
	const query = params.toString();
	const path = query ? `/marketplace?${query}` : '/marketplace';
	return api.get(path).then((r) => r.data.listings || []);
};

export const createListing = (formData) =>
	api.post('/marketplace', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const deleteListing = (id) => api.delete(`/marketplace/${id}`).then((r) => r.data);
