import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCurrentAdmin, loginAdminAPI, logoutAdmin } from './authAPI';

const getInitialAdmin = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('admin_user'));
        if (stored && typeof stored.id === 'string' && stored.id.length === 36) {
            return stored;
        }
        if (stored) {
            localStorage.removeItem('admin_user');
        }
    } catch (e) {
        // ignore parse errors
    }
    return null;
};

export const loginAdmin = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            return await loginAdminAPI(email, password);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const initAdmin = createAsyncThunk('auth/initAdmin', async (_, { rejectWithValue }) => {
    try {
        return await fetchCurrentAdmin();
    } catch (err) {
        return rejectWithValue(err.message || 'Failed to restore session');
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        admin: getInitialAdmin(),
        loading: false,
        error: null,
    },
    reducers: {
        logout(state) {
            state.admin = null;
            logoutAdmin();
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginAdmin.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginAdmin.fulfilled, (state, action) => {
                state.loading = false;
                state.admin = action.payload.admin;
                localStorage.setItem('admin_user', JSON.stringify(action.payload.admin));
                if (action.payload.token) {
                  localStorage.setItem('admin_token', action.payload.token);
                }
            })
            .addCase(loginAdmin.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(initAdmin.pending, (state) => {
                state.loading = true;
            })
            .addCase(initAdmin.fulfilled, (state, action) => {
                state.loading = false;
                state.admin = action.payload;
                localStorage.setItem('admin_user', JSON.stringify(action.payload));
            })
            .addCase(initAdmin.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { logout, clearError } = authSlice.actions;
export const selectAdmin = (state) => state.auth.admin;
export const selectRole = (state) => state.auth.admin?.role;
export const selectAdminId = (state) => state.auth.admin?.id;
export const selectJurisdiction = (state) => state.auth.admin?.jurisdiction_name;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export default authSlice.reducer;
