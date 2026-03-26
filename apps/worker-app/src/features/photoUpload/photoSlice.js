import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { uploadProofPhoto } from './photoAPI';

export const uploadPhoto = createAsyncThunk(
	'photoUpload/uploadPhoto',
	async ({ file, taskId }, { rejectWithValue }) => {
		try {
			return await uploadProofPhoto(file, taskId);
		} catch (err) {
			return rejectWithValue(err.response?.data?.error || err.message || 'Upload failed');
		}
	}
);

const photoUploadSlice = createSlice({
	name: 'photoUpload',
	initialState: { loading: false, error: null, uploadedUrl: null },
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(uploadPhoto.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(uploadPhoto.fulfilled, (state, action) => {
				state.loading = false;
				state.uploadedUrl = action.payload?.proof_photo_url || action.payload?.proofPhotoUrl || null;
			})
			.addCase(uploadPhoto.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});
	},
});

export default photoUploadSlice.reducer;
