// kripke_mind.js - THE KRIPKE DIAMOND, ported into the game (user 2026-07-09: "I was expecting we had kripke
// diamond but it was on a totally different repo!"). The ecosystem holds several Kripke-style verifiers (TDRE
// lineage kripke.py - ARC-grid-bound; sober-ai KripkeFrame - needs pre-built fact-checkers); this is the honest
// PORT OF THE IDEA onto the substrate this game actually has, not a copy of grid-bound code:
//
//   FRAME: one possible WORLD per MIND. A mind's world = what it can actually know under the store's own
//   isolation rule (knowledge.js `know(agent)`: shared ∪ that agent's private - never another mind's secrets).
//   The accessibility relation is total over living minds (an S5-style equivalence: every mind considers every
//   mind's epistemic state possible) - so the modal operators collapse to the crisp, checkable pair:
//     □ fact  (BOX / NECESSARY)  = the fact holds in EVERY mind's world  -> "all minds know this"
//     ◇ fact  (DIAMOND/POSSIBLE) = the fact holds in AT LEAST ONE world  -> "some mind knows this"
//   and their real teeth: □ is exactly "shared tier" (one copy every agent reads), while a ◇-but-not-□ fact
//   names WHICH minds hold it - the private/secret knowledge the two-tier store was built to isolate.
//
//   0-FABRICATION: every verdict is a set-membership check against the store's real edge keys. There is no
//   scoring, no similarity, no guess - a fact is in a world or it is not. Asking about an unknown fact returns
//   NOWHERE (false in all worlds), never an invention.
//
// PUBLIC API (window.KRIPKE): { verdict(s,r,o), worlds(), holders(s,r,o), summary() }.
//   verdict() -> { modality:'box'|'diamond'|'nowhere', holders:[minds], worldCount, tier }
// Node self-test under require.main: stub store with shared + per-agent private facts proves box/diamond/nowhere,
// holder attribution, and the box==shared-tier equivalence.
'use strict';
(function () {

var CFG = {
  MAX_HOLDERS_LISTED: 12,   // holder names shown per verdict (display cap, not a truth cap)
};

function win() { return (typeof window !== 'undefined') ? window : null; }
function store() { var w = win(); return (w && w.GAME_KNOW) ? w.GAME_KNOW : null; }
function edgeKey(s, r, o) { return s + '|' + r + '|' + o; }

// the frame: every mind that holds ANY private knowledge, plus (in the live game) every living named pilot -
// a mind with no private facts still inhabits a world (it knows exactly the shared tier).
function worlds() {
  var K = store(); if (!K || typeof K._state !== 'function') return [];
  var S = K._state(); var names = Object.keys(S.priv || {});
  var w = win();
  if (w && w.HOST && w.HOST.ships) {
    try { w.HOST.ships.forEach(function (sh) { if (sh && sh.alive && sh.name && names.indexOf(sh.name) < 0) names.push(sh.name); }); } catch (e) {}
  }
  return names.sort();
}

// which worlds does the fact hold in? shared tier -> ALL worlds by construction (that IS the shared tier's
// meaning); else exactly the minds whose private layer carries it.
function holders(s, r, o) {
  var K = store(); if (!K || typeof K._state !== 'function') return { all: false, minds: [] };
  var St = K._state(); var k = edgeKey(s, r, o);
  if (St.shared && St.shared[k]) return { all: true, minds: worlds() };
  var minds = [];
  for (var ag in (St.priv || {})) if (St.priv[ag][k]) minds.push(ag);
  return { all: false, minds: minds.sort() };
}

function verdict(s, r, o) {
  var W = worlds(); var h = holders(s, r, o);
  var n = h.all ? W.length : h.minds.length;
  var modality = h.all ? 'box' : (n > 0 ? 'diamond' : 'nowhere');
  return {
    s: s, r: r, o: o,
    modality: modality,                                  // 'box' = □ all minds · 'diamond' = ◇ some mind(s) · 'nowhere' = no world
    glyph: modality === 'box' ? '□' : modality === 'diamond' ? '◇' : '✗',
    holders: h.all ? W : h.minds,
    worldCount: W.length, holderCount: n,
    tier: h.all ? 'shared' : (n > 0 ? 'private' : null),
    reading: modality === 'box' ? 'NECESSARY - every mind\'s world holds it (shared knowledge)'
      : modality === 'diamond' ? ('POSSIBLE - held in ' + n + ' of ' + W.length + ' worlds (private to: ' + h.minds.slice(0, CFG.MAX_HOLDERS_LISTED).join(', ') + (h.minds.length > CFG.MAX_HOLDERS_LISTED ? ', …' : '') + ')')
      : 'NOWHERE - no mind\'s world holds this fact (and it will not be invented)',
  };
}

function summary() {
  var K = store(); if (!K || typeof K._state !== 'function') return null;
  var S = K._state();
  var shared = Object.keys(S.shared || {}).length;
  var privTotal = 0, perMind = {};
  for (var ag in (S.priv || {})) { perMind[ag] = Object.keys(S.priv[ag]).length; privTotal += perMind[ag]; }
  return { worlds: worlds().length, box_facts: shared, diamond_only_facts: privTotal, per_mind: perMind };
}

var API = { verdict: verdict, worlds: worlds, holders: holders, summary: summary, CFG: CFG };
if (typeof window !== 'undefined') window.KRIPKE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node) ------------------------------------------------------------------------------------------
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  global.window = {
    GAME_KNOW: {
      _state: function () {
        return {
          shared: { 'sun|isa|star': { t: 'shared' } },
          priv: {
            VEGA: { 'cache|at|sector7': { t: 'private' } },
            ORION: { 'cache|at|sector7': { t: 'private' }, 'route|via|nebula': { t: 'private' } },
            MIRA: {},
          },
        };
      },
    },
  };
  var K = module.exports;
  var W = K.worlds();
  check('frame holds all 3 minds as worlds', W.length === 3 && W.indexOf('MIRA') >= 0);
  var v1 = K.verdict('sun', 'isa', 'star');
  check('shared fact is BOX (necessary, all worlds)', v1.modality === 'box' && v1.holderCount === 3 && v1.tier === 'shared');
  var v2 = K.verdict('cache', 'at', 'sector7');
  check('two-mind secret is DIAMOND with exact holders', v2.modality === 'diamond' && v2.holderCount === 2 && v2.holders.join(',') === 'ORION,VEGA');
  var v3 = K.verdict('route', 'via', 'nebula');
  check('one-mind secret is DIAMOND held by exactly ORION', v3.modality === 'diamond' && v3.holders.length === 1 && v3.holders[0] === 'ORION');
  var v4 = K.verdict('dragons', 'rule', 'everything');
  check('unknown fact is NOWHERE - never invented', v4.modality === 'nowhere' && v4.holderCount === 0 && v4.tier === null);
  var sm = K.summary();
  check('summary counts match (1 box, 3 diamond-only, 3 worlds)', sm.box_facts === 1 && sm.diamond_only_facts === 3 && sm.worlds === 3);
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
