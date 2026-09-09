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
    label "Q:how:UC-E1-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;renderer; scene; EXPOSURE&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E1-1"
  ]
  node [
    id 9
    label "Q:how:UC-E1-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;makeShip; SHIP_TEX; SHIP_R&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E1-2"
  ]
  node [
    id 10
    label "Q:how:UC-E1-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;frame; step&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E1-3"
  ]
  node [
    id 11
    label "Q:how:UC-E1-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;THRUST; DRAG; VMAX; YAW_RATE; PITCH_RATE&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E1-4"
  ]
  node [
    id 12
    label "Q:how:UC-E1-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;CAM_BACK; CAM_AHEAD; CAM_LAG; CAM_UP&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E1-5"
  ]
  node [
    id 13
    label "Q:how:UC-E2-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;makeMiningBelt; spawnAsteroid; AST_MAX; AST_KEEP; ROCK_POOLS&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E2-1"
  ]
  node [
    id 14
    label "Q:how:UC-E2-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;AST_CELL; AST_GRID_EVERY&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E2-2"
  ]
  node [
    id 15
    label "Q:how:UC-E2-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;destroyAsteroid; AST_SPLIT_MIN; AST_SPLIT_MAX; AST_CHILD_FRAC; AST_SPLIT_KICK&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E2-3"
  ]
  node [
    id 16
    label "Q:how:UC-E2-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;spawnGem; GEM_CREDIT_PER_SCALE; GEM_LIFE&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E2-4"
  ]
  node [
    id 17
    label "Q:how:UC-E2-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;magnetFor; GEM_MAGNET; GEM_PICK_R; GEM_GRAB_R&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E2-5"
  ]
  node [
    id 18
    label "Q:how:UC-E2-6"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gemBarAdd; GEM_BAR_MAX; GEM_BAR_RATE; GEM_PTS_CAP&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E2-6"
  ]
  node [
    id 19
    label "Q:how:UC-E3-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;spendStat; STAT_ORDER; STAT_GAIN; STAT_MAX&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-1"
  ]
  node [
    id 20
    label "Q:how:UC-E3-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;statMult&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-2"
  ]
  node [
    id 21
    label "Q:how:UC-E3-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;tierUpReady; TIER_UP; STAT_MAX&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-3"
  ]
  node [
    id 22
    label "Q:how:UC-E3-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;nextTierHull; hullTierIdx; HULL_ORDER_ORIGINAL&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-4"
  ]
  node [
    id 23
    label "Q:how:UC-E3-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;takeTierUp&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-5"
  ]
  node [
    id 24
    label "Q:how:UC-E3-6"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;HULLS; shieldMaxFor&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-6"
  ]
  node [
    id 25
    label "Q:how:UC-E4-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;capMaxFor; LASER_CAP_MAX; LASER_CAP_REGEN; LASER_CAP_PER_SHOT&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-1"
  ]
  node [
    id 26
    label "Q:how:UC-E4-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;BULLET_SPEED; BULLET_LIFE; MUZZLE_OFF&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-2"
  ]
  node [
    id 27
    label "Q:how:UC-E4-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;BULLET_DMG; BULLET_R; WEAPONS; statMult&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-3"
  ]
  node [
    id 28
    label "Q:how:UC-E4-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;drainShield; shieldArcMaxFor&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-4"
  ]
  node [
    id 29
    label "Q:how:UC-E4-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;killShip; killByShip&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-5"
  ]
  node [
    id 30
    label "Q:how:UC-E4-6"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;spillGems&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-6"
  ]
  node [
    id 31
    label "Q:how:UC-E4-7"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;RESPAWN_DELAY&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-7"
  ]
  node [
    id 32
    label "Q:how:UC-E5-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gatherSaveState&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-1"
  ]
  node [
    id 33
    label "Q:how:UC-E5-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;SAVE_KEY; persist&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-2"
  ]
  node [
    id 34
    label "Q:how:UC-E5-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;SAVE_INTERVAL_S&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-3"
  ]
  node [
    id 35
    label "Q:how:UC-E5-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;applySaveState&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-4"
  ]
  node [
    id 36
    label "Q:how:UC-E5-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;SCORE_W&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-5"
  ]
  node [
    id 37
    label "Q:what:UC-E1-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:world_built&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-1"
  ]
  node [
    id 38
    label "Q:what:UC-E1-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_exists&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-2"
  ]
  node [
    id 39
    label "Q:what:UC-E1-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:sim_running&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-3"
  ]
  node [
    id 40
    label "Q:what:UC-E1-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:controls_live&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-4"
  ]
  node [
    id 41
    label "Q:what:UC-E1-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_flight&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-5"
  ]
  node [
    id 42
    label "Q:what:UC-E2-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:belt_exists&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-1"
  ]
  node [
    id 43
    label "Q:what:UC-E2-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:rock_in_range&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-2"
  ]
  node [
    id 44
    label "Q:what:UC-E2-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_loose&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-3"
  ]
  node [
    id 45
    label "Q:what:UC-E2-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gem_pickable&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-4"
  ]
  node [
    id 46
    label "Q:what:UC-E2-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gem_in_hold&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-5"
  ]
  node [
    id 47
    label "Q:what:UC-E2-6"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:point_banked&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-6"
  ]
  node [
    id 48
    label "Q:what:UC-E3-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:stat_raised&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-1"
  ]
  node [
    id 49
    label "Q:what:UC-E3-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_stronger&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-2"
  ]
  node [
    id 50
    label "Q:what:UC-E3-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:stats_maxed&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-3"
  ]
  node [
    id 51
    label "Q:what:UC-E3-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:tier_offered&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-4"
  ]
  node [
    id 52
    label "Q:what:UC-E3-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:hull_swapped&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-5"
  ]
  node [
    id 53
    label "Q:what:UC-E3-6"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_stronger&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-6"
  ]
  node [
    id 54
    label "Q:what:UC-E4-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:weapon_ready&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-1"
  ]
  node [
    id 55
    label "Q:what:UC-E4-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:shot_in_flight&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-2"
  ]
  node [
    id 56
    label "Q:what:UC-E4-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_combat&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-3"
  ]
  node [
    id 57
    label "Q:what:UC-E4-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:shield_stripped&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-4"
  ]
  node [
    id 58
    label "Q:what:UC-E4-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_dead&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-5"
  ]
  node [
    id 59
    label "Q:what:UC-E4-6"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_spilled&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-6"
  ]
  node [
    id 60
    label "Q:what:UC-E4-7"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:respawned&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-7"
  ]
  node [
    id 61
    label "Q:what:UC-E5-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_gathered&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-1"
  ]
  node [
    id 62
    label "Q:what:UC-E5-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_written&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-2"
  ]
  node [
    id 63
    label "Q:what:UC-E5-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_current&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-3"
  ]
  node [
    id 64
    label "Q:what:UC-E5-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_restored&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-4"
  ]
  node [
    id 65
    label "Q:what:UC-E5-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:session_recorded&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-5"
  ]
  node [
    id 66
    label "Q:when:UC-E1-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:page_open&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-1"
  ]
  node [
    id 67
    label "Q:when:UC-E1-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:world_built&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-2"
  ]
  node [
    id 68
    label "Q:when:UC-E1-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_exists&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-3"
  ]
  node [
    id 69
    label "Q:when:UC-E1-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:sim_running&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-4"
  ]
  node [
    id 70
    label "Q:when:UC-E1-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:controls_live&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-5"
  ]
  node [
    id 71
    label "Q:when:UC-E2-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_flight&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-1"
  ]
  node [
    id 72
    label "Q:when:UC-E2-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:belt_exists&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-2"
  ]
  node [
    id 73
    label "Q:when:UC-E2-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:rock_in_range&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-3"
  ]
  node [
    id 74
    label "Q:when:UC-E2-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_loose&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-4"
  ]
  node [
    id 75
    label "Q:when:UC-E2-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gem_pickable&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-5"
  ]
  node [
    id 76
    label "Q:when:UC-E2-6"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gem_in_hold&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-6"
  ]
  node [
    id 77
    label "Q:when:UC-E3-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:point_banked&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-1"
  ]
  node [
    id 78
    label "Q:when:UC-E3-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:stat_raised&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-2"
  ]
  node [
    id 79
    label "Q:when:UC-E3-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:stat_raised&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-3"
  ]
  node [
    id 80
    label "Q:when:UC-E3-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:stats_maxed&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-4"
  ]
  node [
    id 81
    label "Q:when:UC-E3-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:tier_offered&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-5"
  ]
  node [
    id 82
    label "Q:when:UC-E3-6"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:hull_swapped&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-6"
  ]
  node [
    id 83
    label "Q:when:UC-E4-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_flight&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-1"
  ]
  node [
    id 84
    label "Q:when:UC-E4-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:weapon_ready&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-2"
  ]
  node [
    id 85
    label "Q:when:UC-E4-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:shot_in_flight&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-3"
  ]
  node [
    id 86
    label "Q:when:UC-E4-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_combat&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-4"
  ]
  node [
    id 87
    label "Q:when:UC-E4-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:shield_stripped&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-5"
  ]
  node [
    id 88
    label "Q:when:UC-E4-6"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_dead&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-6"
  ]
  node [
    id 89
    label "Q:when:UC-E4-7"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_spilled&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-7"
  ]
  node [
    id 90
    label "Q:when:UC-E5-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:respawned&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-1"
  ]
  node [
    id 91
    label "Q:when:UC-E5-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_gathered&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-2"
  ]
  node [
    id 92
    label "Q:when:UC-E5-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_written&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-3"
  ]
  node [
    id 93
    label "Q:when:UC-E5-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_current&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-4"
  ]
  node [
    id 94
    label "Q:when:UC-E5-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:save_restored&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-5"
  ]
  node [
    id 95
    label "Q:where:UC-E1-1"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E1-1"
  ]
  node [
    id 96
    label "Q:where:UC-E1-2"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E1-2"
  ]
  node [
    id 97
    label "Q:where:UC-E1-3"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E1-3"
  ]
  node [
    id 98
    label "Q:where:UC-E1-4"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E1-4"
  ]
  node [
    id 99
    label "Q:where:UC-E1-5"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E1-5"
  ]
  node [
    id 100
    label "Q:where:UC-E2-1"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E2-1"
  ]
  node [
    id 101
    label "Q:where:UC-E2-2"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E2-2"
  ]
  node [
    id 102
    label "Q:where:UC-E2-3"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E2-3"
  ]
  node [
    id 103
    label "Q:where:UC-E2-4"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E2-4"
  ]
  node [
    id 104
    label "Q:where:UC-E2-5"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E2-5"
  ]
  node [
    id 105
    label "Q:where:UC-E2-6"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E2-6"
  ]
  node [
    id 106
    label "Q:where:UC-E3-1"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E3-1"
  ]
  node [
    id 107
    label "Q:where:UC-E3-2"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E3-2"
  ]
  node [
    id 108
    label "Q:where:UC-E3-3"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E3-3"
  ]
  node [
    id 109
    label "Q:where:UC-E3-4"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E3-4"
  ]
  node [
    id 110
    label "Q:where:UC-E3-5"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E3-5"
  ]
  node [
    id 111
    label "Q:where:UC-E3-6"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E3-6"
  ]
  node [
    id 112
    label "Q:where:UC-E4-1"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-1"
  ]
  node [
    id 113
    label "Q:where:UC-E4-2"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-2"
  ]
  node [
    id 114
    label "Q:where:UC-E4-3"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-3"
  ]
  node [
    id 115
    label "Q:where:UC-E4-4"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-4"
  ]
  node [
    id 116
    label "Q:where:UC-E4-5"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-5"
  ]
  node [
    id 117
    label "Q:where:UC-E4-6"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-6"
  ]
  node [
    id 118
    label "Q:where:UC-E4-7"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E4-7"
  ]
  node [
    id 119
    label "Q:where:UC-E5-1"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E5-1"
  ]
  node [
    id 120
    label "Q:where:UC-E5-2"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E5-2"
  ]
  node [
    id 121
    label "Q:where:UC-E5-3"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E5-3"
  ]
  node [
    id 122
    label "Q:where:UC-E5-4"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E5-4"
  ]
  node [
    id 123
    label "Q:where:UC-E5-5"
    kind "question"
    name "WHERE: Where in the system does this happen, and what is it inside?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Where in the system does this happen, and what is it inside?"
    good_answer "the EPIC it belongs to, and the boundary or surface it acts on"
    interrogative "where"
    subject "UC-E5-5"
  ]
  node [
    id 124
    label "Q:who:UC-E1-1"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E1-1"
  ]
  node [
    id 125
    label "Q:who:UC-E1-2"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E1-2"
  ]
  node [
    id 126
    label "Q:who:UC-E1-3"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E1-3"
  ]
  node [
    id 127
    label "Q:who:UC-E1-4"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E1-4"
  ]
  node [
    id 128
    label "Q:who:UC-E1-5"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E1-5"
  ]
  node [
    id 129
    label "Q:who:UC-E2-1"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E2-1"
  ]
  node [
    id 130
    label "Q:who:UC-E2-2"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E2-2"
  ]
  node [
    id 131
    label "Q:who:UC-E2-3"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E2-3"
  ]
  node [
    id 132
    label "Q:who:UC-E2-4"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E2-4"
  ]
  node [
    id 133
    label "Q:who:UC-E2-5"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E2-5"
  ]
  node [
    id 134
    label "Q:who:UC-E2-6"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E2-6"
  ]
  node [
    id 135
    label "Q:who:UC-E3-1"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E3-1"
  ]
  node [
    id 136
    label "Q:who:UC-E3-2"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E3-2"
  ]
  node [
    id 137
    label "Q:who:UC-E3-3"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E3-3"
  ]
  node [
    id 138
    label "Q:who:UC-E3-4"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E3-4"
  ]
  node [
    id 139
    label "Q:who:UC-E3-5"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E3-5"
  ]
  node [
    id 140
    label "Q:who:UC-E3-6"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E3-6"
  ]
  node [
    id 141
    label "Q:who:UC-E4-1"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-1"
  ]
  node [
    id 142
    label "Q:who:UC-E4-2"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-2"
  ]
  node [
    id 143
    label "Q:who:UC-E4-3"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-3"
  ]
  node [
    id 144
    label "Q:who:UC-E4-4"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-4"
  ]
  node [
    id 145
    label "Q:who:UC-E4-5"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-5"
  ]
  node [
    id 146
    label "Q:who:UC-E4-6"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-6"
  ]
  node [
    id 147
    label "Q:who:UC-E4-7"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:pilot&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E4-7"
  ]
  node [
    id 148
    label "Q:who:UC-E5-1"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:system&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-1"
  ]
  node [
    id 149
    label "Q:who:UC-E5-2"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:system&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-2"
  ]
  node [
    id 150
    label "Q:who:UC-E5-3"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:system&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-3"
  ]
  node [
    id 151
    label "Q:who:UC-E5-4"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:system&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-4"
  ]
  node [
    id 152
    label "Q:who:UC-E5-5"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:system&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-5"
  ]
  node [
    id 153
    label "Q:why:UC-E1-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-2 cannot run until 'a world exists to fly in' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-1"
  ]
  node [
    id 154
    label "Q:why:UC-E1-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-3 cannot run until 'the pilot has a ship in that world' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-2"
  ]
  node [
    id 155
    label "Q:why:UC-E1-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-4 cannot run until 'the simulation is stepping' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-3"
  ]
  node [
    id 156
    label "Q:why:UC-E1-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-5 cannot run until 'the controls answer the pilot' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-4"
  ]
  node [
    id 157
    label "Q:why:UC-E1-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-1&quot;, &quot;UC-E4-1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-1, UC-E4-1 cannot run until 'the pilot is flying and in control' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-5"
  ]
  node [
    id 158
    label "Q:why:UC-E2-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-2 cannot run until 'a belt of rocks exists' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-1"
  ]
  node [
    id 159
    label "Q:why:UC-E2-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-3 cannot run until 'a rock is within reach' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-2"
  ]
  node [
    id 160
    label "Q:why:UC-E2-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-4 cannot run until 'gems are loose in the world' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-3"
  ]
  node [
    id 161
    label "Q:why:UC-E2-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-5 cannot run until 'a gem can be picked up' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-4"
  ]
  node [
    id 162
    label "Q:why:UC-E2-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-6&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-6 cannot run until 'gem credits are in the hold' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-5"
  ]
  node [
    id 163
    label "Q:why:UC-E2-6"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-1 cannot run until 'the pilot is owed at least one upgrade point' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-6"
  ]
  node [
    id 164
    label "Q:why:UC-E3-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-2&quot;, &quot;UC-E3-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-2, UC-E3-3 cannot run until 'at least one stat is above zero' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-1"
  ]
  node [
    id 165
    label "Q:why:UC-E3-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;E3 declares it ends with 'the ship is measurably better than it was' true, and this is the beat that reaches it&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-2"
  ]
  node [
    id 166
    label "Q:why:UC-E3-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-4 cannot run until 'every stat is at its cap' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-3"
  ]
  node [
    id 167
    label "Q:why:UC-E3-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-5 cannot run until 'a next hull is on offer' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-4"
  ]
  node [
    id 168
    label "Q:why:UC-E3-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-6&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-6 cannot run until 'the ship is flying a new frame' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-5"
  ]
  node [
    id 169
    label "Q:why:UC-E3-6"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;E3 declares it ends with 'the ship is measurably better than it was' true, and this is the beat that reaches it&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-6"
  ]
  node [
    id 170
    label "Q:why:UC-E4-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-2 cannot run until 'the ship can fire' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-1"
  ]
  node [
    id 171
    label "Q:why:UC-E4-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-3 cannot run until 'a shot is travelling' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-2"
  ]
  node [
    id 172
    label "Q:why:UC-E4-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-4 cannot run until 'damage is being exchanged' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-3"
  ]
  node [
    id 173
    label "Q:why:UC-E4-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-5 cannot run until 'a shield arc is down' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-4"
  ]
  node [
    id 174
    label "Q:why:UC-E4-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-6&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-6 cannot run until \&quot;the pilot's ship is destroyed\&quot; holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-5"
  ]
  node [
    id 175
    label "Q:why:UC-E4-6"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-7&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-7 cannot run until 'the hold is on the floor' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-6"
  ]
  node [
    id 176
    label "Q:why:UC-E4-7"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-1 cannot run until 'the pilot is flying again after dying' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-7"
  ]
  node [
    id 177
    label "Q:why:UC-E5-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-2 cannot run until 'a snapshot of the run exists' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-1"
  ]
  node [
    id 178
    label "Q:why:UC-E5-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-3 cannot run until 'the snapshot is in storage' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-2"
  ]
  node [
    id 179
    label "Q:why:UC-E5-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-4 cannot run until 'the stored snapshot is no more than one interval old' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-3"
  ]
  node [
    id 180
    label "Q:why:UC-E5-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-5 cannot run until 'a returning pilot has their ship back' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-4"
  ]
  node [
    id 181
    label "Q:why:UC-E5-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;E5 declares it ends with 'the run is over and what happened is on record' true, and this is the beat that reaches it&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-5"
  ]
  node [
    id 182
    label "S:belt_exists"
    kind "state"
    name "a belt of rocks exists"
    provenance "Q-29"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
  ]
  node [
    id 183
    label "S:controls_live"
    kind "state"
    name "the controls answer the pilot"
    provenance "Q-28"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
  ]
  node [
    id 184
    label "S:gem_in_hold"
    kind "state"
    name "gem credits are in the hold"
    provenance "Q-29"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
  ]
  node [
    id 185
    label "S:gem_pickable"
    kind "state"
    name "a gem can be picked up"
    provenance "Q-29"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
  ]
  node [
    id 186
    label "S:gems_loose"
    kind "state"
    name "gems are loose in the world"
    provenance "Q-29"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
  ]
  node [
    id 187
    label "S:gems_spilled"
    kind "state"
    name "the hold is on the floor"
    provenance "Q-33"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
  ]
  node [
    id 188
    label "S:hull_swapped"
    kind "state"
    name "the ship is flying a new frame"
    provenance "Q-30"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
  ]
  node [
    id 189
    label "S:in_combat"
    kind "state"
    name "damage is being exchanged"
    provenance "Q-33"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
  ]
  node [
    id 190
    label "S:in_flight"
    kind "state"
    name "the pilot is flying and in control"
    provenance "seed"
  ]
  node [
    id 191
    label "S:page_open"
    kind "state"
    name "the page is open and nothing has started"
    provenance "seed"
  ]
  node [
    id 192
    label "S:point_banked"
    kind "state"
    name "the pilot is owed at least one upgrade point"
    provenance "seed"
  ]
  node [
    id 193
    label "S:respawned"
    kind "state"
    name "the pilot is flying again after dying"
    provenance "seed"
  ]
  node [
    id 194
    label "S:rock_in_range"
    kind "state"
    name "a rock is within reach"
    provenance "Q-29"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
  ]
  node [
    id 195
    label "S:save_current"
    kind "state"
    name "the stored snapshot is no more than one interval old"
    provenance "Q-32"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
  ]
  node [
    id 196
    label "S:save_gathered"
    kind "state"
    name "a snapshot of the run exists"
    provenance "Q-32"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
  ]
  node [
    id 197
    label "S:save_restored"
    kind "state"
    name "a returning pilot has their ship back"
    provenance "Q-32"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
  ]
  node [
    id 198
    label "S:save_written"
    kind "state"
    name "the snapshot is in storage"
    provenance "Q-32"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
  ]
  node [
    id 199
    label "S:session_recorded"
    kind "state"
    name "the run is over and what happened is on record"
    provenance "seed"
  ]
  node [
    id 200
    label "S:shield_stripped"
    kind "state"
    name "a shield arc is down"
    provenance "Q-33"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
  ]
  node [
    id 201
    label "S:ship_dead"
    kind "state"
    name "the pilot's ship is destroyed"
    provenance "Q-33"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
  ]
  node [
    id 202
    label "S:ship_exists"
    kind "state"
    name "the pilot has a ship in that world"
    provenance "seed"
  ]
  node [
    id 203
    label "S:ship_stronger"
    kind "state"
    name "the ship is measurably better than it was"
    provenance "seed"
  ]
  node [
    id 204
    label "S:shot_in_flight"
    kind "state"
    name "a shot is travelling"
    provenance "Q-33"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
  ]
  node [
    id 205
    label "S:sim_running"
    kind "state"
    name "the simulation is stepping"
    provenance "Q-28"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
  ]
  node [
    id 206
    label "S:stat_raised"
    kind "state"
    name "at least one stat is above zero"
    provenance "Q-30"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
  ]
  node [
    id 207
    label "S:stats_maxed"
    kind "state"
    name "every stat is at its cap"
    provenance "Q-30"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
  ]
  node [
    id 208
    label "S:tier_offered"
    kind "state"
    name "a next hull is on offer"
    provenance "Q-30"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
  ]
  node [
    id 209
    label "S:under_fire"
    kind "state"
    name "something is shooting at the pilot"
    provenance "seed"
  ]
  node [
    id 210
    label "S:weapon_ready"
    kind "state"
    name "the ship can fire"
    provenance "Q-33"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
  ]
  node [
    id 211
    label "S:world_built"
    kind "state"
    name "a world exists to fly in"
    provenance "seed"
  ]
  node [
    id 212
    label "UC-E1-1"
    kind "usecase"
    name "The page builds a world to fly in"
    provenance "Q-28"
    acceptance "[&quot;with WebGL unavailable the page reports it rather than showing a blank canvas&quot;, &quot;the renderer is constructed exactly once per page load&quot;]"
    ground "[&quot;renderer&quot;, &quot;scene&quot;, &quot;EXPOSURE&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
    status "HAVE"
    story "Opening the page constructs a WebGL renderer and a scene. Until this exists there is no space, no ship, nothing to look at."
  ]
  node [
    id 213
    label "UC-E1-2"
    kind "usecase"
    name "The game gives the pilot a ship"
    provenance "Q-28"
    acceptance "[&quot;ships[0] exists with role 'player' after load&quot;, &quot;the ship has a non-zero collision radius, so it can be hit&quot;]"
    ground "[&quot;makeShip&quot;, &quot;SHIP_TEX&quot;, &quot;SHIP_R&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
    status "HAVE"
    story "A ship is built for the player and placed in the world with a hull, a texture and a collision radius."
  ]
  node [
    id 214
    label "UC-E1-3"
    kind "usecase"
    name "The simulation advances every frame"
    provenance "Q-28"
    acceptance "[&quot;a frame gap longer than 50ms is clamped rather than integrated whole&quot;, &quot;pausing and resuming the tab does not move the ship&quot;]"
    ground "[&quot;frame&quot;, &quot;step&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
    status "HAVE"
    story "A frame loop runs, clamps the timestep so a stalled tab cannot teleport the world, and steps the simulation."
  ]
  node [
    id 215
    label "UC-E1-4"
    kind "usecase"
    name "The pilot's controls move the ship"
    provenance "Q-28"
    acceptance "[&quot;holding thrust raises speed until it plateaus at VMAX, not beyond&quot;, &quot;releasing thrust decays speed rather than stopping dead&quot;]"
    ground "[&quot;THRUST&quot;, &quot;DRAG&quot;, &quot;VMAX&quot;, &quot;YAW_RATE&quot;, &quot;PITCH_RATE&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
    status "HAVE"
    story "Thrust, yaw and pitch answer the keyboard, bounded by drag and a maximum speed, so the ship is flyable rather than merely present."
  ]
  node [
    id 216
    label "UC-E1-5"
    kind "usecase"
    name "The pilot can see where the ship is going"
    provenance "Q-28"
    acceptance "[&quot;the camera sits behind and above the ship at rest&quot;, &quot;a hard turn moves the camera smoothly, with no instantaneous jump&quot;]"
    ground "[&quot;CAM_BACK&quot;, &quot;CAM_AHEAD&quot;, &quot;CAM_LAG&quot;, &quot;CAM_UP&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Arrive and fly' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Five links from an open page to a ship the pilot is actually flying: a world, a ship in it, a clock, controls that answer, and a viewpoint. Each is the precondition of the next, so nothing here is reorderable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-28&quot;}"
    status "HAVE"
    story "A chase camera trails the ship, leads it slightly, and lags rather than snapping, so the pilot has a usable frame of reference."
  ]
  node [
    id 217
    label "UC-E2-1"
    kind "usecase"
    name "The system populates a belt with rocks"
    provenance "Q-29"
    acceptance "[&quot;the field holds rocks up to AST_MAX and never more&quot;, &quot;rocks are drawn from instanced pools, not one mesh each&quot;]"
    ground "[&quot;makeMiningBelt&quot;, &quot;spawnAsteroid&quot;, &quot;AST_MAX&quot;, &quot;AST_KEEP&quot;, &quot;ROCK_POOLS&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
    status "HAVE"
    story "A mining belt is seeded with instanced asteroids, capped so the field is dense without becoming thousands of draw calls."
  ]
  node [
    id 218
    label "UC-E2-2"
    kind "usecase"
    name "The system finds the rocks near the pilot cheaply"
    provenance "Q-29"
    acceptance "[&quot;collision testing does not scan every rock each frame&quot;, &quot;a rock marked gone is skipped by the near-query rather than returned&quot;]"
    ground "[&quot;AST_CELL&quot;, &quot;AST_GRID_EVERY&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
    status "HAVE"
    story "A spatial hash rebuilt every few frames answers 'what is near me' without scanning the field, which is what makes a belt of thousands testable every frame."
  ]
  node [
    id 219
    label "UC-E2-3"
    kind "usecase"
    name "The pilot breaks a rock apart"
    provenance "Q-29"
    acceptance "[&quot;a destroyed rock above the no-split size yields between AST_SPLIT_MIN and AST_SPLIT_MAX children&quot;, &quot;the children move apart rather than sitting inside each other&quot;]"
    ground "[&quot;destroyAsteroid&quot;, &quot;AST_SPLIT_MIN&quot;, &quot;AST_SPLIT_MAX&quot;, &quot;AST_CHILD_FRAC&quot;, &quot;AST_SPLIT_KICK&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
    status "HAVE"
    story "A rock that takes enough damage is destroyed, splitting into smaller children carrying a fraction of its size and a kick outward."
  ]
  node [
    id 220
    label "UC-E2-4"
    kind "usecase"
    name "Broken rock leaves gems in the world"
    provenance "Q-29"
    acceptance "[&quot;a bigger rock yields gems worth more credits than a smaller one&quot;, &quot;an uncollected gem disappears after GEM_LIFE seconds&quot;]"
    ground "[&quot;spawnGem&quot;, &quot;GEM_CREDIT_PER_SCALE&quot;, &quot;GEM_LIFE&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
    status "HAVE"
    story "The pieces spawn as physical gem pickups whose credit value scales with the size of the rock they came from, and which expire if nobody takes them."
  ]
  node [
    id 221
    label "UC-E2-5"
    kind "usecase"
    name "The pilot scoops a gem"
    provenance "Q-29"
    acceptance "[&quot;a gem inside the magnet radius moves toward the ship without an exact pass-over&quot;, &quot;the magnet radius grows when the relevant upgrade is bought&quot;]"
    ground "[&quot;magnetFor&quot;, &quot;GEM_MAGNET&quot;, &quot;GEM_PICK_R&quot;, &quot;GEM_GRAB_R&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
    status "HAVE"
    story "Flying near a gem collects it, with a magnet radius that widens as the ship is upgraded, so collection is a flight skill rather than a pixel-hunt."
  ]
  node [
    id 222
    label "UC-E2-6"
    kind "usecase"
    name "Collected credits bank an upgrade point"
    provenance "Q-29"
    acceptance "[&quot;GEM_BAR_MAX credits collected converts to exactly one banked point&quot;, &quot;only the player's ship banks points; an AI ship collecting gems banks none&quot;, &quot;banked points stop accumulating at GEM_PTS_CAP&quot;]"
    ground "[&quot;gemBarAdd&quot;, &quot;GEM_BAR_MAX&quot;, &quot;GEM_BAR_RATE&quot;, &quot;GEM_PTS_CAP&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The epic's own sentence, one beat per clause: a field exists, you can find a rock in it, you break it, it leaves gems, you scoop them, the bar banks a point. The two system-side beats are in the chain because without them the pilot-side beats have nothing to act on.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-29&quot;}"
    status "HAVE"
    story "Gem credits fill a bar; each time it fills it converts into one banked upgrade point, up to a cap."
  ]
  node [
    id 223
    label "UC-E3-1"
    kind "usecase"
    name "The pilot spends a point on one of eight stats"
    provenance "Q-30"
    acceptance "[&quot;spending on an unknown stat name is refused with the list of real ones&quot;, &quot;a stat already at STAT_MAX refuses further points rather than consuming them&quot;]"
    ground "[&quot;spendStat&quot;, &quot;STAT_ORDER&quot;, &quot;STAT_GAIN&quot;, &quot;STAT_MAX&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
    status "HAVE"
    story "A banked point goes into one of eight named stats, in flight, each capped so no single stat absorbs the whole run."
  ]
  node [
    id 224
    label "UC-E3-2"
    kind "usecase"
    name "Each point visibly changes how the ship performs"
    provenance "Q-30"
    acceptance "[&quot;raising speed increases the ship's achieved velocity in flight&quot;, &quot;a stat at zero leaves its multiplier at exactly 1.0&quot;]"
    ground "[&quot;statMult&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
    status "HAVE"
    story "A stat is a multiplier the simulation actually reads, so a point spent is felt rather than merely displayed."
  ]
  node [
    id 225
    label "UC-E3-3"
    kind "usecase"
    name "Maxing every stat arms the trade-in"
    provenance "Q-30"
    acceptance "[&quot;with seven stats maxed the tier-up is not offered&quot;, &quot;with eight maxed and no banked point the tier-up is not offered&quot;]"
    ground "[&quot;tierUpReady&quot;, &quot;TIER_UP&quot;, &quot;STAT_MAX&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
    status "HAVE"
    story "Only when all eight stats are at their cap, with a further point banked, does the ship become eligible for the next hull."
  ]
  node [
    id 226
    label "UC-E3-4"
    kind "usecase"
    name "The game names the hull that comes next"
    provenance "Q-30"
    acceptance "[&quot;a ship at the top of the ladder is offered nothing&quot;, &quot;a generated hull is placed at its size tier's rank rather than off the ladder&quot;]"
    ground "[&quot;nextTierHull&quot;, &quot;hullTierIdx&quot;, &quot;HULL_ORDER_ORIGINAL&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
    status "HAVE"
    story "The ladder of hulls is a fixed order, and the ship's current class determines exactly which one is on offer."
  ]
  node [
    id 227
    label "UC-E3-5"
    kind "usecase"
    name "Taking the new hull costs every upgrade bought"
    provenance "Q-30"
    acceptance "[&quot;after a tier-up every stat reads zero&quot;, &quot;refusing the tier-up leaves the current hull and stats untouched&quot;]"
    ground "[&quot;takeTierUp&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the point, or save for the hull' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The decision the epic describes has two arms off one point: spend it now and get stronger immediately, or bank toward a maxed ship and trade the whole thing in. Both arms are in the chain, because the choice only exists if both are reachable.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-30&quot;}"
    status "HAVE"
    story "Accepting the trade-in swaps the frame and resets all eight stats to zero, which is what makes holding out a real decision rather than a free reward."
  ]
  node [
    id 228
    label "UC-E3-6"
    kind "usecase"
    name "The traded-up frame outperforms the one it replaced"
    provenance "Q-67"
    acceptance "[&quot;a ship one tier up, with all stats at zero, has a higher base shield capacity than a maxed ship of the tier below&quot;, &quot;each entry in HULLS declares its own capacities rather than inheriting one shared set&quot;, &quot;the balance law the table states -- bigger hold means thinner armour and lower speed -- holds between adjacent tiers, so the trade is a trade and not a strict gain&quot;]"
    ground "[&quot;HULLS&quot;, &quot;shieldMaxFor&quot;]"
    rationale "{&quot;ask&quot;: &quot;'Taking the new hull costs every upgrade bought' establishes 'the ship is flying a new frame' (S:hull_swapped), and no use case requires it and no epic ends on it. Either name the use case that consumes it, or say the postcondition is wrong. A state nothing needs is either a missing beat or a false claim about what this use case is for.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The gap is real and it is the interesting one in this epic. E3 forks: spend the point now (UC-E3-1 -> UC-E3-2 -> ship_stronger) or bank toward a maxed ship and trade the frame in (UC-E3-3 -> UC-E3-4 -> UC-E3-5 -> hull_swapped). The first arm rejoined the story and the second did not, which means the model was asserting that trading in your ship leaves you no better off. A use case is missing: the one that says the new frame is worth what it cost. HULLS is the table that carries each frame's own capacity, and it is what makes the claim checkable rather than a promise.&quot;, &quot;kind&quot;: &quot;DANGLING_POSTCONDITION&quot;, &quot;question&quot;: &quot;Q-67&quot;}"
    status "HAVE"
    story "A hull class carries its own capacities, so the frame taken in the trade is materially better than the one given up even with every stat reset to zero. This is what makes the trade-in a decision rather than a punishment, and it is the beat that joins the tier-up arm back to the rest of the story."
  ]
  node [
    id 229
    label "UC-E4-1"
    kind "usecase"
    name "Firing costs energy the pilot cannot spend forever"
    provenance "Q-33"
    acceptance "[&quot;with the capacitor empty the ship cannot fire&quot;, &quot;breaking off refills the capacitor at LASER_CAP_REGEN per second&quot;, &quot;raising energyCap raises the ceiling the capacitor refills to&quot;]"
    ground "[&quot;capMaxFor&quot;, &quot;LASER_CAP_MAX&quot;, &quot;LASER_CAP_REGEN&quot;, &quot;LASER_CAP_PER_SHOT&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "Each shot draws from a capacitor that refills over time, so sustained fire is bounded by a resource rather than by a cooldown alone."
  ]
  node [
    id 230
    label "UC-E4-2"
    kind "usecase"
    name "A shot travels a bounded distance"
    provenance "Q-33"
    acceptance "[&quot;a bullet expires after BULLET_LIFE seconds rather than travelling forever&quot;, &quot;a target beyond BULLET_SPEED times BULLET_LIFE cannot be reached by a direct shot&quot;]"
    ground "[&quot;BULLET_SPEED&quot;, &quot;BULLET_LIFE&quot;, &quot;MUZZLE_OFF&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "A bullet leaves the muzzle at a finite speed and expires after a finite life, which is what gives the weapon a range and makes closing the distance a decision."
  ]
  node [
    id 231
    label "UC-E4-3"
    kind "usecase"
    name "A shot that connects damages what it hit"
    provenance "Q-33"
    acceptance "[&quot;a bullet passing within BULLET_R of a ship registers a hit&quot;, &quot;the interval between shots is the weapon's own cd from the WEAPONS table, divided by the ship's fireRate multiplier, so buying fireRate visibly shortens it&quot;, &quot;two weapon types with different cd values fire at visibly different rates on the same hull&quot;]"
    ground "[&quot;BULLET_DMG&quot;, &quot;BULLET_R&quot;, &quot;WEAPONS&quot;, &quot;statMult&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "Contact applies damage, and the gun cannot fire again until the interval its own weapon type declares has passed, so damage over time is bounded by the weapon and by the pilot's investment in fireRate rather than by how fast a key is pressed."
  ]
  node [
    id 232
    label "UC-E4-4"
    kind "usecase"
    name "Shields take the hit before the hull does"
    provenance "Q-33"
    acceptance "[&quot;a hit from ahead drains the forward arc and leaves the aft arc untouched&quot;, &quot;hull integrity does not fall while the struck arc still has charge&quot;]"
    ground "[&quot;drainShield&quot;, &quot;shieldArcMaxFor&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "Damage is absorbed by a directional shield arc, each arc carrying half the ship's total shield, before any of it reaches the hull."
  ]
  node [
    id 233
    label "UC-E4-5"
    kind "usecase"
    name "A ship that runs out of hull dies"
    provenance "Q-33"
    acceptance "[&quot;a destroyed ship stops being a valid target&quot;, &quot;the killer is credited, so a kill is attributable&quot;]"
    ground "[&quot;killShip&quot;, &quot;killByShip&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "When damage exhausts the hull the ship is destroyed, removed from the fight, and the kill is attributed to whoever landed it."
  ]
  node [
    id 234
    label "UC-E4-6"
    kind "usecase"
    name "Death spills the cargo for anyone to take"
    provenance "Q-33"
    acceptance "[&quot;a pilot dying with credits leaves collectable gems at the wreck&quot;, &quot;a pilot dying with nothing spills nothing&quot;]"
    ground "[&quot;spillGems&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "The credits banked into the hold are dropped into the world on death, so a long uninterrupted run is worth more than the sum of its minutes."
  ]
  node [
    id 235
    label "UC-E4-7"
    kind "usecase"
    name "The pilot comes back small after a pause"
    provenance "Q-33"
    acceptance "[&quot;respawn does not happen before RESPAWN_DELAY seconds have passed&quot;, &quot;the respawned ship is not the tier that died&quot;]"
    ground "[&quot;RESPAWN_DELAY&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, die, and lose the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E4-2. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name, and the objection was right on inspection: reaching and hurting are two separate constraints. Travel is bounded by BULLET_SPEED and BULLET_LIFE, which is what gives the weapon a range; damage is bounded by BULLET_DMG and FIRE_CD, which is what gives it a rate. Splitting them makes the range constraint testable on its own, so the split is worth having rather than a concession to the checker. Re-answered again after DEAD_CITATION: the first two attempts cited CFG.FIRE_CD for the cooldown, which is declared at index.html:408 and occurs nowhere else in the file. The real gate is the per-weapon cd in the WEAPONS table divided by statMult(s,'fireRate'), so the citation named a constant that governs nothing and the acceptance criterion written against it could never have failed a test, because nothing reads it.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-33&quot;}"
    status "HAVE"
    story "After a delay the pilot respawns without the hull they lost, which is the cost that makes the fight matter."
  ]
  node [
    id 236
    label "UC-E5-1"
    kind "usecase"
    name "The game gathers what is worth keeping"
    provenance "Q-32"
    acceptance "[&quot;the snapshot carries a version field, so an old save is recognisable as old&quot;, &quot;with no player ship the snapshot is refused rather than written empty&quot;]"
    ground "[&quot;gatherSaveState&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
    status "HAVE"
    story "The player's ship, progress and standing are collected into one versioned snapshot."
  ]
  node [
    id 237
    label "UC-E5-2"
    kind "usecase"
    name "The snapshot is written where it can be found again"
    provenance "Q-32"
    acceptance "[&quot;closing and reopening the page finds the previous snapshot&quot;, &quot;a snapshot written under the key replaces the previous one rather than accumulating&quot;]"
    ground "[&quot;SAVE_KEY&quot;, &quot;persist&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
    status "HAVE"
    story "The snapshot is stored under a known key in browser storage, so it survives the page closing."
  ]
  node [
    id 238
    label "UC-E5-3"
    kind "usecase"
    name "The snapshot is kept current, not written only at the end"
    provenance "Q-32"
    acceptance "[&quot;a session ended without a clean exit still restores to within SAVE_INTERVAL_S of where it stopped&quot;]"
    ground "[&quot;SAVE_INTERVAL_S&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
    status "HAVE"
    story "Saving runs on a cadence during play, so an unclean exit costs at most one interval rather than the whole session."
  ]
  node [
    id 239
    label "UC-E5-4"
    kind "usecase"
    name "A returning pilot gets their ship back"
    provenance "Q-32"
    acceptance "[&quot;a snapshot of the wrong version is declined and the pilot starts fresh&quot;, &quot;a restored pilot has the hull and stats they had when the snapshot was taken&quot;]"
    ground "[&quot;applySaveState&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
    status "HAVE"
    story "On load a valid snapshot of the right version is applied; an invalid or older one is declined rather than half-applied."
  ]
  node [
    id 240
    label "UC-E5-5"
    kind "usecase"
    name "The run's standing is a weighted total"
    provenance "Q-32"
    acceptance "[&quot;a run that only mines still produces a non-zero standing&quot;, &quot;two runs with equal credits and different scores are ranked apart&quot;]"
    ground "[&quot;SCORE_W&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The run ends and is remembered' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Persistence as a chain rather than a feature list: gather, write, keep current, restore, score. The cadence beat sits between writing and restoring because a save written only at the end does not survive the way a session actually ends.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-32&quot;}"
    status "HAVE"
    story "Standing combines credits and score under a stated weight rather than counting kills alone, so mining and fighting both register."
  ]
  edge [
    source 37
    target 211
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 38
    target 202
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 39
    target 205
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 40
    target 183
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 41
    target 190
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 42
    target 182
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 43
    target 194
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 44
    target 186
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 45
    target 185
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 46
    target 184
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 47
    target 192
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 48
    target 206
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 49
    target 203
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 50
    target 207
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 51
    target 208
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 52
    target 188
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 53
    target 203
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 54
    target 210
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 55
    target 204
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 56
    target 189
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 57
    target 200
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 58
    target 201
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 59
    target 187
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 60
    target 193
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 61
    target 196
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 62
    target 198
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 63
    target 195
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 64
    target 197
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 65
    target 199
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 66
    target 191
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 67
    target 211
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 68
    target 202
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 69
    target 205
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 70
    target 183
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 71
    target 190
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 72
    target 182
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 73
    target 194
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 74
    target 186
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 75
    target 185
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 76
    target 184
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 77
    target 192
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 78
    target 206
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 79
    target 206
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 80
    target 207
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 81
    target 208
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 82
    target 188
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 83
    target 190
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 84
    target 210
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 85
    target 204
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 86
    target 189
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 87
    target 200
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 88
    target 201
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 89
    target 187
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 90
    target 193
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 91
    target 196
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 92
    target 198
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 93
    target 195
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 94
    target 197
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 95
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 96
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 97
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 98
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 99
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 100
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 101
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 102
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 103
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 104
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 105
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 106
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 107
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 108
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 109
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 110
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 111
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 112
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 113
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 114
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 115
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 116
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 117
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 118
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 119
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 120
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 121
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 122
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 123
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 124
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 125
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 126
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 127
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 128
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 129
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 130
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 131
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 132
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 133
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 134
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 135
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 136
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 137
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 138
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 139
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 140
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 141
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 142
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 143
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 144
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 145
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 146
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 147
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 148
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 149
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 150
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 151
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 152
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 153
    target 213
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 154
    target 214
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 155
    target 215
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 156
    target 216
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 157
    target 217
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 157
    target 229
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 158
    target 218
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 159
    target 219
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 160
    target 220
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 161
    target 221
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 162
    target 222
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 163
    target 223
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 164
    target 224
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 164
    target 225
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 165
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 166
    target 226
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 167
    target 227
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 168
    target 228
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 169
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 170
    target 230
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 171
    target 231
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 172
    target 232
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 173
    target 233
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 174
    target 234
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 175
    target 235
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 176
    target 236
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 177
    target 237
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 178
    target 238
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 179
    target 239
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 180
    target 240
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 181
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 8
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 37
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 66
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 95
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 124
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 153
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 9
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 38
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 67
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 96
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 125
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 154
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 10
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 39
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 68
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 97
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 126
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 155
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 11
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 40
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 69
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 98
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 127
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 156
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 12
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 41
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 70
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 99
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 128
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 157
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 217
    target 13
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 217
    target 42
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 217
    target 71
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 217
    target 100
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 217
    target 129
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 217
    target 158
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 218
    target 14
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 218
    target 43
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 218
    target 72
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 218
    target 101
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 218
    target 130
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 218
    target 159
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 219
    target 15
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 219
    target 44
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 219
    target 73
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 219
    target 102
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 219
    target 131
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 219
    target 160
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 220
    target 16
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 220
    target 45
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 220
    target 74
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 220
    target 103
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 220
    target 132
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 220
    target 161
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 221
    target 17
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 221
    target 46
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 221
    target 75
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 221
    target 104
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 221
    target 133
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 221
    target 162
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 222
    target 18
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 222
    target 47
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 222
    target 76
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 222
    target 105
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 222
    target 134
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 222
    target 163
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 223
    target 19
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 223
    target 48
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 223
    target 77
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 223
    target 106
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 223
    target 135
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 223
    target 164
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 224
    target 20
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 224
    target 49
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 224
    target 78
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 224
    target 107
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 224
    target 136
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 224
    target 165
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 225
    target 21
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 225
    target 50
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 225
    target 79
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 225
    target 108
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 225
    target 137
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 225
    target 166
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 226
    target 22
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 226
    target 51
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 226
    target 80
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 226
    target 109
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 226
    target 138
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 226
    target 167
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 227
    target 23
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 227
    target 52
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 227
    target 81
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 227
    target 110
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 227
    target 139
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 227
    target 168
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 228
    target 24
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 228
    target 53
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 228
    target 82
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 228
    target 111
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 228
    target 140
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 228
    target 169
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 229
    target 25
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 229
    target 54
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 229
    target 83
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 229
    target 112
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 229
    target 141
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 229
    target 170
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 230
    target 26
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 230
    target 55
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 230
    target 84
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 230
    target 113
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 230
    target 142
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 230
    target 171
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 231
    target 27
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 231
    target 56
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 231
    target 85
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 231
    target 114
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 231
    target 143
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 231
    target 172
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 232
    target 28
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 232
    target 57
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 232
    target 86
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 232
    target 115
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 232
    target 144
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 232
    target 173
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 233
    target 29
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 233
    target 58
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 233
    target 87
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 233
    target 116
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 233
    target 145
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 233
    target 174
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 234
    target 30
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 234
    target 59
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 234
    target 88
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 234
    target 117
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 234
    target 146
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 234
    target 175
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 235
    target 31
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 235
    target 60
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 235
    target 89
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 235
    target 118
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 235
    target 147
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 235
    target 176
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 236
    target 32
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 236
    target 61
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 236
    target 90
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 236
    target 119
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 236
    target 148
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 236
    target 177
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 237
    target 33
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 237
    target 62
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 237
    target 91
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 237
    target 120
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 237
    target 149
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 237
    target 178
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 238
    target 34
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 238
    target 63
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 238
    target 92
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 238
    target 121
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 238
    target 150
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 238
    target 179
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 239
    target 35
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 239
    target 64
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 239
    target 93
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 239
    target 122
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 239
    target 151
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 239
    target 180
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 240
    target 36
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 240
    target 65
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 240
    target 94
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 240
    target 123
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 240
    target 152
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 240
    target 181
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 3
    target 191
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 4
    target 190
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 5
    target 192
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 6
    target 190
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 7
    target 193
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 212
    target 211
    label "establishes"
    provenance "Q-28"
  ]
  edge [
    source 213
    target 202
    label "establishes"
    provenance "Q-28"
  ]
  edge [
    source 214
    target 205
    label "establishes"
    provenance "Q-28"
  ]
  edge [
    source 215
    target 183
    label "establishes"
    provenance "Q-28"
  ]
  edge [
    source 216
    target 190
    label "establishes"
    provenance "Q-28"
  ]
  edge [
    source 217
    target 182
    label "establishes"
    provenance "Q-29"
  ]
  edge [
    source 218
    target 194
    label "establishes"
    provenance "Q-29"
  ]
  edge [
    source 219
    target 186
    label "establishes"
    provenance "Q-29"
  ]
  edge [
    source 220
    target 185
    label "establishes"
    provenance "Q-29"
  ]
  edge [
    source 221
    target 184
    label "establishes"
    provenance "Q-29"
  ]
  edge [
    source 222
    target 192
    label "establishes"
    provenance "Q-29"
  ]
  edge [
    source 223
    target 206
    label "establishes"
    provenance "Q-30"
  ]
  edge [
    source 224
    target 203
    label "establishes"
    provenance "Q-30"
  ]
  edge [
    source 225
    target 207
    label "establishes"
    provenance "Q-30"
  ]
  edge [
    source 226
    target 208
    label "establishes"
    provenance "Q-30"
  ]
  edge [
    source 227
    target 188
    label "establishes"
    provenance "Q-30"
  ]
  edge [
    source 228
    target 203
    label "establishes"
    provenance "Q-67"
  ]
  edge [
    source 229
    target 210
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 230
    target 204
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 231
    target 189
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 232
    target 200
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 233
    target 201
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 234
    target 187
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 235
    target 193
    label "establishes"
    provenance "Q-33"
  ]
  edge [
    source 236
    target 196
    label "establishes"
    provenance "Q-32"
  ]
  edge [
    source 237
    target 198
    label "establishes"
    provenance "Q-32"
  ]
  edge [
    source 238
    target 195
    label "establishes"
    provenance "Q-32"
  ]
  edge [
    source 239
    target 197
    label "establishes"
    provenance "Q-32"
  ]
  edge [
    source 240
    target 199
    label "establishes"
    provenance "Q-32"
  ]
  edge [
    source 3
    target 212
    label "includes"
    provenance "Q-28"
  ]
  edge [
    source 3
    target 213
    label "includes"
    provenance "Q-28"
  ]
  edge [
    source 3
    target 214
    label "includes"
    provenance "Q-28"
  ]
  edge [
    source 3
    target 215
    label "includes"
    provenance "Q-28"
  ]
  edge [
    source 3
    target 216
    label "includes"
    provenance "Q-28"
  ]
  edge [
    source 4
    target 217
    label "includes"
    provenance "Q-29"
  ]
  edge [
    source 4
    target 218
    label "includes"
    provenance "Q-29"
  ]
  edge [
    source 4
    target 219
    label "includes"
    provenance "Q-29"
  ]
  edge [
    source 4
    target 220
    label "includes"
    provenance "Q-29"
  ]
  edge [
    source 4
    target 221
    label "includes"
    provenance "Q-29"
  ]
  edge [
    source 4
    target 222
    label "includes"
    provenance "Q-29"
  ]
  edge [
    source 5
    target 223
    label "includes"
    provenance "Q-30"
  ]
  edge [
    source 5
    target 224
    label "includes"
    provenance "Q-30"
  ]
  edge [
    source 5
    target 225
    label "includes"
    provenance "Q-30"
  ]
  edge [
    source 5
    target 226
    label "includes"
    provenance "Q-30"
  ]
  edge [
    source 5
    target 227
    label "includes"
    provenance "Q-30"
  ]
  edge [
    source 5
    target 228
    label "includes"
    provenance "Q-67"
  ]
  edge [
    source 6
    target 229
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 6
    target 230
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 6
    target 231
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 6
    target 232
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 6
    target 233
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 6
    target 234
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 6
    target 235
    label "includes"
    provenance "Q-33"
  ]
  edge [
    source 7
    target 236
    label "includes"
    provenance "Q-32"
  ]
  edge [
    source 7
    target 237
    label "includes"
    provenance "Q-32"
  ]
  edge [
    source 7
    target 238
    label "includes"
    provenance "Q-32"
  ]
  edge [
    source 7
    target 239
    label "includes"
    provenance "Q-32"
  ]
  edge [
    source 7
    target 240
    label "includes"
    provenance "Q-32"
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
    target 190
    label "requires"
    provenance "seed"
  ]
  edge [
    source 4
    target 192
    label "requires"
    provenance "seed"
  ]
  edge [
    source 5
    target 203
    label "requires"
    provenance "seed"
  ]
  edge [
    source 6
    target 193
    label "requires"
    provenance "seed"
  ]
  edge [
    source 7
    target 199
    label "requires"
    provenance "seed"
  ]
  edge [
    source 212
    target 191
    label "requires"
    provenance "Q-28"
  ]
  edge [
    source 213
    target 211
    label "requires"
    provenance "Q-28"
  ]
  edge [
    source 214
    target 202
    label "requires"
    provenance "Q-28"
  ]
  edge [
    source 215
    target 205
    label "requires"
    provenance "Q-28"
  ]
  edge [
    source 216
    target 183
    label "requires"
    provenance "Q-28"
  ]
  edge [
    source 217
    target 190
    label "requires"
    provenance "Q-29"
  ]
  edge [
    source 218
    target 182
    label "requires"
    provenance "Q-29"
  ]
  edge [
    source 219
    target 194
    label "requires"
    provenance "Q-29"
  ]
  edge [
    source 220
    target 186
    label "requires"
    provenance "Q-29"
  ]
  edge [
    source 221
    target 185
    label "requires"
    provenance "Q-29"
  ]
  edge [
    source 222
    target 184
    label "requires"
    provenance "Q-29"
  ]
  edge [
    source 223
    target 192
    label "requires"
    provenance "Q-30"
  ]
  edge [
    source 224
    target 206
    label "requires"
    provenance "Q-30"
  ]
  edge [
    source 225
    target 206
    label "requires"
    provenance "Q-30"
  ]
  edge [
    source 226
    target 207
    label "requires"
    provenance "Q-30"
  ]
  edge [
    source 227
    target 208
    label "requires"
    provenance "Q-30"
  ]
  edge [
    source 228
    target 188
    label "requires"
    provenance "Q-67"
  ]
  edge [
    source 229
    target 190
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 230
    target 210
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 231
    target 204
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 232
    target 189
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 233
    target 200
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 234
    target 201
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 235
    target 187
    label "requires"
    provenance "Q-33"
  ]
  edge [
    source 236
    target 193
    label "requires"
    provenance "Q-32"
  ]
  edge [
    source 237
    target 196
    label "requires"
    provenance "Q-32"
  ]
  edge [
    source 238
    target 198
    label "requires"
    provenance "Q-32"
  ]
  edge [
    source 239
    target 195
    label "requires"
    provenance "Q-32"
  ]
  edge [
    source 240
    target 197
    label "requires"
    provenance "Q-32"
  ]
]
