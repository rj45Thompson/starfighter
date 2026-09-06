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

(nothing open in this lane - see "For the other lane" below for verified findings handed over)

## Done

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
