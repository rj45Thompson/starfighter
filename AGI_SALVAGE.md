# AGI SALVAGE LEDGER — nothing gets lost

**Why this file exists** (user, 2026-07-09): *"i worked really hard on all the agi stuff I just don't want it to
be lost... we have essentially stuff all over. some might work some might not."* Work is lost when nobody can
find it — not when it's unported. This ledger is the finding mechanism: every pillar, every known implementation
across the 13-repo ecosystem, which one is CANONICAL, and where it is (or will be) proven inside the game.
**The space game is the proving ground, not a game** — a pillar counts as salvaged only when it has an in-game
test command a human can run.

Source basis: the user's 13-repo clone-and-read survey (2026-07-09) + this repo's own code + a local-disk
verification agent (landed 2026-07-09 — every path below is disk-verified). Update discipline: when a pillar's
canonical pick changes, note WHY here — never silently.

## Local disk map (verified — name-aliases are the #1 confusion source)
| GitHub name | Local truth |
|---|---|
| Warship4JuneHyperdineCrystals (TDRE canonical head) | **`D:\code\TDRE_fixed_5`** (its git remote IS that repo) |
| LLMExtractor ("Jobe") | **`D:\code\Jobe`** (remote = LLMExtractor.git); sibling `D:\code\JobeCodex` |
| combine-iso / combine-iso-agi-fleet | **ABSENT locally** — GitHub-only (only an arcWelderPro push remote). P1/P2/P7/P12 candidates need a clone before porting. |
| TDRE / tdre-cognitive-architecture / warship_arc3 / BorgBench / sober-ai-complete / arcWelderPro / correlation-anchor-theory | all present at `D:\code\<name>` |
| `kripke_vector*` files | **do not exist anywhere** — a remembered name, not a file |
| gravity-well repair | NOT in TDRE_fixed_5 — lives at **`D:\code\Tami\.opus-tools\agi_proto\chainer.py`** (`_gravity_well`, pose-graph least-squares, repair-not-prune) |

## Kripke census (all 6 local implementations, disk-verified)
| Where | What its worlds/□/◇ actually are | Portable? |
|---|---|---|
| TDRE lineage `src/tdre/kripke.py` (5 copies) | worlds=ARC grid states, R=DSL transform; □=rule holds on every training pair | grid-bound — idea only |
| sober-ai `substrate/seo/kripke_frame.py` | worlds=KB snapshots (current/+pending/−contested/historical/strict), □/◇ over (s,p,o) claims | **most portable** — the game's `kripke_mind.js` port matches this shape (minds-as-worlds variant) |
| Jobe `jobe/kripke.py` | load-time graph CLEANER: polarity→modality, prunes contradictions + subsumed hops | portable, complements knowledge.js |
| Jobe `jobe/runtime/kripke_memory.py` | labeled transition system: worlds=game states, R[action]; `ensures(w,p)` = actions that NECESSARILY cause p | **best next port** — gives the game a modal PLANNER |
| arcWelderPro `state/kripke_reason.py` | worlds=mechanic hypotheses | ARC-bound |
| TDRE_fixed_5 `experiments/kripke_triangulation.py` | Kripke gate VETOes sphere inheritance on exception worlds | idea feeds the game's gate design |

Iron rule, applying to every port: nothing may be handed to a mind that it claims to have learned; claims commit
only over-determined (≥2 edge-disjoint evidence) or the mind ABSTAINS; GIVEN vs LEARNED is always labeled.

## Legend
- ✅ **in-game** — ported, self-tested, live test command exists
- 🔶 **partial** — some of the pillar is in-game, gaps named
- 📦 **salvageable** — best implementation identified, not yet ported
- ⚠ **unverified** — exists but no reproduced result; port only with a fresh test
- 🪦 **retire** — superseded by a better implementation of the same idea (the work is *kept here by name*, the code stops being the reference)

## The pillar table

| Pillar | Canonical implementation | Status | In-game proof | Also-rans (kept by name, not lost) |
|---|---|---|---|---|
| P1 Embodiment | combine-iso `agi_proto/phys_vec.js` (torque recovery, mutation-tested) | 📦 local:pending | — (candidate: a "decode your own thrusters" pilot mode) | starfighter's own flight model is HANDED physics, not decoded — not a P1 claim |
| P2 Navigation | combine-iso survey entry (orphaned) | 📦 local:pending | — | game's A3 learned nav-gain (`s.navGain` adapters) is a live partial |
| P3 Spatial grounding | game `vision.js` retinas + A4 sensor-noise beliefs (`senseTarget`) | ✅ (live) | fly with GROUNDED on — aim tracks beliefs not truth | combine-iso spatial entries |
| P4 Economy | game organic economy (`econTick`, no-cheat priced trades) | ✅ (live) | `market` / SR-M13 shocks verified 2026-07-08 | — |
| P5 Communication | game chatter/radio + emergent-signal glyphs (W16 σ-codes) | 🔶 | RADIO tab; audited code = combine-iso world_vec/lang_vec | second implementation flagged `redundant` in survey — pick after local check |
| P6 Theory of mind | game INH/DISPOS + roster rel matrix | ⚠ (its own audit flags it) | `inhabitant` command | needs a real falsifiable ToM test before claiming |
| P7 Open-ended goal discovery | game A11 `discoverTarget` (type-blind buckets) | 🔶 wired, partial | live: pilots pick own targets | combine-iso M8 curiosity→pen→promote loop (📦) |
| P8 Reasoning & logic | **TDRE lineage head** (Warship4June = TDRE_fixed_5 local) `pillar_router.py` 7 strategies; game holds two ports already | 🔶 | `deliberate` (How/What/Why/When 4-axis + convergence) · `kripke <s> <r> <o>` (NEW 2026-07-09: modal □/◇/✗ over one-world-per-mind) | TDRE `kripke.py` (ARC-grid-bound — idea ported, code not portable); sober-ai KripkeFrame (needs pre-built checkers) — both 🪦 for the game's purposes, named here |
| P9 Memory & knowledge representation | game `knowledge.js` two-tier provenance store (shared/private by construction) | ✅ | `observatory` (fullscreen graph + live commit feed) | survey found 4 independent KG builds — the OTHER three 🪦 to this one for game use; local agent to name them explicitly |
| P10 Verification & anti-hallucination | game iron-rule stack: `centroid_mind.js` gate (margin + ≥2 edge-disjoint objects) + `deliberate.js` verifyChain + 0-fab rumors | ✅ | `mind eval` — held-out: raw 47.1% vs 23.5% majority, **gated 100%/6 answered, 11 abstains** (2026-07-09, real AgentWorldBench) | sober-ai `sober_check`/Jobe `query_gate.py` (📦 — port the CHECK pattern as a second gate if local read shows a distinct mechanism) |
| P11 Benchmarking & evaluation | arcWelderPro blind honesty auditor | 📦 local:pending | game-side: every `* eval` command is the in-game analog | warship_arc3 Kaggle 0.23 (real, external); BorgBench (⚠ isolated) |
| P12 Orchestration & agency | combine-iso fleet orchestrator | 📦 (stays out of the game — it orchestrates *sessions*, not pilots) | n/a | agent_mail/agent_super (Tami .opus-tools) already serve this locally |
| P13 Theory | correlation-anchor-theory (markdown, no code) | 📦 by design | n/a | — |

## Ports completed into the game (the proving-ground record)
| Date | Port | From | In-game test | Result |
|---|---|---|---|---|
| 2026-07-07 | Two-tier knowledge store | ecosystem KG concept | `observatory`, persists across generations | live, 1,096 shared facts |
| 2026-07-07 | Deliberation engine (4-axis + geometry importance + seek) | TDRE concepts | `deliberate <planet>` | live; abstains honestly on gaps |
| 2026-07-09 | Centroid category mind (one-hot + centroid + gate) | llmextractor exp1 proven pattern (NOT the below-chance SVD/chain) | `mind eval / classify / learn` | gated 100% on answered, 11 abstains, 6/6 learned facts correct |
| 2026-07-09 | HF dataset training under iron rule | new | `mind eval` over `in_task` | see P10 row |
| 2026-07-09 | **Kripke diamond** (modal □/◇ over minds-as-worlds) | TDRE/sober-ai Kripke *idea* | `kripke` / `kripke <s> <r> <o>` + □/◇ glyphs in observatory walks | 6/6 self-test; live verdicts name exactly which minds hold a secret |
| 2026-07-09 | **sober_check gate** (3-check refuse-BEFORE-answer: grounding floor → identifier existence → prefix-stem coverage; NLI fallback honestly NOT ported - no model in-browser) | `sober-ai-complete\baseline_1\sober_ai_api.py:163`, source read verbatim first | `sober <question>` + pre-gate fronting every Observatory ask (two independent gates = system-level over-determination) | 8/8 self-test incl. two LIVE-caught adaptation fixes (identifier verdict must outrank the bare floor so fabricated names get NAMED; compound node ids must split before stemming or plain-word queries can't be covered by the facts that ground them); live: fake tool refused by name, real queries commit |
| 2026-07-09 | **contradiction ledger** (claims keyed (world,subject,predicate); functional predicates = one value per key; same-world conflicts QUARANTINE; the modal don't-collapse-worlds rule maps 1:1 onto the two-tier store; the (type,value) bucket trick ported) | `TDRE_fixed_5\TDRE\src\tdre\contradiction.py`, source read verbatim first | `contradictions` command; wraps GAME_KNOW.commit (live flagging); sober gate adds `refuse_contradicted`; centroid mind abstains on tainted labels (consult BEFORE the known-label shortcut - live-caught); Observatory ⚠-marks tainted edges | 10/10 self-test; **first live audit caught 3 REAL contradictions = a genuine bake bug** (idOf hashed numeric Json row-ids tiny → two rows collided onto one node, welding android+os labels) → bake position-salted, v1 facts purged via provenance-keyed migration, v2 re-ingested: 0 contradictions, and the mind's clean-data eval jumped raw 47→64%, gated 100% on 20 answered (was 6) |

## How we handle "stuff all over, some might work, some might not"
1. **Name everything here** — an implementation listed as 🪦 is not lost; it's credited and findable.
2. **One canonical per pillar** — chosen for portability + a reproduced result, not recency.
3. **Port = test command** — nothing counts as in-game until `something eval`-style proof exists.
4. **Unverified stays ⚠** — survey claims without reproduced numbers never get promoted by name-recognition.
5. **The game never absorbs orchestration** (P12) — proving ground for MINDS, not for session tooling.

## Next salvage queue (agent-verified order, all paths disk-real)
1. **`sober_check` gate** (P10) — `D:\code\sober-ai-complete\baseline_1\sober_ai_api.py:163`: 3-check refuse-BEFORE-answer (similarity floor → unaddressable-name → uncovered-content-word), ~40 lines, slots in front of the game's iron-rule gate. Two independent gates = system-level over-determination.
2. **`contradiction.py` ledger** (P8) — `D:\code\TDRE_fixed_5\TDRE\src\tdre\contradiction.py`: shared (world,subject,predicate) ledger, functional predicates, every pillar abstains on tainted keys. Direct drop-in beside GAME_KNOW.
3. **`kripke_memory.py` planner** (P9) — `D:\code\Jobe\jobe\runtime\kripke_memory.py`: worlds=game states, R[action], `ensures(w,p)` = actions that NECESSARILY cause p — gives the game's pilots a modal PLANNER.
4. **pillar_router solvers** (P8) — `rootbench_solver.py` SOLVERS: inheritance / constraint / composition / centric, all regex+dict, all high-portability; router abstains on ties (matches the game's ethos).
5. **Gravity-well repair** — `D:\code\Tami\.opus-tools\agi_proto\chainer.py` `_gravity_well` (NOT in TDRE — corrected): pose-graph least-squares, repair-not-prune, candidate for healing weak edges in the live graph.
6. combine-iso M8 growth loop (P7) — **needs a `git clone` first (github-only locally)**.
7. P6 ToM: design a falsifiable in-game test (predict another mind's next action from its OWN world, score it) before any claim.
