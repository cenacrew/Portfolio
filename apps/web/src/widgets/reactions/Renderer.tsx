import { getReactionCounts } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { WidgetRendererProps } from "../types";
import type { ReactionsConfig } from "./schema";
import ReactionsBar from "./ReactionsBar";

// Server component: reads the live per-emoji counts from widget_reactions and
// hands them to the client bar. Tolerates the table not existing yet
// (pre-migration): counts default to all-zero and the tile still renders, so
// /qrcode never breaks before migration 0009 runs.
export default async function ReactionsRenderer({ config, widget }: WidgetRendererProps<ReactionsConfig>) {
  let counts: Record<string, number> = {};
  const supabase = getPublicServerSupabase();
  if (supabase) {
    try {
      counts = await getReactionCounts(supabase, widget.id);
    } catch {
      counts = {};
    }
  }

  const initialCounts = Object.fromEntries(config.emojis.map((e) => [e, counts[e] ?? 0]));

  return (
    <ReactionsBar
      widgetId={widget.id}
      title={config.title}
      emojis={config.emojis}
      initialCounts={initialCounts}
    />
  );
}
