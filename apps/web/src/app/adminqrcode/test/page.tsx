import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { Widget, WidgetQaRow, WidgetType } from "@portfolio/shared";
import { getWidgetQaMap } from "@portfolio/shared";
import { registry, getSampleConfig } from "@/widgets/registry";
import { renderers } from "@/widgets/renderers";
import { buildQaPlan } from "@/widgets/qa";
import { getServerSupabase } from "@/lib/supabase/server";
import QaConsole from "./QaConsole";
import "./qa.css";

export const dynamic = "force-dynamic";

// A synthetic widget so the real public Renderer has a full row to render from.
// Its id is stable per type (poll votes / toile canvas resolve to an empty
// state, which is what a sample tile should show).
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

// QA console (phase 9 B): renders the real public Renderer of every widget type
// flagged "to verify" (its code changed since the last human validation) in
// mobile + desktop grid contexts, lets the admin tick the good ones and annotate
// the rest, then persists the outcome + opens a GitHub issue.
//
// Same admin auth as /adminqrcode. Tolerates the widget_qa table not existing
// yet (pre-migration): everything simply shows as "to verify".
export default async function QaTestPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const showAll = all === "1";

  const supabase = await getServerSupabase();
  if (!supabase) {
    return (
      <main className="qa-empty">
        <h1 className="qa-empty__title">Console non configurée</h1>
        <p className="qa-empty__sub">Supabase n&apos;est pas configuré : le test des widgets est indisponible.</p>
      </main>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/adminqrcode/login");

  let qaMap: Record<string, WidgetQaRow> = {};
  try {
    qaMap = await getWidgetQaMap(supabase);
  } catch {
    qaMap = {};
  }

  const plan = buildQaPlan(qaMap, !showAll);

  // Pre-render each type's Renderer once (server-side, so data-fetching widgets
  // fetch once); the client board reuses the node across every format tile and
  // both contexts — container queries make each copy adapt to its tile size.
  const previews: Record<string, ReactNode> = {};
  for (const entry of plan) {
    const type = entry.type;
    const parsed = registry[type].schema.safeParse(getSampleConfig(type));
    if (!parsed.success) {
      previews[type] = null;
      continue;
    }
    const Renderer = renderers[type];
    const widget = sampleWidget(type, parsed.data);
    previews[type] = <Renderer config={parsed.data} widget={widget} />;
  }

  return <QaConsole plan={plan} previews={previews} showAll={showAll} />;
}
