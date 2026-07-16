"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type RealtimeChange = RealtimePostgresChangesPayload<Record<string, unknown>>;

// Subscribes to postgres_changes on one table (optionally filtered) and invokes
// `onChange` for every INSERT/UPDATE/DELETE. No-op when Supabase isn't
// configured. The latest `onChange` is held in a ref so a changing handler
// identity never forces a resubscribe — the channel is rebuilt only when its
// name, table or filter changes. Shared by the reaction bar and the mini-game
// tile/modal (phase 16); pre-existing subscriptions are intentionally left as
// they are.
export function useRealtimeTable(
  channelName: string,
  table: string,
  filter: string | undefined,
  onChange: (payload: RealtimeChange) => void,
): void {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        (payload) => handler.current(payload as RealtimeChange),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, filter]);
}
