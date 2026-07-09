-- ============================================================
-- Phase 3 — Schema: tables + RPC for the /qrcode dashboard.
-- Idempotent: safe to run multiple times in the Supabase SQL editor.
-- Run order: 0001_schema -> 0002_rls -> 0003_storage -> 0004_seed_widgets.
-- ============================================================

-- ---------- widgets --------------------------------------------------------
-- Mirrors packages/shared Widget model. `config` and `layout` are jsonb blobs
-- validated by the per-type Zod schema at read time in the web app.
create table if not exists public.widgets (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  config     jsonb not null default '{}'::jsonb,
  layout     jsonb not null,
  visible    boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists widgets_position_idx on public.widgets (position);
create index if not exists widgets_visible_idx  on public.widgets (visible);

-- ---------- guestbook_messages --------------------------------------------
-- Anonymous visitors leave a word. Length constraints enforced in the DB so
-- they hold even if a client bypasses the API route.
create table if not exists public.guestbook_messages (
  id         uuid primary key default gen_random_uuid(),
  author     text not null check (char_length(author) between 1 and 40),
  message    text not null check (char_length(message) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_created_idx
  on public.guestbook_messages (created_at desc);

-- ---------- poll_votes -----------------------------------------------------
-- One vote per (poll widget, voter). voter_hash = hash(IP + UA) computed
-- server-side in the API route. Unique constraint enforces one-vote-per-voter.
create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  widget_id  uuid not null references public.widgets (id) on delete cascade,
  option     text not null,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  unique (widget_id, voter_hash)
);

create index if not exists poll_votes_widget_idx on public.poll_votes (widget_id);

-- ---------- visits ---------------------------------------------------------
-- Single-row counter table. Only ever touched through the RPCs below.
create table if not exists public.visits (
  id      integer primary key default 1 check (id = 1),
  count   bigint not null default 0
);

insert into public.visits (id, count)
values (1, 0)
on conflict (id) do nothing;

-- Atomic increment, returns the new total. security definer so it works even
-- though anon has no direct table privileges (RLS denies direct access).
create or replace function public.increment_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update public.visits
     set count = count + 1
   where id = 1
   returning count into new_count;
  return new_count;
end;
$$;

-- Read the current total without incrementing (subsequent loads in a session).
create or replace function public.get_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count from public.visits where id = 1;
$$;

grant execute on function public.increment_visits() to anon, authenticated;
grant execute on function public.get_visits()       to anon, authenticated;

-- ---------- realtime -------------------------------------------------------
-- Publish the tables the public dashboard subscribes to for live updates.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'widgets'
  ) then
    alter publication supabase_realtime add table public.widgets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guestbook_messages'
  ) then
    alter publication supabase_realtime add table public.guestbook_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'poll_votes'
  ) then
    alter publication supabase_realtime add table public.poll_votes;
  end if;
end $$;
