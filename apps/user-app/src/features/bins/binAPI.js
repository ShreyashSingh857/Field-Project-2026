import api from '../../services/axiosInstance';

export const getBins = (villageId) => {
	const path = villageId ? `/bins?village_id=${villageId}` : '/bins';
	return api.get(path).then((r) => r.data.bins || []);
};

export const getBinById = (id) => api.get(`/bins/${id}`).then((r) => r.data);
