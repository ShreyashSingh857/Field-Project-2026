# GramWasteConnect — Admin App Reference Document

> **App:** `apps/admin-app/` | **Framework:** React 19 + Vite | **State:** Redux Toolkit
> **Auth:** Custom JWT (Email + Password) | **Maps:** Leaflet + OpenStreetMap
> **Languages:** English, Hindi, Marathi | **UI Style:** Desktop-first dashboard layout.
> Full style specification below. NOT claymorphism.

---

## Overview

The admin app is a **single app with role-based views**. All four levels of the hierarchy log in through the same login page. After authentication, the JWT payload contains the admin's `role`, which determines what they see and what actions they can take.

### The Four Roles

| Role | Hindi Name | Jurisdiction | Creates |
|---|---|---|---|
| `zilla_parishad` | जिला परिषद | Entire district | block_samiti accounts |
| `block_samiti` | ब्लॉक समिति | Multiple Gram Panchayats | gram_panchayat accounts |
| `gram_panchayat` | ग्राम पंचायत | Multiple villages | ward_member accounts |
| `ward_member` | पंचायत व्यवस्थापक | Single village | worker accounts + tasks |

### What each role can do

| Feature | ward_member | gram_panchayat | block_samiti | zilla_parishad |
|---|---|---|---|---|
| Create worker accounts | ✅ | ❌ | ❌ | ❌ |
| Create & assign tasks | ✅ | ❌ | ❌ | ❌ |
| View task completion proofs | ✅ | ✅ (read) | ✅ (read) | ✅ (read) |
| Resolve user issues | ✅ | ❌ | ❌ | ❌ |
| View bin map | ✅ | ✅ | ✅ | ✅ |
| Post announcements | ✅ | ✅ | ✅ | ✅ |
| View aggregated reports | ✅ (own village) | ✅ (multi-village) | ✅ (multi-GP) | ✅ (district-wide) |
| Create sub-admin accounts | ❌ | ✅ (creates ward_member) | ✅ (creates gram_panchayat) | ✅ (creates block_samiti) |
| View escalations | ❌ | ✅ | ✅ | ✅ |

---

## UI Design System — Admin App

### Philosophy
This app is used primarily on desktop browsers by government officials. The UI must be:
- Information-dense but well-organized
- Fixed sidebar navigation
- Professional and clear (similar to a government MIS or analytics dashboard)
- Consistent green palette for brand identity, used as accents not as heavy backgrounds

### Color Palette

| Token | Value | Use |
|---|---|---|
| Page Background | `#F1F8E9` | Outer page background |
| Sidebar Background | `#FFFFFF` | Left sidebar |
| Sidebar Active | `#E8F5E9` | Active nav item background |
| Sidebar Border | `#C8E6C9` | Sidebar right border |
| Panel Background | `#FFFFFF` | Content cards, tables |
| Header Background | `#FFFFFF` | Top header bar |
| Primary Green | `#2E7D32` | Active nav text, stat values, buttons |
| Accent Green | `#1B5E20` | Sidebar logo area, borders |
| Secondary Green | `#4CAF50` | Role badge, highlights |
| Text Primary | `#1A1A1A` | All headings and body |
| Text Muted | `#666666` | Labels, subtitles |
| Border | `#C8E6C9` | Card borders, dividers |
| Success | `#EAF3DE` / `#3B6D11` | Done badges |
| Warning | `#FAEEDA` / `#854F0B` | Pending/overdue badges |
| Danger | `#FCEBEB` / `#A32D2D` | Urgent/overflow badges |

### Layout Structure

```
┌──────────────────────────────────────────────────┐
│  Top Header (white, border-bottom)                │
│  [Logo]  [Page Title]             [Admin Name ▼]  │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Sidebar   │   Main Content Area                 │
│  (fixed,   │   (scrollable)                      │
│  240px)    │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

### CSS Classes to define in `index.css`

```css
:root {
  --admin-bg: #F1F8E9;
  --admin-sidebar: #FFFFFF;
  --admin-panel: #FFFFFF;
  --admin-border: #C8E6C9;
  --admin-active: #E8F5E9;
  --admin-active-border: #2E7D32;
  --admin-primary: #2E7D32;
  --admin-accent: #1B5E20;
  --admin-text: #1A1A1A;
  --admin-muted: #666666;
}

body { background: var(--admin-bg); margin: 0; font-family: sans-serif; }

.admin-shell { display: flex; flex-direction: column; min-height: 100vh; }

.admin-header {
  background: var(--admin-panel);
  border-bottom: 1px solid var(--admin-border);
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 20;
}

.admin-body { display: flex; flex: 1; }

.admin-sidebar {
  width: 240px;
  min-width: 240px;
  background: var(--admin-sidebar);
  border-right: 1px solid var(--admin-border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 16px 0;
}

.admin-sidebar-role {
  padding: 0 16px 16px;
  border-bottom: 1px solid var(--admin-border);
  margin-bottom: 8px;
}
.admin-sidebar-role .role-name { font-size: 11px; font-weight: 600; color: var(--admin-primary); text-transform: uppercase; letter-spacing: 0.05em; }
.admin-sidebar-role .jurisdiction { font-size: 13px; font-weight: 600; color: var(--admin-text); }

.admin-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--admin-text);
  cursor: pointer;
  border-right: 3px solid transparent;
  transition: background 0.15s, color 0.15s;
  text-decoration: none;
}
.admin-nav-item:hover { background: var(--admin-active); }
.admin-nav-item.active {
  background: var(--admin-active);
  color: var(--admin-primary);
  font-weight: 600;
  border-right-color: var(--admin-active-border);
}

.admin-main { flex: 1; padding: 24px; overflow-y: auto; }
.admin-page-title { font-size: 20px; font-weight: 600; color: var(--admin-text); margin: 0 0 20px; }

.admin-panel {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  padding: 20px;
}

.admin-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.admin-stat-card {
  background: var(--admin-panel);
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  padding: 16px;
}
.admin-stat-label { font-size: 12px; color: var(--admin-muted); margin: 0 0 6px; }
.admin-stat-value { font-size: 28px; font-weight: 600; color: var(--admin-primary); margin: 0; }
.admin-stat-sub { font-size: 12px; color: var(--admin-muted); margin: 4px 0 0; }

.admin-table-wrap { background: var(--admin-panel); border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.admin-table thead th { background: var(--admin-active); padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; color: var(--admin-primary); border-bottom: 1px solid var(--admin-border); }
.admin-table tbody td { padding: 12px 16px; border-bottom: 1px solid #f0f7f0; color: var(--admin-text); }
.admin-table tbody tr:last-child td { border-bottom: none; }
.admin-table tbody tr:hover { background: #fafffe; }

.admin-btn-primary { background: var(--admin-primary); color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.admin-btn-primary:hover { background: var(--admin-accent); }
.admin-btn-outline { background: transparent; color: var(--admin-primary); border: 1.5px solid var(--admin-primary); border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }

.admin-badge { display: inline-block; padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; }
.admin-badge.done { background: #EAF3DE; color: #3B6D11; }
.admin-badge.pending { background: #FAEEDA; color: #854F0B; }
.admin-badge.urgent { background: #FCEBEB; color: #A32D2D; }
.admin-badge.active { background: #E8F5E9; color: #2E7D32; }
```

---

## Project Structure

```
apps/admin-app/src/
├── app/
│   └── store.js
├── components/
│   ├── AppShell.jsx            # Header + Sidebar + main layout wrapper
│   ├── Sidebar.jsx             # Role-aware sidebar navigation
│   ├── Navbar.jsx              # Top header bar
│   ├── ProtectedRoute.jsx
│   ├── ChartCard.jsx           # Wrapper for chart components
│   └── StatCard.jsx            # Reusable stat metric card
├── features/
│   ├── auth/
│   │   ├── authSlice.js
│   │   └── authAPI.js
│   ├── dashboard/
│   │   ├── dashboardSlice.js
│   │   └── dashboardAPI.js
│   ├── workers/
│   │   ├── workerSlice.js
│   │   └── workerAPI.js
│   ├── hierarchy/
│   │   ├── hierarchySlice.js
│   │   └── hierarchyAPI.js
│   ├── reports/
│   │   ├── reportSlice.js
│   │   └── reportAPI.js
│   └── escalation/
│       ├── escalationSlice.js
│       └── escalationAPI.js
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx           # Home/overview page
│   ├── BinMap.jsx              # Map of all bins in jurisdiction
│   ├── TaskManagement.jsx      # List + manage tasks (ward_member only)
│   ├── WorkerManagement.jsx    # List + create workers (ward_member only)
│   ├── IssueManagement.jsx     # User-reported issues (ward_member only)
│   ├── Announcements.jsx       # Post/manage announcements (all roles)
│   ├── Reports.jsx             # Analytics and SLA reports (all roles)
│   ├── HierarchyManagement.jsx # Create sub-admin accounts (all except ward_member)
│   └── EscalationPanel.jsx     # View escalated issues (gram_panchayat and above)
├── routes/
│   └── AppRoutes.jsx
├── services/
│   └── axiosInstance.js
└── utils/
    └── constants.js
```

---

## Authentication

### authAPI.js

```javascript
import axios from '../services/axiosInstance';

export const loginAdmin = async (email, password) => {
  const { data } = await axios.post('/auth/admin/login', { email, password });
  return data; // { token, admin: { id, name, role, jurisdiction_name } }
};
```

### authSlice.js

```javascript
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    admin: JSON.parse(localStorage.getItem('admin_user')) || null,
    token: localStorage.getItem('admin_token') || null,
    loading: false,
    error: null
  },
  // ... standard login/logout async thunks same as worker app
  // Store token in localStorage as 'admin_token'
  // Store admin object as 'admin_user'
});

// Selectors
export const selectRole = state => state.auth.admin?.role;
export const selectJurisdiction = state => state.auth.admin?.jurisdiction_name;
```

### axiosInstance.js

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## Routing (AppRoutes.jsx)

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from '../features/auth/authSlice';
import ProtectedRoute from '../components/ProtectedRoute';

// RoleGate: renders children only if current role is in allowedRoles
function RoleGate({ allowedRoles, children }) {
  const role = useSelector(selectRole);
  if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bins" element={<BinMap />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="reports" element={<Reports />} />
        {/* ward_member only */}
        <Route path="tasks" element={<RoleGate allowedRoles={['ward_member']}><TaskManagement /></RoleGate>} />
        <Route path="workers" element={<RoleGate allowedRoles={['ward_member']}><WorkerManagement /></RoleGate>} />
        <Route path="issues" element={<RoleGate allowedRoles={['ward_member']}><IssueManagement /></RoleGate>} />
        {/* gram_panchayat and above */}
        <Route path="escalations" element={<RoleGate allowedRoles={['gram_panchayat','block_samiti','zilla_parishad']}><EscalationPanel /></RoleGate>} />
        <Route path="hierarchy" element={<RoleGate allowedRoles={['gram_panchayat','block_samiti','zilla_parishad']}><HierarchyManagement /></RoleGate>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
```

---

## AppShell.jsx

The persistent layout wrapper used for all authenticated pages.

```jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppShell() {
  return (
    <div className="admin-shell">
      <Navbar />
      <div className="admin-body">
        <Sidebar />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

---

## Sidebar.jsx

The sidebar renders different navigation items depending on the admin's role.

```jsx
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { selectRole, selectJurisdiction } from '../features/auth/authSlice';
import { LayoutDashboard, Map, ClipboardList, Users, AlertCircle, Megaphone, BarChart2, GitBranch, ArrowUpCircle, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
  { path: '/bins', label: 'Bin Map', icon: Map, roles: ['all'] },
  { path: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['ward_member'] },
  { path: '/workers', label: 'Workers', icon: Users, roles: ['ward_member'] },
  { path: '/issues', label: 'Issues', icon: AlertCircle, roles: ['ward_member'] },
  { path: '/escalations', label: 'Escalations', icon: ArrowUpCircle, roles: ['gram_panchayat', 'block_samiti', 'zilla_parishad'] },
  { path: '/hierarchy', label: 'Manage Admins', icon: GitBranch, roles: ['gram_panchayat', 'block_samiti', 'zilla_parishad'] },
  { path: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['all'] },
  { path: '/reports', label: 'Reports', icon: BarChart2, roles: ['all'] },
];

export default function Sidebar() {
  const role = useSelector(selectRole);
  const jurisdiction = useSelector(selectJurisdiction);

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes('all') || item.roles.includes(role)
  );

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-role">
        <p className="role-name">{role?.replace('_', ' ')}</p>
        <p className="jurisdiction">{jurisdiction}</p>
      </div>
      {visibleItems.map(({ path, label, icon: Icon }) => (
        <NavLink key={path} to={path} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
      <div style={{ flex: 1 }} />
      <button className="admin-nav-item" onClick={handleLogout} style={{ marginTop: 'auto', color: '#A32D2D' }}>
        <LogOut size={18} /> Logout
      </button>
    </aside>
  );
}
```

---

## Page Specifications

### Login.jsx

**Layout:**
- Full screen, `var(--admin-bg)` background.
- Centered card (white, 420px wide, border-radius 12px, bordered).
- Logo + "GramWaste Connect" heading at top of card.
- "Admin Portal" subtitle with a small role hint.
- Email input.
- Password input with show/hide.
- Login button (`admin-btn-primary`, full-width).
- Error message below button.
- Language switcher at bottom of card.

---

### Dashboard.jsx

**Route:** `/dashboard`

**Layout:**
- Page title: "{jurisdiction_name} — Overview".
- 4-column stat card grid (`admin-stat-grid`):
  - Bins monitored (total in jurisdiction)
  - Bins needing attention (fill_level > 80)
  - Tasks today (created today)
  - Open issues (status = open)
- For `ward_member`: also show "Workers Active Today".
- For higher roles: stat cards show aggregated numbers from all jurisdictions below.
- Recent Activity table (`admin-table`):
  - Columns: Type, Description, Location, Status, Time
  - Shows last 10 tasks/issues mixed, ordered by `created_at DESC`.
- Overdue Tasks alert box (shown if any tasks past `due_at`):
  - Red border panel, lists overdue tasks with worker name and days overdue.

**Data:** `GET /api/admin/dashboard`

---

### BinMap.jsx

**Route:** `/bins`

**Layout:**
- Page title: "Bin Map — {jurisdiction_name}".
- Filter row: All | Overflow | Full | OK (pill buttons).
- Full-height Leaflet map (600px minimum).
- Bin markers color-coded same as user app.
- Clicking marker → side panel slides in (right side, 300px) showing:
  - Bin label, fill level bar, last updated time.
  - For `ward_member`: "Create Cleanup Task" button → opens task creation modal pre-filled with bin location.
- Below map: Bins list table with sort by fill level.

**Data:** `GET /api/bins?village_id={admin's jurisdiction village IDs}`

---

### TaskManagement.jsx

**Route:** `/tasks` | **Visible to:** `ward_member` only

**Layout:**
- Page title: "Task Management".
- "Create New Task" button (top right) → opens creation modal.
- Filter tabs: All | Pending | Assigned | In Progress | Done | Overdue.
- Tasks table (`admin-table`):
  - Columns: Title, Type, Location, Assigned Worker, Status, Priority, Due Date, Actions.
  - Actions: Assign Worker (dropdown), View Proof (if done), Cancel.
- Task Creation Modal:
  - Fields: Title, Type (dropdown), Description, Location (map pin picker), Priority (1/2/3), Assign Worker (dropdown of active workers), Due Date.

**Data:**
- `GET /api/tasks` (filtered to ward_member's jurisdiction)
- `POST /api/tasks` (create)
- `PATCH /api/tasks/:id/assign` (assign worker)

---

### WorkerManagement.jsx

**Route:** `/workers` | **Visible to:** `ward_member` only

**Layout:**
- Page title: "Safai Mitra Workers".
- "Add New Worker" button → opens creation modal.
- Workers table:
  - Columns: Name, Employee ID, Assigned Area, Phone, Status (Active/Inactive), Last Login, Tasks Completed (count), Actions.
  - Actions: Deactivate.
- Worker Creation Modal:
  - Fields: Name, Phone (optional), Assigned Area (text), Village (dropdown).
  - On submit → `POST /api/workers`.
  - Show success screen with auto-generated Employee ID and temporary password prominently displayed (tell admin to note these down).

**Data:**
- `GET /api/workers`
- `POST /api/workers`
- `PATCH /api/workers/:id/deactivate`

---

### IssueManagement.jsx

**Route:** `/issues` | **Visible to:** `ward_member` only

**Layout:**
- Page title: "Resident Issue Reports".
- Filter tabs: Open | Assigned | Resolved | Rejected.
- Issues table:
  - Columns: Description (truncated), Location, Reported By, Photo (thumbnail), Status, Reported At, Actions.
  - Actions: "Convert to Task" button (for open issues) | "Reject" button | "View" link.
- Issue Detail Side Panel (slides in on "View"):
  - Full description, full-size photo, map showing location, reported date/time.
  - For open issues: "Convert to Task" form (priority, assign worker, due date) + "Reject" form (reason).

**Data:**
- `GET /api/issues?status=open`
- `PATCH /api/issues/:id/convert`
- `PATCH /api/issues/:id/reject`

---

### Announcements.jsx

**Route:** `/announcements` | **Visible to:** All roles

**Layout:**
- Page title: "Announcements & Tips".
- "Post New Announcement" button → opens creation modal.
- Announcements list (cards, most recent first, pinned at top):
  - Each card: Title, Content (truncated), Posted date, Target (specific village or "All"), Pin toggle, Delete button.
- Creation Modal:
  - Title input.
  - Content textarea.
  - Target Village (dropdown of villages in jurisdiction, or "All Villages").
  - Pin to top toggle.

**Data:**
- `GET /api/announcements` (admin's own announcements)
- `POST /api/announcements`
- `DELETE /api/announcements/:id`

---

### Reports.jsx

**Route:** `/reports` | **Visible to:** All roles

**Layout:**
- Page title: "Reports & Analytics".
- Date range picker (This Week / This Month / Custom).
- For `ward_member` — shows:
  - Tasks completed vs pending (bar chart).
  - Bin fill level history (line chart for top 5 bins).
  - Worker performance table: worker name, tasks assigned, tasks completed, completion rate %.
  - Issue resolution rate.
- For higher roles — shows:
  - Aggregate per Gram Panchayat / Block (stacked bar chart).
  - SLA compliance rate (% tasks completed before due_at).
  - District-wide bin status overview.
- Export as CSV button.

**Data:** `GET /api/admin/dashboard` (extended with date range query params)

**Charts:** Use `recharts` library (already in ecosystem, lightweight).

---

### HierarchyManagement.jsx

**Route:** `/hierarchy` | **Visible to:** `gram_panchayat`, `block_samiti`, `zilla_parishad`

**Layout:**
- Page title: "Manage Admins".
- "Create New Admin" button → opens creation modal.
- Sub-admins table:
  - Columns: Name, Email, Role, Jurisdiction, Created At, Status, Actions.
  - Actions: Deactivate.
- Role of admin being created is auto-determined by current admin's role (one level below).
- Creation Modal:
  - Name, Email, Password, Jurisdiction Name, (optional) Jurisdiction GeoJSON.
  - Password confirmation field.
  - Role label shown read-only (e.g., "This account will be created as: Ward Member").

**Data:**
- `GET /api/admin/sub-admins`
- `POST /api/admin/create`
- `PATCH /api/admin/:id/deactivate`

---

### EscalationPanel.jsx

**Route:** `/escalations` | **Visible to:** `gram_panchayat`, `block_samiti`, `zilla_parishad`

**Layout:**
- Page title: "Escalated Issues".
- Description: "These are overdue tasks and unresolved issues from your jurisdiction."
- Overdue tasks table:
  - Columns: Task Title, Village, Assigned Worker, Days Overdue, Status, Actions.
  - Actions: "Reassign Worker", "Mark Resolved", "Escalate Higher" (only available if not already at zilla_parishad level).
- Notes section: free text for adding resolution notes.

**Data:** Queried from `tasks` where `due_at < NOW()` and `status != 'done'`, scoped to jurisdiction.

---

## Role-Aware Sidebar Navigation Summary

| Nav Item | ward_member | gram_panchayat | block_samiti | zilla_parishad |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Bin Map | ✅ | ✅ | ✅ | ✅ |
| Tasks | ✅ | ❌ | ❌ | ❌ |
| Workers | ✅ | ❌ | ❌ | ❌ |
| Issues | ✅ | ❌ | ❌ | ❌ |
| Escalations | ❌ | ✅ | ✅ | ✅ |
| Manage Admins | ❌ | ✅ | ✅ | ✅ |
| Announcements | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ✅ |

---

## UI Checklist for Every New Page

- [ ] Page uses `admin-main` wrapper with correct padding
- [ ] Page title uses `.admin-page-title` class
- [ ] Stat cards use `.admin-stat-card` inside `.admin-stat-grid`
- [ ] Tables use `.admin-table` inside `.admin-table-wrap`
- [ ] Action buttons use `.admin-btn-primary` or `.admin-btn-outline`
- [ ] Status badges use `.admin-badge` with correct modifier class
- [ ] No claymorphism effects
- [ ] No mobile-specific bottom nav (this is desktop-first)
- [ ] Role-gating applied where needed (both in routing and in UI — hide buttons the role can't use)
- [ ] Loading state for all async data
- [ ] Empty state for tables with no data
- [ ] Error toast for failed API calls
