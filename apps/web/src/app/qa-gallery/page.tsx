import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Widget, WidgetType } from "@portfolio/shared";
import { ALL_SIZES } from "@portfolio/shared";
import { registry, getSampleConfig } from "@/widgets/registry";
import { renderers } from "@/widgets/renderers";
import "../qrcode/qrcode.css";
import "../adminqrcode/test/qa.css";

// -------------------------------------------------------------------------
// QA screenshot gallery (phase 10, point 4).
//
// Renders EVERY widget type in EVERY format at both breakpoints using the real
// public Renderers + the registry sample configs — the same tiles the auth-only
// /adminqrcode/test console audits, but as a flat, unauthenticated page a
// Playwright job can screenshot in CI.
//
// SECURITY: this page must NEVER exist as an unauthenticated surface in prod.
// It is double-gated:
//   1. QA_SCREENSHOT_MODE must equal "1" (set only by the CI screenshot job /
//      an explicit local run — never in the Vercel project env), AND
//   2. VERCEL_ENV must not be "production" (so even a leaked flag can't expose
//      it on the production deployment behind cenacrew.com).
// When either check fails the route 404s exactly like any unknown path.
// `force-dynamic` guarantees the gate is evaluated per request at runtime.
// -------------------------------------------------------------------------
export const dynamic = "force-dynamic";

function galleryEnabled(): boolean {
  return process.env.QA_SCREENSHOT_MODE === "1" && process.env.VERCEL_ENV !== "production";
}

// Grid geometry mirrored from the public board (qrcode.css) and the QA console,
// so each tile is captured at its true public pixel size.
const M = { cols: 3, gap: 10, pad: 16, wp: 13, viewport: 390 };
const D = { unit: 136, gap: 12, wp: 15 };
const M_UNIT = (M.viewport - 2 * M.pad - (M.cols - 1) * M.gap) / M.cols; // ≈ 112.7

function tileBox(w: number, h: number, unit: number, gap: number): CSSProperties {
  return { width: w * unit + (w - 1) * gap, height: h * unit + (h - 1) * gap };
}

function sampleWidget(type: WidgetType, config: unknown): Widget {
  const size = registry[type].defaultSize ?? { w: 2, h: 2 };
  const layout = { x: 0, y: 0, w: size.w, h: size.h };
  return {
    id: `qa-${type}`,
    type,
    config,
    layout: { mobile: layout, desktop: layout },
    visible: true,
    position: 0,
    createdAt: "",
  };
}

export default function QaGalleryPage() {
  if (!galleryEnabled()) notFound();

  const types = Object.keys(registry) as WidgetType[];

  // The node shown for a type whose sample config its own schema rejects (e.g.
  // `video`, whose default is the intentional "not yet configured" placeholder).
  // Rendering it as a real tile means every type still gets a screenshot.
  const placeholder = (
    <div style={{ display: "grid", placeItems: "center", height: "100%", opacity: 0.55, fontSize: 12, textAlign: "center", padding: 8 }}>
      à configurer
    </div>
  );

  // One rendered Renderer per type, reused across every format tile (container
  // queries make each copy adapt to its tile size, exactly as on the live page).
  const previews: Record<string, ReactNode> = {};
  for (const type of types) {
    const parsed = registry[type].schema.safeParse(getSampleConfig(type));
    if (!parsed.success) {
      previews[type] = placeholder;
      continue;
    }
    const Renderer = renderers[type];
    previews[type] = <Renderer config={parsed.data} widget={sampleWidget(type, parsed.data)} />;
  }

  return (
    <main className="qr-page qa-gallery" data-qa-gallery>
      <h1 style={{ fontSize: 18, padding: "16px 0" }}>QA gallery — every widget × format × breakpoint</h1>
      {types.map((type) => {
        const def = registry[type];
        const node = previews[type];
        const sizes = def.sizes.length ? def.sizes : ALL_SIZES;
        const tileClass = `qa-tile${def.bleed ? " qa-tile--bleed" : ""}`;
        return (
          <section key={type} data-qa-type={type} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, margin: "12px 0 8px" }}>
              {def.label} <code style={{ opacity: 0.6 }}>({type})</code>
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
                {sizes.map((s) => {
                  const format = `${s.w}x${s.h}`;
                  return (
                    <div key={format} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {s.w <= M.cols ? (
                        <div className="qa-view__frame" style={{ "--wp": `${M.wp}px` } as CSSProperties}>
                          <div
                            className={tileClass}
                            data-qa-tile
                            data-qa-type={type}
                            data-qa-format={format}
                            data-qa-bp="mobile"
                            style={tileBox(s.w, s.h, M_UNIT, M.gap)}
                          >
                            {node}
                          </div>
                        </div>
                      ) : null}
                      <div className="qa-view__frame" style={{ "--wp": `${D.wp}px` } as CSSProperties}>
                        <div
                          className={tileClass}
                          data-qa-tile
                          data-qa-type={type}
                          data-qa-format={format}
                          data-qa-bp="desktop"
                          style={tileBox(s.w, s.h, D.unit, D.gap)}
                        >
                          {node}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
