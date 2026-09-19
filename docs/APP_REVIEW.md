# App Store readiness audit and reviewer notes

Audit baseline: `57f2c97`; implementation review dated 19 September 2026. This report distinguishes repository work from console/owner tasks. A passing TypeScript build is not App Store readiness. Apple's [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) remain the authoritative submission reference; this checklist cannot guarantee approval.

## Release risks and evidence

| Priority / guideline | Code evidence and mitigation | Remaining release work |
| --- | --- | --- |
| **Blocker — 2.1, 1.6** backend availability/security | `lib/repositories.ts`, `functions/src/index.ts`, `firestore.rules`: emulator-first Firebase, authenticated server operations, private match access and server-only rating writes | Deploy and verify staging/production rules, callables, cleanup, quotas, monitoring and TTL. See `docs/FIREBASE.md`. |
| **Blocker — 5.1** privacy/support | Settings privacy/data controls; `.env.example` intentionally leaves privacy/support URLs empty; server `GameService.deleteAccount` deletes identity/data | Publish actual operator-owned HTTPS pages, set build URLs, complete App Privacy from `docs/PRIVACY.md`, verify account deletion including retries in the signed build. Empty URLs are setup state, not a completed submission. |
| **Blocker — 5.2, 4.1** artwork ownership | `app.json` references Narnigrams images with no source/rights records; `docs/ASSET_PROVENANCE.md` records their commit history | Owner must confirm creator/rights for logo, splash and light/dark icons and review brand distinctiveness. History alone is not a license. |
| **High — 2.1, 2.4, 2.5** native behavior | `app/(play)/game.tsx`, `components/game/*`, `hooks/use-timer.ts`, persistence utilities; web and emulator checks are useful but platform-limited | Signed release QA on actual iPhones; gestures, low memory, interruption/relaunch, offline first launch, IPv6-only network, small/large screens, Dynamic Type, VoiceOver and Reduce Motion. |
| **Addressed in code; verify — 2.3** accurate AI/rating presentation | `shared/online.ts` fallback `rated:false`, queue outcome and game result UI | Confirm screenshots/metadata say AI fallback and no rating change; a fallback must never look like a fake human or inflate public ELO. |
| **Addressed by narrower surface — 1.2** arbitrary usernames | Server-generated display names; no client profile writes or arbitrary name callable; no public boards/chat | Ensure the obsolete username modal is not mounted. If editable names or shared boards/chat return, add content filtering, report/block and operational moderation before release. Support remains necessary. |
| **Addressed — 5.2** unknown dictionary rights | Replaced original unexplained 279,496-word list with pinned ESDB list; `assets/wordlist-notice.json`, `docs/licenses/ESDB-Copyright.txt`, reproducible generator | Confirm notices are accessible in Settings and retained in Functions distribution. Review vocabulary policy/age-rating; upstream offensive-word tags are incomplete. |
| **High operational risk — 1.6** historical credentials | `.env` removed from index; local contents preserved; ignore patterns/example added | Rotate/revoke old Supabase credentials, review old access, and decide existing-player migration before retiring the service. Historical git copies still exist. |
| **Tracked dependency risk — 1.6** | Compatible transitive updates and tested URI-parser security backport; `docs/DEPENDENCY_SECURITY.md` | Audit still reports build-tool advisories and the version-only decoder alert. Reassess the release lockfile; do not claim a zero-advisory audit. |
| **Residual anti-cheat risk** local automation/collusion | Server validates final board, ownership/sequence and idempotent settlement | Automated solvers, multiple anonymous accounts and collusion are not prevented. Validate abuse controls and monitor anomalies; do not market cheating as impossible. |

`ios.supportsTablet: false` is retained deliberately: this is an iPhone-first portrait game with dense tile controls, and no tablet-specific redesign has been verified. It does not excuse broken iPad compatibility behavior. Test the submitted iPhone build in iPad compatibility mode and record screenshots; only enable native tablet support after layout/interaction validation.

No purchases, subscriptions, advertising, tracking SDK, chat or third-party social-login button is introduced. Anonymous Firebase authentication does not itself require a Sign in with Apple button. Revisit login guideline 4.8 if social login is later added. Do not add unnecessary permission strings or ATT prompts for features that do not collect those data.

## Manual acceptance matrix

Run against the exact signed build and a non-production staging Firebase project first. Record build number, device/OS, date and result for each row. Preserve evidence of failed/retried cases.

| Scenario | Required observation |
| --- | --- |
| Fresh install with airplane mode | Solo Short/Medium/Long and Practice Easy/Medium/Hard launch without account creation; dictionary works offline; no indefinite spinner |
| Play, save, terminate, relaunch | Tile ownership and board restored; stale/malformed storage recovers; no duplicate statistics |
| Two fresh Ranked players | Compatible players paired once, truthful names/ratings, private opponent board never visible; shared draws converge |
| Ranked with no second player | Server marks one unranked AI fallback at/after 10 seconds; cancel/retry cannot leave a late human ticket |
| Cancel at 9–11 seconds / duplicate retry | Exactly one cancellation, human match or fallback; no simultaneous sessions |
| Restart while active | Resume the same match by ID; listeners reconcile after network loss rather than replaying draws |
| Brief background interruption | No immediate defeat; resume within 120-second grace |
| One/both players absent beyond grace | One-sided disconnect settled once / both absent abandoned without rating; no client-created win |
| Finish, exchange, simultaneous peel, replay | Illegal/unowned/disconnected boards rejected; valid outcome settles once; both clients agree |
| Settings delete account/data | Destructive confirmation; account, queue and related match/private data removed; opponent aggregate kept; retry works after network failure |
| Support, privacy and notices | Public HTTPS pages open; operator contact works; full dictionary license is readable |
| Accessibility and devices | Hit targets usable, no cropped controls at large text, invalid state has text/non-color signal, VoiceOver status, Reduce Motion, smallest/largest supported iPhone and iPad compatibility |
| Release diagnostics | No sensitive/debug output, missing assets or Metro dependency errors; IPv6-only and slow/offline transitions checked |

## App Store Connect and signing

- Confirm bundle ID `com.hrln-interaction.narnigrams`, Apple team and application ownership, then configure signing in the generated Xcode workspace.
- Put the production public Firebase identifiers and published policy URLs in the ignored root `.env.local`, select a generic iOS device in Xcode, and use Product → Archive for the signed store build. Do not confuse a successful web export or simulator build with an iOS release archive.
- Review resolved Info.plist/privacy manifests and required-reason APIs from the actual native dependency build. Set the export-compliance answer based on the actual binary and applicable encryption use, not an unverified repository flag.
- Upload real in-app screenshots (not only splash art) for required device sizes. Describe Solo, Practice and Ranked accurately; no competitor trademarks or implied affiliation. Supply category, copyright/owner, support and privacy URLs.
- Complete the current age-rating questionnaire truthfully. There is no chat, social feed, gambling, prize, ad or payment feature; the English vocabulary is not a guarantee of child suitability. Assess actual content and avoid unsupported “for kids” claims. Confirm current regional requirements in App Store Connect.
- Keep Firebase backend online for review and provide a reachable review contact. Test anonymous auth, policy links and deletion from a clean install on the production configuration.

## Reviewer notes template

Replace the bracketed operator fields before submission. These are notes for App Review, not app-facing placeholder copy.

> Narnigrams is a word-tile game with Solo, Practice against AI, and Ranked Online. Solo and Practice work offline and require no account. Opening Ranked creates an anonymous player identity automatically; there is no email/password sign-in or purchase.
>
> To test offline play, open Play and choose Solo Short/Medium/Long or Practice Easy/Medium/Hard. To test online play, open Ranked on two independently installed devices. Compatible human players are paired by rating. If no human is secured after 10 seconds, the app identifies an AI fallback; that match does not affect public rating. Only human results affect ranked ELO.
>
> For a human match, reopening the app resumes the active session. Brief backgrounding is allowed; the server grants a 120-second reconnect grace. An explicit forfeit loses; if both players disappear the match is abandoned without rating. Opponent hands/boards remain private.
>
> Settings contains the privacy policy, support, dictionary notices and account/data deletion with confirmation. Names are generated by the service; there is no chat or editable public text. There are no payments, ads or tracking features.
>
> Review contact: [operator contact]. Production backend verified on [date/build]. Privacy/support pages: [published operator URLs]. Additional device-specific testing instructions: [only if necessary].
