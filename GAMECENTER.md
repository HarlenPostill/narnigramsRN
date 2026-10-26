# Game Center setup

Bundle ID: `com.hrln-interaction.narnigrams` (team `Z43R7TX7Z9`). The Game Center capability is on in `Narnigrams.entitlements`.

In App Store Connect › your app › Services › Game Center, create the items below. The IDs must match `Narnigrams/GameCenter/GameCenterIDs.swift` exactly.

## Leaderboards

| ID | Name | Format | Sort | Submission |
| --- | --- | --- | --- | --- |
| `narnigrams.fastest.short` | Fastest Short | Elapsed time (hundredths of a second) | Low to high | Best score |
| `narnigrams.fastest.medium` | Fastest Medium | Elapsed time (hundredths of a second) | Low to high | Best score |
| `narnigrams.fastest.long` | Fastest Long | Elapsed time (hundredths of a second) | Low to high | Best score |
| `narnigrams.wins.online` | Online Wins | Integer | High to low | Best score |
| `narnigrams.wins.total` | Total Wins | Integer | High to low | Best score |

The client counts wins locally and submits the running total. Use "Best score" so a reinstall, which resets the local count, never lowers a player's leaderboard entry.

## Achievements

| ID | Title | How to earn it | Suggested points |
| --- | --- | --- | --- |
| `narnigrams.first_win` | First Grid | Win any game | 10 |
| `narnigrams.first_online_win` | Out in the World | Win an online match | 25 |
| `narnigrams.speed.short_90` | Quick Fingers | Win a Short solo game in under 90 seconds | 50 |
| `narnigrams.speed.medium_180` | Speed Speller | Win a Medium solo game in under 3 minutes | 50 |
| `narnigrams.marathon` | Marathon | Win a Long solo game | 25 |
| `narnigrams.no_dump` | Clean Hands | Win a Medium or Long solo game without dumping | 50 |
| `narnigrams.word_7` | Seven Up | Win with a 7+ letter word on your board | 20 |
| `narnigrams.word_10` | Wordsmith | Win with a 10+ letter word on your board | 75 |
| `narnigrams.beat_bot.easy` | Warm-up | Beat the Easy bot | 10 |
| `narnigrams.beat_bot.medium` | Sparring Partner | Beat the Medium bot | 25 |
| `narnigrams.beat_bot.hard` | Machine Breaker | Beat the Hard bot | 50 |
| `narnigrams.streak_5` | On a Roll | Win 5 games in a row | 40 |
| `narnigrams.wins_10` | Regular | Win 10 games (progressive) | 20 |
| `narnigrams.wins_50` | Devotee | Win 50 games (progressive) | 50 |
| `narnigrams.wins_100` | Centurion | Win 100 games (progressive) | 100 |
| `narnigrams.online_10` | Familiar Face | Play 10 online matches (progressive) | 30 |
| `narnigrams.heavy_hitters` | Heavy Hitters | Win with J, Q, X and Z all on your board | 75 |
| `narnigrams.full_table` | Full Table | Win a 4-player online match | 50 |

Each achievement needs a 512×512 or 1024×1024 image in App Store Connect. You can export them from `TileView` (for example, a tile with a short glyph).

## Matchmaking

- Online play uses real-time `GKMatch`, 2–4 players, with `canStartWithMinimumPlayers` enabled.
- The player with the lowest `gamePlayerID` hosts. The host picks a seed, and every device builds the same tile pool from it, so messages only carry tile ids.
- The host owns the draw pile. It processes peel, dump and finish requests in order and broadcasts the results. Board contents are never sent, so opponents only see progress counts.
- Friend invites arrive through `GKLocalPlayerListener` and open the matchmaker UI.

To test online play, you need two physical devices (or one device and one simulator) signed into different sandbox Game Center accounts. Game Center matchmaking needs the app record and the Game Center capability set up in App Store Connect first.
