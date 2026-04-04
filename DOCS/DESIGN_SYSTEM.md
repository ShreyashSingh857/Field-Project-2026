# GramWasteConnect — Design System Reference

> This document summarizes the UI design language for all three apps.
> For the User App, the full reference is `DOCS/GlobalResources/UI_DESIGN_SYSTEM.md`.
> This document covers the Worker and Admin app styles, plus shared brand rules.

---

## Shared Brand Identity

All three apps belong to the same product family and share a green colour identity.

| Brand Token | Value | Meaning |
|---|---|---|
| Primary Green | `#2E7D32` | Main brand green — used as primary action colour in all apps |
| Accent Dark Green | `#1B5E20` | Darker tone — headers, dark buttons |
| Secondary Green | `#4CAF50` | Lighter accent — highlights, hover states |
| Background Light | `#E8F5E9` / `#F1F8E9` | Page backgrounds across all apps |
| Text | `#1A1A1A` | Primary text, all apps |
| Muted Text | `#666666` | Secondary text, labels |

**Rule:** Every app must use this green family. Never introduce a completely different primary colour. The visual language changes (claymorphism vs flat vs structured) but the green stays consistent.

---

## App-by-App UI Style Guide

### User App — Claymorphism

- Full reference: `DOCS/GlobalResources/UI_DESIGN_SYSTEM.md`
- Style: Soft, rounded, layered. Elevated clay cards with inner highlights.
- Audience: General public, village users on phones.
- Nav: Hamburger + sidebar drawer.
- Classes: `clay-card`, `clay-header`, `clay-fab`, `clay-icon`, `clay-sidebar`, `clay-nav-item`, `clay-btn-round`, `clay-lang-box`.

### Safai Mitra App — Flat Mobile

- Reference: `apps/worker-app/src/index.css` + `SAFAI_MITRA_APP.md`
- Style: Flat white cards with colored left-border status indicators. No heavy shadows.
- Audience: Field workers on low-cost Android devices, outdoors.
- Nav: Fixed bottom navigation (3 tabs: Tasks, Map, Profile).
- Classes: `sm-task-card`, `sm-topbar`, `sm-badge`, `sm-btn-primary`, `sm-bottom-nav`, `sm-nav-item`.

### Admin App — Desktop Dashboard

- Reference: `apps/admin-app/src/index.css` + `ADMIN_APP.md`
- Style: Clean white panels, fixed left sidebar, data tables, stat cards. Professional MIS feel.
- Audience: Government officials at desktop browsers.
- Nav: Fixed left sidebar (240px) + sticky top header.
- Classes: `admin-shell`, `admin-sidebar`, `admin-nav-item`, `admin-panel`, `admin-stat-card`, `admin-table`, `admin-btn-primary`.

---

## Status Colour System (Shared Across Apps)

All three apps use the same semantic colour mapping for task/bin/issue statuses:

| Status | Background | Text | Use |
|---|---|---|---|
| Done / OK / Active | `#EAF3DE` | `#3B6D11` | Completed tasks, healthy bins, active workers |
| Pending / Warning | `#FAEEDA` | `#854F0B` | Pending tasks, medium-fill bins |
| Urgent / Danger | `#FCEBEB` | `#A32D2D` | Urgent tasks, overflow bins, open critical issues |
| Info / In Progress | `#E6F1FB` | `#185FA5` | In-progress tasks, informational states |

---

## Icons

All three apps use **Lucide React** exclusively.

```bash
npm install lucide-react
```

Common icon mappings:
| Concept | Icon |
|---|---|
| Bins | `Trash2` |
| Tasks / Clipboard | `ClipboardList` |
| Workers | `Users` |
| Map | `Map` or `MapPin` |
| Report Issue | `AlertTriangle` |
| AI Scanner | `Camera` |
| Chatbot | `MessageCircle` |
| Marketplace | `Recycle` or `ShoppingBag` |
| Announcements | `Megaphone` |
| Reports | `BarChart2` |
| Hierarchy | `GitBranch` |
| Escalation | `ArrowUpCircle` |
| Logout | `LogOut` |
| Profile | `User` |
| Settings | `Settings` |
| Back | `ArrowLeft` |
| Add | `Plus` |
| Done / Check | `CheckCircle2` |
| Loading | `Loader2` (with spin animation) |

---

## Logo Usage

- Logo file: `apps/GlobalResources/Logo.png`
- Copy to each app's `public/` folder as `Logo.png`.
- User App: In clay-icon circle (white background, `clay-icon` class).
- Safai Mitra App: Centered on login screen (60×60px), top bar can show text name only.
- Admin App: In top header bar (36×36px) alongside "GramWaste Connect" text.

---

## Typography Scale

| Use | Size | Weight | Note |
|---|---|---|---|
| Page title | 20px | 600 | Admin app |
| Section heading | 16–18px | 600 | All apps |
| Card title | 14px | 600 | All apps |
| Body / description | 14px | 400 | All apps |
| Label / meta | 12–13px | 400 | All apps |
| Badge | 11–12px | 600 | All apps |
| Tiny label | 10–11px | 400–500 | Nav items, timestamps |

Font family: system-ui / sans-serif (no custom font imports required — keep bundle lean).

---

## Responsive Breakpoints

| App | Primary Target | Breakpoints |
|---|---|---|
| User App | Mobile (375px+) | sm: 640px, md: 768px, lg: 1024px |
| Safai Mitra App | Mobile only (360px–480px) | Minimal breakpoints needed |
| Admin App | Desktop (1024px+) | Collapse sidebar at < 768px (hide or hamburger toggle) |

---

## Spacing System

Use consistent spacing units across all apps:

| Token | Value | Use |
|---|---|---|
| xs | 4px | Icon internal gaps |
| sm | 8px | Between badge and text |
| md | 12–16px | Card internal padding |
| lg | 20–24px | Page section gaps |
| xl | 32px+ | Major section separations |

---

## Loading & Error States

Every page that fetches data must handle three states:

**Loading:** Show a centered spinner. Use `Loader2` from Lucide with a CSS spin animation.
```css
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
```

**Error:** Show an inline error message with a red-bordered box and retry button.

**Empty:** Show an illustration or icon + helpful message. Never show a blank page or empty table with no message.

---

## Form Input Styling (All Apps)

Inputs should be clean and high-contrast. No custom libraries needed — style native HTML inputs:

```css
.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #C8E6C9;
  border-radius: 8px;
  font-size: 15px;
  color: #1A1A1A;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: #2E7D32; }
.form-input::placeholder { color: #aaa; }
```

---

## Map Tile URL (OpenStreetMap — no API key required)

Use this tile URL in all Leaflet maps across all three apps:

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Attribution (required by OpenStreetMap license):
```
© OpenStreetMap contributors
```

Always include the attribution in your `<TileLayer />` component:
```jsx
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
/>
```

**Default map center for all maps in the absence of GPS:**
Set to the geographic center of India as fallback: `[20.5937, 78.9629]`, zoom 5.
When GPS is available, center to user/worker location at zoom 15.

---

## Leaflet Vite Fix

Leaflet's default marker icons break in Vite due to asset path issues. Add this fix once in each app that uses Leaflet:

```javascript
// In main.jsx or a leaflet-setup.js imported before any map
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
```

---

## i18n Translation Key Conventions

All three apps use `react-i18next`. Keys follow this naming pattern:

```
{pageName}.{element}
{pageName}.{section}.{element}
common.{element}
```

Examples:
```json
{
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel"
  },
  "login": {
    "title": "Welcome Back",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "submitBtn": "Login"
  },
  "dashboard": {
    "title": "Dashboard",
    "bins": "Nearby Bins",
    "tasks": "My Tasks"
  }
}
```

Always add all three languages (en/hi/mr) at the same time when adding new keys. Never leave a key missing in one language.
