import "server-only";
import { after } from "next/server";
import {
  deleteAdminDevicesByToken,
  getNotificationPrefs,
  isSourceEnabled,
  listAdminDevices,
  type NotificationSource,
} from "@portfolio/shared";
import { getServiceSupabase } from "@/lib/supabase/server";

// Admin push notifications (phase 15). Called from the public API routes right
// after a successful write. Fully isolated: it NEVER throws to the caller and
// NEVER slows the visitor's response — the actual send runs in `after()`, which
// Next.js executes once the response has been flushed. Uses the free Expo push
// service (no key). Respects the server-side prefs and purges dead tokens.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_CHUNK = 100; // Expo accepts up to 100 messages per request.

export type PushMessage = { title: string; body: string };

// A push "source" is either a plain toggle source or the instant-visits mode.
export type PushSource = NotificationSource | "visits-instant";

// Fire-and-forget entry point. Schedules the fan-out after the response and
// swallows every error, so a push failure can never affect the write's result.
export function notifyAdmins(source: PushSource, message: PushMessage): void {
  try {
    after(async () => {
      try {
        await dispatch(source, message);
      } catch {
        // Notifications are best-effort; never surface an error.
      }
    });
  } catch {
    // after() called outside a request scope (shouldn't happen) — ignore.
  }
}

async function dispatch(source: PushSource, message: PushMessage): Promise<void> {
  // Reading devices + prefs needs the service role (both tables are admin-only
  // under RLS). Without it, there's no safe read path, so we simply do nothing.
  const supabase = getServiceSupabase();
  if (!supabase) return;

  const prefs = await getNotificationPrefs(supabase);
  const enabled =
    source === "visits-instant" ? prefs.visits_mode === "instant" : isSourceEnabled(prefs, source);
  if (!enabled) return;

  const devices = await listAdminDevices(supabase);
  const tokens = devices
    .map((d) => d.expo_push_token)
    .filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
  if (tokens.length === 0) return;

  await sendExpoPush(tokens, message);
}

// Result of a fan-out: `ok` is false when any chunk failed to POST (network
// error or non-2xx) so callers that must not lose state (the daily digest) can
// decide whether to advance their baseline. `sent` counts tokens in chunks that
// were delivered to Expo.
export interface ExpoPushResult {
  ok: boolean;
  sent: number;
}

// Sends the message to every token in chunks (Expo caps a request at 100), then
// purges any token Expo flags as DeviceNotRegistered so the table doesn't
// accumulate dead entries. Shared by the public-write fan-out and the daily
// digest cron so both get chunking + dead-token purge from one place.
export async function sendExpoPush(tokens: string[], message: PushMessage): Promise<ExpoPushResult> {
  const invalid: string[] = [];
  let ok = true;
  let sent = 0;

  for (let i = 0; i < tokens.length; i += EXPO_CHUNK) {
    const chunk = tokens.slice(i, i + EXPO_CHUNK);
    const body = chunk.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      sound: "default" as const,
      priority: "high" as const,
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let json: { data?: ExpoTicket[] } | null = null;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        ok = false;
        continue;
      }
      json = (await res.json()) as { data?: ExpoTicket[] };
    } catch {
      ok = false;
      continue; // Network/timeout: skip this chunk, don't fail the rest.
    } finally {
      clearTimeout(timeout);
    }
    sent += chunk.length;

    // Tickets align with the messages array order → index maps to token.
    const tickets = json?.data ?? [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        const dead = chunk[idx];
        if (dead) invalid.push(dead);
      }
    });
  }

  if (invalid.length > 0) {
    const supabase = getServiceSupabase();
    if (supabase) {
      try {
        await deleteAdminDevicesByToken(supabase, invalid);
      } catch {
        // Purge is best-effort.
      }
    }
  }

  return { ok, sent };
}

type ExpoTicket = {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
};
