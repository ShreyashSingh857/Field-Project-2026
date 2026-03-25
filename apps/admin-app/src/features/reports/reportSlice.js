import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchReports,
    generateTaskReport,
    generateWorkerReport,
    generateIssueReport,
    getReportById,
    downloadReport,
} from './reportAPI';

// Async Thunks
export const fetchReportsThunk = createAsyncThunk(
    'reports/fetchReports',
    async ({ adminId, scope, filters }, { rejectWithValue }) => {
        try {
            return await fetchReports(adminId, scope, filters);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const generateTaskReportThunk = createAsyncThunk(
    'reports/generateTaskReport',
    async ({ reportData, adminId }, { rejectWithValue }) => {
        try {
            return await generateTaskReport(reportData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const generateWorkerReportThunk = createAsyncThunk(
    'reports/generateWorkerReport',
    async ({ reportData, adminId }, { rejectWithValue }) => {
        try {
            return await generateWorkerReport(reportData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const generateIssueReportThunk = createAsyncThunk(
    'reports/generateIssueReport',
    async ({ reportData, adminId }, { rejectWithValue }) => {
        try {
            return await generateIssueReport(reportData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getReportByIdThunk = createAsyncThunk(
    'reports/getReportById',
    async (reportId, { rejectWithValue }) => {
        try {
            return await getReportById(reportId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const downloadReportThunk = createAsyncThunk(
    'reports/downloadReport',
    async (reportId, { rejectWithValue }) => {
        try {
            return await downloadReport(reportId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const reportSlice = createSlice({
    name: 'reports',
    initialState: {
        list: [],
        selectedReport: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedReport(state, action) {
            state.selectedReport = action.payload;
        },
        clearSelectedReport(state) {
            state.selectedReport = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Reports
        builder
            .addCase(fetchReportsThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReportsThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchReportsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Generate Task Report
        builder
            .addCase(generateTaskReportThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(generateTaskReportThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list.push(action.payload);
                state.selectedReport = action.payload;
            })
            .addCase(generateTaskReportThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Generate Worker Report
        builder
            .addCase(generateWorkerReportThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(generateWorkerReportThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list.push(action.payload);
                state.selectedReport = action.payload;
            })
            .addCase(generateWorkerReportThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Generate Issue Report
        builder
            .addCase(generateIssueReportThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(generateIssueReportThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list.push(action.payload);
                state.selectedReport = action.payload;
            })
            .addCase(generateIssueReportThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Report By ID
        builder
            .addCase(getReportByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getReportByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedReport = action.payload;
            })
            .addCase(getReportByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Download Report
        builder
            .addCase(downloadReportThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(downloadReportThunk.fulfilled, (state, action) => {
                state.loading = false;
                // Download is handled externally, just mark success
            })
            .addCase(downloadReportThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, setSelectedReport, clearSelectedReport } = reportSlice.actions;

// Selectors
export const selectReportList = (state) => state.reports.list;
export const selectSelectedReport = (state) => state.reports.selectedReport;
export const selectReportLoading = (state) => state.reports.loading;
export const selectReportError = (state) => state.reports.error;
export const selectReportById = (state, reportId) =>
    state.reports.list.find((r) => r.id === reportId);
export const selectReportsByType = (state, type) =>
    state.reports.list.filter((r) => r.type === type);
export const selectRecentReports = (state) => state.reports.list.slice(0, 10);

export default reportSlice.reducer;
