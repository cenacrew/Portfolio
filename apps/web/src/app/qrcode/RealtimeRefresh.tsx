"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// Subscribes to DB changes and refreshes the server-rendered grid in place, so
// admin edits (and new guestbook / poll activity) appear live without a manual
// reload. No-op when Supabase isn't configured.
//
// When a version id is known (post-migration), widgets/site_settings changes
// are filtered to that version so editing one version never re-renders another.
// Guestbook / poll activity stays global (those tables are shared across
// versions). A null id (legacy / pre-migration) subscribes unfiltered.
export default function RealtimeRefresh({ dashboardId }: { dashboardId?: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    let scheduled = false;
    const refresh = () => {
      // Coalesce bursts of changes into a single refresh per tick.
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        router.refresh();
      }, 250);
    };

    const filter = dashboardId ? { filter: `dashboard_id=eq.${dashboardId}` } : {};
    const channel = supabase
      .channel(`qrcode-public-${dashboardId ?? "legacy"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "widgets", ...filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings", ...filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "guestbook_messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, dashboardId]);

  return null;
}
