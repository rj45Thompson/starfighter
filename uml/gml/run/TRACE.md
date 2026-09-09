# The reasoning, as it happened

Every question the model asked itself, every answer, and every answer that was refused and why. Read top to bottom: this is the run.

| event | count |
|---|---:|
| `ASK` | 31 |
| `PARKED` | 24 |
| `APPLIED` | 6 |
| `ROUND` | 3 |
| `RUN_START` | 1 |
| `REFUSED` | 1 |
| `RUN_END` | 1 |


## Round 1 — 247 gaps in the model, 5 actionable, 17 nodes so far

**❓ Q-1 · `UNDECOMPOSED_EPIC` on `E1`**

> Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 5 ordered child use case(s) under E1*

**✅ accepted** — Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.

- added node `UC-E1-1`
- added node `UC-E1-2`
- added node `UC-E1-3`
- added node `UC-E1-4`
- added node `UC-E1-5`
- added node `S:sim_running`
- added node `S:controls_live`
- added `E1 -includes-> UC-E1-1`
- added `E1 -includes-> UC-E1-2`
- added `E1 -includes-> UC-E1-3`
- added `E1 -includes-> UC-E1-4`
- added `E1 -includes-> UC-E1-5`
- added `UC-E1-1 -requires-> S:page_open`
- added `UC-E1-1 -establishes-> S:world_built`
- added `UC-E1-2 -requires-> S:world_built`
- added `UC-E1-2 -establishes-> S:ship_exists`
- added `UC-E1-3 -requires-> S:ship_exists`
- added `UC-E1-3 -establishes-> S:sim_running`
- added `UC-E1-4 -requires-> S:sim_running`
- added `UC-E1-4 -establishes-> S:controls_live`
- added `UC-E1-5 -requires-> S:controls_live`
- added `UC-E1-5 -establishes-> S:in_flight`

**❓ Q-2 · `UNDECOMPOSED_EPIC` on `E2`**

> Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 5 ordered child use case(s) under E2*

**✅ accepted** — The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.

- added node `UC-E2-1`
- added node `UC-E2-2`
- added node `UC-E2-3`
- added node `UC-E2-4`
- added node `UC-E2-5`
- added node `UC-E2-6`
- added node `S:belt_exists`
- added node `S:rock_in_range`
- added node `S:gems_loose`
- added node `S:gem_pickable`
- added node `S:gem_in_hold`
- added `E2 -includes-> UC-E2-1`
- added `E2 -includes-> UC-E2-2`
- added `E2 -includes-> UC-E2-3`
- added `E2 -includes-> UC-E2-4`
- added `E2 -includes-> UC-E2-5`
- added `E2 -includes-> UC-E2-6`
- added `UC-E2-1 -requires-> S:in_flight`
- added `UC-E2-1 -establishes-> S:belt_exists`
- added `UC-E2-2 -requires-> S:belt_exists`
- added `UC-E2-2 -establishes-> S:rock_in_range`
- added `UC-E2-3 -requires-> S:rock_in_range`
- added `UC-E2-3 -establishes-> S:gems_loose`
- added `UC-E2-4 -requires-> S:gems_loose`
- added `UC-E2-4 -establishes-> S:gem_pickable`
- added `UC-E2-5 -requires-> S:gem_pickable`
- added `UC-E2-5 -establishes-> S:gem_in_hold`
- added `UC-E2-6 -requires-> S:gem_in_hold`
- added `UC-E2-6 -establishes-> S:point_banked`

**❓ Q-3 · `UNDECOMPOSED_EPIC` on `E3`**

> Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 5 ordered child use case(s) under E3*

**✅ accepted** — The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.

- added node `UC-E3-1`
- added node `UC-E3-2`
- added node `UC-E3-3`
- added node `UC-E3-4`
- added node `UC-E3-5`
- added node `S:stat_raised`
- added node `S:stats_maxed`
- added node `S:tier_offered`
- added node `S:hull_swapped`
- added `E3 -includes-> UC-E3-1`
- added `E3 -includes-> UC-E3-2`
- added `E3 -includes-> UC-E3-3`
- added `E3 -includes-> UC-E3-4`
- added `E3 -includes-> UC-E3-5`
- added `UC-E3-1 -requires-> S:point_banked`
- added `UC-E3-1 -establishes-> S:stat_raised`
- added `UC-E3-2 -requires-> S:stat_raised`
- added `UC-E3-2 -establishes-> S:ship_stronger`
- added `UC-E3-3 -requires-> S:stat_raised`
- added `UC-E3-3 -establishes-> S:stats_maxed`
- added `UC-E3-4 -requires-> S:stats_maxed`
- added `UC-E3-4 -establishes-> S:tier_offered`
- added `UC-E3-5 -requires-> S:tier_offered`
- added `UC-E3-5 -establishes-> S:hull_swapped`

**❓ Q-4 · `UNDECOMPOSED_EPIC` on `E4`**

> Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 5 ordered child use case(s) under E4*

**❌ refused by the adjudicator** — the answer bounced back:

- COMPOUND_USECASE: UC-E4-2 "The pilot's shots reach and hurt what they hit" reads as two goals joined by a conjunction. Either split it into separate use cases, or rename it to the single goal it actually is -- this check reads the wording, so a well-formed goal that merely sounds compound should be renamed rather than split.

**❓ Q-6 · `UNDECOMPOSED_EPIC` on `E4`** *(attempt 2, after a refusal)*

> Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 5 ordered child use case(s) under E4*

*Carrying the objection: COMPOUND_USECASE: UC-E4-2 "The pilot's shots reach and hurt what they hit" reads as two goals joined by a conjunction. Either split it into separate use cases, or rename it to the single goal it actually is -- this check reads the wording, so a well-formed goal that merely sounds compound should be renamed rather than split.*

**✅ accepted** — Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker.

- added node `UC-E4-1`
- added node `UC-E4-2`
- added node `UC-E4-3`
- added node `UC-E4-4`
- added node `UC-E4-5`
- added node `UC-E4-6`
- added node `UC-E4-7`
- added node `S:weapon_ready`
- added node `S:shot_in_flight`
- added node `S:in_combat`
- added node `S:shield_stripped`
- added node `S:ship_dead`
- added node `S:gems_spilled`
- added `E4 -includes-> UC-E4-1`
- added `E4 -includes-> UC-E4-2`
- added `E4 -includes-> UC-E4-3`
- added `E4 -includes-> UC-E4-4`
- added `E4 -includes-> UC-E4-5`
- added `E4 -includes-> UC-E4-6`
- added `E4 -includes-> UC-E4-7`
- added `UC-E4-1 -requires-> S:in_flight`
- added `UC-E4-1 -establishes-> S:weapon_ready`
- added `UC-E4-2 -requires-> S:weapon_ready`
- added `UC-E4-2 -establishes-> S:shot_in_flight`
- added `UC-E4-3 -requires-> S:shot_in_flight`
- added `UC-E4-3 -establishes-> S:in_combat`
- added `UC-E4-4 -requires-> S:in_combat`
- added `UC-E4-4 -establishes-> S:shield_stripped`
- added `UC-E4-5 -requires-> S:shield_stripped`
- added `UC-E4-5 -establishes-> S:ship_dead`
- added `UC-E4-6 -requires-> S:ship_dead`
- added `UC-E4-6 -establishes-> S:gems_spilled`
- added `UC-E4-7 -requires-> S:gems_spilled`
- added `UC-E4-7 -establishes-> S:respawned`

**❓ Q-5 · `UNDECOMPOSED_EPIC` on `E5`**

> Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 5 ordered child use case(s) under E5*

**✅ accepted** — Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.

- added node `UC-E5-1`
- added node `UC-E5-2`
- added node `UC-E5-3`
- added node `UC-E5-4`
- added node `UC-E5-5`
- added node `S:save_gathered`
- added node `S:save_written`
- added node `S:save_current`
- added node `S:save_restored`
- added `E5 -includes-> UC-E5-1`
- added `E5 -includes-> UC-E5-2`
- added `E5 -includes-> UC-E5-3`
- added `E5 -includes-> UC-E5-4`
- added `E5 -includes-> UC-E5-5`
- added `UC-E5-1 -requires-> S:respawned`
- added `UC-E5-1 -establishes-> S:save_gathered`
- added `UC-E5-2 -requires-> S:save_gathered`
- added `UC-E5-2 -establishes-> S:save_written`
- added `UC-E5-3 -requires-> S:save_written`
- added `UC-E5-3 -establishes-> S:save_current`
- added `UC-E5-4 -requires-> S:save_current`
- added `UC-E5-4 -establishes-> S:save_restored`
- added `UC-E5-5 -requires-> S:save_restored`
- added `UC-E5-5 -establishes-> S:session_recorded`


## Round 2 — 218 gaps in the model, 1 actionable, 66 nodes so far

**❓ Q-7 · `DANGLING_POSTCONDITION` on `S:hull_swapped`**

> 'Taking the new hull costs every upgrade bought' establishes 'the ship is flying a new frame' (S:hull_swapped), and no use case requires it and no epic ends on it. Either name the use case that consumes it, or say the postcondition is wrong. A state nothing needs is either a missing beat or a false claim about what this use case is for.

*Must: add a use case whose precondition requires S:hull_swapped*

**✅ accepted** — The gap is real and it is the interesting one in this epic. E3 forks: spend the point now (UC-E3-1 -> UC-E3-2 -> ship_stronger) or bank toward a maxed ship and trade the frame in (UC-E3-3 -> UC-E3-4 -> UC-E3-5 -> hull_swapped). The first arm rejoined the story and the second did not, which means the model was asserting that trading in your ship leaves you no better off. A use case is missing: the one that says the new frame is worth what it cost. HULLS is the table that carries each frame's own capacity, and it is what makes the claim checkable rather than a promise.

- added node `UC-E3-6`
- added `E3 -includes-> UC-E3-6`
- added `UC-E3-6 -requires-> S:hull_swapped`
- added `UC-E3-6 -establishes-> S:ship_stronger`


## Round 3 — 217 gaps in the model, 159 actionable, 67 nodes so far

**❓ Q-8 · `UNCLAIMED_GROUND` on `G:BANK_LERP`**

> The source contains 'BANK_LERP' (const, index.html:405, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:BANK_LERP to the use case that owns it*

**⏸ parked** — no answer available yet (`4d7a430df7eaf57c`)

**❓ Q-9 · `UNCLAIMED_GROUND` on `G:BANK_MAX`**

> The source contains 'BANK_MAX' (const, index.html:405, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:BANK_MAX to the use case that owns it*

**⏸ parked** — no answer available yet (`44479aef125de5c3`)

**❓ Q-10 · `UNCLAIMED_GROUND` on `G:CAM_SHAKE_MAG`**

> The source contains 'CAM_SHAKE_MAG' (const, index.html:641, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:CAM_SHAKE_MAG to the use case that owns it*

**⏸ parked** — no answer available yet (`8e47d303042afd36`)

**❓ Q-11 · `UNCLAIMED_GROUND` on `G:CAM_UP_LERP`**

> The source contains 'CAM_UP_LERP' (const, index.html:640, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:CAM_UP_LERP to the use case that owns it*

**⏸ parked** — no answer available yet (`52f98830131b8af9`)

**❓ Q-12 · `UNCLAIMED_GROUND` on `G:DRAG_THRESHOLD`**

> The source contains 'DRAG_THRESHOLD' (const, panels.js:56, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:DRAG_THRESHOLD to the use case that owns it*

**⏸ parked** — no answer available yet (`7b45dc3aaea0f484`)

**❓ Q-13 · `UNCLAIMED_GROUND` on `G:KP_PITCH`**

> The source contains 'KP_PITCH' (const, index.html:406, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:KP_PITCH to the use case that owns it*

**⏸ parked** — no answer available yet (`896e75bbfa5f07fa`)

**❓ Q-14 · `UNCLAIMED_GROUND` on `G:KP_YAW`**

> The source contains 'KP_YAW' (const, index.html:406, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:KP_YAW to the use case that owns it*

**⏸ parked** — no answer available yet (`491b2b8e9ecac5d8`)

**❓ Q-15 · `UNCLAIMED_GROUND` on `G:PERIPH_CENTER`**

> The source contains 'PERIPH_CENTER' (const, index.html:674, read 4 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:PERIPH_CENTER to the use case that owns it*

**⏸ parked** — no answer available yet (`dba5bdf5cc91b99c`)

**❓ Q-16 · `UNCLAIMED_GROUND` on `G:PERIPH_DPR`**

> The source contains 'PERIPH_DPR' (const, index.html:676, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:PERIPH_DPR to the use case that owns it*

**⏸ parked** — no answer available yet (`425d7bb2b9bebe4c`)

**❓ Q-17 · `UNCLAIMED_GROUND` on `G:PERIPH_ON`**

> The source contains 'PERIPH_ON' (const, index.html:672, read 6 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:PERIPH_ON to the use case that owns it*

**⏸ parked** — no answer available yet (`1554d5e67db59063`)

**❓ Q-18 · `UNCLAIMED_GROUND` on `G:PERIPH_VIGNETTE`**

> The source contains 'PERIPH_VIGNETTE' (const, index.html:675, read 4 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:PERIPH_VIGNETTE to the use case that owns it*

**⏸ parked** — no answer available yet (`e7d6dde150efcc4b`)

**❓ Q-19 · `UNCLAIMED_GROUND` on `G:PERIPH_WIDE`**

> The source contains 'PERIPH_WIDE' (const, index.html:673, read 5 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:PERIPH_WIDE to the use case that owns it*

**⏸ parked** — no answer available yet (`5dbcfd128a94792a`)

**❓ Q-20 · `UNCLAIMED_GROUND` on `G:SHIP_BOUNCE`**

> The source contains 'SHIP_BOUNCE' (const, index.html:519, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_BOUNCE to the use case that owns it*

**⏸ parked** — no answer available yet (`b2f2c41e0471bd49`)

**❓ Q-21 · `UNCLAIMED_GROUND` on `G:SHIP_BULLET_DMG`**

> The source contains 'SHIP_BULLET_DMG' (const, index.html:506, read 3 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_BULLET_DMG to the use case that owns it*

**⏸ parked** — no answer available yet (`7621d1f35ae0656b`)

**❓ Q-22 · `UNCLAIMED_GROUND` on `G:SHIP_COLLIDE_SKIP_MULT`**

> The source contains 'SHIP_COLLIDE_SKIP_MULT' (const, index.html:520, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_COLLIDE_SKIP_MULT to the use case that owns it*

**⏸ parked** — no answer available yet (`5e2e84b9e4332949`)

**❓ Q-23 · `UNCLAIMED_GROUND` on `G:SHIP_LEN`**

> The source contains 'SHIP_LEN' (const, index.html:1136, read 0 times, which is never -- it may be dead). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_LEN to the use case that owns it*

**⏸ parked** — no answer available yet (`f086514f9f55a683`)

**❓ Q-24 · `UNCLAIMED_GROUND` on `G:SHIP_RAM_MIN_SPEED`**

> The source contains 'SHIP_RAM_MIN_SPEED' (const, index.html:517, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_RAM_MIN_SPEED to the use case that owns it*

**⏸ parked** — no answer available yet (`f67e83317b587db2`)

**❓ Q-25 · `UNCLAIMED_GROUND` on `G:SHIP_TEX_LOADER`**

> The source contains 'SHIP_TEX_LOADER' (const, index.html:1166, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_TEX_LOADER to the use case that owns it*

**⏸ parked** — no answer available yet (`1b9fc682e525008b`)

**❓ Q-26 · `UNCLAIMED_GROUND` on `G:SHIP_YAW`**

> The source contains 'SHIP_YAW' (const, index.html:1136, read 0 times, which is never -- it may be dead). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SHIP_YAW to the use case that owns it*

**⏸ parked** — no answer available yet (`c342d985ef98e735`)

**❓ Q-27 · `UNCLAIMED_GROUND` on `G:SKY_BAKE_RES`**

> The source contains 'SKY_BAKE_RES' (const, index.html:414, read 2 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SKY_BAKE_RES to the use case that owns it*

**⏸ parked** — no answer available yet (`a711eeaac62a0a64`)

**❓ Q-28 · `UNCLAIMED_GROUND` on `G:SKY_GAIN`**

> The source contains 'SKY_GAIN' (const, index.html:414, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SKY_GAIN to the use case that owns it*

**⏸ parked** — no answer available yet (`d0c811e75013e802`)

**❓ Q-29 · `UNCLAIMED_GROUND` on `G:SKY_MODE`**

> The source contains 'SKY_MODE' (const, index.html:413, read 2 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SKY_MODE to the use case that owns it*

**⏸ parked** — no answer available yet (`11319345c93bb004`)

**❓ Q-30 · `UNCLAIMED_GROUND` on `G:SKY_SEED`**

> The source contains 'SKY_SEED' (const, index.html:414, read 2 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SKY_SEED to the use case that owns it*

**⏸ parked** — no answer available yet (`080a2d89c7282fe8`)

**❓ Q-31 · `UNCLAIMED_GROUND` on `G:SKY_TINT`**

> The source contains 'SKY_TINT' (const, index.html:414, read 1 times). It is inside epic E1's scope and no use case in the model accounts for it. The epic's use cases are: UC-E1-1 'The page builds a world to fly in', UC-E1-2 'The game gives the pilot a ship', UC-E1-3 'The simulation advances every frame', UC-E1-4 "The pilot's controls move the ship", UC-E1-5 'The pilot can see where the ship is going'. Which one owns this symbol? If none does, the model is missing a use case -- add it. If the symbol is genuinely dead code, say so and mark it ABSENT.

*Must: attach G:SKY_TINT to the use case that owns it*

**⏸ parked** — no answer available yet (`b8bbe08a2d45f443`)


---

**Run ended: parked** — 3 rounds, 7 oracle calls, 6 answers accepted, 1 refused, 217 gaps still open.

