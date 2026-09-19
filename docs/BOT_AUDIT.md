# Practice bot audit

The bot holds actual tiles and a hidden crossword. Every placed word and crossing is checked with the same bundled dictionary as the player. Exchanges return one owned tile and draw two from the ordered shared pool; peels give one tile to each participant. Completion requires an empty bot hand, a valid connected board, and fewer than two shared-pool tiles remaining. The final unshareable tile remains in the pool.

## Search and difficulty

| Level | Delay per added tile | Maximum word length | Placement attempts per decision | Candidate limit |
| --- | --- | --- | --- | --- |
| Easy | 3–5 seconds | 6 | 250 | 200 |
| Medium | 1.5–3 seconds | 8 | 250 | 400 |
| Hard | 0.8–1.5 seconds | 12 | 800 | 1,000 |

Seeded decisions rotate across the complete set of eligible words within each word-length band, then rotate board anchors. Each band receives a bounded candidate allocation, with longer words attempted first. This keeps the search bounded while allowing a stuck bot to explore new choices. An earlier implementation only rotated the first eight lexical candidates and always started at the same board edge; Easy repeatedly exhausted its smaller search budget without reaching useful choices. On the audit seeds, that version finished only one of ten games within 300 decisions.

A failed search can exchange from a nonempty shared pool or rebuild using the same owned tiles. These are actual decisions, not counter-based simulated progress. No invalid board or timeout can manufacture a win. The bounded search does not guarantee a solution for every deal. Bots pause while the app is inactive and retain their remaining thinking delay across foregrounding and saved-game resume.

## Reproduce

```sh
npx tsx scripts/audit-bots.ts
npx tsx scripts/audit-bots.ts --level=hard --seed=conservation
```

The audit uses the checked-in ESDB dictionary and virtual 500ms foreground polling, matching the game's polling cadence. It makes no Firebase calls, performs no player moves, stops after 300 decisions, and verifies tile conservation and dictionary validity after every decision.

Results for ten fixed seeds (`conservation`, `audit-1` through `audit-9`), after the exploration fix and difficulty tuning:

| Level | Completed within cap | Decision range | Simulated foreground time range |
| --- | --- | --- | --- |
| Easy | 10 / 10 | 47–95 | 4:13.5–17:08 |
| Medium | 10 / 10 | 45–58 | 2:19–4:20 |
| Hard | 10 / 10 | 52–73 | 2:05.5–4:38.5 |

This is a deterministic regression sample, not a completion guarantee or a calibrated human skill measurement. Player peels/exchanges alter the tile economy and therefore change the result. Real browser/device scheduling and dictionary startup add timing overhead.

## Browser completion fixture

Open the running web app at `/game?fallback=true&seed=conservation&botDifficulty=hard`. Keep it visible and make no player moves. The virtual-clock expectation is 60 bot decisions over 173.5 seconds (approximately three foreground minutes), ending with 39 bot board tiles, no bot hand tiles, and one shared-pool tile. The truthful AI fallback result is a player loss and has no public rating effect.

For a shorter fixture, use `seed=audit-9`: 54 decisions over 125.5 seconds, also ending with 39 bot board tiles and one pool tile. Neither fixture changes clocks or bypasses gameplay validation.
