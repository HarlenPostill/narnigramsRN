import { supabase } from "@/lib/supabase";
import type { OnlineGameState } from "@/types/game";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "./use-game";

interface GameEvent {
  id: number;
  game_id: number;
  player_id: number;
  event_type: "peel" | "finish" | "forfeit" | "heartbeat";
  payload: Record<string, unknown>;
  created_at: string;
}

const HEARTBEAT_INTERVAL = 10_000; // 10s
const DISCONNECT_THRESHOLD = 30_000; // 30s
const AUTO_WIN_THRESHOLD = 60_000; // 60s

export function useOnlineGame(onlineState: OnlineGameState) {
  const game = useGame();
  const didInit = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastOpponentHeartbeat = useRef(Date.now());
  const [opponentConnected, setOpponentConnected] = useState(true);

  // Init the game from seed on mount
  useEffect(() => {
    if (didInit.current || !onlineState.seed) return;
    didInit.current = true;

    game.startOnlineGame(
      onlineState.seed,
      onlineState.playerIndex,
      72,
      15,
      "standard",
    );
  }, [onlineState, game]);

  // Subscribe to game events
  useEffect(() => {
    if (!onlineState.gameId) return;

    const channel = supabase
      .channel(`game-events-${onlineState.gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_events",
          filter: `game_id=eq.${onlineState.gameId}`,
        },
        (payload) => {
          const event = payload.new as GameEvent;

          // Only process events from the opponent (ignore our own)
          if (event.player_id !== onlineState.localPlayerId) {
            lastOpponentHeartbeat.current = Date.now();
            setOpponentConnected(true);

            switch (event.event_type) {
              case "peel":
                game.remotePeel();
                break;
              case "finish":
                game.endGame(false);
                break;
              case "forfeit":
                game.endGame(true);
                break;
              case "heartbeat":
                // Just updates the timestamp above
                break;
            }
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onlineState.gameId, onlineState.localPlayerId, game]);

  // Send heartbeats
  useEffect(() => {
    if (!onlineState.gameId || !onlineState.localPlayerId) return;

    const interval = setInterval(() => {
      supabase.from("game_events").insert({
        game_id: onlineState.gameId,
        player_id: onlineState.localPlayerId,
        event_type: "heartbeat",
        payload: {},
      });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [onlineState.gameId, onlineState.localPlayerId]);

  // Check opponent connectivity
  useEffect(() => {
    if (!onlineState.gameId) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastOpponentHeartbeat.current;

      if (elapsed > AUTO_WIN_THRESHOLD && !game.state.isComplete) {
        // Auto-win: opponent disconnected too long
        game.endGame(true);
        setOpponentConnected(false);
      } else if (elapsed > DISCONNECT_THRESHOLD) {
        setOpponentConnected(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onlineState.gameId, game]);

  const localPlayerId = onlineState.localPlayerId;

  // Broadcast a peel event
  const onlinePeel = useCallback(() => {
    game.peel();

    supabase.from("game_events").insert({
      game_id: onlineState.gameId,
      player_id: localPlayerId,
      event_type: "peel",
      payload: {},
    });
  }, [game, onlineState.gameId, localPlayerId]);

  // Broadcast a finish event
  const onlineFinish = useCallback(async () => {
    game.endGame(true);

    await supabase.from("game_events").insert({
      game_id: onlineState.gameId,
      player_id: localPlayerId,
      event_type: "finish",
      payload: {},
    });

    await supabase.rpc("finish_game", {
      p_game_id: onlineState.gameId,
      p_winner_id: localPlayerId,
    });
  }, [game, onlineState.gameId, localPlayerId]);

  // Broadcast a forfeit event
  const onlineForfeit = useCallback(async () => {
    game.endGame(false);

    await supabase.from("game_events").insert({
      game_id: onlineState.gameId,
      player_id: localPlayerId,
      event_type: "forfeit",
      payload: {},
    });
  }, [game, onlineState.gameId, localPlayerId]);

  return {
    ...game,
    peel: onlinePeel,
    onlineFinish,
    onlineForfeit,
    opponentConnected,
  };
}
