# Starblast.io — the whole loop, as use-case stories

Written 2026-09-07 under the **AutobotSandwich** discipline: every line below either cites a
`file:line` you can open, or is marked `NOT BUILT`. Nothing here is asserted from memory of the game.
Verify the whole file with:

```
py .opus-tools/autobot/doc_verify.py D:/code/starfighter/STARBLAST_USE_CASES.md
```

Status vocabulary: **HAVE** (built, cited) · **PARTIAL** (built, but the story is not fully true) ·
**NOT BUILT** (absent, and that is a claim about absence, not a shrug).
`effort` is the cost to close the gap — S is under an hour, M is a session, L is more than a session.

---

## EPIC SB-E1 — The mining loop
### *"You fly a small ship at some rocks. You shoot one, it breaks, and the pieces are worth something. You scoop them up and the bar at the bottom fills. When it fills, you are owed something."*

This is the entire first two minutes of Starblast and the reason anyone plays a second round. Every
sub-case below is a beat in that sentence, in order.

| | story | status | where |
|---|---|---|---|
| **SB-1.1** | Pilot shoots a rock and it splits, spilling gems | HAVE | `index.html:1316` `destroyAsteroid` |
| **SB-1.2** | Gems spawn as physical pickups in the world | HAVE | `index.html:1354` `spawnGem` |
| **SB-1.3** | Flying over a gem collects it; a magnet widens the reach as you upgrade | HAVE | `index.html:2764` `magnetFor` |
| **SB-1.4** | Collected gems fill a bar; a full bar banks one upgrade point | HAVE | `index.html:451` `GEM_BAR_MAX`, `index.html:324` `gemBar` |
| **SB-1.5** | The bar is visible while flying, not buried in a menu | HAVE | `sbhud.js` — the Starblast HUD strip |

**The one thing that is wrong here:** nothing. This epic is whole.

---

## EPIC SB-E2 — Spend the point, or save for the ship
### *"You have a point. You can put it into your guns, your shields, or your engines and get a little better right now. Or you can hold out, max everything, and trade the whole ship in for a bigger one — and lose every upgrade you bought. That is the only real decision in the game."*

**This is the epic RJ says is not working, and he is right — but not because it is broken.**
Every mechanic below is built and works. The decision does not exist because the price of the second
half is out of reach.

| | story | status | where |
|---|---|---|---|
| **SB-2.1** | Pilot spends a point on one of eight stats, in flight, with keys 1-8 | HAVE | `index.html:2217` `spendStat` |
| **SB-2.2** | Each stat visibly changes how the ship performs | HAVE | `index.html:1620` `statMult` |
| **SB-2.3** | When the ship is maxed, a next-tier hull is offered | HAVE | `index.html:2211` `tierUpReady` |
| **SB-2.4** | Taking the new hull resets every stat to zero — you trade progress for a bigger frame | HAVE | `index.html:2225` `takeTierUp` |
| **SB-2.5** | There is a ladder of hulls to climb | HAVE | `index.html:2208` `HULL_ORDER_ORIGINAL` — 7 tiers, scout → capital |
| **SB-2.6** | The tier-up is reachable in a normal session | **PARTIAL** | measured: the gate is `statsMaxed && gemPts>=1` (`index.html:2211`) = 8 stats × 8 levels + 1 = **65 points × 48 gems = 3,120 gems ≈ 19 minutes**. Starblast tiers you in one to two. effort **S** — it is a constant, not a rewrite |
| **SB-2.7** | Choosing a hull is a ONE-WAY branch you cannot walk back | **NOT BUILT** | `HULL_ORDER_ORIGINAL` is a single LINE, not a tree. There is one successor per tier, so there is no branch to commit to and nothing to regret. effort **M** |
| **SB-2.8** | At each tier you pick between several models, not one | **NOT BUILT** | `index.html:2209` `nextTierHull` returns exactly `HULL_ORDER_ORIGINAL[i+1]`. effort **M**, and it is the prerequisite for SB-2.7 |

**The story RJ told, against what is built:** *"you could upgrade the hull itself which is
strategically better"* — true, SB-2.3/2.4 are real. *"different ship types have different hulls"* —
**not true yet**: one successor per tier (SB-2.8). *"once you move down an upgrade path you can't go
back"* — **there is no path to be on**: a single line has no branches (SB-2.7). And the choice never
arises anyway, because SB-2.6 puts it 19 minutes away.

**Close these three in this order and the epic becomes real: SB-2.6 (S), SB-2.8 (M), SB-2.7 (M).**

---

## EPIC SB-E3 — The fight
### *"Your gun costs energy, so you cannot hold the trigger forever. Your shields soak the first hits and come back if you break away. Everything on the field is trying the same thing."*

| | story | status | where |
|---|---|---|---|
| **SB-3.1** | Firing drains an energy pool; empty means you cannot fire | HAVE | `index.html:1663` `capLaser` |
| **SB-3.2** | Shields absorb before hull and regenerate after a delay | HAVE | `index.html:1639` `drainShield`, `index.html:1621` `shieldArcMaxFor` |
| **SB-3.3** | Each hull model has its own weapon pattern | HAVE | `index.html:1605` `WEAPONS` |
| **SB-3.4** | Death spills your gems for anyone to take, and you respawn small | HAVE | `index.html:583` `killByShip` |
| **SB-3.5** | A radar shows rocks, gems and ships around you | HAVE | `index.html:5330` `updateBlips` |

---

## EPIC SB-E4 — The other players
### *"Everyone else is doing exactly this, at the same time, and some of them want your gems."*

RJ: *"right now we're not really worried about the competition part."* Recorded so the list is
complete, and deliberately last.

| | story | status | where |
|---|---|---|---|
| **SB-4.1** | Teams: your side against the other, AI filling the ranks | HAVE | `index.html:583` `killByShip` team handling; ships carry `team` |
| **SB-4.2** | Real humans share the world in real time | **NOT BUILT** | genre matrix `F40`, grep-proven absent + guarded. effort **L** |
| **SB-4.3** | Co-operate or fight with other humans | **NOT BUILT** | genre matrix `F56`, grep-proven absent + guarded. effort **L** |

---

## What to do first, cheapest to dearest

The list is written easiest-first on purpose — RJ asked for the easy ones first, and the cheapest
item here is also the one that unlocks the game's only real decision.

1. **SB-2.6** — effort **S**. One constant. Brings the tier-up from ~19 minutes to the one-to-two
   the parent game runs at, which makes SB-E2 a live choice instead of a distant one.
2. **SB-2.8** — effort **M**. Several models per tier. Nothing to choose between until this exists.
3. **SB-2.7** — effort **M**, and only meaningful after SB-2.8. Once a tier offers a real fork,
   taking one is a commitment, which is the strategy RJ is describing.
4. **SB-4.2 / SB-4.3** — effort **L**, and explicitly not wanted yet.

Everything else in this file is built and cited.
