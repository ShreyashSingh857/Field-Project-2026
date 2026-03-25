import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginAdminAPI } from './authAPI';

export const loginAdmin = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            // Demo credentials for development/testing
            if (email === 'demo@gramwaste.local' && password === 'Demo@123456') {
                const mockAdmin = {
                    id: 'admin-001',
                    name: 'Demo Admin',
                    email: 'demo@gramwaste.local',
                    role: 'panchayat_admin',
                    jurisdiction_name: 'Gokul Nagar',
                };
                localStorage.setItem('admin_user', JSON.stringify(mockAdmin));
                return mockAdmin;
            }

            return await loginAdminAPI(email, password);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        admin: JSON.parse(localStorage.getItem('admin_user')) || null,
        loading: false,
        error: null,
    },
    reducers: {
        logout(state) {
            state.admin = null;
            localStorage.removeItem('admin_user');
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
                state.admin = action.payload;
                localStorage.setItem('admin_user', JSON.stringify(action.payload));
            })
            .addCase(loginAdmin.rejected, (state, action) => {
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
