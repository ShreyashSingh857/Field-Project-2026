-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role USER-DEFINED NOT NULL,
  parent_admin_id uuid,
  jurisdiction_name text NOT NULL,
  jurisdiction_geom jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_parent_admin_id_fkey FOREIGN KEY (parent_admin_id) REFERENCES public.admins(id),
  CONSTRAINT admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_village_id uuid,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id),
  CONSTRAINT announcements_target_village_id_fkey FOREIGN KEY (target_village_id) REFERENCES public.villages(id)
);
CREATE TABLE public.bin_sensor_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bin_id uuid NOT NULL,
  fill_level integer NOT NULL CHECK (fill_level >= 0 AND fill_level <= 100),
  source text NOT NULL DEFAULT 'sensor'::text CHECK (source = ANY (ARRAY['sensor'::text, 'manual'::text, 'admin'::text])),
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bin_sensor_log_pkey PRIMARY KEY (id),
  CONSTRAINT bin_sensor_log_bin_id_fkey FOREIGN KEY (bin_id) REFERENCES public.bins(id)
);
CREATE TABLE public.bins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  location_address text,
  fill_level integer NOT NULL DEFAULT 0 CHECK (fill_level >= 0 AND fill_level <= 100),
  fill_status USER-DEFINED NOT NULL DEFAULT 'empty'::bin_fill_level,
  last_sensor_update timestamp with time zone,
  assigned_panchayat_id uuid NOT NULL,
  village_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  sensor_device_id text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bins_pkey PRIMARY KEY (id),
  CONSTRAINT bins_assigned_panchayat_id_fkey FOREIGN KEY (assigned_panchayat_id) REFERENCES public.admins(id),
  CONSTRAINT bins_village_id_fkey FOREIGN KEY (village_id) REFERENCES public.villages(id)
);
CREATE TABLE public.issue_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  photo_url text,
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  location_address text,
  village_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'open'::issue_status,
  created_task_id uuid,
  reviewed_by uuid,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT issue_reports_pkey PRIMARY KEY (id),
  CONSTRAINT issue_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT issue_reports_village_id_fkey FOREIGN KEY (village_id) REFERENCES public.villages(id),
  CONSTRAINT issue_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admins(id),
  CONSTRAINT fk_issue_created_task FOREIGN KEY (created_task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.marketplace_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  photo_url text,
  contact_number text NOT NULL,
  village_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id),
  CONSTRAINT marketplace_listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT marketplace_listings_village_id_fkey FOREIGN KEY (village_id) REFERENCES public.villages(id)
);
CREATE TABLE public.recycling_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text DEFAULT ''::text,
  accepts ARRAY DEFAULT '{}'::text[],
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  village_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recycling_centers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.smart_bins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  bin_type text NOT NULL DEFAULT 'general'::text,
  fill_level integer NOT NULL DEFAULT 0 CHECK (fill_level >= 0 AND fill_level <= 100),
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  village_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT smart_bins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.task_status_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  changed_by_worker uuid,
  changed_by_admin uuid,
  old_status USER-DEFINED,
  new_status USER-DEFINED NOT NULL,
  note text,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_status_log_pkey PRIMARY KEY (id),
  CONSTRAINT task_status_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_status_log_changed_by_worker_fkey FOREIGN KEY (changed_by_worker) REFERENCES public.workers(id),
  CONSTRAINT task_status_log_changed_by_admin_fkey FOREIGN KEY (changed_by_admin) REFERENCES public.admins(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL DEFAULT 'other'::task_type,
  title text NOT NULL,
  description text,
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  location_address text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::task_status,
  priority integer NOT NULL DEFAULT 2 CHECK (priority = ANY (ARRAY[1, 2, 3])),
  assigned_worker_id uuid,
  created_by_admin_id uuid,
  reported_by_user_id uuid,
  source_issue_id uuid,
  bin_id uuid,
  proof_photo_url text,
  village_id uuid,
  due_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_worker_id_fkey FOREIGN KEY (assigned_worker_id) REFERENCES public.workers(id),
  CONSTRAINT tasks_created_by_admin_id_fkey FOREIGN KEY (created_by_admin_id) REFERENCES public.admins(id),
  CONSTRAINT tasks_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id),
  CONSTRAINT tasks_source_issue_id_fkey FOREIGN KEY (source_issue_id) REFERENCES public.issue_reports(id),
  CONSTRAINT tasks_bin_id_fkey FOREIGN KEY (bin_id) REFERENCES public.bins(id),
  CONSTRAINT tasks_village_id_fkey FOREIGN KEY (village_id) REFERENCES public.villages(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  name text NOT NULL,
  phone text UNIQUE,
  village_id uuid,
  language USER-DEFINED NOT NULL DEFAULT 'en'::language_preference,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_village_id_fkey FOREIGN KEY (village_id) REFERENCES public.villages(id)
);
CREATE TABLE public.villages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL,
  block_name text NOT NULL,
  gram_panchayat_name text NOT NULL,
  location_lat double precision,
  location_lng double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT villages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_id text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  phone text,
  assigned_area text NOT NULL,
  village_id uuid,
  created_by_admin_id uuid NOT NULL,
  language USER-DEFINED NOT NULL DEFAULT 'hi'::language_preference,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workers_pkey PRIMARY KEY (id),
  CONSTRAINT workers_village_id_fkey FOREIGN KEY (village_id) REFERENCES public.villages(id),
  CONSTRAINT workers_created_by_admin_id_fkey FOREIGN KEY (created_by_admin_id) REFERENCES public.admins(id)
);