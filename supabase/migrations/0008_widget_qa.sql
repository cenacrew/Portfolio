-- ============================================================
-- Phase 9 — Widget QA workflow ("test widgets").
-- Tracks, per (widget_type, format), the last human-validated code hash so the
-- test console can flag a widget as "to verify" whenever its code changes.
-- Purely an admin tool: RLS grants BOTH read and write to authenticated only —
-- nothing here is public (unlike widgets / dashboards). The public /qrcode never
-- touches this table, and all app code tolerates its absence (pre-migration).
-- Idempotent: safe to run multiple times in the Supabase SQL editor.
-- Run after 0007_dashboards.sql.
-- ============================================================

create table if not exists public.widget_qa (
  widget_type    text not null,
  -- Grid format as "WxH" (e.g. "1x1", "2x3"). Part of the composite key so each
  -- format of a type is validated independently.
  format         text not null,
  -- The widget-code hash (from apps/web/src/widgets/qa-manifest.json) that was
  -- validated by a human. Null = never validated → always "to verify".
  validated_hash text,
  -- pending  : never reviewed (or reset via "re-verify").
  -- ok       : validated at validated_hash.
  -- issue    : reviewed and flagged (see note / screenshot_url).
  status         text not null default 'pending'
                 check (status in ('pending', 'ok', 'issue')),
  note           text,
  screenshot_url text,
  updated_at     timestamptz not null default now(),
  primary key (widget_type, format)
);

-- ---------- RLS ------------------------------------------------------------
alter table public.widget_qa enable row level security;

drop policy if exists "widget_qa admin read"   on public.widget_qa;
drop policy if exists "widget_qa admin insert" on public.widget_qa;
drop policy if exists "widget_qa admin update" on public.widget_qa;
drop policy if exists "widget_qa admin delete" on public.widget_qa;

-- Admin-only: read AND write reserved to the authenticated role. No anon access.
create policy "widget_qa admin read" on public.widget_qa
  for select to authenticated using (true);
create policy "widget_qa admin insert" on public.widget_qa
  for insert to authenticated with check (true);
create policy "widget_qa admin update" on public.widget_qa
  for update to authenticated using (true) with check (true);
create policy "widget_qa admin delete" on public.widget_qa
  for delete to authenticated using (true);
