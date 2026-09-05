# Starfighter — space AGI bench (playable front)

Original space-opera visualizer. Coalition Wardens vs the Iron Synod.
Talk to ships: type e.g. `ask ORION whats your story` or `ask ORION any danger`.

Desktop: W thrust, A/D turn, Space fire, 1/2/3 upgrade. Phone: use the terminal/chat (flight keys need a keyboard).

Play it: https://rj45thompson.github.io/starfighter/ (everything runs in the page; no server, no model download).

## For reviewers: the AI, and how to see it working

The game is the proving ground for a set of no-neural-weights reasoning modules. Every one of them is a plain
`<script src>` file in this folder, loads before the game script, and exposes one window global. Nothing below
needs a language model: an optional local speech sidecar (`speech_tier.js`, `TAMI_SPEAK`) only voices answers
when it is running; when it is not, the same grounded facts are composed into sentences by `passenger.js`.

Open the page, click into the terminal at the bottom, and type the command in the first column. Each line
prints what the module holds right now, with counts, so a reviewer can tell a live mechanism from a label.

| command | module | what it shows |
|---|---|---|
| `agi` | `knowledge_hud.js` | the read-only AGI-test HUD: shared and private facts, pillars, growth, snapshotted every tick |
| `observatory` | `knowledge_screen.js` | the fullscreen knowledge graph with the novel text it was fed, step by step; ESC closes |
| `know` | `knowledge.js` | the two-tier persistent store: generic facts shared by every mind, witnessed facts private to one; persists across runs in the browser |
| `kripke` | `kripke_mind.js` | the Kripke frame: one possible world per mind; box = facts every mind holds, diamond = private facts and exactly which minds hold them; `kripke <s> <r> <o>` queries one claim |
| `coop` | `coop_proof.js` | co-operative proof: a chain is committed only where at least two provenance-distinct sources hold a hop, otherwise a joint abstain; prints source count and corroboration coverage |
| `growth` | `growth_loop.js` | the curiosity loop: gap, ask, quarantine, promote past an evidence threshold, synthesise a defeasible rule, demote on contradiction; `grow` runs it near other ships |
| `mind` | `centroid_mind.js` | the category mind: sparse one-hot participation vectors, held-out evaluation with raw and gated accuracy against the majority baseline |
| `deliberate` | `deliberate.js` | reflective chain reasoning over the typed graph: what can I do, why, what changes, what is important, with the acquisition cascade (`acquire.js`) filling gaps |
| `think [pilot]` | game script | a pilot's grounded perceive, assess, decide chain from its own sensors only |
| `tom` | `tom_test.js` | theory of mind: predictions of other minds' targets and next actions from observable state, scored against a random-candidate baseline |
| `worldmodel` | game script | the learned world-model and deliberative-agency bench numbers, labelled as bench results, not live play |
| `help` | game script | every command, grouped |

Modules with no command of their own, read on demand by the ones above: `contradiction_ledger.js` (a conflict
surfaced anywhere makes every consumer abstain on that key), `kripke_planner.js` (labelled-transition modal
planner), `gravity_well.js` (relation-consistent embedding repair), `gamemod.js` (the minds can write validated
programs into the game; the ledger is `mods`), `chatter.js` and `speech_gen.js` (composed, not templated, radio
and pilot speech), `inhabitant.js` (a mind that lives inside a ship and remembers what happened to it).

The passenger (the PARASITE tab, the default) is the player's own mind: type anything that is not a command and
it answers from lore, its own state and live telemetry; ask for advice ("what should I do next") and it answers
from the same telemetry function that drives its unprompted warnings; it studies a question it cannot ground
and says so in the reply.

Where the claims are audited:
- `IRON_LAW_AUDIT.md`: where the playable game still gives the AI or the player an unearned advantage, by class.
- `AGI_SALVAGE.md`: every reasoning pillar across the wider ecosystem, which implementation is canonical, and where it is proven in-game.
- `REQUIREMENTS_SR.md`: the Space Rangers systems mapped onto the game, with status.
- `bench_results.json`: the headless bench run (78/78 suite, 581 claims at the last generation stamp in the file).

## 2026-09-05 pass (combat, look, talk)

- Combat was measured broken: in a 30 s hand-stepped battle both sides landed about 2% of their shots (the AI
  fired down its nose at where the target was, inside a 32-degree cone), and a 545-hull pirate out-healed those
  hits while its rare 75-damage shot one-shot a 70-hull scout. The AI now aims at the intercept point and fires
  inside an 11-degree cone; pirate tiers are 260/520/900 hull and 22/38/60 damage. Re-measured: the squad lands
  26% of its shots, pirates die, the player can die.
- Rear gun removed for now (`CFG.REAR_GUN`), every ship renders the real Spaceship.fbx with its palette and
  emissive maps (`CFG.FBX_HULLS`), the arena wireframe that drew lines across the sky is off (`CFG.ARENA_WIRE`),
  ACES filmic tone mapping (`CFG.EXPOSURE`), rock textures brightened at load (`CFG.ROCK_TEX_GAIN`) and a camera
  headlamp (`CFG.HEADLAMP_INT`), because the asteroid maps averaged 12-20% brightness.
