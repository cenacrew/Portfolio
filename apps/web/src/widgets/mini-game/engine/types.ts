// Shared contract between the game engines (Snake / Flappy) and the React modal
// that hosts them. Each engine is framework-agnostic: it owns a canvas, a loop
// and its input, and reports score / phase changes back through callbacks.

export type GamePhase = "ready" | "playing" | "over";

export type Direction = "up" | "down" | "left" | "right";

export interface GameTheme {
  paper: string; // board background
  ink: string; // primary foreground (grid, text)
  accent: string; // the game's signature colour
  danger: string; // hazards / game-over tint
}

export interface GameCallbacks {
  // Called whenever the score changes (new value).
  onScore: (score: number) => void;
  // Called on every phase transition, with the score at that moment.
  onPhase: (phase: GamePhase, score: number) => void;
}

export interface GameHandle {
  // Begin a run from "ready" or restart from "over".
  play: () => void;
  // Primary action (Flappy: flap; also starts a run from ready/over).
  press: () => void;
  // Steer (Snake only; no-op elsewhere).
  setDirection: (dir: Direction) => void;
  // Re-measure the canvas after a layout/resize.
  resize: () => void;
  // Tear down the loop + any owned listeners.
  dispose: () => void;
  readonly phase: GamePhase;
  readonly score: number;
}

export type MountGame = (
  canvas: HTMLCanvasElement,
  theme: GameTheme,
  cb: GameCallbacks,
) => GameHandle;
