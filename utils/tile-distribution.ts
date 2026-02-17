import type { Difficulty, Letter } from "@/types/game";

// Official Bananagrams distribution for 144 tiles
const STANDARD_144: Record<Letter, number> = {
  A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12,
  J: 2, K: 2, L: 5, M: 3, N: 8, O: 11, P: 3, Q: 2, R: 9,
  S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2,
};

// Easy: boost vowels and common consonants
const EASY_144: Record<Letter, number> = {
  A: 16, B: 2, C: 2, D: 5, E: 22, F: 2, G: 3, H: 2, I: 14,
  J: 1, K: 1, L: 6, M: 3, N: 10, O: 13, P: 2, Q: 1, R: 10,
  S: 7, T: 10, U: 7, V: 1, W: 1, X: 1, Y: 2, Z: 0,
};

// Hard: fewer vowels, more uncommon letters
const HARD_144: Record<Letter, number> = {
  A: 10, B: 4, C: 4, D: 6, E: 14, F: 4, G: 5, H: 4, I: 9,
  J: 3, K: 3, L: 5, M: 4, N: 7, O: 8, P: 4, Q: 3, R: 8,
  S: 6, T: 8, U: 4, V: 4, W: 4, X: 3, Y: 4, Z: 3,
};

const DISTRIBUTIONS: Record<Difficulty, Record<Letter, number>> = {
  easy: EASY_144,
  standard: STANDARD_144,
  hard: HARD_144,
};

export function getDistribution(
  difficulty: Difficulty,
  poolSize: number
): Record<Letter, number> {
  const base = DISTRIBUTIONS[difficulty];
  const baseTotal = Object.values(base).reduce((a, b) => a + b, 0);
  const scale = poolSize / baseTotal;

  const result: Partial<Record<Letter, number>> = {};
  let total = 0;

  for (const [letter, count] of Object.entries(base)) {
    const scaled = Math.round(count * scale);
    result[letter as Letter] = scaled;
    total += scaled;
  }

  // Adjust to match exact pool size by adding/removing from E (most common)
  const diff = poolSize - total;
  result.E = Math.max(1, (result.E ?? 1) + diff);

  return result as Record<Letter, number>;
}
