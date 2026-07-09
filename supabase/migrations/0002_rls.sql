-- ============================================================
-- Phase 3 — Row Level Security. Run after 0001_schema.sql.
-- Public reads what is visible; only the authenticated admin writes.
-- Anonymous visitors may ONLY insert guestbook messages and poll votes.
-- visits is reachable through the security-definer RPCs only.
-- Idempotent: every policy is dropped-if-exists before being recreated.
-- ============================================================

-- ---------- widgets --------------------------------------------------------
alter table public.widgets enable row level security;

drop policy if exists "widgets public read"  on public.widgets;
drop policy if exists "widgets admin read"    on public.widgets;
drop policy if exists "widgets admin insert"  on public.widgets;
drop policy if exists "widgets admin update"  on public.widgets;
drop policy if exists "widgets admin delete"  on public.widgets;

-- Anonymous / public: only visible widgets.
create policy "widgets public read" on public.widgets
  for select to anon using (visible = true);

-- Admin (authenticated): full read, including hidden widgets.
create policy "widgets admin read"   on public.widgets for select to authenticated using (true);
create policy "widgets admin insert" on public.widgets for insert to authenticated with check (true);
create policy "widgets admin update" on public.widgets for update to authenticated using (true) with check (true);
create policy "widgets admin delete" on public.widgets for delete to authenticated using (true);

-- ---------- guestbook_messages --------------------------------------------
alter table public.guestbook_messages enable row level security;

drop policy if exists "guestbook public read"  on public.guestbook_messages;
drop policy if exists "guestbook anon insert"   on public.guestbook_messages;
drop policy if exists "guestbook admin delete"  on public.guestbook_messages;

-- Everyone reads the guestbook.
create policy "guestbook public read" on public.guestbook_messages
  for select to anon, authenticated using (true);

-- Anonymous visitors may insert (length limits also enforced by CHECK).
create policy "guestbook anon insert" on public.guestbook_messages
  for insert to anon, authenticated
  with check (char_length(author) between 1 and 40 and char_length(message) between 1 and 280);

-- Only the admin can moderate (delete).
create policy "guestbook admin delete" on public.guestbook_messages
  for delete to authenticated using (true);

-- ---------- poll_votes -----------------------------------------------------
alter table public.poll_votes enable row level security;

drop policy if exists "poll_votes public read" on public.poll_votes;
drop policy if exists "poll_votes anon insert"  on public.poll_votes;
drop policy if exists "poll_votes admin delete" on public.poll_votes;

-- Public reads votes to render tallies.
create policy "poll_votes public read" on public.poll_votes
  for select to anon, authenticated using (true);

-- Anonymous visitors may cast a vote (uniqueness enforced by the constraint).
create policy "poll_votes anon insert" on public.poll_votes
  for insert to anon, authenticated with check (true);

-- Admin can clear votes if needed.
create policy "poll_votes admin delete" on public.poll_votes
  for delete to authenticated using (true);

-- ---------- visits ---------------------------------------------------------
-- RLS on with NO policies => no direct table access for anyone. The counter
-- is reachable exclusively through increment_visits() / get_visits() (both
-- security definer, granted to anon + authenticated).
alter table public.visits enable row level security;
