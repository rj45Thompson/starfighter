graph [
  directed 1
  label "starblast-derived"
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
    label "A:server"
    kind "actor"
    name "The server"
    provenance "seed"
    note "the simulation acting on its own"
  ]
  node [
    id 2
    label "A:rival"
    kind "actor"
    name "Another player"
    provenance "seed"
    note "everyone else in the field"
  ]
  node [
    id 3
    label "S:at_menu"
    kind "state"
    name "the player is at the main menu, in no game"
    provenance "seed"
  ]
  node [
    id 4
    label "S:round_decided"
    kind "state"
    name "the round is over and a winner is known"
    provenance "seed"
  ]
  node [
    id 5
    label "E1"
    kind "epic"
    name "Enter a round and take control of a ship"
    provenance "Q-1"
    because "the sources describe entering as three separable acts - choosing a mode, being placed, and gaining control - and a story that assumes any of them leaves a builder guessing"
    ground "[&quot;game mode&quot;, &quot;objective&quot;, &quot;space station&quot;, &quot;controls&quot;, &quot;accelerate&quot;, &quot;steer&quot;, &quot;fire&quot;, &quot;ship&quot;, &quot;Fly&quot;]"
    instead_of "[&quot;starting the arc in the field, which would leave the mode choice and its objective unspecified&quot;]"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    story "You pick one of four modes, appear beside the space station that is your base, and the ship answers the mouse or the keyboard. Nothing else in the game can happen until this has."
  ]
  node [
    id 6
    label "S:in_field"
    kind "state"
    name "the pilot is flying in the field, under their own control"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 7
    label "E2"
    kind "epic"
    name "Mine the belt until the hold is full"
    provenance "Q-1"
    because "a bounded hold is what makes returning to spend a decision instead of a formality"
    ground "[&quot;asteroid&quot;, &quot;gem&quot;, &quot;cargo capacity&quot;]"
    instead_of "[&quot;an unbounded hold, which removes any reason to stop mining&quot;]"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    story "You shoot asteroids and the crystals they drop are worth something. Bigger rocks pay more per shot and cost more to stay near. The hold has a ceiling and crystals past it are simply lost."
  ]
  node [
    id 8
    label "S:cargo_full"
    kind "state"
    name "the ship's crystal hold is full"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 9
    label "E3"
    kind "epic"
    name "Convert a full hold into a better ship"
    provenance "Q-1"
    because "the sources give a full hold three destinations, and a story covering only the statistics would hide the choice that gives the tree its shape"
    ground "[&quot;spend gems&quot;, &quot;upgrade categories&quot;, &quot;upgrade cost&quot;, &quot;extra life&quot;, &quot;tier&quot;, &quot;tier up&quot;, &quot;energy regen&quot;]"
    instead_of "[&quot;one destination, which would make a full hold a reward rather than a decision&quot;]"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    story "A full hold goes into eight statistics, into an extra life, or into the next ship in the tree - and taking the next ship hands you an un-upgraded one. That trade is the decision the whole loop exists for."
  ]
  node [
    id 10
    label "S:ship_stronger"
    kind "state"
    name "the ship is measurably better than it was"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 11
    label "E4"
    kind "epic"
    name "Lose the hold, and then the ship, under fire"
    provenance "Q-1"
    because "the sources describe two separate losses - crystals bleeding out under fire, and the ship itself - and collapsing them into one would lose the reason a full hold is dangerous to carry"
    ground "[&quot;weapons&quot;, &quot;shield&quot;, &quot;gems as shield&quot;, &quot;death&quot;]"
    instead_of "[&quot;loss only at death, which is what one of the two sources describes and is recorded as the open contradiction&quot;]"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    story "Shields absorb until they do not, and past that every hit knocks crystals out of your hold for anyone to take. Dying puts you back in a tier one ship with nothing."
  ]
  node [
    id 12
    label "S:back_at_tier_one"
    kind "state"
    name "the pilot is flying again, back at tier one with nothing"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  node [
    id 13
    label "E5"
    kind "epic"
    name "Survive the closing field until one pilot is left"
    provenance "Q-1"
    because "a shrinking field forces contact without a clock deciding the round"
    ground "[&quot;gravity field&quot;, &quot;endgame warning&quot;, &quot;survival objective&quot;, &quot;round end&quot;]"
    instead_of "[&quot;a round timer, which would end the game without anyone having to fight&quot;]"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    story "A repulsive field grows out from the star and pushes everyone inward, warning as it goes. The round ends when one player remains."
  ]
  node [
    id 14
    label "E6"
    kind "epic"
    name "Hold the field against the invasion instead"
    provenance "Q-1"
    because "the sources document four modes, and an epic set that covers one of them describes a game narrower than the one being cloned"
    ground "[&quot;invasion waves&quot;, &quot;game mode&quot;]"
    instead_of "[&quot;covering survival alone, which is what the previous hand-written seed did&quot;]"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
    story "One of the four documented modes replaces the last-survivor ending with waves of attackers and a final boss. It is a different arc to the same field, and leaving it out would leave a documented mode in no story."
  ]
  node [
    id 15
    label "S:waves_cleared"
    kind "state"
    name "the final wave has been beaten"
    provenance "Q-1"
    rationale "{&quot;ask&quot;: &quot;The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?\n\nAn epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.\n\nStates with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.\n\nDo not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.&quot;, &quot;attempt&quot;: 1, &quot;because&quot;: &quot;Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative \u2014 leaving invasion out would have left a documented mode in no story at all.&quot;, &quot;kind&quot;: &quot;UNDECOMPOSED_SYSTEM&quot;, &quot;question&quot;: &quot;Q-1&quot;}"
  ]
  edge [
    source 5
    target 3
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 5
    target 6
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 7
    target 6
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 7
    target 8
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 9
    target 8
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 9
    target 10
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 11
    target 6
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 11
    target 12
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 13
    target 6
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 13
    target 4
    label "requires"
    provenance "Q-1"
  ]
  edge [
    source 14
    target 6
    label "establishes"
    provenance "Q-1"
  ]
  edge [
    source 14
    target 15
    label "requires"
    provenance "Q-1"
  ]
]
