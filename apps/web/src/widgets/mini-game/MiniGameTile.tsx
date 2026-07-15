"use client";

import { GAME_ACCENTS, GAME_LABELS, getTopScores, type GameKey, type GameScoreRow } from "@portfolio/shared";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { MiniGameConfig } from "./schema";
import MiniGameModal from "./MiniGameModal";

// Public arcade tile: a retro preview of the game + the top-3 board, adaptive to
// any tile format via container queries. Tapping opens the playable modal. The
// board updates live (Realtime) when anyone posts a score. Degrades to an empty
// board (with a "be the first" invite) when Supabase / the table isn't there.
export default function MiniGameTile({
  widgetId,
  game,
  title,
  initialBoard,
}: {
  widgetId: string;
  game: MiniGameConfig["game"];
  title?: string;
  initialBoard: GameScoreRow[];
}) {
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState<GameScoreRow[]>(initialBoard);
  const accent = GAME_ACCENTS[game];
  const label = title || GAME_LABELS[game];

  // Live top-3: refresh whenever a score for this game changes anywhere.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const refresh = async () => {
      try {
        setBoard(await getTopScores(supabase, game, 3));
      } catch {
        /* keep current board on a transient error */
      }
    };
    const channel = supabase
      .channel(`scores-tile-${widgetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_scores", filter: `game=eq.${game}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [widgetId, game]);

  return (
    <>
      <button
        type="button"
        className="w-mg"
        data-game={game}
        style={{ ["--mg-accent" as string]: accent }}
        onClick={() => setOpen(true)}
        aria-label={`${label} — jouer`}
      >
        <div className="w-mg__head">
          <span className="w-mg__badge" aria-hidden>
            {game === "snake" ? "◆" : "▲"}
          </span>
          <span className="w-mg__title">{label}</span>
          <span className="w-mg__play" aria-hidden>
            Jouer ▸
          </span>
        </div>

        <div className="w-mg__scene" aria-hidden>
          {game === "snake" ? <SnakeScene /> : <FlappyScene />}
          <span className="w-mg__coin">Insert coin</span>
        </div>

        <ol className="w-mg__board">
          {board.length === 0 ? (
            <li className="w-mg__empty">Premier score à battre</li>
          ) : (
            board.slice(0, 3).map((row, i) => (
              <li key={row.id} className="w-mg__row">
                <span className="w-mg__rank">{i + 1}</span>
                <span className="w-mg__pseudo">{row.pseudo}</span>
                <span className="w-mg__pts">{row.score}</span>
              </li>
            ))
          )}
        </ol>
      </button>

      {open && (
        <MiniGameModal
          game={game as GameKey}
          accent={accent}
          title={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Tiny CSS-driven pixel scenes. No canvas here (many tiles on a board), just a
// cheap, GPU-friendly animated motif. Motion is disabled under prefers-reduced.
function SnakeScene() {
  return (
    <div className="w-mg__pix w-mg__pix--snake">
      <span className="w-mg__seg" style={{ ["--i" as string]: 0 }} />
      <span className="w-mg__seg" style={{ ["--i" as string]: 1 }} />
      <span className="w-mg__seg" style={{ ["--i" as string]: 2 }} />
      <span className="w-mg__apple" />
    </div>
  );
}

function FlappyScene() {
  return (
    <div className="w-mg__pix w-mg__pix--flappy">
      <span className="w-mg__pipe w-mg__pipe--a" />
      <span className="w-mg__pipe w-mg__pipe--b" />
      <span className="w-mg__bird" />
    </div>
  );
}
