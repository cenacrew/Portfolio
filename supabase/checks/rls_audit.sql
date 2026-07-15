-- ============================================================
-- RLS audit — read-only verification queries for the /qrcode backend.
-- Run in the Supabase SQL editor (or `supabase db` psql) AFTER applying
-- migrations 0001 -> 0006. Nothing here modifies data or schema; every
-- statement is a SELECT you eyeball against the "expected" note beside it.
--
-- Security model recap:
--   - Public (anon) may:  read visible widgets, read guestbook + poll tallies +
--     site_settings, read widget-media files. INSERT guestbook messages and
--     poll votes (length/uniqueness enforced by CHECK + unique constraint).
--   - Public (anon) may NOT: read hidden widgets, write widgets, update/delete
--     guestbook or votes, touch visits directly, write site_settings, write
--     storage. The visits counter is reachable only via the security-definer
--     RPCs. Trusted anonymous-facing writes (guestbook/poll/toile) go through
--     server API routes using the service_role key.
-- ============================================================

-- 1. RLS is ENABLED on every public table -----------------------------------
--    Expected: rowsecurity = true for widgets, guestbook_messages, poll_votes,
--    visits, site_settings, widget_reactions.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('widgets','guestbook_messages','poll_votes','visits','site_settings','widget_reactions')
order by c.relname;

-- 2. Full policy inventory ---------------------------------------------------
--    Read each policy's roles / command / USING / WITH CHECK. Compare against
--    the expectations in the block comment below the query.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual        as using_expr,
  with_check  as with_check_expr
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
-- Expected policies:
--   widgets:            public read (SELECT anon, USING visible = true)
--                       admin read/insert/update/delete (authenticated, true)
--   guestbook_messages: public read (SELECT anon+auth true)
--                       anon insert (INSERT anon+auth, WITH CHECK length limits)
--                       admin delete (DELETE authenticated true)
--   poll_votes:         public read (SELECT anon+auth true)
--                       anon insert (INSERT anon+auth true) -- uniqueness via constraint
--                       admin delete (DELETE authenticated true)
--   site_settings:      public read (SELECT anon+auth true)
--                       admin insert/update (authenticated, id = 1)
--   visits:             NO policies (RLS on + no policy => nobody has direct access)
--   widget_reactions:   public read (SELECT anon+auth true)
--                       admin insert/update/delete (authenticated true)
--                       -- anon increments ONLY via increment_reaction() RPC

-- 3. visits must have ZERO policies (RPC-only access) ------------------------
--    Expected: 0 rows.
select policyname
from pg_policies
where schemaname = 'public' and tablename = 'visits';

-- 4. Tables that are exposed but have RLS OFF (would be a hole) --------------
--    Expected: 0 rows.
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
  and c.relname in ('widgets','guestbook_messages','poll_votes','visits','site_settings','widget_reactions');

-- 5. No anon INSERT/UPDATE/DELETE policy on widgets or site_settings ---------
--    (i.e. the public can never write config or the header). Expected: 0 rows.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('widgets','site_settings')
  and cmd in ('INSERT','UPDATE','DELETE')
  and (roles @> array['anon']::name[] or roles @> array['public']::name[]);

-- 6. guestbook length + poll uniqueness constraints still present ------------
--    Expected: guestbook author (1..40) + message (1..280) CHECKs, and a UNIQUE
--    on poll_votes (widget_id, voter_hash).
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.guestbook_messages'::regclass, 'public.poll_votes'::regclass)
  and contype in ('c','u')
order by table_name, conname;

-- 7. security-definer RPCs exist and are executable by anon ------------------
--    Expected: increment_visits, get_visits and increment_reaction, prosecdef = true.
select p.proname, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('increment_visits','get_visits','increment_reaction')
order by p.proname;

-- 8. Storage policies on the widget-media bucket ----------------------------
--    Expected: public read (anon+auth, SELECT bucket_id='widget-media'),
--    admin insert/update/delete (authenticated only). No anon write.
select policyname, cmd, roles, qual as using_expr, with_check as with_check_expr
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'widget-media%'
order by cmd, policyname;

-- 9. widget-media bucket is public-read -------------------------------------
--    Expected: public = true (read-only listing; writes still gated by policies).
select id, public from storage.buckets where id = 'widget-media';

-- 10. Realtime publication covers the tables the dashboard subscribes to -----
--     Expected: widgets, guestbook_messages, poll_votes, site_settings,
--     widget_reactions.
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
