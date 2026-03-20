# GramWasteConnect — Safai Mitra App Reference Document

> **App:** `apps/worker-app/` | **Framework:** React 19 + Vite | **State:** Redux Toolkit
> **Auth:** Custom JWT (Employee ID + Password, issued by backend)
> **Maps:** Leaflet + OpenStreetMap | **Languages:** English, Hindi, Marathi
> **UI Style:** Flat, high-contrast mobile-first design. NOT claymorphism.
> Full style specification in the UI section below.

---

## Current State of the Codebase

All files in `apps/worker-app/src/` are scaffolded (folder structure and empty files exist). Nothing is implemented yet. Build everything from scratch following this document.

---

## UI Design System — Safai Mitra App

### Philosophy
This app is used by field workers on low-cost Android phones, often outdoors in bright sunlight. The UI must be:
- Fast to load (minimal heavy effects)
- Large tap targets (minimum 48px height for all interactive elements)
- High contrast (readable in sunlight)
- Bottom navigation (thumb-friendly)
- Flat cards with colored left-border for task urgency (no claymorphism)

### Color Palette
Reuse the same green family as the User App for brand consistency.

| Token | Value | Use |
|---|---|---|
| Page Background | `#F1F8F1` | Body, page wrapper |
| Top Bar | `#2E7D32` | Solid green top bar |
| Card Background | `#FFFFFF` | Task cards |
| Border Urgent | `#E24B4A` | Left border — urgent tasks |
| Border Pending | `#EF9F27` | Left border — pending tasks |
| Border Done | `#639922` | Left border — completed tasks |
| Primary Green | `#2E7D32` | Active nav icons, buttons, headings |
| Text Primary | `#1A1A1A` | All body text |
| Text Secondary | `#666666` | Subtitles, meta info |
| Badge Urgent bg | `#FCEBEB` | Urgent badge fill |
| Badge Urgent text | `#A32D2D` | Urgent badge text |
| Badge Pending bg | `#FAEEDA` | Pending badge fill |
| Badge Pending text | `#854F0B` | Pending badge text |
| Badge Done bg | `#EAF3DE` | Done badge fill |
| Badge Done text | `#3B6D11` | Done badge text |

### CSS Classes to define in `index.css`

```css
:root {
  --sm-bg: #F1F8F1;
  --sm-topbar: #2E7D32;
  --sm-card: #FFFFFF;
  --sm-border-urgent: #E24B4A;
  --sm-border-pending: #EF9F27;
  --sm-border-done: #639922;
  --sm-primary: #2E7D32;
  --sm-text: #1A1A1A;
  --sm-text-muted: #666666;
}

body { background-color: var(--sm-bg); margin: 0; font-family: sans-serif; }

.sm-topbar {
  background: var(--sm-topbar);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.sm-task-card {
  background: var(--sm-card);
  border-radius: 10px;
  padding: 14px 16px;
  border-left: 4px solid var(--sm-border-pending);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.sm-task-card:active { transform: scale(0.98); }
.sm-task-card.urgent { border-left-color: var(--sm-border-urgent); }
.sm-task-card.done { border-left-color: var(--sm-border-done); opacity: 0.7; }

.sm-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.sm-badge.urgent { background: #FCEBEB; color: #A32D2D; }
.sm-badge.pending { background: #FAEEDA; color: #854F0B; }
.sm-badge.in_progress { background: #E6F1FB; color: #185FA5; }
.sm-badge.done { background: #EAF3DE; color: #3B6D11; }

.sm-btn-primary {
  background: var(--sm-primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px 20px;
  font-size: 16px;
  font-weight: 600;
  width: 100%;
  cursor: pointer;
  min-height: 52px;
  transition: background 0.2s;
}
.sm-btn-primary:active { background: #1B5E20; }

.sm-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  display: flex;
  z-index: 30;
  padding-bottom: env(safe-area-inset-bottom);
}
.sm-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 8px;
  gap: 3px;
  cursor: pointer;
  color: #999;
}
.sm-nav-item.active { color: var(--sm-primary); }
.sm-nav-item span { font-size: 11px; font-weight: 500; }

.sm-page { padding: 16px; padding-bottom: 80px; }
```

### Typography
| Element | Size | Weight | Color |
|---|---|---|---|
| Top bar name | 16px | 600 | #FFFFFF |
| Top bar sub | 12px | 400 | rgba(255,255,255,0.8) |
| Section title | 13px | 600 | var(--sm-primary) |
| Task title | 14px | 600 | var(--sm-text) |
| Task meta | 12px | 400 | var(--sm-text-muted) |
| Button | 16px | 600 | #FFFFFF |
| Badge | 11px | 600 | (badge-specific) |

---

## Project Structure

```
apps/worker-app/src/
├── app/
│   └── store.js
├── components/
│   ├── Loader.jsx
│   ├── Navbar.jsx              # Top bar component (green, reused across pages)
│   ├── BottomNav.jsx           # Fixed bottom navigation (3 tabs)
│   ├── TaskCard.jsx            # Reusable task card
│   └── ProtectedRoute.jsx
├── features/
│   ├── auth/
│   │   ├── authSlice.js        # worker session (JWT stored in localStorage)
│   │   └── authAPI.js
│   ├── tasks/
│   │   ├── taskSlice.js
│   │   └── taskAPI.js
│   ├── photoUpload/
│   │   ├── photoSlice.js
│   │   └── photoAPI.js
│   └── sla/
│       ├── slaSlice.js
│       └── slaAPI.js           # (future — SLA tracking)
├── pages/
│   ├── Login.jsx
│   ├── TaskDashboard.jsx
│   ├── TaskDetails.jsx
│   ├── MapView.jsx
│   └── Profile.jsx
├── routes/
│   └── AppRoutes.jsx
├── services/
│   └── axiosInstance.js
├── utils/
│   └── constants.js
└── i18n.js                     # Setup same as user-app: en/hi/mr
```

---

## Environment Variables

```env
# apps/worker-app/.env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Authentication (JWT)

Workers do NOT use Supabase Auth. They use a custom JWT issued by the backend.

### authAPI.js

```javascript
import axios from '../services/axiosInstance';

export const loginWorker = async (employee_id, password) => {
  const { data } = await axios.post('/auth/worker/login', { employee_id, password });
  return data; // { token, worker: { id, name, employee_id, assigned_area, village_id } }
};
```

### authSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginWorker } from './authAPI';

export const login = createAsyncThunk('auth/login', async ({ employee_id, password }, { rejectWithValue }) => {
  try {
    const data = await loginWorker(employee_id, password);
    localStorage.setItem('worker_token', data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('worker_token');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    worker: null,
    token: localStorage.getItem('worker_token') || null,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.worker = action.payload.worker;
        state.token = action.payload.token;
        state.loading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(logout.fulfilled, state => {
        state.worker = null;
        state.token = null;
      });
  }
});
```

### axiosInstance.js

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('worker_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## Routing (AppRoutes.jsx)

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/tasks" element={<ProtectedRoute><TaskDashboard /></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/tasks" />} />
    </Routes>
  );
}
```

### ProtectedRoute.jsx

```jsx
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { token } = useSelector(state => state.auth);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
```

---

## Components

### Navbar.jsx (Top Bar)

```jsx
export default function Navbar({ title, subtitle, showBack = false }) {
  const navigate = useNavigate();
  return (
    <div className="sm-topbar">
      {showBack && (
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          ← {/* ArrowLeft icon from Lucide */}
        </button>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 600 }}>{title}</p>
        {subtitle && <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{subtitle}</p>}
      </div>
    </div>
  );
}
```

### BottomNav.jsx

Three tabs only: Tasks, Map, Profile. Active tab highlighted in `var(--sm-primary)`.

```jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, Map, User } from 'lucide-react';

const tabs = [
  { path: '/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="sm-bottom-nav">
      {tabs.map(({ path, label, icon: Icon }) => (
        <button key={path} className={`sm-nav-item ${pathname.startsWith(path) ? 'active' : ''}`}
          onClick={() => navigate(path)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
```

### TaskCard.jsx

```jsx
export default function TaskCard({ task, onClick }) {
  const urgencyClass = task.priority === 1 ? 'urgent' : task.status === 'done' ? 'done' : '';
  return (
    <div className={`sm-task-card ${urgencyClass}`} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--sm-text)' }}>{task.title}</p>
        <span className={`sm-badge ${task.status}`}>{task.status.replace('_', ' ')}</span>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--sm-text-muted)' }}>{task.location_address}</p>
      {task.priority === 1 && <span className="sm-badge urgent">Urgent</span>}
    </div>
  );
}
```

---

## Page Specifications

### Login.jsx

**Layout:**
- Full screen, `var(--sm-bg)` background.
- Logo centered at top (60px, same `Logo.png`).
- App name: "Safai Mitra" (large, green).
- Tagline: "GramWaste Connect" (smaller, muted).
- Card (white, border-radius 12px, padding 24px):
  - "Employee ID" text input (large, 52px height).
  - "Password" text input with show/hide toggle.
  - Login button (`sm-btn-primary`).
  - Error message below button (red text, shown on failed login).
- Language switcher at bottom (small, 3 language options inline).

**Logic:**
- Dispatch `login({ employee_id, password })`.
- On success → navigate to `/tasks`.
- On failure → show error from Redux state.

---

### TaskDashboard.jsx

**Route:** `/tasks`

**Layout:**
- `Navbar` component: title = worker's name, subtitle = "Ward 3 · Gokul Nagar" (from Redux auth state).
- Filter tabs below navbar: "All" | "Pending" | "In Progress" | "Done" — horizontal scrollable pill tabs.
- Section label: "Urgent Tasks" (shown only if priority-1 tasks exist) — tasks listed first.
- Section label: "Today's Tasks" — all other tasks.
- Section label: "User Reports Nearby" — issues reported by users in the worker's area (from backend, not yet assigned).
- Each task rendered as `<TaskCard />`.
- Pull-down or button to refresh.
- `BottomNav` at bottom.

**Data:** `GET /api/tasks` — backend returns both assigned tasks and nearby unassigned user reports.

### taskSlice.js

```javascript
export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get('/tasks');
    return data.tasks;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error);
  }
});

const taskSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], loading: false, error: null, activeFilter: 'all' },
  reducers: {
    setFilter: (state, action) => { state.activeFilter = action.payload; }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchTasks.pending, state => { state.loading = true; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      });
  }
});
```

---

### TaskDetails.jsx

**Route:** `/tasks/:id`

**Layout:**
- `Navbar` with `showBack={true}`. Title = task title.
- Task type badge + priority badge at top.
- Description text block.
- Location address with map pin icon.
- Small Leaflet map (250px height) showing:
  - Task location as red pin marker.
  - Worker's current GPS location as blue dot.
  - Route line between them (polyline — use OpenRouteService free API or OSRM public API for routing).
  - "Open in Maps" button → opens Google Maps / native maps app with directions.
- Timeline / status stepper: Pending → Assigned → In Progress → Done.
- Action buttons (conditional by status):
  - If `status = 'assigned'` → "Start Task" button → calls `PATCH /api/tasks/:id/start`.
  - If `status = 'in_progress'` → "Mark as Done" button → opens completion flow.
  - If `status = 'done'` → show proof photo + completion time.

**Completion Flow (Mark as Done):**
1. Tap "Mark as Done" button.
2. Show bottom sheet with:
   - "Upload Proof Photo" — camera/gallery picker.
   - Photo preview.
   - Confirm button.
3. On confirm → dispatch `completeTask({ taskId, photoFile })`.
4. Show success toast: "Task marked as done ✓".
5. Navigate back to `/tasks`.

### photoAPI.js + taskAPI.js

```javascript
// taskAPI.js
export const startTask = (taskId) => axios.patch(`/tasks/${taskId}/start`);

export const completeTask = async (taskId, photoFile) => {
  const formData = new FormData();
  formData.append('photo', photoFile);
  return axios.patch(`/tasks/${taskId}/complete`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

---

### MapView.jsx

**Route:** `/map`

**Layout:**
- `Navbar` with title "Task Map".
- Full-screen Leaflet map (fills entire height minus topbar and bottomnav).
- Worker's current GPS shown as a pulsing blue dot (updated via `navigator.geolocation.watchPosition`).
- All pending/in-progress tasks shown as color-coded markers:
  - Red marker: urgent (priority 1)
  - Amber marker: normal (priority 2)
  - Grey marker: low (priority 3)
- Clicking a marker → shows popup with task title + "View Details" button → navigate to `/tasks/:id`.
- GPS error handling: if location unavailable, show toast "Location unavailable — map centered on your area".

---

### Profile.jsx

**Route:** `/profile`

**Layout:**
- `Navbar` with title "My Profile".
- Avatar circle (initials, green background).
- Worker name (large, bold).
- Employee ID (muted, monospace font).
- Info rows:
  - Assigned Area
  - Village
  - Phone (if set)
- "Change Password" button → inline form (current password + new password).
- Language selector (3 options: English / हिंदी / मराठी) — same pill-tab style.
- Logout button (red-bordered, full-width, at bottom).
- `BottomNav` at bottom.

---

## Routing Summary

| Path | Component | Auth Required |
|---|---|---|
| `/login` | Login.jsx | No |
| `/tasks` | TaskDashboard.jsx | Yes |
| `/tasks/:id` | TaskDetails.jsx | Yes |
| `/map` | MapView.jsx | Yes |
| `/profile` | Profile.jsx | Yes |
| `*` | Redirect to `/tasks` | — |

---

## i18n Setup

Set up i18n identical to the user-app. Create `src/i18n.js`:

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: { /* English strings */ } },
  hi: { translation: { /* Hindi strings */ } },
  mr: { translation: { /* Marathi strings */ } }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('worker_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
```

Language is persisted in `localStorage` as `worker_lang`.

---

## Dependencies to Install

```bash
npm install @supabase/supabase-js  # not needed — worker uses JWT only
npm install leaflet react-leaflet
npm install react-i18next i18next
```

---

## UI Checklist for Every New Page

- [ ] Page background is `var(--sm-bg)`
- [ ] Uses `<Navbar />` component at top
- [ ] Uses `<BottomNav />` at bottom
- [ ] All interactive elements have minimum 48px height
- [ ] Task cards use `.sm-task-card` class with correct urgency class
- [ ] Status badges use `.sm-badge` with correct status class
- [ ] Buttons use `.sm-btn-primary`
- [ ] No claymorphism effects (no heavy shadows, no clay-* classes)
- [ ] Text uses `var(--sm-text)` and `var(--sm-text-muted)`
- [ ] Loading state shown while data fetches
- [ ] Error state handled with user-friendly message
- [ ] All strings use i18n translation keys
