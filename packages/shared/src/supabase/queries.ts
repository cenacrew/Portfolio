// Shared Supabase queries used by web (and future mobile) — one source of
// truth for reads/writes. Each takes a DbClient so the caller controls which
// role/session runs the query (anon, authed cookie session, or service role).
import type { DbClient } from "./client";
import type {
  GuestbookRow,
  PollVoteRow,
  SiteSettingsRow,
  SiteSettingsUpdate,
  WidgetInsert,
  WidgetRow,
  WidgetUpdate,
} from "./types";

// ---------- widgets --------------------------------------------------------

export async function getWidgets(
  client: DbClient,
  opts: { includeHidden?: boolean } = {},
): Promise<WidgetRow[]> {
  let query = client.from("widgets").select("*").order("position", { ascending: true });
  if (!opts.includeHidden) query = query.eq("visible", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WidgetRow[];
}

export async function upsertWidget(client: DbClient, widget: WidgetInsert & { id?: string }): Promise<WidgetRow> {
  const { data, error } = await client
    .from("widgets")
    .upsert(widget as never, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data as WidgetRow;
}

export async function updateWidget(client: DbClient, id: string, patch: WidgetUpdate): Promise<WidgetRow> {
  const { data, error } = await client
    .from("widgets")
    .update(patch as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as WidgetRow;
}

export async function deleteWidget(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("widgets").delete().eq("id", id);
  if (error) throw error;
}

// Persist a new order. Runs updates in parallel; callers pass the full list so
// positions stay contiguous.
export async function reorderWidgets(
  client: DbClient,
  order: { id: string; position: number }[],
): Promise<void> {
  const results = await Promise.all(
    order.map(({ id, position }) =>
      client.from("widgets").update({ position } as never).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// Persist new layouts for several widgets in one batch (phase 4.6 drag grid).
// One UPDATE per widget, all in parallel — callers pass only the widgets that
// actually moved so a "Save" writes the minimum.
export async function updateLayouts(
  client: DbClient,
  changes: { id: string; layout: import("../widget").WidgetBreakpointLayout }[],
): Promise<void> {
  const results = await Promise.all(
    changes.map(({ id, layout }) =>
      client.from("widgets").update({ layout } as never).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// ---------- site settings (dashboard header) -------------------------------

export async function getSiteSettings(client: DbClient): Promise<SiteSettingsRow | null> {
  const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data as SiteSettingsRow | null) ?? null;
}

// Upserts the single header row (id = 1). Used by the mobile admin.
export async function updateSiteSettings(
  client: DbClient,
  patch: SiteSettingsUpdate,
): Promise<SiteSettingsRow> {
  const { data, error } = await client
    .from("site_settings")
    .upsert({ id: 1, ...patch } as never, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data as SiteSettingsRow;
}

// ---------- guestbook ------------------------------------------------------

export async function getGuestbookMessages(client: DbClient, limit = 100): Promise<GuestbookRow[]> {
  const { data, error } = await client
    .from("guestbook_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as GuestbookRow[];
}

export async function insertGuestbookMessage(
  client: DbClient,
  input: { author: string; message: string },
): Promise<GuestbookRow> {
  const { data, error } = await client
    .from("guestbook_messages")
    .insert({ author: input.author, message: input.message } as never)
    .select()
    .single();
  if (error) throw error;
  return data as GuestbookRow;
}

export async function deleteGuestbookMessage(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("guestbook_messages").delete().eq("id", id);
  if (error) throw error;
}

// ---------- poll -----------------------------------------------------------

export async function getPollVotes(client: DbClient, widgetId: string): Promise<PollVoteRow[]> {
  const { data, error } = await client.from("poll_votes").select("*").eq("widget_id", widgetId);
  if (error) throw error;
  return (data ?? []) as PollVoteRow[];
}

// Tally of votes per option id for a poll widget.
export async function getPollCounts(client: DbClient, widgetId: string): Promise<Record<string, number>> {
  const rows = await getPollVotes(client, widgetId);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.option] = (counts[r.option] ?? 0) + 1;
  return counts;
}

// Which option a given voter already chose, or null.
export async function getVoterChoice(
  client: DbClient,
  widgetId: string,
  voterHash: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("poll_votes")
    .select("option")
    .eq("widget_id", widgetId)
    .eq("voter_hash", voterHash)
    .maybeSingle();
  if (error) throw error;
  return (data as { option: string } | null)?.option ?? null;
}

export async function insertVote(
  client: DbClient,
  input: { widgetId: string; option: string; voterHash: string },
): Promise<void> {
  const { error } = await client.from("poll_votes").insert({
    widget_id: input.widgetId,
    option: input.option,
    voter_hash: input.voterHash,
  } as never);
  // Unique violation (already voted) is not a hard error for callers.
  if (error && error.code !== "23505") throw error;
}

// ---------- visits ---------------------------------------------------------

export async function incrementVisits(client: DbClient): Promise<number> {
  const { data, error } = await client.rpc("increment_visits");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function getVisits(client: DbClient): Promise<number> {
  const { data, error } = await client.rpc("get_visits");
  if (error) throw error;
  return Number(data ?? 0);
}
