import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { scanWaste } from './aidetectionAPI';

export const runScan = createAsyncThunk('ai/scan', async (imageFile, { rejectWithValue }) => {
	try { return await scanWaste(imageFile); }
	catch (err) { return rejectWithValue(err.response?.data?.error || 'Scan failed'); }
});

const aidetectionSlice = createSlice({
	name: 'aidetection',
	initialState: { result: null, loading: false, error: null },
	reducers: { clearResult: (s) => { s.result = null; s.error = null; } },
	extraReducers: (b) => {
		b.addCase(runScan.pending, (s) => { s.loading = true; s.error = null; });
		b.addCase(runScan.fulfilled, (s, a) => { s.result = a.payload; s.loading = false; });
		b.addCase(runScan.rejected, (s, a) => { s.error = a.payload; s.loading = false; });
	},
});

export const { clearResult } = aidetectionSlice.actions;
export default aidetectionSlice.reducer;
