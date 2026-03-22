import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchWorkers,
    createWorker,
    deactivateWorker,
    updateWorker,
    getWorkerById,
} from './workerAPI';

// Async Thunks
export const fetchWorkersThunk = createAsyncThunk(
    'workers/fetchWorkers',
    async ({ adminId, scope }, { rejectWithValue }) => {
        try {
            return await fetchWorkers(adminId, scope);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const createWorkerThunk = createAsyncThunk(
    'workers/createWorker',
    async ({ workerData, adminId }, { rejectWithValue }) => {
        try {
            return await createWorker(workerData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const deactivateWorkerThunk = createAsyncThunk(
    'workers/deactivateWorker',
    async ({ workerId, deactivationReason }, { rejectWithValue }) => {
        try {
            return await deactivateWorker(workerId, deactivationReason);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateWorkerThunk = createAsyncThunk(
    'workers/updateWorker',
    async ({ workerId, updates }, { rejectWithValue }) => {
        try {
            return await updateWorker(workerId, updates);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getWorkerByIdThunk = createAsyncThunk(
    'workers/getWorkerById',
    async (workerId, { rejectWithValue }) => {
        try {
            return await getWorkerById(workerId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const workerSlice = createSlice({
    name: 'workers',
    initialState: {
        list: [],
        selectedWorker: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedWorker(state, action) {
            state.selectedWorker = action.payload;
        },
        clearSelectedWorker(state) {
            state.selectedWorker = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Workers
        builder
            .addCase(fetchWorkersThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWorkersThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchWorkersThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create Worker
        builder
            .addCase(createWorkerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createWorkerThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list.push(action.payload);
            })
            .addCase(createWorkerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Deactivate Worker
        builder
            .addCase(deactivateWorkerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deactivateWorkerThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((w) => w.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(deactivateWorkerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Worker
        builder
            .addCase(updateWorkerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateWorkerThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((w) => w.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(updateWorkerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Worker By ID
        builder
            .addCase(getWorkerByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getWorkerByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedWorker = action.payload;
            })
            .addCase(getWorkerByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, setSelectedWorker, clearSelectedWorker } = workerSlice.actions;

// Selectors
export const selectWorkerList = (state) => state.workers.list;
export const selectSelectedWorker = (state) => state.workers.selectedWorker;
export const selectWorkerLoading = (state) => state.workers.loading;
export const selectWorkerError = (state) => state.workers.error;
export const selectWorkerById = (state, workerId) =>
    state.workers.list.find((w) => w.id === workerId);
export const selectActiveWorkers = (state) =>
    state.workers.list.filter((w) => w.is_active === true);
export const selectWorkersByZone = (state, zone) =>
    state.workers.list.filter((w) => w.assigned_zone === zone);

export default workerSlice.reducer;
