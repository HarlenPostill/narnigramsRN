import { useConfirm } from "@/components/ui/use-confirm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { BotProgress } from "@/components/game/bot-progress";
import { OpponentProgress } from "@/components/game/opponent-progress";
import {
  BOARD_SIZE,
  GameBoard,
  GRID_COUNT,
} from "@/components/game/game-board";
import { GameHeader } from "@/components/game/game-header";
import { GameResultModal } from "@/components/game/game-result-modal";
import { PlayerHand } from "@/components/game/player-hand";
import { CELL_SIZE } from "@/components/game/tile";
import { BIN_SIZE, TileBin } from "@/components/game/tile-bin";
import { useColors } from "@/hooks/use-colors";
import { useGame } from "@/hooks/use-game";
import { useOnlineGame } from "@/hooks/use-online-game";
import { useStorage } from "@/hooks/use-storage";
import { formatTime, useTimer } from "@/hooks/use-timer";
import type { GameSettings, BotDifficulty } from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";
import {
  lightImpact,
  mediumImpact,
  successNotification,
} from "@/utils/haptics";
import { recordGame } from "@/utils/stats-manager";

type GameController = Pick<ReturnType<typeof useGame>, 'state' | 'canAct' | 'placeTile' | 'returnTile' | 'moveTile' | 'exchangeTile' | 'peel' | 'validateWords' | 'dictionaryReady' | 'dictionaryError'> & {
  saveGame?: () => void;
  clearSave?: () => void;
  tick?: (elapsed: number) => void;
  endGame?: (win: boolean) => void;
  botTick?: (now: number) => void;
  onlineFinish?: () => void;
  onlineForfeit?: () => Promise<void>;
  poolCount?: number;
  opponent?: { displayName: string; rating: number };
  opponentConnected?: boolean;
  pending?: boolean;
  error?: string | null;
  retry?: () => void;
  retryDictionary?: () => void;
  eloDelta?: number;
  resultReason?: string;
};

export default function GameScreen() {
  const params = useLocalSearchParams<{ matchId?: string; resume?: string; fallback?: string; seed?: string; botDifficulty?: string }>();
  if (typeof params.matchId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(params.matchId)) return <OnlineSession key={params.matchId} matchId={params.matchId} />;
  return <OfflineSession key={`${params.fallback ?? "offline"}-${params.seed ?? params.resume ?? "new"}`} resume={params.resume === 'true'} fallback={params.fallback === 'true'} seed={params.seed} difficulty={params.botDifficulty} />;
}
function OnlineSession({ matchId }: { matchId: string }) {
  const game = useOnlineGame(matchId);
  return <GameSurface game={game} isOnline />;
}
function OfflineSession({ resume, fallback, seed, difficulty }: { resume: boolean; fallback: boolean; seed?: string; difficulty?: string }) {
  const game = useGame();
  const { startGame, restoreGame } = game;
  const [settings] = useStorage<GameSettings>('settings', DEFAULT_SETTINGS);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (resume && restoreGame()) return;
    const botDifficulty: BotDifficulty = difficulty === 'easy' || difficulty === 'hard' ? difficulty : 'medium';
    startGame(fallback ? { ...settings, gameMode: 'bot', botDifficulty, poolSize: 72, handSize: 15, difficulty: 'standard', timerMode: 'none' } : settings, fallback ? seed : undefined);
  }, [resume, fallback, seed, difficulty, settings, startGame, restoreGame]);
  return <GameSurface game={game} isOnline={false} fallback={fallback} />;
}
function GameSurface({ game: activeGame, isOnline, fallback = false }: { game: GameController; isOnline: boolean; fallback?: boolean }) {
  const { back: goBack, canGoBack, replace } = useRouter();
  const back = useCallback(() => { if (canGoBack()) goBack(); else replace("/"); }, [goBack, canGoBack, replace]);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { state, canAct, saveGame, clearSave, placeTile, returnTile, moveTile, exchangeTile, peel, tick, endGame, botTick, validateWords, onlineFinish, onlineForfeit } = activeGame;
  const settings = state.settings;
  const poolCount = activeGame.poolCount ?? state.pool.length;
  const finishAvailable = poolCount < (settings.gameMode === 'solo' ? 1 : 2);
  const onExpire = useCallback(() => endGame?.(false), [endGame]);
  const timer = useTimer({ countdownMinutes: settings.timerMode === 'none' ? undefined : settings.timerMode, onExpire });
  const { start: startTimer, pause: pauseTimer, elapsedMs, countdownMs, isRunning } = timer;
  const colors = useColors();
  const { confirm, dialog } = useConfirm();
  const [validationError, setValidationError] = useState<string | null>(null);

  const [binHighlighted, setBinHighlighted] = useState(false);
  const [handHeight, setHandHeight] = useState(180);
  const [surfaceHeight, setSurfaceHeight] = useState(screenHeight);
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

  useEffect(() => {
    if (didStart.current || state.startedAt === 0) return;
    didStart.current = true;
    startTimer(state.elapsedMs);
  }, [state.startedAt, state.elapsedMs, startTimer]);
  useEffect(() => { if (isRunning) tick?.(elapsedMs); }, [tick, elapsedMs, isRunning]);
  useEffect(() => {
    if (isOnline || state.startedAt === 0 || state.isComplete) return;
    saveGame?.();
  }, [isOnline, saveGame, state]);
  const isBotMode = state.settings.gameMode === 'bot';
  useEffect(() => {
    if (!isBotMode || state.isComplete || state.startedAt === 0) return;
    const interval = setInterval(() => botTick?.(Date.now()), 500);
    return () => clearInterval(interval);
  }, [isBotMode, state.isComplete, state.startedAt, botTick]);
  const recorded = useRef(false);
  useEffect(() => {
    if (!state.isComplete || recorded.current) return;
    recorded.current = true; pauseTimer(); clearSave?.();
    if (activeGame.resultReason === "abandoned") return;
    recordGame({ id: `game-${state.sessionId ?? state.startedAt}`, date: new Date().toISOString(), durationMs: state.elapsedMs, difficulty: settings.difficulty, poolSize: settings.poolSize, timerMode: settings.timerMode, isWin: state.isWin, tilesPlaced: Object.keys(state.board).length, gameMode: settings.gameMode });
  }, [state, settings, pauseTimer, clearSave, activeGame.resultReason]);

  // Convert absolute screen position to board grid coordinates
  // accounting for the board's pan/zoom transform
  const screenToGrid = useCallback(
    (absX: number, absY: number) => {
      const contY = boardContainerY.current;

      // Board view base offset (before transforms)
      const baseLeft = -(BOARD_SIZE - screenWidth) / 2;
      const baseTop = -(BOARD_SIZE - screenHeight) / 2;

      // Current transform values
      const s = boardScale.get();
      const tx = boardTranslateX.get();
      const ty = boardTranslateY.get();

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
      if (activeGame.pending || state.isComplete) return;
      const isFromHand = state.hand.some((t) => t.id === tileId);
      const isFromBoard = Object.values(state.board).some(
        (t) => t.id === tileId,
      );

      const handTop = surfaceHeight - handHeight;
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
        poolCount >= 2
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
      activeGame.pending,
      state.isComplete,
      state.hand,
      state.board,
      poolCount,
      surfaceHeight,
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
    if (!validateWords()) {
      setValidationError('Connect your tiles into valid words before peeling. Invalid tiles are marked.');
      return;
    }
    setValidationError(null);
    if (finishAvailable) {
      if (isOnline) onlineFinish?.();
      else { endGame?.(true); successNotification(); }
    } else peel();
    mediumImpact();
  }, [validateWords, finishAvailable, isOnline, onlineFinish, endGame, peel]);
  const leave = useCallback(async () => {
    if (isOnline) { if (state.startedAt === 0 || activeGame.error) { back(); return; } await onlineForfeit?.(); return; }
    pauseTimer(); saveGame?.(); back();
  }, [isOnline, onlineForfeit, pauseTimer, saveGame, back, state.startedAt, activeGame.error]);
  const handleQuit = useCallback(() => {
    const unavailable = isOnline && (state.startedAt === 0 || activeGame.error);
    const title = unavailable ? 'Leave match screen?' : isOnline ? 'Forfeit ranked game?' : 'Leave game?';
    const message = unavailable ? 'Your match may still be active. Open Ranked to reconnect; disconnect rules still apply.' : isOnline ? 'This counts as a ranked loss.' : 'Your progress will be saved.';
    confirm(title, message, () => { void leave(); }, unavailable ? 'Leave' : isOnline ? 'Forfeit' : 'Leave');
  }, [isOnline, leave, state.startedAt, activeGame.error, confirm]);

  return (
    <GestureHandlerRootView
      onLayout={event => setSurfaceHeight(event.nativeEvent.layout.height)}
      style={{ flex: 1, backgroundColor: colors.screenBg }}
    >
      <GameHeader
        elapsedMs={elapsedMs}
        countdownMs={countdownMs}
        showTimer={
          state.settings.showTimer || state.settings.timerMode !== "none"
        }
        tilesInPool={poolCount}
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
        invalidTileIds={state.invalidTileIds}
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
        {!!canAct && !state.isComplete && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={{ flexGrow: 1 }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={handlePeel}
              style={{
                backgroundColor:
                  finishAvailable ? "#2E7D32" : "#0062FF",
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
                {finishAvailable ? "Narnigrams!" : "Peel!"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
        <TileBin
          isActive={poolCount >= 2}
          isHighlighted={binHighlighted}
        />
      </View>

      {/* Quit button */}
      <Pressable
        accessibilityRole="button"
        onPress={handleQuit}
        style={{
          position: "absolute",
          left: settings.handMode === "left" ? screenWidth - 16 - 125 : 16,
          top: insets.top + 75,
          width: 125,
          minHeight: 44,
          borderRadius: 20,
          backgroundColor: colors.buttonMutedBg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 18, color: colors.textSecondary }}>
          Leave Game
        </Text>
      </Pressable>

      {/* Bot progress */}
      {!!isBotMode && !!state.botState && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 75,
            [settings.handMode === "left" ? "left" : "right"]: 16,
          }}
        >
          <BotProgress
            botState={state.botState}
            difficulty={state.settings.botDifficulty ?? "medium"}
          />
        </View>
      )}

      {isOnline && activeGame.opponent ? <View style={{ position: 'absolute', top: insets.top + 75, right: 16 }}><OpponentProgress opponent={activeGame.opponent} connected={activeGame.opponentConnected ?? false} /></View> : null}
      {(validationError || fallback || activeGame.error || !activeGame.dictionaryReady || activeGame.pending || state.startedAt === 0) ? <View style={{ position: 'absolute', top: insets.top + 130, left: 16, right: 16, padding: 12, borderRadius: 12, backgroundColor: colors.cardBg }}>
        <Text accessibilityLiveRegion="polite" style={{ color: colors.textPrimary }}>{validationError ?? activeGame.error ?? activeGame.dictionaryError ?? (!activeGame.dictionaryReady ? 'Loading dictionary…' : state.startedAt === 0 ? 'Connecting to match…' : activeGame.pending ? 'Syncing move…' : 'AI fallback · practice only · no rating change')}</Text>
        {activeGame.dictionaryError && activeGame.retryDictionary ? <Pressable accessibilityRole="button" onPress={activeGame.retryDictionary} style={{ padding: 12 }}><Text style={{ color: "#007AFF" }}>Retry dictionary</Text></Pressable> : null}
        {(activeGame.error && activeGame.retry) ? <Pressable accessibilityRole="button" onPress={activeGame.retry} style={{ padding: 12 }}><Text style={{ color: '#007AFF' }}>Retry connection</Text></Pressable> : null}
        {state.startedAt === 0 && !activeGame.error ? <ActivityIndicator /> : null}
      </View> : null}

      <View
        style={{ paddingBottom: insets.bottom }}
        onLayout={(e) => setHandHeight(e.nativeEvent.layout.height)}
      >
        <PlayerHand tiles={state.hand} onDragEnd={handleTileDragEnd} />
      </View>

      {state.isComplete ? <GameResultModal
        emoji={state.isWin ? '🎉' : '🏁'}
        title={activeGame.resultReason === 'abandoned' ? 'Match abandoned' : state.isWin ? 'You won!' : 'Game complete'}
        subtitle={`${state.isWin ? 'Finished' : 'Keep practicing'} · ${formatTime(state.elapsedMs)}\n${Object.keys(state.board).length} tiles placed${activeGame.resultReason === 'abandoned' ? '\nBoth players disconnected · no rating change' : isOnline ? `\nRanked human match · ${activeGame.resultReason ?? 'completed'}` : isBotMode ? '\nAI practice · no rating change' : ''}`}
        eloDelta={activeGame.eloDelta}
        onDismiss={() => { clearSave?.(); back(); }}
      /> : null}
      {dialog}
    </GestureHandlerRootView>
  );
}
