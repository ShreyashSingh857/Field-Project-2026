import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import photoUploadReducer from '../features/photoUpload/photoSlice';
import slaReducer from '../features/sla/slaSlice';
import tasksReducer from '../features/tasks/taskSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    photoUpload: photoUploadReducer,
    sla: slaReducer,
    tasks: tasksReducer,
  },
});
