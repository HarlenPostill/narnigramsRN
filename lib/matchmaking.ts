import { supabase } from "./supabase";
import type { PlayerRecord } from "./player-service";

export interface QueuedGame {
  id: number;
  creator_id: number;
  opponent_id: number | null;
  status: "in_queue" | "in_progress" | "finished";
  seed: string | null;
  pool_size: number;
  hand_size: number;
  difficulty: string;
  winner_id: number | null;
  created_at: string;
}

function generateSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Find an open game within ELO range, or create a new queued game.
 * Returns the game row (either joined or created).
 */
export async function findOrCreateGame(
  player: PlayerRecord,
  eloRange = 200,
): Promise<QueuedGame> {
  // 1. Look for an open game within ELO range
  const { data: openGames } = await supabase
    .from("games")
    .select("*, creator:players!games_creator_id_fkey(elo)")
    .eq("status", "in_queue")
    .neq("creator_id", player.id)
    .order("created_at", { ascending: true })
    .limit(10);

  if (openGames && openGames.length > 0) {
    // Filter by ELO range
    const match = openGames.find((g: any) => {
      const creatorElo = g.creator?.elo ?? 800;
      return Math.abs(creatorElo - player.elo) <= eloRange;
    });

    if (match) {
      const seed = generateSeed();

      // Optimistic lock: only update if still in_queue
      const { data: claimed, error } = await supabase
        .from("games")
        .update({
          opponent_id: player.id,
          status: "in_progress",
          seed,
        })
        .eq("id", match.id)
        .eq("status", "in_queue")
        .select()
        .single();

      if (!error && claimed) {
        return claimed as QueuedGame;
      }
      // If claim failed (race condition), fall through to create
    }
  }

  // 2. No match found — create a new queued game
  const { data: created, error } = await supabase
    .from("games")
    .insert({
      creator_id: player.id,
      status: "in_queue",
      pool_size: 72,
      hand_size: 15,
      difficulty: "standard",
    })
    .select()
    .single();

  if (error) throw error;
  return created as QueuedGame;
}

/**
 * Cancel a queued game (only if still in_queue).
 */
export async function cancelQueue(gameId: number): Promise<void> {
  await supabase
    .from("games")
    .delete()
    .eq("id", gameId)
    .eq("status", "in_queue");
}

/**
 * Subscribe to changes on a specific game row.
 * Returns an unsubscribe function.
 */
export function subscribeToGame(
  gameId: number,
  onUpdate: (game: QueuedGame) => void,
): () => void {
  const channel = supabase
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        onUpdate(payload.new as QueuedGame);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
