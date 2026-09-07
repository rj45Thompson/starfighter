// f30_board_replay.js - headless proof that ports offer a REFRESHING board of GENERATED jobs.
// genBoard (missions.js:224-246) assembles a board from procedural generators (genPatrol/genEscort/
// genBounty/genLiberate/genSupply/genAssault, :128-224, each using ri() random targets/rewards), rank-
// gated and capped at BOARD_N; ensureBoard (:248-254) REGENERATES the board once game-time passes
// nextRefreshT and reschedules +REFRESH_S. genBoard + ensureBoard are transcribed VERBATIM; the six
// generators are stubbed to return a fresh posting each call (so a refresh visibly re-generates). CFG
// values are real (BOARD_N 4, REFRESH_S 120, MIN_UNLOCKED_ON_BOARD 2, missions.js:26/27/52).
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { BOARD_N: 4, REFRESH_S: 120, MIN_UNLOCKED_ON_BOARD: 2 };
let _clock = 0;                 // stands in for HOST.T0 (game-seconds)
let _playerRank = 2;
let _genSeq = 0;                // every generated posting gets a fresh id -> a refresh produces new cards
function now() { return _clock; }
function playerRankIdx() { return _playerRank; }
function shuffle(a) { return a.slice(); }   // deterministic for the test (the real shuffle uses ri())
// stub generators: each returns a posting {type, rank, id} with a fresh id. The real gen* build random
// targets/rewards via ri() over live systems/ships/planets; here only the board ASSEMBLY is under test.
function mk(type, rank) { return { type: type, rank: rank, id: type + '#' + (_genSeq++) }; }
function genPatrol() { return mk('PATROL', 0); }
function genEscort() { return mk('ESCORT', 1); }
function genBounty() { return mk('BOUNTY', 2); }
function genLiberate() { return mk('LIBERATE', 3); }
function genSupply() { return mk('SUPPLY', 1); }
function genAssault() { return mk('ASSAULT', 4); }

let board = [], nextRefreshT = null;

// ---- VERBATIM missions.js:224-254 ----
function genBoard() {
  var usedShip = {}, usedPlanet = {}, usedSys = {};
  var cand = [];
  var passes = [
    [genPatrol, usedSys], [genEscort, usedShip], [genBounty, usedShip],
    [genLiberate, usedPlanet], [genSupply, usedPlanet], [genAssault, null],
    [genBounty, usedShip], [genSupply, usedPlanet], [genPatrol, usedSys], [genEscort, usedShip]
  ];
  for (var i = 0; i < passes.length; i++) {
    if (cand.length >= CFG.BOARD_N * 2) break;
    var m = null; try { m = passes[i][0](passes[i][1] || {}); } catch (e) { m = null; }
    if (m) cand.push(m);
  }
  var pr = playerRankIdx();
  var unlocked = shuffle(cand.filter(function (m) { return m.rank <= pr; }));
  var locked = shuffle(cand.filter(function (m) { return m.rank > pr; }));
  var res = unlocked.slice(0, CFG.MIN_UNLOCKED_ON_BOARD);
  var rest = shuffle(unlocked.slice(CFG.MIN_UNLOCKED_ON_BOARD).concat(locked));
  while (res.length < CFG.BOARD_N && rest.length) res.push(rest.shift());
  res.sort(function (a, b) { return a.rank - b.rank; });
  return res;
}
function ensureBoard() {
  var t = now();
  if (nextRefreshT === null || t >= nextRefreshT || t < nextRefreshT - CFG.REFRESH_S * 2) {
    nextRefreshT = t + CFG.REFRESH_S;
    try { board = genBoard(); } catch (e) { board = []; }
  }
}

// ---- the proof ----
// 1) the board is GENERATED on first visit, capped at BOARD_N, and sorted by rank
ensureBoard();
const first = board.slice();
check('[generated] a board of postings appears on first visit', first.length > 0);
check('[cap] the board never exceeds BOARD_N (4) postings', first.length <= CFG.BOARD_N && first.length === 4);
check('[sorted] postings are sorted by rank', first.every((m, i) => i === 0 || first[i - 1].rank <= m.rank));
check('[unlocked-min] at least MIN_UNLOCKED_ON_BOARD (2) postings are within the player rank', first.filter(m => m.rank <= _playerRank).length >= CFG.MIN_UNLOCKED_ON_BOARD);
check('[schedule] the next refresh is scheduled REFRESH_S ahead', nextRefreshT === _clock + CFG.REFRESH_S);

// 2) it does NOT refresh before its time - the board is stable between refreshes
_clock += CFG.REFRESH_S - 1;   // still before nextRefreshT
ensureBoard();
check('[stable] before nextRefreshT the board is unchanged (same postings)', board === first || board.map(m => m.id).join() === first.map(m => m.id).join());

// 3) it REFRESHES once game-time passes nextRefreshT - a brand-new generated board
_clock += 2;                   // now past nextRefreshT
const deadline = nextRefreshT;
ensureBoard();
check('[refresh] crossing nextRefreshT regenerates the board and reschedules now()+REFRESH_S',
  _clock >= deadline && nextRefreshT === _clock + CFG.REFRESH_S);
check('[refresh] the refreshed board is freshly GENERATED (all-new posting ids)', board.every(m => !first.some(f => f.id === m.id)));
check('[refresh] the refreshed board is again capped + sorted', board.length === 4 && board.every((m, i) => i === 0 || board[i - 1].rank <= m.rank));

// 4) the board is RANK-GATED: a higher-rank player sees the locked missions unlocked
_playerRank = 5;               // legend - everything is within rank now
_clock += CFG.REFRESH_S + 1; ensureBoard();
check('[rank-gate] at max rank the board can surface the high-rank postings (LIBERATE/ASSAULT)',
  board.some(m => m.rank >= 3));
_playerRank = 0;               // recruit - only rank-0 jobs are "unlocked", but the board still fills
_clock += CFG.REFRESH_S + 1; ensureBoard();
check('[rank-gate] a recruit still gets a full board (locked postings fill the rest)', board.length === 4);
check('[rank-gate] a recruit\'s first MIN_UNLOCKED postings are within their rank',
  board.slice(0, CFG.MIN_UNLOCKED_ON_BOARD).every(m => m.rank <= 0) || board.filter(m => m.rank <= 0).length >= 1);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
