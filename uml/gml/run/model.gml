graph [
  directed 1
  label "starblast"
  node [
    id 0
    label "A:pilot"
    kind "actor"
    name "Pilot"
    provenance "seed"
    note "the human at the keyboard"
  ]
  node [
    id 1
    label "A:rival"
    kind "actor"
    name "Another ship"
    provenance "seed"
    note "an AI pilot or another player"
  ]
  node [
    id 2
    label "A:system"
    kind "actor"
    name "The game"
    provenance "seed"
    note "the simulation acting on its own"
  ]
  node [
    id 3
    label "E1"
    kind "epic"
    name "Arrive and fly"
    provenance "seed"
    scope "^(CAM_|KP_|SHIP_|PERIPH_|THRUST|DRAG|VMAX|PITCH_RATE|YAW_RATE|BANK_|SKY_|EXPOSURE|TOPCAM)|^(renderer|scene|frame|step|resize|makeShip|hullModel)$"
    story "You open the page. A world exists, you are in a ship in it, and the controls answer. Nothing else in the game can happen until this does."
  ]
  node [
    id 4
    label "E2"
    kind "epic"
    name "Mine the belt"
    provenance "seed"
    scope "^(AST_|GEM_|BOT_|MINING|BELT|ROCK)|[Aa]steroid|[Gg]em|[Mm]agnet|[Mm]ining"
    story "You fly a small ship at some rocks. You shoot one, it breaks, and the pieces are worth something. You scoop them up and the bar at the bottom fills. When it fills, you are owed something."
  ]
  node [
    id 5
    label "E3"
    kind "epic"
    name "Spend the point, or save for the hull"
    provenance "seed"
    scope "^(STAT_|HULL|TIER|UPG|GEM_BAR|GEM_PTS|POWER_)|spendStat|statMult|tierUp|takeTier|nextTier|doUpgrade|hullTier"
    story "You have a point. Put it into guns, shields or engines and get a little better now; or hold out, max everything, and trade the whole ship for a bigger frame and lose every upgrade you bought. That is the only real decision in the game."
  ]
  node [
    id 6
    label "E4"
    kind "epic"
    name "Fight, die, and lose the cargo"
    provenance "seed"
    scope "^(LASER|SHIELD|BULLET|DMG|WEAPON|MISSILE|AI_|HIT_)|[Ss]hield|[Ll]aser|killShip|killBy|spill|damage|capLaser|capMax"
    story "Your gun costs energy, so you cannot hold the trigger forever. Your shields soak the first hits and come back if you break away. When you lose, your gems spill for anyone to take and you start again small."
  ]
  node [
    id 7
    label "E5"
    kind "epic"
    name "The run ends and is remembered"
    provenance "seed"
    scope "^(SCORE|SAVE|RESPAWN|DEATH|PERSIST|SESSION)|score|respawn|persist|gatherSave|applySave"
    story "The session stops, and what you did survives it: the score, the ship you were flying, the state that has to be there when you come back."
  ]
  node [
    id 8
    label "S:belt_exists"
    kind "state"
    name "a belt of rocks exists"
    provenance "Q-2"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
  ]
  node [
    id 9
    label "S:controls_live"
    kind "state"
    name "the controls answer the pilot"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 10
    label "S:gem_in_hold"
    kind "state"
    name "gem credits are in the hold"
    provenance "Q-2"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
  ]
  node [
    id 11
    label "S:gem_pickable"
    kind "state"
    name "a gem can be picked up"
    provenance "Q-2"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
  ]
  node [
    id 12
    label "S:gems_loose"
    kind "state"
    name "gems are loose in the world"
    provenance "Q-2"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
  ]
  node [
    id 13
    label "S:gems_spilled"
    kind "state"
    name "the hold is on the floor"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 14
    label "S:hull_swapped"
    kind "state"
    name "the ship is flying a new frame"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 15
    label "S:in_combat"
    kind "state"
    name "damage is being exchanged"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 16
    label "S:in_flight"
    kind "state"
    name "the pilot is flying and in control"
    provenance "seed"
  ]
  node [
    id 17
    label "S:page_open"
    kind "state"
    name "the page is open and nothing has started"
    provenance "seed"
  ]
  node [
    id 18
    label "S:point_banked"
    kind "state"
    name "the pilot is owed at least one upgrade point"
    provenance "seed"
  ]
  node [
    id 19
    label "S:respawned"
    kind "state"
    name "the pilot is flying again after dying"
    provenance "seed"
  ]
  node [
    id 20
    label "S:rock_in_range"
    kind "state"
    name "a rock is within reach"
    provenance "Q-2"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
  ]
  node [
    id 21
    label "S:save_current"
    kind "state"
    name "the stored snapshot is no more than one interval old"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 22
    label "S:save_gathered"
    kind "state"
    name "a snapshot of the run exists"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 23
    label "S:save_restored"
    kind "state"
    name "a returning pilot has their ship back"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 24
    label "S:save_written"
    kind "state"
    name "the snapshot is in storage"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 25
    label "S:session_recorded"
    kind "state"
    name "the run is over and what happened is on record"
    provenance "seed"
  ]
  node [
    id 26
    label "S:shield_stripped"
    kind "state"
    name "a shield arc is down"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 27
    label "S:ship_dead"
    kind "state"
    name "the pilot's ship is destroyed"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 28
    label "S:ship_exists"
    kind "state"
    name "the pilot has a ship in that world"
    provenance "seed"
  ]
  node [
    id 29
    label "S:ship_stronger"
    kind "state"
    name "the ship is measurably better than it was"
    provenance "seed"
  ]
  node [
    id 30
    label "S:shot_in_flight"
    kind "state"
    name "a shot is travelling"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 31
    label "S:sim_running"
    kind "state"
    name "the simulation is stepping"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 32
    label "S:stat_raised"
    kind "state"
    name "at least one stat is above zero"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 33
    label "S:stats_maxed"
    kind "state"
    name "every stat is at its cap"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 34
    label "S:tier_offered"
    kind "state"
    name "a next hull is on offer"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 35
    label "S:under_fire"
    kind "state"
    name "something is shooting at the pilot"
    provenance "seed"
  ]
  node [
    id 36
    label "S:weapon_ready"
    kind "state"
    name "the ship can fire"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 37
    label "S:world_built"
    kind "state"
    name "a world exists to fly in"
    provenance "seed"
  ]
  node [
    id 38
    label "UC-E1-1"
    kind "usecase"
    name "The page builds a world to fly in"
    provenance "Q-1"
    acceptance "[&quot;with WebGL unavailable the page reports it rather than showing a blank canvas&quot;, &quot;the renderer is constructed exactly once per page load&quot;]"
    ground "[&quot;renderer&quot;, &quot;scene&quot;, &quot;EXPOSURE&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
    story "Opening the page constructs a WebGL renderer and a scene. Until this exists there is no space, no ship, nothing to look at."
  ]
  node [
    id 39
    label "UC-E1-2"
    kind "usecase"
    name "The game gives the pilot a ship"
    provenance "Q-1"
    acceptance "[&quot;ships[0] exists with role 'player' after load&quot;, &quot;the ship has a non-zero collision radius, so it can be hit&quot;]"
    ground "[&quot;makeShip&quot;, &quot;SHIP_TEX&quot;, &quot;SHIP_R&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
    story "A ship is built for the player and placed in the world with a hull, a texture and a collision radius."
  ]
  node [
    id 40
    label "UC-E1-3"
    kind "usecase"
    name "The simulation advances every frame"
    provenance "Q-1"
    acceptance "[&quot;a frame gap longer than 50ms is clamped rather than integrated whole&quot;, &quot;pausing and resuming the tab does not move the ship&quot;]"
    ground "[&quot;frame&quot;, &quot;step&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
    story "A frame loop runs, clamps the timestep so a stalled tab cannot teleport the world, and steps the simulation."
  ]
  node [
    id 41
    label "UC-E1-4"
    kind "usecase"
    name "The pilot's controls move the ship"
    provenance "Q-1"
    acceptance "[&quot;holding thrust raises speed until it plateaus at VMAX, not beyond&quot;, &quot;releasing thrust decays speed rather than stopping dead&quot;]"
    ground "[&quot;THRUST&quot;, &quot;DRAG&quot;, &quot;VMAX&quot;, &quot;YAW_RATE&quot;, &quot;PITCH_RATE&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
    story "Thrust, yaw and pitch answer the keyboard, bounded by drag and a maximum speed, so the ship is flyable rather than merely present."
  ]
  node [
    id 42
    label "UC-E1-5"
    kind "usecase"
    name "The pilot can see where the ship is going"
    provenance "Q-1"
    acceptance "[&quot;the camera sits behind and above the ship at rest&quot;, &quot;a hard turn moves the camera smoothly, with no instantaneous jump&quot;]"
    ground "[&quot;CAM_BACK&quot;, &quot;CAM_AHEAD&quot;, &quot;CAM_LAG&quot;, &quot;CAM_UP&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
    story "A chase camera trails the ship, leads it slightly, and lags rather than snapping, so the pilot has a usable frame of reference."
  ]
  node [
    id 43
    label "UC-E2-1"
    kind "usecase"
    name "The system populates a belt with rocks"
    provenance "Q-2"
    acceptance "[&quot;the field holds rocks up to AST_MAX and never more&quot;, &quot;rocks are drawn from instanced pools, not one mesh each&quot;]"
    ground "[&quot;makeMiningBelt&quot;, &quot;spawnAsteroid&quot;, &quot;AST_MAX&quot;, &quot;AST_KEEP&quot;, &quot;ROCK_POOLS&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
    status "HAVE"
    story "A mining belt is seeded with instanced asteroids, capped so the field is dense without becoming thousands of draw calls."
  ]
  node [
    id 44
    label "UC-E2-2"
    kind "usecase"
    name "The system finds the rocks near the pilot cheaply"
    provenance "Q-2"
    acceptance "[&quot;collision testing does not scan every rock each frame&quot;, &quot;a rock marked gone is skipped by the near-query rather than returned&quot;]"
    ground "[&quot;AST_CELL&quot;, &quot;AST_GRID_EVERY&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
    status "HAVE"
    story "A spatial hash rebuilt every few frames answers 'what is near me' without scanning the field, which is what makes a belt of thousands testable every frame."
  ]
  node [
    id 45
    label "UC-E2-3"
    kind "usecase"
    name "The pilot breaks a rock apart"
    provenance "Q-2"
    acceptance "[&quot;a destroyed rock above the no-split size yields between AST_SPLIT_MIN and AST_SPLIT_MAX children&quot;, &quot;the children move apart rather than sitting inside each other&quot;]"
    ground "[&quot;destroyAsteroid&quot;, &quot;AST_SPLIT_MIN&quot;, &quot;AST_SPLIT_MAX&quot;, &quot;AST_CHILD_FRAC&quot;, &quot;AST_SPLIT_KICK&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
    status "HAVE"
    story "A rock that takes enough damage is destroyed, splitting into smaller children carrying a fraction of its size and a kick outward."
  ]
  node [
    id 46
    label "UC-E2-4"
    kind "usecase"
    name "Broken rock leaves gems in the world"
    provenance "Q-2"
    acceptance "[&quot;a bigger rock yields gems worth more credits than a smaller one&quot;, &quot;an uncollected gem disappears after GEM_LIFE seconds&quot;]"
    ground "[&quot;spawnGem&quot;, &quot;GEM_CREDIT_PER_SCALE&quot;, &quot;GEM_LIFE&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
    status "HAVE"
    story "The pieces spawn as physical gem pickups whose credit value scales with the size of the rock they came from, and which expire if nobody takes them."
  ]
  node [
    id 47
    label "UC-E2-5"
    kind "usecase"
    name "The pilot scoops a gem"
    provenance "Q-2"
    acceptance "[&quot;a gem inside the magnet radius moves toward the ship without an exact pass-over&quot;, &quot;the magnet radius grows when the relevant upgrade is bought&quot;]"
    ground "[&quot;magnetFor&quot;, &quot;GEM_MAGNET&quot;, &quot;GEM_PICK_R&quot;, &quot;GEM_GRAB_R&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
    status "HAVE"
    story "Flying near a gem collects it, with a magnet radius that widens as the ship is upgraded, so collection is a flight skill rather than a pixel-hunt."
  ]
  node [
    id 48
    label "UC-E2-6"
    kind "usecase"
    name "Collected credits bank an upgrade point"
    provenance "Q-2"
    acceptance "[&quot;GEM_BAR_MAX credits collected converts to exactly one banked point&quot;, &quot;only the player's ship banks points; an AI ship collecting gems banks none&quot;, &quot;banked points stop accumulating at GEM_PTS_CAP&quot;]"
    ground "[&quot;gemBarAdd&quot;, &quot;GEM_BAR_MAX&quot;, &quot;GEM_BAR_RATE&quot;, &quot;GEM_PTS_CAP&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-2&quot;}"
    status "HAVE"
    story "Gem credits fill a bar; each time it fills it converts into one banked upgrade point, up to a cap."
  ]
  node [
    id 49
    label "UC-E3-1"
    kind "usecase"
    name "The pilot spends a point on one of eight stats"
    provenance "Q-3"
    acceptance "[&quot;spending on an unknown stat name is refused with the list of real ones&quot;, &quot;a stat already at STAT_MAX refuses further points rather than consuming them&quot;]"
    ground "[&quot;spendStat&quot;, &quot;STAT_ORDER&quot;, &quot;STAT_GAIN&quot;, &quot;STAT_MAX&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
    story "A banked point goes into one of eight named stats, in flight, each capped so no single stat absorbs the whole run."
  ]
  node [
    id 50
    label "UC-E3-2"
    kind "usecase"
    name "Each point visibly changes how the ship performs"
    provenance "Q-3"
    acceptance "[&quot;raising speed increases the ship's achieved velocity in flight&quot;, &quot;a stat at zero leaves its multiplier at exactly 1.0&quot;]"
    ground "[&quot;statMult&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
    story "A stat is a multiplier the simulation actually reads, so a point spent is felt rather than merely displayed."
  ]
  node [
    id 51
    label "UC-E3-3"
    kind "usecase"
    name "Maxing every stat arms the trade-in"
    provenance "Q-3"
    acceptance "[&quot;with seven stats maxed the tier-up is not offered&quot;, &quot;with eight maxed and no banked point the tier-up is not offered&quot;]"
    ground "[&quot;tierUpReady&quot;, &quot;TIER_UP&quot;, &quot;STAT_MAX&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
    story "Only when all eight stats are at their cap, with a further point banked, does the ship become eligible for the next hull."
  ]
  node [
    id 52
    label "UC-E3-4"
    kind "usecase"
    name "The game names the hull that comes next"
    provenance "Q-3"
    acceptance "[&quot;a ship at the top of the ladder is offered nothing&quot;, &quot;a generated hull is placed at its size tier's rank rather than off the ladder&quot;]"
    ground "[&quot;nextTierHull&quot;, &quot;hullTierIdx&quot;, &quot;HULL_ORDER_ORIGINAL&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
    story "The ladder of hulls is a fixed order, and the ship's current class determines exactly which one is on offer."
  ]
  node [
    id 53
    label "UC-E3-5"
    kind "usecase"
    name "Taking the new hull costs every upgrade bought"
    provenance "Q-3"
    acceptance "[&quot;after a tier-up every stat reads zero&quot;, &quot;refusing the tier-up leaves the current hull and stats untouched&quot;]"
    ground "[&quot;takeTierUp&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
    story "Accepting the trade-in swaps the frame and resets all eight stats to zero, which is what makes holding out a real decision rather than a free reward."
  ]
  node [
    id 54
    label "UC-E3-6"
    kind "usecase"
    name "The traded-up frame outperforms the one it replaced"
    provenance "Q-7"
    acceptance "[&quot;a ship one tier up, with all stats at zero, has a higher base shield capacity than a maxed ship of the tier below&quot;, &quot;each entry in HULLS declares its own capacities rather than inheriting one shared set&quot;, &quot;the balance law the table states -- bigger hold means thinner armour and lower speed -- holds between adjacent tiers, so the trade is a trade and not a strict gain&quot;]"
    ground "[&quot;HULLS&quot;, &quot;shieldMaxFor&quot;]"
    rationale "{&quot;ask&quot;: &quot;'Taking the new hull costs every upgrade bought' establishes 'the ship is flying a new frame' (S:hull_swapped), and no use case requires it and no epic ends on it. Either name the use case that consumes it, or say the postcondition is wrong. A state nothing needs is either a missing beat or a false claim about what this use case is for.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The gap is real and it is the interesting one in this epic. E3 forks: spend the point now (UC-E3-1 -> UC-E3-2 -> ship_stronger) or bank toward a maxed ship and trade the frame in (UC-E3-3 -> UC-E3-4 -> UC-E3-5 -> hull_swapped). The first arm rejoined the story and the second did not, which means the model was asserting that trading in your ship leaves you no better off. A use case is missing: the one that says the new frame is worth what it cost. HULLS is the table that carries each frame's own capacity, and it is what makes the claim checkable rather than a promise.&quot;, &quot;kind&quot;: &quot;DANGLING_POSTCONDITION&quot;, &quot;question&quot;: &quot;Q-7&quot;}"
    status "HAVE"
    story "A hull class carries its own capacities, so the frame taken in the trade is materially better than the one given up even with every stat reset to zero. This is what makes the trade-in a decision rather than a punishment, and it is the beat that joins the tier-up arm back to the rest of the story."
  ]
  node [
    id 55
    label "UC-E4-1"
    kind "usecase"
    name "Firing costs energy the pilot cannot spend forever"
    provenance "Q-6"
    acceptance "[&quot;with the capacitor empty the ship cannot fire&quot;, &quot;breaking off refills the capacitor at LASER_CAP_REGEN per second&quot;, &quot;raising energyCap raises the ceiling the capacitor refills to&quot;]"
    ground "[&quot;capMaxFor&quot;, &quot;LASER_CAP_MAX&quot;, &quot;LASER_CAP_REGEN&quot;, &quot;LASER_CAP_PER_SHOT&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "Each shot draws from a capacitor that refills over time, so sustained fire is bounded by a resource rather than by a cooldown alone."
  ]
  node [
    id 56
    label "UC-E4-2"
    kind "usecase"
    name "A shot travels a bounded distance"
    provenance "Q-6"
    acceptance "[&quot;a bullet expires after BULLET_LIFE seconds rather than travelling forever&quot;, &quot;a target beyond BULLET_SPEED times BULLET_LIFE cannot be reached by a direct shot&quot;]"
    ground "[&quot;BULLET_SPEED&quot;, &quot;BULLET_LIFE&quot;, &quot;MUZZLE_OFF&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "A bullet leaves the muzzle at a finite speed and expires after a finite life, which is what gives the weapon a range and makes closing the distance a decision."
  ]
  node [
    id 57
    label "UC-E4-3"
    kind "usecase"
    name "A shot that connects damages what it hit"
    provenance "Q-6"
    acceptance "[&quot;a bullet passing within BULLET_R of a ship registers a hit&quot;, &quot;the interval between shots is the weapon's own cd from the WEAPONS table, divided by the ship's fireRate multiplier, so buying fireRate visibly shortens it&quot;, &quot;two weapon types with different cd values fire at visibly different rates on the same hull&quot;]"
    ground "[&quot;BULLET_DMG&quot;, &quot;BULLET_R&quot;, &quot;WEAPONS&quot;, &quot;statMult&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "Contact applies damage, and the gun cannot fire again until the interval its own weapon type declares has passed, so damage over time is bounded by the weapon and by the pilot's investment in fireRate rather than by how fast a key is pressed."
  ]
  node [
    id 58
    label "UC-E4-4"
    kind "usecase"
    name "Shields take the hit before the hull does"
    provenance "Q-6"
    acceptance "[&quot;a hit from ahead drains the forward arc and leaves the aft arc untouched&quot;, &quot;hull integrity does not fall while the struck arc still has charge&quot;]"
    ground "[&quot;drainShield&quot;, &quot;shieldArcMaxFor&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "Damage is absorbed by a directional shield arc, each arc carrying half the ship's total shield, before any of it reaches the hull."
  ]
  node [
    id 59
    label "UC-E4-5"
    kind "usecase"
    name "A ship that runs out of hull dies"
    provenance "Q-6"
    acceptance "[&quot;a destroyed ship stops being a valid target&quot;, &quot;the killer is credited, so a kill is attributable&quot;]"
    ground "[&quot;killShip&quot;, &quot;killByShip&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "When damage exhausts the hull the ship is destroyed, removed from the fight, and the kill is attributed to whoever landed it."
  ]
  node [
    id 60
    label "UC-E4-6"
    kind "usecase"
    name "Death spills the cargo for anyone to take"
    provenance "Q-6"
    acceptance "[&quot;a pilot dying with credits leaves collectable gems at the wreck&quot;, &quot;a pilot dying with nothing spills nothing&quot;]"
    ground "[&quot;spillGems&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "The credits banked into the hold are dropped into the world on death, so a long uninterrupted run is worth more than the sum of its minutes."
  ]
  node [
    id 61
    label "UC-E4-7"
    kind "usecase"
    name "The pilot comes back small after a pause"
    provenance "Q-6"
    acceptance "[&quot;respawn does not happen before RESPAWN_DELAY seconds have passed&quot;, &quot;the respawned ship is not the tier that died&quot;]"
    ground "[&quot;RESPAWN_DELAY&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
    story "After a delay the pilot respawns without the hull they lost, which is the cost that makes the fight matter."
  ]
  node [
    id 62
    label "UC-E5-1"
    kind "usecase"
    name "The game gathers what is worth keeping"
    provenance "Q-5"
    acceptance "[&quot;the snapshot carries a version field, so an old save is recognisable as old&quot;, &quot;with no player ship the snapshot is refused rather than written empty&quot;]"
    ground "[&quot;gatherSaveState&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
    story "The player's ship, progress and standing are collected into one versioned snapshot."
  ]
  node [
    id 63
    label "UC-E5-2"
    kind "usecase"
    name "The snapshot is written where it can be found again"
    provenance "Q-5"
    acceptance "[&quot;closing and reopening the page finds the previous snapshot&quot;, &quot;a snapshot written under the key replaces the previous one rather than accumulating&quot;]"
    ground "[&quot;SAVE_KEY&quot;, &quot;persist&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
    story "The snapshot is stored under a known key in browser storage, so it survives the page closing."
  ]
  node [
    id 64
    label "UC-E5-3"
    kind "usecase"
    name "The snapshot is kept current, not written only at the end"
    provenance "Q-5"
    acceptance "[&quot;a session ended without a clean exit still restores to within SAVE_INTERVAL_S of where it stopped&quot;]"
    ground "[&quot;SAVE_INTERVAL_S&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
    story "Saving runs on a cadence during play, so an unclean exit costs at most one interval rather than the whole session."
  ]
  node [
    id 65
    label "UC-E5-4"
    kind "usecase"
    name "A returning pilot gets their ship back"
    provenance "Q-5"
    acceptance "[&quot;a snapshot of the wrong version is declined and the pilot starts fresh&quot;, &quot;a restored pilot has the hull and stats they had when the snapshot was taken&quot;]"
    ground "[&quot;applySaveState&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
    story "On load a valid snapshot of the right version is applied; an invalid or older one is declined rather than half-applied."
  ]
  node [
    id 66
    label "UC-E5-5"
    kind "usecase"
    name "The run's standing is a weighted total"
    provenance "Q-5"
    acceptance "[&quot;a run that only mines still produces a non-zero standing&quot;, &quot;two runs with equal credits and different scores are ranked apart&quot;]"
    ground "[&quot;SCORE_W&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
    story "Standing combines credits and score under a stated weight rather than counting kills alone, so mining and fighting both register."
  ]
  edge [
    source 3
    target 17
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 4
    target 16
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 5
    target 18
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 6
    target 16
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 7
    target 19
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 38
    target 37
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 39
    target 28
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 40
    target 31
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 41
    target 9
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 42
    target 16
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 43
    target 8
    label "establishes"
    provenance "Q-2"
  ]
  edge [
    source 44
    target 20
    label "establishes"
    provenance "Q-2"
  ]
  edge [
    source 45
    target 12
    label "establishes"
    provenance "Q-2"
  ]
  edge [
    source 46
    target 11
    label "establishes"
    provenance "Q-2"
  ]
  edge [
    source 47
    target 10
    label "establishes"
    provenance "Q-2"
  ]
  edge [
    source 48
    target 18
    label "establishes"
    provenance "Q-2"
  ]
  edge [
    source 49
    target 32
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 50
    target 29
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 51
    target 33
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 52
    target 34
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 53
    target 14
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 54
    target 29
    label "establishes"
    provenance "Q-7"
  ]
  edge [
    source 55
    target 36
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 56
    target 30
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 57
    target 15
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 58
    target 26
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 59
    target 27
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 60
    target 13
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 61
    target 19
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 62
    target 22
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 63
    target 24
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 64
    target 21
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 65
    target 23
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 66
    target 25
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 3
    target 38
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 39
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 40
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 41
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 42
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 4
    target 43
    label "includes"
    provenance "Q-2"
  ]
  edge [
    source 4
    target 44
    label "includes"
    provenance "Q-2"
  ]
  edge [
    source 4
    target 45
    label "includes"
    provenance "Q-2"
  ]
  edge [
    source 4
    target 46
    label "includes"
    provenance "Q-2"
  ]
  edge [
    source 4
    target 47
    label "includes"
    provenance "Q-2"
  ]
  edge [
    source 4
    target 48
    label "includes"
    provenance "Q-2"
  ]
  edge [
    source 5
    target 49
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 50
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 51
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 52
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 53
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 54
    label "includes"
    provenance "Q-7"
  ]
  edge [
    source 6
    target 55
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 6
    target 56
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 6
    target 57
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 6
    target 58
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 6
    target 59
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 6
    target 60
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 6
    target 61
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 7
    target 62
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 63
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 64
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 65
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 66
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 0
    target 3
    label "performs"
    provenance "seed"
  ]
  edge [
    source 0
    target 4
    label "performs"
    provenance "seed"
  ]
  edge [
    source 0
    target 5
    label "performs"
    provenance "seed"
  ]
  edge [
    source 0
    target 6
    label "performs"
    provenance "seed"
  ]
  edge [
    source 2
    target 7
    label "performs"
    provenance "seed"
  ]
  edge [
    source 3
    target 16
    label "requires"
    provenance "seed"
  ]
  edge [
    source 4
    target 18
    label "requires"
    provenance "seed"
  ]
  edge [
    source 5
    target 29
    label "requires"
    provenance "seed"
  ]
  edge [
    source 6
    target 19
    label "requires"
    provenance "seed"
  ]
  edge [
    source 7
    target 25
    label "requires"
    provenance "seed"
  ]
  edge [
    source 38
    target 17
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 39
    target 37
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 40
    target 28
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 41
    target 31
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 42
    target 9
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 43
    target 16
    label "requires"
    provenance "Q-2"
  ]
  edge [
    source 44
    target 8
    label "requires"
    provenance "Q-2"
  ]
  edge [
    source 45
    target 20
    label "requires"
    provenance "Q-2"
  ]
  edge [
    source 46
    target 12
    label "requires"
    provenance "Q-2"
  ]
  edge [
    source 47
    target 11
    label "requires"
    provenance "Q-2"
  ]
  edge [
    source 48
    target 10
    label "requires"
    provenance "Q-2"
  ]
  edge [
    source 49
    target 18
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 50
    target 32
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 51
    target 32
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 52
    target 33
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 53
    target 34
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 54
    target 14
    label "requires"
    provenance "Q-7"
  ]
  edge [
    source 55
    target 16
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 56
    target 36
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 57
    target 30
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 58
    target 15
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 59
    target 26
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 60
    target 27
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 61
    target 13
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 62
    target 19
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 63
    target 22
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 64
    target 24
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 65
    target 21
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 66
    target 23
    label "requires"
    provenance "Q-5"
  ]
]
