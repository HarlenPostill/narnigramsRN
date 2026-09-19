import assert from "node:assert/strict";
import { test } from "node:test";
import type { GameRecord } from "../../types/game";
import {
  getGameStats,
  recordGame,
  setStatsOwner,
} from "../../utils/stats-manager";
import {
  legacyArchive,
  addRecord,
  emptyStats,
  validOfflineRecord,
} from "../../shared/stats";
import { parseStats } from "../../utils/storage-schema";
const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  },
});
const base: GameRecord = {
  id: "solo",
  date: "2026-09-19",
  durationMs: 50000,
  difficulty: "standard",
  poolSize: 72,
  timerMode: "none",
  isWin: true,
  tilesPlaced: 72,
  gameMode: "solo",
};
test("result idempotency and mode-specific wins preserve solo times and streak", () => {
  values.clear();
  recordGame(base);
  recordGame(base);
  assert.equal(getGameStats().totalGames, 1);
  recordGame({ ...base, id: "practice", gameMode: "bot", durationMs: 1000 });
  recordGame({ ...base, id: "online", gameMode: "online", isWin: false });
  const stats = getGameStats();
  assert.equal(stats.totalGames, 3);
  assert.equal(stats.totalWins, 2);
  assert.equal(stats.bestTimes["standard-72"], 50000);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.bestStreak, 1);
  assert.deepEqual(stats.byMode, {
    solo: { games: 1, wins: 1 },
    bot: { games: 1, wins: 1 },
    online: { games: 1, wins: 0 },
  });
  recordGame({ ...base, id: "solo-loss", isWin: false });
  assert.equal(getGameStats().currentStreak, 0);
});
test("malformed record and mode counters recover without invalid totals", () => {
  const stats = parseStats({
    totalGames: 1,
    totalWins: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestTimes: { "standard-72": "fast" },
    records: [{ ...base, durationMs: "oops" }],
    byMode: { bot: { games: "many", wins: 99 } },
  });
  assert.deepEqual(stats.records, []);
  assert.deepEqual(stats.bestTimes, {});
  assert.deepEqual(stats.byMode, {});
});

test("account caches and offline outboxes are isolated from guest and other accounts", () => {
  values.clear();
  setStatsOwner(null);
  recordGame(base);
  setStatsOwner("alice");
  assert.equal(getGameStats().totalGames, 0);
  recordGame(base);
  assert.equal(JSON.parse(values.get("pending-stats-alice")!).length, 1);
  setStatsOwner("bob");
  assert.equal(getGameStats().totalGames, 0);
  setStatsOwner(null);
  assert.equal(getGameStats().totalGames, 1);
});
test("legacy migration preserves aggregates beyond retained history", () => {
  let stats = emptyStats();
  for (let i = 0; i < 650; i++)
    stats = addRecord(stats, { ...base, id: `game-${i}` });
  assert.equal(stats.records.length, 500);
  const restored = stats.records.reduce(addRecord, legacyArchive(stats));
  assert.equal(restored.totalGames, 650);
  assert.equal(restored.totalWins, 650);
  assert.equal(restored.currentStreak, 650);
  assert.equal(restored.bestStreak, 650);
  assert.equal(validOfflineRecord({ ...base, gameMode: "online" }), false);
  assert.equal(validOfflineRecord({ ...base, id: "../escape" }), false);
});
