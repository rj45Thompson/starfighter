# Three arms, and what they measure

The question worth answering is not "can Claude write use cases" — it can, quickly, and
they read well. It is **how much of what it writes is true, connected, and complete**, and
whether putting a structure around it improves any of those.

## The design

| arm | what it is | controls for |
|---|---|---|
| **A** one-shot | Claude asked cold for the use cases, one pass, no corpus, no engine | the baseline |
| **B** free iteration | Claude on the same task, allowed to keep revising, no engine | extra turns, so a win is not just "more thinking" |
| **C** the system | same corpus, gaps detected, questions bounced back, answers adjudicated | — |

Two arms would confound structure with effort. B is what makes a difference attributable.

## Metrics volume cannot fake

Count is not a metric. The code-grounded model had 29 use cases and covered 2.1% of its
space — counting rewards padding, which is the failure being tested for. All four below are
mechanical (a set intersection and some graph arithmetic), so the engine computes them
without judging anything:

- **corpus coverage** — of the 28 documented terms, how many the model accounts for
- **chain integrity** — do the pre/postconditions actually connect, walked end to end
- **hallucinated citations** — symbols or terms cited that are not in the corpus
- **contradiction found** — does it notice that the sources disagree about gem loss

## Arm A, run 2026-09-09

`armA-oneshot.txt` — written cold, genuine best effort, no corpus in view.

| | arm A | arm C |
|---|---:|---:|
| use cases | 20 | 26 |
| corpus terms named | **5 / 28 — 17%** | 26 / 28 — **92%** |
| chain intact | **no — 3 breaks** | yes, 5 / 5 |
| citations | 0 | every use case |

**Read arm A and it looks finished.** Twenty numbered use cases in a sensible order, each
with a precondition and a postcondition. Three of the transitions do not connect — nothing
establishes *stats raised* before the use case that requires it, nothing establishes *cargo
filling*, nothing re-establishes *in control* after a tier-up — and the author did not
notice while writing it. That is the failure mode in one artefact: fluent, ordered,
plausible, and broken in three places that only arithmetic finds.

Arm A also cites nothing, because a one-shot answer has nothing to cite into. That is not a
flaw in the writing; it is the absence of a ground space, and it is why 23 of 28 documented
mechanics simply never come up.

**Arm B is not yet run.** Until it is, the honest reading of this table is "structure plus
grounding beats one pass", not "structure beats iteration" — those have not been separated.

There is also a confound in the table above that iteration does not explain: arm C's briefs
contained the 28-term list and arm A's did not. So 17% against 92% is substantially *having
the answer sheet*, and is not on its own evidence that the system reasons better.

## Arm D, run 2026-09-10 — the method, no engine

`armD-skill.ops` and `armD-README.md`. Claude given the engine's method as a skill and the
same corpus arm C had, writing the whole model by hand with no engine at all. This removes
both confounds above: same corpus, and the method is no longer the thing being withheld.

Arm D leads arm C on every metric they differ on, and that is the least interesting result
on the page — the skill's checklist and the scorer's metric list are the same list. What the
run is actually worth is the two-way audit:

- **The engine found a missing requirement in arm D** — a state established in the first
  epic that thirty use cases never consumed. Found by subtraction, after a hand pass with
  the same checklist had declared itself clean.
- **Arm D found two defects in the engine** — an `<<extend>>` walked as a beat of the main
  success scenario, and a chain walk that stopped at the epic boundary while the story
  continued across it. Neither could appear in arm C's own output, because arm C never
  produced a branch or a cross-epic dependency at all.

Read `armD-README.md` for the detail.

## The scorecard

`python3 bench/scorecard.py` in TDRE; output kept in `SCORECARD.txt`.

The scoring idea is RJ's and it is the one that makes the table honest: **a gap detected
and not filled is a different thing from a gap nobody noticed.** Scoring them the same is
what let arm A look respectable — it left more undone than any other arm and declared none
of it, so on a count of open items it came first.

So every shortfall is charged twice: once for being a shortfall, and again if the arm did
not know. Four ledgers, and the split between the middle two is decided by text rather
than by charity — a gap counts as declared only where the arm's own report names its code.

| ledger | what it is |
|---|---|
| **MADE** | a dimension satisfied. The only credit column. |
| **OPEN, DECLARED** | a gap the arm's own output names. Incomplete, and honest about it. |
| **OPEN, UNKNOWN** | a gap only the outside instrument found. The arm believed it was finished. |
| **WRONG** | something asserted that is false. Not a hole — a claim. |

Weights are a judgement, so three schemes run side by side and are printed with the
result. The ranking is the same under all three, which is the only thing that makes it a
finding about the arms rather than about the weights.

A second table removes every corpus-dependent line, because arm A was never given the
corpus and charging it for citations is charging it for its handicap.
