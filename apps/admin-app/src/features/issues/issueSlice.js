import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchIssues,
    convertIssueToTask,
    rejectIssue,
    updateIssueStatus,
    getIssueById,
} from './issueAPI';

// Async Thunks
export const fetchIssuesThunk = createAsyncThunk(
    'issues/fetchIssues',
    async ({ adminId, scope, filters }, { rejectWithValue }) => {
        try {
            return await fetchIssues(adminId, scope, filters);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const convertIssueThunk = createAsyncThunk(
    'issues/convertIssue',
    async ({ issueId, taskData, adminId }, { rejectWithValue }) => {
        try {
            return await convertIssueToTask(issueId, taskData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const rejectIssueThunk = createAsyncThunk(
    'issues/rejectIssue',
    async ({ issueId, rejectionReason }, { rejectWithValue }) => {
        try {
            return await rejectIssue(issueId, rejectionReason);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateIssueStatusThunk = createAsyncThunk(
    'issues/updateIssueStatus',
    async ({ issueId, status }, { rejectWithValue }) => {
        try {
            return await updateIssueStatus(issueId, status);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getIssueByIdThunk = createAsyncThunk(
    'issues/getIssueById',
    async (issueId, { rejectWithValue }) => {
        try {
            return await getIssueById(issueId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const issueSlice = createSlice({
    name: 'issues',
    initialState: {
        list: [],
        selectedIssue: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedIssue(state, action) {
            state.selectedIssue = action.payload;
        },
        clearSelectedIssue(state) {
            state.selectedIssue = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Issues
        builder
            .addCase(fetchIssuesThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchIssuesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchIssuesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Convert Issue to Task
        builder
            .addCase(convertIssueThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(convertIssueThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((i) => i.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(convertIssueThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Reject Issue
        builder
            .addCase(rejectIssueThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(rejectIssueThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((i) => i.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(rejectIssueThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Issue Status
        builder
            .addCase(updateIssueStatusThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateIssueStatusThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((i) => i.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(updateIssueStatusThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Issue By ID
        builder
            .addCase(getIssueByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getIssueByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedIssue = action.payload;
            })
            .addCase(getIssueByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, setSelectedIssue, clearSelectedIssue } = issueSlice.actions;

// Selectors
export const selectIssueList = (state) => state.issues.list;
export const selectSelectedIssue = (state) => state.issues.selectedIssue;
export const selectIssueLoading = (state) => state.issues.loading;
export const selectIssueError = (state) => state.issues.error;
export const selectIssueById = (state, issueId) =>
    state.issues.list.find((i) => i.id === issueId);
export const selectIssuesByStatus = (state, status) =>
    state.issues.list.filter((i) => i.status === status);
export const selectIssuesByPriority = (state, priority) =>
    state.issues.list.filter((i) => i.priority === priority);

export default issueSlice.reducer;
