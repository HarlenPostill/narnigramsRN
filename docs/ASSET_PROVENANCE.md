# Asset and dictionary provenance

Audit date: 19 September 2026. Git history is evidence of when a file entered this repository, not evidence of ownership or a commercial license.

## Dictionary

`assets/words.txt` now contains **194,232** entries generated from [English Speller Database (ESDB)](https://github.com/en-wl/wordlist/tree/1e5b7d3a72f47a71da5d28686c1dd4b397178485), pinned at `1e5b7d3a72f47a71da5d28686c1dd4b397178485`. ESDB was formerly SCOWL. Its maintainers publish permissive redistribution terms; the complete notice is in [licenses/ESDB-Copyright.txt](licenses/ESDB-Copyright.txt) and `assets/wordlist-notice.json`, which is displayed in-app. Keep the notices with both client and server distributions.

SHA-256 of the exact generated file: `bf635876f7265355e64ff5f572ce1bff8a467403a2292304bf7df10b9e022936`.

The vocabulary combines US, British -ise/-ize, Canadian and Australian spellings at size 80, variant level 1. Generation excludes abbreviations, tagged proper names, nonwords, word parts, special categories, and words tagged offensive/vulgar. A final ASCII lowercase-only filter removes capitalized names, punctuation, digits and accented spellings before uppercasing and sorting. Minimum length is two. This is a Narnigrams vocabulary, not an official tournament dictionary. Upstream annotations are incomplete: the filter is not a guarantee that every offensive expression or proper noun is absent. Opponent boards and words are private; no shared dictionary browser or word suggestions are exposed.

To reproduce (Python 3, SQLite and Make required):

```sh
git clone https://github.com/en-wl/wordlist.git /tmp/narnigrams-esdb
git -C /tmp/narnigrams-esdb checkout 1e5b7d3a72f47a71da5d28686c1dd4b397178485
python3 scripts/generate-dictionary.py /tmp/narnigrams-esdb
```

The generator verifies the pinned, unmodified source, builds the upstream database and writes the dictionary, checksum metadata and notices. Normal builds use checked-in assets and need no source download. Any vocabulary change requires a new online ruleset/dictionary version and a client/server coordinated rollout; do not change the accepted words mid-match.

The previous list arrived in commit `38e00aa` with 279,496 entries and no provenance or license. Its count matches the CSW19 total in [WESPA's publication](https://www.wespa.org/csw19ik.pdf), which raised a concern but does not establish identity. It has been replaced rather than assumed licensed. Historical copies remain in git history; no history rewrite was performed.

## Images, icons, fonts and sound

| Asset | Repository evidence | Release action |
| --- | --- | --- |
| `narnigrams-logo.png`, `narnigrams-splash.png`, light/dark app icons | Branding additions in `5f35daf` / `ec75a6c` | Owner must record original creator, source files, and ownership/license. Names alone do not prove rights. |
| Android adaptive icon layers and web favicon | Added with Expo starter in `e4acf4d`; still referenced by `app.json` | Replace these platform starter visuals with approved Narnigrams artwork before public Android/web distribution. Confirm any retained starter attribution. iOS uses separate Narnigrams icons. |
| Unused React logos, generic icon and splash icon | Starter files; no code/config references | Removed from working tree to avoid accidental reuse. |
| Tile shapes and text | Rendered by game components | No third-party tile image or sound packs identified. System fonts and Expo icon packages retain their upstream package licenses. |

No standalone audio assets or bundled custom font files were found. Re-audit dependency notices when packages change.

## Game design and branding

The inherited standard letter weights in `utils/tile-distribution.ts` match a familiar commercial tile distribution and the original comment named that game. Numeric mechanics do not establish ownership of another game's artwork, writing, packaging or brand. Narnigrams uses its own UI and naming; release metadata must describe its own play modes and must not imply affiliation or use competitor trademarks as keywords. The owner should review the final name, icon, screenshots and promotional copy for distinctiveness before release. No trademark clearance or ownership representation is made by this audit.
