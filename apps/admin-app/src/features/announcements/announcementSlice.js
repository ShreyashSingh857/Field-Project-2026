import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    togglePin,
    updateAnnouncement,
    getAnnouncementById,
    getPinnedAnnouncements,
} from './announcementAPI';

// Async Thunks
export const fetchAnnouncementsThunk = createAsyncThunk(
    'announcements/fetchAnnouncements',
    async ({ adminId, scope, filters }, { rejectWithValue }) => {
        try {
            return await fetchAnnouncements(adminId, scope, filters);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const createAnnouncementThunk = createAsyncThunk(
    'announcements/createAnnouncement',
    async ({ announcementData, adminId }, { rejectWithValue }) => {
        try {
            return await createAnnouncement(announcementData, adminId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const deleteAnnouncementThunk = createAsyncThunk(
    'announcements/deleteAnnouncement',
    async (announcementId, { rejectWithValue }) => {
        try {
            await deleteAnnouncement(announcementId);
            return announcementId;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const togglePinThunk = createAsyncThunk(
    'announcements/togglePin',
    async ({ announcementId, isPinned }, { rejectWithValue }) => {
        try {
            return await togglePin(announcementId, isPinned);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateAnnouncementThunk = createAsyncThunk(
    'announcements/updateAnnouncement',
    async ({ announcementId, updates }, { rejectWithValue }) => {
        try {
            return await updateAnnouncement(announcementId, updates);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getAnnouncementByIdThunk = createAsyncThunk(
    'announcements/getAnnouncementById',
    async (announcementId, { rejectWithValue }) => {
        try {
            return await getAnnouncementById(announcementId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const getPinnedAnnouncementsThunk = createAsyncThunk(
    'announcements/getPinned',
    async (scope, { rejectWithValue }) => {
        try {
            return await getPinnedAnnouncements(scope);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Slice
const announcementSlice = createSlice({
    name: 'announcements',
    initialState: {
        list: [],
        pinnedList: [],
        selectedAnnouncement: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setSelectedAnnouncement(state, action) {
            state.selectedAnnouncement = action.payload;
        },
        clearSelectedAnnouncement(state) {
            state.selectedAnnouncement = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Announcements
        builder
            .addCase(fetchAnnouncementsThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAnnouncementsThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchAnnouncementsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Create Announcement
        builder
            .addCase(createAnnouncementThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createAnnouncementThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list.unshift(action.payload);
            })
            .addCase(createAnnouncementThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Delete Announcement
        builder
            .addCase(deleteAnnouncementThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteAnnouncementThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.list = state.list.filter((a) => a.id !== action.payload);
                state.pinnedList = state.pinnedList.filter((a) => a.id !== action.payload);
            })
            .addCase(deleteAnnouncementThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Toggle Pin
        builder
            .addCase(togglePinThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(togglePinThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((a) => a.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
                if (action.payload.is_pinned) {
                    state.pinnedList.push(action.payload);
                } else {
                    state.pinnedList = state.pinnedList.filter((a) => a.id !== action.payload.id);
                }
            })
            .addCase(togglePinThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Announcement
        builder
            .addCase(updateAnnouncementThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateAnnouncementThunk.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.list.findIndex((a) => a.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            })
            .addCase(updateAnnouncementThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Announcement By ID
        builder
            .addCase(getAnnouncementByIdThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAnnouncementByIdThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedAnnouncement = action.payload;
            })
            .addCase(getAnnouncementByIdThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Pinned Announcements
        builder
            .addCase(getPinnedAnnouncementsThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getPinnedAnnouncementsThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.pinnedList = action.payload;
            })
            .addCase(getPinnedAnnouncementsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, setSelectedAnnouncement, clearSelectedAnnouncement } =
    announcementSlice.actions;

// Selectors
export const selectAnnouncementList = (state) => state.announcements.list;
export const selectPinnedAnnouncements = (state) => state.announcements.pinnedList;
export const selectSelectedAnnouncement = (state) => state.announcements.selectedAnnouncement;
export const selectAnnouncementLoading = (state) => state.announcements.loading;
export const selectAnnouncementError = (state) => state.announcements.error;
export const selectAnnouncementById = (state, announcementId) =>
    state.announcements.list.find((a) => a.id === announcementId);

export default announcementSlice.reducer;
