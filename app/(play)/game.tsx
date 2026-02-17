import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  PlatformColor,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GameBoard, GRID_COUNT } from "@/components/game/game-board";
import { GameHeader } from "@/components/game/game-header";
import { PlayerHand } from "@/components/game/player-hand";
import { CELL_SIZE } from "@/components/game/tile";
import { BIN_SIZE, TileBin } from "@/components/game/tile-bin";
import { useGame } from "@/hooks/use-game";
import { useStorage } from "@/hooks/use-storage";
import { formatTime, useTimer } from "@/hooks/use-timer";
import type { GameSettings } from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";
import { recordGame } from "@/utils/stats-manager";

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resume?: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [settings] = useStorage<GameSettings>("settings", DEFAULT_SETTINGS);

  const {
    state,
    canPeelNow,
    hasWon,
    startGame,
    restoreGame,
    saveGame,
    clearSave,
    placeTile,
    returnTile,
    moveTile,
    exchangeTile,
    peel,
    tick,
    endGame,
  } = useGame();

  const timerMinutes =
    settings.timerMode === "none" ? undefined : settings.timerMode;

  const timer = useTimer({
    countdownMinutes: timerMinutes,
    onExpire: () => {
      endGame(false);
    },
  });

  const [binHighlighted, setBinHighlighted] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [handHeight, setHandHeight] = useState(180);
  const didStart = useRef(false);

  // Start or restore game on mount
  useEffect(() => {
    if (didStart.current) return;
    didStart.current = true;

    if (params.resume === "true") {
      const restored = restoreGame();
      if (restored) {
        timer.start();
        return;
      }
    }
    startGame(settings);
    timer.start();
  }, [params.resume, restoreGame, settings, startGame, timer]);

  // Sync timer to game state
  useEffect(() => {
    if (timer.isRunning) {
      tick(timer.elapsedMs);
    }
  }, [tick, timer.elapsedMs, timer.isRunning]);

  // Check win
  useEffect(() => {
    if (hasWon && !state.isComplete) {
      timer.pause();
      endGame(true);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      recordGame({
        id: `game-${Date.now()}`,
        date: new Date().toISOString(),
        durationMs: timer.elapsedMs,
        difficulty: state.settings.difficulty,
        poolSize: state.settings.poolSize,
        timerMode: state.settings.timerMode,
        isWin: true,
        tilesPlaced: Object.keys(state.board).length,
      });
      setShowWinModal(true);
    }
  }, [
    endGame,
    hasWon,
    state.board,
    state.isComplete,
    state.settings.difficulty,
    state.settings.poolSize,
    state.settings.timerMode,
    timer,
  ]);

  // Auto-save on state changes
  useEffect(() => {
    if (state.startedAt > 0 && !state.isComplete) {
      saveGame();
    }
  }, [saveGame, state.hand.length, state.isComplete, state.startedAt]);

  // Calculate board area bounds for drop detection
  const headerHeight = insets.top + 26; // approximate header height
  const binAreaRight = screenWidth - 20;
  const binAreaTop = screenHeight - insets.bottom - handHeight - BIN_SIZE - 16;

  const handleTileDragEnd = useCallback(
    (tileId: string, absX: number, absY: number) => {
      const isFromHand = state.hand.some((t) => t.id === tileId);
      const isFromBoard = Object.values(state.board).some(
        (t) => t.id === tileId,
      );

      // Check if dropped on bin
      if (
        absX > binAreaRight - BIN_SIZE &&
        absY > binAreaTop &&
        absY < binAreaTop + BIN_SIZE &&
        state.pool.length >= 2
      ) {
        exchangeTile(tileId);
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setBinHighlighted(false);
        return;
      }

      // Check if dropped on hand area (below board)
      if (absY > screenHeight - insets.bottom - handHeight) {
        if (isFromBoard) {
          returnTile(tileId);
          if (process.env.EXPO_OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        return;
      }

      // Dropped on board area — snap to grid
      // Convert absolute position to board grid coordinates
      const centerRow = Math.floor(GRID_COUNT / 2);
      const centerCol = Math.floor(GRID_COUNT / 2);

      // The board is centered on screen, so calculate relative position
      const boardCenterX = screenWidth / 2;
      const boardCenterY = (screenHeight - handHeight) / 2;

      const relX = absX - boardCenterX;
      const relY = absY - boardCenterY;

      const col = centerCol + Math.round(relX / CELL_SIZE);
      const row = centerRow + Math.round(relY / CELL_SIZE);

      const clampedRow = Math.max(0, Math.min(GRID_COUNT - 1, row));
      const clampedCol = Math.max(0, Math.min(GRID_COUNT - 1, col));

      if (isFromHand) {
        placeTile(tileId, clampedRow, clampedCol);
      } else if (isFromBoard) {
        moveTile(tileId, clampedRow, clampedCol);
      }

      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [
      state.hand,
      state.board,
      state.pool.length,
      binAreaRight,
      binAreaTop,
      screenHeight,
      insets.bottom,
      handHeight,
      screenWidth,
      exchangeTile,
      returnTile,
      placeTile,
      moveTile,
    ],
  );

  const handlePeel = useCallback(() => {
    peel();
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [peel]);

  const handleQuit = useCallback(() => {
    Alert.alert("Leave Game?", "Your progress will be saved.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          timer.pause();
          saveGame();
          router.back();
        },
      },
    ]);
  }, [timer, saveGame, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <GameHeader
        elapsedMs={timer.elapsedMs}
        countdownMs={timer.countdownMs}
        showTimer={
          state.settings.showTimer || state.settings.timerMode !== "none"
        }
        tilesInPool={state.pool.length}
        tilesInHand={state.hand.length}
      />

      <GameBoard board={state.board} onTileDragEnd={handleTileDragEnd} />

      {/* Bin + Peel overlay */}
      <View
        style={{
          position: "absolute",
          right: 16,
          bottom: handHeight + 16,
          alignItems: "center",
          gap: 12,
        }}
      >
        {canPeelNow && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Pressable
              onPress={handlePeel}
              style={{
                backgroundColor: "#34C759",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                borderCurve: "continuous",
                boxShadow: "0 2px 8px rgba(52,199,89,0.4)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                Peel!
              </Text>
            </Pressable>
          </Animated.View>
        )}
        <TileBin
          isActive={state.pool.length >= 2}
          isHighlighted={binHighlighted}
        />
      </View>

      {/* Quit button */}
      <Pressable
        onPress={handleQuit}
        style={{
          position: "absolute",
          left: 16,
          top: insets.top + headerHeight,
          width: 125,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(142,142,147,0.12)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 18, color: PlatformColor("secondaryLabel") }}>
          Leave Game
        </Text>
      </Pressable>

      <View
        style={{ paddingBottom: insets.bottom }}
        onLayout={(e) => setHandHeight(e.nativeEvent.layout.height)}
      >
        <PlayerHand tiles={state.hand} onDragEnd={handleTileDragEnd} />
      </View>

      {/* Win Modal */}
      {showWinModal && (
        <Animated.View
          entering={FadeIn}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              borderCurve: "continuous",
              padding: 32,
              alignItems: "center",
              gap: 16,
              marginHorizontal: 40,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1C1C1E" }}>
              You Won!
            </Text>
            <Text
              style={{
                fontSize: 17,
                color: "#8E8E93",
                textAlign: "center",
              }}
            >
              Completed in {formatTime(timer.elapsedMs)}
              {"\n"}
              {Object.keys(state.board).length} tiles placed
            </Text>
            <Pressable
              onPress={() => {
                clearSave();
                router.back();
              }}
              style={{
                backgroundColor: "#007AFF",
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 14,
                borderCurve: "continuous",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 17 }}>
                Done
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Game Over (timer expired) */}
      {state.isComplete && !state.isWin && (
        <Animated.View
          entering={FadeIn}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              borderCurve: "continuous",
              padding: 32,
              alignItems: "center",
              gap: 16,
              marginHorizontal: 40,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <Text style={{ fontSize: 48 }}>⏰</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1C1C1E" }}>
              Time&apos;s Up!
            </Text>
            <Text style={{ fontSize: 17, color: "#8E8E93" }}>
              {state.hand.length} tiles remaining
            </Text>
            <Pressable
              onPress={() => {
                clearSave();
                router.back();
              }}
              style={{
                backgroundColor: "#007AFF",
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 14,
                borderCurve: "continuous",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 17 }}>
                Done
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}
