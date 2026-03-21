import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import binReducer from '../features/bins/binSlice';
import aidetectionReducer from '../features/aidetection/aidetectionSlice';
import marketplaceReducer from '../features/marketplace/marketplaceSlice';
import chatbotReducer from '../features/chatbot/chatbotSlice';

export const store = configureStore({
	reducer: { auth: authReducer, bins: binReducer, aidetection: aidetectionReducer, marketplace: marketplaceReducer, chatbot: chatbotReducer },
});
