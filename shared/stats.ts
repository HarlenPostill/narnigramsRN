import { EMPTY_STATS, type GameRecord, type GameStats } from "../types/game";

export function addRecord(previous: GameStats, record: GameRecord): GameStats {
  const stats: GameStats = {
    ...previous,
    bestTimes: { ...previous.bestTimes },
    byMode: { ...previous.byMode },
    records: [...previous.records],
  };
  const mode = record.gameMode ?? "solo";
  const counts = stats.byMode?.[mode] ?? { games: 0, wins: 0 };
  stats.byMode![mode] = {
    games: counts.games + 1,
    wins: counts.wins + Number(record.isWin),
  };
  stats.totalGames++;
  stats.totalWins += Number(record.isWin);
  if (mode === "solo") {
    stats.currentStreak = record.isWin ? stats.currentStreak + 1 : 0;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    const key = `${record.difficulty}-${record.poolSize}` as const;
    if (
      record.isWin &&
      (!stats.bestTimes[key] || record.durationMs < stats.bestTimes[key]!)
    )
      stats.bestTimes[key] = record.durationMs;
  }
  stats.records = [...stats.records, record].slice(-500);
  return stats;
}
export function emptyStats(): GameStats {
  return { ...EMPTY_STATS, bestTimes: {}, records: [] };
}

export function validOfflineRecord(value: unknown): value is GameRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as GameRecord;
  return (
    typeof r.id === "string" &&
    /^[a-zA-Z0-9_-]{1,180}$/.test(r.id) &&
    typeof r.date === "string" &&
    Number.isFinite(Date.parse(r.date)) &&
    (r.gameMode === undefined ||
      r.gameMode === "solo" ||
      r.gameMode === "bot") &&
    ["easy", "standard", "hard"].includes(r.difficulty) &&
    [50, 72, 100].includes(r.poolSize) &&
    ["none", 5, 10, 15, 30].includes(r.timerMode) &&
    typeof r.isWin === "boolean" &&
    Number.isFinite(r.durationMs) &&
    r.durationMs >= 0 &&
    r.durationMs <= 31536000000 &&
    Number.isInteger(r.tilesPlaced) &&
    r.tilesPlaced >= 0 &&
    r.tilesPlaced <= 100
  );
}

// Retained history is capped at 500 games; preserve aggregates for older games too.
export function legacyArchive(stats: GameStats): GameStats {
  const retained = stats.records.reduce(addRecord, emptyStats());
  const archived = emptyStats();
  const online = stats.byMode?.online ?? { games: 0, wins: 0 };
  const retainedOnline = retained.byMode?.online ?? { games: 0, wins: 0 };
  archived.totalGames = Math.max(
    0,
    stats.totalGames -
      online.games -
      retained.totalGames +
      retainedOnline.games,
  );
  archived.totalWins = Math.min(
    archived.totalGames,
    Math.max(
      0,
      stats.totalWins - online.wins - retained.totalWins + retainedOnline.wins,
    ),
  );
  archived.bestTimes = { ...stats.bestTimes };
  archived.bestStreak = stats.bestStreak;
  for (const mode of ["solo", "bot"] as const) {
    const original = stats.byMode?.[mode];
    const recent = retained.byMode?.[mode];
    if (original) {
      const games = Math.max(0, original.games - (recent?.games ?? 0));
      archived.byMode = {
        ...archived.byMode,
        [mode]: {
          games,
          wins: Math.min(
            games,
            Math.max(0, original.wins - (recent?.wins ?? 0)),
          ),
        },
      };
    }
  }
  // Seed the archived run, so replaying retained records restores the full streak.
  archived.currentStreak = Math.max(
    0,
    stats.currentStreak - retained.currentStreak,
  );
  return archived;
}
