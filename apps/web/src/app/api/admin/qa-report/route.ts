import { NextResponse } from "next/server";
import type { WidgetType } from "@portfolio/shared";
import { WIDGET_MEDIA_BUCKET, upsertWidgetQa } from "@portfolio/shared";
import { getServerSupabase } from "@/lib/supabase/server";
import { currentHash } from "@/widgets/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QaResult {
  type: WidgetType;
  format: string;
  validated: boolean;
  note?: string;
  // A PNG data URL captured client-side (html-to-image) for non-validated tiles.
  screenshotDataUrl?: string;
}

// The repo the QA issue is opened against. Override with GITHUB_REPO if needed.
const GITHUB_REPO = process.env.GITHUB_REPO || "cenacrew/Portfolio";

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Decodes a "data:image/png;base64,...." URL into raw bytes, or null.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1] || "image/png";
  const isBase64 = Boolean(m[2]);
  try {
    const bytes = isBase64
      ? new Uint8Array(Buffer.from(m[3], "base64"))
      : new Uint8Array(Buffer.from(decodeURIComponent(m[3]), "utf8"));
    return { bytes, contentType };
  } catch {
    return null;
  }
}

// POST: persist a QA session's outcomes to widget_qa and (when a token is set)
// open one GitHub issue for the flagged tiles. Admin only.
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré." }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  let body: { results?: QaResult[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  const results = Array.isArray(body.results) ? body.results : [];
  if (results.length === 0) {
    return NextResponse.json({ error: "Rien à enregistrer." }, { status: 400 });
  }

  const now = new Date();
  const at = stamp(now);
  let persisted = true; // false if the widget_qa table isn't migrated yet
  const issues: { type: string; format: string; note: string; screenshotUrl: string | null }[] = [];

  for (const r of results) {
    const hash = currentHash(r.type);
    let screenshotUrl: string | null = null;

    // Screenshot only for non-validated tiles (best-effort; a failed capture or
    // upload never blocks the session).
    if (!r.validated && r.screenshotDataUrl) {
      const decoded = decodeDataUrl(r.screenshotDataUrl);
      if (decoded) {
        const safeFormat = r.format.replace(/[^a-z0-9]+/gi, "");
        const path = `qa/${r.type}-${safeFormat}-${at}.png`;
        try {
          const { error } = await supabase.storage
            .from(WIDGET_MEDIA_BUCKET)
            .upload(path, decoded.bytes, { contentType: decoded.contentType, upsert: true });
          if (!error) {
            screenshotUrl = supabase.storage.from(WIDGET_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
          }
        } catch {
          /* keep screenshotUrl null */
        }
      }
    }

    // Validated → record the approved hash (status ok). Flagged → keep the hash
    // null so it stays "to verify" until the code is fixed (status issue).
    const wrote = await upsertWidgetQa(supabase, {
      widget_type: r.type,
      format: r.format,
      validated_hash: r.validated ? hash : null,
      status: r.validated ? "ok" : "issue",
      note: r.validated ? null : (r.note?.trim() || null),
      screenshot_url: r.validated ? null : screenshotUrl,
    });
    if (!wrote) persisted = false;

    if (!r.validated) {
      issues.push({ type: r.type, format: r.format, note: r.note?.trim() || "—", screenshotUrl });
    }
  }

  // ---------- GitHub issue (optional) --------------------------------------
  let issueUrl: string | null = null;
  let issueSkipped = false;
  const token = process.env.GITHUB_TOKEN;

  if (issues.length > 0) {
    if (!token) {
      issueSkipped = true;
    } else {
      const rows = issues
        .map(
          (i) =>
            `| \`${i.type}\` | \`${i.format}\` | ${i.note.replace(/\|/g, "\\|")} | ${
              i.screenshotUrl ? `[capture](${i.screenshotUrl})` : "—"
            } |`,
        )
        .join("\n");
      const shots = issues
        .filter((i) => i.screenshotUrl)
        .map((i) => `### \`${i.type}\` — \`${i.format}\`\n\n![${i.type} ${i.format}](${i.screenshotUrl})`)
        .join("\n\n");
      const md = [
        `Session QA du ${now.toLocaleString("fr-FR")}.`,
        "",
        "| Type | Format | Note | Capture |",
        "| --- | --- | --- | --- |",
        rows,
        shots ? `\n---\n\n${shots}` : "",
      ].join("\n");

      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "cenacrew-qa-console",
          },
          body: JSON.stringify({
            title: `QA widgets — ${now.toLocaleDateString("fr-FR")} (${issues.length} à corriger)`,
            body: md,
            labels: ["qa", "widgets"],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { html_url?: string };
          issueUrl = data.html_url ?? null;
        } else {
          issueSkipped = true;
        }
      } catch {
        issueSkipped = true;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    persisted,
    validated: results.filter((r) => r.validated).length,
    flagged: issues.length,
    issueUrl,
    issueSkipped,
  });
}
