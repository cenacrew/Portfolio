/* eslint-disable @next/next/no-img-element */
import type { WidgetRendererProps } from "../types";
import type { LetterboxdConfig } from "./schema";

type Film = {
  title: string;
  year?: string;
  rating?: number; // 0..5, halves allowed
  poster?: string;
  link: string;
};

// Decode the handful of XML/HTML entities that show up in feed text (film
// titles like "Mr. &amp; Mrs. Smith").
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function pick(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return undefined;
  const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/i, "$1").trim();
  return raw ? decodeEntities(raw) : undefined;
}

// Parse a Letterboxd member RSS feed into its most recent diary entries.
function parseFeed(xml: string, limit: number): Film[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const films: Film[] = [];
  for (const it of items) {
    const title = pick(it, "letterboxd:filmTitle");
    const link = pick(it, "link");
    if (!title || !link) continue; // skip list/story items without a film
    const year = pick(it, "letterboxd:filmYear");
    const ratingRaw = pick(it, "letterboxd:memberRating");
    const rating = ratingRaw ? Number(ratingRaw) : undefined;
    const desc = pick(it, "description") ?? "";
    const poster = desc.match(/<img[^>]+src="([^"]+)"/i)?.[1];
    films.push({ title, year, rating: Number.isFinite(rating) ? rating : undefined, poster, link });
    if (films.length >= limit) break;
  }
  return films;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="w-lbxd__stars" aria-label={`${rating} sur 5`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
    </span>
  );
}

// Async server component: fetches the public RSS feed with a 1h revalidate.
// Degrades to a calm "indisponible" tile if the feed can't be read.
export default async function LetterboxdRenderer({ config }: WidgetRendererProps<LetterboxdConfig>) {
  const profile = `https://letterboxd.com/${config.username}/`;
  let films: Film[] = [];
  try {
    const res = await fetch(`https://letterboxd.com/${config.username}/rss/`, {
      headers: { "User-Agent": "cenacrew-portfolio/1.0 (+https://cenacrew.com)" },
      next: { revalidate: 3600 },
    });
    if (res.ok) films = parseFeed(await res.text(), 4);
  } catch {
    films = [];
  }

  return (
    <a className="w-lbxd" href={profile} target="_blank" rel="noreferrer">
      <div className="w-lbxd__head">
        <span className="w-lbxd__brand" aria-hidden>
          <i /> <i /> <i />
        </span>
        <span className="w-eyebrow">Letterboxd</span>
      </div>
      {films.length === 0 ? (
        <span className="w-lbxd__empty">Films indisponibles</span>
      ) : (
        <ul className="w-lbxd__list">
          {films.map((f, i) => (
            <li className="w-lbxd__film" key={i}>
              {f.poster ? (
                <img className="w-lbxd__poster" src={f.poster} alt="" loading="lazy" />
              ) : (
                <span className="w-lbxd__poster w-lbxd__poster--ph" aria-hidden>
                  🎬
                </span>
              )}
              <span className="w-lbxd__meta">
                <span className="w-lbxd__title">{f.title}</span>
                <span className="w-lbxd__sub">
                  {f.year ? <span className="w-lbxd__year">{f.year}</span> : null}
                  {typeof f.rating === "number" ? <Stars rating={f.rating} /> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </a>
  );
}
