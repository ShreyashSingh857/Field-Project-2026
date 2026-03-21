import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createListing, getListings } from './marketplaceAPI';

export const fetchListings = createAsyncThunk('marketplace/fetch', async (villageId, { rejectWithValue }) => {
	try { return await getListings(villageId); }
	catch (err) { return rejectWithValue(err.response?.data?.error || 'Failed to load listings'); }
});

export const addListing = createAsyncThunk('marketplace/add', async (payload, { rejectWithValue }) => {
	try {
		const formData = new FormData();
		formData.append('title', payload.name);
		formData.append('description', payload.description || '');
		formData.append('price', payload.price);
		formData.append('contact_number', payload.contact || '');
		if (payload.photo) formData.append('photo', payload.photo);
		return await createListing(formData);
	} catch (err) {
		return rejectWithValue(err.response?.data?.error || 'Failed to create listing');
	}
});

const marketplaceSlice = createSlice({
	name: 'marketplace',
	initialState: { listings: [], loading: false, error: null },
	reducers: {},
	extraReducers: (b) => {
		b.addCase(fetchListings.pending, (s) => { s.loading = true; s.error = null; });
		b.addCase(fetchListings.fulfilled, (s, a) => { s.listings = a.payload; s.loading = false; });
		b.addCase(fetchListings.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
		b.addCase(addListing.fulfilled, (s, a) => { s.listings = [a.payload, ...s.listings]; });
	},
});

export default marketplaceSlice.reducer;
