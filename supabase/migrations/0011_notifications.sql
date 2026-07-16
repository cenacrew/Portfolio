-- ============================================================
-- Phase 15 — Push notifications for the admin (Expo push).
--
-- Two tables, both ADMIN-ONLY (RLS reserves read AND write to the authenticated
-- role — nothing public). The server sends pushes with the service_role key,
-- which bypasses RLS, so it can read the registered devices and the prefs even
-- though anon has no access.
--
--   admin_devices      — one row per Expo push token (the admin's phone[s]).
--   notification_prefs — a single settings row: one on/off per event source,
--                        plus a mode for visits (off | instant | daily) and a
--                        baseline counter used by the daily visits digest cron.
--
-- Idempotent: safe to run multiple times in the Supabase SQL editor.
-- Run after 0010_game_scores.sql.
-- ============================================================

-- ---------- admin_devices --------------------------------------------------
create table if not exists public.admin_devices (
  id              uuid primary key default gen_random_uuid(),
  expo_push_token text not null unique,
  platform        text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

alter table public.admin_devices enable row level security;

drop policy if exists "admin_devices auth all" on public.admin_devices;
-- The signed-in admin manages their own device registrations. The server, which
-- fans out the pushes, uses the service role and bypasses RLS entirely.
create policy "admin_devices auth all" on public.admin_devices
  for all to authenticated using (true) with check (true);

-- ---------- notification_prefs ---------------------------------------------
-- Single-row table (id is pinned to 1). Prefs are SERVER-side, not per-device:
-- turning a source off silences it for every registered device.
create table if not exists public.notification_prefs (
  id                       integer primary key default 1 check (id = 1),
  guestbook_enabled        boolean not null default true,
  toile_enabled            boolean not null default true,
  poll_enabled             boolean not null default true,
  -- Reactions fire often; default them off so the admin opts in on purpose.
  reactions_enabled        boolean not null default false,
  games_enabled            boolean not null default true,
  -- Visits: off (silent) | instant (every visit, assumed spammy) | daily
  -- (one summary per day via the Vercel cron).
  visits_mode              text not null default 'off'
                             check (visits_mode in ('off', 'instant', 'daily')),
  -- Baseline for the daily digest: the visit total at the last cron run, so the
  -- next run can report the delta. Not user-facing.
  visits_digest_last_count bigint not null default 0,
  updated_at               timestamptz not null default now()
);

-- Seed the single row so reads always find it (defaults above).
insert into public.notification_prefs (id) values (1)
  on conflict (id) do nothing;

alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs auth all" on public.notification_prefs;
create policy "notification_prefs auth all" on public.notification_prefs
  for all to authenticated using (true) with check (true);
