import type { Tile, Letter, Difficulty, PoolSize, BoardPosition } from "@/types/game";
import { LETTER_POINTS, posKey, parseKey } from "@/types/game";
import { getDistribution } from "./tile-distribution";

let tileIdCounter = 0;

function createTile(letter: Letter): Tile {
  return {
    id: `tile-${Date.now()}-${tileIdCounter++}`,
    letter,
    points: LETTER_POINTS[letter],
  };
}

export function createTilePool(size: PoolSize, difficulty: Difficulty): Tile[] {
  const dist = getDistribution(difficulty, size);
  const tiles: Tile[] = [];

  for (const [letter, count] of Object.entries(dist)) {
    for (let i = 0; i < count; i++) {
      tiles.push(createTile(letter as Letter));
    }
  }

  return shuffle(tiles);
}

export function drawTiles(pool: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const shuffled = shuffle([...pool]);
  return {
    drawn: shuffled.slice(0, count),
    remaining: shuffled.slice(count),
  };
}

export function exchangeTile(
  pool: Tile[],
  tile: Tile
): { newTiles: Tile[]; remaining: Tile[] } | null {
  if (pool.length < 2) return null;

  const expanded = shuffle([...pool, tile]);
  return {
    newTiles: expanded.slice(0, 2),
    remaining: expanded.slice(2),
  };
}

export function validateBoard(board: Record<string, Tile>): boolean {
  const keys = Object.keys(board);
  if (keys.length === 0) return false;
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
  board: Record<string, Tile>
): boolean {
  return hand.length === 0 && pool.length === 0 && validateBoard(board);
}

export function canPeel(
  hand: Tile[],
  pool: Tile[],
  board: Record<string, Tile>
): boolean {
  return hand.length === 0 && pool.length > 0 && validateBoard(board);
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
