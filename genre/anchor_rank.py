#!/usr/bin/env python3
"""anchor_rank.py - rank candidate Star Fighter features by how many INDEPENDENT genre games have them.

This is the anchor demo's law applied to requirements instead of facts. The demo's rule is:

    propose from a FIXED SPACE -> verify against real sources -> report MEASURED confidence
    -> refuse rather than invent, and let ANCHOR COUNT (independent sources) arbitrate.

Here:
    fixed space  = the feature rows in genre_matrix.json, derived from published games.
                   Nothing may enter the backlog that is not in that matrix.
    verify       = every cell carries a basis: a source URL, or "recall", or nothing.
    anchor count = how many of the 8 genre games have the capability. This is the ranking key,
                   exactly as anchor count strictly dominates in the demo's retention.
    refuse       = a feature whose evidence is mostly `unknown` is NOT scored low and quietly
                   buried. It is reported in its own UNRESOLVED section, because "we could not
                   establish this" and "the genre does not do this" are different answers and
                   collapsing them is the exact failure the anchor law exists to prevent.

WHAT THIS DELIBERATELY DOES NOT DO
    It does not turn an anchor count into a probability. The demo publishes a calibration curve
    (1 source 44.9%, 2 sources 87.3%, 3 sources 94.7%) measured on held-out FACT retrieval. That
    curve is about facts in a knowledge graph; reusing its numbers to say "this feature is 87.3%
    likely to be worth building" would be presenting a value from one domain as if it were
    measured in another - the precise substitution this project's iron law forbids. So the output
    is a COUNT and a GROUNDED FRACTION, labelled as such, and never a percentage of anything.

Usage:
    py genre/anchor_rank.py                 # ranked report to stdout
    py genre/anchor_rank.py --tasks         # emit TASKS.md-shaped lines for the top gaps
    py genre/anchor_rank.py --json out.json # machine-readable
"""
import argparse
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.join(HERE, "genre_matrix.json")

# A cell is "grounded" only if it names a real source. Recall is honest but weaker, and it is
# tracked separately rather than being rounded up into evidence.
GROUNDED_BASES = ("source", "url", "cited")


def load(path=MATRIX):
    if not os.path.exists(path):
        sys.exit("no matrix at %s - run the genre survey first" % path)
    with io.open(path, encoding="utf-8") as fh:
        return json.load(fh)


def score(feature, games):
    """Return the evidence profile for one feature. No opinions, just counts."""
    cells = feature.get("cells", {}) or {}
    yes = no = unknown = grounded = recalled = 0
    sources = []
    for g in games:
        c = cells.get(g, {}) or {}
        v = (c.get("v") or "unknown").lower()
        basis = (c.get("basis") or "none").lower()
        if v == "yes":
            yes += 1
        elif v == "no":
            no += 1
        else:
            unknown += 1
        if v in ("yes", "no"):
            if basis in GROUNDED_BASES and c.get("url"):
                grounded += 1
                sources.append(c["url"])
            elif basis == "recall":
                recalled += 1
    decided = yes + no
    return {
        "yes": yes, "no": no, "unknown": unknown,
        "decided": decided,
        "grounded": grounded, "recalled": recalled,
        "groundedFrac": (grounded / decided) if decided else 0.0,
        "sources": sources[:4],
    }


def ours_state(feature):
    o = feature.get("ours", {}) or {}
    return (o.get("v") or "unknown").lower(), o.get("uc") or "", o.get("note") or ""


def classify(feature, games, min_decided):
    """gap / have / unresolved. UNRESOLVED is a real verdict, not a low score."""
    s = score(feature, games)
    have, uc, note = ours_state(feature)
    if s["decided"] < min_decided:
        return "unresolved", s, have, uc, note
    if have in ("no", "partial", "unknown"):
        return "gap", s, have, uc, note
    return "have", s, have, uc, note


def rank(data, min_decided=4):
    games = [g["key"] for g in data.get("games", [])]
    gaps, haves, unresolved = [], [], []
    for f in data.get("features", []):
        kind, s, have, uc, note = classify(f, games, min_decided)
        row = {
            "id": f.get("id"), "capability": f.get("capability"),
            "category": f.get("category"), "ours": have, "uc": uc, "note": note,
            **s,
        }
        {"gap": gaps, "have": haves, "unresolved": unresolved}[kind].append(row)
    # ANCHOR COUNT DOMINATES, exactly as in the demo's retention: a capability 6 of 8 games have
    # outranks one that 3 have, whatever their grounding. Grounding only breaks ties among equal
    # anchor counts - which is the common case, and the only place it is safe to use it.
    gaps.sort(key=lambda r: (-r["yes"], -r["groundedFrac"], r["id"]))
    unresolved.sort(key=lambda r: (-r["unknown"], r["id"]))
    haves.sort(key=lambda r: (-r["yes"], r["id"]))
    return {"games": games, "gaps": gaps, "haves": haves, "unresolved": unresolved}


def fmt_report(data, r, top=0):
    games = r["games"]
    out = []
    out.append("ANCHOR RANK - candidate features by how many of %d genre games have them" % len(games))
    out.append("matrix generated %s | games: %s" % (data.get("generated", "?"), ", ".join(games)))
    out.append("")
    out.append("Ranking key is ANCHOR COUNT (independent games with the capability).")
    out.append("`grounded` = cells backed by a real source URL; the rest are recall and are")
    out.append("counted separately rather than rounded up into evidence. No number here is a")
    out.append("probability - see the module docstring for why that line is not crossed.")
    out.append("")
    gaps = r["gaps"][:top] if top else r["gaps"]
    out.append("== GAPS - the genre has it, we do not (or only partly) ==")
    out.append("%-5s %-4s %-8s %-11s %s" % ("id", "anch", "grounded", "ours", "capability"))
    for g in gaps:
        out.append("%-5s %d/%-2d %d/%-6d %-11s %s%s" % (
            g["id"], g["yes"], g["decided"], g["grounded"], g["decided"],
            g["ours"] + (" " + g["uc"] if g["uc"] else ""), g["capability"],
            "" if g["yes"] >= 2 else "   <- single-game idea, weak anchor"))
    out.append("")
    out.append("== UNRESOLVED - not enough evidence to place these either way (%d) ==" % len(r["unresolved"]))
    out.append("These are NOT low-priority. They are unmeasured. Settling one is its own task.")
    for u in r["unresolved"][:15]:
        out.append("  %-5s unknown in %d/%d games  %s" % (u["id"], u["unknown"], len(games), u["capability"]))
    out.append("")
    out.append("== ALREADY HAVE (%d) ==" % len(r["haves"]))
    for h in r["haves"][:10]:
        out.append("  %-5s %d/%-2d  %s  %s" % (h["id"], h["yes"], h["decided"], h["uc"] or "-", h["capability"]))
    if len(r["haves"]) > 10:
        out.append("  ... and %d more" % (len(r["haves"]) - 10))
    return "\n".join(out)


def fmt_tasks(r, top=12):
    """TASKS.md-shaped lines. Every one carries its anchor count so the reason it is on the list
    travels with it - a backlog item whose justification is lost is one that gets built on vibes."""
    out = ["## Genre gaps (anchor-ranked, auto-generated - see genre/anchor_rank.py)", ""]
    for g in r["gaps"][:top]:
        out.append("- [ ] %s  %s -> DONE WHEN: <observable>   <!-- anchor %d/%d games, %d grounded; ours=%s %s -->"
                   % (g["id"], g["capability"], g["yes"], g["decided"], g["grounded"], g["ours"], g["uc"]))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--matrix", default=MATRIX)
    ap.add_argument("--tasks", action="store_true")
    ap.add_argument("--json", dest="json_out")
    ap.add_argument("--top", type=int, default=0)
    ap.add_argument("--min-decided", type=int, default=4,
                    help="below this many decided cells a feature is UNRESOLVED, not ranked")
    a = ap.parse_args()
    data = load(a.matrix)
    r = rank(data, a.min_decided)
    if a.json_out:
        with io.open(a.json_out, "w", encoding="utf-8") as fh:
            json.dump(r, fh, indent=1)
        print("wrote %s" % a.json_out)
    print(fmt_tasks(r, a.top or 12) if a.tasks else fmt_report(data, r, a.top))


if __name__ == "__main__":
    main()
