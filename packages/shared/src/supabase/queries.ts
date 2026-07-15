// Shared Supabase queries used by web (and future mobile) — one source of
// truth for reads/writes. Each takes a DbClient so the caller controls which
// role/session runs the query (anon, authed cookie session, or service role).
import type { DbClient } from "./client";
import { WIDGET_MEDIA_BUCKET, extractMediaPaths, pruneMedia, type MediaWidget } from "./media";
import type {
  DashboardInsert,
  DashboardRow,
  GameScoreInsert,
  GameScoreRow,
  GuestbookRow,
  PollVoteRow,
  SiteSettingsRow,
  SiteSettingsUpdate,
  WidgetInsert,
  WidgetQaInsert,
  WidgetQaRow,
  WidgetReactionRow,
  WidgetRow,
  WidgetUpdate,
} from "./types";
import { toilePath } from "../widget-configs/toile";
import { GRID, resolveCollisions } from "../grid";
import type { WidgetBreakpointLayout } from "../widget";

// ---------- dashboards (versions) ------------------------------------------
// A version's id used as a scope. `null`/empty means "unscoped" — the
// pre-migration behaviour (all widgets, single site_settings row) so the
// public /qrcode never breaks before migration 0007 runs.
export const LEGACY_DEFAULT_ID = "";

// The synthetic default returned when the `dashboards` table doesn't exist yet
// (pre-migration). Its empty id makes every scoped query fall back to the
// current unscoped behaviour.
export const LEGACY_DEFAULT: DashboardRow = {
  id: LEGACY_DEFAULT_ID,
  slug: "default",
  name: "Version par défaut",
  is_default: true,
  created_at: "",
};

// Postgres error code for "relation does not exist" — the dashboards table (or
// dashboard_id column) not being migrated yet.
function isMissingRelation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703";
}

// Lists dashboard versions (default first). Resilient: when the table doesn't
// exist yet, returns a single synthetic legacy default so callers keep working.
export async function listDashboards(client: DbClient): Promise<DashboardRow[]> {
  const { data, error } = await client
    .from("dashboards")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingRelation(error)) return [LEGACY_DEFAULT];
    throw error;
  }
  const rows = (data ?? []) as DashboardRow[];
  return rows.length > 0 ? rows : [LEGACY_DEFAULT];
}

// A version by slug, or null if it doesn't exist. Returns the legacy default
// (empty id) when the table is missing AND the slug is the default one; null
// for any other slug pre-migration (so sub-versions 404 cleanly).
export async function getDashboardBySlug(
  client: DbClient,
  slug: string,
): Promise<DashboardRow | null> {
  const { data, error } = await client.from("dashboards").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return slug === LEGACY_DEFAULT.slug ? LEGACY_DEFAULT : null;
    throw error;
  }
  return (data as DashboardRow | null) ?? null;
}

export async function getDefaultDashboard(client: DbClient): Promise<DashboardRow> {
  const { data, error } = await client.from("dashboards").select("*").eq("is_default", true).maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return LEGACY_DEFAULT;
    throw error;
  }
  return (data as DashboardRow | null) ?? LEGACY_DEFAULT;
}

// Turns a display name into a URL-safe, unique slug across existing versions.
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "version";
}

async function uniqueSlug(client: DbClient, name: string): Promise<string> {
  const existing = new Set((await listDashboards(client)).map((d) => d.slug));
  const base = slugify(name);
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`.slice(0, 40);
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`.slice(0, 40);
}

export async function createDashboard(
  client: DbClient,
  input: { name: string; slug?: string },
): Promise<DashboardRow> {
  const slug = input.slug ? slugify(input.slug) : await uniqueSlug(client, input.name);
  const payload: DashboardInsert = { slug, name: input.name.trim() || slug, is_default: false };
  const { data, error } = await client.from("dashboards").insert(payload as never).select().single();
  if (error) throw error;
  return data as DashboardRow;
}

// Duplicates a version: copies its widgets (new ids, same configs so URL media
// is SHARED, never re-uploaded) and its header settings into a fresh version.
// Toile canvases are keyed by widget id, so their PNG is copied to the new
// widget's path (best-effort) to preserve the drawing.
export async function duplicateDashboard(
  client: DbClient,
  sourceId: string,
  input: { name: string; slug?: string },
): Promise<DashboardRow> {
  const created = await createDashboard(client, input);

  // Copy widgets.
  const { data: srcWidgets, error: wErr } = await client
    .from("widgets")
    .select("*")
    .eq("dashboard_id", sourceId);
  if (wErr) throw wErr;
  for (const w of (srcWidgets ?? []) as WidgetRow[]) {
    const insert: WidgetInsert = {
      type: w.type,
      config: w.config,
      layout: w.layout,
      visible: w.visible,
      position: w.position,
      dashboard_id: created.id,
    };
    const { data: newRow, error: insErr } = await client
      .from("widgets")
      .insert(insert as never)
      .select("id")
      .single();
    if (insErr) throw insErr;
    // Best-effort copy of a toile's PNG to the new widget's id-derived path.
    if (w.type === "toile" && newRow) {
      try {
        await client.storage
          .from(WIDGET_MEDIA_BUCKET)
          .copy(toilePath(w.id), toilePath((newRow as { id: string }).id));
      } catch {
        /* the new toile just starts blank */
      }
    }
  }

  // Copy header settings.
  try {
    const { data: srcSettings } = await client
      .from("site_settings")
      .select("*")
      .eq("dashboard_id", sourceId)
      .maybeSingle();
    if (srcSettings) {
      const s = srcSettings as SiteSettingsRow & Record<string, unknown>;
      const { id: _id, updated_at: _u, dashboard_id: _d, ...rest } = s;
      void _id;
      void _u;
      void _d;
      await client
        .from("site_settings")
        .upsert({ ...rest, dashboard_id: created.id } as never, { onConflict: "dashboard_id" });
    }
  } catch {
    /* header copy is best-effort; the version still works with defaults */
  }

  return created;
}

// Deletes a non-default version and prunes any media it referenced that no
// other version still uses (phase 7 cross-reference guard). Never touches the
// default version.
export async function deleteDashboard(client: DbClient, id: string): Promise<void> {
  const { data: dash } = await client.from("dashboards").select("*").eq("id", id).maybeSingle();
  const row = dash as DashboardRow | null;
  if (!row) return;
  if (row.is_default) throw new Error("La version par défaut ne peut pas être supprimée.");

  // Media referenced by this version's widgets (candidates for pruning).
  const { data: widgets } = await client.from("widgets").select("id,type,config").eq("dashboard_id", id);
  const candidates = ((widgets ?? []) as MediaWidget[]).flatMap((w) => extractMediaPaths(w));

  // Cascade deletes widgets + settings via the FK.
  const { error } = await client.from("dashboards").delete().eq("id", id);
  if (error) throw error;

  if (candidates.length > 0) {
    try {
      const { data: remaining } = await client.from("widgets").select("id,type,config");
      await pruneMedia(client, candidates, (remaining ?? []) as MediaWidget[]);
    } catch {
      /* storage cleanup is best-effort; the version is already gone */
    }
  }
}

// ---------- widgets --------------------------------------------------------

export async function getWidgets(
  client: DbClient,
  opts: { includeHidden?: boolean; dashboardId?: string | null } = {},
): Promise<WidgetRow[]> {
  let query = client.from("widgets").select("*").order("position", { ascending: true });
  if (!opts.includeHidden) query = query.eq("visible", true);
  // Truthy dashboardId scopes to one version; empty/null means unscoped
  // (pre-migration / legacy) — the current all-widgets behaviour.
  if (opts.dashboardId) query = query.eq("dashboard_id", opts.dashboardId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WidgetRow[];
}

// Duplicates a single widget within its own version (phase 11). Copies its
// type, config and per-breakpoint SIZE, dropping the copy at the first free spot
// (the shared collision resolver places it near the original and pushes it down
// until it fits, so the grid never overlaps). Media is SHARED — the config's
// URLs are copied verbatim, never re-uploaded; the cross-reference guard in
// media.ts keeps that shared file safe when either widget is later deleted. A
// toile's id-derived PNG is copied best-effort so the duplicate isn't blank.
export async function duplicateWidget(client: DbClient, sourceId: string): Promise<WidgetRow> {
  const { data: src, error: srcErr } = await client.from("widgets").select("*").eq("id", sourceId).single();
  if (srcErr) throw srcErr;
  const source = src as WidgetRow;

  // Siblings sharing the grid (same version) — the placement must avoid them.
  let q = client.from("widgets").select("*");
  if (source.dashboard_id) q = q.eq("dashboard_id", source.dashboard_id);
  const { data: sib, error: sibErr } = await q;
  if (sibErr) throw sibErr;
  const siblings = (sib ?? []) as WidgetRow[];

  const NEW = "__duplicate__";
  const place = (bp: import("../grid").Breakpoint) => {
    const cols = GRID[bp].columns;
    const s = source.layout[bp];
    const rects = siblings.map((w) => ({ id: w.id, ...w.layout[bp] }));
    // Seed the copy at the source cell; resolveCollisions pushes it down to the
    // first free slot without moving the existing tiles we don't persist.
    rects.push({ id: NEW, x: s.x, y: s.y, w: s.w, h: s.h });
    const placed = resolveCollisions(rects, cols).find((r) => r.id === NEW)!;
    return { x: placed.x, y: placed.y, w: placed.w, h: placed.h };
  };
  const layout: WidgetBreakpointLayout = { mobile: place("mobile"), desktop: place("desktop") };
  const position = siblings.reduce((max, w) => Math.max(max, w.position + 1), 0);

  const insert: WidgetInsert = {
    type: source.type,
    config: source.config,
    layout,
    visible: source.visible,
    position,
    ...(source.dashboard_id ? { dashboard_id: source.dashboard_id } : {}),
  };
  const created = await upsertWidget(client, insert);

  // Best-effort copy of a toile's canvas to the new widget's id-derived path.
  if (source.type === "toile") {
    try {
      await client.storage.from(WIDGET_MEDIA_BUCKET).copy(toilePath(source.id), toilePath(created.id));
    } catch {
      /* the duplicated toile just starts blank */
    }
  }
  return created;
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

// Reads a version's header. A truthy dashboardId scopes to that version's row;
// empty/null falls back to the legacy single row (id = 1) so pre-migration
// reads keep working.
export async function getSiteSettings(
  client: DbClient,
  dashboardId?: string | null,
): Promise<SiteSettingsRow | null> {
  const query = client.from("site_settings").select("*");
  const scoped = dashboardId ? query.eq("dashboard_id", dashboardId) : query.eq("id", 1);
  const { data, error } = await scoped.maybeSingle();
  if (error) throw error;
  return (data as SiteSettingsRow | null) ?? null;
}

// Upserts a version's header. Scoped by dashboard_id when provided (onConflict
// dashboard_id, id auto-assigned by its sequence); otherwise the legacy id = 1
// row. Used by the mobile app and the web admin.
export async function updateSiteSettings(
  client: DbClient,
  patch: SiteSettingsUpdate,
  dashboardId?: string | null,
): Promise<SiteSettingsRow> {
  const payload = dashboardId
    ? { dashboard_id: dashboardId, ...patch }
    : { id: 1, ...patch };
  const onConflict = dashboardId ? "dashboard_id" : "id";
  const { data, error } = await client
    .from("site_settings")
    .upsert(payload as never, { onConflict })
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

// Casts or CHANGES a visitor's vote (phase 4.8 B8): updates the existing row's
// option when the visitor already voted, otherwise inserts. The unique
// (widget_id, voter_hash) constraint still guarantees one row per visitor.
export async function changeVote(
  client: DbClient,
  input: { widgetId: string; option: string; voterHash: string },
): Promise<void> {
  const { data, error } = await client
    .from("poll_votes")
    .update({ option: input.option } as never)
    .eq("widget_id", input.widgetId)
    .eq("voter_hash", input.voterHash)
    .select("id");
  if (error) throw error;
  if (data && data.length > 0) return; // updated an existing vote
  await insertVote(client, input);
}

// ---------- widget QA (phase 9) --------------------------------------------
// All of these tolerate the widget_qa table not existing yet (pre-migration):
// reads return empty, writes no-op, so the QA console degrades to "everything
// to verify, nothing persisted" instead of crashing.

// A stable key for one (type, format) couple, used by the QA console maps.
export function widgetQaKey(widgetType: string, format: string): string {
  return `${widgetType}::${format}`;
}

// All QA rows, keyed by `${type}::${format}`. Empty map when the table is
// missing (pre-migration) so the console still renders.
export async function getWidgetQaMap(client: DbClient): Promise<Record<string, WidgetQaRow>> {
  const { data, error } = await client.from("widget_qa").select("*");
  if (error) {
    if (isMissingRelation(error)) return {};
    throw error;
  }
  const map: Record<string, WidgetQaRow> = {};
  for (const row of (data ?? []) as WidgetQaRow[]) {
    map[widgetQaKey(row.widget_type, row.format)] = row;
  }
  return map;
}

// Upserts one QA row. Returns false (without throwing) when the table is
// missing, so a caller can surface a "persistence unavailable" warning while
// still producing the GitHub issue.
export async function upsertWidgetQa(client: DbClient, row: WidgetQaInsert): Promise<boolean> {
  const payload: WidgetQaInsert = { ...row, updated_at: new Date().toISOString() };
  const { error } = await client
    .from("widget_qa")
    .upsert(payload as never, { onConflict: "widget_type,format" });
  if (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
  return true;
}

// "Re-verify this widget": clears the validated hash for EVERY format of a type
// so it flags as to-verify again. No-op when the table is missing.
export async function resetWidgetQa(client: DbClient, widgetType: string): Promise<boolean> {
  const { error } = await client
    .from("widget_qa")
    .update({ validated_hash: null, status: "pending", updated_at: new Date().toISOString() } as never)
    .eq("widget_type", widgetType);
  if (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
  return true;
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

// ---------- reactions (phase 12) -------------------------------------------
// All reaction helpers tolerate the widget_reactions table not existing yet
// (pre-migration 0009): reads return an empty tally and the increment RPC error
// is surfaced to the caller (the API route degrades to a 503) — the public
// /qrcode never breaks because the Renderer only ever reads (empty = all zeros).

// Tally of counts per emoji for one reactions widget. Empty map when the table
// is missing so the tile renders with zeroed counters.
export async function getReactionCounts(
  client: DbClient,
  widgetId: string,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("widget_reactions")
    .select("emoji,count")
    .eq("widget_id", widgetId);
  if (error) {
    if (isMissingRelation(error)) return {};
    throw error;
  }
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as Pick<WidgetReactionRow, "emoji" | "count">[]) {
    counts[r.emoji] = Number(r.count);
  }
  return counts;
}

// Atomically increments (widget, emoji) and returns the new count. Runs through
// the security-definer RPC so anon has no direct table write.
export async function incrementReaction(
  client: DbClient,
  widgetId: string,
  emoji: string,
): Promise<number> {
  // `as never`: same house pattern as every typed write in this file — the
  // client's Schema generic degrades with this Database shape, so args are
  // cast (runtime payload is exactly the RPC's named parameters).
  const { data, error } = await client.rpc("increment_reaction", {
    p_widget_id: widgetId,
    p_emoji: emoji,
  } as never);
  if (error) throw error;
  return Number(data ?? 0);
}

// ---------- mini-game scores (phase 13) ------------------------------------
// The leaderboard reads tolerate the game_scores table not existing yet
// (pre-migration 0010): an empty board renders instead of crashing, so the
// public /qrcode never breaks before the migration runs. Inserts go through the
// server API route with the service role (anon has no direct write).

// Top `limit` scores for one game, highest first (ties broken by earliest run).
// Empty array when the table is missing (pre-migration).
export async function getTopScores(
  client: DbClient,
  game: string,
  limit = 10,
): Promise<GameScoreRow[]> {
  const { data, error } = await client
    .from("game_scores")
    .select("*")
    .eq("game", game)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return (data ?? []) as GameScoreRow[];
}

// Inserts a new score row and returns it. Caller (server API route) has already
// validated the game, pseudo and plausibility; this only persists.
export async function insertGameScore(
  client: DbClient,
  input: GameScoreInsert,
): Promise<GameScoreRow> {
  const { data, error } = await client
    .from("game_scores")
    .insert({ game: input.game, pseudo: input.pseudo, score: input.score } as never)
    .select()
    .single();
  if (error) throw error;
  return data as GameScoreRow;
}
