#!/usr/bin/env python3
"""Re-resolve `index.html:NNN` citations in a use-case document against the file as it is NOW.

WHY THIS EXISTS. `tools/watch_upgrades.cmd` -> `tools/upgrade_pass.py` rewrites index.html while
you work, and it does not move every region by the same amount. ASTEROID_USE_CASES.md was written
with 36 citations and, checked an hour later, essentially none of them still landed on the line
they named: index.html:406 had been MINING_BOTS and was KP_YAW; :1336 had been destroyAsteroid and
was spawnAsteroid. Nothing announced it. A document full of confident line numbers that point at
the wrong lines is worse than one with none, because it reads as verified.

A line number is not an anchor - a SYMBOL is. So each citation is re-resolved by finding the token
the document says lives there, and the line is rewritten to wherever that token is now. Run it
whenever the file has moved; it is idempotent, and it prints what it changed.

    py tools/reanchor.py ASTEROID_USE_CASES.md            # report only
    py tools/reanchor.py ASTEROID_USE_CASES.md --write    # rewrite the citations

An UNRESOLVABLE citation is reported and left alone rather than deleted: the symbol may have been
renamed, and quietly dropping the claim would hide exactly the change worth knowing about.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"

# a citation, and the backtick-quoted symbols near it that say what should be there
CITE = re.compile(r"index\.html:(\d+)(?:-\d+)?")
TOKEN = re.compile(r"`([A-Za-z_][A-Za-z0-9_.]{2,})`")


def line_of(src_lines, token: str, prefer: int | None = None) -> int | None:
    """Where `token` is DEFINED, or failing that first used. Nearest to `prefer` when several."""
    tok = token.split(".")[-1]
    defs, uses = [], []
    dpat = re.compile(r"(function\s+" + re.escape(tok) + r"\b|(?:const|let|var)\s+" + re.escape(tok)
                      + r"\b|\b" + re.escape(tok) + r"\s*:)")
    upat = re.compile(r"\b" + re.escape(tok) + r"\b")
    for i, l in enumerate(src_lines, 1):
        if dpat.search(l):
            defs.append(i)
        elif upat.search(l):
            uses.append(i)
    pool = defs or uses
    if not pool:
        return None
    if prefer is None:
        return pool[0]
    return min(pool, key=lambda n: abs(n - prefer))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("doc")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()

    src = SRC.read_text(encoding="utf-8").split("\n")
    p = ROOT / a.doc if not Path(a.doc).is_absolute() else Path(a.doc)
    text = p.read_text(encoding="utf-8")

    moved = stale = same = unresolved = 0
    out = []
    for raw in text.split("\n"):
        line = raw
        for m in list(CITE.finditer(raw)):
            old = int(m.group(1))
            toks = TOKEN.findall(raw)
            new = None
            for t in toks:
                new = line_of(src, t, prefer=old)
                if new:
                    break
            if new is None:
                unresolved += 1
                print(f"  UNRESOLVED  index.html:{old}  (no quoted symbol resolves) :: {raw.strip()[:70]}")
                continue
            if new == old:
                same += 1
                continue
            moved += 1
            stale += 1
            print(f"  moved  index.html:{old} -> :{new}   ({toks[0]})")
            line = line.replace(f"index.html:{old}", f"index.html:{new}", 1)
        out.append(line)

    print(f"\n{same} citation(s) still correct, {moved} moved, {unresolved} unresolvable")
    if a.write and moved:
        p.write_text("\n".join(out), encoding="utf-8")
        print(f"rewrote {p.name}")
    elif moved:
        print("(report only - pass --write to rewrite)")
    return 1 if unresolved else 0


if __name__ == "__main__":
    sys.exit(main())
