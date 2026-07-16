import { createLoop, fitCanvas, roundRectPath, withAlpha } from "./loop";
import type { Direction, GameCallbacks, GameHandle, GamePhase, GameTheme } from "./types";

// Grid-stepped Snake. The render loop runs at 60fps (for the pulsing apple and
// crisp redraws) while the snake advances one cell every `interval` ms, speeding
// up slightly per apple down to a floor. Pure canvas, no dependencies.

const COLS = 17;
const ROWS = 17;
const START_INTERVAL = 150; // ms per cell at the start
const MIN_INTERVAL = 78; // fastest it ever gets
const SPEEDUP = 4; // ms shaved per apple

type Cell = { x: number; y: number };

const DELTAS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function mountSnake(
  canvas: HTMLCanvasElement,
  theme: GameTheme,
  cb: GameCallbacks,
): GameHandle {
  let snake: Cell[] = [];
  let dir: Direction = "right";
  // Buffer up to two queued turns so quick double-taps register in order.
  let queue: Direction[] = [];
  let apple: Cell = { x: 0, y: 0 };
  let interval = START_INTERVAL;
  let sinceMove = 0;
  let score = 0;
  let phase: GamePhase = "ready";
  let blink = 0;

  let view = fitCanvas(canvas);

  const setPhase = (p: GamePhase) => {
    phase = p;
    syncLoop();
    cb.onPhase(p, score);
  };

  // The 60fps rAF loop only needs to run while playing (moving snake + pulsing
  // apple). In ready/over — including the long "enter your initials" pause — a
  // single static frame is enough, so stop the loop to spare the battery.
  const syncLoop = () => {
    if (phase === "playing") loop.start();
    else {
      loop.stop();
      render();
    }
  };

  const randomApple = () => {
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    apple = free.length ? free[(Math.random() * free.length) | 0]! : { x: 0, y: 0 };
  };

  const reset = () => {
    const cy = (ROWS / 2) | 0;
    snake = [
      { x: 5, y: cy },
      { x: 4, y: cy },
      { x: 3, y: cy },
    ];
    dir = "right";
    queue = [];
    interval = START_INTERVAL;
    sinceMove = 0;
    score = 0;
    cb.onScore(0);
    randomApple();
  };

  const advance = () => {
    if (queue.length) {
      const next = queue.shift()!;
      if (next !== OPPOSITE[dir]) dir = next;
    }
    const d = DELTAS[dir];
    const head = { x: snake[0]!.x + d.x, y: snake[0]!.y + d.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      setPhase("over");
      return;
    }

    snake.unshift(head);
    if (head.x === apple.x && head.y === apple.y) {
      score += 1;
      cb.onScore(score);
      interval = Math.max(MIN_INTERVAL, interval - SPEEDUP);
      randomApple();
    } else {
      snake.pop();
    }
  };

  const step = (dt: number) => {
    blink += dt;
    if (phase !== "playing") return;
    sinceMove += dt;
    while (sinceMove >= interval && phase === "playing") {
      sinceMove -= interval;
      advance();
    }
  };

  const render = () => {
    const { ctx, width, height } = view;
    // Square play-field centred in the canvas.
    const size = Math.min(width, height);
    const cell = Math.floor(size / COLS);
    const board = cell * COLS;
    const ox = Math.floor((width - board) / 2);
    const oy = Math.floor((height - board) / 2);

    ctx.clearRect(0, 0, width, height);
    // Board.
    ctx.fillStyle = theme.paper;
    roundRectPath(ctx, ox, oy, board, board, 10);
    ctx.fill();

    // Faint grid.
    ctx.strokeStyle = withAlpha(theme.ink, 0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
      ctx.moveTo(ox + i * cell + 0.5, oy);
      ctx.lineTo(ox + i * cell + 0.5, oy + board);
      ctx.moveTo(ox, oy + i * cell + 0.5);
      ctx.lineTo(ox + board, oy + i * cell + 0.5);
    }
    ctx.stroke();

    // Apple — a rounded pip that gently pulses.
    const pulse = 0.5 + 0.5 * Math.sin(blink / 260);
    const pad = cell * (0.16 + 0.06 * pulse);
    ctx.fillStyle = theme.danger;
    roundRectPath(ctx, ox + apple.x * cell + pad, oy + apple.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.32);
    ctx.fill();

    // Snake — accent body, brighter head, rounded segments.
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i]!;
      const head = i === 0;
      const gap = head ? cell * 0.1 : cell * 0.16;
      ctx.fillStyle = head ? theme.ink : theme.accent;
      roundRectPath(ctx, ox + s.x * cell + gap, oy + s.y * cell + gap, cell - gap * 2, cell - gap * 2, cell * 0.3);
      ctx.fill();
    }
    // Eye on the head so direction reads at a glance.
    if (snake.length) {
      const h = snake[0]!;
      const d = DELTAS[dir];
      const cx = ox + h.x * cell + cell / 2 + d.x * cell * 0.18;
      const cy = oy + h.y * cell + cell / 2 + d.y * cell * 0.18;
      ctx.fillStyle = theme.paper;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.4, cell * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const setDirection = (next: Direction) => {
    if (phase === "ready") setPhase("playing");
    if (phase !== "playing") return;
    const base = queue.length ? queue[queue.length - 1]! : dir;
    if (next !== base && next !== OPPOSITE[base]) {
      if (queue.length < 2) queue.push(next);
    }
  };

  const play = () => {
    reset();
    setPhase("playing");
  };

  const press = () => {
    if (phase === "playing") return;
    play();
  };

  const resize = () => {
    view = fitCanvas(canvas);
    // Repaint immediately when idle (the loop isn't running to do it for us).
    if (!loop.running) render();
  };

  reset();
  const loop = createLoop(step, render);
  // Start in "ready": paint one static frame, no rAF until play begins.
  syncLoop();

  return {
    play,
    press,
    setDirection,
    resize,
    dispose: () => loop.stop(),
    get phase() {
      return phase;
    },
    get score() {
      return score;
    },
  };
}
