import type { GameRecord, GameStats } from "@/types/game";
import { addRecord, emptyStats } from "../shared/stats";
import { storage } from "./storage";
let owner: string | null = null;
export function statsKey(uid: string | null) {
  return uid ? `account-stats-${uid}` : "game-stats";
}
export function setStatsOwner(uid: string | null) {
  owner = uid;
}
export function pendingKey(uid: string) {
  return `pending-stats-${uid}`;
}
export function recordGame(record: GameRecord) {
  const stats = getGameStats();
  if (stats.records.some((r) => r.id === record.id)) return;
  storage.set(statsKey(owner), addRecord(stats, record));
  if (owner && record.gameMode !== "online") {
    const key = pendingKey(owner);
    storage.set(key, [...storage.get<GameRecord[]>(key, []), record]);
  }
}
export function getGameStats(): GameStats {
  return storage.get(statsKey(owner), emptyStats());
}
export function getRecentGames(days: number): GameRecord[] {
  const cutoff = Date.now() - days * 86400000;
  return getGameStats().records.filter((r) => Date.parse(r.date) >= cutoff);
}
export function getAveragePlayTime(): number {
  const records = getGameStats().records;
  return records.length
    ? records.reduce((sum, r) => sum + r.durationMs, 0) / records.length
    : 0;
}
