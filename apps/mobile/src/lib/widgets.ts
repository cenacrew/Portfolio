import type { WidgetRow } from "@portfolio/shared";
import { getWidgets } from "@portfolio/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// Loads the full widget list (including hidden ones — this is the admin) and
// keeps it fresh via Supabase Realtime plus manual pull-to-refresh.

export function useWidgets() {
  const [widgets, setWidgets] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    try {
      const rows = await getWidgets(supabase, { includeHidden: true });
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
  }, []);

  useEffect(() => {
    mounted.current = true;
    load("initial");
    const channel = supabase
      .channel("widgets-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "widgets" }, () => {
        load("initial");
      })
      .subscribe();
    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  const refresh = useCallback(() => load("refresh"), [load]);

  return { widgets, loading, refreshing, error, refresh };
}
