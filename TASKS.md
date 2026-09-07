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

- [x] C1  Machine-world skins -> DONE, and it grew: SEVEN looks (iron/circuit/rust/warlord/glacier/verdant/imperial), each a different world not a hue swap, 3072x1536, six maps per look in one UV space. Applied and screenshotted in the page. cs 44b21f7
- [x] C2  FLUX skin -> the honest answer is it CANNOT make one: four prompts, four compositions, measured centre/edge luminance 1.47 where a flat texture is 1.00. It composes subjects, not surfaces. Option B is now its plating art high-passed into a detail layer over C1's structure. Recorded in gen_painted_cybertron.py
- [x] C3  The mesh -> REBUILT properly after RJ asked for "a high quality round mesh properly texture mapped": a 256-segment sphere displaced through displacementMap in the ALBEDO's UV space, 33,153 vertices, full PBR (roughness + AO), fresnel rim. The first hand-rolled vertex-colour version is gone. cs 44b21f7
- [x] C4  "Still very bright" -> RJ was right and my first number was misleading: a whole-disc average of 45 hid how the LIT face reads close up. The pale disc beside the planets was the SUN, which had no texture at all - nine flat cream MeshBasicMaterial spheres. Fixed in cs 4b892ad
- [ ] C5  Publish the three options side by side for RJ to pick -> DONE WHEN: an artifact URL renders the three renders with their measurements
- [ ] C6  Fix the wing-order argument bug the other lane found (empire.js:126) -> DONE WHEN: FOLLOW issued from the board follows the PLAYER, verified in the page
- [ ] C7  Make ground.js deterministic and drop its dead store (ground.js:109, :297) -> DONE WHEN: two builds of the same world produce identical terrain colour, measured
- [ ] C8  Fix the hauler off-by-one name and the empty catches (economy.js:184, synod.js:42) -> DONE WHEN: a fresh hauler's name matches its id, and a failed localStorage write is reported not swallowed
- [x] C10 Seven looks, switchable live with `cybertron <look>` - verified in the page, iron screenshotted at 3072
- [x] C11 AAA channels -> measured present on the material: displacementMap, roughnessMap, aoMap, normalMap, emissive 1.25, 2 shells. The flat atmosphere shell was REPLACED by a fresnel shader after hiding the shells proved they were what put pale patches on the world
- [ ] C9  Delete the dead code the other lane listed in my files -> DONE WHEN: planetmenu.js:885-907, missions.js:88/92 and power_panel.js:71 are gone and every file still parses


### Produced from the first-run measurement (2026-09-06, measured on a wiped localStorage)
A brand-new player is shown **144 visible UI boxes and 5,043 characters of text**, behind a
**6-page lore intro**. Searched that on-screen text for the controls the README documents:
`WASD` **absent**, "space to fire" **absent**, mouse aim **absent**, any statement of the goal
**absent**. The only help affordance is the word `help` inside the terminal hint bar, which you
must already know to type. The intro's one instruction is "type into the box like you are talking
to yourself" - about the Passenger, not about flying.

- [ ] N3  Cut what a first-time player is shown at once -> DONE WHEN: the count of visible boxes on a wiped first load drops from 144, measured by the same DOM sweep, with every panel still one click away and a returning player's saved layout untouched.

### Landed after the first hour (RJ's live direction)
- [x] C12 The droids RJ could not see -> MEASURED why: at BOT_MINE_R 120 both were cutting rocks 22 and 27 units out at screen x -8.56 and 12.35 (visible range -1..1). They now dock on the wing, launch out of the hull with a burst, and only take rocks inside a 52-degree cone. Re-measured over 30 simulated seconds: a droid is in frame in 66% of samples. cs 44b21f7
- [x] C13 The white planet with a fire ring -> it was the SUN: nine untextured cream spheres. Generated photospheres per star class (granulation, spots, faculae) + a fresnel corona; five classes across nine systems. cs 4b892ad
- [x] C14 SB6, the last open Starblast row -> per-model shot patterns, measured per hull through the real fire path: 1 to 6 bolts, 0.0 to 9.2 degrees, total damage 18.00 to 21.96. STARBLAST_REQ.md's table is now complete. cs 16de1b2
- [x] C15 Throttle bar -> keys ([ ] and \), lever hidden behind CFG.THROTTLE_BAR. Measured: ]]] 0 -> 0.30, [ -> 0.20, \ -> 0. cs da23c8b
- [x] C16 Fix the autonomous-worker skill (RJ: "it's broken in many ways") -> six defects fixed FROM THIS RUN: no time-box handling (the "work one hour and report" was ignored), mid-run user messages treated as interruptions, no one-agent rule, the whole-loop probe trap (a probe that stepped step() but not updateCamera() read 0% where the truth was 66%), an unaffordable verification gate, and an unskimmable list.

### Genre backlog
### Genre gaps, anchor-ranked (regenerate with `py tools/upgrade_pass.py`)
Anchor count = how many of 8 surveyed games have the capability. It is the ranking key: a thing six
independent games all do is a genre expectation; a thing one game does is that game's idea.

- [ ] F58  A guided opening that teaches the basics -> anchor **8/8**, ours=partial. DONE WHEN: a new player can complete one full mine-collect-upgrade loop guided, verified by driving it in the live game. (The FIRST FLIGHT card landed this session and is why this is `partial` not `no`; what is missing is the guided first loop, not the key list.)
- [ ] F31  An authored main storyline with scripted missions -> anchor **7/8**, ours=partial UC-212. DONE WHEN: a named story arc with at least 3 ordered beats can be started, advanced and completed, verified by running it end to end.
- [ ] F67  Music that changes with the situation -> anchor **7/7**, ours=**no, proven**: grep for music|soundtrack|bgm across every .js and .html (minus the 3 vendored libs) returns ZERO hits; sound.js plays one-shot effects only. DONE WHEN: combat and travel play different beds and the switch is audible, verified by reading which track is selected in each state.
- [ ] F16  Purchases gated by rank or licence, not money alone -> anchor **6/8**, ours=partial UC-217. DONE WHEN: at least one purchase refuses on rank with a message naming the rank needed, verified in the live terminal.
- [x] F35  Missions can fail, with a lasting consequence -> SETTLED **partial** (was ours=unknown), anchor 6/8. Read BOTH mission systems + index.html. (1) Contracts (missions.js) have NO failure state: the only non-success exits, `abandon()` and `voidM()`, are explicitly no-penalty (missions.js:18 header, :309 abandon, :335 voidM "No penalty"), and an accepted contract has no deadline/timer (no expire/timeout/deadline in the file - initState:275 stores acceptedT but nothing reads it). index.html imposes no mission-loss penalty either (negative repAdd only at :1620 customs contraband and :2591 planet-bombing, neither tied to a mission). (2) Text quests (textquests.js) DO carry lasting negative consequences via applyEffects (:64): declining costs standing (end_ignore rep -0.4 :93; the_debt end_decline rep -0.3 :136), a greedy resolution costs standing (end_keep rep -1.5 :116), and reputation persists via HOST.repAdd - but every quest terminal increments questsCompleted (:246), so a bad outcome still counts as *resolved* (there is no "failed" state). => lasting consequence YES, failure state NO = **partial**. OBSERVABLE: `node textquests.js` -> RESULT PASS 16/16, incl. "resolving a quest changed at least one of credits/rep"; `py -3.13 tools/upgrade_pass.py` moved the ours tally unknown 5->4, partial 9->10 (45/9/11/5 -> 45/10/11/4, exit 0). genre_matrix.json F35 cell now carries these file:lines + settledFrom.
- [x] F19  The player's own buying and selling moves local prices -> SETTLED **yes** (was ours=unknown), anchor 4/8 (was the highest-anchor unknown). `priceOf` (index.html:1701) = `base*clamp((eq/stock)^PRICE_ELAST,MIN,MAX)`, inverse to `p.stock[gk]`; `buy()` depletes that stock (:1752-1753 `p.stock[gk]-=qty`) so the NEXT price RISES, `sell()` floods it (:1755 `p.stock[gk]+=qty`) so the next price FALLS - author's own comment :1750 "buy/sell MOVE stock -> MOVE price ... no cheating"; the player path is P=ships[0] via the buy/sell commands (:4909/:4910). The prior "linear" note only saw within-ONE-transaction pricing (price snapshotted once at :1751, whole qty charged at it); the move lands on the NEXT read, not mid-lot. OBSERVABLE (verbatim priceOf + real CFG EQ_STOCK 120 / PRICE_ELAST 0.9, ore base 14): ore 14.00c @stock120 -> 22.74c after buying 50 (stock 70) -> 10.23c after selling 50 (stock 170) = PASS. `py -3.13 tools/upgrade_pass.py` moved ours tally yes 45->46, unknown 4->3 (46/10/11/3, exit 0). 3 ours=unknown cells remain (F34, F68, F69).
- [x] F34  Settle "attacking one faction raises standing with its rival" (was ours=unknown) -> SETTLED **partial**, anchor 3/8. A squad ship's kill of a Hegemon/pirate warms the nearest coalition world: `repAdd(nearestPlanet,+CFG.REP_KILL_HEG)` at index.html:2775 (REP_KILL_HEG=+0.4, :500 "fight the Hegemon, planets warm to you") - attacking the enemy faction DOES raise standing with its rival, the coalition. LIMITS -> partial not yes: (1) one-directional - repAdd (:1735) only writes coalition worlds' `.rep`; the Hegemon is a boolean `p.hegemon` (:1991) with no standing to raise, so player bombing (:2623 -REP_BOMB) / contraband caught (:1652 -REP_BOMB*2) lower coalition rep but boost no enemy side; (2) single pair - the `rep` command (:5135) lists systems as "factions" but repAdd spreads only POSITIVELY within a system, never negatively across, so systems aren't mutual rivals. More than EVE (marked no: "never boosts a rival"), less than X4/Freelancer's symmetric web. OBSERVABLE: `node` replay of the verbatim repAdd + the :2775 hook -> coalition world rep 2.0 -> 2.4, system sibling -> 2.2, clamped at REP_MAX 12; bombing 3.0 -> 2.5 raising nothing enemy-side = PASS. `py -3.13 tools/upgrade_pass.py` moved the ours tally unknown 3->2, partial 10->11 (46/11/11/2, exit 0). genre_matrix.json F34 cell now carries these file:lines + settledFrom. 2 ours=unknown remain (F68, F69).
- [x] F68  Settle "the game supports a gamepad" (was ours=unknown) -> SETTLED **no, proven**, anchor 3/8 [accessibility]. Grep of the game's OWN source (index.html + every root *.js minus the 3 vendored libs) for `getGamepads|gamepadconnected|navigator.getGamepads|new Gamepad` = **0 hits**. Input is entirely rebindable flight KEYS (keydown/keyup index.html:6855/6878, with an un-rebindable arrow/right-Shift fallback :6837), left-mouse fire, MOUSE steering used as a "virtual-joystick" (:7059 comment), and a mobile on-screen TOUCH stick (:6883) - none polled through the Gamepad API. Graded on the anchors' own bar: Freelancer needs a third-party MOD for a pad and is marked `no`, so our mouse/touch virtual-sticks are `no` too. OBSERVABLE: `bash verify_f68_f69.sh` -> "F68 gamepad-API hits: 0", RESULT PASS, exit 0.
- [x] F69  Settle "colourblind or other accessibility options" (was ours=unknown) -> SETTLED **no**, anchor 3/8 [accessibility]. Grep for `colou?rblind|deuteran|protan|tritan|daltoniz|high-contrast|prefers-reduced-motion|prefers-contrast` = **0 hits**: no colourblind palette, no high-contrast mode, no reduced-motion toggle, no gamma/brightness slider, no captions, no ARIA. The only display control is per-panel transparency (UC-602 [WORKS], panels.js 0.25-1.0) - a layout/declutter control WEAKER than Elite Dangerous's gamma slider, which is graded `no` HERE ("gamma slider only, no colourblind mode"). Remappable flight controls DO exist (index.html:6835 "make all the keys optional", rebind :6906-6911, persisted `SF_CONTROLS_v1`) - a real motor-accessibility affordance - but every anchor with remappable-but-no-colourblind (Freelancer, EV Nova, Elite) is graded `no`, so grading ours `partial` would apply a softer bar to ourselves than to the anchors. OBSERVABLE: `bash verify_f68_f69.sh` -> "F69 colourblind/contrast/reduced-motion hits: 0", RESULT PASS, exit 0.
  `py -3.13 tools/upgrade_pass.py` moved the ours tally **unknown 2->0, no 11->13** (46/11/11/2 -> 46/11/13/0, exit 0; 70 caps, 537 decided cells, 274 grounded). **Every one of the 70 genre capabilities now has a measured `ours` grade - the `unknown` class is CLOSED.** verify script kept at `scratchpad/verify_f68_f69.sh`.
- [x] G1  Guard the three grep-proven "no" genre grades so they cannot silently rot -> BUILT `tools/genre_selfcheck.js`. `upgrade_pass.py` TRUSTS `genre_matrix.json`'s recorded `ours.v` (reads it as input, never re-derives it), so F67 (music), F68 (gamepad), F69 (accessibility) - each settled `no` by a ZERO-HIT grep over the game's own source - would keep reporting `no` if the capability ever landed, and the anchor-ranked backlog would misrank, with nothing complaining. The guard re-runs each settlement's defining grep over index.html + every root *.js (minus the 3 vendored libs) and exits 1 if a `no` cell now has hits. Registered in `tools/watch_upgrades.cmd` beside cmd_shadow + cfg_dupes so it runs on every pass. OBSERVABLE (all re-checkable by a stranger): `node tools/genre_selfcheck.js` -> "3 grep-proven 'no' cells still hold ... 0 source hits each", exit 0; `node tools/genre_selfcheck.js --self-test` -> "self-test PASS ... 6059 source hits", exit 0; and an end-to-end drift proof - planting `navigator.getGamepads()` in a throwaway root .js made it exit **1** flagging F68 by file:line, then removing it returned it to exit **0**. All four checks (upgrade_pass / cmd_shadow / cfg_dupes / genre_selfcheck) exit 0. (Picked this iteration because every higher-priority open item - N3 and the open genre gaps F58/F31/F67/F16/F60 - requires driving the live game in a browser this headless worker session does not have; the `unknown` cell class is already closed, and the self-tests, swallowed_comments and the B1/B2 empty-arg footgun grep all came back clean, so no player-facing defect was reproducible headlessly.)
- [x] G2  Guard the global CFG against a READ of an undefined key -> BUILT `tools/cfg_undef.js`, the companion to cfg_dupes (which guards DUPLICATE keys). A `CFG.FOO` read where the literal has no `FOO:` (a typo, or a key renamed at its definition but not at one read site) evaluates to `undefined` -> NaN in the arithmetic that fills index.html, silently corrupting a stat/price/cooldown with the reason invisible in the source; two agents edit this 489-key CFG. HUNT RESULT: **0 undefined reads** - all 476 distinct `CFG.<key>` reads resolve (489 literal keys + 4 runtime-assigned), verified against HEAD bd2a535. The scanner walks index.html skipping strings/comments and matches `CFG.` only when NOT preceded by a word char or a dot - the three false-positive traps a naive grep hit (module-local CFGs like engbay COL_DIM, `CFG.X` inside comments, and `RETICLE_CFG`/`TOMTEST.CFG` namespaces): a naive grep reported 41 phantom misses; the fixed scanner reports 0. Registered in `tools/watch_upgrades.cmd` beside cfg_dupes. OBSERVABLE: `node tools/cfg_undef.js` -> "476 distinct CFG.<key> reads, all resolve ... no undefined reads", exit 0; `node tools/cfg_undef.js --self-test` -> "the planted undefined read was caught", exit 0. All five checks (upgrade_pass / cmd_shadow / cfg_dupes / cfg_undef / genre_selfcheck) exit 0.
- [ ] F60  Pick a difficulty or starting scenario before playing -> anchor **5/7**, ours=no. DONE WHEN: a choice at first run changes at least one measurable starting condition, verified across two fresh starts.

## Done

- [x] N5  Every command is now findable -> DONE. `help` names roughly 90 of the 246 aliases the chain accepts; the rest - `save`, `load`, `newgame`, `status`, `shield`, `wing`, `hauler`, `engbay`, `stat`, `terraform` and sixty-odd more - were reachable only by reading source. A new `commands` (`cmds`, `allcommands`) prints all of them, DERIVED FROM `runCmd.toString()` at call time rather than hand-listed, so whatever the chain accepts is exactly what it prints and it cannot drift when someone adds a branch.
  Verified live: `commands` -> "138 handlers, 246 names" over 37 grouped lines with aliases in parentheses; `commands haul` -> `hauler (haulers)`; `commands zzzz` -> "nothing matches"; and all ten previously-hidden commands I checked now appear. `help` gained a closing section pointing at it, verified in the same run, and its audio line now reads `mute / unmute` since those are finally a pair.

- [x] N4  Say when flight is paused -> DONE. A badge sits directly above the terminal input while it has focus: "flight paused while you type · Esc to fly". Verified in the live game in one run, badge AND the claim it makes: not typing -> hidden; typing -> shown, 0px above the input, thrust key leaves `MAN.thr` at 0 (the keys really are dead); after blur -> hidden and thrust goes to 1.
  It is driven by the frame loop reading `document.activeElement`, not by focus/blur events, for two reasons found while building it: the game's own guard is a live `activeElement` test, so reading the same thing cannot drift out of step with it; and focus/blur DO NOT FIRE when the document lacks OS focus, which is exactly the automated case - `el.focus()` still moves activeElement and still kills the keys, silently.
- [x] H1  The harness refuses to measure a paused sim -> DONE, earned by being fooled. `frame()` returns on its FIRST line when the singleton lock hands the sim to another tab. Every call still succeeds, no error is raised, and a run reports a healthy ms/frame for a game that advanced zero steps - which is how a correct UI change came back measuring as broken. `SIM.run` now returns a refusal naming the lock and how to reclaim it, `SIM.census` reports `simPaused`, and `SIM.profile` passes the refusal up instead of dividing by an undefined frame count.

- [x] S1  The galaxy is the same galaxy every time you come back -> FIXED for the geography. REQUIREMENTS_SR SR-M1 calls this "a living galaxy you leave and return to" and UC-218 was marked WORKS, but only the CAREER persisted: `makePlanets`/`makeSystems` draw every position from `Math.random` via `T.MathUtils.randFloat`, so the layout was re-rolled on every boot while the save restored per-planet state BY NAME - your reputation came back attached to a planet that had moved. A seed is now stored once (`SF_GALAXY_SEED_v1`) and `Math.random` is swapped for a seeded xorshift for the duration of world generation only, restored in a `finally`.
  Verified across two real page loads: all 18 planets identical to 3 decimal places (`Halcyon@155.005,-0.568,34.548`, `Cydon@701.451,-1.049,750.087`, ...). Also proven, in one run: the same seed reproduces its stream, a different seed produces a different galaxy, and `Math.random` is genuinely restored afterwards, so combat, spawns and AI keep the real randomness they have always had. Whole-game check after: two 9-second runs, 0 errors, no NaN positions, no console errors.
  STILL NOT PERSISTED (the rest of what the audit found, not claimed as fixed): planet `stock` resets to `EQ_STOCK`, observed prices `_obs` are wiped, and missions / wing / empire / conquest / quests are never serialized at all.

- [x] N6  Six terminal commands could never run -> FIXED, and the class is now guarded. `runCmd` is a long `if (c === 'x' || ...)` chain; the first branch to claim an alias wins and every later one is dead code that still reads as complete, sensible source. Built `tools/cmd_shadow.js`, which found exactly the six an independent audit had found - two methods agreeing. Resolutions: `tomacc`/`mindacc` now reach the theory-of-mind readout (it was claimed by tom_test.js and centroid_mind.js and had NEVER run); `reason` and `deliberate` belong to the DELIBERATE branch; `talk` is the microphone and asking a pilot is `ask`/`q`; and `mute`/`unmute` are finally inverses of each other on SOUND - before, `mute` silenced sound while `unmute` switched CHATTER voices ON, which no reading of either handler would reveal.
  Verified in the live terminal: `tomacc` -> "THEORY OF MIND · 0 predictions"; `mute` -> "sound muted" (`SOUND.muted()` true); `mute` again -> "sound on" (false); `unmute` -> "sound on" (false); `voices` still prints the voices status; `talk` still prints the microphone usage. The checker now reports 243 aliases, 0 shadowed, and has a `--self-test` that plants a shadow and requires catching it.

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
- `index.html:861` (STALE COMMENT, not a functional bug - the two later sites are correct and agree with each other) - the `miningBotsTick` header says "Bots never destroy a rock themselves: the split is the pilot's shot", but the 2026-09-06 drone-mining change at `:957` does `a.hp-=CFG.BOT_DPS*dt; if(a.hp<=0){ destroyAsteroidObj(a,P); }` - bots DO destroy rocks now. `CFG.BOT_DPS=3.5` (`:397`, whose own comment says drones "split rocks with you", a scale-4 rock's 26 hull cut in ~7.4s solo). The header describes the pre-mining seam-only behaviour and was not updated when BOT_DPS landed, so anyone reading `:861` gets the wrong model (that a rock only ever splits under player fire). Verified by reading `:861` vs `:397` vs `:950-957` in the same file.

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
