import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchSubAdmins,
    createSubAdmin,
    deactivateSubAdmin,
    getHierarchyTree,
    updateSubAdmin,
    getSubAdminById,
} from './hierarchyAPI';

// Async Thunks
export const fetchSubAdminsThunk = createAsyncThunk(
    'hierarchy/fetchSubAdmins',
    async ({ adminId, adminRole }, { rejectWithValue }) => {
        try {
            return await fetchSubAdmins(adminId, adminRole);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const createSubAdminThunk = createAsyncThunk(
    'hierarchy/createSubAdmin',
    async ({ adminData, adminId, adminRole }, { rejectWithValue }) => {
        try {
            return await createSubAdmin(adminData, adminId, adminRole);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const deactivateSubAdminThunk = createAsyncThunk(
    'hierarchy/deactivateSubAdmin',
    async ({ subAdminId, deactivationReason }, { rejectWithValue }) => {
        try {
            return await deactivateSubAdmin(subAdminId, deactivationReason);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getHierarchyTreeThunk = createAsyncThunk(
    'hierarchy/getHierarchyTree',
    async ({ adminId, adminRole }, { rejectWithValue }) => {
        try {
            return await getHierarchyTree(adminId, adminRole);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateSubAdminThunk = createAsyncThunk(
    'hierarchy/updateSubAdmin',
    async ({ subAdminId, updates }, { rejectWithValue }) => {
        try {
            return await updateSubAdmin(subAdminId, updates);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getSubAdminByIdThunk = createAsyncThunk(
    'hierarchy/getSubAdminById',
    async (adminId, { rejectWithValue }) => {
        try {
            return await getSubAdminById(adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const hierarchySlice = createSlice({
    name: 'hierarchy',
    initialState: {
        admins: [],
        hierarchyTree: null,
        selectedAdmin: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedAdmin(state, action) {
            state.selectedAdmin = action.payload;
        },
        clearSelectedAdmin(state) {
            state.selectedAdmin = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch SubAdmins
        builder
            .addCase(fetchSubAdminsThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSubAdminsThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.admins = action.payload;
            })
            .addCase(fetchSubAdminsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create SubAdmin
        builder
            .addCase(createSubAdminThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createSubAdminThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.admins.push(action.payload);
            })
            .addCase(createSubAdminThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Deactivate SubAdmin
        builder
            .addCase(deactivateSubAdminThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deactivateSubAdminThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.admins.findIndex((a) => a.id === action.payload.id);
                if (index !== -1) {
                    state.admins[index] = action.payload;
                }
            })
            .addCase(deactivateSubAdminThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Hierarchy Tree
        builder
            .addCase(getHierarchyTreeThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getHierarchyTreeThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.hierarchyTree = action.payload;
            })
            .addCase(getHierarchyTreeThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update SubAdmin
        builder
            .addCase(updateSubAdminThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateSubAdminThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.admins.findIndex((a) => a.id === action.payload.id);
                if (index !== -1) {
                    state.admins[index] = action.payload;
                }
            })
            .addCase(updateSubAdminThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get SubAdmin By ID
        builder
            .addCase(getSubAdminByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getSubAdminByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedAdmin = action.payload;
            })
            .addCase(getSubAdminByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, setSelectedAdmin, clearSelectedAdmin } = hierarchySlice.actions;

// Selectors
export const selectHierarchyAdmins = (state) => state.hierarchy.admins;
export const selectHierarchyTree = (state) => state.hierarchy.hierarchyTree;
export const selectSelectedHierarchyAdmin = (state) => state.hierarchy.selectedAdmin;
export const selectHierarchyLoading = (state) => state.hierarchy.loading;
export const selectHierarchyError = (state) => state.hierarchy.error;
export const selectHierarchyAdminById = (state, adminId) =>
    state.hierarchy.admins.find((a) => a.id === adminId);
export const selectAdminsByRole = (state, role) =>
    state.hierarchy.admins.filter((a) => a.role === role);

export default hierarchySlice.reducer;
