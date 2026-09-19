# Firebase development, operations and migration

## Local emulator setup

Use Node 22 and Java 21. Ensure `java -version` reports 21 or newer on the command PATH; setting JAVA_HOME alone may leave an older Java executable first on PATH. On Homebrew macOS, prepend `/opt/homebrew/opt/openjdk@21/bin` to PATH for the emulator command. Run `npm ci` and `npm --prefix functions ci`, then `npm run emulators`. In another terminal, run `npm run web:emulator`; the helper supplies demo identifiers, disables dotenv loading and starts Expo without modifying local configuration. For an iOS emulator build, copy `.env.example` to `.env.local` and use `npm run ios`. Existing `.env` is preserved; do not overwrite it or display its values. `.firebaserc` defaults to the non-production `demo-narnigrams` project. `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` must accompany a `demo-` project ID; the repository rejects a real project ID in emulator mode.

Auth runs on 9099, Firestore on 8080, Functions on 5001, and emulator UI on 4000. The app's default callable region is `us-central1`, matching Functions. A browser or iOS simulator uses `127.0.0.1`. For a physical iPhone, use the computer's reachable LAN address and explicitly configure the emulator bind host/firewall on a trusted local network. `127.0.0.1` on an iPhone is the phone itself. Never expose unauthenticated emulator ports to the public internet.

Use two independent browser profiles/incognito contexts to simulate two players; two tabs in the same profile share an auth identity. Browser developer tools can inspect console errors, callable requests and Firestore connection behavior. Disable networking and restore it to test reconciliation; do not edit server-owned Firestore records to make a UI test pass. Device testing must additionally cover background/relaunch and actual gestures.

The app uses Firebase's modular JS SDK, browser auth persistence and a native AsyncStorage persistence adapter. Auth/profile creation is deferred until Ranked. This follows [Expo's Firebase integration guide](https://docs.expo.dev/guides/using-firebase/), and avoids assuming native Firebase modules work in Expo Go. Native attestation still needs a development/release build.

## Data model and access

| Collection/document | Contents | Client permission | Retention |
| --- | --- | --- | --- |
| `players/{uid}` | Generated display name, ELO/totals, active match ID | Own document get; no writes or listing | Until account deletion |
| `queue/{uid}` | Rating snapshot, protocol/ruleset, timestamps/lease, status, result ID or AI seed | Own get; server writes | `deleteAfter`, 24 hours |
| `serverSearches/{uid_searchId}` | Cancellation receipts for in-flight search requests | None | `deleteAfter`, 24 hours |
| `serverLobby/current` | Bounded queue eligibility map, maximum 128 | None | Compact singleton; expired entries pruned |
| `matches/{id}` | Member summaries, sequence, pool/hand counts, presence, immutable result | Members get; no writes/listing | `deleteAfter`, 7 days, refreshed while active |
| `privatePlayers/{matchId}_{uid}` | Own board/hand and sequence; owner UID | Owner get; server writes | Independent `deleteAfter`, 7 days |
| `serverMatches/{id}` | Hidden pool, all authoritative ownership, replay IDs, starting games counts | None | Independent `deleteAfter`, 7 days |

Firestore rules deny all client writes; only authenticated callables mutate data through Admin SDK. Therefore input validation in Functions is part of the security boundary. No public leaderboard scan exists. The single-match subscription reads two documents and is cleaned up on unmount; the queue subscribes only to its own ticket. There is no unbounded append-only event stream. TTL field configurations live in `firestore.indexes.json`; no composite query indexes are currently needed.

`cleanup` runs every 15 minutes, selects up to 100 expired matches ordered by `cleanupAt` (latest presence plus the reconnect grace), adjudicates expired leases and prunes queue eligibility. Enable TTL on all five listed expiring collections and verify policy status after deployment. TTL is asynchronous; lease checks enforce gameplay expiry immediately without relying on deletion timing. [Firestore TTL documentation](https://firebase.google.com/docs/firestore/ttl) explains its operational behavior.

Account deletion settles an active human match as a forfeit, removes associated public/private/server match records (including both players' private match data), removes queue/search receipts/profile and deletes the Firebase Auth user. It also scans hidden matches and own private records to erase stragglers when TTL deleted a public match first. Opponents keep their aggregate rating record but lose access to that match document. This is intentional data minimization; the app does not promise permanent match history. Test partial failure/retry before release. No manual data export to a new backend is performed by this change.

## Production checklist — operator action required

1. Create/select a Firebase project and Firestore region. Set up the plan, billing and budgets required by Functions/Scheduler; confirm current service prices instead of assuming Firebase is always cheaper. Configure alerts and sensible quotas before opening traffic.
2. Register the web client configuration used by the JS SDK and enable anonymous Authentication. Supply the public app identifiers in EAS environment configuration. Remove the emulator-host variable entirely. Never put service account JSON, private keys or Admin credentials in `EXPO_PUBLIC_*`, app source or EAS public variables.
3. Set up a least-privilege deployment identity outside the app. Deploy Functions, rules and indexes explicitly to the selected real project, after emulator checks pass. Example: `npx firebase deploy --project YOUR_FIREBASE_PROJECT_ID --only functions,firestore:rules,firestore:indexes`. This command changes live services and is not part of the local test workflow.
4. Confirm all callable endpoints and the scheduled cleanup function deployed. Confirm TTL on `queue`, `matches`, `serverMatches`, `privatePlayers`, `serverSearches`, test actual deletion, and set Cloud Logging retention. The repository's TTL file is not evidence that a console deployment succeeded.
5. Complete App Check as below, run staging two-device and abuse tests, and verify unauthorized access fails with the deployed rules. Keep review backend services available during review.
6. Publish privacy/support pages, set their HTTPS URLs for the production app, complete App Privacy and export/compliance declarations, and build/test the signed iOS binary using `eas.json`. Store operator credentials in the appropriate provider consoles, never this repository.

## App Check release gate

Web scaffolding uses `ReCaptchaEnterpriseProvider` when `EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` is present. Register the web app/site and allowed domains in the Firebase/App Check and reCAPTCHA consoles. Monitor valid tokens before enforcement. Development emulators intentionally omit App Check.

**Native iOS App Check is not yet wired.** Before enabling public ranked production, implement a supported native App Attest/DeviceCheck bridge or a secure custom provider compatible with the chosen SDK; register the iOS bundle identifier and Apple team configuration, then test real development and release devices. A browser reCAPTCHA key cannot attest an iPhone. Debug tokens are development-only and must not be shipped as a bypass.

The Functions `ENFORCE_APP_CHECK` environment flag enables enforcement only when its value is the literal string `true`; absent/other values leave it off for local/development usability. Put `ENFORCE_APP_CHECK=true` in the Functions deployment environment (for example an ignored `functions/.env.PROJECT_ID` file), deploy after native token delivery is verified, then enable supported Firebase product enforcement in the console and verify both valid and invalid requests. This is a server variable, never an `EXPO_PUBLIC_*` variable. See [Functions environment configuration](https://firebase.google.com/docs/functions/config-env). Shipping with enforcement off is an explicit unresolved abuse risk, not completion of App Check. [Firebase App Check](https://firebase.google.com/docs/app-check) describes the provider and enforcement model.

## Supabase retirement and credential warning

The old `.env` has been removed from the git index and preserved locally; `.env` patterns now ignore local configuration. **Rotate/revoke the old Supabase credentials and review the old project's access because those values remain in git history.** A public/anonymous key is not an Admin secret, but removing its file does not invalidate historical credentials or fix the old backend's policies. Revoke any additionally exposed privileged key immediately if the owner identifies one. No secret values have been printed or copied into these docs, and no destructive git-history rewrite was performed.

Before shutting down an existing Supabase project, determine whether real users/rating records exist, take an owner-controlled export/backup and define consent, identity mapping and a tested one-time import if preservation is required. Anonymous Supabase identities cannot simply become Firebase credentials. Do not import unvalidated usernames into the generated-name model, accept client-reported ratings, or silently reset existing production players. This implementation assumes a fresh Firebase identity/rating baseline for local development; production migration remains an owner decision. Retire the old API, keys and resources only after verifying any needed data migration and rollback plan.
