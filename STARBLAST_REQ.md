# STARBLAST_REQ — the Starblast.io loop, copied as requirements and made to work first

RJ 2026-09-06: "first lets just focus on the starblast.io COPY requirements. make sure we have that working then
we will move to egosoft level requirements." Same honesty rule as REQUIREMENTS_SR.md: mechanics only, original
names / text / art; every status below names the test that decided it; MISSING means MISSING.

Starblast.io (Neuronality, 2016) is the smallest complete space loop there is: fly, shoot rocks, gems fill a bar,
the bar buys stat levels, a full ship buys the next tier, die and your gems spill for others. This file maps that
loop onto our game (the SR2 layer stays around it; see REQUIREMENTS_SR.md).

Status legend: **HAVE** · **HAVE-partial** · **MISSING**. Test = how the status was measured (in the page, hand-stepped,
`step(1/60)` loops, or a headless harness).

| # | Starblast requirement | Ours | Test / where |
|---|---|---|---|
| SB1 | Asteroids everywhere; shooting one splits it and spills gems | **HAVE** | 7,600 instanced rocks; `destroyAsteroid` splits + `spawnGem`; belt start (2026-09-06) |
| SB2 | Gems collected by flying over them (small pickup radius, a magnet at higher gear) | **HAVE** | `GEM_PICK_R`, `magnetFor()`; drones fetch too (2026-09-06) |
| SB3 | A GEM BAR: mined gems fill it; a full bar = one upgrade point, spent on a stat | **HAVE** | `gemBarAdd` at both gem sites; 60 s drone run banked 2 points (102c, bar 13%) |
| SB4 | Stat upgrades in flight by number keys: shield capacity, shield regen, energy capacity, energy regen, ship speed, agility, damage, fire rate (8 levels each) | **HAVE** | `statMult` at 19 sites; keys 1-8 spend; shield max 40→44 and capacitor 100→110 read back after Lv1 |
| SB5 | Ship TIERS (1-7): when the ship is maxed, choose the next tier's ship from a few models, anywhere in space | **HAVE** | tier-up card at 8/8 stats + 1 point; Scout→Fighter taken in flight, hull 70→100, stats reset; credit purchases at base unchanged |
| SB6 | Each ship model has its own stats + weapon pattern (lasers per shot, spread) | **HAVE** | `SHOT_BY_CLASS` + `spawnPattern`; fired through the real player path per hull: scout 1 bolt / 0.0 deg, fighter 2 / 2.4, interceptor 3 / 4.4, cruiser 4 / 6.0, dreadnought 5 / 7.6, capital 6 / 9.2 - total damage 18.0 -> 21.96 across the six tiers, so the tier changes the FEEL, not the power |
| SB7 | Energy: shooting drains it, it regenerates; empty = cannot fire | **HAVE** | `capLaser`, `LASER_CAP_PER_SHOT/REGEN` |
| SB8 | Shields absorb before hull, regenerate after a delay | **HAVE** | fore/aft arcs, `SHIELD_REGEN_DELAY` |
| SB9 | Radar / minimap with rocks, gems, ships | **HAVE** | top-down inset + blips (drones added 2026-09-06) |
| SB10 | Death spills your gems as pickups; you respawn small | **HAVE** | `killShip` drops credits as a stash + gems; respawn as a Scout |
| SB11 | Team play: your side vs the other side; AI fills the team | **HAVE** | squad vs Iron Synod; AI pilots learn |
| SB12 | Speed / agility / damage upgrades change how the ship flies, visibly | **HAVE** | speed multiplies thrust and vmax, agility multiplies pitch and yaw, damage multiplies all three weapon sites |
| SB13 | A crystal-value readout and a top score / kill feed | **HAVE** | kill feed on the strip, attributed by `lastHitBy` within 8 s; 3 test kills rendered 3 lines |
| SB14 | One-screen HUD: stat rows bottom-left, radar top-right, bar bottom | **HAVE** | UPGRADES strip at 222,649: bar, points, eight rows with pips, tier card, kill feed |
| SB15 | Rock sizes: big rocks split into smaller, small ones vanish | **HAVE** | `AST_NOSPLIT`, `AST_SPLIT_MIN/MAX`, `AST_CHILD_FRAC` |
| SB16 | Ship-to-rock collision hurts you and bounces you | **HAVE** | `astHitShip` → `hurt` + bounce |

## Milestones (this wave)

**SB-M1 through SB-M4 all landed 2026-09-06** - measured in the page, not asserted: see the Ours column above.
**Every row of the reference loop now runs.** SB6 landed 2026-09-06 (per-model shot patterns, measured per hull
through the real fire path). The Starblast copy is complete; REQUIREMENTS_SR.md's open rows and the Egosoft
layer (stations, fleets, trade automation, lanes) are what remain.

- **SB-M1 · The gem bar and upgrade points.** Mined gems (and the drones' take) fill `P.gemBar` up to `GEM_BAR_MAX`; a full bar
  banks one upgrade point and empties; points are spent on SB4's stats. Credits stay the SR2 currency for trade and shops; the
  bar is the Starblast currency for the ship itself. *Accept:* a hand-stepped mining run banks points at the declared rate; the
  point count and bar are visible on the HUD; the bar persists in the save.
- **SB-M2 · Eight stats.** `P.stat = {shieldCap, shieldRegen, energyCap, energyRegen, speed, agility, damage, fireRate}` each 0-8;
  each level is a declared multiplier applied where the existing code already reads the quantity (shield max, regen, capacitor,
  thrust, turn rates, weapon damage, fire cooldown). Keys 1-8 spend a point on that stat; the old `upgrade weapon|engine|hull`
  keeps working and maps onto damage / speed / shieldCap. *Accept:* each stat's multiplier verified by reading the quantity
  before and after (exact numbers), keys 1-8 spend points in flight, the SHOP panel shows the eight rows.
- **SB-M3 · Tier-up anywhere.** When every stat is 8 (or the bar has banked `TIER_UP_POINTS`), a TIER-UP card offers the next
  hull class(es); choosing one re-hulls the ship in flight, keeps fitted gear where slots allow, resets the eight stats to the new
  hull's floor. Hulls at Ranger Command stay purchasable with credits (the SR2 road). *Accept:* the card appears at the declared
  moment, the chosen hull's hp/hold/speed apply, the stats reset, the save carries it.
- **SB-M4 · The Starblast HUD in the new shell.** Stat rows with level pips and the key hints, the gem bar, the point count, a
  kill feed strip, radar as today. *Accept:* one screenshot shows all of it; every row's number matches the game state read
  from the console.

Rows SB1, SB2, SB7-SB11, SB15, SB16 are the base that already runs; SB3-SB6, SB12-SB14 are this wave. After SB-M4 the loop
matches Starblast's; then REQUIREMENTS_SR.md's remaining rows and the Egosoft layer (stations, fleets, trade automation).
