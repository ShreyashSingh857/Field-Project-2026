import api from '../../services/axiosInstance';

export const sendChatMessage = async (message, history, language = 'en') => {
	const { data } = await api.post('/ai/chat', { message, history, language });
	return data;
};
