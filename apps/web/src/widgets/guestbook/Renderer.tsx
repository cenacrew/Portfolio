import { getGuestbookMessages } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { WidgetRendererProps } from "../types";
import type { GuestbookConfig, GuestbookMessage } from "./schema";
import GuestbookBoard from "./GuestbookBoard";

// Server component: reads real messages from Supabase (falls back to the
// widget's seed when Supabase isn't configured), then hands them to the client
// board which shows a compact preview and opens the shared large modal for the
// full list + submit form (phase 4.10 A6).
export default async function GuestbookRenderer({ config }: WidgetRendererProps<GuestbookConfig>) {
  let messages: GuestbookMessage[] = config.seed;

  const supabase = getPublicServerSupabase();
  if (supabase) {
    try {
      const rows = await getGuestbookMessages(supabase, 50);
      messages = rows.map((r) => ({ author: r.author, message: r.message, createdAt: r.created_at }));
    } catch {
      // keep seed fallback
    }
  }

  return <GuestbookBoard title={config.title} prompt={config.prompt} messages={messages} />;
}
