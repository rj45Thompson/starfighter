# The reasoning, as it happened

Every question the model asked itself, every answer, and every answer that was refused and why. Read top to bottom: this is the run.

| event | count |
|---|---:|
| `ASK` | 17 |
| `PARKED` | 16 |
| `ROUND` | 6 |
| `RUN_START` | 1 |
| `APPLIED` | 1 |
| `RUN_END` | 1 |


## Round 1 — 4 gaps in the model, 1 actionable, 5 nodes so far

**❓ Q-1 · `UNDECOMPOSED_SYSTEM` on `the system`**

> The model has 0 epic(s) -- none -- and the ground above holds 28 things the sources describe. What are the spanning stories?

An epic is one arc a player lives through from beginning to end, not a feature area. Name at least 4. Give each its story in the vocabulary the sources use, the state it opens in and the state it must end in, and cite the documented terms it covers, so that between them the epics account for the ground rather than leaving most of it in no story at all.

States with nothing establishing them are where a story can begin: S:at_menu, S:round_decided. States nothing requires are where one can end: S:at_menu, S:round_decided.

Do not write use cases yet. This is the largest level, and the beats come after the arc they are beats of.

*Must: name at least 4 epics, each with its opening and closing state*

**✅ accepted** — Six arcs, chosen so that between them they account for the ground rather than leaving most of it outside any story. The sources document four modes, so the fourth arc is the survival squeeze and the fifth is the invasion alternative — leaving invasion out would have left a documented mode in no story at all.

- added node `E1`
- added node `S:in_field`
- added node `E2`
- added node `S:cargo_full`
- added node `E3`
- added node `S:ship_stronger`
- added node `E4`
- added node `S:back_at_tier_one`
- added node `E5`
- added node `E6`
- added node `S:waves_cleared`
- added `E1 -establishes-> S:at_menu`
- added `E1 -requires-> S:in_field`
- added `E2 -establishes-> S:in_field`
- added `E2 -requires-> S:cargo_full`
- added `E3 -establishes-> S:cargo_full`
- added `E3 -requires-> S:ship_stronger`
- added `E4 -establishes-> S:in_field`
- added `E4 -requires-> S:back_at_tier_one`
- added `E5 -establishes-> S:in_field`
- added `E5 -requires-> S:round_decided`
- added `E6 -establishes-> S:in_field`
- added `E6 -requires-> S:waves_cleared`


## Round 2 — 16 gaps in the model, 6 actionable, 16 nodes so far

**❓ Q-2 · `UNDECOMPOSED_EPIC` on `E1`**

> Epic E1 -- 'Enter a round and take control of a ship' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 4 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 4 ordered child use case(s) under E1*

**⏸ parked** — no answer available yet (`97bf58ddf8bbe6be`)

**❓ Q-3 · `UNDECOMPOSED_EPIC` on `E2`**

> Epic E2 -- 'Mine the belt until the hold is full' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 4 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 4 ordered child use case(s) under E2*

**⏸ parked** — no answer available yet (`3eecc4bf6e91efa1`)

**❓ Q-4 · `UNDECOMPOSED_EPIC` on `E3`**

> Epic E3 -- 'Convert a full hold into a better ship' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 4 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 4 ordered child use case(s) under E3*

**⏸ parked** — no answer available yet (`ba0934ad0e8c0d8d`)

**❓ Q-5 · `UNDECOMPOSED_EPIC` on `E4`**

> Epic E4 -- 'Lose the hold, and then the ship, under fire' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 4 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 4 ordered child use case(s) under E4*

**⏸ parked** — no answer available yet (`89af9a2027523f61`)

**❓ Q-6 · `UNDECOMPOSED_EPIC` on `E5`**

> Epic E5 -- 'Survive the closing field until one pilot is left' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 4 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 4 ordered child use case(s) under E5*

**⏸ parked** — no answer available yet (`a28141dc7ff1fd27`)

**❓ Q-7 · `UNDECOMPOSED_EPIC` on `E6`**

> Epic E6 -- 'Hold the field against the invasion instead' -- currently holds: nothing yet. Break the epic's story into the ordered actor goals it is made of, at least 4 more. Each one is a single goal a single actor achieves in one sitting. Give each its precondition and its postcondition as state literals, because the order of the story is derived from those and not from the order you list them in.

*Must: add at least 4 ordered child use case(s) under E6*

**⏸ parked** — no answer available yet (`25db2557bab054d7`)


## Round 3 — 16 gaps in the model, 6 actionable, 16 nodes so far

**❓ Q-8 · `GOAL_UNREACHED` on `S:in_field`**

> Epic E1 declares it ends with 'the pilot is flying in the field, under their own control' (S:in_field) true, but walking its use cases from the first to the last never makes it true. What is the final use case that establishes it, and what does it require?

*Must: add a use case whose postcondition establishes S:in_field*

**⏸ parked** — no answer available yet (`04faf6555c12d09d`)

**❓ Q-9 · `GOAL_UNREACHED` on `S:cargo_full`**

> Epic E2 declares it ends with "the ship's crystal hold is full" (S:cargo_full) true, but walking its use cases from the first to the last never makes it true. What is the final use case that establishes it, and what does it require?

*Must: add a use case whose postcondition establishes S:cargo_full*

**⏸ parked** — no answer available yet (`80fc73ff85b015b4`)

**❓ Q-10 · `GOAL_UNREACHED` on `S:ship_stronger`**

> Epic E3 declares it ends with 'the ship is measurably better than it was' (S:ship_stronger) true, but walking its use cases from the first to the last never makes it true. What is the final use case that establishes it, and what does it require?

*Must: add a use case whose postcondition establishes S:ship_stronger*

**⏸ parked** — no answer available yet (`ae4bb11c71a79ed6`)

**❓ Q-11 · `GOAL_UNREACHED` on `S:back_at_tier_one`**

> Epic E4 declares it ends with 'the pilot is flying again, back at tier one with nothing' (S:back_at_tier_one) true, but walking its use cases from the first to the last never makes it true. What is the final use case that establishes it, and what does it require?

*Must: add a use case whose postcondition establishes S:back_at_tier_one*

**⏸ parked** — no answer available yet (`9cf22162d533fe81`)

**❓ Q-12 · `GOAL_UNREACHED` on `S:round_decided`**

> Epic E5 declares it ends with 'the round is over and a winner is known' (S:round_decided) true, but walking its use cases from the first to the last never makes it true. What is the final use case that establishes it, and what does it require?

*Must: add a use case whose postcondition establishes S:round_decided*

**⏸ parked** — no answer available yet (`60c92b094d189fd7`)

**❓ Q-13 · `GOAL_UNREACHED` on `S:waves_cleared`**

> Epic E6 declares it ends with 'the final wave has been beaten' (S:waves_cleared) true, but walking its use cases from the first to the last never makes it true. What is the final use case that establishes it, and what does it require?

*Must: add a use case whose postcondition establishes S:waves_cleared*

**⏸ parked** — no answer available yet (`535c02a7da6729d2`)


## Round 4 — 16 gaps in the model, 1 actionable, 16 nodes so far

**❓ Q-14 · `DANGLING_POSTCONDITION` on `S:at_menu`**

> 'Enter a round and take control of a ship' establishes 'the player is at the main menu, in no game' (S:at_menu), and no use case requires it and no epic ends on it. Either name the use case that consumes it, or say the postcondition is wrong. A state nothing needs is either a missing beat or a false claim about what this use case is for.

*Must: add a use case whose precondition requires S:at_menu*

**⏸ parked** — no answer available yet (`8e47fdce4dd875ca`)


## Round 5 — 16 gaps in the model, 3 actionable, 16 nodes so far

**❓ Q-15 · `UNUSED_ACTOR` on `A:pilot`**

> A:pilot 'Pilot' is declared as an actor and performs nothing, so nothing in the model is done on its behalf. Either name the use cases it performs -- what does this actor want, and which beats of which epic serve that? -- or say it should not be an actor at all, which is equally a finding.

*Must: place A:pilot in the chain with a precedes edge*

**⏸ parked** — no answer available yet (`65107c6ed00da9ff`)

**❓ Q-16 · `UNUSED_ACTOR` on `A:rival`**

> A:rival 'Another player' is declared as an actor and performs nothing, so nothing in the model is done on its behalf. Either name the use cases it performs -- what does this actor want, and which beats of which epic serve that? -- or say it should not be an actor at all, which is equally a finding.

*Must: place A:rival in the chain with a precedes edge*

**⏸ parked** — no answer available yet (`df202c497d8a4c4e`)

**❓ Q-17 · `UNUSED_ACTOR` on `A:server`**

> A:server 'The server' is declared as an actor and performs nothing, so nothing in the model is done on its behalf. Either name the use cases it performs -- what does this actor want, and which beats of which epic serve that? -- or say it should not be an actor at all, which is equally a finding.

*Must: place A:server in the chain with a precedes edge*

**⏸ parked** — no answer available yet (`f52fa7cf4f4c723a`)


## Round 6 — 16 gaps in the model, 0 actionable, 16 nodes so far


---

**Run ended: parked** — 6 rounds, 1 oracle calls, 1 answers accepted, 0 refused, 16 gaps still open.

