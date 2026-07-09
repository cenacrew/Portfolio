// Bento grid constants shared across web (and future mobile) apps.
// Desktop = 4 columns, mobile = 3 columns (explicit product decision:
// more freedom than bento.me's 2 columns). Cells are square; row height
// equals column width and the gap is constant.

export const GRID = {
  mobile: { columns: 3 },
  desktop: { columns: 4 },
} as const;

export type Breakpoint = keyof typeof GRID;

// Sizes a widget type may declare (in grid units). Used by the phase-3
// admin to offer resize options; kept here so web and mobile agree.
export const WIDGET_SIZES = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 3, h: 1 },
  { w: 3, h: 2 },
  { w: 2, h: 3 },
  { w: 4, h: 2 },
] as const;

export type WidgetSize = { w: number; h: number };
