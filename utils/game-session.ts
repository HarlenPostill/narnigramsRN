import type { GameSettings, GameState, Tile } from "../types/game";
import { posKey } from "../types/game";
import { canPeel, canSharedPeel, createTilePool, drawTiles, exchangeTile, sharedPeel, validateBoardWords } from "./game-engine";
import { getBotConfig } from "./bot-config";
import { createBotState, withBotTiles, botTick as botTickEngine } from "./bot-engine";
export type GameAction =
  | { type: "INIT"; settings: GameSettings; seed: string; now: number }
  | { type: "RESTORE"; state: GameState }
  | { type: "PLACE_TILE"; tileId: string; row: number; col: number }
  | { type: "RETURN_TILE"; tileId: string }
  | { type: "MOVE_TILE"; tileId: string; row: number; col: number }
  | { type: "EXCHANGE_TILE"; tileId: string }
  | { type: "PEEL"; dictionary: Set<string> }
  | { type: "TICK"; elapsedMs: number }
  | { type: "END_GAME"; isWin: boolean; dictionary?: Set<string> }
  | { type: "BOT_TICK"; now: number; dictionary: Set<string> }
  | { type: "MARK_INVALID"; tileIds: string[] }
  | { type: "CLEAR_INVALID" }
  | { type: "SHIFT_BOT_DEADLINE"; delayMs: number };

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.isComplete && !["INIT", "RESTORE"].includes(action.type)) return state;
  switch (action.type) {
    case "INIT": {
      const pool = createTilePool(
        action.settings.poolSize,
        action.settings.difficulty,
        action.seed,
      );
      const { drawn, remaining } = drawTiles(pool, action.settings.handSize);

      // Deal actual tiles to both participants from one ordered pool.
      const isBotMode = action.settings.gameMode === "bot";
      const botHandSize = action.settings.handSize;
      const poolAfterBot = isBotMode
        ? remaining.slice(botHandSize)
        : remaining;

      return {
        hand: drawn,
        pool: poolAfterBot,
        board: {},
        sessionId: action.seed,
        startedAt: action.now,
        elapsedMs: 0,
        settings: action.settings,
        isComplete: false,
        isWin: false,
        botState: isBotMode ? createBotState(remaining.slice(0, botHandSize), action.seed, action.now) : undefined,
      };
    }

    case "RESTORE":
      return action.state;

    case "PLACE_TILE": {
      if (![action.row, action.col].every((value) => Number.isSafeInteger(value) && value >= 0 && value < 40)) return state;
      const tile = state.hand.find((t) => t.id === action.tileId);
      if (!tile) return state;
      const key = posKey(action.row, action.col);
      if (state.board[key]) return state; // cell occupied
      return {
        ...state,
        hand: state.hand.filter((t) => t.id !== action.tileId),
        board: { ...state.board, [key]: tile },
        invalidTileIds: undefined,
      };
    }

    case "RETURN_TILE": {
      const entry = Object.entries(state.board).find(
        ([, t]) => t.id === action.tileId,
      );
      if (!entry) return state;
      const [key, tile] = entry;
      const newBoard = { ...state.board };
      delete newBoard[key];
      return {
        ...state,
        hand: [...state.hand, tile],
        board: newBoard,
        invalidTileIds: undefined,
      };
    }

    case "MOVE_TILE": {
      if (![action.row, action.col].every((value) => Number.isSafeInteger(value) && value >= 0 && value < 40)) return state;
      const entry = Object.entries(state.board).find(
        ([, t]) => t.id === action.tileId,
      );
      if (!entry) return state;
      const [oldKey, tile] = entry;
      const newKey = posKey(action.row, action.col);
      if (newKey !== oldKey && state.board[newKey]) return state; // target occupied
      const newBoard = { ...state.board };
      delete newBoard[oldKey];
      newBoard[newKey] = tile;
      return { ...state, board: newBoard, invalidTileIds: undefined };
    }

    case "EXCHANGE_TILE": {
      const handTile = state.hand.find((t) => t.id === action.tileId);
      const boardEntry = Object.entries(state.board).find(
        ([, t]) => t.id === action.tileId,
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
        invalidTileIds: undefined,
      };
    }

    case "PEEL": {
      if (!validateBoardWords(state.board, action.dictionary).valid) return state;
      // Bot mode: shared peel — both player and bot draw 1 tile
      if (state.settings.gameMode === "bot") {
        if (!canSharedPeel(state.hand, state.pool, state.board)) return state;
        const { playerTile, botTile, remaining } = sharedPeel(state.pool);
        return {
          ...state,
          hand: [...state.hand, playerTile],
          pool: remaining,
          botState: state.botState
            ? withBotTiles(state.botState, [...state.botState.hand, botTile])
            : undefined,
        };
      }
      // Solo mode: original behavior
      if (!canPeel(state.hand, state.pool, state.board)) return state;
      const { drawn, remaining } = drawTiles(state.pool, 1);
      return {
        ...state,
        hand: [...state.hand, ...drawn],
        pool: remaining,
      };
    }

    case "TICK":
      return action.elapsedMs <= state.elapsedMs || !Number.isFinite(action.elapsedMs) ? state : { ...state, elapsedMs: action.elapsedMs };

    case "END_GAME": {
      if (action.isWin && (state.hand.length > 0 || state.pool.length >= (state.settings.gameMode === "bot" ? 2 : 1) || !action.dictionary || !validateBoardWords(state.board, action.dictionary).valid)) return state;
      return { ...state, isComplete: true, isWin: action.isWin };
    }

    case "BOT_TICK": {
      if (!state.botState) return state;
      const result = botTickEngine(state.botState, getBotConfig(state.settings.botDifficulty ?? "medium"), state.pool, action.now, action.dictionary);
      if (result.action === "none") return state;
      return { ...state, botState: result.newState, pool: result.pool,
        hand: result.playerTile ? [...state.hand, result.playerTile] : state.hand,
        isComplete: result.action === "finish", isWin: false };
    }

    case "SHIFT_BOT_DEADLINE":
      return state.botState && Number.isFinite(action.delayMs) && action.delayMs > 0 ? { ...state, botState: { ...state.botState, nextActionAt: state.botState.nextActionAt + action.delayMs } } : state;

    case "MARK_INVALID":
      return { ...state, invalidTileIds: action.tileIds };

    case "CLEAR_INVALID":
      return { ...state, invalidTileIds: undefined };

    default:
      return state;
  }
}

export const INITIAL_STATE: GameState = {
  hand: [],
  pool: [],
  board: {},
  startedAt: 0,
  elapsedMs: 0,
  settings: {
    poolSize: 72,
    handSize: 15,
    handMode: "right",
    difficulty: "standard",
    timerMode: "none",
    showTimer: true,
    gameMode: "solo",
  },
  isComplete: false,
  isWin: false,
};


/** Resume Practice with the same thinking time remaining when it was saved. */
export function resumeGameState(state: GameState, now: number): GameState {
  if (!state.botState) return state;
  return { ...state, botState: { ...state.botState, nextActionAt: now + Math.max(0, state.botState.nextActionAt - (state.savedAt ?? now)) } };
}
