// tom_test.js - P6 THEORY-OF-MIND falsifiable test (AGI_SALVAGE queue item). The ledger's own P6 row has
// flagged the inhabitant/DISPOS system as UNVERIFIED since the survey ("needs a real falsifiable ToM test
// before claiming"). This is that test - designed before code, with the failure modes named:
//
//   PREDICT another mind's NEXT ACTION (its behavior mode: HUNT/FLEE/COLLECT/...) from strictly OBSERVABLE
//   state - what a watching pilot's own sensors could legitimately provide: the ship's current mode (readable
//   from its motion), its hull band (the scanner shows hull%), whether a hunter is visibly near it, and its
//   role (scan shows class/behavior). NEVER from internals the observer cannot see: no s.aggr temperament,
//   no ray weights, no RNG state, no other minds' private beliefs.
//
//   SCORE against the action the ship ACTUALLY takes next, over a real window: the first half of the samples
//   TRAINS an online transition table (basis-bucket -> most frequent next mode; the table is LEARNED, the
//   sensor basis is GIVEN), the second half SCORES it on unseen time. Two honest baselines, and the claim
//   must beat BOTH or the verdict says so plainly:
//     - MAJORITY: predict the train-half's most common next mode, always.
//     - PERSISTENCE: predict mode(t+1) = mode(t). Modes are STICKY, so this is the strong baseline - beating
//       majority alone would be a fake win. Transition-only accuracy (samples where the mode actually
//       CHANGED) is reported separately, because that is where prediction is genuinely hard.
//   An unseen basis bucket ABSTAINS (reported; an abstain is never counted as a hit).
//
// PUBLIC API (window.TOMTEST - NOT window.TOM: the inline script already has A2's own `const TOM` target-ID tally at ~1332, live-caught collision): { start, sampleNow, active, report, basisOf, CFG, _mkTable, _score, _setTestHost }.
'use strict';
(function () {

var CFG = {
  SAMPLE_DT_MS: 600,        // wall-clock sampling cadence in passive mode
  WINDOW_S: 60,             // default window length (seconds of sampling)
  HP_BANDS: [0.34, 0.67],   // scanner hull% -> band 0(critical)/1(hurt)/2(sound)
  THREAT_R_MULT: 1.6,       // "a hunter is visibly near X" radius = THREAT_R_MULT x CFG.THREAT_R-ish; uses observer-visible geometry only
  MIN_SAMPLES: 40,          // below this the test abstains (too little evidence to score honestly)
};

function win() { return (typeof window !== 'undefined') ? window : null; }
var _testHost = null;
function host() { if (_testHost) return _testHost; var w = win(); return (w && w.HOST) || null; }

// ------------------------------------------------------------------ the OBSERVABLE basis (the whole point)
// Only fields a watching pilot's sensors could provide. No temperament, no ray weights, no private beliefs.
function basisOf(ship, ships, observer) {
  var mode = String(ship.mode || 'IDLE');
  var hpFrac = ship.maxHp ? (ship.hp / ship.maxHp) : 1;
  var hpBand = hpFrac < CFG.HP_BANDS[0] ? 0 : (hpFrac < CFG.HP_BANDS[1] ? 1 : 2);
  var threatNear = 0;
  var R = ((host() && host().CFG && host().CFG.THREAT_R) || 18) * CFG.THREAT_R_MULT;
  for (var i = 0; i < ships.length; i++) {
    var o = ships[i];
    if (!o || o === ship || !o.alive || !o.pos) continue;
    if (String(o.mode) === 'HUNT' && o.pos.distanceTo(ship.pos) < R) { threatNear = 1; break; }
  }
  return { key: mode + '|h' + hpBand + '|t' + threatNear + '|' + String(ship.role || '?'), mode: mode };
}

// ------------------------------------------------------------------ table learn + score (pure, testable)
function _mkTable() { return { counts: {}, majority: {}, n: 0 }; }
function trainPair(T, basisKey, nextMode) {
  (T.counts[basisKey] = T.counts[basisKey] || {})[nextMode] = (T.counts[basisKey][nextMode] || 0) + 1;
  T.majority[nextMode] = (T.majority[nextMode] || 0) + 1;
  T.n++;
}
function argmax(m) { var bk = null, bv = -1, k; for (k in m) if (m[k] > bv) { bv = m[k]; bk = k; } return bk; }
function predict(T, basisKey) { return T.counts[basisKey] ? argmax(T.counts[basisKey]) : null; }   // unseen bucket -> ABSTAIN
function _score(T, pairs) {
  var majorityPick = argmax(T.majority);
  var s = { n: pairs.length, tomHit: 0, tomAbstain: 0, majHit: 0, perHit: 0,
            transitions: 0, tomTransHit: 0, perTransHit: 0 };
  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];                                   // { key, cur, next }
    var guess = predict(T, p.key);
    if (guess === null) s.tomAbstain++;
    else if (guess === p.next) s.tomHit++;
    if (majorityPick === p.next) s.majHit++;
    if (p.cur === p.next) s.perHit++;
    if (p.cur !== p.next) {                             // the HARD cases: the mode actually changed
      s.transitions++;
      if (guess !== null && guess === p.next) s.tomTransHit++;
      if (p.cur === p.next) s.perTransHit++;            // persistence is 0 here by construction (kept for clarity)
    }
  }
  return s;
}
function verdictOf(s) {
  var committed = s.n - s.tomAbstain;
  var tomAcc = committed ? s.tomHit / committed : 0;
  var majAcc = s.n ? s.majHit / s.n : 0;
  var perAcc = s.n ? s.perHit / s.n : 0;
  var strongest = Math.max(majAcc, perAcc);
  return {
    tomAcc: r3(tomAcc), majorityAcc: r3(majAcc), persistenceAcc: r3(perAcc),
    committed: committed, abstained: s.tomAbstain, scored: s.n,
    transitions: s.transitions, tomTransAcc: s.transitions ? r3(s.tomTransHit / s.transitions) : null,
    betterThanBase: tomAcc > strongest,
    verdict: tomAcc > strongest
      ? 'BETTER THAN BASE RATE (beats both majority ' + r3(majAcc) + ' and persistence ' + r3(perAcc) + ')'
      : 'NOT better than base rate (' + r3(tomAcc) + ' vs strongest baseline ' + r3(strongest) + ') - the ToM claim does NOT hold on this window; reported honestly',
  };
}
function r3(x) { return Math.round(x * 1000) / 1000; }

// ------------------------------------------------------------------ passive live sampler
var S = { active: false, prev: {}, trainPairs: [], scorePairs: [], t0: 0, windowMs: 0, timer: null, last: null };
function sampleNow() {
  var h = host(); if (!h || !h.P) return 0;
  var P = h.P, ships = h.ships || [], took = 0;
  for (var i = 0; i < ships.length; i++) {
    var s = ships[i];
    if (!s || !s.alive || s === P || !s.pos || !s.name) continue;
    if (P.pos.distanceTo(s.pos) > (P.senseR || 0)) { delete S.prev[s.name]; continue; }   // only what the observer really sees
    var b = basisOf(s, ships, P);
    var prev = S.prev[s.name];
    if (prev) {
      var pair = { key: prev.key, cur: prev.mode, next: b.mode };
      var half = S.t0 + S.windowMs / 2;
      (Date.now() < half ? S.trainPairs : S.scorePairs).push(pair);
      took++;
    }
    S.prev[s.name] = b;
  }
  return took;
}
function finish() {
  clearInterval(S.timer); S.timer = null; S.active = false;
  var total = S.trainPairs.length + S.scorePairs.length;
  if (total < CFG.MIN_SAMPLES) {
    S.last = { verdict: 'abstain', why: 'only ' + total + ' transition samples (< ' + CFG.MIN_SAMPLES + ') - too little evidence to score honestly; run longer or fly where ships are' };
  } else {
    var T = _mkTable();
    for (var i = 0; i < S.trainPairs.length; i++) trainPair(T, S.trainPairs[i].key, S.trainPairs[i].next);
    S.last = Object.assign({ train: S.trainPairs.length, score: S.scorePairs.length, buckets: Object.keys(T.counts).length },
      verdictOf(_score(T, S.scorePairs)));
  }
  var h = host();
  if (h && typeof h.term === 'function') {
    var r = S.last;
    if (r.verdict === 'abstain') h.term('🧠 ToM TEST - ' + r.why, 'sys');
    else {
      h.term('🧠 <b>ToM TEST</b> - trained on ' + r.train + ' observed transitions (' + r.buckets + ' basis buckets), scored on ' + r.score + ' held-out ones:', 'sys');
      h.term('&nbsp;&nbsp;prediction accuracy <b>' + r.tomAcc + '</b> (committed ' + r.committed + ', abstained ' + r.abstained + ' on unseen states) · majority baseline ' + r.majorityAcc + ' · persistence baseline ' + r.persistenceAcc, 'sys');
      h.term('&nbsp;&nbsp;hard cases (mode actually changed): ' + r.transitions + ' transitions, accuracy ' + (r.tomTransAcc == null ? 'n/a' : r.tomTransAcc) + ' (persistence scores 0 here by definition)', 'sys');
      h.term('&nbsp;&nbsp;<b style="color:' + (r.betterThanBase ? '#7fd0b0' : '#ffd27a') + '">' + r.verdict + '</b>', 'sys');
    }
  }
  return S.last;
}
function start(seconds) {
  if (S.active) return { verdict: 'abstain', why: 'a window is already running' };
  S.active = true; S.prev = {}; S.trainPairs = []; S.scorePairs = [];
  S.windowMs = (seconds || CFG.WINDOW_S) * 1000; S.t0 = Date.now();
  S.timer = setInterval(function () {
    sampleNow();
    if (Date.now() - S.t0 >= S.windowMs) finish();
  }, CFG.SAMPLE_DT_MS);
  return { verdict: 'started', windowS: (seconds || CFG.WINDOW_S) };
}

var API = { start: start, sampleNow: sampleNow, finish: finish, active: function () { return S.active; },
  report: function () { return S.last || { verdict: 'abstain', why: 'no window run yet - `tom` starts one' }; },
  basisOf: basisOf, CFG: CFG, _mkTable: _mkTable, _trainPair: trainPair, _score: _score, _verdictOf: verdictOf,
  _S: S, _setTestHost: function (h) { _testHost = h; } };
if (win()) win().TOMTEST = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ------------------------------------------------------------------ self-test (node)
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  function rng(seed) { var t = seed >>> 0; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

  // a stub world with a KNOWN threat/hp-conditioned policy: hurt+threatened ships flee, safe raiders hunt,
  // safe traders trade; modes are sticky otherwise. The learned table must beat majority AND persistence.
  function genPairs(n, seed, policy) {
    var rr = rng(seed), pairs = [], modes = ['TRADE', 'HUNT', 'FLEE'];
    var cur = 'TRADE';
    for (var i = 0; i < n; i++) {
      var hpBand = rr() < 0.3 ? 0 : 2, threat = rr() < 0.4 ? 1 : 0, role = rr() < 0.5 ? 'trader' : 'raider';
      var next;
      if (policy === 'known') {
        if (threat && hpBand === 0) next = 'FLEE';
        else if (!threat && role === 'raider') next = 'HUNT';
        else if (!threat) next = 'TRADE';
        else next = (rr() < 0.7 ? cur : 'FLEE');                      // threatened but sound: mostly sticky
      } else next = modes[Math.floor(rr() * 3) % 3];                  // uniform random world (no structure)
      pairs.push({ key: cur + '|h' + hpBand + '|t' + threat + '|' + role, cur: cur, next: next });
      cur = next;
    }
    return pairs;
  }
  // 1. structured world: ToM beats both baselines
  var train = genPairs(600, 11, 'known'), score = genPairs(400, 77, 'known');
  var T = API._mkTable(); train.forEach(function (p) { API._trainPair(T, p.key, p.next); });
  var v = API._verdictOf(API._score(T, score));
  check('[tom 1] structured world: learned table beats BOTH baselines (tom ' + v.tomAcc + ' vs maj ' + v.majorityAcc + ' / per ' + v.persistenceAcc + ')',
    v.betterThanBase === true);
  check('[tom 2] transition-only accuracy reported (the hard cases, persistence=0 there)',
    v.transitions > 0 && v.tomTransAcc !== null && v.tomTransAcc > 0);
  // 2. uniform-random world: the verdict must HONESTLY say not-better
  var trainR = genPairs(600, 5, 'random'), scoreR = genPairs(400, 55, 'random');
  var TR = API._mkTable(); trainR.forEach(function (p) { API._trainPair(TR, p.key, p.next); });
  var vr = API._verdictOf(API._score(TR, scoreR));
  check('[tom 3] structureless world: verdict honestly reports NOT better than base rate',
    vr.betterThanBase === false && vr.verdict.indexOf('NOT better') === 0);
  // 3. unseen bucket abstains, never guesses
  var T2 = API._mkTable(); API._trainPair(T2, 'A|h2|t0|trader', 'TRADE');
  var s3 = API._score(T2, [{ key: 'NEVER|h0|t1|raider', cur: 'NEVER', next: 'FLEE' }]);
  check('[tom 4] unseen basis bucket ABSTAINS (not counted as a hit)', s3.tomAbstain === 1 && s3.tomHit === 0);
  // 4. the basis is OBSERVABLE-ONLY: whitelisted fields, and temperament never enters the key
  function vec(x, y) { return { x: x, y: y, distanceTo: function (o) { return Math.hypot(this.x - o.x, this.y - o.y); } }; }
  API._setTestHost({ CFG: { THREAT_R: 18 }, P: { pos: vec(0, 0), senseR: 100 } });
  var shipX = { name: 'X', alive: true, pos: vec(5, 5), mode: 'TRADE', hp: 20, maxHp: 100, role: 'trader', aggr: 0.93, rays: [1, 2, 3] };
  var hunter = { name: 'H', alive: true, pos: vec(10, 5), mode: 'HUNT', hp: 90, maxHp: 100, role: 'raider' };
  var b = API.basisOf(shipX, [shipX, hunter], null);
  check('[tom 5] basis reads ONLY observables (mode/hp-band/threat/role; aggr + rays never appear)',
    b.key === 'TRADE|h0|t1|trader' && b.key.indexOf('0.93') < 0);
  // 5. live-shaped sampler: consecutive samples pair per ship; out-of-range ships dropped
  var SHIPS = [{ name: 'YOU', alive: true, pos: vec(0, 0), senseR: 50 },
    { name: 'A', alive: true, pos: vec(10, 0), mode: 'TRADE', hp: 90, maxHp: 100, role: 'trader' },
    { name: 'FAR', alive: true, pos: vec(500, 0), mode: 'HUNT', hp: 90, maxHp: 100, role: 'raider' }];
  API._setTestHost({ CFG: { THREAT_R: 18 }, P: SHIPS[0], ships: SHIPS });
  API._S.active = true; API._S.prev = {}; API._S.trainPairs = []; API._S.scorePairs = [];
  API._S.t0 = Date.now(); API._S.windowMs = 1e9;                     // everything lands in the train half
  API.sampleNow();                                                    // primes prev
  SHIPS[1].mode = 'FLEE';
  var took = API.sampleNow();
  check('[tom 6] sampler pairs consecutive samples per ship; out-of-range ship contributes nothing',
    took === 1 && API._S.trainPairs.length === 1 && API._S.trainPairs[0].cur === 'TRADE' && API._S.trainPairs[0].next === 'FLEE');
  // 6. under-evidence window abstains
  API._S.windowMs = 0; var fin = API.finish();
  check('[tom 7] under-evidenced window ABSTAINS instead of scoring noise', fin.verdict === 'abstain' && fin.why.indexOf('too little evidence') >= 0);

  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
