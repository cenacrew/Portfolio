-- ============================================================
-- Phase 12 — Emoji reactions on a widget.
-- One counter row per (widget, emoji). Visitors increment it through the
-- security-definer RPC (same recipe as the visits counter): anon has NO direct
-- write, only the RPC. Public may read the tallies to render the tile.
-- Rows cascade-delete with their widget, so removing a reactions tile purges
-- its counters automatically.
-- Idempotent: safe to run multiple times in the Supabase SQL editor.
-- Run after 0008_widget_qa.sql.
-- ============================================================

create table if not exists public.widget_reactions (
  widget_id uuid not null references public.widgets (id) on delete cascade,
  emoji     text not null check (char_length(emoji) between 1 and 8),
  count     bigint not null default 0,
  primary key (widget_id, emoji)
);

create index if not exists widget_reactions_widget_idx
  on public.widget_reactions (widget_id);

-- ---------- RLS ------------------------------------------------------------
alter table public.widget_reactions enable row level security;

drop policy if exists "widget_reactions public read"  on public.widget_reactions;
drop policy if exists "widget_reactions admin write"   on public.widget_reactions;
drop policy if exists "widget_reactions admin update"  on public.widget_reactions;
drop policy if exists "widget_reactions admin delete"  on public.widget_reactions;

-- Everyone reads the tallies to render the tile.
create policy "widget_reactions public read" on public.widget_reactions
  for select to anon, authenticated using (true);

-- No anonymous direct write: increments go through increment_reaction() only.
-- The admin may seed / clear counters if ever needed.
create policy "widget_reactions admin write" on public.widget_reactions
  for insert to authenticated with check (true);
create policy "widget_reactions admin update" on public.widget_reactions
  for update to authenticated using (true) with check (true);
create policy "widget_reactions admin delete" on public.widget_reactions
  for delete to authenticated using (true);

-- ---------- increment RPC --------------------------------------------------
-- Atomic upsert-and-increment. security definer so anon (which has no direct
-- write privilege under RLS) can still bump a counter through this function.
-- Returns the new count for the (widget, emoji).
create or replace function public.increment_reaction(p_widget_id uuid, p_emoji text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  if char_length(p_emoji) < 1 or char_length(p_emoji) > 8 then
    raise exception 'invalid emoji';
  end if;
  insert into public.widget_reactions (widget_id, emoji, count)
  values (p_widget_id, p_emoji, 1)
  on conflict (widget_id, emoji)
    do update set count = public.widget_reactions.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

grant execute on function public.increment_reaction(uuid, text) to anon, authenticated;

-- ---------- realtime -------------------------------------------------------
-- Publish the table so the public dashboard sees counters move live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'widget_reactions'
  ) then
    alter publication supabase_realtime add table public.widget_reactions;
  end if;
end $$;
