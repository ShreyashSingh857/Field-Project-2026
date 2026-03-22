import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import workerReducer from '../features/workers/workerSlice';
import taskReducer from '../features/tasks/taskSlice';
import issueReducer from '../features/issues/issueSlice';
import hierarchyReducer from '../features/hierarchy/hierarchySlice';
import reportReducer from '../features/reports/reportSlice';
import escalationReducer from '../features/escalation/escalationSlice';
import announcementReducer from '../features/announcements/announcementSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        dashboard: dashboardReducer,
        workers: workerReducer,
        tasks: taskReducer,
        issues: issueReducer,
        hierarchy: hierarchyReducer,
        reports: reportReducer,
        escalation: escalationReducer,
        announcements: announcementReducer,
    },
});

export default store;
