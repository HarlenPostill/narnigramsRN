import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { DEFAULT_SETTINGS, LETTER_POINTS, soloSettings, practiceSettings } from "../../types/game";
import type { GameState, Letter, Tile } from "../../types/game";
import { createTilePool, drawTiles, exchangeTile, sharedPeel, validateBoard, validateBoardWords, canSharedPeel } from "../../utils/game-engine";
import { extractWords } from "../../utils/word-extraction";
import { getDistribution } from "../../utils/tile-distribution";
import { createBotState, botTick } from "../../utils/bot-engine";
import { botDifficultyForRating, getBotConfig } from "../../utils/bot-config";
import { gameReducer, INITIAL_STATE, resumeGameState } from "../../utils/game-session";
import { decodeStored, parseSavedGame, parseSettings, SAVE_VERSION } from "../../utils/storage-schema";
const tile = (letter: Letter, id: string = letter): Tile => ({ id, letter, points: LETTER_POINTS[letter] });
const dictionary = new Set(["AT", "CAT", "CATS", "SAT", "AS", "TA", "IT", "IS", "IN", "TIN", "AN", "CAN", "ANT", "TAN"]);
function inventory(state: GameState): string[] {
  return [...state.hand, ...state.pool, ...Object.values(state.board), ...(state.botState?.hand ?? []), ...Object.values(state.botState?.board ?? {})].map((entry) => entry.id).sort();
}
for (const size of [50, 72, 100] as const) for (const difficulty of ["easy", "standard", "hard"] as const) {
  test(`distribution ${size}/${difficulty} is exact and stable`, () => {
    assert.equal(Object.values(getDistribution(difficulty, size)).reduce((sum, n) => sum + n, 0), size);
    const a = createTilePool(size, difficulty, "seed:α");
    assert.deepEqual(a, createTilePool(size, difficulty, "seed:α"));
    assert.equal(new Set(a.map((t) => t.id)).size, size);
    assert.notDeepEqual(a, createTilePool(size, difficulty, "another seed"));
  });
}
test("draw/exchange/peel preserve ordered tile ownership and reject duplicate return", () => {
  const pool = createTilePool(50, "standard", "deal");
  const draw = drawTiles(pool, 11);
  assert.deepEqual(draw.drawn, pool.slice(0, 11));
  assert.throws(() => drawTiles(pool, -1));
  const exchange = exchangeTile(draw.remaining, draw.drawn[0])!;
  assert.deepEqual(exchange.newTiles, draw.remaining.slice(0, 2));
  assert.equal(exchange.remaining.at(-1)?.id, draw.drawn[0].id);
  assert.equal(exchangeTile(pool, pool[0]), null);
  assert.equal(exchangeTile([], draw.drawn[0]), null);
  const peel = sharedPeel(exchange.remaining);
  assert.deepEqual([peel.playerTile, peel.botTile, ...peel.remaining], exchange.remaining);
  assert.throws(() => sharedPeel([]));
});
test("connected crossword extraction and dictionary failures", () => {
  const board = { "0,0": tile("C"), "0,1": tile("A"), "0,2": tile("T"), "1,1": tile("S") };
  assert.equal(validateBoard(board), true);
  assert.deepEqual(extractWords(board).map((w) => w.word).sort(), ["AS", "CAT"]);
  assert.equal(validateBoardWords(board, dictionary).valid, true);
  assert.equal(validateBoardWords(board, new Set(["CAT"])).valid, false);
  assert.equal(validateBoardWords({ "0,0": tile("A") }, dictionary).valid, false);
  assert.equal(validateBoard({ "0,0": tile("A"), "3,3": tile("T") }), false);
  assert.equal(validateBoard({ "NaN,0": tile("A") }), false);
  assert.equal(validateBoardWords({ "9007199254740992,0": tile("A") }, dictionary).valid, false);
  assert.deepEqual(extractWords({ "9007199254740992,0": tile("A") }), []);
  assert.equal(validateBoard({ "0,0": tile("A"), "0,1": tile("A") }), false);
});
test("preset size is independent from timer and distribution", () => {
  assert.deepEqual(["short", "medium", "long"].map((length) => soloSettings(length as "short").poolSize), [50,72,100]);
  const custom = soloSettings("long", { ...DEFAULT_SETTINGS, timerMode: 5, difficulty: "hard" });
  assert.equal(custom.timerMode, 5); assert.equal(custom.difficulty, "hard");
  for (const level of ["easy", "medium", "hard"] as const) assert.equal(practiceSettings(level).botDifficulty, level);
});
test("session tile moves and replay are safe and completion freezes actions", () => {
  const initial = gameReducer(INITIAL_STATE, { type: "INIT", settings: DEFAULT_SETTINGS, seed: "session", now: 1000 });
  const move = { type: "PLACE_TILE", tileId: initial.hand[0].id, row: 0, col: 0 } as const;
  const placed = gameReducer(initial, move);
  assert.equal(gameReducer(placed, move), placed);
  assert.deepEqual(inventory(placed), inventory(initial));
  assert.equal(gameReducer(placed, { ...move, tileId: initial.hand[1].id }), placed);
  assert.equal(gameReducer(placed, { ...move, row: NaN }), placed);
  const returned = gameReducer(placed, { type: "RETURN_TILE", tileId: initial.hand[0].id });
  assert.deepEqual(inventory(returned), inventory(initial));
  const end = gameReducer(returned, { type: "END_GAME", isWin: false });
  assert.equal(gameReducer(end, move), end);
});
test("replaying peel cannot consume twice and invalid dictionary cannot peel", () => {
  const board = { "0,0": tile("A"), "0,1": tile("T") };
  const s = { ...INITIAL_STATE, board, pool: createTilePool(50, "easy", "pool") };
  assert.equal(gameReducer(s, { type: "PEEL", dictionary: new Set() }), s);
  const peeled = gameReducer(s, { type: "PEEL", dictionary });
  assert.equal(peeled.hand.length, 1);
  assert.equal(gameReducer(peeled, { type: "PEEL", dictionary }), peeled);
  assert.equal(canSharedPeel([], [tile("A")], board), false);
});
for (const level of ["easy", "medium", "hard"] as const) test(`${level} bot uses deterministic real tiles and only valid terminal boards`, () => {
  const bot = createBotState([tile("C"), tile("A"), tile("T")], "bot", 0);
  const result = botTick(bot, getBotConfig(level), [], 2000, dictionary);
  assert.deepEqual(result, botTick(bot, getBotConfig(level), [], 2000, dictionary));
  assert.equal(result.action, "place");
  assert.equal(result.newState.hand.length, 0);
  assert.equal(validateBoardWords(result.newState.board, dictionary).valid, true);
  assert.equal(botTick(result.newState, getBotConfig(level), [], result.newState.nextActionAt, dictionary).action, "finish");
});
test("practice all actions conserve shared pool over seeded simulation", () => {
  const words = new Set(readFileSync(new URL("../../assets/words.txt", import.meta.url), "utf8").toUpperCase().trim().split(/\r?\n/));
  let state = gameReducer(INITIAL_STATE, { type: "INIT", settings: practiceSettings("hard"), seed: "conservation", now: 100 });
  const original = inventory(state);
  for (let i = 0; i < 120 && !state.isComplete; i++) {
    state = gameReducer(state, { type: "BOT_TICK", now: state.botState!.nextActionAt, dictionary: words });
    assert.deepEqual(inventory(state), original);
    if (Object.keys(state.botState!.board).length) assert.equal(validateBoardWords(state.botState!.board, words).valid, true);
  }
  assert.equal(state.isComplete, true);
  assert.equal(state.botState!.hand.length, 0);
  assert.ok(state.pool.length < 2);
});
test("bot skill policy increases pacing and search quality", () => {
  assert.ok(getBotConfig("easy").minTileDelay > getBotConfig("hard").maxTileDelay);
  assert.ok(getBotConfig("easy").searchBudget < getBotConfig("hard").searchBudget);
  assert.deepEqual([100,800,1600].map(botDifficultyForRating), ["easy","medium","hard"]);
});
test("versioned save migration rejects corruption and impossible ownership", () => {
  const state = gameReducer(INITIAL_STATE, { type: "INIT", settings: DEFAULT_SETTINGS, seed: "save", now: 100 });
  assert.deepEqual(parseSavedGame(state), state);
  assert.deepEqual(parseSavedGame({ version: SAVE_VERSION, data: state }), state);
  assert.equal(parseSavedGame({ version: 99, data: state }), null);
  assert.equal(parseSavedGame({ ...state, hand: [state.pool[0], ...state.hand.slice(1)] }), null);
  assert.equal(parseSavedGame({ ...state, settings: { ...state.settings, gameMode: "bot" }, botState: { handSize: 15 } }), null);
  assert.equal(decodeStored("current-game", "{bad"), undefined);
  assert.equal(parseSettings({ poolSize: 666 }).poolSize, DEFAULT_SETTINGS.poolSize);
  assert.deepEqual(decodeStored("game-stats", '{"records":null}'), { totalGames: 0, totalWins: 0, currentStreak: 0, bestStreak: 0, bestTimes: {}, records: [] });
});
test("winning requires legal words, empty hand and exhausted dealable pool", () => {
  const board = { "0,0": tile("A"), "0,1": tile("T") };
  const state = { ...INITIAL_STATE, board };
  assert.equal(gameReducer(state, { type: "END_GAME", isWin: true }),state);
  assert.equal(gameReducer(state, { type: "END_GAME", isWin: true, dictionary: new Set() }),state);
  assert.equal(gameReducer({ ...state, hand: [tile("S")] }, { type: "END_GAME", isWin: true, dictionary }).isComplete,false);
  assert.equal(gameReducer({ ...state, pool: [tile("S")] }, { type: "END_GAME", isWin: true, dictionary }).isComplete,false);
  assert.equal(gameReducer(state, { type: "END_GAME", isWin: true, dictionary }).isWin,true);
  assert.equal(gameReducer({ ...state, settings: practiceSettings("easy"), pool: [tile("S")] }, { type: "END_GAME", isWin: true, dictionary }).isWin,true);
});

test("placement coordinates match the forty-cell playfield", () => {
  const state = gameReducer(INITIAL_STATE, { type: "INIT", settings: DEFAULT_SETTINGS, seed: "bounds", now: 100 });
  for (const row of [-1, 40, Infinity, 0.5]) assert.equal(gameReducer(state, { type: "PLACE_TILE", tileId: state.hand[0].id, row, col: 0 }), state);
  const placed = gameReducer(state, { type: "PLACE_TILE", tileId: state.hand[0].id, row: 39, col: 39 });
  assert.equal(Object.keys(placed.board).length,1);
  assert.equal(gameReducer(placed, { type: "MOVE_TILE", tileId: state.hand[0].id, row: 40, col: 0 }),placed);
});
test("saved game rejects forged letter economy and out-of-bounds board", () => {
  const state = gameReducer(INITIAL_STATE, { type: "INIT", settings: DEFAULT_SETTINGS, seed: "letters", now: 100 });
  const forged = { ...state, hand: [tile(state.hand[0].letter === "A" ? "Z" : "A", state.hand[0].id), ...state.hand.slice(1)] };
  assert.equal(parseSavedGame(forged),null);
  assert.equal(parseSavedGame({ ...state, hand: state.hand.slice(1), board: { "40,0": state.hand[0] } }),null);
});
test("practice background and resume preserve remaining decision time", () => {
  const state = gameReducer(INITIAL_STATE, { type: "INIT", settings: practiceSettings("hard"), seed: "pause", now: 1000 });
  const resumed = resumeGameState({ ...state, savedAt: 1500 }, 100000);
  assert.equal(resumed.botState!.nextActionAt,101500);
  assert.deepEqual(inventory(resumed),inventory(state));
  const foreground = gameReducer(state, { type: "SHIFT_BOT_DEADLINE", delayMs: 60000 });
  assert.equal(foreground.botState!.nextActionAt,63000);
  assert.equal(gameReducer(state, { type: "SHIFT_BOT_DEADLINE", delayMs: -1 }),state);
  assert.equal(parseSavedGame({ ...resumed, savedAt: 100000 })?.botState?.nextActionAt,101500);
});
test("Easy explores beyond a stuck lexical prefix and can finish a full deal", () => {
  const words = new Set(readFileSync(new URL("../../assets/words.txt", import.meta.url), "utf8").toUpperCase().trim().split(/\r?\n/));
  let state = gameReducer(INITIAL_STATE, { type: "INIT", settings: practiceSettings("easy"), seed: "conservation", now: 0 });
  const original = inventory(state);
  let now = 0;
  // Before the exploration fix this seed rebuilt 56 times without finishing in 300 decisions.
  for (let decisions = 0; decisions < 120 && !state.isComplete; decisions++) {
    now = Math.ceil(state.botState!.nextActionAt / 500) * 500;
    state = gameReducer(state, { type: "BOT_TICK", now, dictionary: words });
    assert.deepEqual(inventory(state), original);
  }
  assert.equal(state.isComplete, true);
  assert.equal(state.botState!.hand.length, 0);
  assert.equal(validateBoardWords(state.botState!.board, words).valid, true);
  assert.ok(now < 20 * 60 * 1000);
});
