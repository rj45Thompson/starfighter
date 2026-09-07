// f32_rankgate_replay.js - headless proof that some missions are LOCKED BEHIND A RANK THRESHOLD.
// Each mission type carries a rank gate (CFG.RANK_PATROL 0 .. RANK_ASSAULT 3, missions.js:36-38, set on the
// mission by mkMission :113-122); accept() (:286-302) REFUSES a posting whose rank exceeds the player's rank,
// naming the rank required. accept/playerRankIdx/rankName/rankScoreOf/ranks are transcribed VERBATIM; RANKS is
// the real game array (index.html:3994). (Reputation is a mission REWARD REP_BASE :32, not a gate - the
// "rank OR reputation" capability is met by the rank lock.)
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { RANK_PATROL: 0, RANK_ESCORT: 1, RANK_BOUNTY: 1, RANK_LIBERATE: 2, RANK_SUPPLY: 2, RANK_ASSAULT: 3 };
// real RANKS (index.html:3994); missions.js rankScoreOf reads .score OR .pts
const RANKS = [{ pts: 0, n: 'Recruit' }, { pts: 25, n: 'Ranger' }, { pts: 70, n: 'Veteran' }, { pts: 150, n: 'Ace' }, { pts: 300, n: 'Commander' }, { pts: 550, n: 'Legend' }];
let _player = { score: 0 };
const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const str = (v, d) => (typeof v === 'string' && v) ? v : d;
function player() { return _player; }
function ranks() { return RANKS; }
function rankScoreOf(r) { if (!r) return 0; if (typeof r.score === 'number') return r.score; if (typeof r.pts === 'number') return r.pts; return 0; }
function rankName(i) { var rs = ranks(); if (!rs.length) return 'rank ' + i; var j = Math.max(0, Math.min(i, rs.length - 1)); return str(rs[j] && rs[j].n, 'rank ' + i); }
function playerRankIdx() {
  var p = player(), sc = p ? num(p.score, 0) : 0, rs = ranks(), idx = 0;
  for (var i = 0; i < rs.length; i++) if (sc >= rankScoreOf(rs[i])) idx = i;
  return idx;
}
// mkMission's rank field (missions.js:119): a mission's rank IS its type's gate
function mkMission(type, rank) { return { type: type, rank: rank, title: type + ' job', desc: 'do the ' + type }; }
function genPatrol() { return mkMission('PATROL', CFG.RANK_PATROL); }
function genAssault() { return mkMission('ASSAULT', CFG.RANK_ASSAULT); }

let board = [], activeM = null;
function validateFresh() { return { ok: true, msg: '' }; }
function initState() {}
function notify() {}
const esc = s => String(s);
// ---- VERBATIM missions.js:286-302 ----
function accept(idx) {
  try {
    var i = (idx | 0) - 1;
    if (!board.length) return { ok: false, msg: 'no postings up - check the mission board' };
    if (i < 0 || i >= board.length) return { ok: false, msg: 'no such posting (1-' + board.length + ')' };
    if (activeM) return { ok: false, msg: 'already on assignment (' + activeM.title + ') - abandon it first' };
    var m = board[i];
    var pr = playerRankIdx();
    if (m.rank > pr) return { ok: false, msg: 'requires ' + rankName(m.rank) + ' rank (you are ' + rankName(pr) + ')' };
    var v = validateFresh(m);
    if (!v.ok) { board.splice(i, 1); return { ok: false, msg: v.msg }; }
    board.splice(i, 1);
    activeM = m; initState(m);
    notify();
    return { ok: true, msg: 'accepted: ' + m.title };
  } catch (e) { return { ok: false, msg: 'mission board offline' }; }
}

// ---- the proof ----
// 1) each mission type carries its own rank gate
check('[gate] a PATROL posting is rank 0, an ASSAULT posting is rank 3', genPatrol().rank === 0 && genAssault().rank === 3);
check('[ranks] the gate constants span Recruit(0)..Ace(3)', CFG.RANK_PATROL === 0 && CFG.RANK_ASSAULT === 3);

// 2) playerRankIdx maps score -> rank index (real RANKS thresholds)
check('[rank] score 0 -> Recruit (idx 0)', (_player = { score: 0 }, playerRankIdx() === 0));
check('[rank] score 150 -> Ace (idx 3)', (_player = { score: 150 }, playerRankIdx() === 3));
check('[rank] score 550 -> Legend (idx 5)', (_player = { score: 550 }, playerRankIdx() === 5));

// 3) a RECRUIT is LOCKED OUT of the high-rank ASSAULT, and the refusal names the required rank
_player = { score: 0 };                                   // Recruit, rank idx 0
board = [genPatrol(), genAssault()];                      // posting 1 = PATROL (r0), posting 2 = ASSAULT (r3)
const rAssault = accept(2);
check('[lock] a Recruit cannot accept the ASSAULT posting', !rAssault.ok);
check('[lock] the refusal names the rank required (Ace) and the player rank (Recruit)', /requires Ace rank \(you are Recruit\)/.test(rAssault.msg));
check('[lock] the locked posting is NOT consumed (stays on the board)', board.length === 2);

// 4) the SAME Recruit CAN accept the at-rank PATROL
const rPatrol = accept(1);
check('[unlocked] a Recruit accepts the PATROL posting (rank 0)', rPatrol.ok && /accepted/.test(rPatrol.msg));

// 5) reaching the required rank UNLOCKS the mission
activeM = null;                                           // clear the assignment
_player = { score: 550 };                                 // Legend, rank idx 5 >= 3
board = [genAssault()];
const rNow = accept(1);
check('[unlock] at Legend rank the ASSAULT posting is now acceptable', rNow.ok && /accepted/.test(rNow.msg));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
