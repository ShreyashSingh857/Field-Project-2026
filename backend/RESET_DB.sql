-- ============================================================
-- Full application data reset for Supabase
-- Truncates all public app tables and geo reference tables.
-- Does NOT touch auth.users or other Supabase system tables.
-- ============================================================

TRUNCATE TABLE
  public.task_status_log,
  public.tasks,
  public.issue_reports,
  public.workers,
  public.smart_bins,
  public.bin_sensor_log,
  public.bins,
  public.marketplace_listings,
  public.announcements,
  public.recycling_centers,
  public.villages,
  public.admins,
  public.users,
  public.geo_gram_panchayats,
  public.geo_blocks,
  public.geo_districts,
  public.geo_states
RESTART IDENTITY CASCADE;

-- After running this, reseed in this order:
-- 1. geo_states
-- 2. geo_districts
-- 3. geo_blocks
-- 4. geo_gram_panchayats
-- 5. admins demo accounts
-- 6. villages and app demo data