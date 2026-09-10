# Arm D — the method, by hand, no engine

`armD-skill.ops` is the whole model written by Claude following
[`uml-requirements`](../../../TDRE/.claude/skills/uml-requirements/SKILL.md) — the engine's
method as instructions, with none of the engine. Same corpus arm C had: 28 terms, 36
claims, 1 recorded contradiction. Every check in the skill's hand-over list done by hand
while writing.

This is the arm that matters. Arm A asked whether Claude can write use cases cold (it can,
and three of twenty transitions did not connect). Arm D asks the harder question: **if
Claude already knows the method, what is the engine still for?**

## The numbers

Both arms scored by `bench/score.py`, which does not know which arm it is reading.

```
| use cases                |       26 |       31 |
| chains intact            |      5/5 |      5/5 |
| intervals ruled on       |     0/31 |    32/32 |
| use cases citing nothing |        0 |        0 |
| hallucinated citations   |        0 |        0 |
| corpus terms claimed     | 26/28 92%| 28/28 100%|
| decisions with no reason |       17 |        0 |
| no acceptance criterion  |        0 |        0 |
```

Arm D is ahead everywhere the two differ. **That is the least interesting fact on this
page**, for three reasons stated before the result rather than after it:

1. **Arm D was written knowing the metrics.** The skill's hand-over checklist and the
   scorer's metric list are the same list. Teaching to the test is exactly what this is.
2. **Arm C never finished.** Its run stopped at `round-limit` after 6 oracle calls with 83
   gaps parked. `0/31` intervals and 17 unargued decisions are *the loop stopped*, not
   *the method cannot*.
3. Same model wrote the arm, the skill, the detectors and the scorer.

So the table is not evidence that hand-writing beats the engine. What follows is evidence,
because it is about defects each side found in the other.

## What the engine found in arm D

Arm D went through the engine's detectors, with the skill's checklist having been run by
hand first and everything on it green.

> **DANGLING_POSTCONDITION · S:at_station** — established by UC-E1-3, required by nothing.

`UC-E1-3` spawns the pilot beside the space station. Across thirty use cases nothing ever
needed them to be there. **The station was scenery**, and the corpus says plainly that gems
can be "contributed to a base for credits" — so the missing beat was real, documented, and
sitting in a source I had read.

The checklist says to walk the chain state by state, and says in as many words *do not read
the sequence and judge that it flows*. I ran it, believed I had done it, and missed this.
The engine found it by subtraction, in milliseconds, and it would have found it on a model
ten times the size just as fast.

Answering it moved the gap one step and stopped in the right place: the new use case
establishes `S:credits_banked`, and nothing consumes *that*, because **the corpus never says
what a credit is for**. That gap is left open on purpose. It is a hole in the source
material, and closing it would mean inventing the answer — which is the thing this whole
tool exists to stop.

## What arm D found in the engine

Two defects the engine could not have found in its own output, both because arm C had never
produced the shape that triggers them.

**Extensions were walked as beats.** Arm D models two alternate paths as UML `<<extend>>` —
spending an extra life instead of respawning, running invasion waves instead of a survival
endgame. The chain walker took both for beats of the main success scenario and reported two
breaks. An extension is off the main path by definition; its precondition is a guard, not a
link. Arm C's model contains **zero** `extends` edges, so a walker that could not represent a
branch scored a perfect 5/5 for as long as nothing branched.

**The walk stopped at the epic boundary.** An extra life is bought in E3 and spent in E4 —
that connection is the reason the two arcs are one story. `upstream_states` walked only the
current epic, so it reported the fork as undecided on the one model that had bothered to
draw it, while the model's own `precedes E3 E4` sat there saying otherwise.

Both are fixed, both have regression checks in `bench/invariants.py`, and the zoo's clean
fixture now contains a correctly modelled branch — because a clean model with no branch in
it cannot catch a walker that breaks on branches.

## What this actually says

| | what it is good at |
|---|---|
| **Claude with the method** | writing the thing. Every use case in arm D is grounded, argued, falsifiable and in the right place, and the prose is better than anything the loop produced. Judgement — which contradiction is better supported, what an epic *is*, whether two beats are really one — has no arithmetic. |
| **the engine** | subtraction. It found a missing requirement that a careful pass with the checklist in hand missed, and it does not get tired at use case 200. Its findings are arithmetic, so they are the same on the first read and the thousandth. |

The failure mode each corrects in the other is the same failure mode, from opposite sides.
Claude's is that a model reads as complete because it is fluent. The engine's is that a
model reads as complete because the check for the missing thing was never written.

**Arm B is still not run** — Claude iterating freely without the method. Until it is, arm D
shows what *the method* buys, not what *structure* buys, and those are not the same claim.
