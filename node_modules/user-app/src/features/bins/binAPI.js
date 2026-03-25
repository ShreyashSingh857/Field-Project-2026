import api from '../../services/axiosInstance';

export const getBins = (villageId) => {
	const path = villageId ? `/bins?village_id=${villageId}` : '/bins';
	return api.get(path).then((r) => r.data.bins || []);
};

export const getBinById = (id) => api.get(`/bins/${id}`).then((r) => r.data);

export const getRecyclingCenters = (villageId) => {
	const path = villageId ? `/recycling-centers?village_id=${villageId}` : '/recycling-centers';
	return api.get(path).then((r) => r.data.centers || []);
};
