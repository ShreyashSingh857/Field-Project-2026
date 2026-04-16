# GramWasteConnect — User App Reference Document

> **App:** `apps/user-app/` | **Framework:** React 19 + Vite | **State:** Redux Toolkit
> **Auth:** Supabase Auth (replace existing Firebase config) | **Maps:** Leaflet + OpenStreetMap
> **Languages:** English, Hindi, Marathi (i18n already configured)
> **UI Style:** Claymorphism — follow `DOCS/GlobalResources/UI_DESIGN_SYSTEM.md` strictly for every page.

---

## Current State of the Codebase

The following is already implemented and should NOT be rebuilt:

| File / Feature | Status |
|---|---|
| `LandingPage.jsx` | Done — 3D globe, parallax scroll, feature sections |
| `Dashboard.jsx` | Done — cards grid, sidebar drawer, language switcher, navigation |
| `i18n.js` + translations | Done — English, Hindi, Marathi configured |
| `AppRoutes.jsx` | Scaffolded — routes defined but most pages are empty shells |
| `UI_DESIGN_SYSTEM.md` | Done — must be followed for all new pages |
| Redux store setup | Scaffolded — slices exist but logic is empty |
| `axiosInstance.js` | Scaffolded — needs baseURL set to backend |
| `services/firebase.js` | **DELETE THIS** — replaced by Supabase |

**Critical migration task:** Replace all Firebase references with Supabase.

```bash
# Files to delete
apps/user-app/src/services/firebase.js

# Install Supabase client
npm install @supabase/supabase-js
```

```javascript
// Create: apps/user-app/src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

```env
# apps/user-app/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Project Structure

```
apps/user-app/src/
├── app/
│   └── store.js                    # Redux store
├── components/
│   ├── Navbar.jsx                  # (not used — Dashboard has inline header)
│   ├── BinCard.jsx                 # Reusable bin status card
│   ├── Loader.jsx                  # Full-screen loading spinner
│   ├── ProtectedRoute.jsx          # Redirect if not logged in
│   ├── ParallaxBackground.jsx      # Used on LandingPage
│   └── ui/
│       ├── button.jsx
│       └── 3d-globe.jsx            # Used on LandingPage
├── features/
│   ├── auth/
│   │   ├── authSlice.js            # user session state
│   │   └── authAPI.js              # Supabase auth calls
│   ├── bins/
│   │   ├── binSlice.js
│   │   └── binAPI.js               # GET /api/bins
│   ├── marketplace/
│   │   ├── marketplaceSlice.js
│   │   └── marketplaceAPI.js
│   ├── aidetection/
│   │   ├── aidetectionSlice.js
│   │   └── aidetectionAPI.js       # POST /api/ai/scan
│   └── chatbot/
│       ├── chatbotSlice.js         # stores conversation history
│       └── chatbotAPI.js           # POST /api/ai/chat
├── hooks/
│   └── useScrollProgress.js
├── pages/
│   ├── LandingPage.jsx             # Done
│   ├── Login.jsx                   # Needs Supabase wiring
│   ├── Dashboard.jsx               # Done
│   ├── BinsMapPage.jsx             # Build
│   ├── BinDetails.jsx              # Build
│   ├── AIScannerPage.jsx           # Build
│   ├── MarketplacePage.jsx         # Build
│   ├── Marketplace.jsx             # (duplicate — keep MarketplacePage.jsx, remove this)
│   ├── ReportIssuePage.jsx         # Build
│   ├── WasteTipsPage.jsx           # Build
│   └── Profile.jsx                 # Build
├── routes/
│   └── AppRoutes.jsx
├── services/
│   ├── supabase.js                 # Create this (see above)
│   └── axiosInstance.js            # Set baseURL to VITE_API_BASE_URL
├── i18n.js
└── utils/
    └── constants.js
```

---

## Routing (AppRoutes.jsx)

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/bins" element={<ProtectedRoute><BinsMapPage /></ProtectedRoute>} />
      <Route path="/bins/:id" element={<ProtectedRoute><BinDetails /></ProtectedRoute>} />
      <Route path="/ai-scanner" element={<ProtectedRoute><AIScannerPage /></ProtectedRoute>} />
      <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportIssuePage /></ProtectedRoute>} />
      <Route path="/tips" element={<ProtectedRoute><WasteTipsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
```

### ProtectedRoute.jsx

```jsx
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useSelector(state => state.auth);
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

---

## Authentication (authSlice.js + authAPI.js)

### authAPI.js

```javascript
import { supabase } from '../../services/supabase';

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google' });

export const signInWithPhone = (phone) =>
  supabase.auth.signInWithOtp({ phone });

export const verifyOtp = (phone, token) =>
  supabase.auth.verifyOtp({ phone, token, type: 'sms' });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();
```

### authSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSession, signOut } from './authAPI';

export const initAuth = createAsyncThunk('auth/init', async () => {
  const { data: { session } } = await getSession();
  return session?.user ?? null;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: true, error: null },
  reducers: {
    setUser: (state, action) => { state.user = action.payload; state.loading = false; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => { state.loading = true; })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(logout.fulfilled, (state) => { state.user = null; });
  }
});
```

### App.jsx — Subscribe to auth changes

```jsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from './services/supabase';
import { setUser } from './features/auth/authSlice';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user ?? null));
    });
  }, [dispatch]);

  return <AppRoutes />;
}
```

---

## Page Specifications

### Login.jsx

**UI Style:** Claymorphism. Full-screen page with `var(--clay-bg)` background.

**Layout:**
- Centered card (`clay-card`) with Logo at top.
- App name "GramWaste Connect" as heading.
- Two login options as large buttons:
  - "Continue with Google" (Google OAuth via Supabase)
  - "Continue with Phone" (OTP flow — phone input → OTP input)
- Language selector at bottom (same `clay-lang-box` as Dashboard).

**Logic:**
- On successful login, Supabase `onAuthStateChange` fires → Redux `setUser` → `ProtectedRoute` allows entry → redirect to `/dashboard`.
- Phone flow: show phone input → call `signInWithPhone` → show OTP input → call `verifyOtp`.

---

### BinsMapPage.jsx

**Route:** `/bins`
**UI Style:** Claymorphism header. Map takes full remaining viewport height.

**Layout:**
- Standard clay-header with back button (← arrow to `/dashboard`).
- Full-height Leaflet map below header.
- Bin markers on map — color coded:
  - Green marker: `fill_level <= 60`
  - Yellow/amber marker: `fill_level 61–80`
  - Red marker: `fill_level > 80`
- Clicking a marker opens a small popup with: bin label, fill status badge, "View Details" button → navigate to `/bins/:id`.
- Loading spinner while bins fetch.

**Data:** `GET /api/bins?village_id={user.village_id}`

**Redux (binSlice.js):**
```javascript
export const fetchBins = createAsyncThunk('bins/fetchAll', async (villageId) => {
  const { data } = await axios.get(`/bins?village_id=${villageId}`);
  return data.bins;
});
```

**Dependencies to install:**
```bash
npm install leaflet react-leaflet
```

**Map setup:**
```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Tile URL (OpenStreetMap, free, no API key needed):
// https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Note:** Fix Leaflet default marker icon in Vite by importing icons manually — Leaflet's default icon paths break with Vite's asset pipeline.

---

### BinDetails.jsx

**Route:** `/bins/:id`
**UI Style:** Claymorphism. Standard page layout.

**Layout:**
- Clay header with back arrow.
- Large fill level indicator (circular progress or bar) showing fill %.
- Status badge (Empty / Low / Medium / High / Full / Overflow) color-coded.
- Info rows: Last updated time, Bin label, Location address.
- "Report Overflow" button (only shown if fill_status is 'full' or 'overflow') → pre-fills Report Issue form with this bin's location.

**Data:** `GET /api/bins/:id`

---

### AIScannerPage.jsx

**Route:** `/ai-scanner`
**UI Style:** Claymorphism.

**Layout:**
- Clay header with back arrow.
- Page title: "Waste Scanner" / "कचरा पहचानकर्ता" (translated).
- Two large action buttons:
  - "Take Photo" — opens device camera via `<input type="file" accept="image/*" capture="environment" />`
  - "Choose from Gallery" — opens file picker.
- After image selected: show preview thumbnail.
- "Identify & Get Instructions" button (clay-fab style, full-width).
- Loading state: spinner + text "Analysing your waste..."
- Result card (clay-card):
  - Waste type (bold heading).
  - Category badge (Dry Waste / Wet Waste / Hazardous / Other).
  - Numbered step-by-step disposal instructions.
  - Tip text (if returned by API).
- "Scan Another" button to reset.

**Data:** `POST /api/ai/scan` with `FormData` containing the image file.

**Redux (aidetectionSlice.js):**
```javascript
// States: idle | loading | success | error
export const scanWaste = createAsyncThunk('ai/scan', async (imageFile) => {
  const formData = new FormData();
  formData.append('photo', imageFile);
  const { data } = await axios.post('/ai/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data; // { waste_type, category, steps, tip }
});
```

---

### Chatbot (Floating Widget — all pages)

**UI Style:** Claymorphism FAB. Chat panel slides up from bottom.

**The chatbot is NOT a separate page.** It is a floating component rendered inside `Dashboard.jsx` and persists across navigation. The FAB is the `clay-fab` button already present in the Dashboard.

**Layout of chat panel:**
- Slides up from bottom (translateY animation), 70% screen height, `clay-sidebar` style panel.
- Header: "Waste Assistant" + language indicator + close (X) button.
- Scrollable message list — user messages right-aligned, assistant messages left-aligned with a small bot icon.
- Text input at bottom + Send button.
- Language respects the user's selected language (from Redux auth state).

**Data:** `POST /api/ai/chat` with `{ message, history, language }`.

**Redux (chatbotSlice.js):**
```javascript
const chatbotSlice = createSlice({
  name: 'chatbot',
  initialState: { isOpen: false, messages: [], loading: false },
  reducers: {
    toggleChatbot: state => { state.isOpen = !state.isOpen; },
    addMessage: (state, action) => { state.messages.push(action.payload); }
  },
  extraReducers: builder => {
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.messages.push({ role: 'assistant', content: action.payload.reply });
      state.loading = false;
    });
  }
});
```

---

### MarketplacePage.jsx

**Route:** `/marketplace`
**UI Style:** Claymorphism.

**Layout:**
- Clay header with back arrow and "+" FAB at top-right to add listing.
- Grid of listing cards (2-column mobile, 3-column tablet+) — each card:
  - Photo (rounded, aspect-ratio: 1/1, object-fit cover).
  - Title + price (bold).
  - Seller name + village.
  - "Contact Seller" button showing phone number (or `tel:` link).
  - Posted X days ago.
- Empty state if no listings: illustration + "No listings yet. Be the first!"
- Pull-to-refresh or "Load more" pagination.

**Add Listing Modal / Bottom Sheet:**
- Triggered by "+" FAB.
- Form fields: Title, Description (optional), Price (₹), Contact Number (pre-filled from user profile), Photo upload.
- Submit → `POST /api/marketplace`.
- On success, add new listing to top of list in Redux state.

**Redux (marketplaceSlice.js):**
```javascript
export const fetchListings = createAsyncThunk('marketplace/fetch', async (villageId) => {
  const { data } = await axios.get(`/marketplace?village_id=${villageId}`);
  return data.listings;
});

export const postListing = createAsyncThunk('marketplace/post', async (formData) => {
  const { data } = await axios.post('/marketplace', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
});
```

---

### ReportIssuePage.jsx

**Route:** `/report`
**UI Style:** Claymorphism.

**Layout:**
- Clay header with back arrow.
- Page title: "Report a Problem".
- Form:
  - "Describe the problem" — multiline text input (required).
  - "Add Photo" — optional image picker (same camera/gallery as AI Scanner).
  - "Location" — auto-detected via `navigator.geolocation` on page load. Shows a small Leaflet map with a draggable pin for correction. Address reverse-geocoded from lat/lng using OpenStreetMap Nominatim API (free, no key needed).
  - Submit button.
- On submit → `POST /api/issues`.
- Success screen: "Your report has been submitted. Safai Mitra will be assigned soon." with a green checkmark illustration.

---

### WasteTipsPage.jsx

**Route:** `/tips`
**UI Style:** Claymorphism.

**Layout:**
- Clay header with back arrow.
- Page title: "Waste Tips & News".
- Vertical list of announcement cards (clay-card):
  - Pinned announcements shown first with a 📌 pin icon badge.
  - Each card: Title (bold), Content (truncated to 3 lines, "Read more" expand), Posted by (Admin name + role), Date.
- Pull-to-refresh.
- Empty state: "No tips posted yet."

**Data:** `GET /api/announcements?village_id={user.village_id}`

---

### Profile.jsx

**Route:** `/profile`
**UI Style:** Claymorphism.

**Layout:**
- Clay header with back arrow.
- Avatar circle (initials-based, clay-icon style).
- Name (editable inline on tap).
- Phone number (from Supabase Auth — read only).
- Village name.
- Language selector (same `clay-lang-box` pattern as Dashboard sidebar).
- "My Listings" link → navigates to marketplace filtered to user's own listings.
- "My Reports" link → shows user's submitted issue reports with status badges.
- Logout button (bottom, `clay-fab` dark style).

**Data:** `GET /users/{id}` via Supabase client directly (not through backend).

---

## i18n Usage Pattern

All user-facing strings must use the `useTranslation` hook. Never hardcode English text in JSX for pages.

```jsx
import { useTranslation } from 'react-i18next';

export default function SomePage() {
  const { t } = useTranslation();
  return <h1>{t('somePage.title')}</h1>;
}
```

Translation keys follow the pattern `pageName.elementName`. Add all three languages (en/hi/mr) simultaneously when adding new keys.

---

## axiosInstance.js

```javascript
import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Attach Supabase auth token to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default api;
```

---

## UI Checklist for Every New Page

Before submitting any page, verify:
- [ ] Page wrapper uses `var(--clay-bg)` background
- [ ] Header uses `clay-header` class with Logo + app name
- [ ] Back navigation implemented (arrow icon → `navigate(-1)`)
- [ ] All cards use `clay-card` class
- [ ] Card icons use `clay-icon` with `var(--clay-primary)` color
- [ ] All text uses `text-black` (primary) or `var(--clay-muted)` (secondary)
- [ ] No hardcoded hex color values in JSX
- [ ] Icons from Lucide React only
- [ ] All user-facing strings use `t('key')` from i18n
- [ ] Loading state handled (show `<Loader />` or inline spinner)
- [ ] Error state handled (show toast or inline error message)
- [ ] Empty state handled (show meaningful illustration/message)
- [ ] Mobile responsive (test at 375px and 768px widths)
