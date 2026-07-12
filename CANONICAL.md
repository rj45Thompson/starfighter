# CANONICAL — one implementation per pillar, everything else imports or retires

The cross-repo audit (2026-07) found the same mechanisms rebuilt independently
3–6 times across the ecosystem (three Kripke verifiers, four knowledge graphs,
two deliberation engines...). This file is the single map of which
implementation is CANONICAL for each capability, so nothing gets rebuilt in
parallel again. Rule of the consolidation:

1. **One canonical implementation per pillar.** Everything else either imports
   it (same language), ports its *contract* (cross-language, declared in the
   port's header), or gets retired.
2. **Champion/challenger before retiring.** A piece is removed only after the
   ablation lift harness (`TDRE/experiments/ablation_lift.py`) shows it INERT
   (zero lift AND byte-identical behavior). Zero lift with divergent behavior
   = CONTESTED — it stays, in shadow, until sharper probes decide. No baby
   goes out with the bathwater.

## The canon

| Capability | CANONICAL implementation | Ports / consumers | Status of former duplicates |
|---|---|---|---|
| Deliberation / self-directed reasoning | Warship4JuneHyperdineCrystals `TDRE/src/tdre/agi_loop.py` (`SelfDirectedReasoner`: typed terminal verdicts, verifier-first commit, provenance channels, free-vs-paid accounting) | `starfighter/deliberate.js` is the canonical **JS port of its contract** (header declares lineage; VERDICTS enum mirrored; BUDGET_EXHAUSTED ≠ NO_ROUTE) | deliberate.js was a shallow parallel build → now a declared port |
| Kripke verification (box/diamond) | `TDRE/src/tdre/kripke.py` (grids) and its provenance-count adaptation `TDRE/src/tdre/agi_pipeline/l5_verify.py` (text facts) | starfighter consumes verdicts, never re-verifies | sober-ai `kripke_frame.py` = third parallel build, DO NOT extend |
| Centroid parent-finding | Warship4June `proton_cannon.py` `CentricResolver.find_parent_centroid` (order-invariant float64 law) | `TDRE agi_pipeline/l4_abstract.py` carries the law verbatim for text | `centric_refiner.py` (borgbench/warship_arc3) is a different mechanism, not a duplicate |
| Entity grounding for category discovery | typed-fact one-hot anchors — `TDRE agi_pipeline/l3_ground.py` (the exp1_graph_centroid 3/3 mechanism) | — | SVD-of-co-occurrence approaches measured BELOW trivial baselines (held-out tests, 2026-07-09) → retired |
| Reading pipeline (novel → fluent Q&A) | `TDRE/src/tdre/agi_pipeline/` L0–L7 (lazy-load; latent tier attributed) | starfighter must consume it as a service/port, never copy it (user rule: "starfighter can't have copies of the work") | — |
| Latent external knowledge | `TDRE agi_pipeline/latent.py` `LatentSource` protocol (WordNet today, LLM-pluggable) | any repo needing outside knowledge implements this protocol | ad-hoc LLM calls scattered in benches → migrate to the protocol |
| Knowledge store (game) | `starfighter/knowledge.js` (provenance-typed `{s,r,o}` graph) | deliberate.js / acquire.js reason over it | — |

## Lift ledger (champion/challenger results, 2026-07-12, Emma benchmark)

- KEEP (proven lift): L0 latent tier (+0.273), L4 concept formation (+0.091),
  L2 vocative guard (+0.091)
- CONTESTED (shadow): L5 box gate, L2 negation guard, L2 light-verb filter —
  each diverges visibly (blocks "an infatuation" / negated "sorry" / "had")
  but the current benchmark can't score the difference yet
- INERT (moved out): none this run
