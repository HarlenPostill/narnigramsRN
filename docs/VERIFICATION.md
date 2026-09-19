# Verification record

Revival verification, 19 September 2026. This records executed checks and observed behavior; pending items are not represented as passing. The app targets iOS, with the web bundle used for interactive debugging and independent Firebase clients.

## Automated checks

| Check | Recorded evidence | Status |
| --- | --- | --- |
| Final `npm run check:ci` after cached-ticket and lifecycle fixes | Node 22: lint, TypeScript and Functions build passed; 38 domain + 13 backend + 8 emulator test entries passed, zero failures/skips; command exited 0 | Passed |
| Node version parity | Final combined run and Functions emulator used Node 22, matching CI/Functions target; earlier exploratory checks used shell Node 24.19 | Passed |
| Expo Doctor | Final run: 18 of 18 checks passed | Passed |
| Production web export | Final export: 12 static routes. Earlier measured bundle: 1,282 web modules, 3.27 MB JS | Passed |
| URI-parser security and client reconciliation regressions | Patched decoder/query-string compatibility, long malformed URL bounded by child-process timeout, uncertain vs rejected command handling, stale snapshots, board exchange and exact queue search-ID filtering | Focused checks passed |
| Dictionary/provenance | 194,232 unique sorted ASCII entries; bundled SHA-256 matches metadata; source pin/license and regeneration script present | Passed |
| Environment hygiene | Local `.env` preserved; absent from git index; ignored patterns and redacted example present | Passed; credential rotation remains manual |

The final suite includes the native dictionary loader and queue fixes; native runtime behavior still requires the separate simulator check below. Dependency scanner findings are separately evaluated in [DEPENDENCY_SECURITY.md](DEPENDENCY_SECURITY.md); “tests pass” does not mean “zero advisory findings.”

## Browser interaction evidence

Observed by the integration run at a 390 × 844 viewport against the Firebase emulators. Separate browser origins provided independently authenticated clients; no production service was used.

| Flow | Observation |
| --- | --- |
| Solo Short | Dragged a tile from hand to board and back. Exchanged a tile: pool 39 → 38. Left, reloaded and resumed: 12 hand tiles and 38 pool tiles preserved. |
| Practice Hard | Seed `audit-9` completed naturally at 2:05. Bot had 39 board tiles; shared pool had 1 tile. Result identified AI practice with no rating change. |
| Ranked fallback | Server-produced fallback after the 10-second search deadline. Rating 800 selected Medium AI; visible label identified fallback/practice and no rating change. |
| First human match | Both authenticated clients entered match ID beginning `8366ec5d`. Placing Z changed hand 15 → 14. Reload preserved the placement. Forfeit produced the same 4:54 result on both clients, with −20 / +20 ELO; home ratings became 780 / 820. |
| Next human search | Both clients entered a fresh match beginning `f208dd08`. Exchange converged to 41 pool tiles and hands 16 / 15. Opposite player forfeited; −22 / +22 settlement led to home ratings 798 / 802. |
| Console | Latest inspected browser console, including reconnect/reload, showed framework shadow/pointerEvents deprecation warnings and no observed application errors. The two gameplay test tabs were closed and the viewport was reset afterwards. |

These interactions exposed defects that compiling alone missed: a cached old fallback ticket could supersede a new human search, and a restored match needed an immediate heartbeat rather than waiting for its interval. The queue listener now accepts only its exact search ID; direct enqueue responses still resume an already-active match. Restored sessions announce presence immediately. The browser result also informed drag coordinate and confirmation-dialog fixes.

These checks exercise representative mode behavior, not every preset/device/network combination. In particular, the human interaction test finished by forfeit; legal-word human finish validation is covered by backend tests rather than claimed as a manually completed full human game.

## Native verification

Built and installed an actual Release app using Xcode 26.6 on the iPhone 17 Pro simulator running iOS 26.5. The final build succeeded with 0 errors and 1 dependency deployment-target warning. Earlier runtime inspection found Expo SDK 54's new `File.text()` reader rejecting the bundled word-list URI. `utils/dictionary.ts` now uses the supported legacy `readAsStringAsync`; the rebuilt app loads the dictionary successfully.

With Metro and all Firebase emulators stopped, the installed Release app still loaded the home screen and offline games. Solo Short started with 39 pool / 11 hand tiles; a saved Solo session restored its elapsed timer and tiles. Hard Practice loaded the dictionary and naturally advanced to 16 bot board tiles / 0 bot hand tiles; a shared peel updated the player to 16 hand / 40 pool tiles. This verifies offline execution from the installed bundle.

A native drag/exchange gesture could not be conclusively driven using simulator automation coordinates. Browser drag/drop and exchange passed, but physical touch gesture acceptance remains manual; no native gesture pass is claimed.

A simulator build is not a signed physical-device/App Store acceptance result. No final physical iPhone, IPv6-only network, iPad compatibility, comprehensive VoiceOver/Dynamic Type/Reduce Motion, or production App Check result is claimed here.

## Release work still required

- Test the signed production configuration on physical iPhones, including interruption, reconnect, low-memory/relaunch, IPv6-only networking, small/large screens, and iPad compatibility.
- Complete accessibility acceptance on real devices; the automated and browser evidence is not a full accessibility audit.
- Integrate native App Check attestation, deploy/enforce it, and verify production Firebase rules, functions, TTL, cleanup, quotas and logging configuration.
- Publish operator-owned privacy/support URLs, complete App Store privacy/metadata/signing, confirm artwork rights, and perform the [App Review checklist](APP_REVIEW.md).
- Rotate/revoke historical Supabase credentials and decide whether existing production data requires migration. No destructive history rewrite or production-data deletion was performed.

Remaining anti-cheat limitations include external solvers, collusion and repeated anonymous accounts. Server-owned settlement prevents impossible tile ownership and direct client rating writes; it does not establish that decisions were made by a human.
