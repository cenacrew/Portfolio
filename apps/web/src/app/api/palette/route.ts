import { NextResponse } from "next/server";

// Palette proxy for the /qrcode "paint" button. randoma11y.com is a JS SPA (no
// colours in its HTML), but it is backed by the public colour API the site
// itself uses. We seed a random colour, snap it to randoma11y's NEAREST
// accessible colour (/api/colors/closest), then build a readable pair from it:
// the vivid randoma11y colour as ink/paper, plus a same-hue neutral tint pushed
// until their contrast passes WCAG AA. Every click = a fresh randoma11y draw.
// Nothing is persisted. Runs server-side to avoid CORS.

export const dynamic = "force-dynamic";

const CLOSEST = "https://accessible-colors-api.adam-f8f.workers.dev/api/colors/closest";
const MIN_CONTRAST = 4.6; // WCAG AA (normal text) with a small safety margin.

type Rgb = { r: number; g: number; b: number };

function parse(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function toHex({ r, g, b }: Rgb): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
function luminance({ r, g, b }: Rgb): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 18, g: 18, b: 18 };

// Given the vivid randoma11y colour, produce a { c1 (paper, lighter), c2 (ink,
// darker) } pair whose contrast passes AA. The neutral partner shares the vivid
// hue (mix toward white/black) and is pushed until the pair is readable.
function buildPair(vivid: Rgb): { c1: string; c2: string } {
  const vividIsInk = luminance(vivid) <= 0.5;
  const target = vividIsInk ? WHITE : BLACK;
  let t = 0.86;
  let partner = mix(vivid, target, t);
  for (let i = 0; i < 12 && contrast(vivid, partner) < MIN_CONTRAST; i++) {
    t = Math.min(1, t + 0.03);
    partner = mix(vivid, target, t);
  }
  const paper = vividIsInk ? partner : vivid;
  const ink = vividIsInk ? vivid : partner;
  return { c1: toHex(paper), c2: toHex(ink) };
}

function randomSeedHex(): string {
  const n = Math.floor(Math.random() * 0xffffff);
  return n.toString(16).padStart(6, "0");
}

async function randomAccessibleColor(): Promise<Rgb> {
  const res = await fetch(`${CLOSEST}?hex=${randomSeedHex()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = (await res.json()) as { data?: { hex: string }[] };
  const list = (json.data ?? []).filter((c) => /^#?[0-9a-f]{6}$/i.test(c.hex));
  if (list.length === 0) throw new Error("no colour");
  // A little extra variety: pick among the nearest few accessible matches.
  const pick = list[Math.floor(Math.random() * Math.min(5, list.length))];
  return parse(pick.hex);
}

export async function GET() {
  try {
    const vivid = await randomAccessibleColor();
    const { c1, c2 } = buildPair(vivid);
    return NextResponse.json({ c1, c2 }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "palette unavailable" },
      { status: 502 },
    );
  }
}
