import type { Tile } from "../types/game";
import { parseKey, posKey } from "../types/game";

export interface ExtractedWord {
  word: string;
  keys: string[];
}

export function extractWords(board: Record<string, Tile>): ExtractedWord[] {
  const words: ExtractedWord[] = [];
  // Guard coordinate stepping before iterating untrusted/restored board keys.
  if (Object.keys(board).some((key) => {
    const { row, col } = parseKey(key);
    return !Number.isSafeInteger(row) || !Number.isSafeInteger(col) || key !== posKey(row, col);
  })) return words;

  for (const key of Object.keys(board)) {
    const { row, col } = parseKey(key);

    // Horizontal word: only start if no tile to the left
    if (!board[posKey(row, col - 1)]) {
      const keys: string[] = [];
      let c = col;
      while (board[posKey(row, c)]) {
        keys.push(posKey(row, c));
        c++;
      }
      if (keys.length >= 2) {
        words.push({
          word: keys.map((k) => board[k].letter).join(""),
          keys,
        });
      }
    }

    // Vertical word: only start if no tile above
    if (!board[posKey(row - 1, col)]) {
      const keys: string[] = [];
      let r = row;
      while (board[posKey(r, col)]) {
        keys.push(posKey(r, col));
        r++;
      }
      if (keys.length >= 2) {
        words.push({
          word: keys.map((k) => board[k].letter).join(""),
          keys,
        });
      }
    }
  }

  return words;
}
