import type { WidgetRow } from "@portfolio/shared";
import { getWidgets } from "@portfolio/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// Loads the full widget list (including hidden ones — this is the admin) for one
// version and keeps it fresh via Supabase Realtime plus manual pull-to-refresh.
// A falsy dashboardId (legacy / pre-migration) reads all widgets unscoped.

export function useWidgets(dashboardId?: string | null) {
  const [widgets, setWidgets] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      try {
        const rows = await getWidgets(supabase, { includeHidden: true, dashboardId });
        if (mounted.current) {
          setWidgets(rows);
          setError(null);
        }
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dashboardId],
  );

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    load("initial");
    // Filter widget changes to this version when known; a burst on another
    // version won't reload this board.
    const filter = dashboardId ? { filter: `dashboard_id=eq.${dashboardId}` } : {};
    const channel = supabase
      .channel(`widgets-admin-${dashboardId ?? "legacy"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "widgets", ...filter }, () => {
        load("initial");
      })
      .subscribe();
    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [load, dashboardId]);

  const refresh = useCallback(() => load("refresh"), [load]);
  // Silent re-fetch (no pull-spinner) — used on screen focus so a widget added
  // or resized on another screen shows up immediately without a manual refresh
  // even if Realtime doesn't deliver the admin's own change (phase 4.10 B2).
  const reload = useCallback(() => load("initial"), [load]);

  return { widgets, loading, refreshing, error, refresh, reload };
}
