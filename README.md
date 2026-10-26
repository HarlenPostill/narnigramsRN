# Narnigrams

A native iOS word-tile race game written in SwiftUI. Build one connected crossword grid and use every tile. Game Center handles online matchmaking, leaderboards and achievements.

- **Online:** 2–4 player real-time matches through Game Center (matchmaking and friend invites).
- **Solo:** Short (50 tiles), Medium (72) or Long (100), with fastest-time leaderboards.
- **Practice:** Easy, Medium or Hard offline bot that draws from the same pile as you.

## Build

Requirements: Xcode 26 or later, iOS 18 deployment target.

```sh
brew install xcodegen   # only needed if you change project.yml
xcodegen generate
open Narnigrams.xcodeproj
```

`project.yml` is the source of truth. `Narnigrams.xcodeproj` is committed so the project opens without XcodeGen, but you need to regenerate it after adding files or changing settings.

In Debug builds, the `-demoGame` launch argument jumps straight into a Hard Practice game, which is handy for simulator screenshots.

## Layout

| Path | What's there |
| --- | --- |
| `Narnigrams/Game` | Pure game rules: seeded tile pool, board validation, Practice bot, `GameSession`, local stats |
| `Narnigrams/GameCenter` | Sign-in, leaderboard and achievement reporting, real-time `OnlineMatch` |
| `Narnigrams/Views` | SwiftUI screens. `TileView` holds the visual identity |
| `Narnigrams/Resources` | `words.txt` dictionary (ESDB) and its licence notice |

Game Center IDs and the App Store Connect setup are in [GAMECENTER.md](GAMECENTER.md). Open work is listed in [HANDOFF.md](HANDOFF.md).

## Design

The tiles are the app's one loud element: chunky maple tiles in SF Rounded Heavy, taken from the app icon. Everything else uses stock iOS components (List, Form, NavigationStack, the Game Center access point) so the app feels native and follows system appearance, Dynamic Type and accessibility.

Screen adaptivity: `GameView` switches between a stacked layout (outer screens, portrait phones) and a board-with-side-rail layout. The rail kicks in when the window is wider than 640pt and roughly square or wider, which covers foldable inner screens, landscape and iPad. All game state lives in `GameSession` above the view tree, so folding, unfolding or rotating mid-game keeps the match going.

## Dictionary

`words.txt` holds 194,232 entries generated from the English Speller Database (ESDB, formerly SCOWL), pinned at commit `1e5b7d3a`. The licence notice ships in the app (Settings › Word list notice). Online players must use the same dictionary, so treat any change to the word list as a breaking change for multiplayer.
