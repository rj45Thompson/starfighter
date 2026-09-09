# Build contract — starblast

Every statement below is derived from a use-case model and carries the id of the node it came from. Nothing here is a paraphrase, and nothing here is a decision the model did not already record. Where this contract is silent, it is silent because the model is, and the silences are listed at the end rather than left for you to fill.

> **This contract is incomplete.** 235 decisions are still undecided and are listed at the end. Each one is a choice you would otherwise have to make silently. Do not make them: they belong in the model.


## Actors

**Pilot** — performs E1, E2, E3, E4.  `[A:pilot]`
**Another ship** — performs nothing.  `[A:rival]`
**The game** — performs E5.  `[A:system]`

## E1 — Arrive and fly

*You open the page. A world exists, you are in a ship in it, and the controls answer. Nothing else in the game can happen until this does.*  `[E1]`
- Begins when: the page is open and nothing has started. Is finished when: the pilot is flying and in control.  `[E1]`
**UC-E1-1 — The page builds a world to fly in.** Runs when: the page is open and nothing has started. Leaves true: a world exists to fly in. Status in the existing source: HAVE.  `[UC-E1-1]`
  Opening the page constructs a WebGL renderer and a scene. Until this exists there is no space, no ship, nothing to look at.  `[UC-E1-1]`
  Rests on: `renderer`, `scene`, `EXPOSURE`.  `[UC-E1-1#groundedIn]`
- [ ]   with WebGL unavailable the page reports it rather than showing a blank canvas  `[UC-E1-1#acceptance]`
- [ ]   the renderer is constructed exactly once per page load  `[UC-E1-1#acceptance]`
**UC-E1-2 — The game gives the pilot a ship.** Runs when: a world exists to fly in. Leaves true: the pilot has a ship in that world. Status in the existing source: HAVE.  `[UC-E1-2]`
  A ship is built for the player and placed in the world with a hull, a texture and a collision radius.  `[UC-E1-2]`
  Rests on: `makeShip`, `SHIP_TEX`, `SHIP_R`.  `[UC-E1-2#groundedIn]`
- [ ]   ships[0] exists with role 'player' after load  `[UC-E1-2#acceptance]`
- [ ]   the ship has a non-zero collision radius, so it can be hit  `[UC-E1-2#acceptance]`
**UC-E1-3 — The simulation advances every frame.** Runs when: the pilot has a ship in that world. Leaves true: the simulation is stepping. Status in the existing source: HAVE.  `[UC-E1-3]`
  A frame loop runs, clamps the timestep so a stalled tab cannot teleport the world, and steps the simulation.  `[UC-E1-3]`
  Rests on: `frame`, `step`.  `[UC-E1-3#groundedIn]`
- [ ]   a frame gap longer than 50ms is clamped rather than integrated whole  `[UC-E1-3#acceptance]`
- [ ]   pausing and resuming the tab does not move the ship  `[UC-E1-3#acceptance]`
**UC-E1-4 — The pilot's controls move the ship.** Runs when: the simulation is stepping. Leaves true: the controls answer the pilot. Status in the existing source: HAVE.  `[UC-E1-4]`
  Thrust, yaw and pitch answer the keyboard, bounded by drag and a maximum speed, so the ship is flyable rather than merely present.  `[UC-E1-4]`
  Rests on: `THRUST`, `DRAG`, `VMAX`, `YAW_RATE`, `PITCH_RATE`.  `[UC-E1-4#groundedIn]`
- [ ]   holding thrust raises speed until it plateaus at VMAX, not beyond  `[UC-E1-4#acceptance]`
- [ ]   releasing thrust decays speed rather than stopping dead  `[UC-E1-4#acceptance]`
**UC-E1-5 — The pilot can see where the ship is going.** Runs when: the controls answer the pilot. Leaves true: the pilot is flying and in control. Status in the existing source: HAVE.  `[UC-E1-5]`
  A chase camera trails the ship, leads it slightly, and lags rather than snapping, so the pilot has a usable frame of reference.  `[UC-E1-5]`
  Rests on: `CAM_BACK`, `CAM_AHEAD`, `CAM_LAG`, `CAM_UP`.  `[UC-E1-5#groundedIn]`
- [ ]   the camera sits behind and above the ship at rest  `[UC-E1-5#acceptance]`
- [ ]   a hard turn moves the camera smoothly, with no instantaneous jump  `[UC-E1-5#acceptance]`

## E2 — Mine the belt

*You fly a small ship at some rocks. You shoot one, it breaks, and the pieces are worth something. You scoop them up and the bar at the bottom fills. When it fills, you are owed something.*  `[E2]`
- Begins when: the pilot is flying and in control. Is finished when: the pilot is owed at least one upgrade point.  `[E2]`
**UC-E2-1 — The system populates a belt with rocks.** Runs when: the pilot is flying and in control. Leaves true: a belt of rocks exists. Status in the existing source: HAVE.  `[UC-E2-1]`
  A mining belt is seeded with instanced asteroids, capped so the field is dense without becoming thousands of draw calls.  `[UC-E2-1]`
  Rests on: `makeMiningBelt`, `spawnAsteroid`, `AST_MAX`, `AST_KEEP`, `ROCK_POOLS`.  `[UC-E2-1#groundedIn]`
- [ ]   the field holds rocks up to AST_MAX and never more  `[UC-E2-1#acceptance]`
- [ ]   rocks are drawn from instanced pools, not one mesh each  `[UC-E2-1#acceptance]`
**UC-E2-2 — The system finds the rocks near the pilot cheaply.** Runs when: a belt of rocks exists. Leaves true: a rock is within reach. Status in the existing source: HAVE.  `[UC-E2-2]`
  A spatial hash rebuilt every few frames answers 'what is near me' without scanning the field, which is what makes a belt of thousands testable every frame.  `[UC-E2-2]`
  Rests on: `AST_CELL`, `AST_GRID_EVERY`.  `[UC-E2-2#groundedIn]`
- [ ]   collision testing does not scan every rock each frame  `[UC-E2-2#acceptance]`
- [ ]   a rock marked gone is skipped by the near-query rather than returned  `[UC-E2-2#acceptance]`
**UC-E2-3 — The pilot breaks a rock apart.** Runs when: a rock is within reach. Leaves true: gems are loose in the world. Status in the existing source: HAVE.  `[UC-E2-3]`
  A rock that takes enough damage is destroyed, splitting into smaller children carrying a fraction of its size and a kick outward.  `[UC-E2-3]`
  Rests on: `destroyAsteroid`, `AST_SPLIT_MIN`, `AST_SPLIT_MAX`, `AST_CHILD_FRAC`, `AST_SPLIT_KICK`.  `[UC-E2-3#groundedIn]`
- [ ]   a destroyed rock above the no-split size yields between AST_SPLIT_MIN and AST_SPLIT_MAX children  `[UC-E2-3#acceptance]`
- [ ]   the children move apart rather than sitting inside each other  `[UC-E2-3#acceptance]`
**UC-E2-4 — Broken rock leaves gems in the world.** Runs when: gems are loose in the world. Leaves true: a gem can be picked up. Status in the existing source: HAVE.  `[UC-E2-4]`
  The pieces spawn as physical gem pickups whose credit value scales with the size of the rock they came from, and which expire if nobody takes them.  `[UC-E2-4]`
  Rests on: `spawnGem`, `GEM_CREDIT_PER_SCALE`, `GEM_LIFE`.  `[UC-E2-4#groundedIn]`
- [ ]   a bigger rock yields gems worth more credits than a smaller one  `[UC-E2-4#acceptance]`
- [ ]   an uncollected gem disappears after GEM_LIFE seconds  `[UC-E2-4#acceptance]`
**UC-E2-5 — The pilot scoops a gem.** Runs when: a gem can be picked up. Leaves true: gem credits are in the hold. Status in the existing source: HAVE.  `[UC-E2-5]`
  Flying near a gem collects it, with a magnet radius that widens as the ship is upgraded, so collection is a flight skill rather than a pixel-hunt.  `[UC-E2-5]`
  Rests on: `magnetFor`, `GEM_MAGNET`, `GEM_PICK_R`, `GEM_GRAB_R`.  `[UC-E2-5#groundedIn]`
- [ ]   a gem inside the magnet radius moves toward the ship without an exact pass-over  `[UC-E2-5#acceptance]`
- [ ]   the magnet radius grows when the relevant upgrade is bought  `[UC-E2-5#acceptance]`
**UC-E2-6 — Collected credits bank an upgrade point.** Runs when: gem credits are in the hold. Leaves true: the pilot is owed at least one upgrade point. Status in the existing source: HAVE.  `[UC-E2-6]`
  Gem credits fill a bar; each time it fills it converts into one banked upgrade point, up to a cap.  `[UC-E2-6]`
  Rests on: `gemBarAdd`, `GEM_BAR_MAX`, `GEM_BAR_RATE`, `GEM_PTS_CAP`.  `[UC-E2-6#groundedIn]`
- [ ]   GEM_BAR_MAX credits collected converts to exactly one banked point  `[UC-E2-6#acceptance]`
- [ ]   only the player's ship banks points; an AI ship collecting gems banks none  `[UC-E2-6#acceptance]`
- [ ]   banked points stop accumulating at GEM_PTS_CAP  `[UC-E2-6#acceptance]`

## E3 — Spend the point, or save for the hull

*You have a point. Put it into guns, shields or engines and get a little better now; or hold out, max everything, and trade the whole ship for a bigger frame and lose every upgrade you bought. That is the only real decision in the game.*  `[E3]`
- Begins when: the pilot is owed at least one upgrade point. Is finished when: the ship is measurably better than it was.  `[E3]`
**UC-E3-1 — The pilot spends a point on one of eight stats.** Runs when: the pilot is owed at least one upgrade point. Leaves true: at least one stat is above zero. Status in the existing source: HAVE.  `[UC-E3-1]`
  A banked point goes into one of eight named stats, in flight, each capped so no single stat absorbs the whole run.  `[UC-E3-1]`
  Rests on: `spendStat`, `STAT_ORDER`, `STAT_GAIN`, `STAT_MAX`.  `[UC-E3-1#groundedIn]`
- [ ]   spending on an unknown stat name is refused with the list of real ones  `[UC-E3-1#acceptance]`
- [ ]   a stat already at STAT_MAX refuses further points rather than consuming them  `[UC-E3-1#acceptance]`
**UC-E3-2 — Each point visibly changes how the ship performs.** Runs when: at least one stat is above zero. Leaves true: the ship is measurably better than it was. Status in the existing source: HAVE.  `[UC-E3-2]`
  A stat is a multiplier the simulation actually reads, so a point spent is felt rather than merely displayed.  `[UC-E3-2]`
  Rests on: `statMult`.  `[UC-E3-2#groundedIn]`
- [ ]   raising speed increases the ship's achieved velocity in flight  `[UC-E3-2#acceptance]`
- [ ]   a stat at zero leaves its multiplier at exactly 1.0  `[UC-E3-2#acceptance]`
**UC-E3-3 — Maxing every stat arms the trade-in.** Runs when: at least one stat is above zero. Leaves true: every stat is at its cap. Status in the existing source: HAVE.  `[UC-E3-3]`
  Only when all eight stats are at their cap, with a further point banked, does the ship become eligible for the next hull.  `[UC-E3-3]`
  Rests on: `tierUpReady`, `TIER_UP`, `STAT_MAX`.  `[UC-E3-3#groundedIn]`
- [ ]   with seven stats maxed the tier-up is not offered  `[UC-E3-3#acceptance]`
- [ ]   with eight maxed and no banked point the tier-up is not offered  `[UC-E3-3#acceptance]`
**UC-E3-4 — The game names the hull that comes next.** Runs when: every stat is at its cap. Leaves true: a next hull is on offer. Status in the existing source: HAVE.  `[UC-E3-4]`
  The ladder of hulls is a fixed order, and the ship's current class determines exactly which one is on offer.  `[UC-E3-4]`
  Rests on: `nextTierHull`, `hullTierIdx`, `HULL_ORDER_ORIGINAL`.  `[UC-E3-4#groundedIn]`
- [ ]   a ship at the top of the ladder is offered nothing  `[UC-E3-4#acceptance]`
- [ ]   a generated hull is placed at its size tier's rank rather than off the ladder  `[UC-E3-4#acceptance]`
**UC-E3-5 — Taking the new hull costs every upgrade bought.** Runs when: a next hull is on offer. Leaves true: the ship is flying a new frame. Status in the existing source: HAVE.  `[UC-E3-5]`
  Accepting the trade-in swaps the frame and resets all eight stats to zero, which is what makes holding out a real decision rather than a free reward.  `[UC-E3-5]`
  Rests on: `takeTierUp`.  `[UC-E3-5#groundedIn]`
- [ ]   after a tier-up every stat reads zero  `[UC-E3-5#acceptance]`
- [ ]   refusing the tier-up leaves the current hull and stats untouched  `[UC-E3-5#acceptance]`
**UC-E3-6 — The traded-up frame outperforms the one it replaced.** Runs when: the ship is flying a new frame. Leaves true: the ship is measurably better than it was. Status in the existing source: HAVE.  `[UC-E3-6]`
  A hull class carries its own capacities, so the frame taken in the trade is materially better than the one given up even with every stat reset to zero. This is what makes the trade-in a decision rather than a punishment, and it is the beat that joins the tier-up arm back to the rest of the story.  `[UC-E3-6]`
  Rests on: `HULLS`, `shieldMaxFor`.  `[UC-E3-6#groundedIn]`
- [ ]   a ship one tier up, with all stats at zero, has a higher base shield capacity than a maxed ship of the tier below  `[UC-E3-6#acceptance]`
- [ ]   each entry in HULLS declares its own capacities rather than inheriting one shared set  `[UC-E3-6#acceptance]`
- [ ]   the balance law the table states -- bigger hold means thinner armour and lower speed -- holds between adjacent tiers, so the trade is a trade and not a strict gain  `[UC-E3-6#acceptance]`

## E4 — Fight, die, and lose the cargo

*Your gun costs energy, so you cannot hold the trigger forever. Your shields soak the first hits and come back if you break away. When you lose, your gems spill for anyone to take and you start again small.*  `[E4]`
- Begins when: the pilot is flying and in control. Is finished when: the pilot is flying again after dying.  `[E4]`
**UC-E4-1 — Firing costs energy the pilot cannot spend forever.** Runs when: the pilot is flying and in control. Leaves true: the ship can fire. Status in the existing source: HAVE.  `[UC-E4-1]`
  Each shot draws from a capacitor that refills over time, so sustained fire is bounded by a resource rather than by a cooldown alone.  `[UC-E4-1]`
  Rests on: `capMaxFor`, `LASER_CAP_MAX`, `LASER_CAP_REGEN`, `LASER_CAP_PER_SHOT`.  `[UC-E4-1#groundedIn]`
- [ ]   with the capacitor empty the ship cannot fire  `[UC-E4-1#acceptance]`
- [ ]   breaking off refills the capacitor at LASER_CAP_REGEN per second  `[UC-E4-1#acceptance]`
- [ ]   raising energyCap raises the ceiling the capacitor refills to  `[UC-E4-1#acceptance]`
**UC-E4-2 — A shot travels a bounded distance.** Runs when: the ship can fire. Leaves true: a shot is travelling. Status in the existing source: HAVE.  `[UC-E4-2]`
  A bullet leaves the muzzle at a finite speed and expires after a finite life, which is what gives the weapon a range and makes closing the distance a decision.  `[UC-E4-2]`
  Rests on: `BULLET_SPEED`, `BULLET_LIFE`, `MUZZLE_OFF`.  `[UC-E4-2#groundedIn]`
- [ ]   a bullet expires after BULLET_LIFE seconds rather than travelling forever  `[UC-E4-2#acceptance]`
- [ ]   a target beyond BULLET_SPEED times BULLET_LIFE cannot be reached by a direct shot  `[UC-E4-2#acceptance]`
**UC-E4-3 — A shot that connects damages what it hit.** Runs when: a shot is travelling. Leaves true: damage is being exchanged. Status in the existing source: HAVE.  `[UC-E4-3]`
  Contact applies damage, and the gun cannot fire again until the interval its own weapon type declares has passed, so damage over time is bounded by the weapon and by the pilot's investment in fireRate rather than by how fast a key is pressed.  `[UC-E4-3]`
  Rests on: `BULLET_DMG`, `BULLET_R`, `WEAPONS`, `statMult`.  `[UC-E4-3#groundedIn]`
- [ ]   a bullet passing within BULLET_R of a ship registers a hit  `[UC-E4-3#acceptance]`
- [ ]   the interval between shots is the weapon's own cd from the WEAPONS table, divided by the ship's fireRate multiplier, so buying fireRate visibly shortens it  `[UC-E4-3#acceptance]`
- [ ]   two weapon types with different cd values fire at visibly different rates on the same hull  `[UC-E4-3#acceptance]`
**UC-E4-4 — Shields take the hit before the hull does.** Runs when: damage is being exchanged. Leaves true: a shield arc is down. Status in the existing source: HAVE.  `[UC-E4-4]`
  Damage is absorbed by a directional shield arc, each arc carrying half the ship's total shield, before any of it reaches the hull.  `[UC-E4-4]`
  Rests on: `drainShield`, `shieldArcMaxFor`.  `[UC-E4-4#groundedIn]`
- [ ]   a hit from ahead drains the forward arc and leaves the aft arc untouched  `[UC-E4-4#acceptance]`
- [ ]   hull integrity does not fall while the struck arc still has charge  `[UC-E4-4#acceptance]`
**UC-E4-5 — A ship that runs out of hull dies.** Runs when: a shield arc is down. Leaves true: the pilot's ship is destroyed. Status in the existing source: HAVE.  `[UC-E4-5]`
  When damage exhausts the hull the ship is destroyed, removed from the fight, and the kill is attributed to whoever landed it.  `[UC-E4-5]`
  Rests on: `killShip`, `killByShip`.  `[UC-E4-5#groundedIn]`
- [ ]   a destroyed ship stops being a valid target  `[UC-E4-5#acceptance]`
- [ ]   the killer is credited, so a kill is attributable  `[UC-E4-5#acceptance]`
**UC-E4-6 — Death spills the cargo for anyone to take.** Runs when: the pilot's ship is destroyed. Leaves true: the hold is on the floor. Status in the existing source: HAVE.  `[UC-E4-6]`
  The credits banked into the hold are dropped into the world on death, so a long uninterrupted run is worth more than the sum of its minutes.  `[UC-E4-6]`
  Rests on: `spillGems`.  `[UC-E4-6#groundedIn]`
- [ ]   a pilot dying with credits leaves collectable gems at the wreck  `[UC-E4-6#acceptance]`
- [ ]   a pilot dying with nothing spills nothing  `[UC-E4-6#acceptance]`
**UC-E4-7 — The pilot comes back small after a pause.** Runs when: the hold is on the floor. Leaves true: the pilot is flying again after dying. Status in the existing source: HAVE.  `[UC-E4-7]`
  After a delay the pilot respawns without the hull they lost, which is the cost that makes the fight matter.  `[UC-E4-7]`
  Rests on: `RESPAWN_DELAY`.  `[UC-E4-7#groundedIn]`
- [ ]   respawn does not happen before RESPAWN_DELAY seconds have passed  `[UC-E4-7#acceptance]`
- [ ]   the respawned ship is not the tier that died  `[UC-E4-7#acceptance]`

## E5 — The run ends and is remembered

*The session stops, and what you did survives it: the score, the ship you were flying, the state that has to be there when you come back.*  `[E5]`
- Begins when: the pilot is flying again after dying. Is finished when: the run is over and what happened is on record.  `[E5]`
**UC-E5-1 — The game gathers what is worth keeping.** Runs when: the pilot is flying again after dying. Leaves true: a snapshot of the run exists. Status in the existing source: HAVE.  `[UC-E5-1]`
  The player's ship, progress and standing are collected into one versioned snapshot.  `[UC-E5-1]`
  Rests on: `gatherSaveState`.  `[UC-E5-1#groundedIn]`
- [ ]   the snapshot carries a version field, so an old save is recognisable as old  `[UC-E5-1#acceptance]`
- [ ]   with no player ship the snapshot is refused rather than written empty  `[UC-E5-1#acceptance]`
**UC-E5-2 — The snapshot is written where it can be found again.** Runs when: a snapshot of the run exists. Leaves true: the snapshot is in storage. Status in the existing source: HAVE.  `[UC-E5-2]`
  The snapshot is stored under a known key in browser storage, so it survives the page closing.  `[UC-E5-2]`
  Rests on: `SAVE_KEY`, `persist`.  `[UC-E5-2#groundedIn]`
- [ ]   closing and reopening the page finds the previous snapshot  `[UC-E5-2#acceptance]`
- [ ]   a snapshot written under the key replaces the previous one rather than accumulating  `[UC-E5-2#acceptance]`
**UC-E5-3 — The snapshot is kept current, not written only at the end.** Runs when: the snapshot is in storage. Leaves true: the stored snapshot is no more than one interval old. Status in the existing source: HAVE.  `[UC-E5-3]`
  Saving runs on a cadence during play, so an unclean exit costs at most one interval rather than the whole session.  `[UC-E5-3]`
  Rests on: `SAVE_INTERVAL_S`.  `[UC-E5-3#groundedIn]`
- [ ]   a session ended without a clean exit still restores to within SAVE_INTERVAL_S of where it stopped  `[UC-E5-3#acceptance]`
**UC-E5-4 — A returning pilot gets their ship back.** Runs when: the stored snapshot is no more than one interval old. Leaves true: a returning pilot has their ship back. Status in the existing source: HAVE.  `[UC-E5-4]`
  On load a valid snapshot of the right version is applied; an invalid or older one is declined rather than half-applied.  `[UC-E5-4]`
  Rests on: `applySaveState`.  `[UC-E5-4#groundedIn]`
- [ ]   a snapshot of the wrong version is declined and the pilot starts fresh  `[UC-E5-4#acceptance]`
- [ ]   a restored pilot has the hull and stats they had when the snapshot was taken  `[UC-E5-4#acceptance]`
**UC-E5-5 — The run's standing is a weighted total.** Runs when: a returning pilot has their ship back. Leaves true: the run is over and what happened is on record. Status in the existing source: HAVE.  `[UC-E5-5]`
  Standing combines credits and score under a stated weight rather than counting kills alone, so mining and fighting both register.  `[UC-E5-5]`
  Rests on: `SCORE_W`.  `[UC-E5-5#groundedIn]`
- [ ]   a run that only mines still produces a non-zero standing  `[UC-E5-5#acceptance]`
- [ ]   two runs with equal credits and different scores are ranked apart  `[UC-E5-5#acceptance]`

## Decisions this contract does not make

Each of these is a decision the model has not recorded. Answering one is an addition to the model, not a choice made while writing code.

| what is undecided | where | what it forces you to invent | the addition that settles it |
|---|---|---|---|
| `UNSCOPED_REGION` | `R:base` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:battle` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:build` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:core` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:edge` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:hull` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:keys` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:lore` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:mult` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:pirate` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:planet` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:rear` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:render` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:rock` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:scan` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:ship` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:tick` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNSCOPED_REGION` | `R:update` | the writer does not know this part of the system exists, so it will be absent from what they build or invented from scratch | an EPIC covering these symbols, with its opening and closing state |
| `UNUSED_ACTOR` | `A:rival` | the writer builds for an actor with no goals, or drops one that should have them | USECASEs this actor performs, or removal of the actor |
| `UNCLAIMED_GROUND` | `G:BANK_LERP` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BANK_MAX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:CAM_SHAKE_MAG` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:CAM_UP_LERP` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:DRAG_THRESHOLD` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:KP_PITCH` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:KP_YAW` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:PERIPH_CENTER` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:PERIPH_DPR` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:PERIPH_ON` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:PERIPH_VIGNETTE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:PERIPH_WIDE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_BOUNCE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_BULLET_DMG` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_COLLIDE_SKIP_MULT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_LEN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_RAM_MIN_SPEED` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_TEX_LOADER` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIP_YAW` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SKY_BAKE_RES` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SKY_GAIN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SKY_MODE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SKY_SEED` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SKY_TINT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:THRUST_TEX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:TOPCAM_BACK` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:TOPCAM_FOV` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:TOPCAM_UP` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:resize` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_DMG` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_DRIFT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_HP_PER_SCALE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_NOSPLIT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_SCALE_MAX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_SCALE_MIN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AST_UNIT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_ACCEL` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_CONE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_DOCK_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_DPS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_GEM_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_GRAB_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_IDLE_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_LASER_COL` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_LASER_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_LAUNCH_KICK` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_LAUNCH_T` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_MINE_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_SEAM_RATE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_SIZE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_SPEED` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:BOT_STANDOFF` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_BAR` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_EASE_R` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_FOOD` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_HULL_CREDIT_MULT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_HULL_FRAC` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_HULL_MIN_CREDITS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_HULL_THRESH` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_SIZE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:MINING_BOTS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_GEN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_GEO_VARIANTS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_LOD_MAX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_LOD_UNIT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_NORMAL_SCALE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_SHADES` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ROCK_TEX_GAIN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:destroyAsteroidObj` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:ensureMiningBots` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:gem` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:gemBar` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:gemBarPct` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:gemGeos` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:gemsFetched` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:hegemon` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:miningBelt` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:miningBots` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:miningBotsTick` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:miningStats` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:GEM_BAR` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.spendStat` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.takeTierUp` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULLMODELS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_FAMILIES` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_GEN_JITTER` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_GEN_SEED` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_MOUNTS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_ORDER` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_SERIES` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_SERIES_KEYS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HULL_SIZE_TIERS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_DEFAULT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_DOCK_H` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_MAX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_MIN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_MULT_MAX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_MULT_MIN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_SYS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_THRESH` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:POWER_TOTAL` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:STAT_LABEL` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:UPGRADE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:UPGRADE_HULL_DEATHS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:doUpgrade` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_BUDGET_FRAC` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_HULL_DREAMS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_LEAD` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_REAR_ARC` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_REAR_BEAMS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_REAR_DPS_FRAC` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_REAR_PIERCE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_REAR_POOL` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_REAR_RANGE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_TANK_AGGR` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:AI_WEAPON_FAMILIES` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.capLaserOf` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.setShieldDivert` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.shieldArcsOf` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.shieldDivertOf` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:HOST.shieldOf` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:Laser` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:MISSILE_AMMO_COST` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:MISSILE_AMMO_MAX` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:MISSILE_AMMO_REGEN` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:MISSILE_AMMO_START` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELDS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_ARC_BASE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_BASE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_BOOST_MULT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_DIVERT_MULT` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_GENS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_GEN_KEYS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_REGEN_BASE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:SHIELD_REGEN_DELAY` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:TAMI_WASM.damage` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:WEAPON_DMG` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:WEAPON_FIRE` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:WEAPON_ORDER` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:capLaser` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:damage` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:rearShield` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:rearShieldHit` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shield` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldAft` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldCap` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldFwd` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldGenOf` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldGenPctFor` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldGenType` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldRegen` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shieldTick` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:shields` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:updateRearShield` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:DEATH_CREDIT_LOSS` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:persistence` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:respawn` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNCLAIMED_GROUND` | `G:score` | the writer meets a constant or function no requirement explains and guesses what it is for | a groundedIn edge from the use case that owns it, or a use case that does |
| `UNDECOMPOSED_USECASE` | `UC-E1-1` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E1-2` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E1-3` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E1-4` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E1-5` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E2-1` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E2-2` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E2-3` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E2-4` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E2-5` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E2-6` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E3-1` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E3-2` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E3-3` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E3-4` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E3-5` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E3-6` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E4-1` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E4-2` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E4-3` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E4-4` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E4-5` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |
| `UNDECOMPOSED_USECASE` | `UC-E4-6` | the writer has a goal and no procedure, so the algorithm is theirs to invent | ordered STEP nodes under the use case, each citing the symbol it rests on |

*…and 35 more.*
