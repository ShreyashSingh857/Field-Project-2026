import api from '../../services/axiosInstance';

export const getListings = (villageId) => {
	const path = villageId ? `/marketplace?village_id=${villageId}` : '/marketplace';
	return api.get(path).then((r) => r.data.listings || []);
};

export const createListing = (formData) =>
	api.post('/marketplace', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const deleteListing = (id) => api.delete(`/marketplace/${id}`).then((r) => r.data);
