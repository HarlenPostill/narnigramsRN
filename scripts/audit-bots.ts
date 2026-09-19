/** Deterministic, foreground-only bot audit. No Firebase credentials or browser needed.
 * npx tsx scripts/audit-bots.ts --level=hard --seed=conservation
 * Omitting flags audits ten seeds at each difficulty, capped at 300 decisions.
 */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { gameReducer, INITIAL_STATE } from '../utils/game-session';
import { validateBoardWords } from '../utils/game-engine';
import { practiceSettings, type BotDifficulty, type GameState } from '../types/game';
const dictionary = new Set(readFileSync(new URL('../assets/words.txt', import.meta.url), 'utf8').toUpperCase().trim().split(/\r?\n/));
const flag = (name: string) => process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const requestedLevel = flag('level');
if (requestedLevel && !['easy', 'medium', 'hard'].includes(requestedLevel)) throw new Error('level must be easy, medium or hard');
const levels: BotDifficulty[] = requestedLevel ? [requestedLevel as BotDifficulty] : ['easy', 'medium', 'hard'];
const seeds = flag('seed') ? [flag('seed')!] : ['conservation', ...Array.from({ length: 9 }, (_, index) => `audit-${index + 1}`)];
const inventory = (state: GameState) => [...state.hand, ...state.pool, ...Object.values(state.board), ...state.botState!.hand, ...Object.values(state.botState!.board)].map((tile) => tile.id).sort().join('|');
for (const level of levels) {
  const results = seeds.map((seed) => {
    let state = gameReducer(INITIAL_STATE, { type: 'INIT', settings: practiceSettings(level), seed, now: 0 });
    const original = inventory(state);
    let decisions = 0;
    let now = 0;
    let rebuilds = 0;
    while (decisions < 300 && !state.isComplete) {
      // Mirrors GameSurface's foreground 500ms bot polling, using a virtual clock.
      now = Math.ceil(state.botState!.nextActionAt / 500) * 500;
      const previousBoardSize = state.botState!.tilesPlaced;
      state = gameReducer(state, { type: 'BOT_TICK', now, dictionary });
      if (previousBoardSize > 0 && state.botState!.tilesPlaced === 0) rebuilds++;
      if (inventory(state) !== original) throw new Error(`Tile conservation failed: ${level}/${seed}`);
      if (state.botState!.tilesPlaced > 0 && !validateBoardWords(state.botState!.board, dictionary).valid) throw new Error(`Invalid board: ${level}/${seed}`);
      decisions++;
    }
    return { seed, completed: state.isComplete, decisions, seconds: now / 1000, rebuilds, pool: state.pool.length, botHand: state.botState!.handSize, botBoard: state.botState!.tilesPlaced };
  });
  console.log(`${level}: ${results.filter((result) => result.completed).length}/${results.length} completed`);
  console.table(results);
}
