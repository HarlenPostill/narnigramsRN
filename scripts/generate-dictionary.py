#!/usr/bin/env python3
"""Rebuild the bundled dictionary from a separately checked-out, pinned ESDB source.

Usage: python3 scripts/generate-dictionary.py /path/to/en-wl-wordlist
This deliberately performs no network access and never updates the source pin.
"""

import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

COMMIT = "1e5b7d3a72f47a71da5d28686c1dd4b397178485"
SOURCE = "https://github.com/en-wl/wordlist"
ARGS = [
    "word-list", "80", "A,B,Z,C,D", "1", "--categories=", "--wo-poses=abbr",
    "--wo-pos-categories=nonword,special,wordpart",
    "--wo-pos-classes=person,surname,place,name,demonym,trademark,abbr,upper,name?,upper?,abbr?",
    "--wo-usage-notes=offensive-1,offensive-2,offensive-3,vulgar-1,vulgar-2,vulgar-3",
]


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source = Path(sys.argv[1]).resolve()
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=source, text=True).strip()
    if actual != COMMIT:
        raise SystemExit(f"Expected ESDB commit {COMMIT}; found {actual}")
    dirty = subprocess.check_output(["git", "status", "--porcelain", "--untracked-files=no"], cwd=source, text=True)
    if dirty:
        raise SystemExit("Refusing modified ESDB source; use a clean pinned checkout")
    subprocess.run(["make"], cwd=source, check=True)
    raw = subprocess.check_output([str(source / "scowl"), *ARGS], cwd=source, text=True)
    words = sorted({word.upper() for word in raw.splitlines() if re.fullmatch(r"[a-z]{2,}", word)})
    if len(words) < 100_000 or not {"AN", "AT", "BE", "CAT", "DO", "GO", "IN", "IS", "IT", "OF", "ON", "TO"} <= set(words):
        raise SystemExit("Dictionary sanity check failed")
    data = ("\n".join(words) + "\n").encode("ascii")
    digest = hashlib.sha256(data).hexdigest()
    root = Path(__file__).resolve().parent.parent
    notice = (source / "Copyright").read_text()
    (root / "assets/words.txt").write_bytes(data)
    (root / "assets/wordlist-notice.json").write_text(json.dumps({
        "name": "English Speller Database (ESDB)", "source": SOURCE,
        "commit": COMMIT, "sha256": digest, "wordCount": len(words),
        "generationArgs": ARGS, "license": notice,
    }, indent=2) + "\n")
    (root / "docs/licenses").mkdir(parents=True, exist_ok=True)
    (root / "docs/licenses/ESDB-Copyright.txt").write_text(notice)
    print(f"Generated {len(words):,} words; SHA-256 {digest}")


if __name__ == "__main__":
    main()
