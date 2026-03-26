import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabaseClient';
import {
  completeTaskRequest,
  fetchTaskById,
  fetchTasks,
  startTaskRequest,
} from './taskAPI';

let realtimeChannel = null;

const upsertTask = (items, task) => {
  const idx = items.findIndex((item) => item.id === task.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...task };
  } else {
    items.unshift(task);
  }
};

export const loadTasks = createAsyncThunk(
  'tasks/loadTasks',
  async ({ workerId, villageId, status } = {}, { rejectWithValue }) => {
    try {
      return await fetchTasks({ worker_id: workerId, village_id: villageId, status });
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Failed to load tasks');
    }
  }
);

export const loadTaskDetails = createAsyncThunk('tasks/loadTaskDetails', async (taskId, { rejectWithValue }) => {
  try {
    return await fetchTaskById(taskId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || err.message || 'Failed to load task');
  }
});

export const startTask = createAsyncThunk('tasks/startTask', async (taskId, { rejectWithValue }) => {
  try {
    return await startTaskRequest(taskId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || err.message || 'Failed to start task');
  }
});

export const completeTask = createAsyncThunk(
  'tasks/completeTask',
  async ({ taskId, proofPhotoUrl }, { rejectWithValue }) => {
    try {
      return await completeTaskRequest(taskId, { proof_photo_url: proofPhotoUrl });
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Failed to complete task');
    }
  }
);

export const initTaskRealtime = createAsyncThunk(
  'tasks/initRealtime',
  async ({ villageId }, { dispatch }) => {
    if (!supabase || !villageId) {
      return null;
    }

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    realtimeChannel = supabase
      .channel(`worker-realtime-${villageId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `village_id=eq.${villageId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            dispatch(taskDeleted(payload.old.id));
            return;
          }

          dispatch(taskUpserted(payload.new));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bins', filter: `village_id=eq.${villageId}` },
        ({ new: updatedBin }) => {
          dispatch(binPatched(updatedBin));
        }
      )
      .subscribe();

    return true;
  }
);

export const stopTaskRealtime = createAsyncThunk('tasks/stopRealtime', async () => {
  if (!supabase || !realtimeChannel) {
    return null;
  }

  await supabase.removeChannel(realtimeChannel);
  realtimeChannel = null;
  return true;
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    selectedTask: null,
    loading: false,
    error: null,
  },
  reducers: {
    taskUpserted: (state, action) => {
      upsertTask(state.items, action.payload);
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = { ...state.selectedTask, ...action.payload };
      }
    },
    taskDeleted: (state, action) => {
      state.items = state.items.filter((task) => task.id !== action.payload);
      if (state.selectedTask?.id === action.payload) {
        state.selectedTask = null;
      }
    },
    binPatched: (state, action) => {
      const updatedBin = action.payload;
      state.items = state.items.map((task) => {
        if (!task.bin || task.bin.id !== updatedBin.id) return task;
        return { ...task, bin: { ...task.bin, ...updatedBin } };
      });

      if (state.selectedTask?.bin?.id === updatedBin.id) {
        state.selectedTask = {
          ...state.selectedTask,
          bin: { ...state.selectedTask.bin, ...updatedBin },
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(loadTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadTaskDetails.fulfilled, (state, action) => {
        state.selectedTask = action.payload;
        upsertTask(state.items, action.payload);
      })
      .addCase(startTask.fulfilled, (state, action) => {
        upsertTask(state.items, action.payload);
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      })
      .addCase(completeTask.fulfilled, (state, action) => {
        upsertTask(state.items, action.payload);
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      });
  },
});

export const { taskUpserted, taskDeleted, binPatched } = tasksSlice.actions;
export const selectTasks = (state) => state.tasks.items;
export const selectCurrentTask = (state) => state.tasks.selectedTask;
export const selectTasksLoading = (state) => state.tasks.loading;
export const selectTasksError = (state) => state.tasks.error;
export default tasksSlice.reducer;
