import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchSLAStatus } from './slaAPI';

export const loadSLA = createAsyncThunk('sla/loadSLA', async (taskId, { rejectWithValue }) => {
	try {
		return await fetchSLAStatus(taskId);
	} catch (err) {
		return rejectWithValue(err.response?.data?.error || err.message || 'Failed to load SLA');
	}
});

const slaSlice = createSlice({
	name: 'sla',
	initialState: { data: null, loading: false, error: null },
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(loadSLA.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(loadSLA.fulfilled, (state, action) => {
				state.loading = false;
				state.data = action.payload;
			})
			.addCase(loadSLA.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export const selectSLA = (state) => state.sla;
export default slaSlice.reducer;
