# GramWaste Connect — UI Design System

> **Reference document for all apps** (`user-app`, `worker-app`, `admin-app`).  
> Follow this guide when building _any_ new page or component so the look stays consistent.

---

## 1. Brand Assets

| Asset | Path | Usage |
|---|---|---|
| Logo (PNG) | `apps/GlobalResources/Logo.png` | Always copy to the target app's `public/` folder and reference as `/Logo.png` |
| Logo placement | Header only | Inside a white clay-icon circle (`clay-icon` class, `background: #fff`) |

---

## 2. Color Palette

| Token | CSS Variable | Hex | Use |
|---|---|---|---|
| Page Background | `--clay-bg` | `#E8F5E9` | `body`, page wrapper `div` |
| Card Background | `--clay-card` | `#C8E6C9` | Cards, header, small buttons |
| Alt Card | `--clay-card-alt` | `#DCEDC8` | Secondary surfaces |
| Primary Green | `--clay-primary` | `#2E7D32` | Icon color, focus rings |
| Secondary Green | `--clay-secondary` | `#4CAF50` | Highlights, accents |
| Accent Dark | `--clay-accent` | `#1B5E20` | FAB background, dark buttons |
| Text | `--clay-text` | `#1A1A1A` | All body text (always use `text-black` or `#1A1A1A`) |
| Muted Text | `--clay-muted` | `#2E7D32` | Subtitles, descriptions |

> **Rule:** Never use raw Tailwind color names like `text-green-700` for text — always use `text-black` for primary copy and `style={{ color: "var(--clay-muted)" }}` for muted text.

---

## 3. Claymorphism Shadow System

Defined as CSS variables in `index.css`:

```css
/* Standard raised clay element */
--clay-shadow:
  0 6px 14px rgba(0,0,0,0.10),
  0 3px 6px  rgba(0,0,0,0.06),
  inset 0 2px 4px rgba(255,255,255,0.50);

/* Hover state */
--clay-shadow-hover:
  0 10px 24px rgba(0,0,0,0.14),
  0 5px 10px  rgba(0,0,0,0.08),
  inset 0 2px 4px rgba(255,255,255,0.55);

/* Active / pressed state */
--clay-shadow-active:
  0 3px 8px rgba(0,0,0,0.10),
  inset 0 2px 4px rgba(255,255,255,0.40);

/* FAB dark button */
--clay-shadow-fab:
  0 8px 20px rgba(27,94,32,0.45),
  0 4px 8px  rgba(0,0,0,0.12),
  inset 0 2px 3px rgba(255,255,255,0.20);
```

---

## 4. CSS Utility Classes

All classes live in `src/index.css`. Import them via `@import "tailwindcss"` — they are global.

### 4.1 `clay-card`
Used for: Feature cards, info panels, content blocks

```
border-radius: 24px
background: var(--clay-card)
border: 1.5px solid rgba(255,255,255,0.55)
box-shadow: var(--clay-shadow)
transition: transform 0.25s ease, box-shadow 0.25s ease
hover → translateY(-4px) + --clay-shadow-hover
active → scale(0.975) + --clay-shadow-active
```

**JSX usage:**
```jsx
<div className="clay-card p-4">…</div>
// or as a button:
<button className="clay-card p-3 text-left">…</button>
```

---

### 4.2 `clay-header`
Used for: The sticky top navigation bar

```
border-radius: 0 0 28px 28px   ← rounded bottom corners only
background: var(--clay-card)
box-shadow: 0 6px 18px rgba(0,0,0,0.10), inset 0 2px 4px rgba(255,255,255,0.50)
```

**JSX usage:**
```jsx
<header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
```

---

### 4.3 `clay-btn-round`
Used for: Hamburger menu button, sidebar close button, any small circular action button

```
border-radius: 50%
background: var(--clay-card)
box-shadow: var(--clay-shadow)
border: 1.5px solid rgba(255,255,255,0.55)
active → scale(0.88)
```

**JSX usage:**
```jsx
<button className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black">
  <Menu className="h-5 w-5" />
</button>
```

---

### 4.4 `clay-icon`
Used for: Card icon containers, logo circle

```
border-radius: 50%
box-shadow: var(--clay-shadow)
border: 1.5px solid rgba(255,255,255,0.55)
```

**Logo usage (white bg):**
```jsx
<div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: "#fff" }}>
  <img src="/Logo.png" alt="GramWaste Connect logo" className="h-9 w-9 object-contain" />
</div>
```

**Icon usage (clay-bg):**
```jsx
<div className="clay-icon inline-flex h-10 w-10 items-center justify-center"
     style={{ backgroundColor: "var(--clay-bg)", color: "var(--clay-primary)" }}>
  <MapPin className="h-5 w-5" />
</div>
```

---

### 4.5 `clay-fab`
Used for: Floating action button (chatbot, primary CTA)

```
border-radius: 50%
background: var(--clay-accent)   ← #1B5E20 dark green
box-shadow: var(--clay-shadow-fab)
border: 1.5px solid rgba(255,255,255,0.18)
hover → translateY(-3px)
active → scale(0.88)
```

**JSX usage:**
```jsx
<button className="clay-fab absolute bottom-4 right-4 inline-flex h-14 w-14 items-center justify-center text-green-50 sm:bottom-5 sm:right-5">
  <MessageCircle className="h-6 w-6" />
</button>
```

---

### 4.6 `clay-sidebar`
Used for: Slide-in drawer / sidebar panel

```
border-radius: 0 28px 28px 0    ← rounded right corners only
background: var(--clay-bg)
box-shadow: 6px 0 24px rgba(0,0,0,0.12), inset -2px 0 4px rgba(255,255,255,0.40)
border-right: 1.5px solid rgba(255,255,255,0.50)
```

**JSX usage:**
```jsx
<aside className={`clay-sidebar absolute left-0 top-0 h-full w-72 max-w-[86%] p-5 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
```

---

### 4.7 `clay-lang-box`
Used for: Language selector box, small content boxes inside sidebar

```
border-radius: 18px
background: #fff
box-shadow: var(--clay-shadow)
border: 1.5px solid rgba(255,255,255,0.55)
```

---

### 4.8 `clay-nav-item`
Used for: Sidebar navigation buttons, menu list items

```
border-radius: 16px
hover → background: var(--clay-card), box-shadow: var(--clay-shadow), translateX(3px)
active → scale(0.97)
transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease
```

**JSX usage:**
```jsx
<button className="clay-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-black">
  <User className="h-4 w-4" />
  Profile
</button>
```

---

## 5. Typography

| Use | Tailwind class |
|---|---|
| Page title | `text-lg font-bold text-black sm:text-xl md:text-2xl` |
| Section subtitle | `text-sm md:text-base` + `style={{ color: "var(--clay-muted)" }}` |
| Card title | `text-sm font-semibold text-black sm:text-base` |
| Card description | `text-xs leading-5 sm:text-sm` + `style={{ color: "var(--clay-muted)" }}` |
| App name (header) | `text-sm font-bold text-black sm:text-base` |
| App subtitle (header) | `text-xs sm:text-sm` + `style={{ color: "var(--clay-muted)" }}` |
| Sidebar label | `text-base font-semibold text-black` |
| Sidebar nav item | `text-sm font-medium text-black` |

---

## 6. Layout Rules

### Page wrapper
```jsx
<div className="min-h-screen text-black" style={{ backgroundColor: "var(--clay-bg)" }}>
  <div className="relative min-h-screen w-full" style={{ backgroundColor: "var(--clay-bg)" }}>
    …
  </div>
</div>
```

### Main content area
```jsx
<main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 pb-24 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8">
```

### Feature card grid (mobile-first)
```jsx
<section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
  {/* Regular card: col-span-1 */}
  {/* Full-width card: col-span-2 md:col-span-3 lg:col-span-4 */}
</section>
```

---

## 7. Animation & Interaction Standards

| Interaction | Effect |
|---|---|
| Card hover | `translateY(-4px)` + deeper shadow |
| Card press | `scale(0.975) translateY(-1px)` |
| Round button press | `scale(0.88)` |
| FAB hover | `translateY(-3px)` + deeper shadow |
| FAB press | `scale(0.88)` |
| Sidebar nav hover | `translateX(3px)` + clay-card bg |
| All transitions | `0.25s ease` (buttons use `0.2s ease`) |

---

## 8. Icon Library

Use **Lucide React** exclusively:  
```
import { MapPin, Camera, Recycle, AlertTriangle, Leaf, Menu, X, … } from "lucide-react";
```

Icon sizes:
- Card icon: `h-5 w-5` (inside a `h-10 w-10` clay-icon container)
- Header icon: `h-5 w-5`
- Sidebar nav: `h-4 w-4`
- FAB: `h-6 w-6`

---

## 9. Full Page Template

```jsx
export default function SomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen text-black" style={{ backgroundColor: "var(--clay-bg)" }}>
      <div className="relative min-h-screen w-full" style={{ backgroundColor: "var(--clay-bg)" }}>

        {/* Header */}
        <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black"
                  onClick={() => setDrawerOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: "#fff" }}>
              <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-black sm:text-base">GramWaste Connect</p>
              <p className="text-xs sm:text-sm" style={{ color: "var(--clay-muted)" }}>Smart Waste Dashboard</p>
            </div>
          </div>
        </header>

        {/* Sidebar Drawer */}
        <div className={`absolute inset-0 z-30 transition ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          <button className={`absolute inset-0 bg-black/35 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
                  onClick={() => setDrawerOpen(false)} />
          <aside className={`clay-sidebar absolute left-0 top-0 h-full w-72 max-w-[86%] p-5 transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
            {/* Sidebar content */}
          </aside>
        </div>

        {/* Main */}
        <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 pb-24 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8">
          <h1 className="text-lg font-bold text-black sm:text-xl">Page Title</h1>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            <button className="clay-card col-span-1 p-3 text-left sm:p-4">
              <div className="clay-icon mb-3 inline-flex h-10 w-10 items-center justify-center"
                   style={{ backgroundColor: "var(--clay-bg)", color: "var(--clay-primary)" }}>
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-semibold text-black">Card Title</h2>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--clay-muted)" }}>Description</p>
            </button>
          </section>
        </main>

        {/* FAB */}
        <button className="clay-fab absolute bottom-4 right-4 inline-flex h-14 w-14 items-center justify-center text-green-50 sm:bottom-5 sm:right-5">
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
```

---

## 10. Checklist for New Pages

- [ ] Page wrapper uses `var(--clay-bg)` background
- [ ] Header uses `clay-header` with Logo.png in `clay-icon` (white bg)
- [ ] Hamburger uses `clay-btn-round`
- [ ] Content cards use `clay-card`
- [ ] Card icons use `clay-icon` with `var(--clay-bg)` bg and `var(--clay-primary)` color
- [ ] Sidebar uses `clay-sidebar`
- [ ] Sidebar nav items use `clay-nav-item`
- [ ] Language picker uses `clay-lang-box`
- [ ] FAB uses `clay-fab` with dark accent background
- [ ] All text uses `text-black` (primary) or `var(--clay-muted)` (secondary)
- [ ] No hardcoded color hex values in JSX — use CSS variables
- [ ] Icons from Lucide React only
