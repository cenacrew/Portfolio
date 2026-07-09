// Bento grid constants shared across web (and future mobile) apps.
// Desktop = 4 columns, mobile = 3 columns (explicit product decision:
// more freedom than bento.me's 2 columns). Cells are square; row height
// equals column width and the gap is constant.

export const GRID = {
  mobile: { columns: 3 },
  desktop: { columns: 4 },
} as const;

export type Breakpoint = keyof typeof GRID;

export type WidgetSize = { w: number; h: number };

// Universal sizes (phase 4.5): every widget type is offered in all 9 formats,
// and each Renderer adapts its layout per format (no dumb crop). Shared so web
// and mobile propose exactly the same grid. Order = reading order in pickers.
export const UNIVERSAL_SIZES: readonly WidgetSize[] = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 3, h: 1 },
  { w: 3, h: 2 },
  { w: 3, h: 3 },
  { w: 1, h: 3 },
  { w: 2, h: 3 },
] as const;

// Back-compat alias (was the phase-3 resize list). Now the universal set.
export const WIDGET_SIZES = UNIVERSAL_SIZES;
