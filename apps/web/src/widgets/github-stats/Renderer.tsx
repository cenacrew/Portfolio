import type { WidgetRendererProps } from "../types";
import type { GithubStatsConfig } from "./schema";

// Server-side fetch of the public GitHub REST API, cached for 1h. No token:
// unauthenticated calls are rate-limited (60/h per IP) which the cache
// comfortably stays under.
const GH = {
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "cenacrew-portfolio",
  },
  next: { revalidate: 3600 },
} as const;

type User = { public_repos: number; followers: number; name: string | null };
type Repo = {
  name: string;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
};
type Event = { type: string; created_at: string; payload?: { size?: number } };

const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  C: "#555555",
  "C++": "#f34b7d",
  Rust: "#dea584",
  Shell: "#89e051",
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, GH);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function buildHeatmap(events: Event[], weeks: number): number[] {
  const days = weeks * 7;
  const counts = new Map<string, number>();
  for (const e of events) {
    const key = e.created_at.slice(0, 10);
    const inc = e.type === "PushEvent" ? e.payload?.size ?? 1 : 1;
    counts.set(key, (counts.get(key) ?? 0) + inc);
  }
  const out: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(counts.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

function level(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export default async function GithubStatsRenderer({
  config,
}: WidgetRendererProps<GithubStatsConfig>) {
  const [user, repos, events] = await Promise.all([
    getJson<User>(`https://api.github.com/users/${config.username}`),
    getJson<Repo[]>(
      `https://api.github.com/users/${config.username}/repos?sort=pushed&per_page=100`,
    ),
    getJson<Event[]>(
      `https://api.github.com/users/${config.username}/events/public?per_page=100`,
    ),
  ]);

  const topRepos = (repos ?? [])
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 3);
  const stars = (repos ?? []).reduce((s, r) => s + r.stargazers_count, 0);
  const heat = buildHeatmap(events ?? [], config.weeks);

  return (
    <div className="w-gh">
      <div className="w-gh__head">
        <span className="w-gh__logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0C17.3 4.4 18.3 4.7 18.3 4.7c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
          </svg>
        </span>
        <span className="w-gh__handle">@{config.username}</span>
      </div>

      <div className="w-gh__stats">
        <span>
          <b>{user?.public_repos ?? "—"}</b> repos
        </span>
        <span>
          <b>{user?.followers ?? "—"}</b> abonnés
        </span>
        <span>
          <b>{stars}</b> ★
        </span>
      </div>

      <div className="w-gh__heat" aria-label="Activité récente">
        {heat.map((c, i) => (
          <span key={i} className="w-gh__cell" data-lvl={level(c)} />
        ))}
      </div>

      <ul className="w-gh__repos">
        {topRepos.map((r) => (
          <li key={r.name}>
            <a href={r.html_url} target="_blank" rel="noreferrer">
              <span className="w-gh__repo-name">{r.name}</span>
              {r.language && (
                <span className="w-gh__lang">
                  <i style={{ background: LANG_COLORS[r.language] ?? "#8b8b8b" }} />
                  {r.language}
                </span>
              )}
            </a>
          </li>
        ))}
        {topRepos.length === 0 && (
          <li className="w-gh__empty">Dépôts indisponibles</li>
        )}
      </ul>
    </div>
  );
}
