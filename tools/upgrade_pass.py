#!/usr/bin/env python3
"""upgrade_pass.py - one full improvement pass over Star Fighter, and the report RJ reads.

    py -3.13 tools/upgrade_pass.py            # run a pass, rewrite GAME_UPGRADES.md
    py -3.13 tools/upgrade_pass.py --dry      # print the report, write nothing

A pass is:
  1. rebuild the UML class + use-case model from the CODE (tools/uml_js.py)
  2. rank the genre gap list by anchor count (genre/anchor_rank.py)
  3. read the live task list (TASKS.md)
  4. write GAME_UPGRADES.md - one page, what moved, what is next, what is unmeasured

WHY THE REPORT IS GENERATED AND NOT WRITTEN BY HAND
The use-case model says 49 of 51 WORKS. Read alone that says the game is finished, and it is
wrong - not because a status is wrong, but because USE_CASES.md only ever gained a row AFTER
someone built the thing. It is a record of work done, not a measure of work outstanding; its
denominator is missing. The genre matrix supplies that denominator from published games, so this
report always shows the two side by side and never quotes the use-case tally on its own.

NO FALLBACKS: if an input is missing this exits non-zero and says which one. It does not
substitute a stale number, because a report that silently keeps yesterday's figure is worse than
no report - you cannot see that it stopped measuring.
"""
import io
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable or "py"


def run(args, why):
    r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("FAILED (%s): %s\n%s\n%s" % (why, " ".join(args), r.stdout[-2000:], r.stderr[-2000:]))
    return r.stdout


def need(path, hint):
    p = os.path.join(ROOT, path)
    if not os.path.exists(p):
        sys.exit("missing input: %s\n  %s" % (path, hint))
    return p


def read_json(path):
    with io.open(os.path.join(ROOT, path), encoding="utf-8") as fh:
        return json.load(fh)


def task_stats():
    """Count the live list. `[x]` done, `[ ]` open, `[!]` blocked, `[-]` dropped."""
    p = os.path.join(ROOT, "TASKS.md")
    if not os.path.exists(p):
        return None
    txt = io.open(p, encoding="utf-8").read()
    marks = re.findall(r"^- \[([ x!\-])\]\s+(\S+)\s+(.*)$", txt, re.M)
    out = {"done": [], "open": [], "blocked": [], "dropped": []}
    for m, tid, rest in marks:
        key = {"x": "done", " ": "open", "!": "blocked", "-": "dropped"}[m]
        out[key].append((tid, rest.split("->")[0].strip()[:90]))
    return out


def main():
    dry = "--dry" in sys.argv
    need("tools/uml_js.py", "the UML builder should be checked in")
    uml_out = run([PY, "tools/uml_js.py"], "rebuild UML")

    need("genre/genre_matrix.json",
         "the genre survey has not been run - without it there is no denominator, only a list of what we already built")
    rank_out = run([PY, "genre/anchor_rank.py", "--top", "20"], "anchor-rank the genre gaps")
    tasks_out = run([PY, "genre/anchor_rank.py", "--tasks", "--top", "14"], "emit task lines")

    model = read_json("uml/model.json")
    matrix = read_json("genre/genre_matrix.json")
    tally = model.get("tally", {})
    ts = task_stats()

    feats = matrix.get("features", [])
    games = [g["key"] for g in matrix.get("games", [])]
    cells = decided = grounded = 0
    for f in feats:
        for g in games:
            c = (f.get("cells", {}) or {}).get(g) or {}
            cells += 1
            v = (c.get("v") or "unknown").lower()
            if v in ("yes", "no"):
                decided += 1
                if (c.get("basis") or "").lower() in ("source", "url", "cited") and c.get("url"):
                    grounded += 1
    ours = {}
    for f in feats:
        k = ((f.get("ours") or {}).get("v") or "unknown").lower()
        ours[k] = ours.get(k, 0) + 1

    L = []
    L.append("# Star Fighter - upgrade report")
    L.append("")
    L.append("Generated %s by `py tools/upgrade_pass.py`. Every number here is produced by a tool in"
             % time.strftime("%Y-%m-%d %H:%M"))
    L.append("this repo; nothing is typed in by hand, so a stale figure shows up as a failed pass")
    L.append("rather than as a confident wrong number.")
    L.append("")
    L.append("## Where the game stands")
    L.append("")
    L.append("| measure | value | what it does and does not tell you |")
    L.append("|---|---|---|")
    L.append("| use cases WORKS / PARTLY / MISSING / DEPRECATED | %d / %d / %d / %d | Work RECORDED, not work outstanding. A row is only ever added after the feature is built, so this can never show a gap. |"
             % (tally.get("WORKS", 0), tally.get("PARTLY", 0), tally.get("MISSING", 0), tally.get("DEPRECATED", 0)))
    L.append("| modules in the class model | %d | Regex-extracted from source. A module that exposes its API through a parameter alias instead of `window.NAME` is invisible to it. |"
             % len(model.get("modules", [])))
    L.append("| genre capabilities surveyed | %d across %d games | The missing denominator: what published space games do, whether or not we do it. |"
             % (len(feats), len(games)))
    L.append("| genre cells decided / grounded with a source | %d of %d decided, %d grounded | `unknown` is kept as `unknown`. Ungrounded cells are recall and are counted apart from evidence. |"
             % (decided, cells, grounded))
    L.append("| ours: yes / partial / no / unknown | %d / %d / %d / %d | Against the genre list, not against our own use cases. |"
             % (ours.get("yes", 0), ours.get("partial", 0), ours.get("no", 0), ours.get("unknown", 0)))
    L.append("")
    if ts:
        L.append("## The live list (TASKS.md)")
        L.append("")
        L.append("%d done · %d open · %d blocked · %d dropped with a reason"
                 % (len(ts["done"]), len(ts["open"]), len(ts["blocked"]), len(ts["dropped"])))
        L.append("")
        for tid, what in ts["open"][:12]:
            L.append("- open **%s** %s" % (tid, what))
        for tid, what in ts["blocked"]:
            L.append("- BLOCKED **%s** %s" % (tid, what))
        L.append("")
    L.append("## Genre gaps, ranked by anchor count")
    L.append("")
    L.append("Anchor count is how many of the %d surveyed games have the capability. It is the" % len(games))
    L.append("ranking key on purpose: a thing six independent games all do is a genre expectation,")
    L.append("and a thing one game does is that game's idea. Nothing here is a probability.")
    L.append("")
    L.append("```")
    L.append(rank_out.strip())
    L.append("```")
    L.append("")
    L.append("## Ready-to-take task lines")
    L.append("")
    L.append("Paste into TASKS.md and give each one an observable before starting it.")
    L.append("")
    L.append("```")
    L.append(tasks_out.strip())
    L.append("```")
    L.append("")
    L.append("## Tool output this pass")
    L.append("")
    L.append("```")
    L.append(uml_out.strip())
    L.append("```")
    text = "\n".join(L) + "\n"

    if dry:
        print(text)
        return
    with io.open(os.path.join(ROOT, "GAME_UPGRADES.md"), "w", encoding="utf-8") as fh:
        fh.write(text)
    print("wrote GAME_UPGRADES.md - %d genre capabilities, %d decided cells, %d grounded"
          % (len(feats), decided, grounded))


if __name__ == "__main__":
    main()
