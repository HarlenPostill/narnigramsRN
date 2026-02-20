import type { BotState } from "@/types/game";
import type { BotConfig } from "./bot-config";
import {
  getNextActionDelay,
  getPauseDelay,
  shouldExchange,
  shouldPause,
} from "./bot-config";

export type BotAction = "none" | "place" | "exchange" | "peel" | "finish";

export function createBotState(handSize: number): BotState {
  return {
    handSize,
    tilesPlaced: 0,
    isFinished: false,
    nextActionAt: Date.now() + 2000, // small initial delay
  };
}

export function botTick(
  state: BotState,
  config: BotConfig,
  poolSize: number,
  now: number,
): { newState: BotState; action: BotAction } {
  if (state.isFinished || now < state.nextActionAt) {
    return { newState: state, action: "none" };
  }

  let delay = getNextActionDelay(config);
  if (shouldPause(config)) {
    delay += getPauseDelay(config);
  }
  const nextActionAt = now + delay;

  // Bot has empty hand — try to peel or finish
  if (state.handSize === 0) {
    if (poolSize >= 2) {
      return {
        newState: { ...state, handSize: 1, nextActionAt },
        action: "peel",
      };
    }
    return {
      newState: { ...state, isFinished: true, nextActionAt },
      action: "finish",
    };
  }

  // Decide: exchange or place
  if (shouldExchange(config) && poolSize >= 2) {
    // Exchange: return 1 tile, draw 2 → net +1 hand
    return {
      newState: { ...state, handSize: state.handSize + 1, nextActionAt },
      action: "exchange",
    };
  }

  // Place a tile
  return {
    newState: {
      ...state,
      handSize: state.handSize - 1,
      tilesPlaced: state.tilesPlaced + 1,
      nextActionAt,
    },
    action: "place",
  };
}
