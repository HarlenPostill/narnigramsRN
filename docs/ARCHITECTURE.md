# Architecture and product decisions

Narnigrams is an iPhone-first Expo/React Native app. The web bundle is a development surface for browser inspection, two-client emulator sessions and fast gameplay debugging. Native gestures, background behavior, accessibility, performance and App Store packaging still require iOS validation.

## Modes and domain boundaries

| Mode | Rules | Identity / rating |
| --- | --- | --- |
| Solo | Short 50 / Medium 72 / Long 100 tiles; starts with 11 / 15 / 21 | Local only; no public rating |
| Practice | Easy / Medium / Hard bot with real tiles, deterministic seeded decisions and shared pool | Local only; no public rating |
| Ranked human | 72 tiles, 15 each, standard distribution, versioned dictionary/rules | Anonymous Firebase identity; server-settled public ELO |
| Ranked AI fallback | After server queue deadline; seeded Practice engine, skill mapped to rating | Explicit AI label; unranked; no public ELO mutation |

Game length, letter-distribution difficulty, timer and bot difficulty are separate concepts. A shared seeded pool has stable tile IDs. Offline pools use a replayable seed/index; online server pools derive opaque IDs and order with SHA-256 from a private random seed, so a dealt ID does not reveal the remaining pool. The engine, bot and ELO modules in `utils/` are pure domain code shared with the server where appropriate. `types/game.ts` models local play; `shared/online.ts` defines versioned online commands and repository contracts.

`lib/repositories.ts` owns Firebase modular SDK initialization, auth, profile/queue listeners, callable requests and synchronized public/private snapshots. Screens/hooks consume those typed interfaces. Navigation passes a match ID, not serialized authoritative match state. Client UI may stage a board locally, but the server validates ownership, sequence and legal board contents when commands are submitted.

Native stacks/tabs, existing tile gestures, Reanimated and the visual design remain the foundation. Versioned storage rejects malformed/stale saves safely. Local statistics separate Solo, human-online and bot results; explicit Practice and ranked AI fallback share the bot bucket. Human public rating is maintained separately; local storage cannot authoritatively change ranked ratings.

## Matchmaking and consistency

`functions/src/service.ts` owns transactions; `functions/src/domain.ts` defines matchmaking/command validation. Queue state progresses from searching to matched, fallback or cancelled. The lobby holds at most 128 eligible tickets, providing bounded exact closest selection in a transaction. This intentionally limits a single lobby's throughput. At capacity, return a retryable error; do not silently scan an unbounded collection. Before a larger rollout, shard by ruleset/region and explicitly revisit the resulting cross-shard fairness tradeoff.

Compatibility requires equal protocol and ruleset. A player's rating window is `min(400, 100 + 75 * floor(elapsedMs / 2500))`; a pairing must fit both players' windows. Sort by smallest rating distance, then oldest enqueue time, then UID. Queue leases last 30 seconds and are refreshed while searching. After 10 seconds, the same transaction first accepts a compatible human if available; otherwise it removes eligibility and records one idempotent fallback. Whichever transaction commits determines the outcome, so a late human claim cannot coexist with fallback. Restarting with an active match resumes it. A stable per-search ID and server cancellation receipt prevent a cancelled, still-in-flight enqueue from recreating eligibility; retries retain the same fallback seed. Queue listeners reject cached tickets belonging to other search IDs; direct authoritative enqueue results can still reconnect an older active human match.

Human matches are `active -> completed | abandoned`. Membership, active status, sequence and command ID are checked server-side. Commands carry an expected monotonic sequence. Board-only moves revalidate current ownership and can apply after an opponent move; shared-pool actions with stale sequences restore the latest authoritative board and require a fresh action. Every board/pool mutation advances the global sequence, preventing delayed replies from reverting newer placements. Only transport failures with uncertain outcomes retain the exact command ID for retry; definite validation/sequence failures are discarded. The server retains a bounded 128-ID mutation replay cache. Heartbeats cannot evict mutation IDs; board commands accept only the current 128-mutation sequence window, so an evicted board replay cannot become valid again. Legacy sessions establish a replay floor before using the new window. Heartbeats do not consume tiles or change the gameplay sequence. The client sends them independently from moves and preserves an optimistic board until its move response, so a presence snapshot cannot erase a pending placement or clear an uncertain action. Public/private snapshots are emitted to the hook only when their sequences agree.

Finish validation checks empty hand, connected board, words in the pinned dictionary, exhausted pool, tile ownership, duplicate use and valid positions. A settlement transaction records result, pre-ratings, expectations, deltas and post-ratings once. A private server document holds the remaining pool and ownership; opponents cannot read hands, boards or future draw order through Firestore rules.

Server-observed leases allow 120 seconds to reconnect. The client sends a heartbeat immediately when a session first resolves or becomes active, as well as on foregrounding and every 20 seconds while active. One expired player can lose by disconnect; if both expire the match is abandoned without rating. An explicit forfeit loses immediately. Scheduled cleanup eventually adjudicates inactive matches even if both clients vanish; it runs every 15 minutes, so unattended cleanup is not instantaneous. Foreground clients can trigger adjudication sooner through authenticated commands.

## Rating and identity policy

Initial rating 800, floor 0, chess expected-score curve. Provisional K=40 applies to a player's first 10 settled human games; established K=24 thereafter. Settlement uses each player's pre-match rating and game count; independently chosen K factors and the floor mean changes need not sum to zero. Finish, explicit forfeit and one-sided disconnect count. Both-disconnected abandonment and AI fallback do not change public rating. Rank names/thresholds/colors come from `utils/elo.ts`.

AI difficulty maps to easy below 700, medium below 1300, otherwise hard. AI is not a fake human profile. A deterministic local AI session is useful practice, but cannot mint public rating.

Server-generated display names replace arbitrary usernames. Names are identifiers, not uniqueness-guaranteed personal handles; Firebase UID is the identity. There is no chat, editable profile text, public board or public word feed. This removes the former public text moderation surface instead of depending on an inadequate profanity-only username filter. Reintroducing editable public content requires moderation, reporting, blocking and an operational response process first.

## Remaining trust limits

The server prevents client-written ratings, impossible ownership and invalid wins. It cannot detect a player using a solver, screen automation, colluding accounts or multiple anonymous accounts. Generated names do not prevent account-reset abuse. Account creation and callable traffic require service quotas, monitoring and rate-limit review; `maxInstances` is a capacity bound, not a per-user anti-abuse policy. No proof of human decision-making is claimed.

The JavaScript Firebase SDK supports shared web/native development without adding native Firebase packages. See [FIREBASE.md](FIREBASE.md) for the required production integration and console work.
