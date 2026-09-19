import type { GameSettings, GameState } from "@/types/game";
import { canPeel, canSharedPeel, validateBoard, validateBoardWords } from "@/utils/game-engine";
import { gameReducer, INITIAL_STATE, resumeGameState } from "@/utils/game-session";
import { loadDictionary } from "@/utils/dictionary";
import { storage } from "@/utils/storage";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { AppState } from "react-native";

const SAVE_KEY = "current-game";

export function useGame({ enabled = true }: { enabled?: boolean } = {}) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const pausedAt = useRef<number | null>(null);
  const dictionaryRef = useRef<Set<string> | null>(null);

  const [dictionaryReady, setDictionaryReady] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const retryDictionary = useCallback(() => {
    setDictionaryError(null);
    void loadDictionary().then((dict) => { dictionaryRef.current = dict; setDictionaryReady(true); })
      .catch(() => setDictionaryError("The word list could not be loaded. Please retry."));
  }, []);
  useEffect(() => { if (enabled) retryDictionary(); }, [enabled, retryDictionary]);

  const startGame = useCallback((settings: GameSettings, seed?: string) => {
    dispatch({ type: "INIT", settings, seed: seed ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, now: Date.now() });
  }, []);

  const restoreGame = useCallback(() => {
    const saved = storage.get<GameState | null>(SAVE_KEY, null);
    if (saved) {
      dispatch({ type: "RESTORE", state: resumeGameState(saved, Date.now()) });
      return true;
    }
    return false;
  }, []);

  const saveGame = useCallback(() => {
    if (!state.isComplete && state.startedAt > 0) {
      storage.set(SAVE_KEY, { ...state, savedAt: pausedAt.current ?? Date.now() });
    }
  }, [state]);

  const saveRef = useRef(saveGame);
  useEffect(() => { saveRef.current = saveGame; }, [saveGame]);
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active" && pausedAt.current === null) {
        pausedAt.current = Date.now();
        saveRef.current();
      } else if (status === "active" && pausedAt.current !== null) {
        dispatch({ type: "SHIFT_BOT_DEADLINE", delayMs: Math.max(0, Date.now() - pausedAt.current) });
        pausedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  const clearSave = useCallback(() => {
    storage.set(SAVE_KEY, null);
  }, []);

  const placeTile = useCallback((tileId: string, row: number, col: number) => {
    dispatch({ type: "PLACE_TILE", tileId, row, col });
  }, []);

  const returnTile = useCallback((tileId: string) => {
    dispatch({ type: "RETURN_TILE", tileId });
  }, []);

  const moveTile = useCallback((tileId: string, row: number, col: number) => {
    dispatch({ type: "MOVE_TILE", tileId, row, col });
  }, []);

  const exchangeTileAction = useCallback((tileId: string) => {
    dispatch({ type: "EXCHANGE_TILE", tileId });
  }, []);

  const peel = useCallback(() => {
    if (dictionaryRef.current) dispatch({ type: "PEEL", dictionary: dictionaryRef.current });
  }, []);

  const tick = useCallback((elapsedMs: number) => {
    dispatch({ type: "TICK", elapsedMs });
  }, []);

  const endGame = useCallback((isWin: boolean) => {
    dispatch({ type: "END_GAME", isWin, dictionary: dictionaryRef.current ?? undefined });
    storage.set(SAVE_KEY, null);
  }, []);

  const botTick = useCallback((now: number) => {
    if (pausedAt.current !== null) return;
    if (dictionaryRef.current) dispatch({ type: "BOT_TICK", now, dictionary: dictionaryRef.current });
  }, []);

  const markInvalid = useCallback((tileIds: string[]) => {
    dispatch({ type: "MARK_INVALID", tileIds });
  }, []);

  const clearInvalid = useCallback(() => {
    dispatch({ type: "CLEAR_INVALID" });
  }, []);

  /** Validate all board words against the dictionary.
   *  Returns true only after the bundled dictionary is loaded and all words are valid. */
  const validateWords = useCallback((): boolean => {
    const dict = dictionaryRef.current;
    if (!dict) return false;

    const { valid, invalidKeys } = validateBoardWords(state.board, dict);
    if (!valid) {
      // Convert board keys to tile IDs for highlighting
      const tileIds = Array.from(invalidKeys)
        .map((key) => state.board[key]?.id)
        .filter(Boolean) as string[];
      markInvalid(tileIds);
      return false;
    }
    return true;
  }, [state.board, markInvalid]);

  const boardIsValid = validateBoard(state.board);
  const isBotMode = state.settings.gameMode === "bot";
  const canPeelNow = isBotMode
    ? canSharedPeel(state.hand, state.pool, state.board)
    : canPeel(state.hand, state.pool, state.board);
  const hasWon = state.hand.length === 0 && state.pool.length < (isBotMode ? 2 : 1) && boardIsValid;
  // Show the action button when hand is empty and board is connected
  // (covers both "peel" when pool > 0 and "finish" when pool = 0)
  const canAct = dictionaryReady && !state.isComplete && state.hand.length === 0 && boardIsValid && Object.keys(state.board).length > 0;

  return {
    dictionaryReady, dictionaryError, retryDictionary,
    state,
    boardIsValid,
    canPeelNow,
    canAct,
    hasWon,
    startGame,
    restoreGame,
    saveGame,
    clearSave,
    placeTile,
    returnTile,
    moveTile,
    exchangeTile: exchangeTileAction,
    peel,
    tick,
    endGame,
    botTick,
    validateWords,
    markInvalid,
    clearInvalid,
  };
}
