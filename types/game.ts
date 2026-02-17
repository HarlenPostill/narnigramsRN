export type Letter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

export interface Tile {
  id: string;
  letter: Letter;
  points: number;
}

export interface BoardPosition {
  row: number;
  col: number;
}

export type BoardPlacements = Map<string, Tile>; // key: "row,col"

export function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseKey(key: string): BoardPosition {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

export type Difficulty = "easy" | "standard" | "hard";
export type PoolSize = 50 | 72 | 100;
export type HandSize = 11 | 15 | 21;
export type TimerMode = "none" | 5 | 10 | 15 | 30;

export interface GameSettings {
  poolSize: PoolSize;
  handSize: HandSize;
  difficulty: Difficulty;
  timerMode: TimerMode;
  showTimer: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  poolSize: 72,
  handSize: 15,
  difficulty: "standard",
  timerMode: "none",
  showTimer: true,
};

export interface GameState {
  hand: Tile[];
  pool: Tile[];
  board: Record<string, Tile>; // serializable version of BoardPlacements
  startedAt: number;
  elapsedMs: number;
  settings: GameSettings;
  isComplete: boolean;
  isWin: boolean;
}

export interface GameRecord {
  id: string;
  date: string;
  durationMs: number;
  difficulty: Difficulty;
  poolSize: PoolSize;
  timerMode: TimerMode;
  isWin: boolean;
  tilesPlaced: number;
}

export interface GameStats {
  totalGames: number;
  totalWins: number;
  currentStreak: number;
  bestStreak: number;
  bestTimes: Partial<Record<`${Difficulty}-${PoolSize}`, number>>;
  records: GameRecord[];
}

export const LETTER_POINTS: Record<Letter, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};
