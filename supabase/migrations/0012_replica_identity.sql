-- ============================================================
-- Phase 16 — Realtime DELETE events for the widgets table.
--
-- Root cause: the public dashboard (apps/web RealtimeRefresh) and the mobile
-- admin grid subscribe to widget changes with a `dashboard_id=eq.<id>` filter.
-- Postgres logical replication only publishes the PRIMARY KEY for a DELETE
-- unless the table replicates its FULL row, so a filtered DELETE subscription
-- never matches (the filter column isn't in the payload). Result: a deleted
-- tile stays on screen — public AND admin — until the next manual reload.
--
-- Fix: replicate the full old row on UPDATE/DELETE for `widgets`. The table is
-- tiny (a handful of tiles per dashboard) so the extra WAL volume is negligible,
-- and this corrects both Realtime clients without any code change.
--
-- Idempotent: setting REPLICA IDENTITY FULL is a no-op if already set.
-- ============================================================

ALTER TABLE public.widgets REPLICA IDENTITY FULL;
