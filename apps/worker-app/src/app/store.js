import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import tasksReducer from '../features/tasks/taskSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
  },
});
