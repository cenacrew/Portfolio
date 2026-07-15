import { describe, it, expect } from "vitest";
import {
  buildVCard,
  contactCardSchema,
  contactCardDefault,
  contactFullName,
  cvTimelineSchema,
  cvTimelineDefault,
  escapeVCardValue,
  makeCvTimelineEntry,
  REACTIONS_DEFAULT_EMOJIS,
  reactionsSchema,
  reactionsDefault,
  vcardFileStem,
} from "../widget-configs";

// ---------- contact-card -----------------------------------------------------

describe("contact-card — schema", () => {
  it("default round-trips and reuses the header avatar", () => {
    const res = contactCardSchema.safeParse(contactCardDefault);
    expect(res.success).toBe(true);
    expect(contactCardDefault.useHeaderAvatar).toBe(true);
  });

  it("requires a first name", () => {
    expect(contactCardSchema.safeParse({ firstName: "" }).success).toBe(false);
    expect(contactCardSchema.safeParse({}).success).toBe(false);
  });

  it("defaults lastName to empty and useHeaderAvatar to true", () => {
    const parsed = contactCardSchema.parse({ firstName: "Ana" });
    expect(parsed.lastName).toBe("");
    expect(parsed.useHeaderAvatar).toBe(true);
  });

  it("builds the full display name", () => {
    expect(contactFullName({ firstName: " Ana ", lastName: " Bo " })).toBe("Ana Bo");
    expect(contactFullName({ firstName: "Ana", lastName: "" })).toBe("Ana");
  });

  it("derives an ascii .vcf file stem", () => {
    expect(vcardFileStem({ firstName: "Valentin", lastName: "Sourdois Pajot" })).toBe(
      "valentin-sourdois-pajot",
    );
    expect(vcardFileStem({ firstName: "Éléa", lastName: "" })).toBe("elea");
    expect(vcardFileStem({ firstName: "…", lastName: "" })).toBe("contact");
  });
});

describe("contact-card — vCard generation (RFC 6350)", () => {
  it("escapes backslash, comma, semicolon and newline", () => {
    expect(escapeVCardValue("a\\b")).toBe("a\\\\b");
    expect(escapeVCardValue("a,b;c")).toBe("a\\,b\\;c");
    expect(escapeVCardValue("a\nb")).toBe("a\\nb");
  });

  it("emits a valid minimal card with CRLF line endings", () => {
    const card = buildVCard({ firstName: "Ana", lastName: "Bo" });
    expect(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(card.endsWith("END:VCARD\r\n")).toBe(true);
    expect(card).toContain("N:Bo;Ana;;;");
    expect(card).toContain("FN:Ana Bo");
    // No stray bare \n (every newline is part of a CRLF pair).
    expect(card.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("escapes reserved characters in field values", () => {
    const card = buildVCard({ firstName: "Ana", org: "ACME; R&D, unit" });
    expect(card).toContain("ORG:ACME\\; R&D\\, unit");
  });

  it("includes only the provided optional properties", () => {
    const card = buildVCard({
      firstName: "Ana",
      phone: "+33 6 00 00 00 00",
      email: "ana@example.com",
      website: "https://example.com",
      role: "Dev",
    });
    expect(card).toContain("TEL;TYPE=CELL:+33 6 00 00 00 00");
    expect(card).toContain("EMAIL;TYPE=INTERNET:ana@example.com");
    expect(card).toContain("URL:https://example.com");
    expect(card).toContain("TITLE:Dev");
    const bare = buildVCard({ firstName: "Ana" });
    expect(bare).not.toContain("TEL");
    expect(bare).not.toContain("EMAIL");
    expect(bare).not.toContain("URL:");
    expect(bare).not.toContain("ORG:");
  });

  it("folds long lines to 75 octets with a leading-space continuation", () => {
    const card = buildVCard({ firstName: "Ana", photoBase64: "A".repeat(400), photoMime: "image/png" });
    const unfolded = card.replace(/\r\n[ ]/g, "");
    expect(unfolded).toContain(`PHOTO;ENCODING=b;TYPE=PNG:${"A".repeat(400)}`);
    for (const line of card.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a multi-byte character across a fold", () => {
    const card = buildVCard({ firstName: "É".repeat(120) });
    // Every fold-reassembled line must still be valid UTF-8 text (no lone
    // surrogates / broken sequences once split into lines).
    for (const line of card.split("\r\n")) {
      expect(line).toBe(Buffer.from(line, "utf8").toString("utf8"));
    }
    const unfolded = card.replace(/\r\n[ ]/g, "");
    expect(unfolded).toContain("É".repeat(120));
  });
});

// ---------- cv-timeline ------------------------------------------------------

describe("cv-timeline — schema", () => {
  it("default round-trips", () => {
    expect(cvTimelineSchema.safeParse(cvTimelineDefault).success).toBe(true);
  });

  it("accepts an empty entries list (freshly added widget)", () => {
    const parsed = cvTimelineSchema.parse({});
    expect(parsed.title).toBe("Parcours");
    expect(parsed.entries).toEqual([]);
  });

  it("requires id, period and title on every entry", () => {
    const ok = { id: "x", period: "2024", title: "Dev" };
    expect(cvTimelineSchema.safeParse({ entries: [ok] }).success).toBe(true);
    expect(cvTimelineSchema.safeParse({ entries: [{ ...ok, period: "" }] }).success).toBe(false);
    expect(cvTimelineSchema.safeParse({ entries: [{ ...ok, title: "" }] }).success).toBe(false);
    expect(cvTimelineSchema.safeParse({ entries: [{ period: "2024", title: "Dev" }] }).success).toBe(false);
  });

  it("makeCvTimelineEntry produces a schema-valid entry with a fresh id", () => {
    const a = makeCvTimelineEntry();
    const b = makeCvTimelineEntry();
    expect(cvTimelineSchema.safeParse({ entries: [a] }).success).toBe(true);
    expect(a.id).not.toBe(b.id);
  });
});

// ---------- reactions --------------------------------------------------------

describe("reactions — schema", () => {
  it("default round-trips with the ❤️ 🔥 👏 😂 set", () => {
    expect(reactionsSchema.safeParse(reactionsDefault).success).toBe(true);
    expect(reactionsDefault.emojis).toEqual(REACTIONS_DEFAULT_EMOJIS);
    expect(REACTIONS_DEFAULT_EMOJIS).toEqual(["❤️", "🔥", "👏", "😂"]);
  });

  it("applies the default emojis when omitted", () => {
    expect(reactionsSchema.parse({}).emojis).toEqual(REACTIONS_DEFAULT_EMOJIS);
  });

  it("requires 1 to 8 emojis", () => {
    expect(reactionsSchema.safeParse({ emojis: [] }).success).toBe(false);
    expect(reactionsSchema.safeParse({ emojis: Array(9).fill("✨") }).success).toBe(false);
    expect(reactionsSchema.safeParse({ emojis: ["✨"] }).success).toBe(true);
  });

  it("rejects an emoji longer than 8 characters (arbitrary text)", () => {
    expect(reactionsSchema.safeParse({ emojis: ["not-an-emoji"] }).success).toBe(false);
  });
});
