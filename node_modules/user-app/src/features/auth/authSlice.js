import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getSession, signOut } from './authAPI';

export const initAuth = createAsyncThunk('auth/init', async () => {
	const { data: { session } } = await getSession();
	return session?.user ?? null;
});

export const logout = createAsyncThunk('auth/logout', async () => {
	await signOut();
});

const authSlice = createSlice({
	name: 'auth',
	initialState: { user: null, loading: true, error: null },
	reducers: {
		setUser: (state, action) => {
			state.user = action.payload;
			state.loading = false;
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(initAuth.pending, (state) => { state.loading = true; });
		builder.addCase(initAuth.fulfilled, (state, action) => { state.user = action.payload; state.loading = false; });
		builder.addCase(initAuth.rejected, (state, action) => {
			state.loading = false;
			state.error = action.error?.message || 'Failed to initialize auth';
		});
		builder.addCase(logout.fulfilled, (state) => { state.user = null; state.loading = false; });
	},
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
