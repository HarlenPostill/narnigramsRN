import type { GameRecord, GameStats } from "@/types/game";
import { storage } from "./storage";

const STATS_KEY = "game-stats";

function getStats(): GameStats {
  return storage.get<GameStats>(STATS_KEY, {
    totalGames: 0,
    totalWins: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestTimes: {},
    records: [],
  });
}

function saveStats(stats: GameStats) {
  storage.set(STATS_KEY, stats);
}

export function recordGame(record: GameRecord) {
  const stats = getStats();

  stats.totalGames++;
  if (record.isWin) {
    stats.totalWins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }

    const modeKey = `${record.difficulty}-${record.poolSize}` as const;
    const current = stats.bestTimes[modeKey];
    if (!current || record.durationMs < current) {
      stats.bestTimes[modeKey] = record.durationMs;
    }
  } else {
    stats.currentStreak = 0;
  }

  stats.records.push(record);
  saveStats(stats);
}

export function getGameStats(): GameStats {
  return getStats();
}

export function getRecentGames(days: number): GameRecord[] {
  const stats = getStats();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return stats.records.filter((r) => new Date(r.date).getTime() >= cutoff);
}

export function getAveragePlayTime(): number {
  const stats = getStats();
  if (stats.records.length === 0) return 0;
  const total = stats.records.reduce((sum, r) => sum + r.durationMs, 0);
  return total / stats.records.length;
}
