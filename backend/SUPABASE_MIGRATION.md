# Supabase Tables — Smart Bins & Recycling Centers

Run the following SQL in your **Supabase Dashboard → SQL Editor**.

## Phase 0 Migration — Run in Supabase SQL Editor

-- Step 1: Add ward_member to role enum (if role is a custom type)
-- Find the enum name first:
--   SELECT typname FROM pg_type WHERE typcategory = 'E';
-- Then run:
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'ward_member';

-- Step 2: Add LGD code columns
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS lgd_jurisdiction_code text;

ALTER TABLE villages
  ADD COLUMN IF NOT EXISTS lgd_state_code    text,
  ADD COLUMN IF NOT EXISTS lgd_district_code text,
  ADD COLUMN IF NOT EXISTS lgd_block_code    text,
  ADD COLUMN IF NOT EXISTS lgd_gp_code       text,
  ADD COLUMN IF NOT EXISTS lgd_village_code  text;

-- Step 3: Seed LGD data for the demo village
-- Source: lgdirectory.nic.in — Maharashtra state data
-- These are real LGD codes for the Pune / Haveli / Uruli Kanchan area.
UPDATE villages
SET
  lgd_state_code    = '27',
  lgd_district_code = '523',
  lgd_block_code    = '5504',
  lgd_gp_code       = '556432'
WHERE gram_panchayat_name ILIKE 'Uruli Kanchan%';

-- If the village does not exist yet, insert it:
INSERT INTO villages
  (name, district, block_name, gram_panchayat_name,
   location_lat, location_lng,
   lgd_state_code, lgd_district_code, lgd_block_code, lgd_gp_code)
VALUES
  ('Uruli Kanchan', 'Pune District', 'Haveli Block', 'Uruli Kanchan GP',
   18.5089, 74.0578,
   '27', '523', '5504', '556432')
ON CONFLICT DO NOTHING;

## 1. Smart Bins table

```sql
create table if not exists public.smart_bins (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  bin_type    text not null default 'general',   -- general | recyclable | wet | hazardous
  fill_level  integer not null default 0 check (fill_level between 0 and 100),
  location_lat  double precision not null,
  location_lng  double precision not null,
  village_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Row-level security: everyone can read, only service-role can write
alter table public.smart_bins enable row level security;
create policy "anon_read_bins"  on public.smart_bins for select using (true);
create policy "service_write_bins" on public.smart_bins for all using (auth.role() = 'service_role');
```

## 2. Recycling Centers table

```sql
create table if not exists public.recycling_centers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text default '',
  accepts     text[] default '{}',               -- e.g. {"paper","plastic","glass"}
  location_lat  double precision not null,
  location_lng  double precision not null,
  village_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.recycling_centers enable row level security;
create policy "anon_read_centers"  on public.recycling_centers for select using (true);
create policy "service_write_centers" on public.recycling_centers for all using (auth.role() = 'service_role');
```

---

## Adding bins from the Admin side

The backend exposes these **protected write endpoints** (require `Authorization: Bearer <ADMIN_API_KEY>`):

| Method | Endpoint | Body |
|--------|----------|------|
| `POST` | `/api/bins` | `{ label, location_lat, location_lng, village_id?, bin_type?, fill_level? }` |
| `PATCH` | `/api/bins/:id` | any of the above fields |
| `DELETE` | `/api/bins/:id` | — |
| `POST` | `/api/recycling-centers` | `{ name, location_lat, location_lng, village_id?, address?, accepts? }` |
| `PATCH` | `/api/recycling-centers/:id` | any of the above fields |
| `DELETE` | `/api/recycling-centers/:id` | — |

### Example curl to add a bin:
```bash
curl -X POST http://localhost:5000/api/bins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-to-a-strong-secret" \
  -d '{
    "label": "Main Street Bin",
    "bin_type": "recyclable",
    "fill_level": 40,
    "location_lat": 28.6139,
    "location_lng": 77.2090,
    "village_id": "your-village-id"
  }'
```

### Example curl to add a recycling center:
```bash
curl -X POST http://localhost:5000/api/recycling-centers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-to-a-strong-secret" \
  -d '{
    "name": "GramWaste Recycling Hub",
    "address": "Near Panchayat Bhawan",
    "accepts": ["paper", "plastic", "glass"],
    "location_lat": 28.6145,
    "location_lng": 77.2100,
    "village_id": "your-village-id"
  }'
```

> **Note:** Replace `change-me-to-a-strong-secret` with the `ADMIN_API_KEY` you set in `backend/.env`.
