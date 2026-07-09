import type { ReactNode } from "react";
import type { z } from "zod";
import type { Widget } from "@portfolio/shared";

// Props every widget Renderer receives. `config` is the already-validated,
// typed config for this widget's type; `widget` is the full row.
export type WidgetRendererProps<TConfig> = {
  config: TConfig;
  widget: Widget<TConfig>;
};

// Renderers may be server components (sync or async — e.g. github-stats,
// weather fetch data server-side) or client components.
export type WidgetRenderer<TConfig> = (
  props: WidgetRendererProps<TConfig>,
) => ReactNode | Promise<ReactNode>;

// Typed shape used when authoring a widget definition. `schema` is kept
// loose (ZodTypeAny) because schemas using `.default()` have a different
// input vs output type, which an invariant `z.ZodType<TConfig>` rejects.
// TConfig is inferred from `defaultConfig` + `Renderer` instead.
export interface WidgetDefinition<TConfig> {
  schema: z.ZodTypeAny;
  defaultConfig: TConfig;
  label: string;
  bleed?: boolean;
  Renderer: WidgetRenderer<TConfig>;
  // Editor?: ComponentType — added in phase 3.
}

// Config-erased entry stored in the registry, so a heterogeneous map of
// widget types shares one value type. Consumers validate `config` with
// `schema` before handing it to `Renderer`.
export interface RegistryEntry {
  schema: z.ZodTypeAny;
  defaultConfig: unknown;
  label: string;
  bleed?: boolean;
  Renderer: WidgetRenderer<unknown>;
}

// Authors a definition with full per-type inference, then erases the config
// generic in a single controlled cast so it can live in the registry map.
export function defineWidget<TConfig>(
  def: WidgetDefinition<TConfig>,
): RegistryEntry {
  return def as unknown as RegistryEntry;
}
