import api from '../../services/axiosInstance';

export const scanWaste = async (imageFile) => {
	const formData = new FormData();
	formData.append('photo', imageFile);
	const { data } = await api.post('/ai/scan', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return data;
};
