import { describe, it, expect } from "vitest";
import {
  canAddCustomReaction,
  customReactionEmojis,
  isSingleEmoji,
  REACTIONS_CUSTOM_CAP,
} from "../widget-configs";
import { deleteReactionEmoji, ensureCustomReaction, getReactionCounts, toggleReaction } from "../supabase/queries";
import type { DbClient } from "../supabase/client";

// ---------------------------------------------------------------------------
// Phase 19 — Reactions v2: strict emoji validation, custom-emoji cap, and the
// tolerant server helpers (toggle, custom, delete) with their pre-migration
// fallbacks.
// ---------------------------------------------------------------------------

// ---------- strict single-emoji validation ---------------------------------

describe("isSingleEmoji", () => {
  it("accepts a single emoji, including presentation-variant and skin-tone", () => {
    expect(isSingleEmoji("🔥")).toBe(true);
    expect(isSingleEmoji("❤️")).toBe(true); // with VS16
    expect(isSingleEmoji("👍🏽")).toBe(true); // skin-tone modifier
    expect(isSingleEmoji("😂")).toBe(true);
  });

  it("accepts a single ZWJ sequence as one grapheme", () => {
    expect(isSingleEmoji("👨‍👩‍👧")).toBe(true); // family (≤ 8 code points)
    expect(isSingleEmoji("🏳️‍🌈")).toBe(true); // rainbow flag
  });

  it("rejects arbitrary text, digits and symbols", () => {
    expect(isSingleEmoji("a")).toBe(false);
    expect(isSingleEmoji("hello")).toBe(false);
    expect(isSingleEmoji("1")).toBe(false); // digit has \p{Emoji} but not \p{Extended_Pictographic}
    expect(isSingleEmoji("#")).toBe(false);
    expect(isSingleEmoji("not-an-emoji")).toBe(false);
  });

  it("rejects more than one emoji or emoji + text", () => {
    expect(isSingleEmoji("🔥🔥")).toBe(false);
    expect(isSingleEmoji("🔥x")).toBe(false);
    expect(isSingleEmoji("🔥 ")).toBe(true); // trimmed to one
    expect(isSingleEmoji("🔥 😂")).toBe(false);
  });

  it("rejects empty, whitespace and non-strings", () => {
    expect(isSingleEmoji("")).toBe(false);
    expect(isSingleEmoji("   ")).toBe(false);
    expect(isSingleEmoji(null)).toBe(false);
    expect(isSingleEmoji(42)).toBe(false);
    expect(isSingleEmoji(undefined)).toBe(false);
  });
});

// ---------- custom-emoji cap ------------------------------------------------

describe("custom reaction cap", () => {
  const config = ["❤️", "🔥", "👏", "😂"];

  it("counts only emojis outside the configured set as customs", () => {
    expect(customReactionEmojis(["❤️", "🔥", "🎉", "🚀"], config)).toEqual(["🎉", "🚀"]);
    expect(customReactionEmojis(config, config)).toEqual([]);
  });

  it("keeps the cap at 8", () => {
    expect(REACTIONS_CUSTOM_CAP).toBe(8);
  });

  it("allows a new emoji only under the cap and not a duplicate", () => {
    const eightCustoms = ["🎉", "🚀", "🌈", "⭐", "🍀", "🎈", "🥳", "💯"];
    const all = [...config, ...eightCustoms];
    // At the cap: no more.
    expect(canAddCustomReaction(all, config, "🦄")).toBe(false);
    // Under the cap: allowed.
    expect(canAddCustomReaction([...config, "🎉"], config, "🚀")).toBe(true);
    // Duplicate of an existing (configured or custom) emoji: rejected.
    expect(canAddCustomReaction([...config, "🎉"], config, "🎉")).toBe(false);
    expect(canAddCustomReaction([...config, "🎉"], config, "🔥")).toBe(false);
  });
});

// ---------- tolerant server helpers -----------------------------------------

const MISSING_TABLE = { code: "42P01" };
const MISSING_FUNCTION = { code: "42883" };
const MISSING_FUNCTION_PGRST = { code: "PGRST202" };

// Minimal fake covering the exact chains these helpers use: client.rpc(name,
// args) and client.from(table).select|delete(...).eq(...).eq(...) (awaitable).
function fakeClient(opts: {
  rpc?: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
  select?: () => { data: unknown[] | null; error: unknown };
  del?: (eqs: [string, unknown][]) => { error: unknown };
}): DbClient {
  return {
    rpc: async (name: string, args: Record<string, unknown>) => opts.rpc!(name, args),
    from() {
      const makeEqBuilder = (settle: (eqs: [string, unknown][]) => { data?: unknown; error: unknown }) => {
        const eqs: [string, unknown][] = [];
        const builder = {
          eq(col: string, val: unknown) {
            eqs.push([col, val]);
            return builder;
          },
          then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
            return Promise.resolve(settle(eqs)).then(resolve, reject);
          },
        };
        return builder;
      };
      return {
        select: () => makeEqBuilder(() => opts.select!()),
        delete: () => makeEqBuilder((eqs) => opts.del!(eqs)),
      };
    },
  } as unknown as DbClient;
}

describe("toggleReaction", () => {
  it("parses the single-row (count, active) result", async () => {
    const client = fakeClient({
      rpc: (name, args) => {
        expect(name).toBe("toggle_reaction");
        expect(args.p_widget_id).toBe("w1");
        expect(args.p_emoji).toBe("🔥");
        expect(args.p_voter_hash).toBe("hash");
        return { data: [{ count: 3, active: true }], error: null };
      },
    });
    await expect(toggleReaction(client, "w1", "🔥", "hash")).resolves.toEqual({ count: 3, active: true });
  });

  it("reports an un-react", async () => {
    const client = fakeClient({ rpc: () => ({ data: [{ count: 2, active: false }], error: null }) });
    await expect(toggleReaction(client, "w1", "🔥", "hash")).resolves.toEqual({ count: 2, active: false });
  });

  it("falls back to increment when the RPC is missing (pre-migration)", async () => {
    for (const error of [MISSING_FUNCTION, MISSING_FUNCTION_PGRST]) {
      const calls: string[] = [];
      const client = fakeClient({
        rpc: (name) => {
          calls.push(name);
          if (name === "toggle_reaction") return { data: null, error };
          // increment_reaction fallback
          return { data: 7, error: null };
        },
      });
      await expect(toggleReaction(client, "w1", "🔥", "hash")).resolves.toEqual({ count: 7, active: true });
      expect(calls).toEqual(["toggle_reaction", "increment_reaction"]);
    }
  });

  it("throws on an unrelated RPC error", async () => {
    const client = fakeClient({ rpc: () => ({ data: null, error: { code: "XX000" } }) });
    await expect(toggleReaction(client, "w1", "🔥", "hash")).rejects.toBeTruthy();
  });
});

describe("ensureCustomReaction", () => {
  it("passes the config set and cap through to the RPC", async () => {
    const client = fakeClient({
      rpc: (name, args) => {
        expect(name).toBe("add_custom_reaction");
        expect(args.p_config_emojis).toEqual(["❤️"]);
        expect(args.p_cap).toBe(8);
        return { data: 0, error: null };
      },
    });
    await expect(ensureCustomReaction(client, "w1", "🎉", ["❤️"], 8)).resolves.toBe(0);
  });

  it("propagates the cap rejection", async () => {
    const client = fakeClient({ rpc: () => ({ data: null, error: { message: "custom emoji cap reached" } }) });
    await expect(ensureCustomReaction(client, "w1", "🎉", [], 8)).rejects.toBeTruthy();
  });
});

describe("getReactionCounts (pre-migration tolerance)", () => {
  it("returns a tally keyed by emoji", async () => {
    const client = fakeClient({
      select: () => ({
        data: [
          { emoji: "🔥", count: 3 },
          { emoji: "😂", count: 1 },
        ],
        error: null,
      }),
    });
    await expect(getReactionCounts(client, "w1")).resolves.toEqual({ "🔥": 3, "😂": 1 });
  });

  it("returns an empty tally when the table is missing", async () => {
    const client = fakeClient({ select: () => ({ data: null, error: MISSING_TABLE }) });
    await expect(getReactionCounts(client, "w1")).resolves.toEqual({});
  });
});

describe("deleteReactionEmoji", () => {
  it("purges the counter row AND its marks, scoped to (widget, emoji)", async () => {
    const deletes: [string, unknown][][] = [];
    const client = fakeClient({
      del: (eqs) => {
        deletes.push(eqs);
        return { error: null };
      },
    });
    await deleteReactionEmoji(client, "w1", "🎉");
    expect(deletes).toHaveLength(2); // widget_reactions then widget_reaction_marks
    for (const eqs of deletes) {
      expect(eqs).toEqual([
        ["widget_id", "w1"],
        ["emoji", "🎉"],
      ]);
    }
  });

  it("tolerates the marks table not existing yet (pre-migration)", async () => {
    let call = 0;
    const client = fakeClient({
      del: () => {
        call += 1;
        // First delete (widget_reactions) ok, second (marks) hits a missing table.
        return call === 1 ? { error: null } : { error: MISSING_TABLE };
      },
    });
    await expect(deleteReactionEmoji(client, "w1", "🎉")).resolves.toBeUndefined();
  });

  it("throws on an unrelated delete error", async () => {
    const client = fakeClient({ del: () => ({ error: { code: "XX000" } }) });
    await expect(deleteReactionEmoji(client, "w1", "🎉")).rejects.toBeTruthy();
  });
});
