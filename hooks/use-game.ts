import { useCallback, useReducer } from "react";
import type { Tile, GameSettings, GameState } from "@/types/game";
import { posKey } from "@/types/game";
import {
  createTilePool,
  drawTiles,
  exchangeTile,
  validateBoard,
  checkWinCondition,
  canPeel,
} from "@/utils/game-engine";
import { storage } from "@/utils/storage";

const SAVE_KEY = "current-game";

type Action =
  | { type: "INIT"; settings: GameSettings }
  | { type: "RESTORE"; state: GameState }
  | { type: "PLACE_TILE"; tileId: string; row: number; col: number }
  | { type: "RETURN_TILE"; tileId: string }
  | { type: "MOVE_TILE"; tileId: string; row: number; col: number }
  | { type: "EXCHANGE_TILE"; tileId: string }
  | { type: "PEEL" }
  | { type: "TICK"; elapsedMs: number }
  | { type: "END_GAME"; isWin: boolean };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "INIT": {
      const pool = createTilePool(action.settings.poolSize, action.settings.difficulty);
      const { drawn, remaining } = drawTiles(pool, action.settings.handSize);
      return {
        hand: drawn,
        pool: remaining,
        board: {},
        startedAt: Date.now(),
        elapsedMs: 0,
        settings: action.settings,
        isComplete: false,
        isWin: false,
      };
    }

    case "RESTORE":
      return action.state;

    case "PLACE_TILE": {
      const tile = state.hand.find((t) => t.id === action.tileId);
      if (!tile) return state;
      const key = posKey(action.row, action.col);
      if (state.board[key]) return state; // cell occupied
      return {
        ...state,
        hand: state.hand.filter((t) => t.id !== action.tileId),
        board: { ...state.board, [key]: tile },
      };
    }

    case "RETURN_TILE": {
      const entry = Object.entries(state.board).find(
        ([, t]) => t.id === action.tileId
      );
      if (!entry) return state;
      const [key, tile] = entry;
      const newBoard = { ...state.board };
      delete newBoard[key];
      return {
        ...state,
        hand: [...state.hand, tile],
        board: newBoard,
      };
    }

    case "MOVE_TILE": {
      const entry = Object.entries(state.board).find(
        ([, t]) => t.id === action.tileId
      );
      if (!entry) return state;
      const [oldKey, tile] = entry;
      const newKey = posKey(action.row, action.col);
      if (newKey !== oldKey && state.board[newKey]) return state; // target occupied
      const newBoard = { ...state.board };
      delete newBoard[oldKey];
      newBoard[newKey] = tile;
      return { ...state, board: newBoard };
    }

    case "EXCHANGE_TILE": {
      const handTile = state.hand.find((t) => t.id === action.tileId);
      const boardEntry = Object.entries(state.board).find(
        ([, t]) => t.id === action.tileId
      );

      let tile: Tile | undefined;
      let newHand = [...state.hand];
      let newBoard = { ...state.board };

      if (handTile) {
        tile = handTile;
        newHand = newHand.filter((t) => t.id !== action.tileId);
      } else if (boardEntry) {
        tile = boardEntry[1];
        delete newBoard[boardEntry[0]];
      }

      if (!tile) return state;

      const result = exchangeTile(state.pool, tile);
      if (!result) return state;

      return {
        ...state,
        hand: [...newHand, ...result.newTiles],
        pool: result.remaining,
        board: newBoard,
      };
    }

    case "PEEL": {
      if (!canPeel(state.hand, state.pool, state.board)) return state;
      const { drawn, remaining } = drawTiles(state.pool, 1);
      return {
        ...state,
        hand: [...state.hand, ...drawn],
        pool: remaining,
      };
    }

    case "TICK":
      return { ...state, elapsedMs: action.elapsedMs };

    case "END_GAME":
      return { ...state, isComplete: true, isWin: action.isWin };

    default:
      return state;
  }
}

const INITIAL_STATE: GameState = {
  hand: [],
  pool: [],
  board: {},
  startedAt: 0,
  elapsedMs: 0,
  settings: {
    poolSize: 80,
    handSize: 15,
    difficulty: "standard",
    timerMode: "none",
    showTimer: true,
  },
  isComplete: false,
  isWin: false,
};

export function useGame() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const startGame = useCallback((settings: GameSettings) => {
    dispatch({ type: "INIT", settings });
  }, []);

  const restoreGame = useCallback(() => {
    const saved = storage.get<GameState | null>(SAVE_KEY, null);
    if (saved) {
      dispatch({ type: "RESTORE", state: saved });
      return true;
    }
    return false;
  }, []);

  const saveGame = useCallback(() => {
    if (!state.isComplete && state.startedAt > 0) {
      storage.set(SAVE_KEY, state);
    }
  }, [state]);

  const clearSave = useCallback(() => {
    storage.set(SAVE_KEY, null);
  }, []);

  const placeTile = useCallback(
    (tileId: string, row: number, col: number) => {
      dispatch({ type: "PLACE_TILE", tileId, row, col });
    },
    []
  );

  const returnTile = useCallback((tileId: string) => {
    dispatch({ type: "RETURN_TILE", tileId });
  }, []);

  const moveTile = useCallback(
    (tileId: string, row: number, col: number) => {
      dispatch({ type: "MOVE_TILE", tileId, row, col });
    },
    []
  );

  const exchangeTileAction = useCallback((tileId: string) => {
    dispatch({ type: "EXCHANGE_TILE", tileId });
  }, []);

  const peel = useCallback(() => {
    dispatch({ type: "PEEL" });
  }, []);

  const tick = useCallback((elapsedMs: number) => {
    dispatch({ type: "TICK", elapsedMs });
  }, []);

  const endGame = useCallback(
    (isWin: boolean) => {
      dispatch({ type: "END_GAME", isWin });
      storage.set(SAVE_KEY, null);
    },
    []
  );

  const boardIsValid = validateBoard(state.board);
  const canPeelNow = canPeel(state.hand, state.pool, state.board);
  const hasWon = checkWinCondition(state.hand, state.pool, state.board);

  return {
    state,
    boardIsValid,
    canPeelNow,
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
  };
}
