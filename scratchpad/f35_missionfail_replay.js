// f35_missionfail_replay.js - settle F35 "missions can fail and the failure has a lasting consequence"
// (anchor 6/8; ours=partial, one read on 2026-09-06 = anchors=1). 2nd independent read, RUN not just
// asserted, INCLUDING the skeptical "has the other lane added a failure state since?" check -> it has NOT.
// F35 stays PARTIAL (not a mis-grade). The gap to `yes` (a mission FAILURE state) needs a build in the
// hands-off missions.js, so it is not closeable from this lane.
//
// SPLIT (both halves measured):
//   LASTING CONSEQUENCE = YES. Text quests (textquests.js) apply PERSISTENT reputation penalties on bad
//     choices via HOST.repAdd (end_ignore rep -0.4 :93, end_keep rep -1.5 :116, the_debt end_decline
//     rep -0.3 :136, salvage rep -1.2 :193). Driven below: resolving a quest down a bad branch drops the
//     issuing world's standing and it stays dropped.
//   FAILURE STATE = NO. Contracts (missions.js) cannot FAIL: acceptedT is stored (:277) but read NOWHERE
//     (no deadline/timeout), and the only non-success exits abandon() (:305) and voidM() (:332) are
//     explicitly NO-penalty (:18,:335). index.html imposes no mission-loss penalty (the only negative
//     repAdd are customs contraband :1723 and planet-bombing :2720, neither tied to a mission). Text
//     quests have questsCompleted (:246) but NO questsFailed / no "failed" terminal - every resolution
//     counts as completed.
//   => partial: consequences persist, but no mission can be FAILED. missions.js read-only (hands-off).
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MISS = fs.readFileSync(path.join(ROOT, 'missions.js'), 'utf8');
const TQSRC = fs.readFileSync(path.join(ROOT, 'textquests.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ================= PRESENCE (RUN): a bad quest choice applies a LASTING negative consequence =================
const planets = [{ name: 'Kessari Reach', rep: 0, system: { name: 'Vel Corvi' } }, { name: 'Thorne Anchorage', rep: 0, system: { name: 'Vel Corvi' } }];
const ships = [{ alive: true, role: 'squad', team: 'squad', name: 'Ilya Voss' }, { alive: true, role: 'player', name: 'YOU' }];
const P = { credits: 500, score: 0 };
global.window = { HOST: {
  planets: planets, ships: ships, P: P, T0: 0, RANKS: [{ pts: 0, n: 'Recruit' }],
  repAdd: function (pl, amt) { pl.rep = (pl.rep || 0) + amt; }, checkRankUp: function () {},
} };
const TQ = require(path.join(ROOT, 'textquests.js'));
TQ.CFG.OFFER_CHANCE = 1; TQ.CFG.COOLDOWN_S = 0;

// force the 'missing_shipment' template up (resolving any other offer to clear it), bounded loop
function walkToDone() { let g = 0; while (g++ < 30) { const a = TQ.active(); if (!a) break; let idx = 1; for (const c of a.choices) if (c.enabled) { idx = c.n; break; } const r = TQ.choose(idx); if (r.done) break; } }
let v = null;
for (let i = 0; i < 300 && !(v && v.key === 'missing_shipment'); i++) { v = TQ.tryOffer(planets[0]); if (v && v.key !== 'missing_shipment') { walkToDone(); v = null; } }
check('forced the missing_shipment quest to offer (start node)', !!(v && v.key === 'missing_shipment' && v.node === 'start'));

// missing_shipment start: option 3 = "Not my problem" -> end_ignore; then Continue applies rep -0.4
const repBefore = planets[0].rep;
const r1 = TQ.choose(3);                       // start -> end_ignore
check('choosing "Not my problem" advances to the end_ignore branch (not done yet)', !!(r1 && r1.ok && !r1.done && r1.view && r1.view.node === 'end_ignore'));
const r2 = TQ.choose(1);                        // Continue -> effects rep -0.4, quest resolves
check('resolving that branch completes the quest (done)', !!(r2 && r2.done));
const repAfter = planets[0].rep;
check('the bad choice applied a LASTING negative consequence: issuing rep ' + repBefore.toFixed(2) + ' -> ' + repAfter.toFixed(2) + ' (-0.4)', Math.abs((repBefore - 0.4) - repAfter) < 1e-9);
check('the reputation drop PERSISTS on the world object after the quest closed (TEXTQUESTS.active() is null)', TQ.active() === null && planets[0].rep === repAfter);

// ================= ABSENCE (source, drift-sensitive): no mission can be FAILED =================
// (1) contracts have no deadline: acceptedT is stored but read nowhere else in missions.js
const acceptedTHits = (MISS.match(/acceptedT/g) || []).length;
check('[no-deadline] missions.js stores acceptedT exactly ONCE and reads it nowhere (no timeout/deadline): ' + acceptedTHits + ' occurrence(s)', acceptedTHits === 1);
check('[no-deadline] missions.js has no deadline/timeout/expire/overdue token', !/deadline|timeout|expire|overdue/i.test(MISS));
// (2) the non-success exits are no-penalty
check('[no-fail-exit] abandon() (:305) applies no repAdd/credit penalty (graceful close)', /function abandon\(\)/.test(MISS) && !/abandon[\s\S]{0,300}repAdd/.test(MISS));
check('[no-fail-exit] voidM()/close is explicitly "No penalty" (:335)', /No penalty/.test(MISS));
check('[no-fail-exit] missions.js applies NO negative reputation anywhere (no repAdd with a negative amount)', !/repAdd\([^,]+,\s*-/.test(MISS) && !/repAdd\([^,]+,\s*[^)]*\*-/.test(MISS));
// (3) text quests have no FAILED terminal - every resolution counts as completed
check('[no-fail-terminal] textquests increments questsCompleted (:246) and has NO questsFailed / "failed" state', /questsCompleted/.test(TQSRC) && !/questsFailed/.test(TQSRC) && !/\bfailed\b/i.test(TQSRC));
// (4) index.html imposes no mission-loss penalty: the only negative repAdd are customs + bombing, not missions
const negRep = (IDX.match(/repAdd\([^,]+,\s*-CFG\.REP_[A-Z_]+/g) || []);
check('[no-mission-penalty] index.html negative-repAdd sites are contraband/bombing only, none tied to a contract/mission (' + negRep.length + ' sites)', negRep.every(s => /REP_BOMB/.test(s)) && !/contract[\s\S]{0,120}repAdd\([^,]+,\s*-/i.test(IDX));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (F35 = partial: lasting consequence YES, failure STATE NO)');
process.exit(fail === 0 ? 0 : 1);
