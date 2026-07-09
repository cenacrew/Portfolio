-- ============================================================
-- Phase 3 — Storage bucket for widget media (photo widget uploads).
-- Run after 0002_rls.sql.
--
-- If your Supabase project blocks creating storage policies from the SQL
-- editor (rare), create the bucket + policies from Dashboard > Storage
-- instead: bucket id "widget-media", Public = ON, and add the same four
-- policies below. Otherwise this script does it all. Idempotent.
-- ============================================================

-- Public bucket: anyone can read files, only the admin can write.
insert into storage.buckets (id, name, public)
values ('widget-media', 'widget-media', true)
on conflict (id) do update set public = true;

drop policy if exists "widget-media public read"  on storage.objects;
drop policy if exists "widget-media admin insert"  on storage.objects;
drop policy if exists "widget-media admin update"  on storage.objects;
drop policy if exists "widget-media admin delete"  on storage.objects;

create policy "widget-media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'widget-media');

create policy "widget-media admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'widget-media');

create policy "widget-media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'widget-media') with check (bucket_id = 'widget-media');

create policy "widget-media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'widget-media');
