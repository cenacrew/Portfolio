// QA detection (phase 9 A): reconciles the build-time widget-code hashes
// (qa-manifest.json) with the human-validated hashes stored in the widget_qa
// table to decide which (type, format) couples are "to verify".
//
// A couple is to-verify when its stored validated_hash is absent or differs
// from the type's current code hash. Client-safe (no server-only imports) so
// both the server page and the client board can share the format helpers.
import type { WidgetQaRow, WidgetSize, WidgetType } from "@portfolio/shared";
import { ALL_SIZES, widgetQaKey } from "@portfolio/shared";
import { registry } from "./registry";
import manifest from "./qa-manifest.json";

const HASHES: Record<string, string> = manifest.hashes ?? {};

// Current widget-code hash for a type (empty string if the manifest predates
// the type — treated as "always to verify").
export function currentHash(type: string): string {
  return HASHES[type] ?? "";
}

// Grid format as "WxH" — the second half of the widget_qa primary key.
export function formatOf(size: WidgetSize): string {
  return `${size.w}x${size.h}`;
}

export interface QaFormatEntry {
  format: string;
  w: number;
  h: number;
  toVerify: boolean;
  status: WidgetQaRow["status"] | "unseen";
  note: string;
}

export interface QaTypeEntry {
  type: WidgetType;
  label: string;
  bleed: boolean;
  hash: string;
  formats: QaFormatEntry[];
  toVerifyCount: number;
}

// Builds the full QA plan from the stored rows. `onlyToVerify` keeps only types
// that have at least one format to verify (the console's default view).
export function buildQaPlan(
  qaMap: Record<string, WidgetQaRow>,
  onlyToVerify = true,
): QaTypeEntry[] {
  const out: QaTypeEntry[] = [];
  for (const type of Object.keys(registry) as WidgetType[]) {
    const def = registry[type];
    const hash = currentHash(type);
    const sizes: readonly WidgetSize[] = def.sizes.length ? def.sizes : ALL_SIZES;
    const formats: QaFormatEntry[] = sizes.map((size) => {
      const format = formatOf(size);
      const row = qaMap[widgetQaKey(type, format)];
      const validated = row?.validated_hash ?? null;
      const toVerify = validated == null || validated !== hash;
      return {
        format,
        w: size.w,
        h: size.h,
        toVerify,
        status: row ? row.status : "unseen",
        note: row?.note ?? "",
      };
    });
    const toVerifyCount = formats.filter((f) => f.toVerify).length;
    if (onlyToVerify && toVerifyCount === 0) continue;
    out.push({
      type,
      label: def.label,
      bleed: Boolean(def.bleed),
      hash,
      formats,
      toVerifyCount,
    });
  }
  return out;
}

// Total (type, format) couples left to verify across the plan.
export function totalToVerify(plan: QaTypeEntry[]): number {
  return plan.reduce((n, t) => n + t.toVerifyCount, 0);
}
