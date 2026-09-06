# USE_CASES — the UML use-case model of Star Fighter

RJ 2026-09-06: "plan it out into a giant list of uml use stories, some epic, and burn them all down and keep the uml
class diagram (just that and UML use cases) updated in a way that helps fable if possible."

This file is the source of truth for the use-case model. `tools/uml_js.py` renders it (and the class model it extracts
from the modules) to `uml/usecases.mmd` and `uml/classes.mmd`; both are checked in so a later session diffs them.
Format is strict so the tool can read it: one use case per line, `- UC-<id> [<epic>] [<status>] <actor> <story> :: <test>`.
Status is one of WORKS / PARTLY / MISSING / DEPRECATED. The test is what decided the status.

## Actors

- Pilot — the human at the keyboard.
- Passenger — the pilot's own AI (passenger.js + brain/); advises, chooses, answers, gets angry.
- AI pilot — a coalition ship with its own mind (think()); trades, hunts, learns.
- Synod — the enemy faction: drones, cruisers, warlords, the stronghold.
- Planet — a dockable world with an economy, a government, a mission board.
- Ranger Command — the base: hulls, repairs, the leaderboard.
- Drone — the pilot's mining helpers.

## Epics

- E1 STARBLAST — the small loop: mine, fill the bar, upgrade, tier up, die and spill. (STARBLAST_REQ.md)
- E2 RANGERS — the Space Rangers 2 layer: trade, fit, contracts, the war, rank. (REQUIREMENTS_SR.md)
- E3 EGOSOFT — the X layer: stations, fleets, trade automation, jump lanes.
- E4 GROUND — landing and tactics on the Tami rules (first-person surface, then the grid).
- E5 MINDS — the Passenger and the AI pilots as an honest AGI test.
- E6 SHELL — the presentation: one clean HUD, only what works, DEPRECATED behind a tab.

## Use cases

### E1 STARBLAST
- UC-101 [E1] [WORKS] Pilot shoots a rock; it splits and spills gems :: destroyAsteroid + spawnGem, hand-stepped
- UC-102 [E1] [WORKS] Pilot flies over a gem and collects it :: GEM_PICK_R path, credits move
- UC-103 [E1] [WORKS] Drone fetches loose gems and cuts seams into rocks :: 30 s hand-stepped: 8 rocks, 6 gems, 43c
- UC-104 [E1] [WORKS] Mined gems fill a gem bar; a full bar banks an upgrade point :: 60 s hand-stepped drone run: 22 rocks, 102c, bar 13%, 2 points
- UC-105 [E1] [WORKS] Pilot spends a point on one of eight stats with keys 1-8, in flight :: 8 spends read back Lv1 each; shield max 40 to 44, capacitor 100 to 110
- UC-106 [E1] [PARTLY] Pilot buys weapon / engine / hull levels with credits in flight :: SHOP panel, doUpgrade (2026-09-06)
- UC-107 [E1] [WORKS] A maxed ship offers the next tier; Pilot chooses a hull anywhere :: card offered at 8/8 + 1 point; Scout to Fighter in flight, hull 70 to 100, stats reset
- UC-108 [E1] [WORKS] Pilot dies; gems and credits spill; Pilot respawns as a Scout in the belt :: killShip, respawn branch
- UC-109 [E1] [WORKS] Pilot reads rocks, gems, ships and drones on the radar :: top-down inset blips
- UC-110 [E1] [WORKS] Shooting drains energy; it regenerates :: capLaser
- UC-111 [E1] [WORKS] The HUD shows stat rows, the bar, points and a kill feed on one screen :: UPGRADES strip bottom-left; 3 test kills render as 3 feed lines

### E2 RANGERS
- UC-201 [E2] [WORKS] Pilot docks at a planet and sees its screen :: PLANETMENU.open, 7 tabs
- UC-202 [E2] [WORKS] Pilot buys and sells goods at organic prices :: buy ore 5 −115c, sell +118c, +1 button −23c
- UC-203 [E2] [WORKS] Pilot sees where to sell what is held, from prices already seen :: TRADE ROUTES under the market: best two seen buyers per good with distance and per-unit gain, plus three runs from here
- UC-204 [E2] [WORKS] Pilot buys a weapon with condition, weight and power :: weapon ballistic −193c
- UC-205 [E2] [WORKS] Pilot compares a weapon against the fitted one before buying :: 20 comparison rows in the SHOP tab: dps, damage, rate, reach, barrels, homing, splash, damage type
- UC-206 [E2] [WORKS] Pilot fits gear into hardpoints and gizmo slots on a ship board :: MOUNT BAYS slots: mount cost 220c, GUNS 1 to 2, DPS 66.7 to 128.7; unmount refunded 110c and reverted both
- UC-207 [E2] [WORKS] Pilot takes a rank-gated contract from the board :: MISSIONS.accept via the UI
- UC-208 [E2] [WORKS] Pilot reads a contract as a card: target, distance, danger, reward :: cards from HOST.missionCandidates, the same numbers the Passenger chooses on; ACCEPT set the active mission in-page
- UC-209 [E2] [WORKS] Passenger chooses the contract and says why :: chooseMission + spoken reasons
- UC-210 [E2] [WORKS] Pilot follows the tracker and the on-screen marker to the target :: updateMissionArrow / Marker
- UC-211 [E2] [WORKS] Pilot jumps between systems on the star map, paying fuel :: starmap.js
- UC-212 [E2] [WORKS] Synod escalates; Pilot liberates, defends, assaults the stronghold :: HEG_TIERS, M12
- UC-213 [E2] [WORKS] Reputation, customs, contraband, fence :: SR-M4 verified
- UC-214 [E2] [WORKS] Pilot ranks up and spends skill points :: SR-M17
- UC-215 [E2] [WORKS] Pilot plays a text quest at a planet :: textquests self-test 16/16
- UC-216 [E2] [PARTLY] Pilot hears rumours and hires a wingman at the bar :: SR-M18, not re-measured
- UC-217 [E2] [PARTLY] Pilot analyzes artifacts and deploys probes at the science station :: SR-M19 commands
- UC-218 [E2] [WORKS] The galaxy persists across reloads and generations :: SR-M1, SR-M14

### E3 EGOSOFT
- UC-301 [E3] [WORKS] Pilot builds a station on a held world and it produces goods :: economy.js chains; a Halcyon plant made 36 units, an Agri world picks pharma and a Mining world a smelter
- UC-302 [E3] [WORKS] Pilot assigns AI ships to a trade route between two markets :: haulers fly real distance and trade at live prices; 8 runs, +460c, and they hold when a leg stops paying
- UC-303 [E3] [WORKS] Pilot commands a wing: follow, attack, mine, trade, hold, defend a world, go dock :: EMPIRE board + wing command; 36 ships took DEFEND and all four sampled closed 65-141u on the world in 25s
- UC-304 [E3] [WORKS] Systems are separate bubbles joined by lanes; a contested system infects its neighbours :: measured: a lane jump moved 1004u for 19 fuel, a non-lane jump moved 0 and cost 0; warTick halves the invade threshold for a lane neighbour of an already-contested system
- UC-305 [E3] [WORKS] Synod adapts its armour and gun mix across generations :: synod.js: 40 frag hits moved frag armour to x0.93, ballistic weight 1 to 1.5, and 400 draws matched the new weights

### E4 GROUND
- UC-401 [E4] [DEPRECATED] Pilot lands and walks the surface :: boxes on a checkerboard - a toy (RJ 2026-09-06)
- UC-402 [E4] [DEPRECATED] Pilot fights a turn-based battle on the Tami rules :: 8x8, 3 fixed units, no terrain / preview / deployment
- UC-403 [E4] [MISSING] Pilot walks a first-person surface (three.js FPS view) :: not built (RJ: copy an FPS repo)
- UC-404 [E4] [MISSING] Ground battle shows turn order, technique detail, matchup preview, terrain, deployment :: bring-over list, 10 rows

### E5 MINDS
- UC-501 [E5] [WORKS] Pilot asks the Passenger anything; it answers with a reasoning transcript from the novel, the live game or the shards, or refuses :: brain.ask, verified 2026-09-06
- UC-502 [E5] [WORKS] Passenger advises on threat, hull, fuel, hold, mining :: advise()
- UC-503 [E5] [WORKS] Passenger gets angry when ignored and shocks the screen; calms when obeyed :: noteAdvice, 4 tiers
- UC-504 [E5] [WORKS] AI pilots trade, hunt, learn steering and targets :: think(), IRON_LAW_AUDIT
- UC-505 [E5] [WORKS] Pilot inspects the minds: knowledge store, Kripke frame, coop proof, growth, ToM :: 12 commands run in-page
- UC-506 [E5] [PARTLY] Pilots talk aloud and the Pilot can speak back :: browser voices
- UC-507 [E5] [WORKS] The minds write validated rules into the game :: gamemod ledger

### E6 SHELL
- UC-601 [E6] [WORKS] Pilot shows or hides any window and opens any screen from one place :: WINDOWS menu
- UC-602 [E6] [WORKS] Pilot sets any panel's transparency; the box really darkens :: panels.js 0.25-1.0
- UC-603 [E6] [WORKS] Pilot sees one top bar: FLY, MAP, SHIP, MARKET, UPGRADES, CONTRACTS, PASSENGER, BROKEN :: shell.js, 8 tabs live, zero elements overlapping its band
- UC-604 [E6] [WORKS] What is broken sits behind a BROKEN tab and is not advertised :: the tab renders 2 deprecated, 8 half built, 9 not built from uml/status.json
- UC-605 [E6] [WORKS] Pilot goes fullscreen :: ⛶ button
- UC-606 [E6] [WORKS] Pilot finds every generated art file with its prompt :: Generated art screen
