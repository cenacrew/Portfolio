// Push notification data access (phase 15). Shared web ⇄ mobile.
//
// - The mobile app (authenticated client) registers its Expo push token and
//   reads/writes the preferences.
// - The web server (service-role client) reads the prefs + devices to fan out
//   pushes, and purges tokens Expo reports as invalid.
//
// Every helper tolerates the tables not existing yet (pre-migration 0011) by
// returning defaults / no-ops, so nothing crashes before the migration is run.
import type { DbClient } from "./client";
import type {
  AdminDeviceRow,
  NotificationPrefsRow,
  NotificationPrefsUpdate,
} from "./types";

// Postgres "relation/column does not exist" — mirrors the guard used elsewhere.
function isMissingRelation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703";
}

// The event sources the admin can toggle. `visits` is special (a mode, not a
// plain on/off) and handled separately.
export const NOTIFICATION_SOURCES = ["guestbook", "toile", "poll", "reactions", "games"] as const;
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

// Defaults mirror the DB column defaults, so a pre-migration read still yields a
// coherent prefs object (reactions off, visits silent).
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsRow = {
  id: 1,
  guestbook_enabled: true,
  toile_enabled: true,
  poll_enabled: true,
  reactions_enabled: false,
  games_enabled: true,
  visits_mode: "off",
  visits_digest_last_count: 0,
  updated_at: new Date(0).toISOString(),
};

// Whether a given plain source is enabled in the prefs.
export function isSourceEnabled(prefs: NotificationPrefsRow, source: NotificationSource): boolean {
  switch (source) {
    case "guestbook":
      return prefs.guestbook_enabled;
    case "toile":
      return prefs.toile_enabled;
    case "poll":
      return prefs.poll_enabled;
    case "reactions":
      return prefs.reactions_enabled;
    case "games":
      return prefs.games_enabled;
  }
}

// Read the single prefs row, falling back to defaults if the row/table is
// missing. Never throws for the missing-table case.
export async function getNotificationPrefs(client: DbClient): Promise<NotificationPrefsRow> {
  const { data, error } = await client
    .from("notification_prefs")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return { ...DEFAULT_NOTIFICATION_PREFS };
    throw error;
  }
  if (!data) return { ...DEFAULT_NOTIFICATION_PREFS };
  return data as NotificationPrefsRow;
}

// Patch the prefs row (upsert on the pinned id = 1). Returns the updated row.
export async function updateNotificationPrefs(
  client: DbClient,
  patch: NotificationPrefsUpdate,
): Promise<NotificationPrefsRow> {
  const { data, error } = await client
    .from("notification_prefs")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() } as never)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationPrefsRow;
}

// Register (or refresh) a device by its Expo push token. Upsert on the unique
// token bumps last_seen_at so stale devices can be spotted later.
export async function upsertAdminDevice(
  client: DbClient,
  input: { token: string; platform?: string | null },
): Promise<void> {
  const { error } = await client.from("admin_devices").upsert(
    {
      expo_push_token: input.token,
      platform: input.platform ?? null,
      last_seen_at: new Date().toISOString(),
    } as never,
    { onConflict: "expo_push_token" },
  );
  if (error && !isMissingRelation(error)) throw error;
}

// All registered devices (server-side fan-out). Empty when the table is missing.
export async function listAdminDevices(client: DbClient): Promise<AdminDeviceRow[]> {
  const { data, error } = await client.from("admin_devices").select("*");
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return (data ?? []) as AdminDeviceRow[];
}

// Purge tokens Expo reported as invalid (DeviceNotRegistered). Best-effort.
export async function deleteAdminDevicesByToken(client: DbClient, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  const { error } = await client.from("admin_devices").delete().in("expo_push_token", tokens);
  if (error && !isMissingRelation(error)) throw error;
}

// Record the visit total at the current cron run, so the next daily digest can
// report the delta since now.
export async function setVisitsDigestBaseline(client: DbClient, total: number): Promise<void> {
  const { error } = await client
    .from("notification_prefs")
    .upsert({ id: 1, visits_digest_last_count: total, updated_at: new Date().toISOString() } as never)
    .select("id");
  if (error && !isMissingRelation(error)) throw error;
}
