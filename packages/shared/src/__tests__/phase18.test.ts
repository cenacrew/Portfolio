import { describe, it, expect } from "vitest";
import {
  getWidgetQaMap,
  resetWidgetQa,
  upsertWidgetQa,
  widgetQaKey,
} from "../supabase/queries";
import type { DbClient } from "../supabase/client";
import type { WidgetQaInsert, WidgetQaRow } from "../supabase/types";

// ---------------------------------------------------------------------------
// Phase 18 — widget_qa queries parameterised by breakpoint.
//
// A minimal fake of the Supabase query-builder chains these helpers actually
// use: from().select("*"), from().upsert(payload, opts) and
// from().update(patch).eq().eq() (awaitable builder). Each test wires the
// handlers it needs and asserts both the returned value and what was sent.
// ---------------------------------------------------------------------------

type Eq = [string, unknown];

interface Handlers {
  select?: () => { data: unknown[] | null; error: unknown };
  upsert?: (payload: unknown, opts: { onConflict?: string }) => { error: unknown };
  update?: (patch: unknown, eqs: Eq[]) => { error: unknown };
}

function fakeClient(handlers: Handlers): DbClient {
  return {
    from(table: string) {
      expect(table).toBe("widget_qa");
      return {
        select: async () => handlers.select!(),
        upsert: async (payload: unknown, opts: { onConflict?: string }) =>
          handlers.upsert!(payload, opts),
        update: (patch: unknown) => {
          const eqs: Eq[] = [];
          const builder = {
            eq(col: string, val: unknown) {
              eqs.push([col, val]);
              return builder;
            },
            then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
              return Promise.resolve(handlers.update!(patch, eqs)).then(resolve, reject);
            },
          };
          return builder;
        },
      };
    },
  } as unknown as DbClient;
}

const row = (partial: Partial<WidgetQaRow> & Pick<WidgetQaRow, "widget_type" | "format">): WidgetQaRow => ({
  validated_hash: "h",
  status: "ok",
  note: null,
  screenshot_url: null,
  updated_at: "2026-01-01T00:00:00.000Z",
  ...partial,
});

const MISSING_TABLE = { code: "42P01" };
const MISSING_COLUMN = { code: "42703" };
// What PostgREST returns when an insert/upsert payload references a column the
// schema cache doesn't know (pre-0013 `breakpoint`).
const MISSING_COLUMN_PGRST = { code: "PGRST204" };

describe("getWidgetQaMap (per breakpoint)", () => {
  const rows = [
    row({ widget_type: "note", format: "1x1", breakpoint: "mobile", validated_hash: "m" }),
    row({ widget_type: "note", format: "1x1", breakpoint: "desktop", validated_hash: "d" }),
    row({ widget_type: "photo", format: "4x2", breakpoint: "desktop" }),
    // Pre-0013 row: no breakpoint column yet — must match BOTH contexts so
    // prior validations survive until the migration runs.
    row({ widget_type: "clock", format: "2x2", validated_hash: "legacy" }),
  ];

  it("returns only the requested breakpoint's rows (legacy rows match both)", async () => {
    const client = fakeClient({ select: () => ({ data: rows, error: null }) });

    const mobile = await getWidgetQaMap(client, "mobile");
    expect(mobile[widgetQaKey("note", "1x1")]?.validated_hash).toBe("m");
    expect(mobile[widgetQaKey("photo", "4x2")]).toBeUndefined();
    expect(mobile[widgetQaKey("clock", "2x2")]?.validated_hash).toBe("legacy");

    const desktop = await getWidgetQaMap(client, "desktop");
    expect(desktop[widgetQaKey("note", "1x1")]?.validated_hash).toBe("d");
    expect(desktop[widgetQaKey("photo", "4x2")]).toBeDefined();
    expect(desktop[widgetQaKey("clock", "2x2")]?.validated_hash).toBe("legacy");
  });

  it("returns an empty map when the table is missing (pre-migration)", async () => {
    const client = fakeClient({ select: () => ({ data: null, error: MISSING_TABLE }) });
    await expect(getWidgetQaMap(client, "mobile")).resolves.toEqual({});
  });

  it("throws on any other error", async () => {
    const client = fakeClient({ select: () => ({ data: null, error: { code: "XX000" } }) });
    await expect(getWidgetQaMap(client, "desktop")).rejects.toBeTruthy();
  });
});

describe("upsertWidgetQa (per breakpoint)", () => {
  const insert: WidgetQaInsert = {
    widget_type: "note",
    format: "1x1",
    breakpoint: "mobile",
    validated_hash: "abc",
    status: "ok",
  };

  it("upserts on the 3-part key and carries the breakpoint in the payload", async () => {
    let sent: { payload: unknown; opts: { onConflict?: string } } | null = null;
    const client = fakeClient({
      upsert: (payload, opts) => {
        sent = { payload, opts };
        return { error: null };
      },
    });
    await expect(upsertWidgetQa(client, insert)).resolves.toBe(true);
    expect(sent!.opts.onConflict).toBe("widget_type,format,breakpoint");
    const payload = sent!.payload as WidgetQaInsert;
    expect(payload.breakpoint).toBe("mobile");
    expect(payload.updated_at).toBeTruthy();
  });

  it("returns false (no throw) when the table or column is missing", async () => {
    for (const error of [MISSING_TABLE, MISSING_COLUMN, MISSING_COLUMN_PGRST]) {
      const client = fakeClient({ upsert: () => ({ error }) });
      await expect(upsertWidgetQa(client, insert)).resolves.toBe(false);
    }
  });
});

describe("resetWidgetQa (per breakpoint)", () => {
  it("clears only the given type IN the given breakpoint", async () => {
    let sent: { patch: unknown; eqs: Eq[] } | null = null;
    const client = fakeClient({
      update: (patch, eqs) => {
        sent = { patch, eqs };
        return { error: null };
      },
    });
    await expect(resetWidgetQa(client, "note", "desktop")).resolves.toBe(true);
    expect(sent!.eqs).toEqual([
      ["widget_type", "note"],
      ["breakpoint", "desktop"],
    ]);
    const patch = sent!.patch as { validated_hash: unknown; status: unknown };
    expect(patch.validated_hash).toBeNull();
    expect(patch.status).toBe("pending");
  });

  it("no-ops (false) when the table or column is missing", async () => {
    for (const error of [MISSING_TABLE, MISSING_COLUMN]) {
      const client = fakeClient({ update: () => ({ error }) });
      await expect(resetWidgetQa(client, "note", "mobile")).resolves.toBe(false);
    }
  });
});
