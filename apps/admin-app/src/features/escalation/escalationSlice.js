import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    markResolved,
    reassignWorker,
    updateEscalationStatus,
    addEscalationComment,
    getEscalationById,
} from './escalationAPI';

// Async Thunks
export const markResolvedThunk = createAsyncThunk(
    'escalations/markResolved',
    async ({ escalationId, resolutionNotes }, { rejectWithValue }) => {
        try {
            return await markResolved(escalationId, resolutionNotes);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const reassignWorkerThunk = createAsyncThunk(
    'escalations/reassignWorker',
    async ({ escalationId, newWorkerId, notes }, { rejectWithValue }) => {
        try {
            return await reassignWorker(escalationId, newWorkerId, notes);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateEscalationStatusThunk = createAsyncThunk(
    'escalations/updateStatus',
    async ({ escalationId, status }, { rejectWithValue }) => {
        try {
            return await updateEscalationStatus(escalationId, status);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const addEscalationCommentThunk = createAsyncThunk(
    'escalations/addComment',
    async ({ escalationId, commentData }, { rejectWithValue }) => {
        try {
            return await addEscalationComment(escalationId, commentData);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getEscalationByIdThunk = createAsyncThunk(
    'escalations/getEscalationById',
    async (escalationId, { rejectWithValue }) => {
        try {
            return await getEscalationById(escalationId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const escalationSlice = createSlice({
    name: 'escalations',
    initialState: {
        list: [],
        selectedEscalation: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedEscalation(state, action) {
            state.selectedEscalation = action.payload;
        },
        clearSelectedEscalation(state) {
            state.selectedEscalation = null;
        },
    },
    extraReducers: (builder) => {
        // Mark Resolved
        builder
            .addCase(markResolvedThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(markResolvedThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((e) => e.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(markResolvedThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Reassign Worker
        builder
            .addCase(reassignWorkerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(reassignWorkerThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((e) => e.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(reassignWorkerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Escalation Status
        builder
            .addCase(updateEscalationStatusThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateEscalationStatusThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((e) => e.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(updateEscalationStatusThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Add Escalation Comment
        builder
            .addCase(addEscalationCommentThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addEscalationCommentThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((e) => e.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(addEscalationCommentThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Escalation By ID
        builder
            .addCase(getEscalationByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getEscalationByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedEscalation = action.payload;
            })
            .addCase(getEscalationByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {
    clearError,
    setSelectedEscalation,
    clearSelectedEscalation,
} = escalationSlice.actions;

// Selectors
export const selectEscalationList = (state) => state.escalations.list;
export const selectSelectedEscalation = (state) => state.escalations.selectedEscalation;
export const selectEscalationLoading = (state) => state.escalations.loading;
export const selectEscalationError = (state) => state.escalations.error;
export const selectEscalationById = (state, escalationId) =>
    state.escalations.list.find((e) => e.id === escalationId);
export const selectEscalationsByStatus = (state, status) =>
    state.escalations.list.filter((e) => e.status === status);
export const selectOpenEscalations = (state) =>
    state.escalations.list.filter((e) => e.status !== 'resolved');

export default escalationSlice.reducer;
