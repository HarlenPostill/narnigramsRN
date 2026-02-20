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
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BOARD_SIZE,
  GameBoard,
  GRID_COUNT,
} from "@/components/game/game-board";
import { GameResultModal } from "@/components/game/game-result-modal";
import { GameHeader } from "@/components/game/game-header";
import { PlayerHand } from "@/components/game/player-hand";
import { CELL_SIZE } from "@/components/game/tile";
import { BIN_SIZE, TileBin } from "@/components/game/tile-bin";
import { useColors } from "@/hooks/use-colors";
import { useGame } from "@/hooks/use-game";
import { useStorage } from "@/hooks/use-storage";
import { formatTime, useTimer } from "@/hooks/use-timer";
import type { GameSettings } from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";
import { lightImpact, mediumImpact, successNotification } from "@/utils/haptics";
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

  const colors = useColors();

  const [binHighlighted, setBinHighlighted] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [handHeight, setHandHeight] = useState(180);
  const didStart = useRef(false);

  // Board transform shared values (lifted here so drop logic can read them)
  const boardScale = useSharedValue(1);
  const boardSavedScale = useSharedValue(1);
  const boardTranslateX = useSharedValue(0);
  const boardTranslateY = useSharedValue(0);
  const boardSavedTranslateX = useSharedValue(0);
  const boardSavedTranslateY = useSharedValue(0);

  // Board container position on screen (from onLayout)
  const boardContainerY = useRef(0);
  const boardContainerHeight = useRef(screenHeight);

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
      successNotification();
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

  // Convert absolute screen position to board grid coordinates
  // accounting for the board's pan/zoom transform
  const screenToGrid = useCallback(
    (absX: number, absY: number) => {
      const contY = boardContainerY.current;
      const contH = boardContainerHeight.current;

      // Board view base offset (before transforms)
      const baseLeft = -(BOARD_SIZE - screenWidth) / 2;
      const baseTop = -(BOARD_SIZE - screenHeight) / 2;

      // Current transform values
      const s = boardScale.value;
      const tx = boardTranslateX.value;
      const ty = boardTranslateY.value;

      // Position relative to board container
      const relX = absX;
      const relY = absY - contY;

      // Invert the transform: screen → board coordinates
      // Screen pos = (boardPos - BOARD_SIZE/2) * scale + BOARD_SIZE/2 + baseLeft + tx
      // So: boardPos = (screenPos - baseLeft - BOARD_SIZE/2 - tx) / scale + BOARD_SIZE/2
      const boardX =
        (relX - baseLeft - BOARD_SIZE / 2 - tx) / s + BOARD_SIZE / 2;
      const boardY =
        (relY - baseTop - BOARD_SIZE / 2 - ty) / s + BOARD_SIZE / 2;

      const col = Math.floor(boardX / CELL_SIZE);
      const row = Math.floor(boardY / CELL_SIZE);

      return {
        row: Math.max(0, Math.min(GRID_COUNT - 1, row)),
        col: Math.max(0, Math.min(GRID_COUNT - 1, col)),
      };
    },
    [screenWidth, screenHeight, boardScale, boardTranslateX, boardTranslateY],
  );

  // Drop zone detection
  const handleTileDragEnd = useCallback(
    (tileId: string, absX: number, absY: number) => {
      const isFromHand = state.hand.some((t) => t.id === tileId);
      const isFromBoard = Object.values(state.board).some(
        (t) => t.id === tileId,
      );

      const handTop = screenHeight - handHeight;
      const binAreaTop = handTop - BIN_SIZE - 16;

      // Bin position depends on handMode: right side when "right", left side when "left"
      const binOnRight = settings.handMode === "right";
      const binLeft = binOnRight ? screenWidth - 16 - BIN_SIZE : 16;
      const binRight = binLeft + BIN_SIZE;

      // Check if dropped on bin
      if (
        absX > binLeft &&
        absX < binRight &&
        absY > binAreaTop &&
        absY < binAreaTop + BIN_SIZE &&
        state.pool.length >= 2
      ) {
        exchangeTile(tileId);
        mediumImpact();
        setBinHighlighted(false);
        return;
      }

      // Check if dropped on hand area (below board)
      if (absY > handTop) {
        if (isFromBoard) {
          returnTile(tileId);
          lightImpact();
        }
        return;
      }

      // Dropped on board area — convert screen position to grid
      const { row, col } = screenToGrid(absX, absY);

      if (isFromHand) {
        placeTile(tileId, row, col);
      } else if (isFromBoard) {
        moveTile(tileId, row, col);
      }

      lightImpact();
    },
    [
      state.hand,
      state.board,
      state.pool.length,
      screenHeight,
      screenWidth,
      handHeight,
      settings.handMode,
      exchangeTile,
      returnTile,
      placeTile,
      moveTile,
      screenToGrid,
    ],
  );

  const handlePeel = useCallback(() => {
    peel();
    mediumImpact();
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
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.screenBg }}
    >
      <GameHeader
        elapsedMs={timer.elapsedMs}
        countdownMs={timer.countdownMs}
        showTimer={
          state.settings.showTimer || state.settings.timerMode !== "none"
        }
        tilesInPool={state.pool.length}
        tilesInHand={state.hand.length}
      />

      <GameBoard
        board={state.board}
        onTileDragEnd={handleTileDragEnd}
        scale={boardScale}
        savedScale={boardSavedScale}
        translateX={boardTranslateX}
        translateY={boardTranslateY}
        savedTranslateX={boardSavedTranslateX}
        savedTranslateY={boardSavedTranslateY}
        onContainerLayout={(y, h) => {
          boardContainerY.current = y;
          boardContainerHeight.current = h;
        }}
      />

      {/* Bin + Peel overlay */}
      <View
        style={{
          position: "absolute",
          right: 16,
          left: 16,
          bottom: handHeight + 16,
          alignItems: "flex-end",
          justifyContent: "flex-end",
          flexDirection: settings.handMode === "right" ? "row" : "row-reverse",
          gap: 12,
        }}
      >
        {canPeelNow && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={{ flexGrow: 1 }}
          >
            <Pressable
              onPress={handlePeel}
              style={{
                backgroundColor: "#0062FF",
                paddingHorizontal: 12,
                height: 77,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                borderCurve: "continuous",
                boxShadow: colors.peelShadow,
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
          left: settings.handMode === "left" ? screenWidth - 16 - 125 : 16,
          top: insets.top + 75,
          width: 125,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.buttonMutedBg,
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
        <GameResultModal
          emoji="🎉"
          title="You Won!"
          subtitle={`Completed in ${formatTime(timer.elapsedMs)}\n${Object.keys(state.board).length} tiles placed`}
          onDismiss={() => {
            clearSave();
            router.back();
          }}
        />
      )}

      {/* Game Over (timer expired) */}
      {state.isComplete && !state.isWin && (
        <GameResultModal
          emoji="⏰"
          title="Time's Up!"
          subtitle={`${state.hand.length} tiles remaining`}
          onDismiss={() => {
            clearSave();
            router.back();
          }}
        />
      )}
    </GestureHandlerRootView>
  );
}
