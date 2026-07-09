import { z } from "zod";
import type { Breakpoint } from "./grid";

// The 15 widget types validated with the user. Adding a new type = add it
// here + create its folder in apps/web/src/widgets + register it.
export const WIDGET_TYPES = [
  "social-link",
  "note",
  "location-map",
  "guestbook",
  "spotify-embed",
  "spotify-now-playing",
  "photo",
  "video",
  "github-stats",
  "status",
  "weather",
  "countdown",
  "watchlist",
  "visitor-counter",
  "poll",
  "free-link",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

// Placement of a widget for one breakpoint, in grid units.
// x / y are 0-based cell coordinates; w / h are spans.
export const widgetLayoutSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
export type WidgetLayout = z.infer<typeof widgetLayoutSchema>;

export const widgetBreakpointLayoutSchema = z.object({
  mobile: widgetLayoutSchema,
  desktop: widgetLayoutSchema,
});
export type WidgetBreakpointLayout = z.infer<typeof widgetBreakpointLayoutSchema>;

// A widget row. This is EXACTLY the shape of the future Supabase `widgets`
// table row (id, type, config, layout, visible, position, created_at) so
// phase 3 only swaps the data source, not the model. `config` is validated
// per-type by the widget's own Zod schema in the registry.
export interface Widget<TConfig = unknown> {
  id: string;
  type: WidgetType;
  config: TConfig;
  layout: WidgetBreakpointLayout;
  visible: boolean;
  position: number;
  createdAt: string;
}

// Envelope schema: validates everything except the per-type `config`,
// which the registry validates with the matching type schema.
export const widgetEnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WIDGET_TYPES),
  config: z.unknown(),
  layout: widgetBreakpointLayoutSchema,
  visible: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
});

export function layoutFor(widget: Widget, bp: Breakpoint): WidgetLayout {
  return widget.layout[bp];
}
