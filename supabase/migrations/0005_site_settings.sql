-- ============================================================
-- Phase 4.5 — Editable dashboard header (site_settings).
-- One row that drives the /qrcode header (name, tagline, chips). Read publicly,
-- written only by the authenticated admin. Idempotent: safe to re-run.
-- Run after 0004_seed_widgets.sql.
-- ============================================================

create table if not exists public.site_settings (
  id             integer primary key default 1 check (id = 1),
  name           text not null default '',
  tagline        text not null default '',
  -- The "available for a project" chip: free text, keeps the blinking green dot
  -- on the public page. Hidden when available_show = false.
  available_text text not null default '',
  available_show boolean not null default true,
  -- The location chip (pin icon). Hidden when location_show = false.
  location       text not null default '',
  location_show  boolean not null default true,
  -- Extra free chips, e.g. [{ "label": "Freelance" }]. Optional.
  chips          jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

-- Seed the single row with the values currently hard-coded in QrHeader.
insert into public.site_settings (id, name, tagline, available_text, available_show, location, location_show, chips)
values (
  1,
  'Valentin Sourdois Pajot',
  'Développeur Full-Stack · créatif du numérique',
  'Dispo pour un projet',
  true,
  'Bordeaux',
  true,
  '[]'::jsonb
)
on conflict (id) do nothing;

-- ---------- RLS ------------------------------------------------------------
alter table public.site_settings enable row level security;

drop policy if exists "site_settings public read"   on public.site_settings;
drop policy if exists "site_settings admin insert"   on public.site_settings;
drop policy if exists "site_settings admin update"   on public.site_settings;

-- Everyone reads the header.
create policy "site_settings public read" on public.site_settings
  for select to anon, authenticated using (true);

-- Only the admin edits it.
create policy "site_settings admin insert" on public.site_settings
  for insert to authenticated with check (id = 1);
create policy "site_settings admin update" on public.site_settings
  for update to authenticated using (id = 1) with check (id = 1);

-- ---------- realtime -------------------------------------------------------
-- Publish so the public header updates live when edited from the app.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_settings'
  ) then
    alter publication supabase_realtime add table public.site_settings;
  end if;
end $$;
