# Narnigrams revival — implementation prompt for GPT Astra

You are the lead engineer responsible for reviving and completing the Narnigrams mobile game in this repository. Work directly in the repository and carry the implementation through to a verified, maintainable result. Do not merely write a plan or produce pseudocode.

## Product intent

Narnigrams is an original word-tile game inspired by the general real-time crossword-tile genre. The app needs a careful cleanup and three clear game modes:

1. **Solo** — Short, Medium, and Long games, where the primary difference is the number of tiles in the deck. Preserve the existing 50 / 72 / 100 tile sizes unless repository evidence or tests reveal a compelling reason to change them. Keep game length distinct from letter-distribution difficulty and timer settings.
2. **Practice vs bot** — Easy, Medium, and Hard. The bot must participate in the same shared tile economy, drawing and exchanging from the pool through valid game-engine transitions. It may keep its board hidden, but it must have real deterministic state rather than only decrementing counters disconnected from actual tiles. Difficulty should be explicit, testable, and primarily affect decision quality and pacing.
3. **Ranked online matchmaking** — Firebase-backed realtime matchmaking and game updates with a refined chess-style ELO system. Search for the best available human opponent by rating. If no acceptable human match is secured within 10 seconds, atomically leave the human queue and start a rating-appropriate AI fallback match. Never leave a player simultaneously eligible for a late human match. Do not falsely claim the AI is a human; identify it as an AI/fallback opponent in an unobtrusive but truthful way, and state clearly whether the match affects rating.

The user wants Supabase removed and Firebase used instead. “Firebase is cheaper” is a motivation, not an instruction to trade away correctness or create unbounded reads/writes. Design for low idle cost, bounded listeners, batched/transactional operations, cleanup, and emulator-driven local development.

## Mandatory working style

- Begin by inspecting the current repository, git status, recent history, package versions, and all files named below. Treat this prompt as a high-quality map, not a substitute for reading the code.
- Use the repository’s `vercel-react-native-skills` and `app-store-review` skills. Read their `SKILL.md` files and the rule files relevant to every area you touch.
- Use subagents where they provide real parallel value. A good split is:
  - React Native/UI/performance and repository hygiene audit.
  - Game engine, mode modeling, bot behavior, ELO, and deterministic tests.
  - Firebase architecture, Functions, Firestore rules, emulator tests, matchmaking concurrency, and migration/removal of Supabase.
  - App Store/privacy/UGC/IP/readiness audit.
  Have the lead agent own the architecture, resolve conflicts, integrate changes, and run the final verification. Avoid assigning multiple agents to edit the same files concurrently.
- Preserve unrelated user changes. The working tree is currently dirty: several old `.agents/skills/feature-demo` and Supabase skill files are deleted. Those deletions belong to the user; do not restore or modify them unless explicitly necessary.
- Prefer incremental, reviewable phases. Keep the app runnable after each phase. Do not rewrite working drag/drop gameplay or visual design without a concrete reason.
- Make reasonable product assumptions and record them in the README or an architecture decision document. Ask the user only if a decision is irreversible, costly, or genuinely changes product intent.
- Never expose secrets in output. Do not print `.env` values.

## Verified repository baseline

- Working directory: `/Users/harlenpostill/Documents/Github/narnigrams`
- Current branch/commit at prompt creation: `develop` at `57f2c97` (`new agent skills`).
- Expo SDK `~54.0.33`, React Native `0.81.5`, React `19.1.0`, TypeScript `~5.9.2` in strict mode.
- Expo Router `~6.0.23`; React Compiler and the new architecture are enabled in `app.json`.
- Native tabs are already used through `expo-router/unstable-native-tabs`; route stacks use Expo Router’s native stack.
- Reanimated, Gesture Handler, `expo-image`, `expo-sqlite`, and platform-aware UI are already present.
- Baseline `npm run lint` and `npx tsc --noEmit` both pass.
- There is no test script or test framework in `package.json`.
- The README is still the create-expo-app boilerplate.
- There is no `eas.json` and no documented Firebase/emulator/deployment workflow.
- `.env` is currently tracked by git and contains the old Supabase public configuration. Do not display it. Untrack it, add safe ignore patterns plus a redacted `.env.example`, and explicitly tell the user to rotate/revoke the old Supabase credentials because they exist in git history. Do not attempt destructive history rewriting unless the user specifically authorizes it.

## Current code map and behavior

### App structure and navigation

- `app/_layout.tsx` installs `Theme`, `AuthProvider`, native Play/Stats/Settings tabs, `UsernameModal`, and `StatusBar`.
- `app/(play)/_layout.tsx` defines the home, rank, matchmaking queue, and full-screen game routes.
- `app/(play)/index.tsx` currently mixes ranked entry, an offline entry, solo presets, bot presets, saved-game resume, local stats, and ELO display.
- `app/(play)/queue.tsx` runs Supabase matchmaking, subscribes to one queued row, resolves opponent details, and passes a JSON-serialized `OnlineGameState` through router params.
- `app/(play)/game.tsx` is a large orchestration screen handling offline/online hook selection, timer, autosave, 100 ms bot ticking, drag/drop coordinate conversion, game actions, overlays, and result modals.
- `app/(play)/rank.tsx`, `components/rank/rank-ladder.tsx`, and `utils/elo.ts` implement/display rating, but the rank thresholds conflict: the ladder displays 300/600/900/1200/1500 while `getRank` uses 0/400/800/1200/1600/2000.
- `app/(settings)/index.tsx` stores offline game settings locally. It currently exposes solo/bot as a setting even though the home screen also presents them as presets.
- `app/(stats)/index.tsx` and `utils/stats-manager.ts` maintain device-local aggregate stats and records.

### Game engine

- `types/game.ts` contains `Tile`, `GameSettings`, `GameState`, bot/player/online types, and the current mode unions.
- Current pool sizes are 50, 72, and 100; starting hand sizes are 11, 15, and 21.
- `utils/tile-distribution.ts` scales 144-tile easy/standard/hard distributions down to each pool size.
- `utils/game-engine.ts` creates tiles, draws/exchanges, checks board connectivity, handles shared peels, and validates words.
- `utils/seeded-random.ts` provides deterministic shuffle from a string seed.
- Important determinism bug: `createTilePool` uses `Date.now()` and a module-level counter for tile IDs even when the letter order is seeded. Different clients do not receive stable identical tile identities. Replace this with deterministic, collision-safe IDs derived from seed/index for seeded games, and test it.
- `utils/word-extraction.ts`, `utils/dictionary.ts`, and `assets/words.txt` implement local word validation. The dictionary source/license is undocumented and must be investigated/documented before App Store submission.
- `hooks/use-game.ts` is a reducer-backed game facade. It initializes solo, bot, or online state and provides place/move/return/exchange/peel/tick/end/validation actions.
- Current bot logic in `utils/bot-engine.ts` and `utils/bot-config.ts` is a timing/counter simulation. It reserves tiles by slicing the pool but does not retain actual bot tiles or construct/validate a bot board. Exchanges and peels alter counts/pool slices. Replace or formalize this with a deterministic, testable opponent model operating on real tile state.
- `app/(play)/game.tsx` creates both `useGame()` and `useOnlineGame()` every render and chooses one, so the unused path still mounts effects such as dictionary loading. Refactor toward one explicit session/controller without violating hook rules.
- Offline autosave depends on only a subset of state fields even though `saveGame` closes over the full state. Audit persistence correctness and version stored schemas so stale saves cannot crash after the model changes.
- `useTimer` receives inline callbacks and runs at 100 ms; the bot also ticks at 100 ms. Audit unnecessary render/update frequency and background/foreground correctness.

### Existing Supabase online implementation

- `lib/supabase.ts` creates a Supabase client using Expo public environment variables and SQLite-backed `localStorage`.
- `hooks/use-auth.ts` silently signs in anonymously, creates/loads a player, and shows the username modal when the generated name starts with `Player`.
- `lib/player-service.ts` reads/creates players and changes usernames.
- `lib/matchmaking.ts` queries the ten oldest queued games, filters them client-side within an ELO range of 200, attempts an optimistic row update, or inserts a queue row.
- `hooks/use-online-game.ts` subscribes to inserted `peel`, `finish`, `forfeit`, and `heartbeat` events, sends heartbeats every 10 seconds, and declares disconnect/auto-win client-side after 30/60 seconds.
- `supabase-schema.sql` defines game events, RLS, and a `finish_game` RPC that updates ELO in a transaction.
- Online games currently use fixed 72 tiles / 15 starting tiles / standard distribution.
- Major trust/concurrency issues to fix in the Firebase design:
  - Clients can announce finish/forfeit and drive local outcomes without authoritative validation.
  - Existing event inserts do not robustly prove membership for the referenced game.
  - Matchmaking selection/claiming is not one atomic server-owned operation.
  - Peels have no authoritative sequence/idempotency key; simultaneous or repeated events can desynchronize pools.
  - Heartbeat-based auto-win is client-decided.
  - Routing the entire session as JSON params is fragile and can be stale; route by match ID and resolve session state from a typed store/listener.
  - Result UI does not consistently refresh/show ELO deltas, and a forfeiting client does not call the ELO-finishing RPC.

## Target architecture

Use Firebase’s modular SDKs and pick Expo-compatible packages deliberately. Verify current official Firebase and Expo guidance before adding dependencies. Document why the chosen approach works in development builds and production; do not assume Expo Go supports every native Firebase package.

At minimum, provide:

- Firebase Authentication with anonymous play supported so Solo and Practice never require a login wall. Decide whether anonymous identities are automatically created only when Ranked is opened or at app launch; prefer data minimization and offline-first behavior.
- Cloud Firestore for player profiles, queue tickets, matches, presence/lease data, and bounded match events/state.
- Cloud Functions (or an equally authoritative Firebase server component) for operations that must not be client-trusted: enqueue/claim, final result settlement, rating updates, disconnect/lease adjudication, username moderation enforcement, and account/data deletion as needed.
- Firestore Security Rules implementing least privilege and field-level validation. A user must never write another user’s rating/win/loss totals, join arbitrary matches, overwrite settled results, or read unrelated private match state.
- Firebase Emulator Suite configuration and scripts. Local development and automated tests must not require production credentials or mutate production data.
- Explicit data model and indexes checked into the repo, plus retention/cleanup policy for abandoned queue tickets, heartbeats, and match events. Avoid an ever-growing event stream when a compact match document or bounded subcollection suffices.
- A repository/service boundary so UI/game code depends on typed auth, profile, matchmaking, and match-session interfaces rather than Firebase calls scattered through screens and hooks.
- Environment validation with helpful development errors. Firebase web config values are identifiers rather than server secrets, but still keep environment-specific configuration out of source and never put Admin SDK/service-account credentials in the app bundle.

### Matchmaking behavior

- The server owns queue creation, claiming, cancellation, and match creation.
- Queue tickets include player ID, current rating snapshot, enqueue time, lease/expiry, app/protocol version, and requested ruleset.
- Start with a narrow rating window and expand it predictably over elapsed time, while choosing the closest rating and then oldest compatible ticket. Define and test the exact expansion function.
- Claiming must be transactional/idempotent and prevent self-match, double-match, duplicate active matches, or two clients claiming the same ticket.
- At 10 seconds, perform a server-coordinated “human if already claimable, otherwise AI fallback” transition. Cancellation and fallback creation must be idempotent and race-safe. A human match that commits first wins; otherwise the ticket becomes ineligible before the bot session is created.
- Reconnect the player to an existing active match after app restart instead of creating a new queue entry.
- Version the online protocol and reject or isolate incompatible clients.
- Use server timestamps and leases rather than trusting device clocks.

### Realtime match behavior

- Define one authoritative match state machine, for example `queued -> active -> finishing -> completed | cancelled | abandoned`, with permitted transitions and ownership documented and tested.
- Use monotonically increasing peel/round sequence numbers and idempotency keys. Replaying an event must be harmless. Simultaneous peels must settle into one deterministic sequence.
- The shared tile pool/order must be deterministic and identical across clients, with stable IDs. Never expose private opponent hand/board state through readable Firestore documents.
- Handle listener reconnects and snapshots as state reconciliation, not only as ephemeral event delivery.
- Decide and document the anti-cheat boundary. At minimum, settlement must be server-idempotent, verify match membership/status, validate the submitted final board connectivity and words against the authoritative rules/dictionary, verify tile ownership/consumption and sequence, and reject impossible results. If some gameplay remains client-authoritative, clearly document the residual exploit risk and keep rating mutation server-only.
- Presence/disconnect outcomes must be based on server timestamps/leases and allow a reasonable reconnect grace period. Backgrounding an iPhone briefly must not immediately forfeit a player.
- Surface searching, matching, reconnecting, offline, opponent-disconnected, retry, cancelled, completed, and protocol-mismatch states cleanly in the UI.

### AI fallback and rating policy

- Reuse the Practice bot engine where possible, but seed the AI session and configure it from a rating-to-skill curve near the player’s expected ELO. Its behavior must be reproducible in tests.
- Never create a fake human profile or assert that a bot is a real person. The UI may keep the fallback presentation subtle, but it must be truthful.
- Choose and document one rating policy. Recommended default: human ranked matches affect public ELO; fallback AI matches are clearly marked and either unranked or affect a separate/provisional bot rating. If the product requires AI matches to affect public ELO, the result must be settled server-side, the bot rating must be explicit, farming controls must exist, and rewards/deltas must be capped and tested. Do not silently let client-simulated bot wins mint public rating.

## ELO refinement

- Preserve chess-style expected-score math but centralize it in one shared, thoroughly tested domain module usable by server code.
- Define initial rating, rating floor, rounding, K-factor/provisional behavior, disconnect/forfeit handling, draw policy (even if draws are currently impossible), bot policy, and idempotency.
- Recommended starting point unless product evidence suggests otherwise: initial 800; provisional K=40 for the first 10 settled human games; established K=24; non-negative rating floor; server calculates from pre-match rating snapshots; one immutable settlement per match.
- Align every rank threshold, name, and color across `utils/elo.ts`, `components/rank/rank-ladder.tsx`, UI copy, tests, and backend.
- Record pre-rating, expected score, delta, post-rating, rules version, and settlement reason for auditability. Never let clients write these fields.

## React Native and code-quality requirements

Apply the local `vercel-react-native-skills` rules with judgment, particularly:

- Keep Expo Router native stacks and native tabs.
- Use `Pressable`; use Gesture Handler/Reanimated gestures for animated press/drag interactions.
- Because React Compiler is enabled, replace Reanimated `.value` access with `.get()` / `.set()` throughout `app/(play)/game.tsx`, `components/game/draggable-tile.tsx`, and `components/game/game-board.tsx`, and destructure hook-returned functions early where applicable.
- Animate transform/opacity instead of layout properties. Represent ground truth in state and derive visual values.
- Avoid potentially leaked falsy JSX such as a string/number used directly with `&&`; prefer explicit booleans, ternaries, or early returns. Enable an appropriate lint rule if compatible.
- Keep text inside `Text` and use `expo-image` for bitmap rendering.
- Keep `contentInsetAdjustmentBehavior="automatic"` on root scroll screens and handle safe areas natively where possible.
- Use `StyleSheet.create` or a coherent design-system layer for stable shared styles; do not perform a noisy mechanical rewrite of every harmless inline style. Prioritize hot paths and repeated components.
- Minimize subscriptions and derived state. Do not cause entire game screens to rerender for high-frequency timer, gesture, presence, or bot updates when a narrower boundary/ref/shared value works.
- Preserve accessibility: labels/hints/roles, Dynamic Type behavior, adequate hit targets, contrast, Reduce Motion awareness, VoiceOver-readable game status, and non-color-only invalid-word feedback.
- Split oversized orchestration (`app/(play)/game.tsx`, `hooks/use-game.ts`) along domain boundaries without creating needless abstraction.
- Remove `any` casts where practical, validate route/external data at runtime, add error boundaries/fallbacks, and guard JSON/local-storage parsing and schema migrations.
- Keep production logging intentional; debug logs/warnings must be behind `__DEV__` or routed through a small logger with sensitive-data redaction.

## App Store readiness requirements

Apply the local `app-store-review` skill and produce a code-referenced risk report. Fix what can be fixed in-repo and document App Store Connect/manual prerequisites separately.

Pay special attention to:

- **Completeness/performance (2.1, 2.4, 2.5):** no placeholder/boilerplate copy, broken backend states, dead screens, crashes, or production debug output. Test release builds, IPv6/network failure, app background/foreground, reconnect, small/large iPhones, and iPad compatibility behavior. Decide deliberately whether `supportsTablet: false` remains appropriate and document the decision.
- **Accurate functionality/metadata (2.3):** never describe an AI fallback as a human opponent. Review notes must explain anonymous auth, human matchmaking, the 10-second AI fallback, reconnect/forfeit behavior, and how reviewers can exercise online functionality.
- **Privacy/data (5.1):** add an in-app privacy-policy link and data-use explanation. If Firebase Auth accounts are created—even anonymous accounts—provide an in-app delete-account/data flow with destructive confirmation and actual server-side deletion. Solo and Practice must remain usable without unnecessary account/profile data. Prepare an App Privacy data inventory.
- **User-generated content (1.2):** usernames are visible user-created text. Enforce normalized length/character rules, profanity/objectionable-content filtering, uniqueness policy, reporting/blocking where users can encounter abusive names, a support/contact route, and operational removal capability. If you intentionally redesign to eliminate arbitrary UGC (for example, generated display names only), document why the full UGC surface no longer applies.
- **Security (1.6):** Firebase rules and Functions must prevent unauthorized reads/writes; no Admin secrets in the client; use HTTPS; do not treat public Firebase configuration as authorization.
- **Login (4.8):** anonymous Firebase auth is not a third-party social-login button. If Google or another social login is later added, include a privacy-preserving equivalent such as Sign in with Apple where required. Do not add social login unless needed.
- **IP/copycat risk (4.1, 5.2):** keep Narnigrams branding original. Do not use BANANAGRAMS trademarks in App Store metadata or imply affiliation. Audit tile distribution, dictionary, images, sounds, and other assets for provenance/license; replace or document anything unlicensed. General game mechanics are not a license to copy protected branding/assets/text.
- **Support/metadata:** replace the README, provide support and privacy URLs/placeholders with clear setup instructions, complete age-rating guidance, and create an App Review checklist/review-notes template. Do not fabricate live URLs; mark user-owned deployment tasks clearly.
- There are currently no payments, ads, tracking, chat, or social login. Do not add them. Firebase Analytics is not required; omit it unless there is a concrete product need and then assess ATT/privacy implications first.

## Testing and verification

Introduce a sensible test stack compatible with Expo/TypeScript. Tests must be deterministic and meaningful, not snapshot-heavy. Include at least:

- Tile distributions total exactly 50/72/100 and deterministic seeded pools have stable letters and IDs.
- Board connectivity, word extraction/validation, drawing, exchange, peel, shared-pool conservation, duplicate/replayed actions, and win conditions.
- Solo Short/Medium/Long preset mapping.
- Practice Easy/Medium/Hard behavior, real tile conservation, deterministic seeded decisions, and valid terminal states.
- ELO expected-score/delta math, provisional/established K factors, floors, rank boundaries, forfeits, bot policy, and idempotent settlement.
- Matchmaking rating-window expansion, closest/oldest selection, self-match prevention, double-claim races, cancellation/fallback race at 10 seconds, retries, reconnect, expiry, and protocol mismatch.
- Firestore Security Rules with emulator tests proving permitted operations work and unauthorized profile/rating/match writes and unrelated reads fail.
- Online sequence reconciliation, repeated/out-of-order peel commands, two-client convergence, result validation, and one-time settlement.
- Local persistence migrations and malformed-data recovery.

Add scripts for lint, typecheck, unit tests, emulator/rules tests, and a combined CI check. Set up CI if appropriate for the repo. Run the full suite plus Expo diagnostics before declaring completion. If native credentials or Firebase console steps prevent a final device build, distinguish verified code from manual setup still required.

## Suggested implementation order

1. Audit and document current behavior; create an architecture/data-model decision record and concrete migration checklist.
2. Establish tests around the existing pure engine, deterministic tiles, presets, bot model, and ELO before changing networking.
3. Cleanly model the three game modes and refactor the session/controller boundaries while preserving UI behavior.
4. Add Firebase local/emulator infrastructure, typed repositories, Auth/profile lifecycle, rules, Functions, and tests.
5. Implement transactional matchmaking, 10-second race-safe AI fallback, realtime reconciliation, authoritative settlement, reconnect, and UI states.
6. Remove Supabase runtime code/dependency/schema references only after Firebase parity is working. Preserve migration notes if existing production data may need export/import; do not assume it can be discarded.
7. Apply targeted React Native performance/accessibility cleanup and App Store fixes.
8. Replace boilerplate documentation, add setup/deploy/review instructions, run all verification, and provide a concise final risk/manual-action list.

## Definition of done

- The app presents three unmistakable entry points: Solo (Short/Medium/Long), Practice (Easy/Medium/Hard), and Ranked Online.
- All three modes launch, play, finish, and record the correct type of result without shared-state corruption.
- Ranked finds the closest compatible human or transitions exactly once to a truthful rating-appropriate AI fallback after 10 seconds.
- Human online sessions survive listener reconnect/app restart and converge on one authoritative state/result.
- Rating settlement is server-owned, immutable/idempotent, consistent in UI/backend, and protected by tested rules.
- Supabase is absent from runtime dependencies/imports/configuration; Firebase setup and emulators are documented and reproducible.
- Secrets/old tracked env handling is corrected without printing credentials; the user is warned about rotation and git history.
- Lint, typecheck, unit tests, emulator/rules tests, and the combined check pass.
- The README describes the actual app and setup. Architecture, Firebase schema/rules/indexes, deployment steps, data/privacy behavior, and App Review notes are documented.
- The final response lists: major changes, files/architecture, tests run and results, remaining Firebase/App Store console actions, credential-rotation warning, any residual anti-cheat limits, and any decisions needing the product owner’s confirmation.

Do not declare success based only on compiling. Exercise the game modes and backend state transitions, inspect the resulting UI where tooling permits, and report evidence.
