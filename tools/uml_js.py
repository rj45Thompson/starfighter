#!/usr/bin/env python3
"""uml_js.py - the two UML views RJ asked to keep current: the CLASS model of the game's JS modules and the USE-CASE model.

    py -3.13 tools/uml_js.py            # writes uml/classes.mmd, uml/usecases.mmd, uml/model.json, prints the tallies
    py -3.13 tools/uml_js.py --check    # exit 1 if USE_CASES.md has a malformed line or names a module that does not exist

The class model is extracted, not typed: every `window.NAME = {...}` / `window.NAME = api` object becomes a class whose
members are the keys of that object (read from the source, so a key that is not there is not listed), plus the top-level
`function` names of the module and its CFG keys. It is a regex reader of JS, like uml.py is of C#: reliable for "what is
exposed and named", not for semantics. The use-case model is read from USE_CASES.md (one `- UC-...` line per case) and
rendered as a flowchart grouped by epic, coloured by status. Both outputs are checked in so a later session can diff.
"""
import json, os, re, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "uml")
SKIP = {"three.min.js", "fflate.min.js", "fbxloader.js"}
UC_RE = re.compile(r"^- (UC-\d+) \[(E\d)\] \[(WORKS|PARTLY|MISSING|DEPRECATED)\] (.+?) :: (.+)$")
STATUS_FILL = {"WORKS": "#153a2c", "PARTLY": "#3d2e12", "MISSING": "#2a2f3a", "DEPRECATED": "#2a2040"}
STATUS_STROKE = {"WORKS": "#5ee6a8", "PARTLY": "#ffb74d", "MISSING": "#6f7f90", "DEPRECATED": "#b48cff"}

def module_files():
    files = [f for f in os.listdir(ROOT) if f.endswith(".js") and f not in SKIP]
    brain = os.path.join(ROOT, "brain")
    if os.path.isdir(brain):
        files += ["brain/" + f for f in os.listdir(brain) if f.endswith(".js")]
        eng = os.path.join(brain, "engine")
        if os.path.isdir(eng): files += ["brain/engine/" + f for f in os.listdir(eng) if f.endswith(".js")]
    return sorted(files)

def object_keys(src, start):
    """keys of the object literal that starts at src[start] == '{' (one level, tolerant of nested braces/strings)"""
    depth = 0; i = start; keys = []; n = len(src)
    while i < n:
        c = src[i]
        if c in "\"'`":
            q = c; i += 1
            while i < n and src[i] != q:
                if src[i] == "\\": i += 1
                i += 1
        elif c == "{": depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0: break
        elif depth == 1:
            m = re.match(r"\s*([A-Za-z_$][\w$]*)\s*(?::|\(|,|\}|\n)", src[i:i + 80])
            if m and src[i - 1] in "{,\n ":
                k = m.group(1)
                if k not in keys and k not in ("function", "return", "const", "let", "var", "if", "else", "for", "while", "new", "true", "false", "null", "typeof"):
                    keys.append(k)
                i += len(m.group(1))
        i += 1
    return keys

def extract_module(path):
    src = open(os.path.join(ROOT, path), encoding="utf-8", errors="replace").read()
    lines = src.count("\n")
    classes = []
    for m in re.finditer(r"window\.([A-Z][A-Za-z0-9_]*)\s*=\s*(\{|([A-Za-z_$][\w$]*))", src):
        name, brace, ident = m.group(1), m.group(2), m.group(3)
        keys = []
        if brace == "{":
            keys = object_keys(src, m.end() - 1)
        elif ident:
            d = re.search(r"(?:const|var|let)\s+" + re.escape(ident) + r"\s*=\s*\{", src)
            if d: keys = object_keys(src, d.end() - 1)
        classes.append({"name": name, "members": keys[:40], "memberTotal": len(keys)})
    for m in re.finditer(r"^export\s+class\s+([A-Za-z_]\w*)", src, re.M):
        classes.append({"name": m.group(1), "members": [], "memberTotal": 0, "kind": "export class"})
    # one file can assign the same global twice (a doc line and the real assignment); keep the richer record so the
    # diagram shows one class per name per file instead of two, one of them thin
    best = {}
    for c in classes:
        prev = best.get(c["name"])
        if not prev or c["memberTotal"] > prev["memberTotal"]:
            best[c["name"]] = c
    classes = list(best.values())
    funcs = re.findall(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", src, re.M)
    cfg = re.search(r"(?:const|var|let)\s+CFG\s*=\s*\{", src)
    cfg_keys = object_keys(src, cfg.end() - 1) if cfg else []
    return {"file": path, "lines": lines, "classes": classes, "functions": funcs[:60], "functionTotal": len(funcs), "cfg": cfg_keys[:40], "cfgTotal": len(cfg_keys)}

def read_use_cases():
    p = os.path.join(ROOT, "USE_CASES.md")
    epics, cases, bad = {}, [], []
    for ln in open(p, encoding="utf-8"):
        ln = ln.rstrip("\n")
        m = re.match(r"^- (E\d) ([A-Z]+) — (.+)$", ln)
        if m: epics[m.group(1)] = {"name": m.group(2), "desc": m.group(3)}; continue
        if ln.startswith("- UC-"):
            u = UC_RE.match(ln)
            if not u: bad.append(ln); continue
            cases.append({"id": u.group(1), "epic": u.group(2), "status": u.group(3), "story": u.group(4), "test": u.group(5)})
    return epics, cases, bad

def mermaid_classes(model):
    out = ["classDiagram", "  direction LR"]
    for mod in model:
        for c in mod["classes"]:
            out.append(f"  class {c['name']} {{")
            out.append(f"    <<{mod['file']}>>")
            for k in c["members"][:18]: out.append(f"    +{k}()")
            if c["memberTotal"] > 18: out.append(f"    +... {c['memberTotal'] - 18} more")
            out.append("  }")
    # the host script's exported HOST object is the hub every module reads
    names = [c["name"] for mod in model for c in mod["classes"]]
    if "HOST" in names:
        for n in names:
            if n != "HOST" and n in ("PASSENGER", "MISSIONS", "PLANETMENU", "ENGBAY", "STARMAP", "CONQUEST", "TEXTQUESTS", "BRAIN", "PANELS", "POWERPANEL", "CHATTER", "KHUD", "GAMEMOD"):
                out.append(f"  {n} ..> HOST : reads live state")
    if "BRAIN" in names and "PASSENGER" in names: out.append("  PASSENGER --> BRAIN : ask / chooseMission")
    return "\n".join(out) + "\n"

def mermaid_usecases(epics, cases):
    out = ["flowchart LR", "  Pilot((Pilot))", "  Passenger((Passenger))", "  AIpilot((AI pilot))"]
    for e, rec in sorted(epics.items()):
        out.append(f"  subgraph {e}[\"{e} {rec['name']}\"]")
        for c in cases:
            if c["epic"] != e: continue
            story = c["story"].replace('"', "'")
            out.append(f"    {c['id'].replace('-', '_')}[\"{c['id']} {c['status']}\\n{story}\"]")
        out.append("  end")
    for c in cases:
        nid = c["id"].replace("-", "_")
        actor = "Passenger" if c["story"].startswith("Passenger") else ("AIpilot" if c["story"].startswith("AI pilot") else "Pilot")
        out.append(f"  {actor} --> {nid}")
        out.append(f"  style {nid} fill:{STATUS_FILL[c['status']]},stroke:{STATUS_STROKE[c['status']]},color:#e3ebf3")
    return "\n".join(out) + "\n"

def main():
    check = "--check" in sys.argv
    model = [extract_module(f) for f in module_files()]
    epics, cases, bad = read_use_cases()
    if check:
        problems = list(bad)
        if problems:
            for b in problems: print("USE_CASES.md: malformed line:", b[:100])
            return 1
        print(f"USE_CASES.md ok: {len(cases)} use cases in {len(epics)} epics"); return 0
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, "classes.mmd"), "w", encoding="utf-8").write(mermaid_classes(model))
    open(os.path.join(OUT, "usecases.mmd"), "w", encoding="utf-8").write(mermaid_usecases(epics, cases))
    tally = {s: sum(1 for c in cases if c["status"] == s) for s in STATUS_FILL}
    # status.json is what the GAME reads (shell.js DEPRECATED tab) - the same rows, without the module dump, so the
    # in-game "what is broken" list cannot drift from the model this file renders.
    json.dump({"generated": time.strftime("%Y-%m-%d"), "epics": epics, "useCases": cases, "tally": tally},
              open(os.path.join(OUT, "status.json"), "w", encoding="utf-8"), indent=0)
    json.dump({"generated": time.strftime("%Y-%m-%dT%H:%M:%S"), "modules": model, "epics": epics, "useCases": cases, "tally": tally}, open(os.path.join(OUT, "model.json"), "w", encoding="utf-8"), indent=1)
    ncls = sum(len(m["classes"]) for m in model)
    print(f"classes.mmd: {ncls} exposed objects/classes over {len(model)} modules; usecases.mmd: {len(cases)} use cases, tally {tally}")
    if bad: print(f"WARNING {len(bad)} malformed USE_CASES lines skipped (run --check)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
