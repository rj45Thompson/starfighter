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
