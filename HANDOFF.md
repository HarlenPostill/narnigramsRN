# Handoff notes

Status as of 26 Oct 2026, branch `native-ios-rebuild`. This was a fast first pass. The old Expo/React Native app, Firebase backend and their docs are gone. Git history still has them.

## Verified

- `xcodebuild` Debug build succeeds for the iOS Simulator with no errors.
- Home screen, Solo/Practice game screen and the Hard Practice bot run on an iPhone 17 simulator (iOS 27) and an iPad mini simulator.
- There are no automated tests yet. That was a deliberate choice for this pass.

## Not verified yet

- **Online matches.** The code compiles but hasn't run against real Game Center, because that needs the App Store Connect setup and two signed-in devices. See GAMECENTER.md.
- **Leaderboard and achievement submission.** Same reason.
- **Side-rail layout.** Not checked on screen. It should kick in on landscape, iPad landscape and foldable inner screens (wider than 640pt and roughly square or wider).
- **Drag and drop on device.** Tap-to-place has been the main input during testing.
- **Real device signing.** Automatic signing with team `Z43R7TX7Z9`.

## Known gaps and next steps

1. **App Store Connect:** create the leaderboards and achievements in GAMECENTER.md, plus achievement artwork.
2. **Host migration:** if the host of a 3–4 player match leaves, the match ends as "Match ended" and nobody gets a result. In 2-player matches, the remaining player wins by forfeit. A better version would re-elect the next player in `order` as host. That works if peers keep their own copy of the pile, which they can rebuild from the seed plus the peel and dump events they've seen.
3. **Trust model:** a finish claim is trusted once the pile is low. The host doesn't validate the claimant's board, so a modified client could cheat. Possible fix: send the final board with the claim and have the host validate it against the dictionary.
4. **Save and resume:** an in-progress game isn't saved when the app is killed. The old RN app had this. `GameSession` would need to become Codable to add it.
5. **Pause:** the timer keeps running in the background. Solo fastest times should probably pause on `scenePhase != .active`.
6. **Landing site (`landing/`):** its privacy policy still describes Firebase accounts, Apple/email sign-in and Firebase data storage. Rewrite it for Game Center only (no accounts, local stats, Apple handles Game Center data) before submitting.
7. **Credentials:** the old Supabase/Firebase keys remain in git history (see the old README in history). Rotate or revoke them, and shut down the old Firebase project if nothing else uses it. A local untracked `.env` file still exists and is gitignored.
8. **Icon:** `Assets.xcassets/AppIcon` has the 1024px light and dark icons. The tinted variant reuses the light icon, so a proper monochrome glyph would look better.
9. **Bot performance:** the Hard bot search runs on a detached task. If it lags on older devices, lower `searchBudget` in `Bot.swift`.
10. **Haptics/sounds:** haptics are in. There's no audio.

## Architecture in one breath

`GameSession` (@Observable, MainActor) owns the hand, board, pile and outcome. In local modes it owns the pile directly. Online, it forwards peel, dump and finish requests to `OnlineMatch` through `OnlinePileAuthority`, and `OnlineMatch` applies the host's broadcast events back onto the session. `GameView` reports finished games to `StatsStore` (UserDefaults) and `GameCenter` (leaderboards and achievements).
