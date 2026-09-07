# Star Fighter - upgrade report

Generated 2026-09-07 04:39 by `py tools/upgrade_pass.py`. Every number here is produced by a tool in
this repo; nothing is typed in by hand, so a stale figure shows up as a failed pass
rather than as a confident wrong number.

## Where the game stands

| measure | value | what it does and does not tell you |
|---|---|---|
| use cases WORKS / PARTLY / MISSING / DEPRECATED | 49 / 1 / 0 / 1 | Work RECORDED, not work outstanding. A row is only ever added after the feature is built, so this can never show a gap. |
| modules in the class model | 55 | Regex-extracted from source. A module that exposes its API through a parameter alias instead of `window.NAME` is invisible to it. |
| genre capabilities surveyed | 70 across 8 games | The missing denominator: what published space games do, whether or not we do it. |
| genre cells decided / grounded with a source | 537 of 560 decided, 274 grounded | `unknown` is kept as `unknown`. Ungrounded cells are recall and are counted apart from evidence. |
| ours: yes / partial / no / unknown | 49 / 9 / 12 / 0 | Against the genre list, not against our own use cases. |

## The live list (TASKS.md)

85 done · 4 open · 1 blocked · 1 dropped with a reason

- open **N3** Cut what a first-time player is shown at once
- open **F58** A guided opening that teaches the basics
- open **F31** An authored main storyline with scripted missions
- open **F60** Pick a difficulty or starting scenario before playing
- BLOCKED **M1** **"Music OFF by default" (commit 1abbd66) does not actually silence all music - the F67 ad

## Genre gaps, ranked by anchor count

Anchor count is how many of the 8 surveyed games have the capability. It is the
ranking key on purpose: a thing six independent games all do is a genre expectation,
and a thing one game does is that game's idea. Nothing here is a probability.

```
ANCHOR RANK - candidate features by how many of 8 genre games have them
matrix generated 2026-09-06 | games: starblast, x_series, space_rangers_2, elite_dangerous, freelancer, eve_online, ftl, ev_nova

Ranking key is ANCHOR COUNT (independent games with the capability).
`grounded` = cells backed by a real source URL; the rest are recall and are
counted separately rather than rounded up into evidence. No number here is a
probability - see the module docstring for why that line is not crossed.

== GAPS - the genre has it, we do not (or only partly) ==
id    anch grounded ours        capability
F58   8/8  7/8      partial     a guided tutorial or scripted opening teaches the basics
F31   7/8  8/8      partial UC-212 there is an authored main storyline with scripted missions
F35   6/8  2/8      partial     missions can fail and the failure has a lasting consequence
F60   5/7  5/7      no          the player picks a difficulty or starting scenario before playing
F44   5/8  2/8      no UC-304   there is an in-system fast-travel layer distinct from combat flight
F41   4/8  8/8      partial UC-218 the playable galaxy is procedurally generated rather than hand-authored
F40   4/8  6/8      no          the world is shared in real time with many other human players
F56   4/8  6/8      no          player can cooperate or fight with other human players
F06   4/8  5/8      no          player can target and disable individual subsystems on an enemy ship
F09   4/8  5/8      partial     flight is full 3D with pitch, yaw and roll rather than a fixed plane
F17   4/8  4/8      partial UC-217 player unlocks new technology through research over time
F68   3/7  6/7      no          the game supports a gamepad
F34   3/6  4/6      partial     attacking one faction raises standing with its rival
F69   3/7  4/7      no          the game offers colourblind or other accessibility options
F66   3/8  4/8      partial UC-506 NPC dialogue is voiced
F45   3/8  3/8      partial UC-203 player can discover unvisited systems and record or sell the data
F10   2/8  3/8      no          player manages internal crew and damage control aboard their own ship
F29   2/8  3/8      no          player can capture an enemy ship and keep it
F08   2/8  2/8      no          player can pause or slow time in combat to issue orders
F48   1/8  4/8      no UC-108   player death ends the run permanently   <- single-game idea, weak anchor

== UNRESOLVED - not enough evidence to place these either way (0) ==
These are NOT low-priority. They are unmeasured. Settling one is its own task.

== ALREADY HAVE (49) ==
  F02   7/8   -  ship movement carries momentum or inertia rather than instant-stop arcade handling
  F07   7/8   UC-101  player can mine asteroids or resource nodes for sellable material
  F12   7/8   UC-107  player advances mainly by buying larger hull classes rather than levelling one hull
  F14   7/8   UC-206  player fits modular equipment into a limited number of slots or hardpoints
  F20   7/8   -  cargo is limited by a hold capacity the player can enlarge
  F42   7/8   UC-211  player picks a destination on a star map and travels between systems
  F52   7/8   UC-108  destroyed ships and cargo drop physical loot that anyone can collect
  F61   7/8   UC-109  a radar or scanner shows nearby objects around the ship
  F67   7/7   -  music changes with the situation, for example combat versus travel
  F01   6/8   UC-101  player directly pilots a single ship in real time
  ... and 39 more
```

## Ready-to-take task lines

Paste into TASKS.md and give each one an observable before starting it.

```
## Genre gaps (anchor-ranked, auto-generated - see genre/anchor_rank.py)

- [ ] F58  a guided tutorial or scripted opening teaches the basics -> DONE WHEN: <observable>   <!-- anchor 8/8 games, 7 grounded; ours=partial  -->
- [ ] F31  there is an authored main storyline with scripted missions -> DONE WHEN: <observable>   <!-- anchor 7/8 games, 8 grounded; ours=partial UC-212 -->
- [ ] F35  missions can fail and the failure has a lasting consequence -> DONE WHEN: <observable>   <!-- anchor 6/8 games, 2 grounded; ours=partial  -->
- [ ] F60  the player picks a difficulty or starting scenario before playing -> DONE WHEN: <observable>   <!-- anchor 5/7 games, 5 grounded; ours=no  -->
- [ ] F44  there is an in-system fast-travel layer distinct from combat flight -> DONE WHEN: <observable>   <!-- anchor 5/8 games, 2 grounded; ours=no UC-304 -->
- [ ] F41  the playable galaxy is procedurally generated rather than hand-authored -> DONE WHEN: <observable>   <!-- anchor 4/8 games, 8 grounded; ours=partial UC-218 -->
- [ ] F40  the world is shared in real time with many other human players -> DONE WHEN: <observable>   <!-- anchor 4/8 games, 6 grounded; ours=no  -->
- [ ] F56  player can cooperate or fight with other human players -> DONE WHEN: <observable>   <!-- anchor 4/8 games, 6 grounded; ours=no  -->
- [ ] F06  player can target and disable individual subsystems on an enemy ship -> DONE WHEN: <observable>   <!-- anchor 4/8 games, 5 grounded; ours=no  -->
- [ ] F09  flight is full 3D with pitch, yaw and roll rather than a fixed plane -> DONE WHEN: <observable>   <!-- anchor 4/8 games, 5 grounded; ours=partial  -->
- [ ] F17  player unlocks new technology through research over time -> DONE WHEN: <observable>   <!-- anchor 4/8 games, 4 grounded; ours=partial UC-217 -->
- [ ] F68  the game supports a gamepad -> DONE WHEN: <observable>   <!-- anchor 3/7 games, 6 grounded; ours=no  -->
- [ ] F34  attacking one faction raises standing with its rival -> DONE WHEN: <observable>   <!-- anchor 3/6 games, 4 grounded; ours=partial  -->
- [ ] F69  the game offers colourblind or other accessibility options -> DONE WHEN: <observable>   <!-- anchor 3/7 games, 4 grounded; ours=no  -->
```

## Tool output this pass

```
classes.mmd: 51 exposed objects/classes over 55 modules; usecases.mmd: 51 use cases, tally {'WORKS': 49, 'PARTLY': 1, 'MISSING': 0, 'DEPRECATED': 1}
```
