"use client";

import {
  GAME_LABELS,
  LEADERBOARD_SIZE,
  sanitizePseudo,
  type GameKey,
  type GameScoreRow,
  getTopScores,
} from "@portfolio/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import GreatModal from "../ui/GreatModal";
import { useRealtimeTable } from "../ui/useRealtimeTable";
import { mountFlappy } from "./engine/flappy";
import { mountSnake } from "./engine/snake";
import type { Direction, GameHandle, GamePhase, GameTheme } from "./engine/types";

// Reads the live palette + dark-mode ink/paper from CSS variables so the game
// canvas matches whatever palette the dashboard is showing.
function readTheme(accent: string): GameTheme {
  const root =
    (typeof document !== "undefined" && document.querySelector<HTMLElement>(".qr-page")) || null;
  const cs = root ? getComputedStyle(root) : null;
  const get = (name: string, fallback: string) => cs?.getPropertyValue(name).trim() || fallback;
  return {
    paper: get("--qr-tile", "#ffffff"),
    ink: get("--qr-ink", "#0d0c62"),
    accent,
    danger: "#e0245e",
  };
}

// A run qualifies for the board when it beats the lowest kept score (or the
// board isn't full yet). Zero never qualifies.
function qualifies(board: GameScoreRow[], score: number): boolean {
  if (score <= 0) return false;
  if (board.length < LEADERBOARD_SIZE) return true;
  return score > board[board.length - 1]!.score;
}

export default function MiniGameModal({
  game,
  accent,
  title,
  onClose,
}: {
  game: GameKey;
  accent: string;
  title: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const boardRef = useRef<GameScoreRow[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const [phase, setPhase] = useState<GamePhase>("ready");
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState<GameScoreRow[]>([]);
  // The just-finished run, set only when it earns a board slot.
  const [pending, setPending] = useState<number | null>(null);
  const [initials, setInitials] = useState("AAA");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBoard = useCallback(async () => {
    const supabase = getBrowserSupabase();
    try {
      const rows = supabase
        ? await getTopScores(supabase, game, LEADERBOARD_SIZE)
        : ((await (await fetch(`/api/scores?game=${game}`)).json())?.board ?? []);
      boardRef.current = rows;
      setBoard(rows);
    } catch {
      /* leave the current board on a transient read error */
    }
  }, [game]);

  // Initial board load (Realtime keeps it fresh below).
  useEffect(() => {
    // Async load that setStates after its await — same idiom as the toile /
    // guestbook modals; the rule can't see past the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshBoard();
  }, [refreshBoard]);

  // Realtime: a score from any browser refreshes the board.
  useRealtimeTable(`scores-${game}`, "game_scores", `game=eq.${game}`, () => void refreshBoard());

  // Mount the engine once, wiring its callbacks to React state.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const theme = readTheme(accent);
    const mount = game === "flappy" ? mountFlappy : mountSnake;
    const handle = mount(canvas, theme, {
      onScore: setScore,
      onPhase: (p, s) => {
        setPhase(p);
        if (p === "over") {
          if (qualifies(boardRef.current, s)) {
            setPending(s);
            setSubmitted(false);
            setError(null);
            setInitials("AAA");
          } else {
            setPending(null);
          }
        }
      },
    });
    handleRef.current = handle;

    const onResize = () => handle.resize();
    window.addEventListener("resize", onResize);
    // Re-measure once after layout settles (modal open animation).
    const raf = requestAnimationFrame(() => handle.resize());
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      handle.dispose();
      handleRef.current = null;
    };
  }, [game, accent]);

  // Keyboard: arrows/WASD steer Snake; space/up/W flap or (re)start. Ignored
  // while typing initials so the entry field owns the keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pending !== null && !submitted) return;
      const h = handleRef.current;
      if (!h) return;
      const k = e.key.toLowerCase();
      const dirs: Record<string, Direction> = {
        arrowup: "up", w: "up",
        arrowdown: "down", s: "down",
        arrowleft: "left", a: "left",
        arrowright: "right", d: "right",
      };
      if (game === "snake" && dirs[k]) {
        e.preventDefault();
        h.setDirection(dirs[k]!);
      } else if (k === " " || k === "spacebar" || (game === "flappy" && (k === "arrowup" || k === "w"))) {
        e.preventDefault();
        h.press();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, pending, submitted]);

  // Pointer: Flappy flaps on tap; Snake reads a swipe direction (and a tap
  // starts a fresh run from ready/over).
  const onPointerDown = (e: React.PointerEvent) => {
    if (pending !== null && !submitted) return;
    const h = handleRef.current;
    if (!h) return;
    if (game === "flappy") {
      h.press();
      return;
    }
    swipe.current = { x: e.clientX, y: e.clientY };
    if (h.phase !== "playing") h.press();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (game !== "snake" || !swipe.current) return;
    const h = handleRef.current;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) h?.setDirection(dx > 0 ? "right" : "left");
    else h?.setDirection(dy > 0 ? "down" : "up");
  };

  const restart = () => {
    setPending(null);
    setError(null);
    handleRef.current?.play();
  };

  const submit = async () => {
    if (pending === null) return;
    const pseudo = sanitizePseudo(initials);
    if (pseudo.length !== 3) {
      setError("Trois lettres, s'il te plaît.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, pseudo, score: pending }),
      });
      const json = (await res.json().catch(() => null)) as
        | { board?: GameScoreRow[]; error?: string }
        | null;
      if (!res.ok) throw new Error(json?.error ?? "Envoi impossible.");
      if (json?.board) {
        boardRef.current = json.board;
        setBoard(json.board);
      } else {
        void refreshBoard();
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const label = title || GAME_LABELS[game];
  const hint =
    game === "snake" ? "Flèches ou glisse pour diriger" : "Espace ou tape pour voler";

  return (
    <GreatModal title={label} onClose={onClose} className="gmodal--game" labelledBy="mg-title">
      <div className="mg" data-game={game} style={{ ["--mg-accent" as string]: accent }}>
        <div className="mg__stage">
          <canvas
            ref={canvasRef}
            className="mg__canvas"
            style={{ touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            aria-label={`${GAME_LABELS[game]} — zone de jeu`}
          />
          {/* Live score HUD */}
          <div className="mg__hud" aria-hidden={phase !== "playing"}>
            <span className="mg__hud-score">{String(score).padStart(3, "0")}</span>
          </div>

          {/* Ready overlay */}
          {phase === "ready" && (
            <div className="mg__overlay">
              <span className="mg__coin">Insert coin</span>
              <button type="button" className="mg__cta" onClick={() => handleRef.current?.press()}>
                Jouer
              </button>
              <span className="mg__hint">{hint}</span>
            </div>
          )}

          {/* Game-over overlay */}
          {phase === "over" && (
            <div className="mg__overlay mg__overlay--over">
              <span className="mg__gameover">Game over</span>
              <span className="mg__final">
                Score <strong>{score}</strong>
              </span>

              {pending !== null && !submitted ? (
                <div className="mg__enter">
                  <span className="mg__enter-label">Nouveau record — tes initiales</span>
                  <ArcadeInitials value={initials} onChange={setInitials} disabled={submitting} />
                  {error && <span className="mg__err">{error}</span>}
                  <button type="button" className="mg__cta" onClick={submit} disabled={submitting}>
                    {submitting ? "Envoi…" : "Valider"}
                  </button>
                </div>
              ) : (
                <>
                  {submitted && <span className="mg__saved">Score enregistré ✦</span>}
                  <button type="button" className="mg__cta" onClick={restart}>
                    Rejouer
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="mg__board" aria-label="Meilleurs scores">
          <h3 id="mg-title" className="mg__board-title">
            High scores
          </h3>
          <ol className="mg__list">
            {board.length === 0 && <li className="mg__empty">Sois le premier à marquer.</li>}
            {board.slice(0, LEADERBOARD_SIZE).map((row, i) => {
              const fresh = submitted && pending !== null && row.score === pending;
              return (
                <li key={row.id} className={`mg__row${fresh ? " is-fresh" : ""}`}>
                  <span className="mg__rank">{i + 1}</span>
                  <span className="mg__pseudo">{row.pseudo}</span>
                  <span className="mg__score">{row.score}</span>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </GreatModal>
  );
}

// Three-slot arcade initials. Type letters on a physical keyboard (auto-advance)
// or tap ▲ / ▼ on each slot. A11y: each slot is a spinbutton-like control.
function ArcadeInitials({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(0);
  const chars = (value + "AAA").slice(0, 3).toUpperCase().split("");

  const setChar = (i: number, c: string) => {
    const next = [...chars];
    next[i] = c;
    onChange(next.join(""));
  };
  const cycle = (i: number, delta: number) => {
    const code = chars[i]!.charCodeAt(0) - 65;
    const n = ((code + delta) % 26 + 26) % 26;
    setChar(i, String.fromCharCode(65 + n));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      setChar(active, k.toUpperCase());
      setActive((a) => Math.min(2, a + 1));
    } else if (k === "ArrowRight") {
      setActive((a) => Math.min(2, a + 1));
    } else if (k === "ArrowLeft" || k === "Backspace") {
      setActive((a) => Math.max(0, a - 1));
    } else if (k === "ArrowUp") {
      e.preventDefault();
      cycle(active, 1);
    } else if (k === "ArrowDown") {
      e.preventDefault();
      cycle(active, -1);
    }
  };

  return (
    <div className="mg__initials" role="group" aria-label="Initiales" tabIndex={0} onKeyDown={onKeyDown}>
      {chars.map((c, i) => (
        <div key={i} className={`mg__slot${active === i ? " is-active" : ""}`}>
          <button
            type="button"
            className="mg__slot-arrow"
            aria-label={`Lettre suivante position ${i + 1}`}
            disabled={disabled}
            onClick={() => {
              setActive(i);
              cycle(i, 1);
            }}
          >
            ▲
          </button>
          <span className="mg__slot-char" aria-hidden>
            {c}
          </span>
          <button
            type="button"
            className="mg__slot-arrow"
            aria-label={`Lettre précédente position ${i + 1}`}
            disabled={disabled}
            onClick={() => {
              setActive(i);
              cycle(i, -1);
            }}
          >
            ▼
          </button>
        </div>
      ))}
    </div>
  );
}
