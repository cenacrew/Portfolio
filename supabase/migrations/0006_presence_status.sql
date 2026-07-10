-- ============================================================
-- Phase 4.8 — admin presence (C1) + status moved to the header (B2).
-- Adds columns to the single site_settings row. Idempotent: safe to re-run.
-- Run after 0005_site_settings.sql.
-- ============================================================

-- ---------- admin presence (C1) --------------------------------------------
-- Written by the mobile app on launch (IANA timezone + coordinates + city).
-- The public header clock (A4) uses tz; the weather widget and "ma loc" maps
-- use lat/lng/city as their live source (falling back to their own config).
alter table public.site_settings add column if not exists tz            text;
alter table public.site_settings add column if not exists lat           double precision;
alter table public.site_settings add column if not exists lng           double precision;
alter table public.site_settings add column if not exists city          text;
alter table public.site_settings add column if not exists presence_updated_at timestamptz;

-- ---------- status in the header (B2) --------------------------------------
-- The status/mood tile left the grid and now lives in the header. Its data
-- moves onto site_settings so the En-tête screen edits it. status_moods holds
-- the admin's custom quick moods (the built-in ones live in shared code).
alter table public.site_settings add column if not exists status_emoji text not null default '💻';
alter table public.site_settings add column if not exists status_text  text not null default 'En train de coder';
alter table public.site_settings add column if not exists status_moods jsonb not null default '[]'::jsonb;

-- New columns inherit the table's existing RLS (public read, admin write) and
-- its realtime publication, so nothing else is needed here.
