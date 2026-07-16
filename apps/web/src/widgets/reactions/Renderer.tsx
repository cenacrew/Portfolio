import { getReactionCounts } from "@portfolio/shared";
import type { WidgetRendererProps } from "../types";
import type { ReactionsConfig } from "./schema";
import { readPublicOrDefault } from "../ui/readPublic";
import ReactionsBar from "./ReactionsBar";

// Server component: reads the live per-emoji counts from widget_reactions and
// hands them to the client bar. Tolerates the table not existing yet
// (pre-migration): counts default to all-zero and the tile still renders, so
// /qrcode never breaks before migration 0009 runs.
export default async function ReactionsRenderer({ config, widget }: WidgetRendererProps<ReactionsConfig>) {
  const counts = await readPublicOrDefault<Record<string, number>>(
    (sb) => getReactionCounts(sb, widget.id),
    {},
  );

  // Configured emojis first (in config order), then any visitor-added custom
  // emoji that has a counter row but isn't in the config (phase 19). Realtime
  // keeps this list live on the client for emojis added/removed after load.
  const emojis = [...config.emojis];
  for (const emoji of Object.keys(counts)) {
    if (!emojis.includes(emoji)) emojis.push(emoji);
  }
  const initialCounts = Object.fromEntries(emojis.map((e) => [e, counts[e] ?? 0]));

  return (
    <ReactionsBar
      widgetId={widget.id}
      title={config.title}
      emojis={emojis}
      configEmojis={config.emojis}
      initialCounts={initialCounts}
    />
  );
}
