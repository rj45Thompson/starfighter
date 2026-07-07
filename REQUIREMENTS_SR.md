# REQUIREMENTS_SR — Space Rangers 2 burndown → starfighter (three.js)

Mapping **Space Rangers 2: Rise of the Dominators**' core systems onto our game, plus the Tami
2D-topdown battle-presentation bring-over list. NO code here — inventory, milestones, checklists.

Ground truth audited 2026-07-07 against:
- `starfighter.html` help text + command surface (`runCmd`, line ~1638) and module internals
- `PILLARS.md` (the bench law — every SR feature we add must not poison a pillar's claim-path)
- `NOVEL_SOCIETY.md` (N1–N8 status: novel/graph/roster live; chatter live; N5 bench-only; N6/N7 **not started**)
- `SR2_MILESTONES.md` (space-layer M1–M11 landed, M12 stronghold landed per CFG/commands; A-line partial)
- `Tami/Assets/Docs/BattleRequirements.txt` (NOTE: lives under `Tami/Assets/Docs/`, not repo root)

Honesty rule inherited from PILLARS.md: mechanics only, original names/text/art (Dominators → **HEGEMON /
Iron Synod**; rangers → **Wardens**); nothing below claims a feature we don't have — MISSING means MISSING.

---

# SR BURNDOWN

Status legend: **HAVE** (full) · **HAVE-partial** (exists, thinner than SR2) · **MISSING**.
Game fit = how well the SR2 feature serves THIS game's identity (AGI-society sim + Tami tie-in), 1–5.

| # | SR2 feature | Our status | Fit |
|---|---|---|---|
| 1 | **Galaxy of many star systems, each a 2D system map** (30–70 systems, per-system top-down maps, stations, orbiting planets) | **HAVE-partial** — 3 systems as clusters inside ONE continuous 840u arena (`CFG.N_SYSTEMS:3`, line ~150); orthographic TOP-DOWN tactical view + `map`/`galaxy` commands. No per-system map screens, no starmap/territory overlay, no stations besides Ranger Command. | 4 |
| 2 | **Hyperjumps** (fuel/engine-range gated jumps between systems; hyperspace transit + arcade duels) | **MISSING — deliberately removed** ("hyperspace removed for balance", CFG line ~150/180). All travel is real-space. Fuel/refuel exists and would gate a future jump system. | 3 |
| 3 | **Living economy** (per-planet markets, dynamic prices, trade AI, legal/illegal goods) | **HAVE** — organic prices emerge from stock (PROD/CONS/PRICE_ELAST; buy raises, sell lowers — never scripted); AI traders arbitrage the same market; planet dev levels + wealth; contraband + customs scans + fencing at hostile worlds (M10). This IS pillar P4 (`econ_vec`). | 5 |
| 4 | **Rangers: independent AI peers, ranked** (dozens of NPC rangers trading/fighting/levelling; galaxy leaderboard you climb) | **HAVE-partial** — player RANKS ladder Recruit→Legend gating gear (M5, `rank`); 8–10 AI pilots that genuinely trade/fight/upgrade/learn (the AGI substrate; novel-charactered, radio chatter). MISSING: a ranked leaderboard of player-vs-AI, 50-scale roster (N7 not started), cross-generation ranking. | 5 |
| 5 | **The war vs Dominators** (machine invaders take systems; liberation ops; military coordination; boss brains) | **HAVE** — HEGEMON escalation tiers Drone→Cruiser→Warlord (M1), contested/liberated systems, coalition defenders scrambled (M2), warScore tug-of-war + campaign win/lose (M7), Stronghold boss + `assault` (M12), `war`/`warmap` readouts. MISSING: named persistent boss minds; Hegemon does not adapt across campaigns. | 5 |
| 6 | **Planet screens** (land → hangar / equipment / shop / government / news tabs) | **MISSING as a UI surface** — all the underlying services exist as terminal commands + a compact market side-panel: `market/buy/sell/refuel` (shop), `outfit/install/weapon/upgrade` (equipment), `hull/repair/blackmarket` at base (hangar), `contracts/rank/rep` (government), NEWS ticker events. No dock screen with tabs. | 4 |
| 7 | **Text quests** (interactive-fiction missions from governments; SR2's signature) | **MISSING as an engine** — adjacent assets exist and are unusually strong: 19-chapter original novel + `novel_graph.json` triples + 0-fab grounded `ask`/`story`/`discuss` machinery. No branching quest scenes/choices/skill-checks/rewards. | 5 |
| 8 | **Ground battles** (SR2: robot-RTS planetary battles) | **HAVE-partial (deliberate analog)** — AWAY module (line ~2810): `land` → walk a 3D settlement on foot → hostiles hunt you → **turn-based 8×8 grid tactics on the REAL Tami rules** (C# sidecar :7877 > WASM C# > legacy JS tiers). Turn-based instead of RTS by design (Tami tie-in). MISSING: objectives beyond skirmish (capture/defend), terrain, deployment. | 5 |
| 9 | **Salvage** (loot floats after kills: goods, equipment, protoplasm/nodes) | **HAVE** — death drops full credits as a persistent stash; cargo pods eject + salvage; derelict encounters (40% artifact); flyover pickup; asteroid mining → gems. | 4 |
| 10 | **Artifacts** (unique passive-power items) | **HAVE-partial** — 5 artifacts w/ passives (M6), tier-scaled drops from Hegemon wrecks, `artifacts` list/equip. MISSING: identification/analysis, set effects, larger roster, quest-sourced uniques. | 4 |
| 11 | **Reputation** (per-race/per-government standing; criminal record; medals) | **HAVE** — per-planet rep spreading across system factions; gates prices + docking; kills/liberations raise, bombing tanks (M2); customs record via contraband scans; `rep`/`standing` readout. MISSING: medals/decorations, per-faction storyline consequences. | 5 |
| 12 | **Dynamic news** (galaxy feed reporting real events: invasions, prices, ranger deeds) | **HAVE-partial** — NEWS shocks (shortage/glut, stock-only so prices stay organic, M11) + event ticker + war banners. MISSING: a browsable, persistent news TIMELINE derived from the live war/society state (invasions, liberations, deaths, epoch die-offs). | 4 |
| 13 | **Ship equipment slots** (hull w/ slot/weight budget, 5 weapon mounts, engine/tank/radar/scanner/droid/grippers; micromodules) | **HAVE-partial** — 4 hull classes (M9), 3 weapon types (M3), EQUIP stack upgrades (cargo/fuel/scanner/hyperdrive/repair-droid), `upgrade weapon|engine|hull`. MISSING: slot-based inventory (mount/unmount/sell individual items), weight budget, micromodule-style item mods. | 3 |
| 14 | **Stations** (science/medical/business/military/pirate/ranger bases as distinct dockables) | **HAVE-partial** — one Ranger Command star base (M8: repair/hull-swap/black-market). MISSING: the other station classes (science = artifact analysis, military = joint ops, pirate = criminal lane). | 3 |
| 15 | **Protoplasm / Dominator evolution economy** (invader drops as currency; the enemy adapts via its own "program" updates) | **MISSING** — artifacts drop, but no Hegemon-specific salvage currency and **no enemy adaptation across campaigns**. Our unique angle: reuse the bench's genetic machinery (mutation + selection, N6) so the Hegemon EVOLVES against the player's observed tactics. | 5 |
| 16 | **Save / persistent galaxy** (a living galaxy you leave and return to) | **MISSING for game state** — knowledge store + Inhabitant state DO persist (localStorage autosave, `inhabitant` readout), but credits/rank/rep/war/campaign/epoch reset on every reload. Blocks generations (N6) and any "my galaxy" attachment. | 5 |
| 17 | **Player skills** (Accuracy/Maneuverability/Tech/Trade/Charisma/Leadership grown over a career) | **MISSING** — rank gates gear but no skill points; AI pilots DO learn (nav gain, ray weights, discovery) — the player has no equivalent progression. | 3 |
| 18 | **Black-hole arcade battles** (minigame → artifact rewards) | **MISSING** — and a poor fit; our real-space combat + away battles already cover "risk pocket → reward". Not planned. | 1 |
| 19 | **Pirate career lane** (be the criminal: raids, bribes, amnesty) | **HAVE-partial** — contraband buy/fence, customs fines, `bombard` with rep consequences make hostility *possible*; no career support (pirate rep lane, bribes, amnesty, pirate base). | 3 |
| 20 | **Time model** (real-time-with-pause, day granularity, aging galaxy) | **HAVE-partial (different)** — continuous real-time sim, no pause-and-order layer, no calendar. Epoch clock (N6) will be our calendar analog. | 2 |

---

# 20 MILESTONES

Sizes: S (≤half a session) · M (a session) · L (multi-session / a wave lane).
**SR-M1..SR-M8 = THIS WAVE (LANDING).** Acceptance criteria are the measurable gate — no green, no landed.

## THIS WAVE — LANDING

- **SR-M1 · Starmap overlay + territory + generation-persist** — full-screen galaxy map (command + key toggle) shading every system/planet by control state (free/contested/Hegemon, front bar, player + base markers), AND a save/load layer so credits/rank/rep/war/campaign/epoch survive a page reload.
  *Accept:* reload mid-campaign → same credits/rank/rep/warScore/campaign restored (verified by scripted before/after diff); starmap territory matches `warmap` state live. **Size L · depends: —**
- **SR-M2 · Ground capture-the-flag + defenses + infra** — away-mission surfaces on contested/hostile worlds gain an objective: a control uplink to capture, guarded by defense posts + patrols; capturing flips the planet's surface-control flag, pays rep/warScore, and persists; friendly worlds show the infra you've secured.
  *Accept:* land on a contested world → defeat the uplink guard battle → capture registers (surface flag + rep + warScore move) and survives reload (needs SR-M1); a second landing shows the held uplink. **Size L · depends: SR-M1**
- **SR-M3 · Rank-gated ranger missions** — contracts board gains RANGER MISSIONS locked by rank tier (e.g. Veteran+ stronghold recon, Ace+ liberation op) with outsized pay/rep; locked rows render with the required rank.
  *Accept:* at Recruit the gated mission lists LOCKED and accept refuses with the rank named; after a driven rank-up the same mission accepts and completes via its hook. **Size S · depends: —**
- **SR-M4 · SR planet screen** — docking opens a full-screen planet screen with five tabs mirroring SR2: HANGAR (repair/hull), EQUIPMENT (outfit/install/weapon), MARKET (embeds SR-M7 table), GOVERNMENT (contracts/rank/rep), NEWS (event feed). Terminal commands remain as aliases; ESC returns to space.
  *Accept:* every dock-only action currently possible via terminal is achievable by clicks alone in one docked session (checklist run); 0 console errors. **Size L · depends: SR-M7**
- **SR-M5 · Real FBX ship/asteroid/gem models** — replace procedural cylinder/cone ships (`makeShip`, line ~333), icosahedron rocks and gem sprites with loaded model assets (FBX/GLTF, reusing the Unity Starfighter2 art line), per-team materials, LOD/instancing where needed.
  *Accept:* page loads with 0 console errors; ships/asteroids/gems visibly render from model files (asset requests observable); ≥50 fps at MAX_SHIPS in the standard scripted flight. **Size M · depends: —**
- **SR-M6 · Unique per-weapon projectiles** — energy/ballistic/missile get distinct projectile meshes, trails, muzzle + impact FX and sounds (bolt vs tracer vs smoke-trail seeker) instead of shared bullets.
  *Accept:* a blind 3-screenshot test distinguishes all three weapon types; seekers render a homing trail; per-type impact FX fire. **Size S · depends: SR-M5**
- **SR-M7 · Market table view** — upgrade the compact market panel into an interactive SR-style trade table for the DOCKED planet: rows=goods with buy/sell price, stock, your cargo, profit-vs-best-known-route hint; click-to-trade with quantity. Honest-economy rule kept: remote/unvisited planets show last-OBSERVED prices or “?”, never live omniscient reads (P4 law).
  *Accept:* click-trades produce identical results to the terminal `buy`/`sell`; an unvisited planet's cell shows “?”; table refreshes live as stock moves. **Size M · depends: —**
- **SR-M8 · 50-AI ramp** — grow the living population toward 50 pilots (N7): roster from `novel/characters.json`, tick sharding for the Inhabitant chassis, collision broadphase, speech-queue rate caps.
  *Accept:* 50 alive pilots for a 5-minute scripted run with typical frame time <16ms (measured histogram), bounded speech queue, 0 console errors. **Size L · depends: —**

## FUTURE

- **SR-M9 · Text-quest engine (novel-gen powered)** — data-driven branching text quests (scenes, choices, stat/skill checks, rewards) offered at the GOVERNMENT tab, authored by our novel pipeline and canon-audited; every named entity must exist in `novel_graph.json` (0-fab).
  *Accept:* ≥3 completable quests of ≥8 nodes; entity spot-probe 20/20 grounds in the graph; rewards pay via existing hooks. **Size L · depends: SR-M4**
- **SR-M10 · Government + news from live war state** — GOVERNMENT issues edicts/missions from the ACTUAL faction/war state; NEWS becomes a persistent, browsable galaxy timeline (invasions, liberations, shocks, ranger deaths, epoch die-offs).
  *Accept:* 20/20 sampled news items trace to real logged events; a system flipping contested changes its government's mission list within one refill cycle. **Size M · depends: SR-M1, SR-M4**
- **SR-M11 · Planetary battles upgrade (RTS analog → Tami tactics campaign)** — bigger away maps (≥12×12), terrain tiles with movement cost/blocking/height (the Tami bring-over below), a deployment phase (pick party from a roster), and liberation OPERATIONS = 2–3 linked battles that flip a Hegemon-held world.
  *Accept:* one full liberation op playable; terrain measurably alters reachable tiles; deployment choice changes the fielded party. **Size L · depends: SR-M2**
- **SR-M12 · Equipment slots + artifact expansion** — slot-based ship fit (weapons ×2, engine, shield, scanner, hold, droid, artifact ×2) with an inventory (mount/unmount/sell), ≥12 artifacts incl. set bonuses, all in the HANGAR/EQUIPMENT tabs.
  *Accept:* un/mount shows live stat deltas; selling returns depreciated credits; a 2-piece set bonus provably activates. **Size M · depends: SR-M4**
- **SR-M13 · Dynamic economy shocks 2.0 (war-coupled)** — blockades on contested lanes, refugee demand spikes, post-liberation booms, embargoes at hostile-rep worlds — all stock/flow-side only (prices stay emergent, never written).
  *Accept:* liberation produces a measurable price trajectory vs a control campaign (logged A/B); grep-level audit confirms no direct price writes. **Size M · depends: SR-M10**
- **SR-M14 · Ranger leaderboard across generations** — persistent cross-epoch leaderboard of ALL pilots (player included) by score/wealth/thought-fitness, with lineage view (N6) at Ranger Command + starmap screen.
  *Accept:* leaderboard survives reload + one full epoch; every row traces to logged fitness; the player appears ranked among AI rangers. **Size M · depends: SR-M1, SR-M8**
- **SR-M15 · Hegemon evolution (Dominator/protoplasm analog)** — Hegemon wrecks drop CORES (invader salvage currency spent at base/science); the Hegemon ADAPTS across campaigns via the bench's genetic machinery — mutation + selection on its loadout/tactic parameters against observed player behavior.
  *Accept:* after 3 campaigns the Hegemon loadout distribution measurably shifts vs the player's dominant weapon; a no-selection control campaign shows no shift (the N6 audit pattern). **Size L · depends: SR-M14**
- **SR-M16 · Multi-system galaxy + jump lanes** — grow 3 → 8+ systems as separated bubbles joined by jump gates/hyperlanes (fuel-gated fast travel — SR jumps reintroduced without breaking the balance reason they were removed); starmap shows lanes; war spreads along them.
  *Accept:* a jump consumes fuel + transit time and is lane-constrained; a contested system infects lane-adjacent systems first (logged spread). **Size L · depends: SR-M1**
- **SR-M17 · Pilot skill career** — SR-style player skills (gunnery/handling/tech/trade/charisma/leadership analogs) bought with rank points, each with a measurable effect; AI pilots allocate the same points (fed by their learned stats).
  *Accept:* each skill point produces its documented measured delta (e.g. trade → % better prices); an AI pilot's allocation visibly differs by temperament. **Size M · depends: SR-M3**
- **SR-M18 · Bars, rumors + wingmen** — planet-screen BAR tab where docked AI pilots hang out and talk (novel-grounded); rumors are verified pointers to real live state (signals, contracts, war intel — 0-fab); hire a wingman who follows and fights.
  *Accept:* 20/20 rumor claims verify against live state; a hired wingman escorts + engages and costs upkeep. **Size M · depends: SR-M4, SR-M8**
- **SR-M19 · Science stations + probes** — a science base that IDENTIFIES artifacts (unidentified until analyzed) and upgrades them for CORES; planetary probes that yield minerals over time; both persist.
  *Accept:* an unidentified artifact refuses to equip until analyzed; a deployed probe pays out across reloads. **Size M · depends: SR-M12, SR-M1**
- **SR-M20 · Campaign scoring + New Game+** — SR2-style end-of-campaign SCORE (war contribution, wealth, rank, quests, discoveries) with a ceremony at Ranger Command; New Game+ starts the next generation carrying lineage (N6 offspring params + leaderboard history).
  *Accept:* score formula documented + rendered on campaign end; NG+ demonstrably inherits lineage parameters; the leaderboard records the finished run. **Size S · depends: SR-M14**

---

# TAMI 2D TOPDOWN BRING-OVER

Which Tami battle-presentation requirements apply to our AWAY battles, with honest current status.
Away module = `starfighter.html` lines ~2810–3235 (`AWAY` IIFE): ground walk → 8×8 turn-based grid;
battle math tiers: **C# sidecar :7877** (real TamiRules) > **WASM C#** > legacy JS stand-in.
Data: `tami_data.json` (baked by `bake_tami_data.js` — species/techniques/strikes/afflictions/18×18 matrix).

Caveat: `BattleRequirements.txt` is explicitly NOT gospel (see its Wave-47 notice) — authoritative pair is
`TamiRequirements.txt` + the GDrive sheet cache. Items below cite BattleReq lines as the *presentation* index.

- [ ] **Turn order UI** (R3.2 order-by-Agility, line 53; R9.3 upcoming-turns visible, line 129)
  — **HAVE-partial**: away sorts `order[]` by speed each round and marks the current unit `▶` in the roster panel (legacy `nextTurn` ~2952; core mode renders `st.current` ~3099). **MISSING**: a forecast strip of the NEXT N turns (R9.3) — the thing that makes Agility investment legible.
  Pointers: away UI `drawBattleUI` ~2999 / `drawCoreUI` ~3095; Tami reference = turn-order display in the battle HUD (GameManager.NextTurn drives it; REQ-AFFLICT-01 line 110 makes stun tick on EVERY unit-turn, so the strip must re-derive per turn, not per round).
- [ ] **Technique panel — flavour TOP + mechanics BOTTOM** (memory `project_tami_technique_panel_flavour`: TechniqueDB.Flavour.cs; TechniqueInfoPanel; desc auto-size 14–22 per the overflow fix)
  — **MISSING**: away technique buttons show only name/element/AP/range (`drawCoreUI` ~3108–3110; legacy TECHS table ~2908). No flavour line, no mechanics detail (power, hit rate, effect chance/duration, cooldown — ALL already baked per-technique in `tami_data.json`, see `bake_tami_data.js` ~109–118). **Gap in the bake: no flavour field** — the sheet gained a flavour column 2026-07-07; bake must add it before the panel can show flavour-top/mechanics-bottom.
- [ ] **Type-matchup display / combat preview** (R9.2 hit/crit/damage preview BEFORE acting, line 128; 18 elements + 4 immunities, lines 151–154 + 200–204)
  — **HAVE-partial**: matchup surfaces only POST-HOC in colored log lines (super effective/resisted/crit/miss, `coreLogLine` ~3083) and the demo driver picks by `TAMIDATA.matrix` internally (~3163). **MISSING**: pre-action preview on target hover (est. damage, hit %, crit %, effectiveness arrow) — the sidecar/wasm damage model + `hit_formula` in `tami_data.json` supply everything needed; immunities (0×) must render distinctly.
- [ ] **HP / affliction chips** (R8.2 afflictions incl. stacks-to-3, lines 100–108; REQ-AFFLICT-01/02 tick cadence + durations, 110–124; REQ-UI-04 single chip pool + “+N more” overflow, line 165; REQ-UI-CHIPROWS top-2/bottom-4 rows, line 181)
  — **HAVE-partial**: text HP bars + numbers per unit; legacy shows affliction initials, core mode shows name+turns inline (~3098–3099); afflictions actually tick (Burn/Poison/Stun, legacy ~2956; core = real rules). **MISSING**: chip-style per-unit surface (stack counts ×3, turns-remaining per chip, overflow “+N”), and any in-3D HP/affliction readout over units (only name labels float, ~2945).
- [ ] **Terrain tiles** (R2.3 type/cost/blocking/height, line 47; REQ-TILE-01 configurable highlight palettes, line 174; REQ-TILE-02 ridge visible only on flying-unit turns, line 175; sand-cost exemption, lines 215–216; movement types Aquatic/Flying/Spectral, line 149)
  — **MISSING**: away grid is a flat checkerboard (`buildBattle*` ~2936, ~3057) — no terrain types, costs, blocking, or height. **HAVE-partial** on highlights only: green move-range + red attack-range tile tinting (`paintTiles` ~2948, `corePaintTiles` ~3076) ≈ a fixed single palette of REQ-TILE-01.
- [ ] **Unit inspect surface** (REQ-UI-04 UnitInfoPanel single inspect surface, line 165; REQ-UI-07 sticky UnitCard, line 168; R9.1 inspect units/terrain/turn order, line 127)
  — **MISSING**: no hover/click inspect of a unit's stats/types/techniques in-battle; core state already carries level/types/AP/techs per unit (~3099).
- [ ] **AP resource display** (R7.2 AP start/max/regen, basic strike restores, line 93)
  — **HAVE (core tier)**: AP shown per unit + AP costs on tech buttons + strike shows +AP (~3099–3111). Legacy tier substitutes cooldowns (honest stand-in, labeled).
- [ ] **Deployment** (TAMI-SPECIFIC: 5 active from 8 roster, deployment tiles, line 148)
  — **MISSING**: fixed 3-unit party vs 2–3 foes (`party()`/`foeParty()` ~2920–2928; core roster from sidecar). Becomes SR-M11's deployment phase.
- [ ] **AOE techniques** (TAMI-SPECIFIC: inner auto-hit, perimeter dodges, line 150; R4.2.2)
  — **MISSING**: away battles are single-target only; `aoe` field is already baked per technique in `tami_data.json`.
- [ ] **Victory / defeat / unit replacement** (R10, lines 131–136)
  — **HAVE-partial**: victory/defeat/two-click retreat + credit spoils (~3007, ~3103, `retreatBattle` ~3029). **MISSING**: unit replacement from roster (R10.4), XP/bond post-battle (R10.5) — away rewards are credits-only.
- [ ] **Combat cinematic spacing** (REQ-CIN-01 distance-scaled combat screen, line 178)
  — **MISSING / probably N/A**: away resolves on-grid with no cutscene layer; only worth porting if we ever add a strike-zoom presentation. Lowest priority of this list.

---

*Maintenance: when a LANDING milestone ships, move its row's status in the burndown table (and keep the
acceptance evidence — screenshot/log path — next to the milestone line). This file is the SR-layer
counterpart of `SR2_MILESTONES.md` (space combat layer) and `NOVEL_SOCIETY.md` (society layer).*
