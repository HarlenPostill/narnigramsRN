import type { BotState, Tile } from "../types/game";
import { parseKey, posKey } from "../types/game";
import type { BotConfig } from "./bot-config";
import { getNextActionDelay } from "./bot-config";
import { exchangeTile, sharedPeel, validateBoardWords } from "./game-engine";
import { hashSeed, mulberry32 } from "./seeded-random";

export type BotAction = "none" | "place" | "exchange" | "peel" | "finish" | "think";
export function createBotState(hand: Tile[], seed = "practice", now = 0): BotState {
  return { hand, board: {}, seed, decision: 0, handSize: hand.length, tilesPlaced: 0, isFinished: false, nextActionAt: now + 2000 };
}
export function withBotTiles(state: BotState, hand: Tile[], board = state.board): BotState {
  return { ...state, hand, board, handSize: hand.length, tilesPlaced: Object.keys(board).length };
}
const wordCache = new WeakMap<Set<string>, string[]>();
function wordsFor(dictionary: Set<string>): string[] {
  let words = wordCache.get(dictionary);
  if (!words) {
    words = [...dictionary].filter((word) => /^[A-Z]{2,12}$/.test(word)).sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
    wordCache.set(dictionary, words);
  }
  return words;
}
/** Bounded crossword search. Every candidate uses owned tiles and validates all crosswords. */
function findPlacement(state: BotState, config: BotConfig, dictionary: Set<string>, random: () => number) {
  const boardEntries = Object.entries(state.board);
  const counts: Record<string, number> = {};
  for (const tile of state.hand) counts[tile.letter] = (counts[tile.letter] ?? 0) + 1;
  const candidates = wordsFor(dictionary).filter((word) => {
    if (word.length > config.maxWordLength || word.length > state.hand.length + (boardEntries.length ? 1 : 0)) return false;
    const needed: Record<string, number> = {};
    for (const char of word) needed[char] = (needed[char] ?? 0) + 1;
    const missing = Object.entries(needed).reduce((n, [letter, count]) => n + Math.max(0, count - (counts[letter] ?? 0)), 0);
    return missing <= (boardEntries.length ? 1 : 0);
  });
  // Rotate within every length band, not just a fixed lexical prefix. A stuck
  // bot can explore new words on later decisions without increasing its budget.
  const ordered: string[] = [];
  const perLength = Math.max(1, Math.floor(config.candidateLimit / (config.maxWordLength - 1)));
  for (let length = config.maxWordLength; length >= 2; length--) {
    const band = candidates.filter((word) => word.length === length);
    if (!band.length) continue;
    const shift = Math.floor(random() * band.length);
    ordered.push(...[...band.slice(shift), ...band.slice(0, shift)].slice(0, perLength));
  }
  const anchorShift = Math.floor(random() * boardEntries.length);
  const rotatedAnchors = [...boardEntries.slice(anchorShift), ...boardEntries.slice(0, anchorShift)];
  let inspected = 0;
  for (const word of ordered) {
    const anchors = boardEntries.length ? rotatedAnchors : [["0,0", null] as const];
    for (const [key, anchor] of anchors) {
      const origin = parseKey(key);
      for (let index = 0; index < word.length; index++) {
        if (anchor ? anchor.letter !== word[index] : index !== 0) continue;
        for (const vertical of [false, true]) {
          if (++inspected > config.searchBudget) return null;
          const board = { ...state.board };
          const hand = [...state.hand];
          let added = 0;
          let possible = true;
          for (let i = 0; i < word.length; i++) {
            const cell = posKey(origin.row + (vertical ? i - index : 0), origin.col + (vertical ? 0 : i - index));
            if (board[cell]) { if (board[cell].letter !== word[i]) possible = false; continue; }
            const tileIndex = hand.findIndex((tile) => tile.letter === word[i]);
            if (tileIndex < 0) { possible = false; break; }
            board[cell] = hand.splice(tileIndex, 1)[0];
            added++;
          }
          if (possible && added > 0 && validateBoardWords(board, dictionary).valid) return { board, hand, added };
        }
      }
    }
  }
  return null;
}
export function botTick(state: BotState, config: BotConfig, pool: Tile[], now: number, dictionary: Set<string>): {
  newState: BotState; action: BotAction; pool: Tile[]; playerTile?: Tile;
} {
  if (state.isFinished || now < state.nextActionAt || dictionary.size === 0) return { newState: state, action: "none", pool };
  const random = mulberry32(hashSeed(`${state.seed}:${state.decision}`));
  const delay = getNextActionDelay(config, random);
  const next = { ...state, decision: state.decision + 1, nextActionAt: now + delay };
  if (state.hand.length === 0 && validateBoardWords(state.board, dictionary).valid) {
    if (pool.length < 2) return { newState: { ...next, isFinished: true }, action: "finish", pool };
    const peel = sharedPeel(pool);
    return { newState: withBotTiles(next, [peel.botTile]), action: "peel", pool: peel.remaining, playerTile: peel.playerTile };
  }
  const placement = findPlacement(state, config, dictionary, random);
  if (placement) return { newState: withBotTiles({ ...next, nextActionAt: now + delay * placement.added }, placement.hand, placement.board), action: "place", pool };
  if (pool.length >= 2 && state.hand.length > 0) {
    const tile = [...state.hand].sort((a, b) => b.points - a.points || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
    const exchange = exchangeTile(pool, tile);
    if (exchange) return { newState: withBotTiles(next, [...state.hand.filter((entry) => entry.id !== tile.id), ...exchange.newTiles]), action: "exchange", pool: exchange.remaining };
  }
  // Rebuild a stuck crossword with the same real tiles. Never fabricate a win.
  return { newState: withBotTiles(next, [...state.hand, ...Object.values(state.board)], {}), action: "think", pool };
}
