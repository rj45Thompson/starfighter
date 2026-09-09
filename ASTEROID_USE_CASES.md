# Asteroids — the mining loop, as a use-case chain

RJ 2026-09-08: *"let me find the requirements to asteroids and I want it to find them all. Let's not
mix them all together, we probably want these isolated."*

**Isolated on purpose.** Nothing here is merged into `USE_CASES.md`, `STARBLAST_USE_CASES.md`,
`STARBLAST_REQ.md` or `REQUIREMENTS_SR.md`, and no game code was changed to write it. This file is
about rocks and what comes out of them, and nothing else.

## Why it is a table and not a list

"Did I think of every asteroid requirement?" cannot be answered — what you failed to think of leaves
no trace. So the model is held against a **closed space** instead: `_ast_space.json` holds the 61
`CFG` constants that govern rocks, gems, the belt and the mining drones, extracted from
`index.html`. Every one of them must be claimed by a step below, or it is a hole, and a hole becomes
a question. Completeness is then a count that has to reach zero rather than a feeling.

**The space is 61, and the first count of it was 16.** A line-anchored regex read 26% of `CFG` —
because `CFG` packs a dozen keys per line — and reported it with no sign anything was missing. It
was caught by holding the parse against an independent number: every `CFG.X` the code actually
*reads*. Same class of error the tool's own header warns about, made anyway.

That cross-check found two facts before a single requirement was written:

* **`CFG.ROCK_NEAR_R` does not exist.** `index.html:2842` says *"see CFG.ROCK_NEAR_R"* and no such
  constant is declared anywhere. A comment pointing at a knob that was renamed or removed.
* **`CFG.BOT_IDLE_R` (3.2) is never read.** Declared at `index.html:406`; the only other mention is
  a comment at `index.html:976` saying what it *used to* do. A dead knob.

Status: **HAVE** (built and cited) · **PARTIAL** (built, story not fully true) · **INFERRED IR-n**
(the step needs it and nobody authored a requirement) · **ABSENT** (proven not there, with the search).

---

## UC-A1 — A rock exists, drifts, and can be hit

| # | Step | What it needs | Thing | Requirement |
|---|---|---|---|---|
| 1.1 | The field is populated | thousands of rocks without thousands of draw calls | `buildRockPools` | `index.html:1356` — GPU-instanced pools, `AST_KEEP` 3200 / `AST_MAX` 4200 |
| 1.2 | A rock is born with a size | a size range that reads as variety | `spawnAsteroid` | `index.html:1304` — `AST_SCALE_MIN` 2.4 … `AST_SCALE_MAX` 7.0 |
| 1.3 | A rock has hull proportional to size | a big rock takes longer | `spawnAsteroid` | `index.html:1306` — `hp = scale * AST_HP_PER_SCALE` (6.5) |
| 1.4 | A rock drifts and tumbles | the field is not a still life | `spawnAsteroid` | `index.html:1305` — `AST_DRIFT` 3 u/s, spin 0.2…0.9 |
| 1.5 | A rock is worth score | killing it counts | `destroyAsteroid` | `index.html:1336` — `owner.score += a.level`, `level = round(scale/2)` |
| 1.6 | Ramming a rock hurts | the field is a hazard, not scenery | collision | **INFERRED IR-1** — `AST_DMG` 20 is declared at `index.html:444`; which collision path applies it, and to whom? |
| 1.7 | Rocks are found fast enough to test every frame | 3,200 rocks cannot be an O(n²) scan | `astGrid` | `index.html:1330` `rebuildAstGrid`, `AST_CELL` 60, `AST_GRID_EVERY` 2 |
| 1.8 | A destroyed rock leaves no stale reference | a freed slot must not be hit | `a.gone` flag | `index.html:1336` — `gone` checked in `_astCollect` (`index.html:1341`) |

## UC-A2 — Shooting a rock splits it

| # | Step | What it needs | Thing | Requirement |
|---|---|---|---|---|
| 2.1 | A rock at zero hull is destroyed | the loop's first beat | `destroyAsteroid` | `index.html:1336` |
| 2.2 | It splits into several smaller rocks | one rock becomes a field | `destroyAsteroid` | `index.html:1336` — `AST_SPLIT_MIN` 3 … `AST_SPLIT_MAX` 5, `AST_CHILD_FRAC` 0.52 |
| 2.3 | Children fly apart | a split reads as a break, not a swap | `destroyAsteroid` | `index.html:1336` — `AST_SPLIT_KICK` 12, inherits parent `vel` |
| 2.4 | Splitting stops at a floor | rocks do not divide forever | `destroyAsteroid` | `index.html:1336` — `AST_NOSPLIT` 2.0 |
| 2.5 | Splitting stops at a ceiling | the field cannot explode in count | `destroyAsteroid` | `index.html:1336` — guarded by `asteroids.length < AST_MAX` |
| 2.6 | A destroyed rock spills a gem | the reason to shoot it | `spawnGem` | `index.html:1374`, called at `index.html:1336` |
| 2.7 | The kill is seen and heard | feedback for the beat | `burst` / `SOUND` | `index.html:1336` — two bursts, `explode` variant `asteroid`, fireball sprite |

## UC-A3 — The gem is the payoff

| # | Step | What it needs | Thing | Requirement |
|---|---|---|---|---|
| 3.1 | A gem is worth more from a bigger rock | size should matter | `spawnGem` | `index.html:1374` — `credits = scale * GEM_CREDIT_PER_SCALE` (2) |
| 3.2 | A gem can be picked up by flying near | no button to press | pickup radius | `index.html:477` — `GEM_PICK_R` 8.5 |
| 3.3 | A magnet widens the reach as you upgrade | the loop gets smoother | `magnetFor` | `index.html:2764` — `GEM_MAGNET` 26, `GEM_EASE_R` 16 |
| 3.4 | Gems do not litter the arena forever | the field must not fill with loot | gem lifetime | `index.html:477` — `GEM_LIFE` 26 s |
| 3.5 | A gem feeds the bar that banks upgrade points | the rock connects to progression | `gemBarAdd` | `index.html:2271` — `GEM_BAR_MAX` 8, `GEM_PTS_CAP` 65, `GEM_BAR_RATE` 1.0 |
| 3.6 | A gem also repairs a hurt hull | mining is a way to survive | hull credit | `index.html:630-633` — `GEM_HULL_THRESH` 0.5, `GEM_HULL_FRAC` 0.4, `GEM_HULL_CREDIT_MULT` 1.3, `GEM_HULL_MIN_CREDITS` 6 |
| 3.7 | A gem heals a little on pickup | small constant reward | `GEM_FOOD` | `index.html:477` — 9, applied at `index.html:969` |
| 3.7b | The whole gem-bar progression can be switched off | one flag, not a rewrite | `CFG.GEM_BAR` | `index.html:2312` `gemBarAdd` returns 0 when false; `index.html:7055` the 1-8 spend keys are gated on it too |
| 3.9 | An AI pilot flies to collect a gem it can see | the loop is not player-only | `nearestOf` | `index.html:2442` — `GEM_GRAB_R` 55, weighted `1 - d/GEM_GRAB_R` so nearer gems win |
| 3.8 | A gem is visible at distance | you must see what to fly at | gem visual | **INFERRED IR-2** — `GEM_SIZE` 3.0 and `AST_UNIT` 1.0 are declared at `index.html:1114`; which draws them, and is `AST_UNIT` about gems at all? |

## UC-A4 — The belt: where the rocks are

| # | Step | What it needs | Thing | Requirement |
|---|---|---|---|---|
| 4.1 | Most rocks live in one place | mining should be a destination | `makeMiningBelt` | `index.html:1669` — `MINE_BELT_FRAC` 0.75 |
| 4.2 | The belt is a ring you fly through | it should read as a belt | belt shape | `index.html:447` — `MINE_BELT_RIN` 0.12, `MINE_BELT_ROUT` 1.3, `MINE_BELT_THICK` 46 |
| 4.3 | The belt is peaceful | you can mine without fighting | `inPeaceful` | `index.html:1337` — pirates never target inside `SYSTEM_R * 1.05` |
| 4.4 | Rocks do not swamp the radar | a dense field must not hide enemies | radar cap | `index.html:447` — `RADAR_ROCK_CAP` 24 |

## UC-A5 — The mining drones

| # | Step | What it needs | Thing | Requirement |
|---|---|---|---|---|
| 5.1 | Drones exist and are visible | RJ: *"they are not visible, they should help mine"* | `ensureMiningBots` | `index.html:936`, `MINING_BOTS` 2, `BOT_SIZE` 2.2 |
| 5.2 | A drone launches out of the hull | it should read as deployed | launch | `index.html:407` — `BOT_LAUNCH_T` 0.55, `BOT_LAUNCH_KICK` 34 |
| 5.3 | A drone fetches loose gems | the scoop you do not have to fly | `miningBotsTick` | `index.html:969` — `BOT_GEM_R` 70, `BOT_GRAB_R` 2.6 |
| 5.4 | A drone cuts a seam into a nearby rock | the pilot's shot then splits it | `seamTick` | `index.html:944`, `BOT_MINE_R` 52, `BOT_SEAM_RATE` 0.55 |
| 5.5 | A seamed rock takes far more damage | the seam has to be worth cutting | seam damage | `index.html:408` — `SEAM_DMG_MULT` 3.0 → `1 + 3×seam` |
| 5.6 | A drone can finish a rock alone | it mines, not just marks | `miningBotsTick` | `index.html:997` — `BOT_DPS` 3.5 hull/s, destroys at 0 |
| 5.7 | The seam dies with the rock | no orphan line in the scene | `destroyAsteroid` | `index.html:1336` — removes `seamLine`, `seamRocks.delete` |
| 5.8 | A drone keeps station and comes home | it must not be lost | station-keeping | `index.html:406-407` — `BOT_SPEED` 46, `BOT_ACCEL` 90, `BOT_STANDOFF` 3.5, `BOT_DOCK_R` 2.0, `BOT_CONE` 0.62 |
| 5.9 | A drone left behind re-docks instantly | a warp must not strand it | `miningBotsTick` | `index.html:947` — snaps to `P.pos` beyond `BOT_MINE_R * 1.5` |
| 5.10 | The beam is visible | you should see it working | beam visual | `index.html:408` — `BOT_LASER_R` 0.14, `BOT_LASER_COL` 0x7fe8ff |
| 5.11 | A drone holds an idle distance | it should not sit inside the ship | idle standoff | **INFERRED IR-3** — `BOT_IDLE_R` 3.2 is declared at `index.html:406` and **never read**; `index.html:976` says it *used to* be 9. Is the behaviour gone, or moved to `BOT_STANDOFF`? |

## UC-A6 — Drawing 3,200 rocks affordably

| # | Step | What it needs | Thing | Requirement |
|---|---|---|---|---|
| 6.1 | A rock's drawn pose is refreshed less often when far away | `writeRockInstance` ran 7,781×/frame | `writeRockInstance` | `index.html:1371`, `ROCK_LOD_UNIT` 77, `ROCK_LOD_MAX` 8 |
| 6.2 | The stride is provably sub-pixel | an optimisation must not be visible | LOD derivation | `index.html:445` — `AST_DRIFT` 3 u/s ⇒ ≤ N/20 units stale ⇒ under half a pixel beyond N×77 |
| 6.3 | Physics is never strided | mining and hits stay exact | LOD scope | `index.html:445` — position, spin, bounce and the grid run every frame |
| 6.4 | Rocks share a small number of shapes | fewer pools, fewer calls | pools | `index.html:443` — `ROCK_GEO_VARIANTS` 1, `ROCK_SHADES` 1 |
| 6.5 | Real rock art replaces the procedural shape when it loads | quality without a load stall | asset retrofit | `index.html:1203` — swaps `ASSETS.astGeos` into live pools |
| 6.6 | Rock surfaces are generated, not shipped | `ROCK_GEN` | `index.html:856-860` — `rockTex` / `rockNrm`, `ROCK_NORMAL_SCALE` 0.8, `ROCK_TEX_GAIN` |
| 6.7 | The player can see the rocks at all | RJ: *"the lighting is dark, I can't see the asteroids"* | headlamp | `index.html:424` — `HEADLAMP_INT` 1.3, `HEADLAMP_RANGE` 420 *(outside the space: not an `AST_`/`ROCK_` knob)* |
| 6.8 | A comment names a knob that exists | a reader can follow the pointer | — | **INFERRED IR-4** — `index.html:2842` cites `CFG.ROCK_NEAR_R`, which is declared nowhere. Renamed to `ROCK_LOD_UNIT`, or deleted? |

---

## The open questions

Six were raised. Two were answered from source and are now steps 3.7b and 3.9 — `GEM_BAR` is the
one flag the whole progression hangs off (`index.html:2312`, and the 1-8 spend keys at
`index.html:7055`), and `GEM_GRAB_R` is the radius an **AI pilot** uses to decide to go and collect
(`index.html:2442`) — the only gem constant that is not about the player.

Four remain, all `INFERRED`, all with the hole cited:

1. **IR-1** — `AST_DMG` 20 (`index.html:444`): which collision path applies rock ramming damage, and to
   the player only or to every ship?
2. **IR-2** — `GEM_SIZE` 3.0 / `AST_UNIT` 1.0 (`index.html:1114`): what draws a gem at that size, and
   is `AST_UNIT` a gem constant or a rock one that landed in the wrong place?
3. **IR-3** — `BOT_IDLE_R` 3.2 (`index.html:406`): declared, never read. Dead knob, or lost behaviour?
4. **IR-4** — `CFG.ROCK_NEAR_R` (`index.html:2842`): cited in a comment, declared nowhere.

**Not "complete" — 4 questions open, of 1 kind.** Saying so is the point: a model with open questions
described as finished is exactly what this file is built to prevent.
