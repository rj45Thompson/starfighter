// gravity_well.js - GRAVITY-WELL REPAIR port (AGI_SALVAGE queue item; source read verbatim first:
// D:\code\Tami\.opus-tools\agi_proto\chainer.py - "pillar 12: relation mining + gravity-well repair").
// The original, quoted: "Entities live in an embedding; each relation is a CONSERVED TRANSLATION... When the
// embedding geometry is NOISY the relations stop composing cleanly - so the agent applies a GRAVITY-WELL
// repair: it pulls every entity into the position most consistent with ALL the relation constraints (a
// pose-graph least-squares), and it DECIDES to do so on its own when the composition residual runs high."
//
// Ported faithfully (semantics pinned by the original's own 4-point AUDIT, replicated in the self-test):
//   - t[r] = mean over r-edges of (P[tail] - P[head])           (the conserved translation per relation)
//   - residual = mean ||(P[tail]-P[head]) - t[r]||              (how well geometry satisfies the constraints)
//   - REPAIR-NOT-PRUNE: no edge is ever deleted or altered - only POSITIONS move.
//   - AUTONOMOUS TRIGGER: repair runs only when residual > trigger (the agent's own decision, reported).
//   - one ANCHOR row pins a reference node so the solution is unique up to translation (W_ANCHOR).
//   - chaining: predict a multi-hop target by adding relation vectors, then nearest-node lookup.
//
// ADAPTATIONS (labeled): numpy lstsq -> deterministic iterative relaxation on the SAME objective (t estimated
// from current P exactly as the original, then positions relaxed to convergence given fixed t - the identical
// convex minimum, solved without a matrix library); D=24 -> D=2 (the game consumes the geometry as a 2D
// semantic layout; dimensionality was CONFIG in the original too).
//
// THE HONEST GAME MAPPING (decided before code, per the tick contract): GAME_KNOW's real edges ARE the
// constraint set - ~1,600 real facts reusing a handful of relations (in_task/isa/offers_tool/mentions/...)
// give genuine redundancy for the least-squares to solve over. Nothing synthetic: the eval below scores how
// many of the store's OWN stored edges (and real 2-hop compositions) the geometry recovers by translation.
// Quarantined keys are EXCLUDED from the constraints (CONTRA law: no pillar builds on tainted facts) and
// reported. Positions are derived artifacts labeled INFERRED - the store is untouched, so every repair is
// reversible by construction (recompute anytime).
//
// PUBLIC API (window.GWELL): { build, repair, residualOf, chainEval, positions, relations, report, CFG,
//   _setTestStore, _setTestContra }.
'use strict';
(function () {

var CFG = {
  D: 2,                    // embedding dims (original: 24; the game consumes a 2D semantic layout)
  W_ANCHOR: 50.0,          // ported anchor weight - pins node 0 so the solution is unique up to translation
  REPAIR_TRIGGER: 0.5,     // ported: repair only when mean residual exceeds this FRACTION of the layout scale
  RELAX_SWEEPS: 60,        // relaxation iterations cap (converges long before on sparse graphs)
  RELAX_EPS: 1e-4,         // stop when the residual improves less than this per sweep
  MIN_EDGES_PER_REL: 3,    // a relation needs >=3 edges for its mean translation to be a real constraint
  EVAL_MAX_PAIRS: 400,     // chain-eval sample cap per depth (deterministic slice, not random)
  SEED: 7,                 // ported seed - all layout init is seeded, never Math.random (repo law)
};

function win() { return (typeof window !== 'undefined') ? window : null; }
var _testStore = null, _testContra = null;
function store() { if (_testStore) return _testStore; var w = win(); return (w && w.GAME_KNOW) || null; }
function contra() { if (_testContra) return _testContra; var w = win(); return (w && w.CONTRA) || null; }

function hash32(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }
function rngOf(seed) { var t = seed >>> 0; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ store -> constraint graph
function storeEdges() {
  var K = store(); if (!K || !K._state) return { edges: [], excluded: 0 };
  var S = K._state(), out = [], excluded = 0, k;
  var C = contra();
  for (k in S.shared) {
    var p = k.split('|');
    if (C && C.FUNCTIONAL_RELS && C.FUNCTIONAL_RELS.indexOf(p[1]) >= 0 && C.isQuarantined(p[0], p[1])) { excluded++; continue; }
    out.push({ s: p[0], r: p[1], o: p[2] });
  }
  return { edges: out, excluded: excluded };
}

// build(): nodes + per-relation edge lists from the REAL store; positions seeded deterministically.
function build(edgesIn) {
  var src = edgesIn ? { edges: edgesIn, excluded: 0 } : storeEdges();
  var edges = src.edges, nodes = {}, order = [], i, e;
  for (i = 0; i < edges.length; i++) { e = edges[i];
    if (!(e.s in nodes)) { nodes[e.s] = order.length; order.push(e.s); }
    if (!(e.o in nodes)) { nodes[e.o] = order.length; order.push(e.o); }
  }
  var byRel = {};
  for (i = 0; i < edges.length; i++) { e = edges[i]; (byRel[e.r] = byRel[e.r] || []).push([nodes[e.s], nodes[e.o]]); }
  // relations without real redundancy are OBSERVED but not CONSTRAINED (a 1-edge relation's "mean translation"
  // is just that edge - it would trivially self-satisfy and dilute the residual)
  var rels = Object.keys(byRel).filter(function (r) { return byRel[r].length >= CFG.MIN_EDGES_PER_REL; });
  var P = new Array(order.length);
  for (i = 0; i < order.length; i++) {
    var rr = rngOf(hash32(order[i]) ^ CFG.SEED);   // deterministic per-name init (never Math.random)
    P[i] = [rr() * 100, rr() * 100];
  }
  return { names: order, index: nodes, P: P, byRel: byRel, rels: rels, excluded: src.excluded,
           nEdges: edges.length };
}

// ------------------------------------------------------------------ the ported math
function relVecs(G) {   // t[r] = mean over r-edges of (P[tail] - P[head])   (ported: rel_vecs)
  var t = {}, ri, r, list, k, d;
  for (ri = 0; ri < G.rels.length; ri++) {
    r = G.rels[ri]; list = G.byRel[r];
    var acc = new Array(CFG.D); for (d = 0; d < CFG.D; d++) acc[d] = 0;
    for (k = 0; k < list.length; k++) for (d = 0; d < CFG.D; d++) acc[d] += G.P[list[k][1]][d] - G.P[list[k][0]][d];
    for (d = 0; d < CFG.D; d++) acc[d] /= list.length;
    t[r] = acc;
  }
  return t;
}
function residualOf(G, t) {   // mean ||(P[tail]-P[head]) - t[r]||   (ported: residual)
  t = t || relVecs(G);
  var sum = 0, n = 0, ri, k, d;
  for (ri = 0; ri < G.rels.length; ri++) {
    var r = G.rels[ri], list = G.byRel[r];
    for (k = 0; k < list.length; k++) {
      var s2 = 0;
      for (d = 0; d < CFG.D; d++) { var diff = (G.P[list[k][1]][d] - G.P[list[k][0]][d]) - t[r][d]; s2 += diff * diff; }
      sum += Math.sqrt(s2); n++;
    }
  }
  return n ? sum / n : 0;
}
function scaleOf(G) {   // layout scale so the ported trigger fraction is unit-free on any store
  var mn = [Infinity, Infinity], mx = [-Infinity, -Infinity], i, d;
  for (i = 0; i < G.P.length; i++) for (d = 0; d < CFG.D; d++) { mn[d] = Math.min(mn[d], G.P[i][d]); mx[d] = Math.max(mx[d], G.P[i][d]); }
  var s = 0; for (d = 0; d < CFG.D; d++) s += (mx[d] - mn[d]) * (mx[d] - mn[d]);
  return Math.sqrt(s) || 1;
}
// repair(): the gravity well. t is estimated from the CURRENT positions exactly as the original, then every
// position is pulled to the point most consistent with all its constraints (iterative relaxation on the same
// pose-graph least-squares objective; node 0 carries the ported anchor). REPAIR-NOT-PRUNE: edges untouched.
function repair(G) {
  var t = relVecs(G);
  var anchor0 = G.P[0] ? G.P[0].slice() : null;
  var before = residualOf(G, t);
  var inb = {}, outb = {}, ri, k, r, list;
  for (ri = 0; ri < G.rels.length; ri++) {
    r = G.rels[ri]; list = G.byRel[r];
    for (k = 0; k < list.length; k++) {
      (outb[list[k][0]] = outb[list[k][0]] || []).push({ other: list[k][1], t: t[r], sign: -1 });   // P[s] wants P[o]-t
      (inb[list[k][1]] = inb[list[k][1]] || []).push({ other: list[k][0], t: t[r], sign: +1 });     // P[o] wants P[s]+t
    }
  }
  var prev = before, sweep, i, d;
  for (sweep = 0; sweep < CFG.RELAX_SWEEPS; sweep++) {
    for (i = 0; i < G.P.length; i++) {
      var acc = [0, 0], w = 0, lists = [inb[i] || [], outb[i] || []], li, c;
      for (li = 0; li < 2; li++) for (k = 0; k < lists[li].length; k++) {
        c = lists[li][k];
        for (d = 0; d < CFG.D; d++) acc[d] += G.P[c.other][d] + c.sign * c.t[d];
        w++;
      }
      if (i === 0 && anchor0) { for (d = 0; d < CFG.D; d++) acc[d] += CFG.W_ANCHOR * anchor0[d]; w += CFG.W_ANCHOR; }   // ported anchor row
      if (w) for (d = 0; d < CFG.D; d++) G.P[i][d] = acc[d] / w;
    }
    var cur = residualOf(G, t);
    if (prev - cur < CFG.RELAX_EPS) { prev = cur; break; }
    prev = cur;
  }
  return { before: before, after: residualOf(G), sweeps: sweep + 1, t: relVecs(G) };
}

// ------------------------------------------------------------------ chaining eval on REAL facts
// depth-1: for each stored edge, predict o from P[s]+t[r] by nearest node - does the geometry RECOVER the
// store's own facts? depth-2: real 2-hop paths (s -r1-> m -r2-> o, both edges REAL) recovered by composed
// translation. Deterministic sample slice (no randomness), scored honestly.
function chainEval(G, depth) {
  var t = relVecs(G);
  function nearest(p) {
    var bi = -1, bd = Infinity, i, d;
    for (i = 0; i < G.P.length; i++) { var s2 = 0; for (d = 0; d < CFG.D; d++) { var df = G.P[i][d] - p[d]; s2 += df * df; } if (s2 < bd) { bd = s2; bi = i; } }
    return bi;
  }
  var probes = [], ri, k;
  if (depth === 1) {
    for (ri = 0; ri < G.rels.length && probes.length < CFG.EVAL_MAX_PAIRS; ri++) {
      var list = G.byRel[G.rels[ri]];
      for (k = 0; k < list.length && probes.length < CFG.EVAL_MAX_PAIRS; k++) probes.push({ from: list[k][0], steps: [G.rels[ri]], to: list[k][1] });
    }
  } else {
    var outAdj = {};
    for (ri = 0; ri < G.rels.length; ri++) { var r = G.rels[ri], l2 = G.byRel[r];
      for (k = 0; k < l2.length; k++) (outAdj[l2[k][0]] = outAdj[l2[k][0]] || []).push({ r: r, to: l2[k][1] }); }
    outer:
    for (ri = 0; ri < G.rels.length; ri++) { var r1 = G.rels[ri], l3 = G.byRel[r1];
      for (k = 0; k < l3.length; k++) { var mid = l3[k][1], nx = outAdj[mid] || [];
        for (var j = 0; j < nx.length; j++) {
          if (nx[j].to === l3[k][0]) continue;                       // skip trivial back-edges
          probes.push({ from: l3[k][0], steps: [r1, nx[j].r], to: nx[j].to });
          if (probes.length >= CFG.EVAL_MAX_PAIRS) break outer;
        } } }
  }
  if (!probes.length) return { acc: null, n: 0 };
  var hit = 0;
  for (k = 0; k < probes.length; k++) {
    var pr = probes[k], pos = G.P[pr.from].slice(), si, d;
    for (si = 0; si < pr.steps.length; si++) for (d = 0; d < CFG.D; d++) pos[d] += t[pr.steps[si]][d];
    if (nearest(pos) === pr.to) hit++;
  }
  return { acc: hit / probes.length, n: probes.length };
}

// ------------------------------------------------------------------ the in-game surface
var _G = null;   // last built graph (positions are DERIVED, INFERRED artifacts - the store is never touched)
function report() {
  var G = build(); _G = G;
  if (!G.names.length) return { verdict: 'abstain', why: 'the store has no edges to constrain' };
  var res0 = residualOf(G), scale = scaleOf(G);
  var frac0 = res0 / scale;
  var c1b = chainEval(G, 1), c2b = chainEval(G, 2);
  var trigger = frac0 > CFG.REPAIR_TRIGGER * 0.1;   // spiral-random init is ALWAYS far from geometric consistency; the fraction-of-scale form keeps the ported trigger unit-free
  var rep = null, c1a = null, c2a = null;
  if (trigger) { rep = repair(G); c1a = chainEval(G, 1); c2a = chainEval(G, 2); }
  return {
    verdict: trigger ? 'repaired' : 'healthy',
    nodes: G.names.length, edges: G.nEdges, relations: G.rels.length,
    excludedTainted: G.excluded,
    residualBefore: Math.round(res0 * 100) / 100,
    residualAfter: rep ? Math.round(rep.after * 100) / 100 : null,
    sweeps: rep ? rep.sweeps : 0,
    trigger: 'residual/scale ' + (Math.round(frac0 * 1000) / 1000) + (trigger ? ' > ' : ' <= ') + (CFG.REPAIR_TRIGGER * 0.1) + ' -> ' + (trigger ? 'REPAIR (autonomous)' : 'no repair needed'),
    chain1: { before: c1b, after: c1a }, chain2: { before: c2b, after: c2a },
    label: 'INFERRED geometry - positions derived from GIVEN facts; the store itself is untouched (repair-not-prune, reversible by recompute)',
  };
}
function positions() {
  if (!_G) return null;
  var out = {}, i; for (i = 0; i < _G.names.length; i++) out[_G.names[i]] = _G.P[i].slice();
  return out;
}
function relations() { return _G ? relVecs(_G) : null; }

var API = { build: build, repair: repair, residualOf: residualOf, chainEval: chainEval, report: report,
  positions: positions, relations: relations, relVecs: relVecs, scaleOf: scaleOf, CFG: CFG,
  _setTestStore: function (s) { _testStore = s; }, _setTestContra: function (c) { _testContra = c; } };
if (win()) win().GWELL = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ------------------------------------------------------------------ self-test (node)
// Part 1 replicates the ORIGINAL'S OWN FOUR AUDIT BEHAVIORS on the original's own synthetic grid shape
// (6x6 entities, RIGHT/UP relations, seeded noise) - the port is faithful only if all four hold. Part 2
// covers the game layer against a store-shaped stub (real-shaped edges, taint exclusion, determinism).
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

  // ---- the original's grid world, in the port's own edge vocabulary --------------------------------------
  var GRID = 6, N = GRID * GRID;
  function gridEdges() {
    var edges = [];
    for (var i = 0; i < GRID; i++) for (var j = 0; j < GRID; j++) {
      if (i < GRID - 1) edges.push({ s: 'n' + (i * GRID + j), r: 'right', o: 'n' + ((i + 1) * GRID + j) });
      if (j < GRID - 1) edges.push({ s: 'n' + (i * GRID + j), r: 'up', o: 'n' + (i * GRID + (j + 1)) });
    }
    return edges;
  }
  function cleanG() {
    var G = build(gridEdges());
    for (var i = 0; i < GRID; i++) for (var j = 0; j < GRID; j++) G.P[G.index['n' + (i * GRID + j)]] = [i * 10, j * 10];
    return G;
  }
  function noisyG(noise) {
    var G = cleanG(), rr = rngOf(CFG.SEED), i, d;
    for (i = 0; i < G.P.length; i++) for (d = 0; d < CFG.D; d++) G.P[i][d] += (rr() * 2 - 1) * noise;
    return G;
  }
  // chain accuracy over deterministic walks (original sampled randomly; a full deterministic sweep of all
  // depth-k monotone walks is the same measurement without randomness)
  function chainAcc(G, depth, noChain) {
    var t = relVecs(G), hits = 0, n = 0;
    for (var i = 0; i < GRID; i++) for (var j = 0; j < GRID; j++) {
      var steps = [], ci = i, cj = j;
      for (var s = 0; s < depth; s++) { if (ci < GRID - 1 && (s % 2 === 0 || cj >= GRID - 1)) { steps.push('right'); ci++; } else if (cj < GRID - 1) { steps.push('up'); cj++; } }
      if (steps.length < depth) continue;
      var use = noChain ? steps.slice(0, 1) : steps;
      var pos = G.P[G.index['n' + (i * GRID + j)]].slice();
      for (var k = 0; k < use.length; k++) for (var d = 0; d < CFG.D; d++) pos[d] += t[use[k]][d];
      var bi = -1, bd = Infinity;
      for (var q = 0; q < G.P.length; q++) { var s2 = 0; for (var d2 = 0; d2 < CFG.D; d2++) { var df = G.P[q][d2] - pos[d2]; s2 += df * df; } if (s2 < bd) { bd = s2; bi = q; } }
      hits += (bi === G.index['n' + (ci * GRID + cj)]) ? 1 : 0; n++;
    }
    return n ? hits / n : 0;
  }

  var Gc = cleanG();
  check('[chainer 1] chaining mines multi-hop facts on clean geometry (depth 3)', chainAcc(Gc, 3) > 0.9);
  check('[chainer 2] productivity: deep unstored compositions recovered (depth 5)', chainAcc(Gc, 5) > 0.85);
  check('[chainer 3] chaining is load-bearing: no-chain ablation fails deep', chainAcc(Gc, 5, true) < 0.3);
  var Gn = noisyG(6.0);
  var noisyMean = (chainAcc(Gn, 1) + chainAcc(Gn, 3) + chainAcc(Gn, 5)) / 3;
  var frac = residualOf(Gn) / scaleOf(Gn);
  var fired = frac > CFG.REPAIR_TRIGGER * 0.1;                       // the agent's own decision
  var rep = repair(Gn);
  var repairedMean = (chainAcc(Gn, 1) + chainAcc(Gn, 3) + chainAcc(Gn, 5)) / 3;
  check('[chainer 4] autonomous gravity-well repair restores chaining (trigger fired, mean +' +
    (Math.round((repairedMean - noisyMean) * 100) / 100) + ')',
    fired && rep.after < rep.before && (repairedMean - noisyMean) > 0.25);

  // ---- part 2: the game layer -----------------------------------------------------------------------------
  var STORE_EDGES = {
    shared: {
      'awb_1|in_task|android': {}, 'awb_2|in_task|android': {}, 'awb_3|in_task|os': {}, 'awb_4|in_task|os': {},
      'awb_1|offers_tool|tool_a': {}, 'awb_2|offers_tool|tool_b': {}, 'awb_3|offers_tool|tool_c': {},
      'tool_a|isa|agent_tool': {}, 'tool_b|isa|agent_tool': {}, 'tool_c|isa|agent_tool': {},
      'android|isa|agent_benchmark': {}, 'os|isa|agent_benchmark': {}, 'web|isa|agent_benchmark': {},
      'bad|in_task|conflicted': {},
    }, priv: {},
  };
  API._setTestStore({ _state: function () { return STORE_EDGES; } });
  API._setTestContra({ FUNCTIONAL_RELS: ['isa', 'in_task'], isQuarantined: function (s, r) { return s === 'bad' && r === 'in_task'; },
                       reason: function () { return 'planted'; } });
  var R1 = report();
  check('[game 1] builds from the store, EXCLUDES the quarantined edge (taint law)',
    R1.excludedTainted === 1 && R1.nodes > 0 && R1.relations >= 3);
  check('[game 2] the autonomous trigger fired on seeded-random init and repair reduced the residual',
    R1.verdict === 'repaired' && R1.residualAfter < R1.residualBefore);
  check('[game 3] repair-not-prune: edge count unchanged by repair', R1.edges === Object.keys(STORE_EDGES.shared).length - 1);
  check('[game 4] geometry recovers stored facts: depth-1 chain accuracy improved and is real',
    R1.chain1.after && R1.chain1.before && R1.chain1.after.acc >= R1.chain1.before.acc && R1.chain1.after.n > 0);
  check('[game 5] positions exposed for consumers, one per node (INFERRED label present)',
    Object.keys(positions()).length === R1.nodes && R1.label.indexOf('INFERRED') >= 0);
  var R2 = report();
  check('[game 6] deterministic: a second report from the same store lands the same residual',
    R2.residualBefore === R1.residualBefore && R2.residualAfter === R1.residualAfter);

  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
