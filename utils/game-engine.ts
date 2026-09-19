import type { Difficulty, Letter, PoolSize, Tile } from "../types/game";
import { LETTER_POINTS, parseKey, posKey } from "../types/game";
import { getDistribution } from "./tile-distribution";
import { seededShuffle } from "./seeded-random";
import { extractWords } from "./word-extraction";

export function createTilePool(
  size: PoolSize,
  difficulty: Difficulty,
  seed?: string,
): Tile[] {
  const identity = seed ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dist = getDistribution(difficulty, size);
  const tiles: Tile[] = [];

  for (const [letter, count] of Object.entries(dist)) {
    for (let i = 0; i < count; i++) {
      tiles.push({ id: `tile:${encodeURIComponent(identity)}:${size}:${difficulty}:${tiles.length}`, letter: letter as Letter, points: LETTER_POINTS[letter as Letter] });
    }
  }

  return seededShuffle(tiles, identity);
}

export function drawTiles(
  pool: Tile[],
  count: number,
): { drawn: Tile[]; remaining: Tile[] } {
  if (!Number.isInteger(count) || count < 0) throw new Error("Invalid draw count");
  return {
    drawn: pool.slice(0, count),
    remaining: pool.slice(count),
  };
}

export function exchangeTile(
  pool: Tile[],
  tile: Tile,
): { newTiles: Tile[]; remaining: Tile[] } | null {
  if (pool.length < 2) return null;

  if (pool.some((entry) => entry.id === tile.id)) return null;
  const expanded = [...pool, tile];
  return {
    newTiles: expanded.slice(0, 2),
    remaining: expanded.slice(2),
  };
}

export function validateBoard(board: Record<string, Tile>): boolean {
  const keys = Object.keys(board);
  if (keys.length === 0) return false;
  if (keys.some((key) => !/^-?\d+,-?\d+$/.test(key) || !Object.values(parseKey(key)).every(Number.isSafeInteger))) return false;
  if (new Set(Object.values(board).map((tile) => tile.id)).size !== keys.length) return false;
  if (keys.length === 1) return true;

  const visited = new Set<string>();
  const queue: string[] = [keys[0]];
  visited.add(keys[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { row, col } = parseKey(current);
    const neighbors = [
      posKey(row - 1, col),
      posKey(row + 1, col),
      posKey(row, col - 1),
      posKey(row, col + 1),
    ];

    for (const n of neighbors) {
      if (board[n] && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  return visited.size === keys.length;
}

export function checkWinCondition(
  hand: Tile[],
  pool: Tile[],
  board: Record<string, Tile>,
): boolean {
  return hand.length === 0 && pool.length === 0 && validateBoard(board);
}

export function canPeel(
  hand: Tile[],
  pool: Tile[],
  board: Record<string, Tile>,
): boolean {
  return hand.length === 0 && pool.length > 0 && validateBoard(board);
}

export function canSharedPeel(
  hand: Tile[],
  pool: Tile[],
  board: Record<string, Tile>,
): boolean {
  return hand.length === 0 && pool.length >= 2 && validateBoard(board);
}

export function sharedPeel(pool: Tile[]): {
  playerTile: Tile;
  botTile: Tile;
  remaining: Tile[];
} {
  if (pool.length < 2) throw new Error("Shared peel requires two tiles");
  return {
    playerTile: pool[0],
    botTile: pool[1],
    remaining: pool.slice(2),
  };
}

export function validateBoardWords(
  board: Record<string, Tile>,
  dictionary: Set<string>,
): { valid: boolean; invalidKeys: Set<string> } {
  if (!validateBoard(board)) return { valid: false, invalidKeys: new Set(Object.keys(board)) };
  const words = extractWords(board);
  const invalidKeys = new Set<string>();
  if (words.length === 0) {
    return { valid: false, invalidKeys: new Set(Object.keys(board)) };
  }

  for (const { word, keys } of words) {
    if (!dictionary.has(word.toUpperCase())) {
      for (const k of keys) invalidKeys.add(k);
    }
  }

  return { valid: invalidKeys.size === 0, invalidKeys };
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
