import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getCurrentWorkerSession,
  loginWorkerWithSupabase,
  logoutWorkerSession,
} from './authAPI';

export const bootstrapSession = createAsyncThunk('auth/bootstrapSession', async () => {
  const session = await getCurrentWorkerSession();
  if (!session) return null;
  localStorage.setItem('worker_token', session.token);
  return session;
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const data = await loginWorkerWithSupabase(email, password);
      localStorage.setItem('worker_token', data.token);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await logoutWorkerSession();
  localStorage.removeItem('worker_token');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    worker: null,
    token: localStorage.getItem('worker_token') || null,
    loading: false,
    error: null,
    bootstrapped: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.worker = action.payload.worker;
          state.token = action.payload.token;
        }
        state.bootstrapped = true;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.worker = action.payload.worker;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.worker = null;
        state.token = null;
      });
  },
});

export default authSlice.reducer;
