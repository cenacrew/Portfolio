import { headers } from "next/headers";
import { getPollCounts, getVoterChoice } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import { voterHashFromHeaders } from "@/app/api/_lib/request";
import type { WidgetRendererProps } from "../types";
import type { PollConfig } from "./schema";
import PollForm from "./PollForm";

// Server component: tallies live votes from poll_votes and detects whether this
// visitor already voted (server-side voter hash). Falls back to the config's
// seed counts when Supabase isn't configured.
export default async function PollRenderer({ config, widget }: WidgetRendererProps<PollConfig>) {
  let counts: Record<string, number> = Object.fromEntries(config.options.map((o) => [o.id, o.votes]));
  let voted: string | null = null;

  const supabase = getPublicServerSupabase();
  if (supabase) {
    try {
      const [tally, hdrs] = await Promise.all([getPollCounts(supabase, widget.id), headers()]);
      counts = Object.fromEntries(config.options.map((o) => [o.id, tally[o.id] ?? 0]));
      voted = await getVoterChoice(supabase, widget.id, voterHashFromHeaders(hdrs));
    } catch {
      // keep seed fallback
    }
  }

  return (
    <PollForm
      widgetId={widget.id}
      question={config.question}
      options={config.options.map((o) => ({ id: o.id, label: o.label }))}
      initialCounts={counts}
      initialVoted={voted}
    />
  );
}
