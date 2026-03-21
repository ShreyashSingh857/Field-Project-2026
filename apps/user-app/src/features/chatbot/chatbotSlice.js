import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { sendChatMessage } from './chatbotAPI';

export const sendMessage = createAsyncThunk('chatbot/send', async ({ message, history, language }, { rejectWithValue }) => {
	try { return await sendChatMessage(message, history, language); }
	catch (err) { return rejectWithValue(err.response?.data?.error || 'Failed to send message'); }
});

const chatbotSlice = createSlice({
	name: 'chatbot',
	initialState: { isOpen: false, messages: [], loading: false, error: null },
	reducers: {
		toggleChatbot: (s) => { s.isOpen = !s.isOpen; },
		closeChatbot: (s) => { s.isOpen = false; },
		addUserMessage: (s, a) => { s.messages.push({ role: 'user', content: a.payload, id: Date.now() }); },
		clearChat: (s) => { s.messages = []; },
	},
	extraReducers: (b) => {
		b.addCase(sendMessage.pending, (s) => { s.loading = true; s.error = null; });
		b.addCase(sendMessage.fulfilled, (s, a) => { s.messages.push({ role: 'assistant', content: a.payload.reply, id: Date.now() + 1 }); s.loading = false; });
		b.addCase(sendMessage.rejected, (s, a) => { s.error = a.payload; s.loading = false; });
	},
});

export const { toggleChatbot, closeChatbot, addUserMessage, clearChat } = chatbotSlice.actions;
export default chatbotSlice.reducer;
