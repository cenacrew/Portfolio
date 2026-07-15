import { describe, it, expect } from "vitest";
import type { ZodTypeAny } from "zod";
import * as configs from "../widget-configs";
import { WIDGET_TYPES, type WidgetType } from "../widget";

// One (schema, default) pair per widget type, keyed by the WidgetType string.
// The prefix maps the kebab-case type to its camelCase export names in
// widget-configs (e.g. "spotify-now-playing" → nowPlayingSchema/Default).
const PREFIX: Record<WidgetType, string> = {
  "social-link": "socialLink",
  note: "note",
  "location-map": "locationMap",
  guestbook: "guestbook",
  "spotify-embed": "spotifyEmbed",
  "spotify-now-playing": "nowPlaying",
  photo: "photo",
  video: "video",
  "github-stats": "githubStats",
  status: "status",
  weather: "weather",
  countdown: "countdown",
  watchlist: "watchlist",
  "visitor-counter": "visitorCounter",
  poll: "poll",
  "free-link": "freeLink",
  "youtube-embed": "youtubeEmbed",
  "tech-stack": "techStack",
  paypal: "paypal",
  letterboxd: "letterboxd",
  toile: "toile",
  lol: "lol",
  "file-download": "fileDownload",
};

const bag = configs as unknown as Record<string, unknown>;
const schemaOf = (t: WidgetType) => bag[`${PREFIX[t]}Schema`] as ZodTypeAny;
const defaultOf = (t: WidgetType) => bag[`${PREFIX[t]}Default`];

describe("widget-configs — coverage", () => {
  it("exposes a schema + default for every declared widget type", () => {
    for (const t of WIDGET_TYPES) {
      expect(schemaOf(t), `${t} schema`).toBeTruthy();
      expect(defaultOf(t), `${t} default`).toBeDefined();
    }
  });
});

// `video` is the one deliberate exception: its default is an intentional
// "not yet configured" placeholder ({ src: "" }) that its own schema rejects
// (src.min(1)), so an unconfigured video tile is filtered out of the public
// render rather than showing a broken <video>. Every other type's default is a
// fully valid, renderable config. Documented so this asymmetry is a conscious
// contract, not an accident.
const DEFAULT_MUST_ROUNDTRIP = WIDGET_TYPES.filter((t) => t !== "video");

describe("widget-configs — every default round-trips through its schema", () => {
  for (const t of DEFAULT_MUST_ROUNDTRIP) {
    it(`${t} default is valid`, () => {
      const res = schemaOf(t).safeParse(defaultOf(t));
      expect(res.success, res.success ? "" : JSON.stringify(res.error?.issues)).toBe(true);
    });
  }
});

describe("video — 'must configure' placeholder contract", () => {
  it("has a default the schema intentionally rejects (empty src placeholder)", () => {
    expect(configs.videoSchema.safeParse(configs.videoDefault).success).toBe(false);
  });

  it("accepts a configured video (non-empty src)", () => {
    expect(configs.videoSchema.safeParse({ src: "https://cdn/x.mp4" }).success).toBe(true);
  });
});

describe("photo — carousel interval default and bounds", () => {
  it("applies intervalSec = 5 when omitted", () => {
    const parsed = configs.photoSchema.parse({ images: [{ src: "/x.png" }] });
    expect(parsed.intervalSec).toBe(5);
  });

  it("accepts 0 (no auto-advance)", () => {
    expect(configs.photoSchema.parse({ images: [{ src: "/x.png" }], intervalSec: 0 }).intervalSec).toBe(0);
  });

  it("rejects a negative interval and an interval above 60", () => {
    expect(configs.photoSchema.safeParse({ images: [{ src: "/x.png" }], intervalSec: -1 }).success).toBe(false);
    expect(configs.photoSchema.safeParse({ images: [{ src: "/x.png" }], intervalSec: 61 }).success).toBe(false);
  });

  it("rejects an empty image list", () => {
    expect(configs.photoSchema.safeParse({ images: [] }).success).toBe(false);
  });

  it("defaults an image alt to an empty string", () => {
    const parsed = configs.photoSchema.parse({ images: [{ src: "/x.png" }] });
    expect(parsed.images[0].alt).toBe("");
  });

  it("leaves linkUrl undefined when omitted and keeps it when provided", () => {
    const without = configs.photoSchema.parse({ images: [{ src: "/x.png" }] });
    expect(without.images[0].linkUrl).toBeUndefined();
    const withLink = configs.photoSchema.parse({
      images: [{ src: "/x.png", linkUrl: "https://example.com" }],
    });
    expect(withLink.images[0].linkUrl).toBe("https://example.com");
  });
});

describe("countdown — defaults", () => {
  it("applies the 🎯 emoji default", () => {
    const parsed = configs.countdownSchema.parse({ title: "Sortie", target: "2027-01-01T00:00:00.000Z" });
    expect(parsed.emoji).toBe("🎯");
  });

  it("rejects a missing title", () => {
    expect(configs.countdownSchema.safeParse({ target: "2027-01-01T00:00:00.000Z" }).success).toBe(false);
  });

  it("defaults endBehavior to message and endMessage to the party text", () => {
    const parsed = configs.countdownSchema.parse({ title: "Sortie", target: "2027-01-01T00:00:00.000Z" });
    expect(parsed.endBehavior).toBe("message");
    expect(parsed.endMessage).toBe(configs.COUNTDOWN_DEFAULT_END_MESSAGE);
  });

  it("accepts the elapsed and hide behaviours and rejects an unknown one", () => {
    expect(
      configs.countdownSchema.safeParse({ title: "x", target: "2027-01-01T00:00:00.000Z", endBehavior: "elapsed" })
        .success,
    ).toBe(true);
    expect(
      configs.countdownSchema.safeParse({ title: "x", target: "2027-01-01T00:00:00.000Z", endBehavior: "hide" })
        .success,
    ).toBe(true);
    expect(
      configs.countdownSchema.safeParse({ title: "x", target: "2027-01-01T00:00:00.000Z", endBehavior: "boom" })
        .success,
    ).toBe(false);
  });
});

describe("video — tapToUnmute default", () => {
  it("defaults tapToUnmute to false and accepts true", () => {
    const parsed = configs.videoSchema.parse({ src: "https://cdn/x.mp4" });
    expect(parsed.tapToUnmute).toBe(false);
    expect(configs.videoSchema.parse({ src: "https://cdn/x.mp4", tapToUnmute: true }).tapToUnmute).toBe(true);
  });
});

describe("note — enum + defaults", () => {
  it("defaults the tone to cream", () => {
    expect(configs.noteSchema.parse({ text: "hi" }).tone).toBe("cream");
  });

  it("rejects an unknown tone", () => {
    expect(configs.noteSchema.safeParse({ text: "hi", tone: "neon" }).success).toBe(false);
  });

  it("rejects empty text", () => {
    expect(configs.noteSchema.safeParse({ text: "" }).success).toBe(false);
  });
});

describe("social-link — platform enum", () => {
  it("accepts a known platform", () => {
    expect(configs.socialLinkSchema.safeParse({ platform: "github", url: "https://gh/x" }).success).toBe(true);
  });

  it("rejects an unknown platform and an empty url", () => {
    expect(configs.socialLinkSchema.safeParse({ platform: "myspace", url: "https://x" }).success).toBe(false);
    expect(configs.socialLinkSchema.safeParse({ platform: "github", url: "" }).success).toBe(false);
  });
});

describe("poll — at least two options with defaulted vote counts", () => {
  it("defaults votes to 0 and requires two options", () => {
    const parsed = configs.pollSchema.parse({
      question: "?",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    expect(parsed.options.every((o) => o.votes === 0)).toBe(true);
  });

  it("rejects a single-option poll", () => {
    expect(
      configs.pollSchema.safeParse({ question: "?", options: [{ id: "a", label: "A" }] }).success,
    ).toBe(false);
  });
});

describe("file-download — size field and 50 MB cap constant", () => {
  it("fills empty defaults", () => {
    const parsed = configs.fileDownloadSchema.parse({});
    expect(parsed).toMatchObject({ fileUrl: "", fileName: "", sizeBytes: 0, mimeType: "" });
  });

  it("rejects a negative or non-integer size", () => {
    expect(configs.fileDownloadSchema.safeParse({ sizeBytes: -1 }).success).toBe(false);
    expect(configs.fileDownloadSchema.safeParse({ sizeBytes: 1.5 }).success).toBe(false);
  });

  it("exposes MAX_FILE_BYTES = 50 MB", () => {
    expect(configs.MAX_FILE_BYTES).toBe(50 * 1024 * 1024);
  });
});
