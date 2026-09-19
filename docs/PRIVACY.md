# Privacy and data inventory

This is an engineering inventory and publication checklist, not a deployed privacy policy. The operator must publish an accurate policy on a public HTTPS page, supply `EXPO_PUBLIC_PRIVACY_URL` and `EXPO_PUBLIC_SUPPORT_URL`, and enter the same URLs in App Store Connect. Do not submit with blank links or a placeholder domain.

## Data flow

Solo and Practice run locally without creating a Firebase account. Local settings, a resumable game and aggregate statistics use device/browser storage. Ranked requires explicit Apple or email/password authentication and uses a server-generated player name. Signed-in statistics sync to the account. No contacts, location, camera, microphone, advertising or analytics feature is needed.

| Data | Storage/access | Purpose | App Privacy review |
| --- | --- | --- | --- |
| Firebase UID and authentication session | Firebase Auth; persisted by Firebase browser storage / native AsyncStorage adapter | Reconnect the same player; authorize access | User ID, linked to the player identity; app functionality |
| Generated display name, rating and human match totals | Firestore player profile; own player and restricted match summaries | Matchmaking, progress, opponent identification | User ID/gameplay data; app functionality |
| Queue timestamps, rating snapshot, protocol, lease and search cancellation receipts | Server-owned Firestore queue/receipt records; own ticket only | Pair compatible players and expire abandoned searches | Gameplay/interaction data; app functionality |
| Match membership, status, sequence, outcomes and rating audit | Firestore; members only; server writes | Reconcile gameplay, settle a result once | Gameplay content/interaction data, linked; app functionality |
| Player hand and board | Private Firestore records; respective player and server only | Validate tile ownership and legal finish | Gameplay content, linked; app functionality |
| Match seed and remaining tile pool | Server-private state | Deal and conserve tiles without exposing future draws | Gameplay data; app functionality |
| Operational request/network logs | Google-managed service logging; authorized operators | Reliability, abuse/security investigation | Inspect enabled products/log fields and retention before completing diagnostics categories |
| Guest settings, saves and statistics | Device/browser only | Offline play and resume | Data exclusively processed on-device is not developer collection; verify backups separately |
| Support correspondence | Operator's chosen support service, if player contacts it | Resolve a request | Add the actual provider, data fields and retention to the published policy |

This inventory does not declare that pseudonymous online data is anonymous or unlinked. Do not select “Data Not Collected” for a build that enables Ranked. Verify Firebase/Google's current SDK disclosures against the exact release binary and enabled console products. No cross-app advertising tracking is implemented; do not add an ATT prompt merely because Firebase exists. If tracking is later introduced, reassess before enabling it. [Apple's App Privacy guidance](https://developer.apple.com/app-store/app-privacy-details/) defines the submission categories.

## Account and local data deletion

Settings provides an explicitly confirmed account/data deletion action, backed by the authenticated `deleteAccount` callable. The server must remove the Auth identity, profile and queue; remove or redact personal match/private records without harming an opponent's settled rating. Never substitute local sign-out for deletion. Test deleting while queued, active, completed, disconnected and after restart; network failure must preserve a visible retry path. Account deletion erases cloud stats, sync receipts and the current device’s account cache. Guest Solo/Practice saves and settings remain on the device. There is no separate in-app local-data reset control; clearing browser site data or removing app data clears local records, subject to platform backup/restore behavior.

Apple and email/password accounts restore account-linked ratings and stats across devices. Email accounts support password reset. A still-persisted legacy anonymous session is upgraded in place when creating a new account; signing into an existing account uses that account’s ranked profile. An already-lost anonymous session cannot be recovered from local rating values.

Cloud retention is specified in [FIREBASE.md](FIREBASE.md). The operator must configure cleanup/TTL and logging retention in the actual deployed project and verify them with timestamps. Deleting a live account does not instantly erase rolling infrastructure backups/logs; publish the real applicable retention and legal exceptions rather than promising an unsupported deadline. Do not log tokens, private boards, support message bodies or personal credentials.

## Policy publication checklist

Before publishing, supply the operator's legal/contact identity, effective date, Firebase processing locations and service providers, actual retention periods, user rights/request process, support response contact, intended audience and applicable international transfer terms. Explain that human ranked results affect rating and AI fallback results do not, and that other players see player display names and limited match progress, not private boards.

There are no editable usernames, messages, chat, profile photos or public boards in the intended release. If any are added, revisit moderation, report/block tools, data inventory and age rating. Do not describe the app as a Kids Category product without the separate child-privacy and parental-gate review that entails.

Signed-in Solo/Practice statistics and retained results are linked to the Firebase UID and stored in Firestore, alongside ranked totals. Firebase Auth stores the sign-in email (including an Apple relay email where selected) and provider identity; passwords are handled by Firebase Auth. These fields must be included in the published privacy policy and App Privacy disclosures.
