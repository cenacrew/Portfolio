-- ============================================================
-- Phase 18 — QA split by breakpoint.
-- The QA console is now scoped to a single grid context: opened from the mobile
-- app's WebView it audits the mobile 3-column renders; opened on a PC it audits
-- the desktop 9-column renders. So widget_qa gains a `breakpoint` column and its
-- primary key becomes (widget_type, format, breakpoint): each (type, format)
-- couple is validated independently per breakpoint.
--
-- Backfill: every pre-migration row (validated for both contexts under the old
-- key) is duplicated onto BOTH breakpoints, preserving prior validations.
--
-- Admin-only table (RLS unchanged from 0008; the public /qrcode never touches
-- it). All app code tolerates its absence AND the pre-0013 shape (column absent
-- → current behaviour). Idempotent: safe to run multiple times.
-- Run after 0008_widget_qa.sql.
-- ============================================================

-- 1. New column (nullable for now so the backfill can populate it).
alter table public.widget_qa
  add column if not exists breakpoint text;

-- 2. Drop the OLD primary key (widget_type, format) so a couple can exist twice
--    — once per breakpoint. Postgres names it "<table>_pkey" by default.
alter table public.widget_qa
  drop constraint if exists widget_qa_pkey;

-- 3. Backfill. Duplicate every pre-migration row (breakpoint still null) onto the
--    desktop breakpoint, then stamp the originals as mobile. After the first run
--    no row has a null breakpoint, so both statements become no-ops (idempotent).
insert into public.widget_qa
  (widget_type, format, breakpoint, validated_hash, status, note, screenshot_url, updated_at)
select
  widget_type, format, 'desktop', validated_hash, status, note, screenshot_url, updated_at
from public.widget_qa
where breakpoint is null;

update public.widget_qa
  set breakpoint = 'mobile'
  where breakpoint is null;

-- 4. Now that every row has a breakpoint, enforce not-null + the value domain.
alter table public.widget_qa
  alter column breakpoint set not null;

do $$ begin
  alter table public.widget_qa
    add constraint widget_qa_breakpoint_check
    check (breakpoint in ('mobile', 'desktop'));
exception when duplicate_object then null; end $$;

-- 5. New composite primary key including the breakpoint.
do $$ begin
  alter table public.widget_qa
    add constraint widget_qa_pkey
    primary key (widget_type, format, breakpoint);
exception when duplicate_object then null; end $$;
