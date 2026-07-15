// A tiny fixed-timestep game loop shared by the Snake and Flappy engines.
// `step` runs in fixed slices (default 1/60 s) so physics is frame-rate
// independent; `render` runs once per animation frame. Clamps the accumulator
// after a tab switch so the sim never "spirals" trying to catch up.

export interface GameLoop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

export function createLoop(
  step: (dtMs: number) => void,
  render: () => void,
  fixedMs = 1000 / 60,
): GameLoop {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;

  const frame = (t: number) => {
    if (!running) return;
    if (!last) last = t;
    let delta = t - last;
    last = t;
    if (delta > 250) delta = 250;
    acc += delta;
    let guard = 0;
    while (acc >= fixedMs && guard++ < 5) {
      step(fixedMs);
      acc -= fixedMs;
    }
    render();
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}

// Sizes a canvas's backing store to its CSS box at the device pixel ratio and
// returns the logical (CSS-pixel) width/height plus a ready-to-draw 2D context
// scaled so all drawing uses CSS pixels. Call on mount and on resize.
export function fitCanvas(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

// Turns a hex colour (#rgb / #rrggbb) into an rgba() with the given alpha.
// Passes any other format straight through (assumed already alpha-capable).
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1]!;
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Rounded-rect path helper (fill/stroke by the caller).
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
