import { getTopScores, type GameScoreRow } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";
import type { WidgetRendererProps } from "../types";
import type { MiniGameConfig } from "./schema";
import MiniGameTile from "./MiniGameTile";

// Server component: reads the current top scores so the tile shows a populated
// board on first paint. Tolerates the game_scores table not existing yet
// (pre-migration 0010): the board defaults to empty and the tile still renders,
// so /qrcode never breaks before the migration runs.
export default async function MiniGameRenderer({ config, widget }: WidgetRendererProps<MiniGameConfig>) {
  let initialBoard: GameScoreRow[] = [];
  const supabase = getPublicServerSupabase();
  if (supabase) {
    try {
      initialBoard = await getTopScores(supabase, config.game, 3);
    } catch {
      initialBoard = [];
    }
  }

  return (
    <MiniGameTile
      widgetId={widget.id}
      game={config.game}
      title={config.title}
      initialBoard={initialBoard}
    />
  );
}
