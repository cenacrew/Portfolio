-- ============================================================
-- Phase 20 — Fix: toggle_reaction ambiguous "count" reference.
--
-- 0014's toggle_reaction declares `returns table (count bigint, active boolean)`,
-- so `count` is also a PL/pgSQL OUT variable. In the react branch the counter
-- upsert ended with an UNQUALIFIED `returning count into new_count`, which
-- Postgres could not resolve between that OUT variable and the
-- widget_reactions.count column → runtime error 42702
-- ("column reference \"count\" is ambiguous"). Every first tap therefore failed
-- (the API surfaced a generic 500), so no reaction could be toggled in prod.
--
-- Fix: qualify the RETURNING column as widget_reactions.count. Nothing else
-- changes. Idempotent (create or replace); run after 0014_reactions_v2.sql.
-- Reload the PostgREST schema cache afterwards: NOTIFY pgrst, 'reload schema';
-- ============================================================

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
      returning public.widget_reactions.count into new_count;
    return query select new_count, true;
  end if;
end;
$$;

grant execute on function public.toggle_reaction(uuid, text, text) to anon, authenticated;
