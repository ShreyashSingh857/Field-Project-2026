-- ============================================================
-- Geographic Boundaries Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add LGD/Census code columns to existing villages table
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS lgd_state_code    text,
  ADD COLUMN IF NOT EXISTS lgd_district_code text,
  ADD COLUMN IF NOT EXISTS lgd_block_code    text,
  ADD COLUMN IF NOT EXISTS lgd_gp_code       text,
  ADD COLUMN IF NOT EXISTS lgd_village_code  text;

-- 2. Add LGD code column to admins table
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS lgd_jurisdiction_code text;

-- 3. Create states reference table
CREATE TABLE IF NOT EXISTS public.geo_states (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  census_code text NOT NULL UNIQUE,
  lgd_code    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. Create districts reference table
CREATE TABLE IF NOT EXISTS public.geo_districts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  state_id        uuid REFERENCES public.geo_states(id),
  census_code     text NOT NULL,
  lgd_code        text,
  state_census_code text,
  boundary_geojson jsonb,
  centroid_lat    double precision,
  centroid_lng    double precision,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(census_code, state_census_code)
);

-- 5. Create blocks reference table
CREATE TABLE IF NOT EXISTS public.geo_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  district_id     uuid REFERENCES public.geo_districts(id),
  census_code     text NOT NULL,
  state_census_code text,
  district_census_code text,
  boundary_geojson jsonb,
  centroid_lat    double precision,
  centroid_lng    double precision,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(census_code, district_census_code)
);

-- 6. Create gram panchayats reference table
CREATE TABLE IF NOT EXISTS public.geo_gram_panchayats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  block_id        uuid REFERENCES public.geo_blocks(id),
  district_id     uuid REFERENCES public.geo_districts(id),
  census_code     text NOT NULL UNIQUE,
  state_census_code text,
  district_census_code text,
  block_census_code text,
  boundary_geojson jsonb,
  centroid_lat    double precision,
  centroid_lng    double precision,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 7. Enable RLS — read-only for all authenticated users
ALTER TABLE public.geo_states          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_districts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_gram_panchayats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_geo_states"  ON public.geo_states          FOR SELECT USING (true);
CREATE POLICY "read_geo_dist"    ON public.geo_districts       FOR SELECT USING (true);
CREATE POLICY "read_geo_blocks"  ON public.geo_blocks          FOR SELECT USING (true);
CREATE POLICY "read_geo_gps"     ON public.geo_gram_panchayats FOR SELECT USING (true);

-- Only service role can write
CREATE POLICY "service_write_states"  ON public.geo_states          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_dist"    ON public.geo_districts       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_blocks"  ON public.geo_blocks          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_gps"     ON public.geo_gram_panchayats FOR ALL USING (auth.role() = 'service_role');

-- 8. Indexes for common lookup patterns
CREATE INDEX IF NOT EXISTS idx_geo_dist_state   ON public.geo_districts(state_census_code);
CREATE INDEX IF NOT EXISTS idx_geo_blocks_dist  ON public.geo_blocks(district_census_code);
CREATE INDEX IF NOT EXISTS idx_geo_gp_block     ON public.geo_gram_panchayats(block_census_code);
CREATE INDEX IF NOT EXISTS idx_geo_gp_dist      ON public.geo_gram_panchayats(district_census_code);
