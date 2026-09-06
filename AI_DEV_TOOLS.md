# What our AI dev tools actually cost, and what each one is for

Measured on this repo on 2026-09-06, not estimated. Every row is a tool that was really run
against Star Fighter that day; the cost column is what the run reported, not a list price.

The reason this file exists: it is easy to reach for the biggest tool every time. Most of the
value here came from cheap tools used at the right moment, and the expensive ones earned their
cost only when the question genuinely needed breadth.

---

## The ledger

| tool | what it is | measured cost | what it returned | when it is worth it |
|---|---|---|---|---|
| **Subagent - broad audit** | one background agent reading the whole tree for defects | **225k tokens, 49 tool calls, 10m05s** | 22 findings with file:line and a reproduction each; 2 were destructive bugs a player would hit | A question whose answer is spread over 40+ files. Never for a lookup. |
| **Subagent - document read** | one agent reading six requirement docs and the git log | **143k tokens, 19 tool calls, 2m30s** | every non-WORKS status line quoted; found that all line citations point at a file that never existed | Reconciling several documents that disagree. Very good value. |
| **Measurement harness** (`sim_harness.js`) | drives the game's own `frame()` with a synthetic clock | ~1 hour to write, runs in seconds | the 7,781-writes-per-frame finding, and every before/after number since | Any claim about performance. Nothing else here can produce an honest ms/frame. |
| **UML extractor** (`tools/uml_js.py`) | regex class + use-case model from source | seconds per run | caught six modules missing from the class diagram | Every session. Cheap enough to run on every change. |
| **Anchor ranking** (`genre/anchor_rank.py`) | ranks candidate features by how many published games have them | seconds per run | turns "what should we build" from taste into a count | Whenever the backlog needs an order that is not the loudest opinion. |
| **`/autonomous-worker` skill** | a durable task list with an observable per item | no direct token cost | caught one of my own targets being wrong before it shipped | Multi-item jobs where the session may be long. See below. |
| **Browser pane driving** | script the running game, read real state | seconds | reproduced the destructive bugs on the live game before fixing | Proving a bug exists, and proving it is gone. |

---

## The two that changed an outcome, not just an opinion

**The harness paid for itself twice.** It produced the rock-field finding that no amount of
reading would have surfaced, and then it caught a regression in its own measurement: a profiling
probe declared a global `rr`, which collided with the game's own `rr()`, and the next reading
came back 31.6 ms/frame against a true 15.3. Without a second clean run the wrong number would
have been the one in the commit message.

**The task list caught a bad target.** The performance item was written as "get rock writes under
1,000 per frame" before anyone measured where the rocks are. More than half sit close to the
player, so that target could only have been met by making rocks visibly stutter. Because the
target was written down as an observable, the miss was visible; without it the work would have
shipped as "made the rocks faster" and nobody would have known what was traded away.

---

## How to use each one well

**Subagents.** One question per agent, and say what an acceptable *negative* answer looks like.
The audit prompt said "a short list of certain defects is worth far more than a long list of
maybes" and "if you are not sure, say so" - and it came back with two findings explicitly marked
uncertain, which is the behaviour you want. An agent told only to "find problems" finds problems
whether or not they exist. Run independent agents in parallel; they cost wall-clock time, not
your attention.

**The harness.** Build it before the first performance claim, not after. The reason is not
convenience: an automated browser tab reports `innerWidth` 0, resolves `vw`/`vh` to 0, and
freezes `document.timeline`, so every layout and animation reading taken in one is wrong, and
wrong in a way that looks like a product bug. Check `innerWidth` and whether the timeline is
advancing before believing any number that came out of a headless page.

**Never let the probe touch the namespace it is measuring.** Wrap injected code in an IIFE.
A bare `var x =` in a browser eval overwrites a global of that name in the program under test.

**The ranking tool.** Feed it evidence, not opinion, and let `unknown` stay `unknown`. Its whole
value is that it refuses to convert absence of evidence into a low score.

**`/autonomous-worker`.** Give every item an observable a stranger could re-check, and re-run
that observable before reporting - not from memory. Its weak spots, both now fixed in the skill
file itself: it said nothing about another agent working the same tree at the same time, and its
"read ./TASKS.md" is ambiguous when the session starts in one repo and the work is in another.

---

## What is NOT worth it

- **A big agent for a lookup.** "Where is X defined" is a grep. The 225k-token audit answered a
  question grep could not: which of 22 candidate defects are real and what breaks for a player.
- **Reading source to answer "does the game do X".** The use-case model answers it in seconds -
  and where the model is the thing in doubt, an agent that checks the model against the code is
  the right tool, which is exactly what the ground-truth pass was for.
- **Optimising against a number you have not sanity-checked.** Roughly half the measured frame
  cost is rendering, and rendering measured in a hidden tab may not reflect a real machine. The
  simulation half does. Spend effort where the measurement is trustworthy.
