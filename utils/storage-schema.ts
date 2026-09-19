import { DEFAULT_SETTINGS, EMPTY_STATS, LETTER_POINTS } from "../types/game";
import type { GameSettings, GameState, GameStats, Tile } from "../types/game";
import { getDistribution } from "./tile-distribution";
export const SAVE_VERSION = 2;
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0; }
export function parseSettings(value: unknown): GameSettings {
  if (!object(value)) return { ...DEFAULT_SETTINGS };
  const s = { ...DEFAULT_SETTINGS };
  if ([50,72,100].includes(value.poolSize as number)) s.poolSize = value.poolSize as GameSettings["poolSize"];
  if ([11,15,21].includes(value.handSize as number)) s.handSize = value.handSize as GameSettings["handSize"];
  if (["left","right"].includes(value.handMode as string)) s.handMode = value.handMode as GameSettings["handMode"];
  if (["easy","standard","hard"].includes(value.difficulty as string)) s.difficulty = value.difficulty as GameSettings["difficulty"];
  if (["none",5,10,15,30].includes(value.timerMode as number)) s.timerMode = value.timerMode as GameSettings["timerMode"];
  if (typeof value.showTimer === "boolean") s.showTimer = value.showTimer;
  if (["solo","bot"].includes(value.gameMode as string)) s.gameMode = value.gameMode as GameSettings["gameMode"];
  if (["easy","medium","hard"].includes(value.botDifficulty as string)) s.botDifficulty = value.botDifficulty as GameSettings["botDifficulty"];
  return s;
}
function tile(value: unknown): value is Tile {
  return object(value) && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 1024 && typeof value.letter === "string" && /^[A-Z]$/.test(value.letter) && value.points === LETTER_POINTS[value.letter as keyof typeof LETTER_POINTS];
}
function tiles(value: unknown): value is Tile[] { return Array.isArray(value) && value.length <= 100 && value.every(tile); }
function board(value: unknown, hidden = false): value is Record<string, Tile> {
  return object(value) && Object.entries(value).length <= 100 && Object.entries(value).every(([key, value]) => /^-?\d+,-?\d+$/.test(key) && key.split(",").every((part) => String(Number(part)) === part && Number.isSafeInteger(Number(part)) && (hidden ? Math.abs(Number(part)) < 10000 : Number(part) >= 0 && Number(part) < 40)) && tile(value));
}
/** Legacy solo saves migrate losslessly; old virtual-bot saves cannot reconstruct missing tiles. */
export function parseSavedGame(value: unknown): GameState | null {
  if (!object(value)) return null;
  if ("version" in value) {
    if (value.version !== SAVE_VERSION || !object(value.data)) return null;
    value = value.data;
  }
  if (!object(value) || !tiles(value.hand) || !tiles(value.pool) || !board(value.board) || !object(value.settings)) return null;
  if (!finite(value.startedAt) || value.startedAt === 0 || !finite(value.elapsedMs) || value.isComplete !== false || typeof value.isWin !== "boolean") return null;
  if (!["solo","bot"].includes(value.settings.gameMode as string)) return null;
  const settings = parseSettings(value.settings);
  if (JSON.stringify(settings) !== JSON.stringify({ ...settings, ...value.settings })) return null;
  const all = [...value.hand, ...value.pool, ...Object.values(value.board)];
  if (settings.gameMode === "bot") {
    const bot = value.botState;
    if (!object(bot) || !tiles(bot.hand) || !board(bot.board, true) || typeof bot.seed !== "string" || !finite(bot.decision) || !Number.isSafeInteger(bot.decision) || !finite(bot.nextActionAt) || typeof bot.isFinished !== "boolean") return null;
    if (bot.handSize !== bot.hand.length || bot.tilesPlaced !== Object.keys(bot.board).length) return null;
    all.push(...bot.hand, ...Object.values(bot.board));
  }
  if (all.length !== settings.poolSize || new Set(all.map((entry) => entry.id)).size !== all.length) return null;
  const distribution = getDistribution(settings.difficulty, settings.poolSize);
  const actual: Record<string, number> = {};
  for (const tile of all) actual[tile.letter] = (actual[tile.letter] ?? 0) + 1;
  if (Object.entries(distribution).some(([letter, count]) => (actual[letter] ?? 0) !== count)) return null;
  if (value.savedAt !== undefined && !finite(value.savedAt)) return null;
  if (value.sessionId !== undefined && typeof value.sessionId !== "string") return null;
  if (value.invalidTileIds !== undefined && (!Array.isArray(value.invalidTileIds) || !value.invalidTileIds.every((id) => typeof id === "string"))) return null;
  return { ...value, settings } as unknown as GameState;
}
export function parseStats(value: unknown): GameStats {
  if (!object(value) || ![value.totalGames,value.totalWins,value.currentStreak,value.bestStreak].every((n) => finite(n) && Number.isInteger(n)) || !object(value.bestTimes) || !Array.isArray(value.records)) return { ...EMPTY_STATS, bestTimes: {}, records: [] };
  const records = value.records.filter((r) => object(r) && typeof r.id === "string" && typeof r.date === "string" && Number.isFinite(Date.parse(r.date)) && finite(r.durationMs) && ["easy","standard","hard"].includes(r.difficulty as string) && [50,72,100].includes(r.poolSize as number) && typeof r.isWin === "boolean" && finite(r.tilesPlaced) && ["none",5,10,15,30].includes(r.timerMode as number) && (r.gameMode === undefined || ["solo","bot","online"].includes(r.gameMode as string))).slice(-500);
  const bestTimes = Object.fromEntries(Object.entries(value.bestTimes).filter(([key,n]) => /^(easy|standard|hard)-(50|72|100)$/.test(key) && finite(n)));
  const byMode = object(value.byMode) ? Object.fromEntries(Object.entries(value.byMode).filter(([mode, count]) => ["solo", "bot", "online"].includes(mode) && object(count) && finite(count.games) && Number.isInteger(count.games) && finite(count.wins) && Number.isInteger(count.wins) && count.wins <= count.games)) : {};
  return { ...value, records, bestTimes, byMode } as unknown as GameStats;
}
export function decodeStored(key: string, raw: string | null): unknown {
  if (raw === null) return undefined;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return undefined; }
  if (key === "current-game") return parseSavedGame(parsed);
  if (key === "settings") return parseSettings(parsed);
  if (key === "game-stats") return parseStats(parsed);
  return parsed;
}
