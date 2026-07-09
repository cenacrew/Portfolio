import type { Widget } from "@portfolio/shared";
import { widgets } from "@/config/widgets.config";
import { registry } from "./registry";

// Returns visible widgets, sorted by position, with each config validated
// (and defaults applied) by its type schema. A bad config throws at build /
// request time — exactly what we want. Phase 3 swaps `widgets` for a DB read.
export function loadWidgets(): Widget[] {
  return widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.position - b.position)
    .map((w) => ({ ...w, config: registry[w.type].schema.parse(w.config) }));
}
