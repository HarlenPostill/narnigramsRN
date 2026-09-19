# Narnigrams

Narnigrams is an iPhone-first word-tile game built with Expo, React Native and TypeScript. Arrange a connected board of valid English words, draw from a finite shared deck and finish with every tile placed.

- **Solo:** Short (50 tiles), Medium (72), Long (100).
- **Practice:** Easy, Medium or Hard deterministic AI using real tiles from the shared pool.
- **Ranked Online:** Firebase-backed human matchmaking and server-settled ELO. After 10 seconds without a human match, the server offers a clearly identified, unranked AI fallback.

Solo and Practice work without sign-in. Ranked creates an anonymous identity on demand and uses generated names. No payments, ads, analytics, tracking or chat are included.

## Development

Use Node 22. Install locked dependencies:

```sh
npm ci
npm --prefix functions ci
```

For offline gameplay, start `npm run web` or `npm run ios`. Use the browser for fast debugging: inspect console/network errors, resize the viewport, and use independent browser profiles for two-player sessions. iOS remains the target; browser checks do not replace device gesture, lifecycle and accessibility testing.

For local Ranked, install Java 21 and run `npm run emulators`. Run `npm run web:emulator` in a second terminal; it supplies demo-only configuration without changing `.env`. For an iOS simulator, copy `.env.example` to `.env.local` and run `npm run ios`. The demo project and emulator ports are documented in [Firebase setup](docs/FIREBASE.md). Do not copy production credentials into emulator tests. Restart Expo after environment changes.

Firebase identifiers are public client configuration, not permission to access data. Server credentials must never enter an app bundle. Missing Firebase configuration leaves offline modes available and shows a Ranked setup error.

## Verification and release

`npm run check` runs lint, typecheck, deterministic engine/backend tests and the Functions build. `npm run test:emulators` runs Firebase rules/callable/concurrency checks; `npm run check:ci` combines both. CI installs both lockfiles and runs the checks with a demo Firebase project. Run Expo diagnostics and a web export as well; record real iOS release/device QA using [App Review checklist](docs/APP_REVIEW.md).

`eas.json` provides simulator, internal preview and production profiles. The owner must configure Expo/Apple project identities, signing and production environment values. Production Firebase deployment, privacy/support pages, App Privacy entries, artwork ownership confirmation and native App Check integration remain explicit release prerequisites. No live backend, support page or privacy-policy URL is fabricated here.

## Code and decisions

- [Verification record](docs/VERIFICATION.md): executed automated/browser/native checks and remaining release work.
- [Architecture](docs/ARCHITECTURE.md): mode boundaries, queue races, authoritative match state, rating and anti-cheat limits.
- [Firebase setup](docs/FIREBASE.md): schema, security, emulators, retention, deployment and Supabase migration.
- [Privacy inventory](docs/PRIVACY.md): data handling, account deletion and policy publication requirements.
- [App Review audit](docs/APP_REVIEW.md): code-referenced risks, manual acceptance matrix and reviewer notes.
- [Dependency security](docs/DEPENDENCY_SECURITY.md): compatible updates, URI decoder backport and remaining tooling advisories.
- [Asset provenance](docs/ASSET_PROVENANCE.md): pinned licensed ESDB dictionary, reproduction and remaining artwork rights checks.

Pure game and rating logic lives in `utils/`; online contracts in `shared/`; client repository adapters in `lib/`; authoritative Functions in `functions/src/`. Firestore denies client writes and private opponent-state reads. Local bot wins never alter public ELO. Server validation does not prevent external solvers, collusion or repeated anonymous accounts.

**Credential action required:** the old tracked `.env` was untracked and preserved locally, but its Supabase values remain in git history. Rotate/revoke those credentials and review the old service's access. Determine whether existing production players need an owner-controlled migration before retiring Supabase. No git-history rewrite or production-data deletion has been performed.
