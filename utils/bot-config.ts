import type { BotDifficulty } from "../types/game";
export interface BotConfig {
  minTileDelay: number;
  maxTileDelay: number;
  /** Maximum dictionary word length and candidate placements inspected per turn. */
  maxWordLength: number;
  searchBudget: number;
  candidateLimit: number;
}
const CONFIGS: Record<BotDifficulty, BotConfig> = {
  easy: { minTileDelay: 3000, maxTileDelay: 5000, maxWordLength: 6, searchBudget: 250, candidateLimit: 200 },
  medium: { minTileDelay: 1500, maxTileDelay: 3000, maxWordLength: 8, searchBudget: 250, candidateLimit: 400 },
  hard: { minTileDelay: 800, maxTileDelay: 1500, maxWordLength: 12, searchBudget: 800, candidateLimit: 1000 },
};
export function getBotConfig(difficulty: BotDifficulty): BotConfig { return CONFIGS[difficulty]; }
export function botDifficultyForRating(rating: number): BotDifficulty { return rating < 700 ? "easy" : rating < 1300 ? "medium" : "hard"; }
export function getNextActionDelay(config: BotConfig, random: () => number): number {
  return Math.round(config.minTileDelay + random() * (config.maxTileDelay - config.minTileDelay));
}
