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
-- file_size_limit is the SERVER-SIDE guard for the 50 MB cap (phase 7): every
-- direct upload from the app/admin goes through Supabase Storage, which rejects
-- anything larger regardless of the client. allowed_mime_types stays null so any
-- file type is accepted (photos, videos, PDFs, ZIPs, APKs…).
insert into storage.buckets (id, name, public, file_size_limit)
values ('widget-media', 'widget-media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

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
