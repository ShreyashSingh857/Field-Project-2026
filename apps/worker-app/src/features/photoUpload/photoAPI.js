import api from '../../services/axiosInstance';

export async function uploadProofPhoto(file, taskId) {
	const formData = new FormData();
	if (file) {
		formData.append('proof_photo', file);
	}

	const { data } = await api.post(`/tasks/${taskId}/complete`, formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});

	return data;
}
