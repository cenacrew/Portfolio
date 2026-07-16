"use client";

import { useEffect, useId, useRef } from "react";
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
  useEffect(() => {
    handler.current = onChange;
  });

  // Per-instance suffix: two mounted copies of the same widget (a real case on
  // the QA console / gallery, which render one copy per audited format) would
  // otherwise resolve to the SAME channel topic — and supabase-js throws
  // "cannot add postgres_changes callbacks … after subscribe()" on the second
  // .on(), crashing the whole page at hydration. Unique topics keep each copy
  // on its own channel; the server-side filter is identical so every copy still
  // receives the same events.
  const instanceId = useId();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`${channelName}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        (payload) => handler.current(payload as RealtimeChange),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, filter, instanceId]);
}
