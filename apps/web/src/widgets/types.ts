import type { ComponentType, ReactNode } from "react";
import type { z } from "zod";
import type { Widget, WidgetSize } from "@portfolio/shared";

// Props every widget Renderer receives. `config` is the already-validated,
// typed config for this widget's type; `widget` is the full row.
export type WidgetRendererProps<TConfig> = {
  config: TConfig;
  widget: Widget<TConfig>;
};

// Renderers may be server components (sync or async — e.g. github-stats,
// weather, guestbook, poll fetch data server-side) or client components.
export type WidgetRenderer<TConfig> = (
  props: WidgetRendererProps<TConfig>,
) => ReactNode | Promise<ReactNode>;

// Props every widget Editor (admin) receives. Controlled: it reports config
// changes upward; the admin validates with `schema` before saving.
export type WidgetEditorProps<TConfig> = {
  config: TConfig;
  onChange: (next: TConfig) => void;
};

export type WidgetEditor<TConfig> = ComponentType<WidgetEditorProps<TConfig>>;

// Client-safe metadata for one widget type (no Renderer — see renderers.tsx).
// Safe to import from client components (admin grid, editors).
export interface WidgetMeta<TConfig> {
  schema: z.ZodTypeAny;
  defaultConfig: TConfig;
  label: string;
  // A short human description shown in the admin "add widget" gallery.
  description?: string;
  // Full-bleed widgets skip the tile padding (maps, embeds, photos).
  bleed?: boolean;
  // Grid sizes the admin offers for this type (declared per widget).
  sizes: readonly WidgetSize[];
  // Admin edit form. Optional (a few widgets have no editable config).
  Editor?: WidgetEditor<TConfig>;
}

// Config-erased entry stored in the registry map.
export interface RegistryEntry {
  schema: z.ZodTypeAny;
  defaultConfig: unknown;
  label: string;
  description?: string;
  bleed?: boolean;
  sizes: readonly WidgetSize[];
  Editor?: WidgetEditor<unknown>;
}

// Authors a meta entry with full per-type inference, then erases the config
// generic in a single controlled cast so it can live in the registry map.
export function defineWidget<TConfig>(meta: WidgetMeta<TConfig>): RegistryEntry {
  return meta as unknown as RegistryEntry;
}
