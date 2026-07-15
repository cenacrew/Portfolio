// Admin mini-stats (phase 14): simple aggregate reads for the mobile "Stats"
// screen. Every query runs through the caller's authenticated client (RLS
// applies) — nothing here is public. All helpers tolerate a table not existing
// yet (pre-migration) by returning empty/zero so the screen degrades instead of
// crashing. Stats are GLOBAL (all dashboard versions), matching the global
// visit counter.
import type { DbClient } from "./client";
import { getPollCounts, getReactionCounts, getTopScores, getVisits, getWidgets } from "./queries";
import { pollSchema } from "../widget-configs/poll";
import { reactionsSchema } from "../widget-configs/reactions";
import { GAME_KEYS, GAME_LABELS, type GameKey } from "../widget-configs/mini-game";
import type { WidgetRow } from "./types";

// Postgres "relation does not exist" — mirrors the guard in queries.ts.
function isMissingRelation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703";
}

export interface GuestbookStats {
  messages: number;
  words: number;
}

export interface PollStat {
  widgetId: string;
  question: string;
  options: { label: string; count: number }[];
  total: number;
}

export interface ReactionStat {
  widgetId: string;
  title: string;
  items: { emoji: string; count: number }[];
  total: number;
}

export interface GameStat {
  game: GameKey;
  label: string;
  topScore: number;
  topPseudo: string | null;
  plays: number;
}

export interface AdminStats {
  visits: number;
  guestbook: GuestbookStats;
  polls: PollStat[];
  reactions: ReactionStat[];
  games: GameStat[];
}

// Total visits (RPC), 0 when the RPC/table isn't there yet.
async function readVisits(client: DbClient): Promise<number> {
  try {
    return await getVisits(client);
  } catch {
    return 0;
  }
}

// Guestbook: message count + total word count across every message. Words are
// whitespace-separated non-empty tokens. Reads up to a generous cap — the board
// is small by nature.
async function readGuestbook(client: DbClient): Promise<GuestbookStats> {
  const { data, error } = await client
    .from("guestbook_messages")
    .select("message")
    .limit(2000);
  if (error) {
    if (isMissingRelation(error)) return { messages: 0, words: 0 };
    throw error;
  }
  const rows = (data ?? []) as { message: string }[];
  let words = 0;
  for (const r of rows) {
    words += (r.message ?? "").trim().split(/\s+/).filter(Boolean).length;
  }
  return { messages: rows.length, words };
}

// Vote breakdown for every poll widget across all versions. Uses the widget
// config for the option labels and the poll_votes tally for the live counts.
async function readPolls(client: DbClient, widgets: WidgetRow[]): Promise<PollStat[]> {
  const polls = widgets.filter((w) => w.type === "poll");
  const out: PollStat[] = [];
  for (const w of polls) {
    const parsed = pollSchema.safeParse(w.config);
    if (!parsed.success) continue;
    let counts: Record<string, number> = {};
    try {
      counts = await getPollCounts(client, w.id);
    } catch {
      counts = {};
    }
    const options = parsed.data.options.map((o) => ({ label: o.label, count: counts[o.id] ?? 0 }));
    const total = options.reduce((n, o) => n + o.count, 0);
    out.push({ widgetId: w.id, question: parsed.data.question, options, total });
  }
  return out;
}

// Reaction totals per emoji for every reactions widget. Merges the offered
// emojis (config) with their live counts so a zeroed emoji still shows.
async function readReactions(client: DbClient, widgets: WidgetRow[]): Promise<ReactionStat[]> {
  const reactionWidgets = widgets.filter((w) => w.type === "reactions");
  const out: ReactionStat[] = [];
  for (const w of reactionWidgets) {
    const parsed = reactionsSchema.safeParse(w.config);
    if (!parsed.success) continue;
    let counts: Record<string, number> = {};
    try {
      counts = await getReactionCounts(client, w.id);
    } catch {
      counts = {};
    }
    // Offered emojis first (in config order), then any extra emoji that has a
    // recorded count but is no longer offered.
    const seen = new Set(parsed.data.emojis);
    const items = parsed.data.emojis.map((emoji) => ({ emoji, count: counts[emoji] ?? 0 }));
    for (const [emoji, count] of Object.entries(counts)) {
      if (!seen.has(emoji)) items.push({ emoji, count });
    }
    const total = items.reduce((n, i) => n + i.count, 0);
    out.push({ widgetId: w.id, title: parsed.data.title, items, total });
  }
  return out;
}

// Number of recorded runs for a game (row count in game_scores). 0 when the
// table is missing (pre-migration 0010).
async function gamePlays(client: DbClient, game: GameKey): Promise<number> {
  const { count, error } = await client
    .from("game_scores")
    .select("*", { count: "exact", head: true })
    .eq("game", game);
  if (error) {
    if (isMissingRelation(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

// Top score + play count for Snake and Flappy.
async function readGames(client: DbClient): Promise<GameStat[]> {
  const out: GameStat[] = [];
  for (const game of GAME_KEYS) {
    let topScore = 0;
    let topPseudo: string | null = null;
    try {
      const top = await getTopScores(client, game, 1);
      if (top[0]) {
        topScore = top[0].score;
        topPseudo = top[0].pseudo;
      }
    } catch {
      /* leave zeroed */
    }
    let plays = 0;
    try {
      plays = await gamePlays(client, game);
    } catch {
      plays = 0;
    }
    out.push({ game, label: GAME_LABELS[game], topScore, topPseudo, plays });
  }
  return out;
}

// One-shot aggregate for the admin Stats screen. Fetches widgets once (all
// versions, hidden included) and derives the poll/reaction breakdowns from them.
export async function getAdminStats(client: DbClient): Promise<AdminStats> {
  let widgets: WidgetRow[] = [];
  try {
    widgets = await getWidgets(client, { includeHidden: true });
  } catch {
    widgets = [];
  }

  const [visits, guestbook, polls, reactions, games] = await Promise.all([
    readVisits(client),
    readGuestbook(client),
    readPolls(client, widgets),
    readReactions(client, widgets),
    readGames(client),
  ]);

  return { visits, guestbook, polls, reactions, games };
}
