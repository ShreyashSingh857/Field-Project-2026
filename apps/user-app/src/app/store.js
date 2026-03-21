import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import binReducer from '../features/bins/binSlice';
import aidetectionReducer from '../features/aidetection/aidetectionSlice';

export const store = configureStore({
	reducer: { auth: authReducer, bins: binReducer, aidetection: aidetectionReducer },
});
