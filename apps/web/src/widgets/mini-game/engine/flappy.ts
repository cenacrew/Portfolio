import { createLoop, fitCanvas, roundRectPath, withAlpha } from "./loop";
import type { GameCallbacks, GameHandle, GamePhase, GameTheme } from "./types";

// Flappy: gravity + a flap impulse, pipes scrolling in from the right. Physics
// runs in fixed 1/60 s slices (frame-rate independent) and every distance/speed
// scales to the canvas height, so it plays identically at any tile/modal size.
// Pure canvas, no dependencies.

interface Pipe {
  x: number; // left edge, in CSS px
  gapY: number; // gap centre, in CSS px
  passed: boolean;
}

// Base tuning, expressed against a 480px-tall reference world; multiplied by
// (height / 480) at runtime so gameplay feels the same on any canvas.
const REF = 480;
const GRAVITY = 1750; // px/s²
const FLAP = 430; // px/s upward impulse
const SPEED = 155; // px/s pipe scroll
const GAP = 165; // vertical gap between pipes
const PIPE_W = 54; // pipe width
const BIRD_R = 13; // bird radius

export function mountFlappy(
  canvas: HTMLCanvasElement,
  initialTheme: GameTheme,
  cb: GameCallbacks,
): GameHandle {
  // Mutable so the palette button / dark-mode toggle can recolour a live game.
  let theme = initialTheme;
  let view = fitCanvas(canvas);
  let scale = view.height / REF;

  let birdY = 0;
  let vy = 0;
  let birdX = 0;
  let pipes: Pipe[] = [];
  let score = 0;
  let phase: GamePhase = "ready";
  let wingT = 0; // wing-flap animation clock
  let groundX = 0; // scrolling ground offset

  const setPhase = (p: GamePhase) => {
    phase = p;
    syncLoop();
    cb.onPhase(p, score);
  };

  // The physics/render loop only needs to run while playing. In ready/over —
  // including the long "enter your initials" pause — one static frame suffices,
  // so stop the rAF loop to spare the battery.
  const syncLoop = () => {
    if (phase === "playing") loop.start();
    else {
      loop.stop();
      render();
    }
  };

  const spacing = () => Math.max(GAP * scale + PIPE_W * scale + 40 * scale, view.width * 0.62);

  const spawnPipe = (x: number) => {
    const margin = GAP * scale * 0.75 + 24 * scale;
    const gapY = margin + Math.random() * (view.height - margin * 2);
    pipes.push({ x, gapY, passed: false });
  };

  const reset = () => {
    scale = view.height / REF;
    birdX = view.width * 0.3;
    birdY = view.height * 0.42;
    vy = 0;
    score = 0;
    cb.onScore(0);
    pipes = [];
    // First pipe starts off-screen so the player gets a moment to react.
    spawnPipe(view.width + 40 * scale);
  };

  const flap = () => {
    vy = -FLAP * scale;
    wingT = 0;
  };

  const die = () => {
    setPhase("over");
  };

  const step = (dtMs: number) => {
    const dt = dtMs / 1000;
    wingT += dtMs;
    groundX = (groundX - SPEED * scale * dt) % (28 * scale);

    if (phase !== "playing") return;

    vy += GRAVITY * scale * dt;
    birdY += vy * dt;

    // Ceiling / ground.
    if (birdY < BIRD_R * scale) {
      birdY = BIRD_R * scale;
      vy = 0;
    }
    const groundY = view.height - 18 * scale;
    if (birdY + BIRD_R * scale >= groundY) {
      birdY = groundY - BIRD_R * scale;
      die();
      return;
    }

    // Move pipes, score, cull.
    const dx = SPEED * scale * dt;
    for (const p of pipes) {
      p.x -= dx;
      if (!p.passed && p.x + PIPE_W * scale < birdX) {
        p.passed = true;
        score += 1;
        cb.onScore(score);
      }
    }
    pipes = pipes.filter((p) => p.x + PIPE_W * scale > -4);

    // Spawn the next pipe once the last one has advanced far enough.
    const last = pipes[pipes.length - 1];
    if (!last || view.width - last.x >= spacing()) {
      spawnPipe(view.width + 4 * scale);
    }

    // Collision with pipes.
    const r = BIRD_R * scale;
    const gap = GAP * scale;
    const pw = PIPE_W * scale;
    for (const p of pipes) {
      const withinX = birdX + r > p.x && birdX - r < p.x + pw;
      if (!withinX) continue;
      const topH = p.gapY - gap / 2;
      const botY = p.gapY + gap / 2;
      if (birdY - r < topH || birdY + r > botY) {
        die();
        return;
      }
    }
  };

  const render = () => {
    const { ctx, width, height } = view;
    const s = scale;

    // Sky gradient (accent-tinted, theme-aware via the paper base).
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, withAlpha(theme.accent, 0.16));
    sky.addColorStop(1, theme.paper);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Pipes.
    const gap = GAP * s;
    const pw = PIPE_W * s;
    const groundY = height - 18 * s;
    for (const p of pipes) {
      const topH = p.gapY - gap / 2;
      const botY = p.gapY + gap / 2;
      ctx.fillStyle = theme.accent;
      roundRectPath(ctx, p.x, 0, pw, topH, 7 * s);
      ctx.fill();
      roundRectPath(ctx, p.x, botY, pw, groundY - botY, 7 * s);
      ctx.fill();
      // Lip highlights.
      ctx.fillStyle = withAlpha(theme.ink, 0.14);
      roundRectPath(ctx, p.x - 2 * s, topH - 12 * s, pw + 4 * s, 12 * s, 5 * s);
      ctx.fill();
      roundRectPath(ctx, p.x - 2 * s, botY, pw + 4 * s, 12 * s, 5 * s);
      ctx.fill();
    }

    // Ground strip with a scrolling dashed line.
    ctx.fillStyle = withAlpha(theme.ink, 0.9);
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = withAlpha(theme.paper, 0.5);
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    for (let x = groundX; x < width; x += 28 * s) {
      ctx.moveTo(x, groundY + 9 * s);
      ctx.lineTo(x + 14 * s, groundY + 9 * s);
    }
    ctx.stroke();

    // Bird — a rounded body, animated wing, eye and beak.
    const r = BIRD_R * s;
    const tilt = Math.max(-0.5, Math.min(1.1, (vy / (FLAP * s)) * 0.9));
    ctx.save();
    ctx.translate(birdX, birdY);
    ctx.rotate(tilt);
    ctx.fillStyle = theme.ink;
    roundRectPath(ctx, -r, -r * 0.85, r * 2, r * 1.7, r * 0.7);
    ctx.fill();
    // Wing (flaps for a beat after each press).
    const wing = Math.sin(Math.min(wingT, 220) / 220 * Math.PI);
    ctx.fillStyle = withAlpha(theme.paper, 0.85);
    roundRectPath(ctx, -r * 0.3, -r * 0.1 - wing * r * 0.4, r * 0.9, r * 0.55, r * 0.25);
    ctx.fill();
    // Beak.
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.1);
    ctx.lineTo(r * 1.35, r * 0.12);
    ctx.lineTo(r * 0.7, r * 0.35);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = theme.paper;
    ctx.beginPath();
    ctx.arc(r * 0.28, -r * 0.32, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.arc(r * 0.36, -r * 0.32, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const play = () => {
    reset();
    setPhase("playing");
    flap();
  };

  const press = () => {
    if (phase === "playing") {
      flap();
      return;
    }
    play();
  };

  const resize = () => {
    const prevRatioY = view.height ? birdY / view.height : 0.42;
    view = fitCanvas(canvas);
    scale = view.height / REF;
    birdY = prevRatioY * view.height;
    birdX = view.width * 0.3;
    // Repaint immediately when idle (the loop isn't running to do it for us).
    if (!loop.running) render();
  };

  const setTheme = (next: GameTheme) => {
    theme = next;
    // Repaint immediately when idle; the running loop repaints itself.
    if (!loop.running) render();
  };

  reset();
  const loop = createLoop(step, render);
  // Start in "ready": paint one static frame, no rAF until play begins.
  syncLoop();

  return {
    play,
    press,
    // Steering is a no-op for Flappy; the modal maps space/tap/up to `press`.
    setDirection: () => {},
    resize,
    setTheme,
    dispose: () => loop.stop(),
    get phase() {
      return phase;
    },
    get score() {
      return score;
    },
  };
}
