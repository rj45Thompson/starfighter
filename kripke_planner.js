// kripke_planner.js - JOBE KRIPKE MEMORY port: a labeled-transition-system MODAL PLANNER (AGI_SALVAGE queue
// item 3; source read verbatim first: D:\code\Jobe\jobe\runtime\kripke_memory.py + its pinned test file
// tests\test_kripke_memory.py). Quoting the original: "worlds W = game states, keyed by a fingerprint;
// R[label] = accessibility: w1 --action--> w2; V[w] = the set of propositions true in world w."
//
// Ported faithfully (KFrame - semantics pinned 1:1 by the original's own six tests, replicated below):
//   box(w,p,a)    []_a p : p holds in EVERY a-successor (VACUOUSLY TRUE if none - as the original).
//   diamond(w,p,a) <>_a p : p holds in SOME successor.
//   ensures(w,p)  labels a where []_a p AND w has an a-successor - "which move NECESSARILY makes p true"
//                 (the planning hook; vacuous truths excluded, exactly the original's dead-action skip).
//   reachable(w)  BFS transitive closure MINUS w itself (the original returns `seen - {w}`).
//
// Game layer (adaptations, each labeled):
//   - LEARNED, NEVER HANDED: every transition is observed from a REAL completed game action (dock / buy /
//     sell / refuel / jump / kill) plus 'drift' for uncommanded state change (precedent: the original's own
//     configuration_bench records add_transition(prev,"step",w) for passive steps). Nothing is pre-seeded.
//   - GIVEN vs LEARNED: the fingerprint/prop SENSOR is GIVEN (like a retina); the transition structure and
//     every guarantee derived from it are LEARNED from play. plan() output labels its evidence counts.
//   - IRON-RULE GATE on top of the faithful core: a guarantee is PROVEN only with >= MIN_SUPPORT_PROVEN
//     observations of (world,action); single-observation guarantees are reported as TENTATIVE, never as
//     proven. The core operators never read counts - the gate is a reporting layer, not a semantics change.
//   - TAINT-AWARE: plan() refuses (refuse_contradicted) when the target names an entity CONTRA quarantined.
//   - honest abstains: "this state was never recorded" vs "no recorded state satisfies that" are DISTINCT.
//
// PUBLIC API (window.KPLAN): { frame, observe, arm, fingerprint, propsNow, plan, ensuresHere, stats,
//   knownProps, save, load, clearAll, snapshot, restore, _setTestHost }.
'use strict';
(function () {

var CFG = {
  CREDIT_BANDS: [200, 800, 2500, 8000],  // band edges -> credits:b0..b4 (log-ish spread over the game economy)
  HULL_BANDS: [0.25, 0.5, 0.8],          // hull-fraction edges -> hull:b0(critical)..b3(sound)
  DRIFT_POLL_S: 2.0,                     // uncommanded-change watcher cadence
  MIN_SUPPORT_PROVEN: 2,                 // iron rule: observations of (world,action) needed to call it PROVEN
  ROUTE_MAX_DEPTH: 6,                    // plan() observed-route BFS depth cap
  MAX_WORLDS: 400,                       // localStorage guard: stop recording NEW worlds past this
  PERSIST_KEY: 'KPLAN_v1',
  PERSIST_THROTTLE_MS: 4000,
  DRIFT_LABEL: 'drift',
};

function win() { return (typeof window !== 'undefined') ? window : null; }
var _testHost = null;
function host() { if (_testHost) return _testHost; var w = win(); return (w && w.HOST) ? w.HOST : null; }

// ------------------------------------------------------------------ the faithful core (KripkeFrame port)
function KFrame() { this.worlds = {}; this.R = {}; this.V = {}; this.counts = {}; }
KFrame.prototype.add_world = function (w) { this.worlds[w] = 1; if (!this.V[w]) this.V[w] = {}; return w; };
KFrame.prototype.set_true = function (w) {
  this.add_world(w);
  for (var i = 1; i < arguments.length; i++) this.V[w][arguments[i]] = 1;
};
KFrame.prototype.add_transition = function (w1, label, w2) {
  this.add_world(w1); this.add_world(w2);
  if (!this.R[label]) this.R[label] = {};
  if (!this.R[label][w1]) this.R[label][w1] = {};
  this.R[label][w1][w2] = 1;
  // support tally - GAME-LAYER bookkeeping for the iron-rule gate; the modal operators never read it
  if (!this.counts[label]) this.counts[label] = {};
  this.counts[label][w1] = (this.counts[label][w1] || 0) + 1;
};
KFrame.prototype.successors = function (w, label) {
  var out = {}, k, lab;
  if (label !== undefined && label !== null) {
    var m = (this.R[label] || {})[w];
    if (m) for (k in m) out[k] = 1;
    return out;
  }
  for (lab in this.R) { var mm = this.R[lab][w]; if (mm) for (k in mm) out[k] = 1; }
  return out;
};
KFrame.prototype.models = function (w, prop) { return !!(this.V[w] && this.V[w][prop]); };
KFrame.prototype.box = function (w, prop, label) {   // vacuously true with no successor - as the original
  var s = this.successors(w, label);
  for (var k in s) if (!this.models(k, prop)) return false;
  return true;
};
KFrame.prototype.diamond = function (w, prop, label) {
  var s = this.successors(w, label);
  for (var k in s) if (this.models(k, prop)) return true;
  return false;
};
KFrame.prototype.ensures = function (w, prop) {   // non-vacuous box: the original's dead-action skip
  var out = [], lab;
  for (lab in this.R) {
    var s = this.successors(w, lab), any = false, all = true;
    for (var k in s) { any = true; if (!this.models(k, prop)) all = false; }
    if (any && all) out.push(lab);
  }
  return out;
};
KFrame.prototype.reachable = function (w) {   // BFS closure minus the start world (original: `seen - {w}`)
  var seen = {}; seen[w] = 1; var q = [w];
  while (q.length) {
    var cur = q.shift(), s = this.successors(cur);
    for (var k in s) if (!seen[k]) { seen[k] = 1; q.push(k); }
  }
  delete seen[w];
  return Object.keys(seen);
};
KFrame.prototype.stats = function () {
  var edges = 0, props = 0, lab, w;
  for (lab in this.R) for (w in this.R[lab]) edges += Object.keys(this.R[lab][w]).length;
  for (w in this.V) props += Object.keys(this.V[w]).length;
  return { worlds: Object.keys(this.worlds).length, labels: Object.keys(this.R).length, edges: edges, props: props };
};

// ------------------------------------------------------------------ the GIVEN sensor: fingerprint + props
function band(v, edges) { for (var i = 0; i < edges.length; i++) if (v < edges[i]) return i; return edges.length; }
function reading() {
  var h = host(); if (!h) return null;
  var P = h.P; if (!P || P.alive === false) return null;   // no worlds recorded for a dead/absent pilot
  var loc = P.docked ? ('d:' + P.docked.name) : 'fly';
  var sys = null, bd = Infinity, systems = h.systems || [];
  for (var i = 0; i < systems.length; i++) {
    var sy = systems[i];
    if (sy && sy.center && P.pos && typeof P.pos.distanceTo === 'function') {
      var d = P.pos.distanceTo(sy.center); if (d < bd) { bd = d; sys = sy.name; }
    }
  }
  var cargo = 0, k; for (k in (P.cargo || {})) cargo += P.cargo[k];
  return {
    loc: loc, sys: sys || 'void',
    cb: band(P.credits || 0, CFG.CREDIT_BANDS),
    hb: band((P.maxHp ? (P.hp / P.maxHp) : 1), CFG.HULL_BANDS),
    cargo: cargo > 0 ? 'ld' : 'emp',
    dockedName: P.docked ? P.docked.name : null,
  };
}
function fpOf(r) { return r ? (r.loc + '|' + r.sys + '|cb' + r.cb + '|hb' + r.hb + '|' + r.cargo) : null; }
function propsOf(r) {
  if (!r) return [];
  var p = ['sys:' + r.sys, 'credits:b' + r.cb, 'hull:b' + r.hb, 'cargo:' + (r.cargo === 'ld' ? 'loaded' : 'empty'),
           r.dockedName ? 'docked' : 'flying'];
  if (r.dockedName) p.push('docked:' + r.dockedName);
  return p;
}

// ------------------------------------------------------------------ observation layer (LEARNED transitions)
var frame = new KFrame();
var _last = null;          // the most recent recorded world (the pre-state of the next action)
var _capWarned = false;
var _saveTimer = null;

function stamp(w, props) { frame.set_true.apply(frame, [w].concat(props)); }
function arm() {
  var r = reading(); if (!r) return null;
  var w = fpOf(r);
  if (!frame.worlds[w] && Object.keys(frame.worlds).length >= CFG.MAX_WORLDS) return _capSkip(w);
  stamp(w, propsOf(r)); _last = w; return w;
}
function _capSkip(w) {
  if (!_capWarned) { _capWarned = true; try { console.warn('[kplan] world cap ' + CFG.MAX_WORLDS + ' reached - new world not recorded: ' + w); } catch (e) {} }
  return null;
}
function observe(label) {
  var r = reading(); if (!r) return null;
  var w2 = fpOf(r);
  if (!frame.worlds[w2] && Object.keys(frame.worlds).length >= CFG.MAX_WORLDS) return _capSkip(w2);
  stamp(w2, propsOf(r));
  if (_last) frame.add_transition(_last, label, w2);
  _last = w2;
  save();
  return { from: _last, label: label, to: w2 };
}
function driftTick() {
  var r = reading(); if (!r) return;
  var w = fpOf(r);
  if (_last === null) { arm(); return; }
  if (w !== _last) observe(CFG.DRIFT_LABEL);
}

// ------------------------------------------------------------------ the planner (taint-aware, iron-rule gated)
function entityOf(prop) { var i = String(prop).lastIndexOf(':'); return i >= 0 ? String(prop).slice(i + 1) : String(prop); }
function taintCheck(prop) {
  var w = win(), C = (w && w.CONTRA) || (_testHost && _testHost.CONTRA);
  if (!C) return null;
  var ent = entityOf(prop);
  for (var i = 0; i < C.FUNCTIONAL_RELS.length; i++) {
    if (C.isQuarantined(ent, C.FUNCTIONAL_RELS[i]))
      return 'target names quarantined entity "' + ent + '": ' + C.reason(ent, C.FUNCTIONAL_RELS[i]);
  }
  return null;
}
function supportOf(w, label) { return (frame.counts[label] && frame.counts[label][w]) || 0; }
function anyWorldModels(prop) { for (var w in frame.V) if (frame.V[w][prop]) return true; return false; }
function routeTo(fromW, prop) {   // shortest OBSERVED path to any world modeling prop (possibility, not guarantee)
  if (frame.models(fromW, prop)) return { path: [], via: [fromW] };
  var seen = {}; seen[fromW] = 1;
  var q = [{ w: fromW, path: [], via: [fromW] }];
  while (q.length) {
    var cur = q.shift();
    if (cur.path.length >= CFG.ROUTE_MAX_DEPTH) continue;
    for (var lab in frame.R) {
      var succ = frame.R[lab][cur.w]; if (!succ) continue;
      for (var s in succ) {
        if (seen[s]) continue; seen[s] = 1;
        var nxt = { w: s, path: cur.path.concat([lab]), via: cur.via.concat([s]) };
        if (frame.models(s, prop)) return { path: nxt.path, via: nxt.via };
        q.push(nxt);
      }
    }
  }
  return null;
}
function plan(prop) {
  prop = String(prop || '').trim();
  if (!prop) return { verdict: 'abstain', why: 'no target proposition given' };
  var taint = taintCheck(prop);
  if (taint) return { verdict: 'refuse_contradicted', reason: taint, prop: prop };
  var w = _last || arm();
  if (!w) return { verdict: 'abstain', why: 'no live pilot state to plan from', prop: prop };
  if (!frame.worlds[w]) return { verdict: 'abstain', why: 'this exact state has never been recorded', prop: prop, world: w };
  if (frame.models(w, prop)) return { verdict: 'already', why: prop + ' already holds here', prop: prop, world: w };
  var ens = frame.ensures(w, prop), proven = [], tentative = [], i;
  for (i = 0; i < ens.length; i++) {
    var sup = supportOf(w, ens[i]);
    (sup >= CFG.MIN_SUPPORT_PROVEN ? proven : tentative).push({ label: ens[i], support: sup });
  }
  if (proven.length) return { verdict: 'proven', actions: proven, tentative: tentative, prop: prop, world: w };
  if (tentative.length) return { verdict: 'tentative', actions: tentative, prop: prop, world: w,
    why: 'every observation agrees, but only seen ' + tentative.map(function (t) { return t.support; }).join('/') + 'x - below the ' + CFG.MIN_SUPPORT_PROVEN + '-observation proof bar' };
  if (!anyWorldModels(prop)) return { verdict: 'abstain', why: 'no recorded state satisfies "' + prop + '" - it has never been observed true', prop: prop, world: w };
  var rt = routeTo(w, prop);
  if (rt) return { verdict: 'route', path: rt.path, via: rt.via, prop: prop, world: w,
    why: 'no single action GUARANTEES it, but an observed route exists (possibility, not necessity)' };
  return { verdict: 'abstain', why: 'states satisfying "' + prop + '" exist but no observed path reaches one from here (within depth ' + CFG.ROUTE_MAX_DEPTH + ')', prop: prop, world: w };
}
function ensuresHere() {   // per-action GUARANTEED effects from the current world (intersection over successors)
  var w = _last || arm();
  if (!w || !frame.worlds[w]) return { world: w, actions: [] };
  var out = [], lab;
  for (lab in frame.R) {
    var succ = frame.R[lab][w]; if (!succ) continue;
    var inter = null, s, p;
    for (s in succ) {
      var props = frame.V[s] || {};
      if (inter === null) { inter = {}; for (p in props) inter[p] = 1; }
      else { for (p in inter) if (!props[p]) delete inter[p]; }
    }
    out.push({ label: lab, support: supportOf(w, lab), nDest: Object.keys(succ).length,
               guaranteed: Object.keys(inter || {}).sort() });
  }
  out.sort(function (a, b) { return b.support - a.support; });
  return { world: w, actions: out };
}
function knownProps(limit) {
  var seen = {}, out = [], w, p;
  for (w in frame.V) for (p in frame.V[w]) if (!seen[p]) { seen[p] = 1; out.push(p); }
  out.sort();
  return limit ? out.slice(0, limit) : out;
}

// ------------------------------------------------------------------ persistence (localStorage, throttled)
function snapshot() { return JSON.stringify({ R: frame.R, V: frame.V, counts: frame.counts, last: _last }); }
function restore(json) {
  try {
    var d = JSON.parse(json); if (!d || !d.V) return false;
    frame = new KFrame();
    frame.R = d.R || {}; frame.V = d.V || {}; frame.counts = d.counts || {};
    var w; for (w in frame.V) frame.worlds[w] = 1;
    var lab; for (lab in frame.R) for (w in frame.R[lab]) { frame.worlds[w] = 1; for (var w2 in frame.R[lab][w]) frame.worlds[w2] = 1; }
    _last = d.last || null;
    API.frame = frame;
    return true;
  } catch (e) { return false; }
}
function saveNow() {
  var w = win(); if (!w || !w.localStorage) return;
  try { w.localStorage.setItem(CFG.PERSIST_KEY, snapshot()); } catch (e) {}
}
function save() {
  var w = win(); if (!w || !w.localStorage) return;
  if (_saveTimer) return;
  _saveTimer = setTimeout(function () { _saveTimer = null; saveNow(); }, CFG.PERSIST_THROTTLE_MS);
}
function load() {
  var w = win(); if (!w || !w.localStorage) return false;
  try { var j = w.localStorage.getItem(CFG.PERSIST_KEY); return j ? restore(j) : false; } catch (e) { return false; }
}
function clearAll() {
  frame = new KFrame(); API.frame = frame; _last = null; _capWarned = false;
  var w = win(); if (w && w.localStorage) { try { w.localStorage.removeItem(CFG.PERSIST_KEY); } catch (e) {} }
}

// ------------------------------------------------------------------ public API + boot
var API = {
  CFG: CFG, KFrame: KFrame, frame: frame,
  observe: observe, arm: arm, driftTick: driftTick,
  fingerprint: function () { return fpOf(reading()); }, propsNow: function () { return propsOf(reading()); },
  plan: plan, ensuresHere: ensuresHere, stats: function () { return frame.stats(); }, knownProps: knownProps,
  supportOf: supportOf, save: saveNow, load: load, clearAll: clearAll, snapshot: snapshot, restore: restore,
  _setTestHost: function (h) { _testHost = h; },
  lastWorld: function () { return _last; },
};
if (win()) {
  win().KPLAN = API;
  load();
  setInterval(driftTick, CFG.DRIFT_POLL_S * 1000);   // the uncommanded-change watcher (label: 'drift')
}
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ------------------------------------------------------------------ self-test (node)
// Part 1 replicates the ORIGINAL'S OWN SIX TESTS 1:1 (tests/test_kripke_memory.py) - the port is faithful
// only if all six pass unchanged. Part 2 covers the game layer (sensor, gate, planner, taint, persistence).
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  function sset(a) { return a.slice().sort().join(','); }

  // ---- part 1: the original's pinned semantics -------------------------------------------------------
  function mirrorWorld() {
    var k = new KFrame();
    k.add_transition('s0', 'left', 'sL');
    k.add_transition('s0', 'right', 'sR');
    k.set_true('sL', 'mirror_right', 'progress');
    k.set_true('sR', 'mirror_left', 'progress');
    return k;
  }
  var k = mirrorWorld();
  check('[jobe 1] box necessity per label', k.box('s0', 'mirror_right', 'left') && !k.box('s0', 'mirror_left', 'left'));
  check('[jobe 2] diamond possibility', k.diamond('s0', 'mirror_right') && !k.diamond('s0', 'absent_prop'));
  check('[jobe 3] ensures picks the necessary action',
    sset(k.ensures('s0', 'mirror_right')) === 'left' && sset(k.ensures('s0', 'mirror_left')) === 'right' &&
    sset(k.ensures('s0', 'progress')) === 'left,right');
  check('[jobe 4] box vacuously true at a leaf; ensures excludes the vacuous',
    k.box('sL', 'anything_at_all', 'left') && k.ensures('sL', 'anything_at_all').length === 0);
  var k2 = new KFrame(); k2.add_transition('a', 1, 'b'); k2.add_transition('b', 2, 'c');
  check('[jobe 5] reachable transitive closure', sset(k2.reachable('a')) === 'b,c' && k2.reachable('c').length === 0);
  var st = mirrorWorld().stats();
  check('[jobe 6] models + stats', mirrorWorld().models('sL', 'mirror_right') && !mirrorWorld().models('sL', 'mirror_left')
    && st.worlds === 3 && st.labels === 2 && st.edges === 2);

  // ---- part 2: the game layer -------------------------------------------------------------------------
  // a fake HOST whose pilot we can move through dock/trade states
  var FP = { docked: null, alive: true, credits: 500, hp: 80, maxHp: 100, cargo: {},
             pos: { distanceTo: function () { return 10; } } };
  var FH = { P: FP, systems: [{ name: 'Vega', center: {} }], CONTRA: null };
  API._setTestHost(FH);
  clearAll();
  var w0 = arm();
  check('[game 1] fingerprint reads the sensor deterministically',
    w0 === 'fly|Vega|cb1|hb3|emp' && API.propsNow().indexOf('flying') >= 0 && API.propsNow().indexOf('sys:Vega') >= 0);
  FP.docked = { name: 'PL_Kestrel' };
  var ob = observe('dock:PL_Kestrel');
  check('[game 2] observe records the LEARNED transition + props stamp the successor',
    ob && frame.models('d:PL_Kestrel|Vega|cb1|hb3|emp', 'docked:PL_Kestrel') &&
    sset(frame.ensures(w0, 'docked:PL_Kestrel')) === 'dock:PL_Kestrel');
  // support gate: 1 observation = tentative, 2 = proven
  var p1 = (function () { var save = _last; _last = w0; var r = plan('docked:PL_Kestrel'); _last = save; return r; })();
  check('[game 3] single observation reports TENTATIVE, never proven', p1.verdict === 'tentative' && p1.actions[0].support === 1);
  FP.docked = null; observe(CFG.DRIFT_LABEL); FP.docked = { name: 'PL_Kestrel' }; observe('dock:PL_Kestrel');
  var p2 = (function () { var save = _last; _last = w0; var r = plan('docked:PL_Kestrel'); _last = save; return r; })();
  check('[game 4] second agreeing observation upgrades to PROVEN', p2.verdict === 'proven' && p2.actions[0].support === 2);
  // route fallback: no single action ensures, but an observed 2-step path exists
  FP.docked = null; FP.credits = 5000; observe('sell:ore');   // dock -> (sell) -> flying rich world
  var p3 = (function () { var save = _last; _last = w0; var r = plan('credits:b3'); _last = save; return r; })();
  check('[game 5] observed-route fallback is labeled possibility, not necessity',
    p3.verdict === 'route' && p3.path.length >= 2 && p3.why.indexOf('not necessity') >= 0);
  var p4 = plan('docked:PL_Nowhere');
  check('[game 6] abstains naming WHY: prop never observed true anywhere', p4.verdict === 'abstain' && p4.why.indexOf('never been observed') >= 0);
  // taint: a fake CONTRA quarantining the target entity forces refusal
  FH.CONTRA = { FUNCTIONAL_RELS: ['isa'], isQuarantined: function (s) { return s === 'PL_Kestrel'; },
                reason: function () { return 'incompatible values for isa of PL_Kestrel'; } };
  var p5 = plan('docked:PL_Kestrel');
  check('[game 7] quarantined target entity -> refuse_contradicted with the conflict named',
    p5.verdict === 'refuse_contradicted' && p5.reason.indexOf('PL_Kestrel') >= 0);
  FH.CONTRA = null;
  // ensuresHere: per-action guaranteed effects from the current world
  var eh = (function () { var save = _last; _last = w0; var r = ensuresHere(); _last = save; return r; })();
  var dockAct = eh.actions.filter(function (a) { return a.label === 'dock:PL_Kestrel'; })[0];
  check('[game 8] ensuresHere intersects successor props per action',
    dockAct && dockAct.guaranteed.indexOf('docked:PL_Kestrel') >= 0 && dockAct.support === 2);
  // persistence round-trip
  var snap = snapshot(); var statsBefore = JSON.stringify(frame.stats());
  clearAll();
  check('[game 9] clearAll empties the frame', frame.stats().worlds === 0);
  restore(snap);
  check('[game 10] restore() round-trips worlds/edges/counts and answers identically',
    JSON.stringify(frame.stats()) === statsBefore &&
    (function () { var save = _last; _last = w0; var r = plan('docked:PL_Kestrel'); _last = save; return r.verdict; })() === 'proven');

  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
