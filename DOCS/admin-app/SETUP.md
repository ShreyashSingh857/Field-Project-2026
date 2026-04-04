# GramWasteConnect Admin Dashboard - Setup Guide

## Installation

1. **Install Dependencies**
   ```bash
   cd apps/admin-app
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env and set:
   VITE_API_BASE_URL=http://localhost:5000
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   The app will run on `http://localhost:5173`

## Project Structure

```
src/
├── index.css               # Design system & all utility classes
├── main.jsx               # Redux Provider + React Router setup
├── App.jsx                # Router wrapper
├── app/
│   └── store.js           # Redux store with 6 slices
├── services/
│   └── axiosInstance.js   # HTTP client with JWT interceptor
├── features/
│   ├── auth/              # Auth slice, login thunk, selectors
│   ├── dashboard/         # Dashboard state
│   ├── workers/           # Workers state
│   ├── hierarchy/         # Admin hierarchy state
│   ├── reports/           # Reports state
│   └── escalation/        # Escalation state
├── components/
│   ├── AppShell.jsx       # Main layout wrapper
│   ├── Navbar.jsx         # Top header
│   ├── Sidebar.jsx        # Left sidebar with role-aware nav
│   ├── ProtectedRoute.jsx # Route protection
│   ├── StatCard.jsx       # Reusable stat card
│   └── ChartCard.jsx      # Chart wrapper
├── pages/
│   ├── Login.jsx          # Authentication
│   ├── Dashboard.jsx      # Main dashboard
│   ├── BinMap.jsx         # Bin monitoring
│   ├── TaskManagement.jsx # Task CRUD
│   ├── WorkerManagement.jsx # Worker CRUD
│   ├── IssueManagement.jsx # Issue tracking
│   ├── EscalationPanel.jsx # Escalations
│   ├── HierarchyManagement.jsx # Admin creation
│   ├── Reports.jsx        # Analytics & reports
│   └── Announcements.jsx  # Broadcast messages
├── routes/
│   └── AppRoutes.jsx      # All routes with role-gating
└── utils/
    └── constants.js       # Shared constants
```

## Design System

### CSS Variables (in index.css)
```css
--admin-bg: #F1F8E9                    /* Page background */
--admin-sidebar: #FFFFFF               /* Sidebar */
--admin-panel: #FFFFFF                 /* Cards & panels */
--admin-border: #C8E6C9                /* Borders */
--admin-active: #E8F5E9                /* Active state */
--admin-active-border: #2E7D32         /* Active border */
--admin-primary: #2E7D32               /* Primary green */
--admin-accent: #1B5E20                /* Dark green */
--admin-text: #1A1A1A                  /* Text */
--admin-muted: #666666                 /* Muted text */
```

### Color Tokens
- **Success:** bg `#EAF3DE` / text `#3B6D11`
- **Warning:** bg `#FAEEDA` / text `#854F0B`
- **Danger:** bg `#FCEBEB` / text `#A32D2D`

## Core Classes (using 700+ lines in index.css)

**Layout:**
- `.admin-shell` - root flex container
- `.admin-header` - sticky top header (60px)
- `.admin-body` - flex wrapper for sidebar + main
- `.admin-sidebar` - left 240px sidebar
- `.admin-main` - scrollable content area

**Components:**
- `.admin-btn-primary` / `.admin-btn-outline` - buttons
- `.admin-badge` - status badge (done/pending/urgent/active)
- `.admin-panel` - white card with border
- `.admin-stat-grid` / `.admin-stat-card` - stat display
- `.admin-table-wrap` / `.admin-table` - table styling
- `.admin-modal-overlay` / `.admin-modal` - modal dialog
- `.admin-form-*` - form controls

**Navigation:**
- `.admin-nav-item` - sidebar link
- `.admin-nav-item.active` - active link styling

## Authentication Flow

1. User navigates to `/login`
2. Enters email + password
3. Redux dispatch `loginAdmin({ email, password })`
4. ThunkAPI calls `POST /auth/admin/login`
5. On success: token from all localStorage → Redux state
6. ProtectedRoute checks token → navigates to `/dashboard`
7. Sidebar loads role-aware menu items
8. All API calls include Authorization header (via axiosInstance interceptor)

## Role-Based Routes

| Role | Access |
|---|---|
| `zilla_parishad` | dashboard, bins, announcements, reports, escalations, hierarchy |
| `block_samiti` | dashboard, bins, announcements, reports, escalations, hierarchy |
| `gram_panchayat` | dashboard, bins, announcements, reports, escalations, hierarchy |
| `ward_member` | dashboard, bins, announcements, reports, tasks, workers, issues |

## API Integration Notes

Mock data is currently used. To integrate with backend:

1. **Dashboard** - Replace mock stats with `GET /api/admin/dashboard`
2. **Workers** - Implement `GET /api/workers`, `POST /api/workers`, `PATCH /api/workers/:id/deactivate`
3. **Tasks** - Implement `GET /api/tasks`, `POST /api/tasks`, task filtering
4. **Issues** - Implement `GET /api/issues`, convert-to-task, rejection
5. **Bins** - Implement `GET /api/bins` with fill level data
6. **For map:** Integrate Leaflet + OpenStreetMap with real coordinates

## Dependencies

- `react@19` - UI library
- `react-dom@19` - React rendering
- `react-router-dom@6` - Client routing
- `@reduxjs/toolkit@1.9` - State management
- `react-redux@9` - Redux React bindings
- `axios@1.6` - HTTP client
- `lucide-react@0.294` - Icons (18px, 20px, 24px sizing)
- `recharts@2.10` - Charts
- `tailwindcss@4.2` - Utility CSS (+ custom vars in index.css)

Optional:
- `leaflet@1` - Maps (if needed)
- `react-leaflet@4` - React wrapper for Leaflet

## Development Tips

1. **Adding New Page:** Create in `src/pages/`, add route in `AppRoutes.jsx`, add nav in `Sidebar.jsx`
2. **Form Validation:** Use `.admin-form-error` class for error messages
3. **Loading States:** Use `.admin-spinner` animation or conditional rendering
4. **Empty States:** Use `.admin-table-empty` div with centered text
5. **Modals:** Follow existing pattern: `.admin-modal-overlay` + `.admin-modal` with fade-in
6. **API Errors:** Axios interceptor handles 401; other errors shown via `.admin-alert`

## Building for Production

```bash
npm run build        # Creates dist/ folder
npm run preview      # Test production build locally
```

## Troubleshooting

- **Styles not loading:** Check `index.css` import in `main.jsx`
- **Redux state empty:** Verify `store.js` imports all slices
- **Routes not working:** Check `BrowserRouter` in `App.jsx`
- **Components undefined:** Verify all imports in `AppRoutes.jsx`
- **API 401:** Check token in localStorage, ensure axiosInstance is used
