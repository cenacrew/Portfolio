import { getGuestbookMessages } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { WidgetRendererProps } from "../types";
import type { GuestbookConfig, GuestbookMessage } from "./schema";
import GuestbookForm from "./GuestbookForm";

// Server component: reads real messages from Supabase (falls back to the
// widget's seed when Supabase isn't configured). The form is a client child
// that POSTs to /api/guestbook and refreshes the board.
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

  return (
    <div className="w-guest">
      <div className="w-guest__head">
        <span className="w-eyebrow">{config.title}</span>
        <span className="w-guest__count">{messages.length}</span>
      </div>

      <ul className="w-guest__list">
        {messages.map((m, i) => (
          <li key={i} className="w-guest__msg">
            <p className="w-guest__body">{m.message}</p>
            <span className="w-guest__author">{m.author}</span>
          </li>
        ))}
        {messages.length === 0 && <li className="w-guest__empty">Sois le premier à écrire.</li>}
      </ul>

      <GuestbookForm prompt={config.prompt} />
    </div>
  );
}
