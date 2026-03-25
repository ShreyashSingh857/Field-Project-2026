import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getBinById, getBins, getRecyclingCenters } from './binAPI';

export const fetchBins = createAsyncThunk('bins/fetchAll', async (villageId, { rejectWithValue }) => {
	try { return await getBins(villageId); }
	catch (err) { return rejectWithValue(err.response?.data?.error || 'Failed to load bins'); }
});

export const fetchBinById = createAsyncThunk('bins/fetchOne', async (id, { rejectWithValue }) => {
	try { return await getBinById(id); }
	catch (err) { return rejectWithValue(err.response?.data?.error || 'Failed to load bin'); }
});

export const fetchRecyclingCenters = createAsyncThunk('bins/fetchCenters', async (villageId, { rejectWithValue }) => {
	try { return await getRecyclingCenters(villageId); }
	catch (err) { return rejectWithValue(err.response?.data?.error || 'Failed to load recycling centers'); }
});

const binSlice = createSlice({
	name: 'bins',
	initialState: { items: [], recyclingCenters: [], selectedBin: null, loading: false, error: null },
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(fetchBins.pending, (s) => { s.loading = true; s.error = null; });
		builder.addCase(fetchBins.fulfilled, (s, a) => { s.items = a.payload; s.loading = false; });
		builder.addCase(fetchBins.rejected, (s, a) => { s.error = a.payload; s.loading = false; });
		builder.addCase(fetchBinById.fulfilled, (s, a) => { s.selectedBin = a.payload; });
		builder.addCase(fetchRecyclingCenters.fulfilled, (s, a) => { s.recyclingCenters = a.payload; });
	},
});

export default binSlice.reducer;
