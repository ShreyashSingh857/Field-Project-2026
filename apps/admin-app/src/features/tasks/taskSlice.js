import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchTasks,
    createTask,
    assignWorker,
    cancelTask,
    updateTaskStatus,
    getTaskById,
} from './taskAPI';

// Async Thunks
export const fetchTasksThunk = createAsyncThunk(
    'tasks/fetchTasks',
    async ({ adminId, scope, filters }, { rejectWithValue }) => {
        try {
            return await fetchTasks(adminId, scope, filters);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const createTaskThunk = createAsyncThunk(
    'tasks/createTask',
    async ({ taskData, adminId }, { rejectWithValue }) => {
        try {
            return await createTask(taskData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const assignWorkerThunk = createAsyncThunk(
    'tasks/assignWorker',
    async ({ taskId, workerId }, { rejectWithValue }) => {
        try {
            return await assignWorker(taskId, workerId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const cancelTaskThunk = createAsyncThunk(
    'tasks/cancelTask',
    async ({ taskId, cancelReason }, { rejectWithValue }) => {
        try {
            return await cancelTask(taskId, cancelReason);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateTaskStatusThunk = createAsyncThunk(
    'tasks/updateTaskStatus',
    async ({ taskId, status }, { rejectWithValue }) => {
        try {
            return await updateTaskStatus(taskId, status);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getTaskByIdThunk = createAsyncThunk(
    'tasks/getTaskById',
    async (taskId, { rejectWithValue }) => {
        try {
            return await getTaskById(taskId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const taskSlice = createSlice({
    name: 'tasks',
    initialState: {
        list: [],
        selectedTask: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedTask(state, action) {
            state.selectedTask = action.payload;
        },
        clearSelectedTask(state) {
            state.selectedTask = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Tasks
        builder
            .addCase(fetchTasksThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasksThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchTasksThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create Task
        builder
            .addCase(createTaskThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTaskThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list.push(action.payload);
            })
            .addCase(createTaskThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Assign Worker
        builder
            .addCase(assignWorkerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(assignWorkerThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((t) => t.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(assignWorkerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Cancel Task
        builder
            .addCase(cancelTaskThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(cancelTaskThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((t) => t.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(cancelTaskThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Task Status
        builder
            .addCase(updateTaskStatusThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateTaskStatusThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((t) => t.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(updateTaskStatusThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Task By ID
        builder
            .addCase(getTaskByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getTaskByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedTask = action.payload;
            })
            .addCase(getTaskByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, setSelectedTask, clearSelectedTask } = taskSlice.actions;

// Selectors
export const selectTaskList = (state) => state.tasks.list;
export const selectSelectedTask = (state) => state.tasks.selectedTask;
export const selectTaskLoading = (state) => state.tasks.loading;
export const selectTaskError = (state) => state.tasks.error;
export const selectTaskById = (state, taskId) =>
    state.tasks.list.find((t) => t.id === taskId);
export const selectTasksByStatus = (state, status) =>
    state.tasks.list.filter((t) => t.status === status);
export const selectTasksByWorker = (state, workerId) =>
    state.tasks.list.filter((t) => t.assigned_to === workerId);

export default taskSlice.reducer;
