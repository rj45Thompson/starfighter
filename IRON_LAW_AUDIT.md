# IRON LAW AUDIT — applying the bench's law to the PLAYABLE game

**User directive (2026-07-10):** *"we do want the iron law applied to spacegame.. right now I see many..
maybe hundreds places of cheating. Some of it is kind of nice if this was a game.. but it's not a game.
Also the AI and player should have the same options right now it appears the player has many more options..
the AI does not learn how to play from a black box."*

`PILLARS.md` already states the law for the BENCH modules (`*_vec.js`): decode a black box, learn from reward,
no omniscient state, no scripted policy for the capability under test, no handed advantage. **This file audits
where the PLAYABLE `starfighter.html` still violates that law**, because the game grew game-dev conveniences
(scripted AI, omniscient AI shortcuts, player-only abilities) that are cheats in a proving ground even though
they would be fine in a game. `PILLARS.md` itself admits it (line ~161: "the cheating-game era").

Three violation classes, mapped to the user's three points:
1. **SCRIPTED-NOT-LEARNED** — the AI does not learn to play from a black box (their point 3). THE BIG ONE.
2. **INFO-ASYMMETRY / OMNISCIENCE** — the AI (or player) reads state it did not earn through sensors/visits.
3. **ACTION-ASYMMETRY** — the player and AI do not have the same options (their point 2).
Plus a minor class: **HANDED POWER** — enemy strength dialed by a CFG knob rather than earned/evolved.

Status legend: 🔴 open · 🟡 partial · ✅ fixed. Each item cites `starfighter.html:LINE`.

---

## P0 · SCRIPTED-NOT-LEARNED (the core violation — "the AI does not learn from a black box")

- 🔴 **`think()` is a hand-coded decision tree** (`:1537`–`:1672`): a role-based `if/else` cascade choosing among
  hard-authored modes (HUNT / EVADE / MINE / COLLECT / TRADE / UPGRADE / SEEK / BOUND / HOLD). This is exactly the
  "scripted policy for the capability under test" the iron law forbids. The player-vs-AI branch (`role==='player'`
  at `:1554`) and the pirate/trader/defender branches are all authored behavior, not learned.
- 🔴 **`aimAt()` is a scripted flight controller** (used at `:1602`): `PILLARS.md` P2 (`nav_vec.js`, learned raw-sensor
  controller, held-out 0.42, "**This kills `aimAt`**") was BUILT and audited but **never wired into the live game** —
  the game still flies with the hand-coded aim. Same for P7 goal discovery (`discover_vec.js`) vs the authored
  ray/discover fallback here.
- 🟡 **The in-file "learned" bits are adapters bolted onto the script, not a policy**: A3 `navGain` (`:1610`),
  A9 ray-weights (`:1611`), A11 `discover` (`:1588`). They tune scalars on top of the scripted tree; they do not
  REPLACE it. Honest partial credit — real online learning, but not "the AI learned to play."
- **Fix (staged, the north star):** wire the audited learned controllers into the live AI — `nav_vec` (P2) for
  flight replacing `aimAt`, `discover_vec` (P7) for goal selection replacing the mode cascade — behind a flag,
  ablation-audited (learned policy ≥ scripted on the same reward), so the green isn't vacuous. Biggest lift; do it
  in slices (flight first, then goal-selection) with a live before/after on reward-rate.

## P1 · INFO-ASYMMETRY / OMNISCIENCE (AI reads what it did not earn)

- ✅ **AI trader read UNVISITED planet prices** — FIXED 2026-07-10: every ship (AI + player autopilot) now carries
  its own `s.obsPrices` memory written ONLY on dock (`observePlanetPrices`, same rule as the player's
  `recordObservedPrices`); `bestArbitrage`/`planTrade` plan from REMEMBERED (possibly stale — honest) prices only;
  too little knowledge → a real `explore` trade-plan (fly to the nearest unvisited market and LEARN it; all visited
  → refresh the stalest, merchants make rounds). This was the exact "omniscient global price table" cheat
  `PILLARS.md` P4 forbids. Honest consequence: traders have a blind cold-start (they survey before they arbitrage),
  exactly like a new player.
- ✅ **AI targeted the globally-nearest enemy with no sensor gate** — FIXED 2026-07-10: `nearestRival(s,R)` takes a
  range and EVERY combat call site now passes `senseRangeOf(s)` (own sensors: AI orders, rallies, comm-acquire,
  pirate fallback, ray targeting, and the player's OWN flee/autopilot — symmetric); `weakestEnemyNear` radii capped
  by sensors too. Pirates keep their designed aggression HONESTLY: they spawn with long-range radar as EQUIPMENT
  (`senseR = PIRATE_HUNT_R`, the same stat the player can buy up), not an omniscient read.
- 🟡 **Perception noise is applied to only some AI reads**: the A4 `GROUNDED` belief (`senseTarget`, `:1601`) adds
  honest sensor noise for HUNT/EVADE targets, but mining/collect/most position reads are ground-truth `.pos`. **Fix:**
  route ALL AI perception through the one noisy sensor channel, not just combat aim.
- 🟡 **Observed-price memory does not persist across reload** (both AI and player autopilot re-learn on boot) —
  symmetric, but worth threading through save/load later so knowledge feels continuous.

## P1 · ACTION-ASYMMETRY ("the player has many more options")

- ✅ **Infinite AI missile ammo** (`:1617`, `:1622`) — FIXED 2026-07-10: ammo now gates EVERYONE; both AI and player
  regenerate ammo (`CFG.MISSILE_AMMO_REGEN`, `think()` top) and the AI tops up on weapon refit (its resupply analog
  of the player's `ammo buy`). Symmetric, and no missile-armed ship is ever permanently disabled.
- 🔴 **Weapon hardpoints are player-only** (`:1634`–`:1656`): the multi-slot fire loop runs only for `role==='player'`;
  AI ships fire a single weapon. **Fix:** let AI ships carry + fire `weaponSlots` too (or drop the player's multi-slot
  edge). Balance-sensitive — pair with a difficulty re-tune.
- 🔴 **Salvage is player-only** (`:1832`, `:1834`, `:1840`): artifacts, micromodules, and cores are collectible only by
  the player. The AI can neither pick them up nor use them. **Fix:** either give the AI the same
  inventory/progression systems (big) or make the drops meaningful to the AI (e.g. it equips artifacts too).
- 🟡 **Rep price discounts are player-only** (`buy`/`sell` `:1083`, `:1086`: `repBuyFactor`/`repSellFactor` gated to
  the player). Small player edge. **Fix:** track AI reputation and apply the same factor, or remove the discount.
- 🔴 **The command surface is asymmetric at the root**: the player drives ~60 verbs (`runCmd`) — dock, trade UI,
  install gear, hire wingmen, deploy probes, analyze artifacts, run text-quests, route power, `coop`/`grow`/`plan`
  reasoning — while the AI's whole action space is ~9 modes. **Fix (the deep symmetry work):** unify the action
  space so BOTH the player and the AI select from the SAME verb set; the difference should be WHO chooses (a human
  vs a learned policy), not WHAT is choosable.

## P2 · HANDED POWER (enemy strength dialed, not earned)

- 🟡 **Pirate/Hegemon damage is a CFG tier value** (`s.tierDmg||CFG.PIRATE_DMG`, `:1576`, `:1623`; `HEG_TIERS`): the
  enemy is HANDED its power by a difficulty knob rather than earning/evolving it. `SR-M15` (Hegemon evolution via the
  bench's genetic algorithm on loadout/tactics) is the intended honest replacement and is still pending. Named consts
  (good, per no-hardcoded-values) but an outcome knob, not a learned capability. **Fix:** wire `SR-M15`.

---

## THE BEST AGI FROM ALL THE REPOS — what exists, what's wired, what's idle

User directive: *"make sure you use the best agi stuff from all the repos."* Honest inventory (source of truth:
`AGI_SALVAGE.md` for the ecosystem ports, `PILLARS.md` for the in-repo benches):

**WIRED INTO THE GAME (live eval commands over real state):** two-tier store (GAME_KNOW) · deliberation (`deliberate`)
· centroid mind (`mind`) · Kripke diamond (`kripke`) · sober gate (`sober`) · contradiction ledger (`contradictions`)
· gravity-well repair (`gravity`, + Observatory gravity layout) · pillar router (`solve`) · modal planner (`plan`,
learned from YOUR play) · M8 growth (`grow`, LOAD-BEARING via `presume` + scan tags) · P6 ToM test (`tom`) · M9
cooperative proof (`coop`, over real multi-pilot provenance).

**BUILT + AUDITED IN-REPO BUT IDLE (the gap the iron-law program closes — these ARE "the best stuff" not yet used):**
- `nav_vec.js` (P2) — the LEARNED raw-sensor flight controller ("this kills `aimAt`") — game still flies scripted `aimAt`. **← head of queue**
- `discover_vec.js` (P7) — type-blind learned goal discovery — game still runs the authored mode cascade (the A11 in-file variant is a thin adapter, not this audited bench).
- `evolution.js` (N6) — a COMPLETE genetic epoch/selection pillar — **not even loaded via a script tag**; wiring it at the generation boundary IS SR-M15 (Hegemon evolves instead of being dialed).
- `tom_vec.js` (P6 learned inverse-preference) vs the simpler in-game tally; `slam_vec.js` (P3) — AI still navigates on ground-truth `.pos`; `ast_vec.js`/`vgs_vec.js` (P9 program synthesis + verifier-gated sampling) — the strongest 0-fab tech in the repo, unused in the live loop; `agent_vec.js` (6-pillar fused agent) — the template the live AI should converge to; `saga_vec`/`civ_vec`/`fluent_vec`/`world_vec`/`swarm_vec`/`lang_vec`/`dialect_vec`/`roles_vec` — society-layer benches partially represented by chatter only.

**PROVEN IN THE ECOSYSTEM, NOT YET PORTED:** M10 self-improvement (combine-iso; independent grader on a sealed
heldout — the machinery for the game AI to improve its own gates honestly) · TDRE CRUSH combine (RANKER ∩ KNOWER
commit-on-agree) · hypothesis-ray engine (TDRE_fixed_5) · representation-zoo gated mixture (frontiermath) ·
arcWelderPro posteriors-replace-labels writer.

**Rule going forward:** before building anything new, check this inventory — wire an idle audited bench first.
A new hand-rolled mechanism that duplicates an idle bench is itself a violation (it re-scripts what was already
LEARNED and audited).

## Priority order for the loop
1. **P1 omniscience — AI observed-prices + sensor-gated targeting** (concrete, high-value, directly contradicts P4's
   own stated law; medium size, needs a live "AI still prospers / still hunts" check).
2. **P0 flight — wire `nav_vec` learned controller into the live AI** behind a flag, ablation-audited (the north star;
   biggest lift, do flight first).
3. **P1 action-asymmetry — unify the verb set** so player and AI choose from the same actions.
4. **P0 goal-selection — wire `discover_vec`** to replace the authored mode cascade.
5. **P2 — wire SR-M15** so enemy power is evolved, not dialed.

**Method (every fix):** symmetric by construction (same rule for AI and player), the AI acts only on what it
SENSES/VISITS, no handed advantage, and every "learned" claim is ablation-audited live (remove the learning → the
behavior degrades → it was load-bearing). Honest partial over a fake "all fixed." This is the same discipline the
`*_vec.js` benches already pass; the job is to make the PLAYABLE game pass it too.
