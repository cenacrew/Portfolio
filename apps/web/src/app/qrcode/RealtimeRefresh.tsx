"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// Subscribes to DB changes and refreshes the server-rendered grid in place, so
// admin edits (and new guestbook / poll activity) appear live without a manual
// reload. No-op when Supabase isn't configured.
export default function RealtimeRefresh() {
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

    const channel = supabase
      .channel("qrcode-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "widgets" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "guestbook_messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
