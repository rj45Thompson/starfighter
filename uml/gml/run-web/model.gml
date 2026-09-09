graph [
  directed 1
  label "starblast-web"
  node [
    id 0
    label "A:pilot"
    kind "actor"
    name "Pilot"
    provenance "seed"
    note "the person flying"
  ]
  node [
    id 1
    label "A:rival"
    kind "actor"
    name "Another player"
    provenance "seed"
    note "everyone else in the field"
  ]
  node [
    id 2
    label "A:server"
    kind "actor"
    name "The server"
    provenance "seed"
    note "the simulation, acting on its own"
  ]
  node [
    id 3
    label "E1"
    kind "epic"
    name "Choose a mode and reach the field"
    provenance "seed"
    story "You pick one of four modes from the menu, appear near the space station that is your base, and the ship answers the mouse or the keyboard. Nothing else can happen until it does."
  ]
  node [
    id 4
    label "E2"
    kind "epic"
    name "Mine the belt and fill the cargo"
    provenance "seed"
    story "You shoot asteroids and the crystals they drop are worth something. Bigger rocks pay more per shot and cost more to stay near. The cargo has a ceiling, and gems that would exceed it are simply lost."
  ]
  node [
    id 5
    label "E3"
    kind "epic"
    name "Spend the cargo, or trade up a tier"
    provenance "seed"
    story "A full cargo can go into eight statistics, into an extra life, or into the next ship in the tree — and taking the next ship hands you an un-upgraded one. That is the decision the whole loop exists for."
  ]
  node [
    id 6
    label "E4"
    kind "epic"
    name "Fight, bleed gems, and die back to tier one"
    provenance "seed"
    story "Shields absorb until they do not, and past that every hit knocks crystals out of your hold for anyone to take. Dying puts you back in a tier one ship with nothing."
  ]
  node [
    id 7
    label "E5"
    kind "epic"
    name "The field closes and one player is left"
    provenance "seed"
    story "A repulsive field grows out from the star and pushes everyone inward, warning as it goes. The round ends when one player remains."
  ]
  node [
    id 8
    label "Q:how:UC-E1-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;game mode; objective&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;space station&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;steer; controls&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;accelerate&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;fire; weapons&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;asteroid; weapons&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gem; asteroid&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gem&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;cargo capacity&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;asteroid&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;cargo capacity; upgrade cost&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;upgrade categories; upgrade cost; spend gems&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;energy regen&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;extra life&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;tier up; ship&quot;}]"
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
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;tier up; tier&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E3-5"
  ]
  node [
    id 24
    label "Q:how:UC-E4-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;weapons; fire&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-1"
  ]
  node [
    id 25
    label "Q:how:UC-E4-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;shield&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-2"
  ]
  node [
    id 26
    label "Q:how:UC-E4-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gems as shield&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-3"
  ]
  node [
    id 27
    label "Q:how:UC-E4-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;death&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-4"
  ]
  node [
    id 28
    label "Q:how:UC-E4-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;death; tier&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E4-5"
  ]
  node [
    id 29
    label "Q:how:UC-E5-1"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gravity field&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-1"
  ]
  node [
    id 30
    label "Q:how:UC-E5-2"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;endgame warning&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-2"
  ]
  node [
    id 31
    label "Q:how:UC-E5-3"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;gravity field&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-3"
  ]
  node [
    id 32
    label "Q:how:UC-E5-4"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;survival objective&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-4"
  ]
  node [
    id 33
    label "Q:how:UC-E5-5"
    kind "question"
    name "HOW: By what mechanism, step by step?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;round end&quot;}]"
    asks "By what mechanism, step by step?"
    good_answer "ordered STEP nodes, or the symbol that implements it where one exists"
    interrogative "how"
    subject "UC-E5-5"
  ]
  node [
    id 34
    label "Q:what:UC-E1-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:mode_chosen&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-1"
  ]
  node [
    id 35
    label "Q:what:UC-E1-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_placed&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-2"
  ]
  node [
    id 36
    label "Q:what:UC-E1-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:can_steer&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-3"
  ]
  node [
    id 37
    label "Q:what:UC-E1-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:can_move&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-4"
  ]
  node [
    id 38
    label "Q:what:UC-E1-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_field&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E1-5"
  ]
  node [
    id 39
    label "Q:what:UC-E2-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:rock_broken&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-1"
  ]
  node [
    id 40
    label "Q:what:UC-E2-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_loose&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-2"
  ]
  node [
    id 41
    label "Q:what:UC-E2-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_held&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-3"
  ]
  node [
    id 42
    label "Q:what:UC-E2-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:hold_bounded&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-4"
  ]
  node [
    id 43
    label "Q:what:UC-E2-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:mining_has_a_cost&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-5"
  ]
  node [
    id 44
    label "Q:what:UC-E2-6"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:cargo_full&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E2-6"
  ]
  node [
    id 45
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
    id 46
    label "Q:what:UC-E3-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_better&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-2"
  ]
  node [
    id 47
    label "Q:what:UC-E3-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:life_banked&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-3"
  ]
  node [
    id 48
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
    id 49
    label "Q:what:UC-E3-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_better&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E3-5"
  ]
  node [
    id 50
    label "Q:what:UC-E4-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:trading_fire&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-1"
  ]
  node [
    id 51
    label "Q:what:UC-E4-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:shield_down&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-2"
  ]
  node [
    id 52
    label "Q:what:UC-E4-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:bleeding_gems&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-3"
  ]
  node [
    id 53
    label "Q:what:UC-E4-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_destroyed&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-4"
  ]
  node [
    id 54
    label "Q:what:UC-E4-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:back_at_tier_one&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E4-5"
  ]
  node [
    id 55
    label "Q:what:UC-E5-1"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:field_closing&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-1"
  ]
  node [
    id 56
    label "Q:what:UC-E5-2"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:warned&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-2"
  ]
  node [
    id 57
    label "Q:what:UC-E5-3"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:forced_together&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-3"
  ]
  node [
    id 58
    label "Q:what:UC-E5-4"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:one_left&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-4"
  ]
  node [
    id 59
    label "Q:what:UC-E5-5"
    kind "question"
    name "WHAT: What is true after this that was not true before?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:round_decided&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What is true after this that was not true before?"
    good_answer "the STATE literals it requires and establishes -- the change, not the activity"
    interrogative "what"
    subject "UC-E5-5"
  ]
  node [
    id 60
    label "Q:when:UC-E1-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:at_menu&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-1"
  ]
  node [
    id 61
    label "Q:when:UC-E1-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:mode_chosen&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-2"
  ]
  node [
    id 62
    label "Q:when:UC-E1-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_placed&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-3"
  ]
  node [
    id 63
    label "Q:when:UC-E1-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:can_steer&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-4"
  ]
  node [
    id 64
    label "Q:when:UC-E1-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:can_move&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E1-5"
  ]
  node [
    id 65
    label "Q:when:UC-E2-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_field&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-1"
  ]
  node [
    id 66
    label "Q:when:UC-E2-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:rock_broken&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-2"
  ]
  node [
    id 67
    label "Q:when:UC-E2-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_loose&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-3"
  ]
  node [
    id 68
    label "Q:when:UC-E2-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:gems_held&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-4"
  ]
  node [
    id 69
    label "Q:when:UC-E2-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:hold_bounded&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-5"
  ]
  node [
    id 70
    label "Q:when:UC-E2-6"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:mining_has_a_cost&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E2-6"
  ]
  node [
    id 71
    label "Q:when:UC-E3-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:cargo_full&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-1"
  ]
  node [
    id 72
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
    id 73
    label "Q:when:UC-E3-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:cargo_full&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-3"
  ]
  node [
    id 74
    label "Q:when:UC-E3-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:cargo_full&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E3-4"
  ]
  node [
    id 75
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
    id 76
    label "Q:when:UC-E4-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_field&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-1"
  ]
  node [
    id 77
    label "Q:when:UC-E4-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:trading_fire&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-2"
  ]
  node [
    id 78
    label "Q:when:UC-E4-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:shield_down&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-3"
  ]
  node [
    id 79
    label "Q:when:UC-E4-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:bleeding_gems&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-4"
  ]
  node [
    id 80
    label "Q:when:UC-E4-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:ship_destroyed&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E4-5"
  ]
  node [
    id 81
    label "Q:when:UC-E5-1"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:in_field&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-1"
  ]
  node [
    id 82
    label "Q:when:UC-E5-2"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:field_closing&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-2"
  ]
  node [
    id 83
    label "Q:when:UC-E5-3"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:warned&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-3"
  ]
  node [
    id 84
    label "Q:when:UC-E5-4"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:forced_together&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-4"
  ]
  node [
    id 85
    label "Q:when:UC-E5-5"
    kind "question"
    name "WHEN: What triggers it, and what must already hold for it to be able to run?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;S:one_left&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "What triggers it, and what must already hold for it to be able to run?"
    good_answer "the event that starts it, plus its preconditions as STATE literals"
    interrogative "when"
    subject "UC-E5-5"
  ]
  node [
    id 86
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
    id 87
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
    id 88
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
    id 89
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
    id 90
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
    id 91
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
    id 92
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
    id 93
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
    id 94
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
    id 95
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
    id 96
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
    id 97
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
    id 98
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
    id 99
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
    id 100
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
    id 101
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
    id 102
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
    id 103
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
    id 104
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
    id 105
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
    id 106
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
    id 107
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
    id 108
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
    id 109
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
    id 110
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
    id 111
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
    id 112
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
    id 113
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
    id 114
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
    id 115
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
    id 116
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
    id 117
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
    id 118
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
    id 119
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
    id 120
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
    id 121
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
    id 122
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
    id 123
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
    id 124
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
    id 125
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
    id 126
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
    id 127
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
    id 128
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
    id 129
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
    id 130
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
    id 131
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
    id 132
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
    id 133
    label "Q:who:UC-E5-1"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:server&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-1"
  ]
  node [
    id 134
    label "Q:who:UC-E5-2"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:server&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-2"
  ]
  node [
    id 135
    label "Q:who:UC-E5-3"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:server&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-3"
  ]
  node [
    id 136
    label "Q:who:UC-E5-4"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:server&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-4"
  ]
  node [
    id 137
    label "Q:who:UC-E5-5"
    kind "question"
    name "WHO: Which actor performs this, and on whose behalf?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;A:server&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;&quot;}]"
    asks "Which actor performs this, and on whose behalf?"
    good_answer "an ACTOR node; if the system does it unprompted, say so and name that actor too"
    interrogative "who"
    subject "UC-E5-5"
  ]
  node [
    id 138
    label "Q:why:UC-E1-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-2 cannot run until 'a mode is chosen and its objective is set' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-1&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;the objective differs per mode, so it has to be settled before anything else means anything Instead of: one mode with the objective chosen later&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-1"
  ]
  node [
    id 139
    label "Q:why:UC-E1-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-3 cannot run until 'the pilot has a ship in the world, near its base' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-2"
  ]
  node [
    id 140
    label "Q:why:UC-E1-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-4 cannot run until \&quot;the ship's heading answers the player\&quot; holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-1&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;the sources describe two input schemes for the same act, so either alone is incomplete Instead of: mouse only, as many browser shooters do&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-3"
  ]
  node [
    id 141
    label "Q:why:UC-E1-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E1-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E1-5 cannot run until \&quot;the ship moves under the player's control\&quot; holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-4"
  ]
  node [
    id 142
    label "Q:why:UC-E1-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-1&quot;, &quot;UC-E4-1&quot;, &quot;UC-E5-1&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-1, UC-E4-1, UC-E5-1 cannot run until 'the pilot is flying in the asteroid field' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E1-5"
  ]
  node [
    id 143
    label "Q:why:UC-E2-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-2 cannot run until 'an asteroid has been broken' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-1"
  ]
  node [
    id 144
    label "Q:why:UC-E2-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-3 cannot run until 'crystals are loose in the field' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-2"
  ]
  node [
    id 145
    label "Q:why:UC-E2-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-4 cannot run until \&quot;crystals are in the ship's hold\&quot; holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-3"
  ]
  node [
    id 146
    label "Q:why:UC-E2-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-5 cannot run until 'the hold has a known ceiling and enforces it' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-6&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;a ceiling is what makes returning to spend a decision rather than a formality Instead of: an unbounded hold, which would remove the reason ever to stop mining&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-4"
  ]
  node [
    id 147
    label "Q:why:UC-E2-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E2-6&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E2-6 cannot run until 'the pilot is trading safety for yield' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-6&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;without the size trade-off mining is a chore rather than a choice Instead of: every asteroid worth the same, which the sources contradict&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-5"
  ]
  node [
    id 148
    label "Q:why:UC-E2-6"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-1&quot;, &quot;UC-E3-3&quot;, &quot;UC-E3-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-1, UC-E3-3, UC-E3-4 cannot run until \&quot;the ship's crystal cargo is full\&quot; holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E2-6"
  ]
  node [
    id 149
    label "Q:why:UC-E3-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-2 cannot run until 'at least one statistic is above its base' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-1"
  ]
  node [
    id 150
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
    id 151
    label "Q:why:UC-E3-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 0
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-3"
  ]
  node [
    id 152
    label "Q:why:UC-E3-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E3-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E3-5 cannot run until 'a next ship is on offer' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-3&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;a choice of two is what makes the tree a tree rather than a ladder Instead of: one successor per tier, which would make the path fixed&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-4"
  ]
  node [
    id 153
    label "Q:why:UC-E3-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;E3 declares it ends with 'the ship is measurably better than it was' true, and this is the beat that reaches it&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-3&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;paying the whole hold and losing every upgrade is the cost that makes holding out a decision Instead of: carrying upgrades across the tier, which would make trading up strictly free&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E3-5"
  ]
  node [
    id 154
    label "Q:why:UC-E4-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-2 cannot run until 'shots are being exchanged' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-1"
  ]
  node [
    id 155
    label "Q:why:UC-E4-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-3 cannot run until 'the shield is depleted' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-2"
  ]
  node [
    id 156
    label "Q:why:UC-E4-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-4 cannot run until 'the pilot is losing crystals to incoming fire' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-4&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;crystals acting as a second shield is what makes a full hold dangerous to carry Instead of: the hold being safe until death, which would make hoarding free&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-3"
  ]
  node [
    id 157
    label "Q:why:UC-E4-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E4-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E4-5 cannot run until \&quot;the pilot's ship is destroyed\&quot; holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-4"
  ]
  node [
    id 158
    label "Q:why:UC-E4-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;E4 declares it ends with 'the pilot is flying again, back at tier one' true, and this is the beat that reaches it&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E4-5"
  ]
  node [
    id 159
    label "Q:why:UC-E5-1"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-2&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-2 cannot run until 'the playable area is shrinking' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-5&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;a shrinking field forces contact without a timer deciding the round Instead of: a round timer, which would end the game without anyone having to fight&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-1"
  ]
  node [
    id 160
    label "Q:why:UC-E5-2"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-3&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-3 cannot run until 'players know how much room is left' holds, and this is what makes it hold&quot;}, {&quot;by&quot;: [], &quot;source&quot;: &quot;Q-5&quot;, &quot;standing&quot;: &quot;stated&quot;, &quot;text&quot;: &quot;a squeeze nobody can see coming is a death nobody can play around Instead of: a silent field, which would make position luck rather than choice&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-2"
  ]
  node [
    id 161
    label "Q:why:UC-E5-3"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-4&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-4 cannot run until 'the survivors cannot avoid each other' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-3"
  ]
  node [
    id 162
    label "Q:why:UC-E5-4"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;UC-E5-5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;UC-E5-5 cannot run until 'one pilot remains alive' holds, and this is what makes it hold&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-4"
  ]
  node [
    id 163
    label "Q:why:UC-E5-5"
    kind "question"
    name "WHY: Why does this exist, and what was rejected in choosing it?"
    provenance "interrogation"
    answered 1
    answers "[{&quot;by&quot;: [&quot;E5&quot;], &quot;source&quot;: &quot;the model's structure&quot;, &quot;standing&quot;: &quot;definitive&quot;, &quot;text&quot;: &quot;E5 declares it ends with 'the round is over and a winner is known' true, and this is the beat that reaches it&quot;}]"
    asks "Why does this exist, and what was rejected in choosing it?"
    good_answer "a reason that is not a restatement, and at least one real alternative"
    interrogative "why"
    subject "UC-E5-5"
  ]
  node [
    id 164
    label "S:at_menu"
    kind "state"
    name "the player is at the main menu, in no game"
    provenance "seed"
  ]
  node [
    id 165
    label "S:back_at_tier_one"
    kind "state"
    name "the pilot is flying again, back at tier one"
    provenance "seed"
  ]
  node [
    id 166
    label "S:bleeding_gems"
    kind "state"
    name "the pilot is losing crystals to incoming fire"
    provenance "Q-4"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
  ]
  node [
    id 167
    label "S:can_move"
    kind "state"
    name "the ship moves under the player's control"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 168
    label "S:can_steer"
    kind "state"
    name "the ship's heading answers the player"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 169
    label "S:cargo_full"
    kind "state"
    name "the ship's crystal cargo is full"
    provenance "seed"
  ]
  node [
    id 170
    label "S:field_closing"
    kind "state"
    name "the playable area is shrinking"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 171
    label "S:forced_together"
    kind "state"
    name "the survivors cannot avoid each other"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 172
    label "S:gems_held"
    kind "state"
    name "crystals are in the ship's hold"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 173
    label "S:gems_loose"
    kind "state"
    name "crystals are loose in the field"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 174
    label "S:hold_bounded"
    kind "state"
    name "the hold has a known ceiling and enforces it"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 175
    label "S:in_field"
    kind "state"
    name "the pilot is flying in the asteroid field"
    provenance "seed"
  ]
  node [
    id 176
    label "S:life_banked"
    kind "state"
    name "the pilot holds a life in reserve"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 177
    label "S:mining_has_a_cost"
    kind "state"
    name "the pilot is trading safety for yield"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 178
    label "S:mode_chosen"
    kind "state"
    name "a mode is chosen and its objective is set"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 179
    label "S:one_left"
    kind "state"
    name "one pilot remains alive"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 180
    label "S:rock_broken"
    kind "state"
    name "an asteroid has been broken"
    provenance "Q-6"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
  ]
  node [
    id 181
    label "S:round_decided"
    kind "state"
    name "the round is over and a winner is known"
    provenance "seed"
  ]
  node [
    id 182
    label "S:shield_down"
    kind "state"
    name "the shield is depleted"
    provenance "Q-4"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
  ]
  node [
    id 183
    label "S:ship_better"
    kind "state"
    name "the ship is measurably better than it was"
    provenance "seed"
  ]
  node [
    id 184
    label "S:ship_destroyed"
    kind "state"
    name "the pilot's ship is destroyed"
    provenance "Q-4"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
  ]
  node [
    id 185
    label "S:ship_placed"
    kind "state"
    name "the pilot has a ship in the world, near its base"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 186
    label "S:stat_raised"
    kind "state"
    name "at least one statistic is above its base"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 187
    label "S:tier_offered"
    kind "state"
    name "a next ship is on offer"
    provenance "Q-3"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
  ]
  node [
    id 188
    label "S:trading_fire"
    kind "state"
    name "shots are being exchanged"
    provenance "Q-4"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
  ]
  node [
    id 189
    label "S:under_attack"
    kind "state"
    name "another ship is shooting at the pilot"
    provenance "seed"
  ]
  node [
    id 190
    label "S:warned"
    kind "state"
    name "players know how much room is left"
    provenance "Q-5"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
  ]
  node [
    id 191
    label "UC-E1-1"
    kind "usecase"
    name "Player chooses one of the four game modes"
    provenance "Q-1"
    acceptance "[&quot;each of the four modes is selectable from the main menu&quot;, &quot;the objective the mode sets is stated before the round starts&quot;]"
    because "the objective differs per mode, so it has to be settled before anything else means anything"
    ground "[&quot;game mode&quot;, &quot;objective&quot;]"
    instead_of "[&quot;one mode with the objective chosen later&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
  ]
  node [
    id 192
    label "UC-E1-2"
    kind "usecase"
    name "The server places the ship beside its base"
    provenance "Q-1"
    acceptance "[&quot;the pilot appears within sight of the station the sources call their base&quot;]"
    ground "[&quot;space station&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
  ]
  node [
    id 193
    label "UC-E1-3"
    kind "usecase"
    name "Pilot steers the ship"
    provenance "Q-1"
    acceptance "[&quot;the mouse and the left and right arrow keys both change heading&quot;]"
    because "the sources describe two input schemes for the same act, so either alone is incomplete"
    ground "[&quot;steer&quot;, &quot;controls&quot;]"
    instead_of "[&quot;mouse only, as many browser shooters do&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
  ]
  node [
    id 194
    label "UC-E1-4"
    kind "usecase"
    name "Pilot accelerates the ship"
    provenance "Q-1"
    acceptance "[&quot;right-click and the up arrow both accelerate&quot;]"
    ground "[&quot;accelerate&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
  ]
  node [
    id 195
    label "UC-E1-5"
    kind "usecase"
    name "Pilot fires the ship's weapon"
    provenance "Q-1"
    acceptance "[&quot;left-click and the space bar both fire&quot;, &quot;a pilot who can steer, move and fire is in the field and needs nothing further to play&quot;]"
    ground "[&quot;fire&quot;, &quot;weapons&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E1 -- 'Choose a mode and reach the field' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Four modes, a base to appear beside, and a ship that answers the controls. The sources describe the controls as three separate things, so they are three beats.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    status "HAVE"
  ]
  node [
    id 196
    label "UC-E2-1"
    kind "usecase"
    name "Pilot breaks an asteroid apart"
    provenance "Q-6"
    acceptance "[&quot;an asteroid takes damage from weapons fire and breaks&quot;]"
    ground "[&quot;asteroid&quot;, &quot;weapons&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
  ]
  node [
    id 197
    label "UC-E2-2"
    kind "usecase"
    name "A broken asteroid leaves crystals in the field"
    provenance "Q-6"
    acceptance "[&quot;a broken asteroid leaves crystals where it was&quot;, &quot;a larger asteroid leaves larger chunks than a smaller one&quot;]"
    ground "[&quot;gem&quot;, &quot;asteroid&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
  ]
  node [
    id 198
    label "UC-E2-3"
    kind "usecase"
    name "Pilot picks up a loose crystal"
    provenance "Q-6"
    acceptance "[&quot;flying over a loose crystal puts it in the hold&quot;]"
    ground "[&quot;gem&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
  ]
  node [
    id 199
    label "UC-E2-4"
    kind "usecase"
    name "The hold refuses crystals past its ceiling"
    provenance "Q-6"
    acceptance "[&quot;a pickup that would exceed the ceiling is lost rather than held&quot;, &quot;a full hold accepts nothing until something leaves it&quot;]"
    because "a ceiling is what makes returning to spend a decision rather than a formality"
    ground "[&quot;cargo capacity&quot;]"
    instead_of "[&quot;an unbounded hold, which would remove the reason ever to stop mining&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
  ]
  node [
    id 200
    label "UC-E2-5"
    kind "usecase"
    name "Pilot weighs asteroid size against exposure"
    provenance "Q-6"
    acceptance "[&quot;a larger asteroid yields more crystals per unit of damage dealt&quot;, &quot;a larger asteroid takes longer, leaving the pilot in one place for longer&quot;]"
    because "without the size trade-off mining is a chore rather than a choice"
    ground "[&quot;asteroid&quot;]"
    instead_of "[&quot;every asteroid worth the same, which the sources contradict&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
  ]
  node [
    id 201
    label "UC-E2-6"
    kind "usecase"
    name "The hold fills"
    provenance "Q-6"
    acceptance "[&quot;the hold reports itself full at the documented capacity for the tier&quot;, &quot;a full hold is what unlocks both the extra life and the next ship&quot;]"
    ground "[&quot;cargo capacity&quot;, &quot;upgrade cost&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E2 -- 'Mine the belt and fill the cargo' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.\n\nYour previous answer was accepted apart from UC-E2-5. Re-send only what is needed to replace those; leave everything else out.&quot;, &quot;attempt&quot;: 2, &quot;because&quot;: &quot;Refused for a compound name. Renaming rather than splitting: weighing size against exposure is one judgement the pilot makes at one moment, not two goals \u2014 the objection offers both routes and this is the case it was written for.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-6&quot;}"
    status "HAVE"
  ]
  node [
    id 202
    label "UC-E3-1"
    kind "usecase"
    name "Pilot spends crystals on one of eight statistics"
    provenance "Q-3"
    acceptance "[&quot;there are exactly eight categories a crystal can go into&quot;, &quot;the cost of the next level in a category rises with the level already held&quot;]"
    ground "[&quot;upgrade categories&quot;, &quot;upgrade cost&quot;, &quot;spend gems&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
  ]
  node [
    id 203
    label "UC-E3-2"
    kind "usecase"
    name "A raised statistic changes how the ship performs"
    provenance "Q-3"
    acceptance "[&quot;raising energy regeneration visibly shortens the wait between sustained bursts&quot;, &quot;a statistic at its base leaves the ship exactly as it was&quot;]"
    ground "[&quot;energy regen&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
  ]
  node [
    id 204
    label "UC-E3-3"
    kind "usecase"
    name "Pilot buys an extra life with a full hold"
    provenance "Q-3"
    acceptance "[&quot;an extra life can only be bought with a full hold&quot;, &quot;the number of lives that can be held is capped, and the cap depends on the tier&quot;]"
    ground "[&quot;extra life&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
  ]
  node [
    id 205
    label "UC-E3-4"
    kind "usecase"
    name "A full hold offers the next ship in the tree"
    provenance "Q-3"
    acceptance "[&quot;the offer is a choice between two ships, not a single successor&quot;, &quot;a ship at the top tier is offered nothing&quot;]"
    because "a choice of two is what makes the tree a tree rather than a ladder"
    ground "[&quot;tier up&quot;, &quot;ship&quot;]"
    instead_of "[&quot;one successor per tier, which would make the path fixed&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
  ]
  node [
    id 206
    label "UC-E3-5"
    kind "usecase"
    name "Taking the next ship hands over an un-upgraded one"
    provenance "Q-3"
    acceptance "[&quot;after trading up, every statistic reads its base value&quot;, &quot;the new hull is stronger at base than the old one was fully upgraded, or the trade is never worth taking&quot;]"
    because "paying the whole hold and losing every upgrade is the cost that makes holding out a decision"
    ground "[&quot;tier up&quot;, &quot;tier&quot;]"
    instead_of "[&quot;carrying upgrades across the tier, which would make trading up strictly free&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E3 -- 'Spend the cargo, or trade up a tier' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;A full hold has three destinations in the sources: statistics, an extra life, or the next ship. Taking the next ship hands over an un-upgraded one, which is what makes it a trade rather than a reward.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-3&quot;}"
    status "HAVE"
  ]
  node [
    id 207
    label "UC-E4-1"
    kind "usecase"
    name "Pilot trades fire with another ship"
    provenance "Q-4"
    acceptance "[&quot;lasers, torpedoes and special weapons are all available routes to damage&quot;]"
    ground "[&quot;weapons&quot;, &quot;fire&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
    status "HAVE"
  ]
  node [
    id 208
    label "UC-E4-2"
    kind "usecase"
    name "Shields absorb before the hold does"
    provenance "Q-4"
    acceptance "[&quot;no crystals are lost while the shield still has charge&quot;]"
    ground "[&quot;shield&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
    status "HAVE"
  ]
  node [
    id 209
    label "UC-E4-3"
    kind "usecase"
    name "Damage past the shield knocks crystals loose"
    provenance "Q-4"
    acceptance "[&quot;with the shield down, damage taken removes that amount of crystals from the hold&quot;, &quot;crystals knocked loose are collectable by anyone, including the attacker&quot;]"
    because "crystals acting as a second shield is what makes a full hold dangerous to carry"
    ground "[&quot;gems as shield&quot;]"
    instead_of "[&quot;the hold being safe until death, which would make hoarding free&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
    status "HAVE"
  ]
  node [
    id 210
    label "UC-E4-4"
    kind "usecase"
    name "A ship that runs out of everything dies"
    provenance "Q-4"
    acceptance "[&quot;a destroyed ship leaves the field&quot;]"
    ground "[&quot;death&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
    status "HAVE"
  ]
  node [
    id 211
    label "UC-E4-5"
    kind "usecase"
    name "Death returns the pilot to tier one with nothing"
    provenance "Q-4"
    acceptance "[&quot;the respawned ship is tier one regardless of the tier that died&quot;, &quot;every upgrade bought before death is gone&quot;, &quot;the respawned pilot holds minimal crystals, not none and not the hold they had&quot;]"
    ground "[&quot;death&quot;, &quot;tier&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E4 -- 'Fight, bleed gems, and die back to tier one' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;The sources describe a cost chain: shields absorb, and past them damage knocks crystals out of the hold for anyone to take, and past that the ship dies back to tier one with nothing.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-4&quot;}"
    status "HAVE"
  ]
  node [
    id 212
    label "UC-E5-1"
    kind "usecase"
    name "A repulsive field grows out from the star"
    provenance "Q-5"
    acceptance "[&quot;the field pushes players away from the star rather than pulling them in&quot;, &quot;the field grows larger and stronger as the endgame progresses&quot;]"
    because "a shrinking field forces contact without a timer deciding the round"
    ground "[&quot;gravity field&quot;]"
    instead_of "[&quot;a round timer, which would end the game without anyone having to fight&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
  ]
  node [
    id 213
    label "UC-E5-2"
    kind "usecase"
    name "The field warns before it reaches a player"
    provenance "Q-5"
    acceptance "[&quot;warnings are given at 75%, 50%, 25% and 0%&quot;]"
    because "a squeeze nobody can see coming is a death nobody can play around"
    ground "[&quot;endgame warning&quot;]"
    instead_of "[&quot;a silent field, which would make position luck rather than choice&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
  ]
  node [
    id 214
    label "UC-E5-3"
    kind "usecase"
    name "The closing field forces players together"
    provenance "Q-5"
    acceptance "[&quot;the survivable area is smaller at the end of the round than at the start&quot;]"
    ground "[&quot;gravity field&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
  ]
  node [
    id 215
    label "UC-E5-4"
    kind "usecase"
    name "The last pilot alive takes the round"
    provenance "Q-5"
    acceptance "[&quot;victory is being last alive, not holding the highest count of anything&quot;]"
    ground "[&quot;survival objective&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
  ]
  node [
    id 216
    label "UC-E5-5"
    kind "usecase"
    name "The server ends the round"
    provenance "Q-5"
    acceptance "[&quot;the server ends once one player is left&quot;]"
    ground "[&quot;round end&quot;]"
    rationale "{&quot;ask&quot;: &quot;Epic E5 -- 'The field closes and one player is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 5 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Survival ends by squeezing the field rather than by a timer. The sources give the mechanism, the warnings, and the ending condition as three separate claims.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_EPIC&quot;, &quot;question&quot;: &quot;Q-5&quot;}"
    status "HAVE"
  ]
  edge [
    source 34
    target 178
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 35
    target 185
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 36
    target 168
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 37
    target 167
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 38
    target 175
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 39
    target 180
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 40
    target 173
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 41
    target 172
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 42
    target 174
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 43
    target 177
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 44
    target 169
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 45
    target 186
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 46
    target 183
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 47
    target 176
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 48
    target 187
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 49
    target 183
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 50
    target 188
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 51
    target 182
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 52
    target 166
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 53
    target 184
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 54
    target 165
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 55
    target 170
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 56
    target 190
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 57
    target 171
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 58
    target 179
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 59
    target 181
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 60
    target 164
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 61
    target 178
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 62
    target 185
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 63
    target 168
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 64
    target 167
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 65
    target 175
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 66
    target 180
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 67
    target 173
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 68
    target 172
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 69
    target 174
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 70
    target 177
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 71
    target 169
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 72
    target 186
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 73
    target 169
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 74
    target 169
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 75
    target 187
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 76
    target 175
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 77
    target 188
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 78
    target 182
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 79
    target 166
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 80
    target 184
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 81
    target 175
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 82
    target 170
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
    target 171
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 85
    target 179
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 86
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 87
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 88
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 89
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 90
    target 3
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 91
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 92
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 93
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 94
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 95
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 96
    target 4
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 97
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 98
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 99
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 100
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 101
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 102
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 103
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 104
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 105
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 106
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 107
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 108
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 109
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 110
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 111
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 112
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 113
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 114
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 115
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 116
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 117
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 118
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 119
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 120
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 121
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 122
    target 0
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 123
    target 0
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
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 134
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 135
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 136
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 137
    target 2
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 138
    target 192
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 139
    target 193
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 140
    target 194
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 141
    target 195
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 142
    target 196
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 142
    target 207
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 142
    target 212
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 143
    target 197
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 144
    target 198
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 145
    target 199
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 146
    target 200
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 147
    target 201
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 148
    target 202
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 148
    target 204
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 148
    target 205
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 149
    target 203
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 150
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 152
    target 206
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 153
    target 5
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 154
    target 208
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 155
    target 209
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 156
    target 210
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 157
    target 211
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 158
    target 6
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 159
    target 213
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 160
    target 214
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 161
    target 215
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 162
    target 216
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 163
    target 7
    label "answers"
    provenance "interrogation"
  ]
  edge [
    source 191
    target 8
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 191
    target 34
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 191
    target 60
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 191
    target 86
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 191
    target 112
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 191
    target 138
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 192
    target 9
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 192
    target 35
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 192
    target 61
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 192
    target 87
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 192
    target 113
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 192
    target 139
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 193
    target 10
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 193
    target 36
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 193
    target 62
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 193
    target 88
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 193
    target 114
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 193
    target 140
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 194
    target 11
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 194
    target 37
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 194
    target 63
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 194
    target 89
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 194
    target 115
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 194
    target 141
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 195
    target 12
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 195
    target 38
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 195
    target 64
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 195
    target 90
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 195
    target 116
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 195
    target 142
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 196
    target 13
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 196
    target 39
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 196
    target 65
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 196
    target 91
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 196
    target 117
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 196
    target 143
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 197
    target 14
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 197
    target 40
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 197
    target 66
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 197
    target 92
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 197
    target 118
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 197
    target 144
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 198
    target 15
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 198
    target 41
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 198
    target 67
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 198
    target 93
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 198
    target 119
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 198
    target 145
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 199
    target 16
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 199
    target 42
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 199
    target 68
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 199
    target 94
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 199
    target 120
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 199
    target 146
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 200
    target 17
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 200
    target 43
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 200
    target 69
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 200
    target 95
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 200
    target 121
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 200
    target 147
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 201
    target 18
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 201
    target 44
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 201
    target 70
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 201
    target 96
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 201
    target 122
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 201
    target 148
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 202
    target 19
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 202
    target 45
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 202
    target 71
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 202
    target 97
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 202
    target 123
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 202
    target 149
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 203
    target 20
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 203
    target 46
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 203
    target 72
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 203
    target 98
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 203
    target 124
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 203
    target 150
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 204
    target 21
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 204
    target 47
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 204
    target 73
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 204
    target 99
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 204
    target 125
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 204
    target 151
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 205
    target 22
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 205
    target 48
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 205
    target 74
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 205
    target 100
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 205
    target 126
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 205
    target 152
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 206
    target 23
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 206
    target 49
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 206
    target 75
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 206
    target 101
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 206
    target 127
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 206
    target 153
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 207
    target 24
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 207
    target 50
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 207
    target 76
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 207
    target 102
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 207
    target 128
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 207
    target 154
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 208
    target 25
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 208
    target 51
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 208
    target 77
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 208
    target 103
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 208
    target 129
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 208
    target 155
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 209
    target 26
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 209
    target 52
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 209
    target 78
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 209
    target 104
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 209
    target 130
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 209
    target 156
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 210
    target 27
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 210
    target 53
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 210
    target 79
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 210
    target 105
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 210
    target 131
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 210
    target 157
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 211
    target 28
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 211
    target 54
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 211
    target 80
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 211
    target 106
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 211
    target 132
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 211
    target 158
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 29
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 55
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 81
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 107
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 133
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 212
    target 159
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 30
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 56
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 82
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 108
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 134
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 213
    target 160
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 31
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 57
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 83
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 109
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 135
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 214
    target 161
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 32
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 58
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 84
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 110
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 136
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 215
    target 162
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 33
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 59
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 85
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 111
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 137
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 216
    target 163
    label "asks"
    provenance "interrogation"
  ]
  edge [
    source 3
    target 164
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 4
    target 175
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 5
    target 169
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 6
    target 175
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 7
    target 175
    label "establishes"
    provenance "seed"
  ]
  edge [
    source 191
    target 178
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 192
    target 185
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 193
    target 168
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 194
    target 167
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 195
    target 175
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 196
    target 180
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 197
    target 173
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 198
    target 172
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 199
    target 174
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 200
    target 177
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 201
    target 169
    label "establishes"
    provenance "Q-6"
  ]
  edge [
    source 202
    target 186
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 203
    target 183
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 204
    target 176
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 205
    target 187
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 206
    target 183
    label "establishes"
    provenance "Q-3"
  ]
  edge [
    source 207
    target 188
    label "establishes"
    provenance "Q-4"
  ]
  edge [
    source 208
    target 182
    label "establishes"
    provenance "Q-4"
  ]
  edge [
    source 209
    target 166
    label "establishes"
    provenance "Q-4"
  ]
  edge [
    source 210
    target 184
    label "establishes"
    provenance "Q-4"
  ]
  edge [
    source 211
    target 165
    label "establishes"
    provenance "Q-4"
  ]
  edge [
    source 212
    target 170
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 213
    target 190
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 214
    target 171
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 215
    target 179
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 216
    target 181
    label "establishes"
    provenance "Q-5"
  ]
  edge [
    source 3
    target 191
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 192
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 193
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 194
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 3
    target 195
    label "includes"
    provenance "Q-1"
  ]
  edge [
    source 4
    target 196
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 4
    target 197
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 4
    target 198
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 4
    target 199
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 4
    target 200
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 4
    target 201
    label "includes"
    provenance "Q-6"
  ]
  edge [
    source 5
    target 202
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 203
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 204
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 205
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 5
    target 206
    label "includes"
    provenance "Q-3"
  ]
  edge [
    source 6
    target 207
    label "includes"
    provenance "Q-4"
  ]
  edge [
    source 6
    target 208
    label "includes"
    provenance "Q-4"
  ]
  edge [
    source 6
    target 209
    label "includes"
    provenance "Q-4"
  ]
  edge [
    source 6
    target 210
    label "includes"
    provenance "Q-4"
  ]
  edge [
    source 6
    target 211
    label "includes"
    provenance "Q-4"
  ]
  edge [
    source 7
    target 212
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 213
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 214
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 215
    label "includes"
    provenance "Q-5"
  ]
  edge [
    source 7
    target 216
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
    target 175
    label "requires"
    provenance "seed"
  ]
  edge [
    source 4
    target 169
    label "requires"
    provenance "seed"
  ]
  edge [
    source 5
    target 183
    label "requires"
    provenance "seed"
  ]
  edge [
    source 6
    target 165
    label "requires"
    provenance "seed"
  ]
  edge [
    source 7
    target 181
    label "requires"
    provenance "seed"
  ]
  edge [
    source 191
    target 164
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 192
    target 178
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 193
    target 185
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 194
    target 168
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 195
    target 167
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 196
    target 175
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 197
    target 180
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 198
    target 173
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 199
    target 172
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 200
    target 174
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 201
    target 177
    label "requires"
    provenance "Q-6"
  ]
  edge [
    source 202
    target 169
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 203
    target 186
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 204
    target 169
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 205
    target 169
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 206
    target 187
    label "requires"
    provenance "Q-3"
  ]
  edge [
    source 207
    target 175
    label "requires"
    provenance "Q-4"
  ]
  edge [
    source 208
    target 188
    label "requires"
    provenance "Q-4"
  ]
  edge [
    source 209
    target 182
    label "requires"
    provenance "Q-4"
  ]
  edge [
    source 210
    target 166
    label "requires"
    provenance "Q-4"
  ]
  edge [
    source 211
    target 184
    label "requires"
    provenance "Q-4"
  ]
  edge [
    source 212
    target 175
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 213
    target 170
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 214
    target 190
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 215
    target 171
    label "requires"
    provenance "Q-5"
  ]
  edge [
    source 216
    target 179
    label "requires"
    provenance "Q-5"
  ]
]
