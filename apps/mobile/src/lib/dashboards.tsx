import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DashboardRow } from "@portfolio/shared";
import {
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  LEGACY_DEFAULT,
  listDashboards,
} from "@portfolio/shared";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// Dashboard versions (phase 8). The whole admin app operates on the SELECTED
// version: its widgets, header and breakpoint layouts. Resilient to the
// pre-migration state — listDashboards returns a single synthetic legacy default
// (empty id) that scopes every query to the current unscoped behaviour.

const SELECTED_KEY = "qra.selectedDashboardSlug";

type DashboardsValue = {
  dashboards: DashboardRow[];
  selected: DashboardRow;
  loading: boolean;
  error: string | null;
  migrated: boolean;
  select: (slug: string) => void;
  reload: () => Promise<void>;
  create: (name: string) => Promise<DashboardRow>;
  duplicate: (name: string) => Promise<DashboardRow>;
  remove: () => Promise<void>;
};

const DashboardsContext = createContext<DashboardsValue | undefined>(undefined);

export function DashboardsProvider({ children }: { children: React.ReactNode }) {
  const [dashboards, setDashboards] = useState<DashboardRow[]>([LEGACY_DEFAULT]);
  const [selectedSlug, setSelectedSlug] = useState<string>(LEGACY_DEFAULT.slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);

  const applyList = useCallback((list: DashboardRow[]) => {
    setDashboards(list);
    setSelectedSlug((cur) => (list.some((d) => d.slug === cur) ? cur : (list.find((d) => d.is_default) ?? list[0]).slug));
  }, []);

  const reload = useCallback(async () => {
    try {
      const list = await listDashboards(supabase);
      applyList(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Versions indisponibles");
    } finally {
      setLoading(false);
    }
  }, [applyList]);

  // Restore the last selected version, then load the list.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTED_KEY);
        if (saved) setSelectedSlug(saved);
      } catch {
        /* ignore */
      }
      restored.current = true;
      await reload();
    })();
  }, [reload]);

  // Persist the selection across launches.
  useEffect(() => {
    if (restored.current) AsyncStorage.setItem(SELECTED_KEY, selectedSlug).catch(() => {});
  }, [selectedSlug]);

  const selected = dashboards.find((d) => d.slug === selectedSlug) ?? dashboards.find((d) => d.is_default) ?? dashboards[0];

  const select = useCallback((slug: string) => setSelectedSlug(slug), []);

  const create = useCallback(
    async (name: string) => {
      const created = await createDashboard(supabase, { name });
      await reload();
      setSelectedSlug(created.slug);
      return created;
    },
    [reload],
  );

  const duplicate = useCallback(
    async (name: string) => {
      const created = await duplicateDashboard(supabase, selected.id, { name });
      await reload();
      setSelectedSlug(created.slug);
      return created;
    },
    [reload, selected.id],
  );

  const remove = useCallback(async () => {
    if (selected.is_default) throw new Error("La version par défaut ne peut pas être supprimée.");
    await deleteDashboard(supabase, selected.id);
    const fallback = dashboards.find((d) => d.is_default) ?? dashboards[0];
    setSelectedSlug(fallback.slug);
    await reload();
  }, [dashboards, reload, selected]);

  const migrated = dashboards.some((d) => d.id);

  return (
    <DashboardsContext.Provider
      value={{ dashboards, selected, loading, error, migrated, select, reload, create, duplicate, remove }}
    >
      {children}
    </DashboardsContext.Provider>
  );
}

export function useDashboards(): DashboardsValue {
  const ctx = useContext(DashboardsContext);
  if (!ctx) throw new Error("useDashboards must be used within DashboardsProvider");
  return ctx;
}
