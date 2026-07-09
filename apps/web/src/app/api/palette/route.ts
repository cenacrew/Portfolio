import { NextResponse } from "next/server";

// Palette proxy for the /qrcode "paint" button. randoma11y.com is a JS SPA (no
// colours in its HTML), but it is backed by a public colour API — the very data
// the site itself uses. We fetch that curated set of accessible colours and
// return a FRESH random pair with mutual WCAG contrast on every call, so each
// click recolours the board like a new randoma11y draw. Nothing is persisted.
//
// Runs server-side to avoid CORS and keep the upstream host out of the client.

export const dynamic = "force-dynamic";

const SOURCE = "https://accessible-colors-api.adam-f8f.workers.dev/api/colors";
const MIN_CONTRAST = 4.5; // WCAG AA for normal text.

type ColorRow = { hex: string };

// Cache the colour list briefly per server instance: the list is stable, only
// our random pick needs to change. Avoids refetching ~27 KB on every click.
let cache: { colors: string[]; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

async function getColors(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.colors;
  const res = await fetch(SOURCE, {
    headers: { accept: "application/json" },
    // Let upstream vary; we do our own caching above.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = (await res.json()) as { data?: ColorRow[] };
  const colors = (json.data ?? [])
    .map((c) => c.hex)
    .filter((h) => /^#?[0-9a-f]{6}$/i.test(h))
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
  if (colors.length < 2) throw new Error("no colours");
  cache = { colors, at: Date.now() };
  return colors;
}

// Picks a random pair of the accessible colours whose mutual contrast passes AA.
function pickPair(colors: string[]): [string, string] {
  for (let i = 0; i < 60; i++) {
    const a = colors[Math.floor(Math.random() * colors.length)];
    const b = colors[Math.floor(Math.random() * colors.length)];
    if (a !== b && contrast(a, b) >= MIN_CONTRAST) return [a, b];
  }
  // Fallback: deterministic extremes (guaranteed high contrast).
  let darkest = colors[0];
  let lightest = colors[0];
  for (const c of colors) {
    if (luminance(c) < luminance(darkest)) darkest = c;
    if (luminance(c) > luminance(lightest)) lightest = c;
  }
  return [lightest, darkest];
}

export async function GET() {
  try {
    const colors = await getColors();
    const [a, b] = pickPair(colors);
    // c1 = paper (lighter), c2 = ink (darker), matching the CSS roles.
    const [c1, c2] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
    return NextResponse.json({ c1, c2 }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "palette unavailable" },
      { status: 502 },
    );
  }
}
