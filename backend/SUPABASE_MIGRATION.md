# Supabase Tables — Smart Bins & Recycling Centers

Run the following SQL in your **Supabase Dashboard → SQL Editor**.

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
