-- ============================================================
-- Phase 19 — Reactions v2: one active reaction per visitor (toggle),
-- visitor-added custom emojis, and admin moderation.
--
-- Adds `widget_reaction_marks`: a per-visitor trace of WHICH emojis a visitor
-- currently reacts with, keyed by the same salted IP+UA hash the poll uses
-- (voter_hash). It lets the server enforce "one active reaction per emoji per
-- visitor" and make a second tap REMOVE the reaction (like/unlike), on top of
-- the existing per-IP rate limit.
--
-- Anon has NO direct write to either table; all mutations go through the
-- security-definer RPCs below (same recipe as increment_reaction / the visits
-- counter). The admin (authenticated) may read and purge marks for moderation.
--
-- Idempotent: safe to run multiple times in the Supabase SQL editor.
-- Run after 0013_widget_qa_breakpoint.sql. Requires 0009_reactions.sql
-- (widget_reactions + increment_reaction).
-- ============================================================

-- ---------- marks table ----------------------------------------------------
create table if not exists public.widget_reaction_marks (
  widget_id  uuid not null references public.widgets (id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 8),
  voter_hash text not null,
  created_at timestamptz not null default now(),
  primary key (widget_id, emoji, voter_hash)
);

create index if not exists widget_reaction_marks_widget_emoji_idx
  on public.widget_reaction_marks (widget_id, emoji);

-- ---------- RLS ------------------------------------------------------------
alter table public.widget_reaction_marks enable row level security;

drop policy if exists "widget_reaction_marks admin read"   on public.widget_reaction_marks;
drop policy if exists "widget_reaction_marks admin insert" on public.widget_reaction_marks;
drop policy if exists "widget_reaction_marks admin update" on public.widget_reaction_marks;
drop policy if exists "widget_reaction_marks admin delete" on public.widget_reaction_marks;

-- No anon policy at all: anon reaches marks ONLY through the RPCs (security
-- definer). The admin may read/purge them for moderation.
create policy "widget_reaction_marks admin read" on public.widget_reaction_marks
  for select to authenticated using (true);
create policy "widget_reaction_marks admin insert" on public.widget_reaction_marks
  for insert to authenticated with check (true);
create policy "widget_reaction_marks admin update" on public.widget_reaction_marks
  for update to authenticated using (true) with check (true);
create policy "widget_reaction_marks admin delete" on public.widget_reaction_marks
  for delete to authenticated using (true);

-- ---------- toggle RPC -----------------------------------------------------
-- One active reaction per (widget, emoji, visitor). A first call records the
-- mark and bumps the counter; a second call (same visitor+emoji) removes the
-- mark and decrements the counter (never below 0). Atomic: the mark row is the
-- single source of truth, so concurrent taps can't double-count.
-- Returns the new count and whether the visitor's reaction is now active.
create or replace function public.toggle_reaction(
  p_widget_id uuid,
  p_emoji text,
  p_voter_hash text
)
returns table (count bigint, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  had_mark boolean;
  new_count bigint;
begin
  if char_length(p_emoji) < 1 or char_length(p_emoji) > 8 then
    raise exception 'invalid emoji';
  end if;
  if p_voter_hash is null or char_length(p_voter_hash) = 0 then
    raise exception 'missing voter hash';
  end if;

  -- Claim/release the mark atomically; its presence decides the direction.
  delete from public.widget_reaction_marks m
    where m.widget_id = p_widget_id and m.emoji = p_emoji and m.voter_hash = p_voter_hash;
  had_mark := found;

  if had_mark then
    -- Un-react: decrement the counter, floored at 0.
    update public.widget_reactions r
      set count = greatest(r.count - 1, 0)
      where r.widget_id = p_widget_id and r.emoji = p_emoji
      returning r.count into new_count;
    if new_count is null then
      -- Counter row missing (shouldn't happen): treat as 0.
      new_count := 0;
    end if;
    return query select new_count, false;
  else
    -- React: record the mark, then bump (creating the counter row if needed).
    insert into public.widget_reaction_marks (widget_id, emoji, voter_hash)
      values (p_widget_id, p_emoji, p_voter_hash)
      on conflict do nothing;
    insert into public.widget_reactions (widget_id, emoji, count)
      values (p_widget_id, p_emoji, 1)
      on conflict (widget_id, emoji)
        do update set count = public.widget_reactions.count + 1
      returning count into new_count;
    return query select new_count, true;
  end if;
end;
$$;

grant execute on function public.toggle_reaction(uuid, text, text) to anon, authenticated;

-- ---------- custom-emoji RPC -----------------------------------------------
-- A visitor adds a new emoji to a reactions tile: this creates its counter row
-- (count 0) so it appears for everyone via Realtime. Enforces a cap on the
-- number of CUSTOM emojis (those not in the widget's configured set) so the
-- tile can't be flooded. Idempotent: re-adding an existing emoji is a no-op.
-- Returns the current count for the (widget, emoji).
create or replace function public.add_custom_reaction(
  p_widget_id uuid,
  p_emoji text,
  p_config_emojis text[],
  p_cap int
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count bigint;
  custom_count int;
begin
  if char_length(p_emoji) < 1 or char_length(p_emoji) > 8 then
    raise exception 'invalid emoji';
  end if;

  -- Already present (configured or previously added): return its count, no cap.
  select r.count into existing_count
    from public.widget_reactions r
    where r.widget_id = p_widget_id and r.emoji = p_emoji;
  if found then
    return existing_count;
  end if;

  -- Count existing CUSTOM emojis (rows whose emoji isn't in the config set).
  select count(*) into custom_count
    from public.widget_reactions r
    where r.widget_id = p_widget_id
      and not (r.emoji = any (coalesce(p_config_emojis, array[]::text[])));
  if custom_count >= coalesce(p_cap, 8) then
    raise exception 'custom emoji cap reached';
  end if;

  insert into public.widget_reactions (widget_id, emoji, count)
    values (p_widget_id, p_emoji, 0)
    on conflict (widget_id, emoji) do nothing;
  return 0;
end;
$$;

grant execute on function public.add_custom_reaction(uuid, text, text[], int) to anon, authenticated;
