"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { WidgetQaBreakpoint, WidgetType } from "@portfolio/shared";
import { widgetQaKey } from "@portfolio/shared";
import { toPng } from "html-to-image";
import type { QaTypeEntry } from "@/widgets/qa";
import { reVerifyAction } from "./actions";

// Grid geometry of the two audited contexts, mirroring qrcode.css so each tile
// is rendered at true public scale.
// - Mobile (3 cols, gap 10, pad 16 — see qrcode.css): sized FLUIDLY in CSS
//   (cqw against the board frame) in qa.css, exactly like the live --qr-unit, so
//   a w=3 tile spans the full board and can never overflow a narrow WebView.
//   Only the inner padding (--wp: 13px) is passed from here.
// - Desktop (9 cols on the real 1360px board): fixed px at true grid unit.
// The tile is a size container, so each Renderer's @container queries adapt
// exactly as on the live page.
const M = { wp: 13 };
const D = { unit: 136, gap: 12, wp: 15 };

function tileBox(w: number, h: number, unit: number, gap: number): CSSProperties {
  return {
    width: w * unit + (w - 1) * gap,
    height: h * unit + (h - 1) * gap,
  };
}

interface FinishState {
  running: boolean;
  message: ReactNode | null;
  tone: "ok" | "warn" | "error" | null;
}

// A tile whose (heavy) widget preview is mounted only once it scrolls near the
// viewport. The console renders the real public Renderer of every widget type in
// up to ~2×N-formats copies; mounting them all at once — each with its own
// canvas loops, Realtime channels, maps and fetches — overflowed Android
// WebView memory and killed the page right after the first paint ("this page
// couldn't load", phase 17 bug 3). Lazily revealing tiles keeps only what's
// on/near screen live, so the full page loads even in a constrained WebView.
// Revealed tiles stay mounted so screenshots on "Terminer la session" still work.
// The outer box keeps its fixed size whether or not the preview is mounted, so
// there is zero layout shift and the IntersectionObserver geometry is stable.
function LazyTile({
  className,
  style,
  shotKey,
  children,
}: {
  className: string;
  style: CSSProperties;
  // When set, tags the tile with data-shot-key so finishSession can find its DOM
  // node for a screenshot (desktop tiles only) without sharing a mutable ref map.
  shotKey?: string;
  children: ReactNode;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown || !el) return;
    // No IntersectionObserver (very old WebView / SSR fallback): render eagerly.
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      // Mount a bit before the tile enters view so scrolling stays smooth.
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, shown]);

  return (
    <div ref={setEl} data-shot-key={shotKey} className={className} style={style}>
      {shown ? children : null}
    </div>
  );
}

export default function QaConsole({
  plan,
  previews,
  showAll,
  bp,
}: {
  plan: QaTypeEntry[];
  previews: Record<string, ReactNode>;
  showAll: boolean;
  // The single grid context this session audits (phase 18): mobile 3 col when
  // opened from the app's WebView (?bp=mobile), desktop 9 col on a PC.
  bp: WidgetQaBreakpoint;
}) {
  const router = useRouter();
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [finish, setFinish] = useState<FinishState>({ running: false, message: null, tone: null });

  // Every actionable (to-verify) couple in the plan.
  const actionable = useMemo(
    () =>
      plan.flatMap((t) =>
        t.formats.filter((f) => f.toVerify).map((f) => ({ type: t.type, format: f.format })),
      ),
    [plan],
  );
  const remaining = actionable.filter((a) => !validated[widgetQaKey(a.type, a.format)]).length;

  const toggle = (key: string) =>
    setValidated((v) => ({ ...v, [key]: !v[key] }));

  const setNote = (key: string, text: string) =>
    setNotes((n) => ({ ...n, [key]: text }));

  // Base path of the console within the CURRENT context — every internal link
  // must carry the bp param so a WebView session never falls back to desktop.
  const basePath = `/adminqrcode/test?bp=${bp}`;

  async function reVerify(type: WidgetType) {
    try {
      await reVerifyAction(type, bp);
      router.refresh();
    } catch {
      setFinish({ running: false, tone: "error", message: "Impossible de réinitialiser ce widget." });
    }
  }

  async function finishSession() {
    if (actionable.length === 0) return;
    const flagged = actionable.filter((a) => !validated[widgetQaKey(a.type, a.format)]);
    if (flagged.length > 0) {
      const ok = window.confirm(
        `${flagged.length} tuile(s) non cochée(s) seront marquées « à corriger » (avec note + capture) et remontées dans une issue GitHub. Continuer ?`,
      );
      if (!ok) return;
    }

    setFinish({ running: true, tone: null, message: "Capture des tuiles et enregistrement…" });

    // Capture a screenshot of each flagged tile's desktop render (best-effort).
    const results = [] as {
      type: WidgetType;
      format: string;
      validated: boolean;
      note?: string;
      screenshotDataUrl?: string;
    }[];
    for (const a of actionable) {
      const key = widgetQaKey(a.type, a.format);
      const isValid = Boolean(validated[key]);
      let screenshotDataUrl: string | undefined;
      if (!isValid) {
        // The context's tile is tagged with data-shot-key; a lazily-unrevealed
        // tile simply has no content to shoot (best-effort, as before).
        const node = document.querySelector<HTMLDivElement>(`[data-shot-key="${key}"]`);
        if (node) {
          try {
            screenshotDataUrl = await toPng(node, { cacheBust: true, pixelRatio: 1 });
          } catch {
            /* skip this tile's screenshot */
          }
        }
      }
      results.push({ type: a.type, format: a.format, validated: isValid, note: notes[key], screenshotDataUrl });
    }

    try {
      const res = await fetch("/api/admin/qa-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakpoint: bp, results }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFinish({ running: false, tone: "error", message: data?.error || "Enregistrement impossible." });
        return;
      }
      const parts: string[] = [];
      parts.push(`${data.validated} validé(s), ${data.flagged} à corriger.`);
      if (!data.persisted) parts.push("Table widget_qa absente ou pas à jour : rien n'a été enregistré en base (migrations 0008/0013 à exécuter).");
      if (data.issueSkipped && data.flagged > 0) parts.push("Issue GitHub non créée (GITHUB_TOKEN non configuré ou API indisponible).");
      const tone: FinishState["tone"] = !data.persisted || data.issueSkipped ? "warn" : "ok";
      setFinish({
        running: false,
        tone,
        message: (
          <>
            {parts.join(" ")}{" "}
            {data.issueUrl ? (
              <a href={data.issueUrl} target="_blank" rel="noreferrer" className="qa-link">
                Voir l&apos;issue GitHub ↗
              </a>
            ) : null}
          </>
        ),
      });
      // Refresh so validated couples drop out of the to-verify list.
      router.refresh();
      setValidated({});
      setNotes({});
    } catch {
      setFinish({ running: false, tone: "error", message: "Réseau indisponible." });
    }
  }

  const totalToVerify = actionable.length;

  return (
    <main className={`qa qa--${bp}`}>
      <header className="qa-bar">
        <div className="qa-bar__lead">
          <span className="qa-bar__eyebrow">Console QA · {bp === "mobile" ? "Mobile · 3 col" : "Desktop · 9 col"}</span>
          <h1 className="qa-bar__title">Test des widgets</h1>
        </div>
        <div className="qa-bar__meter" aria-live="polite">
          <span className="qa-bar__count">{remaining}</span>
          <span className="qa-bar__count-label">restant{remaining === 1 ? "" : "s"}</span>
          <span className="qa-bar__sep">/</span>
          <span className="qa-bar__total">{totalToVerify} à vérifier</span>
        </div>
        <div className="qa-bar__actions">
          <Link href={showAll ? basePath : `${basePath}&all=1`} className="admin-btn admin-btn--ghost admin-btn--sm">
            {showAll ? "À vérifier" : "Tout voir"}
          </Link>
          <Link href="/adminqrcode" className="admin-btn admin-btn--ghost admin-btn--sm">
            ← Console
          </Link>
          <button
            className="admin-btn admin-btn--primary"
            onClick={finishSession}
            disabled={finish.running || totalToVerify === 0}
          >
            {finish.running ? "…" : "Terminer la session"}
          </button>
        </div>
      </header>

      {finish.message ? (
        <div className={`qa-flash qa-flash--${finish.tone ?? "ok"}`} role="status">
          {finish.message}
        </div>
      ) : null}

      {plan.length === 0 ? (
        <div className="qa-empty">
          <h2 className="qa-empty__title">Tout est à jour</h2>
          <p className="qa-empty__sub">
            Aucun widget à vérifier dans ce contexte ({bp === "mobile" ? "mobile" : "desktop"}) : chaque type a été validé pour son code actuel.{" "}
            <Link href={`${basePath}&all=1`} className="qa-link">
              Tout revoir
            </Link>
          </p>
        </div>
      ) : (
        <div className="qa-list">
          {plan.map((t) => (
            <section className="qa-type" key={t.type}>
              <div className="qa-type__head">
                <div>
                  <h2 className="qa-type__label">{t.label}</h2>
                  <span className="qa-type__meta">
                    <code className="qa-mono">{t.type}</code>
                    <span className="qa-type__dot">·</span>
                    {t.toVerifyCount > 0 ? `${t.toVerifyCount} format(s) à vérifier` : "à jour"}
                    <span className="qa-type__dot">·</span>
                    <code className="qa-mono qa-hash">{t.hash.slice(0, 8) || "—"}</code>
                  </span>
                </div>
                <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => reVerify(t.type)}>
                  Re-vérifier
                </button>
              </div>

              {previews[t.type] === null ? (
                <p className="qa-type__nosample">
                  Pas d&apos;exemple rendu pour ce type (config d&apos;exemple invalide) — à corriger dans le registre.
                </p>
              ) : null}

              <div className="qa-formats">
                {t.formats.map((f) => {
                  const key = widgetQaKey(t.type, f.format);
                  const isValid = Boolean(validated[key]);
                  const node = previews[t.type];
                  const tileClass = `qa-tile${t.bleed ? " qa-tile--bleed" : ""}`;
                  const cardState = !f.toVerify ? "done" : isValid ? "valid" : "pending";
                  return (
                    <article className={`qa-card qa-card--${cardState}`} key={key}>
                      <div className="qa-card__top">
                        <button
                          type="button"
                          className="qa-check"
                          aria-pressed={isValid}
                          onClick={() => f.toVerify && toggle(key)}
                          disabled={!f.toVerify}
                          title={!f.toVerify ? "Déjà à jour" : isValid ? "Décocher" : "Valider ce format"}
                        >
                          <span className="qa-check__box">{isValid || !f.toVerify ? "✓" : ""}</span>
                          <code className="qa-mono qa-check__fmt">{f.w}×{f.h}</code>
                        </button>
                        {!f.toVerify ? <span className="qa-tag qa-tag--done">à jour</span> : null}
                        {f.status === "issue" && f.toVerify ? <span className="qa-tag qa-tag--issue">signalé</span> : null}
                      </div>

                      <div className="qa-card__views">
                        {/* One context per session (phase 18): the plan only
                            contains formats this breakpoint's grid can hold. */}
                        {bp === "mobile" ? (
                          <figure className="qa-view">
                            <figcaption className="qa-view__cap">Mobile · 3 col</figcaption>
                            <div className="qa-view__frame" style={{ "--wp": `${M.wp}px` } as CSSProperties}>
                              {/* Fluid sizing: qa.css derives the tile box from
                                  the frame width (cqw) using --w/--h, mirroring
                                  the live mobile grid so a w=3 tile fits exactly. */}
                              <LazyTile
                                className={tileClass}
                                style={{ "--w": f.w, "--h": f.h } as CSSProperties}
                                shotKey={key}
                              >
                                {node}
                              </LazyTile>
                            </div>
                          </figure>
                        ) : (
                          <figure className="qa-view">
                            <figcaption className="qa-view__cap">Desktop · 9 col</figcaption>
                            <div className="qa-view__frame" style={{ "--wp": `${D.wp}px` } as CSSProperties}>
                              <LazyTile
                                className={tileClass}
                                style={tileBox(f.w, f.h, D.unit, D.gap)}
                                shotKey={key}
                              >
                                {node}
                              </LazyTile>
                            </div>
                          </figure>
                        )}
                      </div>

                      {f.toVerify && !isValid ? (
                        <textarea
                          className="qa-note"
                          placeholder="Explique le problème avec tes mots (repris dans l'issue)…"
                          value={notes[key] ?? ""}
                          onChange={(e) => setNote(key, e.target.value)}
                          rows={2}
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
