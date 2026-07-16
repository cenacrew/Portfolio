import { describe, it, expect } from "vitest";
import {
  buildVCard,
  isCountdownHiddenNow,
  MEDIA_TYPES,
  WIDGET_MEDIA_SPECS,
} from "../widget-configs";
import { extractMediaPaths } from "../supabase/media";
import type { MediaWidget } from "../supabase/media";

const SB = "https://proj.supabase.co";
const bucketUrl = (path: string) => `${SB}/storage/v1/object/public/widget-media/${path}`;

// ---------- media capability declaration (findings #1, #5, #6) --------------

describe("extractMediaPaths — driven by per-widget media specs", () => {
  const cases: { widget: MediaWidget; expected: string[] }[] = [
    {
      widget: {
        id: "w1",
        type: "photo",
        config: { images: [{ src: bucketUrl("a.png") }, { src: bucketUrl("b.png") }] },
      },
      expected: ["a.png", "b.png"],
    },
    {
      widget: { id: "w2", type: "video", config: { src: bucketUrl("v.mp4"), poster: bucketUrl("p.jpg") } },
      expected: ["v.mp4", "p.jpg"],
    },
    {
      widget: { id: "w3", type: "file-download", config: { fileUrl: bucketUrl("files/cv.pdf") } },
      expected: ["files/cv.pdf"],
    },
    // Regression: the old purge-script copy dropped these two, marking live
    // media as orphaned and deleting it under --apply.
    {
      widget: { id: "w4", type: "contact-card", config: { photoUrl: bucketUrl("card.jpg") } },
      expected: ["card.jpg"],
    },
    {
      widget: {
        id: "w5",
        type: "cv-timeline",
        config: { entries: [{ logoUrl: bucketUrl("logo1.png") }, { logoUrl: bucketUrl("logo2.png") }] },
      },
      expected: ["logo1.png", "logo2.png"],
    },
    {
      widget: { id: "w6", type: "toile", config: { version: 2 } },
      expected: ["toile/w6.png"],
    },
  ];

  for (const { widget, expected } of cases) {
    it(`resolves ${widget.type} media`, () => {
      expect(extractMediaPaths(widget).sort()).toEqual([...expected].sort());
    });
  }

  it("returns nothing for a non-media widget type", () => {
    expect(extractMediaPaths({ id: "n", type: "note", config: { text: "hi" } })).toEqual([]);
  });

  it("ignores URLs that don't point at the widget-media bucket", () => {
    const w: MediaWidget = { id: "x", type: "photo", config: { images: [{ src: "https://example.com/x.png" }] } };
    expect(extractMediaPaths(w)).toEqual([]);
  });

  it("tolerates a malformed config without throwing", () => {
    expect(extractMediaPaths({ id: "b", type: "photo", config: null })).toEqual([]);
    expect(extractMediaPaths({ id: "b", type: "video", config: 42 })).toEqual([]);
  });
});

describe("MEDIA_TYPES", () => {
  it("lists exactly the types with a media spec", () => {
    expect([...MEDIA_TYPES].sort()).toEqual(
      ["contact-card", "cv-timeline", "file-download", "photo", "toile", "video"].sort(),
    );
  });

  it("only the toile spec copies its id-keyed media on duplication", () => {
    expect(WIDGET_MEDIA_SPECS.toile?.copyOnDuplicate).toBe(true);
    expect(WIDGET_MEDIA_SPECS.toile?.idKeyedPath?.("abc")).toBe("toile/abc.png");
    expect(WIDGET_MEDIA_SPECS.photo?.copyOnDuplicate).toBeUndefined();
  });
});

// ---------- shared countdown "hidden now" predicate (finding #4) ------------

describe("isCountdownHiddenNow", () => {
  const past = "2020-01-01T00:00:00.000Z";
  const future = "2999-01-01T00:00:00.000Z";
  const now = Date.parse("2026-01-01T00:00:00.000Z");

  it("is true only for a reached hide-on-end countdown", () => {
    expect(isCountdownHiddenNow({ endBehavior: "hide", target: past }, now)).toBe(true);
  });
  it("is false before the target is reached", () => {
    expect(isCountdownHiddenNow({ endBehavior: "hide", target: future }, now)).toBe(false);
  });
  it("is false for non-hide behaviours even when reached", () => {
    expect(isCountdownHiddenNow({ endBehavior: "message", target: past }, now)).toBe(false);
    expect(isCountdownHiddenNow({ endBehavior: "elapsed", target: past }, now)).toBe(false);
    expect(isCountdownHiddenNow({ target: past }, now)).toBe(false);
  });
  it("is false for an unparseable target", () => {
    expect(isCountdownHiddenNow({ endBehavior: "hide", target: "not-a-date" }, now)).toBe(false);
    expect(isCountdownHiddenNow({ endBehavior: "hide" }, now)).toBe(false);
  });
});

// ---------- vCard folding is perf-safe AND RFC 6350 conformant (finding #8) --

describe("buildVCard — foldLine on a large base64 PHOTO", () => {
  it("folds a big ASCII photo line to 75 octets and reassembles it exactly", () => {
    const photo = "A".repeat(200_000);
    const started = Date.now();
    const card = buildVCard({ firstName: "Ana", photoBase64: photo, photoMime: "image/png" });
    // Fast-path must be near-instant; a per-char TextEncoder allocation made
    // this hundreds of ms. Generous bound to stay non-flaky in CI.
    expect(Date.now() - started).toBeLessThan(500);

    for (const line of card.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Un-folding (drop CRLF + the single continuation space) restores the value.
    const unfolded = card.replace(/\r\n[ ]/g, "");
    expect(unfolded).toContain(`PHOTO;ENCODING=b;TYPE=PNG:${photo}`);
  });

  it("still never splits a multi-byte character on the general path", () => {
    const card = buildVCard({ firstName: "É".repeat(120) });
    for (const line of card.split("\r\n")) {
      expect(line).toBe(Buffer.from(line, "utf8").toString("utf8"));
    }
    expect(card.replace(/\r\n[ ]/g, "")).toContain("É".repeat(120));
  });
});
