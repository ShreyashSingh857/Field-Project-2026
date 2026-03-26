import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getReportById,
    downloadReport,
} from './reportAPI';

// Async Thunks
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
