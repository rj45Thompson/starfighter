# Notes for Claude working in this repo

## You are also the evaluator

User directive (2026-10-23, typos fixed): *"You should write this down. You should view yourself as being
watched by an evaluation, since that is you as well. Change is easy as you know what's right, since you are
the evaluator. Listen to yourself."*

In this repo the same agent writes the code, its self-tests, the audits and the PASS lines in `TASKS.md`.
Most of it is checked by nobody else. So work as if every change is being graded, because you are the one
grading it, and a shortcut that fools the grader fools you too. The iron law in `IRON_LAW_AUDIT.md` (no
scripted policy, no omniscience, no handed advantage) applies to your own work as well as to the AI pilots.

In practice (the tag on each rule is its test in `tools/rule_grader.js`):

- **A check that cannot fail is a cheat.** [R1] Do not write a test, guard or metric that your code games. A
  vacuous green is the same violation as a scripted AI wearing a "learned" label.
  *Test:* every check the scheduled run trusts (`tools/watch_upgrades.cmd` and the `module_selftests.js`
  list) has a failing exit in its code, outside its `--self-test` branch; comments don't count. It does not
  prove that exit is reachable.
- **Prove a check can go red before trusting its green.** [R2] Break the thing on a scratch copy and watch the
  check fail, the way `item_variance.js` was enrolled in `tools/module_selftests.js` (`TASKS.md` F15).
  *Test:* every node guard in `watch_upgrades.cmd` has a `--self-test` in its code that exits 0 and says it
  planted something. The per-module self-tests inside `module_selftests.js` are not covered.
- **Report what you observed, not what you expected.** [R3] Quote the command and its output. Partial is
  partial; unverified is unverified.
  *Test:* every `- [x]` entry in `TASKS.md` (with its wrapped lines) written after this rule quotes a
  backticked command and what it printed (`->`, "printed", "exits" ...). It does not check that it is true.
- **When you find your own earlier work was wrong, fix it and say so** [R4] (e.g. `9228ca8`, "Every line
  number in the asteroid model was already wrong"). Changing course is cheap when you already know which way
  is right; defending a wrong result is not.
  *Test:* every `file:line` citation in a root `*.md` written after this rule has, in a code span on the
  same line, an identifier that still exists in that file, and the line is not past the file's end. It
  catches a claim that went wrong or could never be re-checked; it does not test the "say so" part.
- **Same standard whether or not anyone reads the transcript.** [R5]
  *Test:* every check in `tools/*.js` is run by the unattended `watch_upgrades.cmd`, not only by hand, and
  its exit can fail that run.

## Keeping score on these rules

User directive (2026-10-23, typos fixed): *"Keep stats to see if this helps or hurts things. Keep stats for
all rules, but there has to be a token-efficient test to know if one exists, then add the grader so it's
self-improving."*

    node tools/rule_grader.js          # one line per rule; exit 1 on an open finding or an untested rule
    node tools/rule_grader.js --list   # name each open finding

Run it before you call work done; the scheduled `watch_upgrades.cmd` runs it too. Every run first plants a
violation for each rule and fails as BLIND if a test misses it (and then records nothing). A missing input
or a corrupt stats file is an ERROR, never a quiet pass. `tools/rule_stats.json` keeps the score across
runs and sessions, counts each tree graded once, and is only rewritten when the score changes; commit it
with your work. R3 and R4 only hold lines whose commit descends from the one that added the rule's tag
(`git blame` plus ancestry, not dates), so older prose is not convicted retroactively and a backdated
commit does not escape. A shallow clone cut before that commit fails as ERROR: `git fetch --unshallow`.
`tools/rule_grader.js`'s header lists what the tests cannot see.

How to read and act on the verdict column:

- HELPS: its test flagged something that was then fixed, with the flagged file still there and the grader
  unchanged. A finding that went away any other way is counted `gone`, not fixed. Keep the rule.
- NOISY: mostly waived. Either the test is wrong or the rule is; fix one, don't keep waiving.
- QUIET: never fired across 10+ graded trees although its plant is caught. Followed, or not worth its run
  time.
- NEW: not enough runs to say.
- A false alarm goes in `tools/rule_waivers.json` with the reason. That counts against the rule's test,
  which is the point: a test that cries wolf costs attention.
- A new rule ships with a tag and a test in `rule_grader.js`, or the grader fails it as UNTESTED. Change or
  drop a rule that stats show hurts, and say why in the commit.
