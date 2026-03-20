# GramWasteConnect — Supabase Postgres Database Schema

> **Reference document for backend developers and AI assistants.**
> This schema powers all three apps: User App, Safai Mitra App, and Admin App.
> Database: Supabase Postgres. Storage: Supabase Storage Buckets.
> All tables use UUID primary keys. Row Level Security (RLS) must be enabled on all tables.

---

## Storage Buckets

| Bucket Name         | Purpose                                      | Access         |
|---------------------|----------------------------------------------|----------------|
| `task-proofs`       | Photos uploaded by workers on task completion | Private (auth) |
| `marketplace-photos`| Listing photos uploaded by users             | Public         |
| `issue-photos`      | Photos of reported waste problems by users   | Private (auth) |

---

## Enums

Define these as Postgres ENUM types before creating tables.

```sql
CREATE TYPE admin_role AS ENUM (
  'zilla_parishad',
  'block_samiti',
  'gram_panchayat',
  'panchayat_admin'
);

CREATE TYPE task_type AS ENUM (
  'bin_clean',
  'litter_pickup',
  'drain_clearance',
  'other'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'assigned',
  'in_progress',
  'done',
  'cancelled'
);

CREATE TYPE issue_status AS ENUM (
  'open',
  'assigned',
  'resolved',
  'rejected'
);

CREATE TYPE bin_fill_level AS ENUM (
  'empty',
  'low',
  'medium',
  'high',
  'full',
  'overflow'
);

CREATE TYPE language_preference AS ENUM (
  'en',
  'hi',
  'mr'
);
```

---

## Tables

### 1. `users`

Stores end-users of the User App. Auth is handled by Supabase Auth — this table extends the auth.users record with app-specific data.

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT UNIQUE,
  village_id      UUID REFERENCES villages(id) ON DELETE SET NULL,
  language        language_preference NOT NULL DEFAULT 'en',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `id` mirrors `auth.users.id` from Supabase Auth — created automatically via a trigger on signup.
- `village_id` links user to their village for scoping announcements and marketplace listings.
- `phone` is optional but recommended for marketplace contact info.

---

### 2. `villages`

Master list of villages in the system. Each village belongs to a Panchayat Admin's jurisdiction.

```sql
CREATE TABLE villages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  district            TEXT NOT NULL,
  block_name          TEXT NOT NULL,
  gram_panchayat_name TEXT NOT NULL,
  location_lat        DOUBLE PRECISION,
  location_lng        DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3. `admins`

All four levels of admin hierarchy. Self-referencing via `parent_admin_id` to model the tree.

```sql
CREATE TABLE admins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  role                admin_role NOT NULL,
  parent_admin_id     UUID REFERENCES admins(id) ON DELETE SET NULL,
  jurisdiction_name   TEXT NOT NULL,
  jurisdiction_geom   JSONB,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at       TIMESTAMPTZ,
  created_by          UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `role` determines what data they can see and what actions they can take.
- `parent_admin_id` is NULL only for the top-level Zilla Parishad admin (seeded by developers).
- `jurisdiction_geom` stores a GeoJSON polygon or bounding box for geographic scoping. Can be NULL — text-based `jurisdiction_name` is always the fallback.
- `created_by` records which admin created this account (enforces cascade-down creation rule).

**Hierarchy rules (enforced at application level):**
- `zilla_parishad` can create `block_samiti`
- `block_samiti` can create `gram_panchayat`
- `gram_panchayat` can create `panchayat_admin`
- `panchayat_admin` can create `workers`

---

### 4. `workers`

Safai Mitra workers, created and managed by `panchayat_admin`.

```sql
CREATE TABLE workers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  employee_id         TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  phone               TEXT,
  assigned_area       TEXT NOT NULL,
  village_id          UUID REFERENCES villages(id) ON DELETE SET NULL,
  created_by_admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  language            language_preference NOT NULL DEFAULT 'hi',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `employee_id` is the login credential (e.g., `GWC-WRK-0042`). Generated by backend on creation.
- `created_by_admin_id` must point to an admin with role `panchayat_admin`.
- `assigned_area` is a text description of their coverage zone (e.g., "Ward 3, Gokul Nagar").

---

### 5. `bins`

Dustbins tracked in the system. Fill level updated by IoT sensors or manually by admin.

```sql
CREATE TABLE bins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label               TEXT NOT NULL,
  location_lat        DOUBLE PRECISION NOT NULL,
  location_lng        DOUBLE PRECISION NOT NULL,
  location_address    TEXT,
  fill_level          INTEGER NOT NULL DEFAULT 0 CHECK (fill_level >= 0 AND fill_level <= 100),
  fill_status         bin_fill_level NOT NULL DEFAULT 'empty',
  last_sensor_update  TIMESTAMPTZ,
  assigned_panchayat_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  village_id          UUID REFERENCES villages(id) ON DELETE SET NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sensor_device_id    TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `fill_level` is 0–100 integer (percentage). Updated by the sensor endpoint.
- `fill_status` is a computed label derived from `fill_level`:
  - 0–10 → `empty`, 11–30 → `low`, 31–60 → `medium`, 61–80 → `high`, 81–95 → `full`, 96–100 → `overflow`
- `sensor_device_id` is the hardware device identifier for IoT integration. NULL until hardware is deployed.
- `assigned_panchayat_id` must reference an admin with role `panchayat_admin`.

**Trigger: auto-compute fill_status from fill_level**
```sql
CREATE OR REPLACE FUNCTION compute_fill_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fill_status :=
    CASE
      WHEN NEW.fill_level <= 10 THEN 'empty'::bin_fill_level
      WHEN NEW.fill_level <= 30 THEN 'low'::bin_fill_level
      WHEN NEW.fill_level <= 60 THEN 'medium'::bin_fill_level
      WHEN NEW.fill_level <= 80 THEN 'high'::bin_fill_level
      WHEN NEW.fill_level <= 95 THEN 'full'::bin_fill_level
      ELSE 'overflow'::bin_fill_level
    END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_fill_status
BEFORE INSERT OR UPDATE OF fill_level ON bins
FOR EACH ROW EXECUTE FUNCTION compute_fill_status();
```

---

### 6. `tasks`

Work orders for Safai Mitra workers. Created by admins or auto-generated from user issue reports.

```sql
CREATE TABLE tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  task_type NOT NULL DEFAULT 'other',
  title                 TEXT NOT NULL,
  description           TEXT,
  location_lat          DOUBLE PRECISION NOT NULL,
  location_lng          DOUBLE PRECISION NOT NULL,
  location_address      TEXT,
  status                task_status NOT NULL DEFAULT 'pending',
  priority              INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  assigned_worker_id    UUID REFERENCES workers(id) ON DELETE SET NULL,
  created_by_admin_id   UUID REFERENCES admins(id) ON DELETE SET NULL,
  reported_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  source_issue_id       UUID REFERENCES issue_reports(id) ON DELETE SET NULL,
  bin_id                UUID REFERENCES bins(id) ON DELETE SET NULL,
  proof_photo_url       TEXT,
  village_id            UUID REFERENCES villages(id) ON DELETE SET NULL,
  due_at                TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `priority`: 1 = Urgent, 2 = Normal, 3 = Low.
- `created_by_admin_id` is set when admin manually creates a task.
- `reported_by_user_id` is set when task is auto-generated from a user issue report.
- `source_issue_id` links back to the original `issue_reports` row.
- `bin_id` is set for `bin_clean` type tasks linking to a specific bin.
- `proof_photo_url` is a Supabase Storage URL, set when worker completes the task.
- Only one of `created_by_admin_id` or `reported_by_user_id` is typically set, not both.

---

### 7. `issue_reports`

Waste problems reported by users from the User App.

```sql
CREATE TABLE issue_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  photo_url         TEXT,
  location_lat      DOUBLE PRECISION NOT NULL,
  location_lng      DOUBLE PRECISION NOT NULL,
  location_address  TEXT,
  village_id        UUID REFERENCES villages(id) ON DELETE SET NULL,
  status            issue_status NOT NULL DEFAULT 'open',
  created_task_id   UUID REFERENCES tasks(id) ON DELETE SET NULL,
  reviewed_by       UUID REFERENCES admins(id) ON DELETE SET NULL,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `status` flow: `open` → `assigned` (when converted to task) → `resolved` (when task done) or `rejected`.
- `created_task_id` is populated when a `panchayat_admin` converts the issue into a task.
- `reviewed_by` is the admin who acted on this issue.

---

### 8. `marketplace_listings`

Peer-to-peer second-hand item listings in the Marketplace feature.

```sql
CREATE TABLE marketplace_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  photo_url       TEXT,
  contact_number  TEXT NOT NULL,
  village_id      UUID REFERENCES villages(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `contact_number` is shown publicly on the listing — users connect outside the app.
- `village_id` scopes listings to nearby users.
- Soft-delete via `is_active = FALSE`.

---

### 9. `announcements`

Tips, alerts, and announcements posted by admins and shown in the User App's Waste Tips feed.

```sql
CREATE TABLE announcements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by        UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  target_village_id UUID REFERENCES villages(id) ON DELETE CASCADE,
  is_pinned         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `target_village_id` NULL means the announcement is broadcast to all villages under the admin's jurisdiction.
- `is_pinned` shows the announcement at the top of the feed.
- Any admin level can post, but users only see announcements relevant to their `village_id`.

---

### 10. `task_status_log`

Audit trail for every status change on a task.

```sql
CREATE TABLE task_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  changed_by_worker UUID REFERENCES workers(id) ON DELETE SET NULL,
  changed_by_admin  UUID REFERENCES admins(id) ON DELETE SET NULL,
  old_status    task_status,
  new_status    task_status NOT NULL,
  note          TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 11. `bin_sensor_log`

Historical log of bin fill level readings from IoT sensors or manual updates.

```sql
CREATE TABLE bin_sensor_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id      UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  fill_level  INTEGER NOT NULL CHECK (fill_level >= 0 AND fill_level <= 100),
  source      TEXT NOT NULL DEFAULT 'sensor' CHECK (source IN ('sensor', 'manual', 'admin')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Indexes

```sql
-- Users
CREATE INDEX idx_users_village ON users(village_id);

-- Admins
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_parent ON admins(parent_admin_id);

-- Workers
CREATE INDEX idx_workers_admin ON workers(created_by_admin_id);
CREATE INDEX idx_workers_village ON workers(village_id);

-- Bins
CREATE INDEX idx_bins_village ON bins(village_id);
CREATE INDEX idx_bins_panchayat ON bins(assigned_panchayat_id);
CREATE INDEX idx_bins_location ON bins USING GIST (
  ll_to_earth(location_lat, location_lng)
);

-- Tasks
CREATE INDEX idx_tasks_worker ON tasks(assigned_worker_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_village ON tasks(village_id);
CREATE INDEX idx_tasks_admin ON tasks(created_by_admin_id);
CREATE INDEX idx_tasks_issue ON tasks(source_issue_id);

-- Issue Reports
CREATE INDEX idx_issues_user ON issue_reports(user_id);
CREATE INDEX idx_issues_status ON issue_reports(status);
CREATE INDEX idx_issues_village ON issue_reports(village_id);

-- Marketplace
CREATE INDEX idx_marketplace_user ON marketplace_listings(user_id);
CREATE INDEX idx_marketplace_village ON marketplace_listings(village_id);
CREATE INDEX idx_marketplace_active ON marketplace_listings(is_active);

-- Announcements
CREATE INDEX idx_announcements_village ON announcements(target_village_id);
CREATE INDEX idx_announcements_active ON announcements(is_active);

-- Logs
CREATE INDEX idx_sensor_log_bin ON bin_sensor_log(bin_id);
CREATE INDEX idx_sensor_log_time ON bin_sensor_log(recorded_at DESC);
CREATE INDEX idx_task_log_task ON task_status_log(task_id);
```

---

## Row Level Security (RLS) Policies

Enable RLS on all tables. These policies run at the database level as a safety net in addition to application-level auth checks.

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own record
CREATE POLICY users_self ON users
  USING (id = auth.uid());

-- Issue reports: users see only their own
CREATE POLICY issues_own ON issue_reports
  USING (user_id = auth.uid());

-- Marketplace: users see all active listings; can only edit their own
CREATE POLICY marketplace_read ON marketplace_listings
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY marketplace_write ON marketplace_listings
  FOR ALL USING (user_id = auth.uid());

-- Announcements: all authenticated users can read active ones
CREATE POLICY announcements_read ON announcements
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');
```

**Note:** Workers and Admins authenticate via JWT (not Supabase Auth), so their access is enforced at the Node.js middleware level, not via RLS. RLS applies only to Supabase Auth users (the User App).

---

## Trigger: Auto-create user profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Role-Access Matrix

This table summarizes which database tables each actor can read (R) or write (W).

| Table                | User App | Worker (Safai Mitra) | Panchayat Admin | Gram Panchayat | Block Samiti | Zilla Parishad |
|----------------------|----------|----------------------|-----------------|----------------|--------------|----------------|
| `users`              | R/W self | —                    | R (their area)  | —              | —            | —              |
| `villages`           | R        | R                    | R               | R              | R            | R              |
| `bins`               | R        | R                    | R/W             | R              | R            | R              |
| `tasks`              | —        | R assigned/area      | R/W             | R              | R            | R              |
| `issue_reports`      | R/W self | R (their area)       | R/W             | R              | R            | R              |
| `marketplace_listings`| R/W self| —                    | —               | —              | —            | —              |
| `announcements`      | R        | R                    | R/W             | R/W            | R/W          | R/W            |
| `admins`             | —        | —                    | R/W (below only)| R/W (below)    | R/W (below)  | R/W (below)    |
| `workers`            | —        | R self               | R/W             | R              | R            | R              |
| `bin_sensor_log`     | —        | —                    | R               | R              | R            | R              |
| `task_status_log`    | —        | R/W own tasks        | R               | R              | R            | R              |

---

## Entity Relationship Summary

```
auth.users (Supabase)
    └── users (1:1 extension)
            └── village_id → villages
            └── issue_reports (1:many)
            └── marketplace_listings (1:many)

admins (self-referencing tree)
    └── parent_admin_id → admins
    └── creates → workers (1:many)
    └── creates → tasks (1:many)
    └── creates → announcements (1:many)
    └── assigns → bins (1:many)

workers
    └── created_by_admin_id → admins (panchayat_admin)
    └── assigned tasks → tasks (1:many)

bins
    └── assigned_panchayat_id → admins
    └── bin_sensor_log (1:many)

tasks
    └── assigned_worker_id → workers
    └── created_by_admin_id → admins
    └── reported_by_user_id → users
    └── source_issue_id → issue_reports
    └── bin_id → bins
    └── task_status_log (1:many)

issue_reports
    └── user_id → users
    └── created_task_id → tasks (nullable, set after conversion)
    └── reviewed_by → admins
```
