import type { BotDifficulty } from "@/types/game";

export interface BotConfig {
  minTileDelay: number; // ms
  maxTileDelay: number; // ms
  exchangeChance: number; // 0-1
  pauseChance: number; // 0-1
  minPauseDelay: number; // ms
  maxPauseDelay: number; // ms
}

const CONFIGS: Record<BotDifficulty, BotConfig> = {
  easy: {
    minTileDelay: 3000,
    maxTileDelay: 5000,
    exchangeChance: 0.2,
    pauseChance: 0.25,
    minPauseDelay: 2000,
    maxPauseDelay: 5000,
  },
  medium: {
    minTileDelay: 1500,
    maxTileDelay: 3000,
    exchangeChance: 0.1,
    pauseChance: 0.12,
    minPauseDelay: 1000,
    maxPauseDelay: 3000,
  },
  hard: {
    minTileDelay: 800,
    maxTileDelay: 1500,
    exchangeChance: 0.05,
    pauseChance: 0.05,
    minPauseDelay: 500,
    maxPauseDelay: 1500,
  },
};

export function getBotConfig(difficulty: BotDifficulty): BotConfig {
  return CONFIGS[difficulty];
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function getNextActionDelay(config: BotConfig): number {
  return randBetween(config.minTileDelay, config.maxTileDelay);
}

export function shouldExchange(config: BotConfig): boolean {
  return Math.random() < config.exchangeChance;
}

export function shouldPause(config: BotConfig): boolean {
  return Math.random() < config.pauseChance;
}

export function getPauseDelay(config: BotConfig): number {
  return randBetween(config.minPauseDelay, config.maxPauseDelay);
}
