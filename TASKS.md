# Star Fighter - work list

Owner of this list: the "make it better" lane (performance, runtime defects, first-run clarity).
A SECOND session is building features in this same tree at the same time (economy / empire /
ground / synod / shell / sbhud, ~1 commit per 4 min on 2026-09-06). **Files that lane owns are
listed under "hands off" below.** Adopt this file; do not start a second list.

Every line: `- [ ] ID  verb + target -> DONE WHEN: <observable a stranger could re-check>`
`[x]` done + evidence · `[!]` blocked + measurement · `[-]` dropped + reason

## Hands off (the other lane's live files, 2026-09-06)
economy.js · empire.js · ground.js · synod.js · sbhud.js · planetmenu.js · missions.js ·
engbay.js · USE_CASES.md · STARBLAST_REQ.md · REQUIREMENTS_SR.md · README.md
If work here needs one of those, coordinate first, do not just edit.

## Measured baseline (2026-09-06, my own harness, before any change)
Driven by `window.__sim(seconds)` which stubs rAF and calls `frame(t)` 60x per simulated second,
so it does not depend on the browser pane being visible. 63 ships, 7,787 asteroids, 18 planets.

| what | ms/frame | share |
|---|---|---|
| whole frame | 25-27 | 100% |
| `step` (pure JS sim) | 13.8 | ~50% |
| `renderAll` | 12.7 | ~46% |
| everything else combined | ~1 | ~4% |

Inside `step`, per frame: `writeRockInstance` **7,781 calls**, `think` 16, `flyStep` 63,
`astHitShip` 60, `segDistSq` 650, `statMult` 498, `ffCanHit` 468.
No leak found: scene children oscillate 469-572, ships plateau at 63, 0 runtime errors in 18s.
⚠ `renderAll`'s share may be inflated by the hidden browser pane; the `step` half is not.

---

## Open

### Cybertron lane (the feature session, 2026-09-06 21:06Z - files: assets/gen_cybertron.py, cybertron.js, assets/planets/machine_*, and TWO lines of index.html)
⚠ This lane edits index.html, which the other lane has UNCOMMITTED work in (the first-flight card).
My footprint there is one script tag and one CFG value; commits are staged by hash from HEAD so the
card is never swept in. Everything else lives in new files.

- [ ] C1  Generate option A, the procedural machine-world skin -> DONE WHEN: albedo/emissive/normal applied to a planet in the running page, screenshotted, and the disc's day/night mean luma measured
- [ ] C2  Generate option B, a FLUX Cybertron skin through the seam repair -> DONE WHEN: the same three measurements, from the same camera, on the same planet
- [ ] C3  Build option C, a displaced machine MESH (not a textured ball) -> DONE WHEN: the same three measurements, and the geometry is visibly displaced (vertex count and radius spread reported)
- [ ] C4  Answer "still very bright" with a number, not an opinion -> DONE WHEN: day-side disc mean luma measured before and after on the live page, and the bright disc beside the planets identified by raycast
- [ ] C5  Publish the three options side by side for RJ to pick -> DONE WHEN: an artifact URL renders the three renders with their measurements
- [ ] C6  Fix the wing-order argument bug the other lane found (empire.js:126) -> DONE WHEN: FOLLOW issued from the board follows the PLAYER, verified in the page
- [ ] C7  Make ground.js deterministic and drop its dead store (ground.js:109, :297) -> DONE WHEN: two builds of the same world produce identical terrain colour, measured
- [ ] C8  Fix the hauler off-by-one name and the empty catches (economy.js:184, synod.js:42) -> DONE WHEN: a fresh hauler's name matches its id, and a failed localStorage write is reported not swallowed
- [ ] C9  Delete the dead code the other lane listed in my files -> DONE WHEN: planetmenu.js:885-907, missions.js:88/92 and power_panel.js:71 are gone and every file still parses


### Produced from the first-run measurement (2026-09-06, measured on a wiped localStorage)
A brand-new player is shown **144 visible UI boxes and 5,043 characters of text**, behind a
**6-page lore intro**. Searched that on-screen text for the controls the README documents:
`WASD` **absent**, "space to fire" **absent**, mouse aim **absent**, any statement of the goal
**absent**. The only help affordance is the word `help` inside the terminal hint bar, which you
must already know to type. The intro's one instruction is "type into the box like you are talking
to yourself" - about the Passenger, not about flying.

- [ ] N4  Nine of ten flight keys are dead while the terminal has focus, and only a control card now says so -> DONE WHEN: a player who clicks into the terminal gets a visible cue that flight is paused, verified by looking at the live game with the chat focused.
- [ ] N5  75 terminal commands are unreachable without reading source -> DONE WHEN: `help` (or a paged version of it) names every branch `runCmd` accepts, verified by diffing the help text against the handler list.
- [ ] N6  Six command aliases are shadowed and dead: `tom`, `mind`, `reason`, `deliberate`, `talk`, and `mute` (mute/unmute are not inverses - `mute` hits sound, `unmute` turns on voices) -> DONE WHEN: each resolves to its intended handler, verified by running all six in the live terminal.
- [ ] S1  The galaxy does not persist; only the career does -> DONE WHEN: reloading twice puts the same planets in the same places, verified by comparing planet names and positions across a reload. (`makePlanets` re-rolls the layout with unseeded `rand` every boot; `stock` resets, `_obs` is wiped, and missions/wing/empire/conquest/quests are never serialized.)
- [ ] N3  Cut what a first-time player is shown at once -> DONE WHEN: the count of visible boxes on a wiped first load drops from 144, measured by the same DOM sweep, with every panel still one click away and a returning player's saved layout untouched.

### Genre backlog
- [ ] G0  Run the genre survey and rank the gaps -> DONE WHEN: `genre/genre_matrix.json` exists, `py genre/anchor_rank.py` prints a ranked gap list, and `py tools/upgrade_pass.py` writes GAME_UPGRADES.md.

## Done

- [x] N1  Tell a new player how to fly and what to do first -> DONE. A FIRST FLIGHT card now precedes the lore on a first run, and it is GENERATED FROM `KEYBIND` rather than typed, so it cannot drift and it shows a player's own rebinds. Re-ran the exact search that found the gap, on a wiped localStorage: thrust named **true**, turn keys **true**, fire **true**, first objective **true** (all were false). Verified live: card -> lore -> dismissed; a returning player with a save sees neither card nor overlay.
  Writing it caught the docs being wrong: README.md says "space to fire", but Space is **thrust** and fire is **F or left-mouse**. A hand-written card would have shipped that error; a generated one cannot.
- [x] N2  Make help reachable without knowing to type it -> DONE. A `?` button, bottom right, always present. Verified by clicking it in the live game: the card reopens. Before this the only route to help was typing `help`, which nothing told you.
- [x] N1b THE TRAP the ground-truth audit found, fixed with N1 -> the intro ended with `chat.focus()`, and the global keydown handler returns immediately while the chat has focus. So the moment the intro closed, every key the player had just been taught did nothing but type into a box, with nothing on screen explaining it. Focus is no longer stolen. Verified live: focus after intro is `BODY`, and pressing the thrust key moves `MAN.thr` 0 -> 1. Escape already blurred the chat; the card now teaches the Enter/Esc pair.

- [x] B3  `scan` leaked a GPU texture per badge and the badges never expired -> REPRODUCED then FIXED. The terminal line already promised "badges painted over live contacts for 8s"; `o._scanBadgeT = T0+8` was written and NOTHING in the repo read it, and a re-scan detached the old sprite without disposing its CanvasTexture. Measured on the live game with six ships parked alongside the player: one scan takes textures 57 -> 63 (the six badges); **ten scans take it to 64, not ~117** - each rescan disposes the one it replaces. Expiry verified on the same run: at +4s still 6 badges / tex 64 (it keeps its stated life), at +10s **0 badges / tex 59** - the textures are actually freed, not just detached.
- [x] B4  An away mission silently froze the empire and stopped saving -> FIXED. The `AWAY.active()` branch returns before the whole tail of `frame()`, which is right for the space sim and the space render but also skipped `ECONOMY.tick` and `saveTick` while `T0` kept advancing. Measured over 30 simulated away seconds with the branch forced: stations produced (Halcyon 160->164, Pallas 256->264, Cydon 0->4) and `AWAY.frame` still ran all 1,800 frames, so the mission itself is unaffected. Autosave proved separately: with `SF_SAVE_v1` deleted first, 19 away seconds wrote an 11,767-byte save; before the fix nothing was written for the entire mission. The WAR sim stays paused on purpose - an away mission can decide the battle conquest is arbitrating, which is a design question, not an oversight to quietly fix.
- [-] P2  Re-tune the AI `think` stride -> DROPPED, and the measurement is why. At 62 ships:

  | THINK_STRIDE | think ms/frame | think calls/frame |
  |---|---|---|
  | 1 | 14.45 | 62.5 |
  | **4 (shipped)** | **4.54** | **16.5** |
  | 16 | 2.68 | 4.8 |

  Stride 4 already takes 69% of the cost out. Going to 16 saves a further 1.86 ms/frame while
  quartering how often a pilot reacts - a bad trade for a game about AI pilots. The shipped value
  is right; nothing changed.
- [x] V1  Re-verify the whole game -> PASSED on a clean page after every change: two consecutive `SIM.run(9)` at 57 ships and 7,670 rocks report **0 unique errors** and **empty `nanShips`**, browser console clean of TypeError/ReferenceError, and a screenshot shows the asteroid field rendering normally with no LOD artifacts.

- [x] H0  Build a measurement harness that works in a tab that never paints -> DONE: `sim_harness.js`, loaded only on `?harness=1`, drives the game's own `frame(now)` with a synthetic clock. `SIM.census() / run() / profile() / rockReport()`. Verified: `SIM.run(3)` returns real ms/frame on a hidden pane where `document.timeline` is frozen at 0 and rAF never fires.
- [x] P1  Cull the per-frame asteroid instance-matrix rewrite by distance -> **DONE, but NOT to the number I first wrote.** Measured A/B in one page, three interleaved OFF/ON pairs at a matched 53-58 ships and ~7,740 rocks, using the real off-switch `CFG.ROCK_LOD_MAX=1`:

  | arm | ms/frame (3 passes) | mean | writeRockInstance calls/frame |
  |---|---|---|---|
  | OFF (old: every rock, every frame) | 22.10 · 21.44 · 19.42 | 20.99 | 7,728 |
  | ON (graduated distance LOD) | 19.94 · 16.46 · 17.68 | 18.03 | 2,495 |

  **14.1% less frame time, 68% fewer instance-matrix writes, 0 errors, no NaN positions.**
  My original DONE WHEN said "under 1,000 calls/frame and step down 25%". That target was set
  BEFORE measuring where the rocks actually are, and it was wrong: 4,182 of 7,615 rocks sit within
  308u of the player because the mining belt is dense and the player flies inside it. Reaching
  1,000 would mean striding rocks close enough to visibly stutter - buying frame time with an
  artifact. The stride is instead capped by a sub-pixel rule (a rock strided N frames is N/20 units
  stale, which is under half a pixel beyond N*77 units), so every tier is invisible by construction.
  Physics is NOT strided: position, spin, bounce and the collision grid still run for every rock
  every frame, so mining and hits are unchanged.
- [x] B1  `station sell` / `station upgrade` with no argument silently acted on the FIRST station -> REPRODUCED then FIXED. The old expression `.startsWith((a[2]||''))` is true for every string; evaluated verbatim on the live game it selects `Halcyon`, i.e. a bare `station sell` sold that station at 55% with no confirmation. After the fix, running `station sell` and `station upgrade` with no argument leaves stations 3 -> 3 and credits 994,399 -> 994,399.
- [x] B2  Same empty-argument bug for haulers (`sell` destroyed one, `recall` abandoned its cargo mid-route) -> REPRODUCED (old expression selects `TEST-1`) then FIXED; `hauler sell` / `hauler recall` with no argument leave haulers 4 -> 4. Legitimate paths re-verified in the same run: unique prefix `station sell cyd` sold Cydon; exact name `hauler sell alpha` sold ALPHA; ambiguous `hauler sell zed` with ZED-ONE and ZED-TWO present REFUSED and listed both instead of guessing.
- [x] D1  Triage the static audit -> DONE, 22 findings triaged. Mine to fix: B1, B2 (done), B3, B4. Handed to the other lane (their live files, listed under Hands off): see "For the other lane" below.

## For the other lane - verified findings in files I agreed not to touch
Each was verified by reading the cited line; the reproduction is stated so it can be re-checked.
- `empire.js:126` - the EMPIRE board sends the world `<select>` value as the 3rd argument for EVERY wing order, including FOLLOW, which expects a SHIP name. `index.html:6331` then gets `undefined` and `index.html:2899` substitutes `nearestRival`, so clicking ORDER -> FOLLOW sends the wingman hunting instead of escorting. The typed `wing follow` path is correct, so the board and the terminal disagree - against empire.js:57-59's own "a board order and a shouted one are the same order".
- `conquest.js:219` - `CONQUEST.tick`'s whole body is in `try{...}catch(e){}` and `acc=0` runs BEFORE `slowTick`, so any throw silently stops the war advancing forever, with nothing logged. `conquest.js:236` `onAwayVictory` has the same empty catch and can leave a planet half-captured with no "SECURED" message.
- `ground.js:109` - `Math.random()` inside `terrainMesh` while everything around it uses `rngOf(S.seed)`, so the terrain's colour speckle differs on every landing, against ground.js:51's "the same world every time you land on the same planet".
- `ground.js:297` - `var gy = S.height(...)` is a dead store overwritten at :310 after the move; it costs a full 4-5 octave noise evaluation per frame. `ground.js:117` `starDome(tint)` ignores its only parameter, so the dome is always `0xdfe9ff` regardless of the world colour computed at :244.
- `economy.js:184` - `S.nextId++` post-increments before `name` is read, so the hauler with id 3 is named `HAUL-4`. `economy.js:284/294` - a save whose `stations`/`haulers` field is not an array silently becomes an empty empire with no message.
- `synod.js:42` and `knowledge.js:29` - empty catches around localStorage; the Synod still announces "THE IRON SYNOD REFITS" when nothing persisted, and a corrupt knowledge blob silently restarts from empty and reports `0 shared + 0 private` as if true.
- `planetmenu.js:885-907` - `blackmarketFenceHtml(p)` is defined and never called; a second live implementation of the same feature is at :556-557.
- `missions.js:88/92` (`planetLive`, `goodByKey`) and `power_panel.js:71` (`tickMask`) are defined and never called.

## Notes
- The game's main loop is `frame(now)` at the bottom of index.html; it is a global, which is what
  makes the harness possible. `window.__sim` / `window.__census` are defined by the harness in
  `sim_harness.js` (loaded only when `?harness=1`), never in the shipped path.
- ⚠ A hidden Browser pane reports innerWidth 0, resolves vw/vh to 0 and freezes
  document.timeline, which makes panels measure 22x42 and slide transitions stick at frame 0.
  Check `innerWidth` and `document.timeline.currentTime` before believing any layout reading.

<!-- pass 1: 5 done, 0 blocked, 2 appended (B3, B4) -->

<!-- pass 2: 4 done, 0 blocked, 1 dropped with measurement, 0 appended -->
<!-- pass 3: 0 done, 0 blocked, 0 appended - STAGNANT, loop complete -->
