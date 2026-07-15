-- ============================================================
-- Phase 13 — Mini-game high scores (Snake / Flappy).
-- One row per submitted run. The public may READ the board to render the tile
-- and the modal leaderboard; there is NO anonymous write path. New scores are
-- inserted exclusively by the server API route using the service_role key
-- (which bypasses RLS), after it has validated the game, the 3-letter pseudo
-- and a per-game plausibility ceiling. The admin (authenticated) may delete a
-- row for moderation.
-- Idempotent: safe to run multiple times in the Supabase SQL editor.
-- Run after 0009_reactions.sql.
-- ============================================================

create table if not exists public.game_scores (
  id         uuid primary key default gen_random_uuid(),
  game       text not null check (game in ('snake', 'flappy')),
  pseudo     text not null check (pseudo ~ '^[A-Z]{3}$'),
  score      integer not null check (score >= 0 and score <= 100000),
  created_at timestamptz not null default now()
);

-- Board query is "top N by score for one game": index (game, score desc).
create index if not exists game_scores_game_score_idx
  on public.game_scores (game, score desc, created_at asc);

-- ---------- RLS ------------------------------------------------------------
alter table public.game_scores enable row level security;

drop policy if exists "game_scores public read"  on public.game_scores;
drop policy if exists "game_scores admin delete"  on public.game_scores;
drop policy if exists "game_scores admin update"  on public.game_scores;

-- Everyone reads the board to render the tile + modal leaderboard.
create policy "game_scores public read" on public.game_scores
  for select to anon, authenticated using (true);

-- No insert policy for anon/authenticated: writes only come from the service
-- role (server API route), which bypasses RLS. The admin may prune / fix rows.
create policy "game_scores admin update" on public.game_scores
  for update to authenticated using (true) with check (true);
create policy "game_scores admin delete" on public.game_scores
  for delete to authenticated using (true);

-- ---------- realtime -------------------------------------------------------
-- Publish the table so a submitted score shows up live on the tile / board in
-- other browsers without a refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_scores'
  ) then
    alter publication supabase_realtime add table public.game_scores;
  end if;
end $$;
