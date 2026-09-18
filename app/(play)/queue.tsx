import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import {
  cancelQueue,
  findOrCreateGame,
  subscribeToGame,
  type QueuedGame,
} from "@/lib/matchmaking";
import { getPlayer } from "@/lib/player-service";
import type { OnlineGameState, Player } from "@/types/game";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { player } = useAuth();

  const [status, setStatus] = useState<"searching" | "found" | "error">(
    "searching",
  );
  const [elapsedSec, setElapsedSec] = useState(0);
  const gameRef = useRef<QueuedGame | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const handleMatchFound = useCallback(
    async (game: QueuedGame) => {
      if (!player) return;
      setStatus("found");

      const isCreator = game.creator_id === player.id;
      const opponentId = isCreator ? game.opponent_id! : game.creator_id;

      let opponent: Player;
      try {
        const opponentRecord = await getPlayer(opponentId);
        opponent = {
          id: opponentRecord.id,
          uuid: opponentRecord.uuid,
          username: opponentRecord.username,
          elo: opponentRecord.elo,
        };
      } catch {
        opponent = { id: opponentId, uuid: "", username: "Opponent", elo: 800 };
      }

      const onlineState: OnlineGameState = {
        gameId: game.id,
        seed: game.seed!,
        localPlayerId: player.id,
        playerIndex: isCreator ? 0 : 1,
        opponent,
        opponentConnected: true,
      };

      // Navigate to game with online state
      router.replace({
        pathname: "/game",
        params: {
          online: "true",
          onlineState: JSON.stringify(onlineState),
        },
      });
    },
    [player, router],
  );

  useEffect(() => {
    if (!player) return;

    let cancelled = false;

    const startQueue = async () => {
      try {
        const game = await findOrCreateGame(player);
        if (cancelled) return;
        gameRef.current = game;

        // If already matched (we joined someone else's game)
        if (game.status === "in_progress") {
          handleMatchFound(game);
          return;
        }

        // Subscribe to our queued game for updates
        unsubRef.current = subscribeToGame(game.id, (updated) => {
          if (updated.status === "in_progress") {
            handleMatchFound(updated);
          }
        });
      } catch (err) {
        console.warn("Matchmaking error:", err);
        if (!cancelled) setStatus("error");
      }
    };

    startQueue();

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, [player, handleMatchFound]);

  // Elapsed time counter
  useEffect(() => {
    if (status !== "searching") return;
    const interval = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleCancel = async () => {
    unsubRef.current?.();
    if (gameRef.current) {
      await cancelQueue(gameRef.current.id);
    }
    router.back();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.screenBg,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: insets.bottom,
        gap: 24,
      }}
    >
      {status === "searching" && (
        <>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Finding opponent...
          </Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            {formatTime(elapsedSec)}
          </Text>
          <Pressable
            onPress={handleCancel}
            style={{
              marginTop: 32,
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: colors.cardBg,
              boxShadow: colors.cardShadow,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#FF3B30",
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </>
      )}

      {status === "found" && (
        <>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Match found!
          </Text>
          <ActivityIndicator size="small" color="#34C759" />
        </>
      )}

      {status === "error" && (
        <>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Something went wrong
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: "#007AFF",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 17 }}>
              Go Back
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
