// pillar_router.js - TDRE PILLAR ROUTER + SOLVERS port (AGI_SALVAGE queue item; sources read verbatim first:
// D:\code\TDRE_fixed_5\TDRE\src\tdre\pillar_router.py + experiments\rootbench_solver.py + the router's own
// pinned test file). The architecture, quoted from the original:
//   - ROUTE BY STRUCTURE, never by family id: "the only honest signal is the fixed logical scaffolding".
//   - STRENGTH-then-TOTAL: strongest single matched signature ranks first ("incidental vocabulary must not
//     out-sum one genuine operator"), total evidence breaks sub-defining ties.
//   - ABSTAIN ON A DEFINING-OPERATOR TIE: ">=2 pillars at w>=3 is a real ambiguity the SUM cannot reliably
//     break - never guess which operator is primary" (zero-misclassification beats more-solved).
//   - CONTRADICTION-FIRST: polarity conflict in the text prepends the quarantine pillar.
//   - PROPOSE-THEN-VERIFY over the RANKED candidates: "the router is a PRIOR (the ORDER), not a committer;
//     each solver is verifier-first (ABSTAINS on a structure it cannot solve), so a misroute falls through
//     to the next candidate instead of fabricating a plausible wrong answer."
//   - ONE SHARED LEDGER: every solver consults CONTRA ("no pillar maintains private truth").
//
// GAME ADAPTATION (labeled): the original's solvers parse a benchmark's nonce-operator text; the game's
// solvers answer over GAME_KNOW's REAL facts (0-fabrication: every answer quotes the store edges that entail
// it; the facts are GIVEN-from-provenance, a multi-hop conclusion is labeled INFERRED). Four solvers ported
// per the salvage queue: INHERITANCE (transitive isa entailment), CONSTRAINT (functional-relation lookup -
// the exactly-one law the ledger already enforces), COMPOSITION (relation-path folding, >=2 hops = composed),
// CENTRIC (shared-parent recovery across entities). The router's signature table keeps the ORIGINAL rows
// (the 9 pinned tests replicate 1:1) plus question-shape rows for game phrasing, all under the same law.
//
// PUBLIC API (window.PROUTER): { route, primaryDomain, solve, ground, SIG, CFG, _setTestStore, _setTestContra }.
'use strict';
(function () {

var CFG = {
  W_DEFINING: 3,          // the tie-abstain threshold (ported: ">=2 pillars at w>=3 -> ABSTAIN")
  MAX_ISA_HOPS: 4,        // inheritance closure depth
  MAX_PATH_HOPS: 4,       // composition BFS depth
  MAX_FACTS_QUOTED: 6,    // evidence lines quoted per answer
};

var P = { SET: 'set_algebra', MODAL: 'modal', INHERITANCE: 'inheritance', CONSTRAINT: 'constraint',
          COMPOSITION: 'composition', CENTRIC: 'centric', CONTRADICTION: 'contradiction' };

function win() { return (typeof window !== 'undefined') ? window : null; }
var _testStore = null, _testContra = null;
function store() { if (_testStore) return _testStore; var w = win(); return (w && w.GAME_KNOW) || null; }
function contra() { if (_testContra) return _testContra; var w = win(); return (w && w.CONTRA) || null; }

// ------------------------------------------------------------------ signature table (ported rows verbatim,
// weights preserved; rows marked GAME are question-shape extensions under the same strength/total law)
var SIG = {};
SIG[P.SET] = [
  [3, /\bor\b[^.\n]*\bexcept\b/i, 'A or B except C'],
  [2, /\bexcept\b/i, 'exception/difference'],
  [2, /\bunion\b/i, 'union'],
  [2, /\bintersection\b/i, 'intersection'],
  [2, /\bsubset\b/i, 'subset'],
  [1, /\bgroup\b/i, 'group membership'],
  [1, /\bmember/i, 'membership'],
  [1, /\bin (?:the )?(?:group|set)\b/i, 'in a set'],
];
SIG[P.MODAL] = [
  [3, /\bpossible world\b/i, 'possible world'],
  [2, /\bnecessar/i, 'necessity'],
  [2, /\bcounterfactual\b/i, 'counterfactual'],
  [2, /\bbelie(?:f|ve)/i, 'belief world'],
  [1, /\bactual(?:ly)?\b/i, 'actual vs possible'],
];
SIG[P.INHERITANCE] = [
  [3, /\binherits?\b/i, 'inherits'],
  [2, /\b(?:ir)?reversible\b/i, 'reversible/irreversible'],
  [1, /\bblocked\b/i, 'blocked condition'],
  [3, /\bis\s+\S+\s+(?:a|an)\s+\S+.*\?/i, 'is X a Y? (GAME)'],
  [2, /\bwhat kind of\b/i, 'what kind of (GAME)'],
  [2, /\bisa\b/i, 'isa relation named (GAME)'],
];
SIG[P.CONSTRAINT] = [
  [3, /\bexactly[- ]one\b/i, 'exactly one'],
  [2, /\bxor\b/i, 'xor'],
  [2, /\bcannot both\b/i, 'cannot both'],
  [1, /\bone of\b/i, 'one of'],
  [3, /\bwhat(?:\s+is|'s)\s+the\s+\w+\s+of\b/i, 'what is the R of X (GAME functional lookup)'],
  [2, /\bwhich\s+\w+\s+(?:is|does)\b/i, 'which R (GAME)'],
];
SIG[P.COMPOSITION] = [
  [3, /\bunlocks?\b/i, 'unlock (path composition)'],
  [2, /\bchained?\b/i, 'chained relation'],
  [2, /two[- ]step/i, 'two-step'],
  [1, /\bpath\b/i, 'path composition'],
  [3, /\b(?:reach(?:es)?|connected to|linked to)\b/i, 'reach/connected (GAME)'],
  [2, /\bhow\s+(?:is|are)\b.*\brelated\b/i, 'how related (GAME)'],
];
SIG[P.CENTRIC] = [
  [2, /\banchor/i, 'anchors'],
  [2, /\borbits?\b/i, 'orbits'],
  [2, /\bcent(?:er|re)\b/i, 'hidden center'],
  [2, /shared? (?:the same )?parent/i, 'shared parent'],
  [1, /\bsibling/i, 'sibling ring'],
  [1, /\bdistractor\b/i, 'distractor anchor'],
  [3, /\bin common\b/i, 'in common (GAME)'],
  [2, /\bshare[sd]?\b/i, 'share (GAME)'],
];

// polarity patterns for contradiction-first detection (ported)
var POS_PROP = /(\w+) is reversible/gi, NEG_PROP = /(\w+) is irreversible/gi;
var HAS = /(\w+) has (\w+)/gi, HAS_NOT = /(\w+) does not have (\w+)/gi;
function pairs(rx, text) { var out = [], m; rx.lastIndex = 0; while ((m = rx.exec(text))) out.push(m.slice(1).join('␟')); return out; }
function intersects(a, b) { var s = {}; a.forEach(function (x) { s[x] = 1; }); return b.some(function (x) { return s[x]; }); }
function polarityContradiction(text) {
  if (intersects(pairs(POS_PROP, text), pairs(NEG_PROP, text))) return true;
  return intersects(pairs(HAS, text), pairs(HAS_NOT, text));
}

// ------------------------------------------------------------------ route(text) - the faithful core
function route(text) {
  var strength = {}, total = {}, why = {}, pillar, i;
  for (pillar in SIG) {
    var bw = 0, bl = null, s = 0;
    for (i = 0; i < SIG[pillar].length; i++) {
      var row = SIG[pillar][i];
      if (row[1].test(text)) { s += row[0]; if (row[0] > bw) { bw = row[0]; bl = row[2]; } }
    }
    if (bw) { strength[pillar] = bw; total[pillar] = s; why[pillar] = bl; }
  }
  var keys = Object.keys(strength);
  if (!keys.length) return { selected: [], why: {}, confidence: 0, abstain: true };
  keys.sort(function (a, b) { return (strength[b] - strength[a]) || (total[b] - total[a]) || (a < b ? -1 : 1); });
  var primary = keys[0], top = strength[primary];
  var sumTotal = 0; keys.forEach(function (k) { sumTotal += total[k]; });
  var selected = keys.slice();
  if (polarityContradiction(text)) { why[P.CONTRADICTION] = 'positive and negative evidence for the same subject'; selected = [P.CONTRADICTION].concat(selected); }
  var ambiguous = top >= CFG.W_DEFINING && keys.filter(function (k) { return strength[k] === top; }).length > 1;
  return { selected: selected, why: why, confidence: total[primary] / sumTotal, abstain: ambiguous };
}
function primaryDomain(routing) {
  if (routing.abstain) return null;
  for (var i = 0; i < routing.selected.length; i++) if (routing.selected[i] !== P.CONTRADICTION) return routing.selected[i];
  return null;
}

// ------------------------------------------------------------------ game layer: the store as the world
function edges() {
  var K = store(); if (!K || !K._state) return [];
  var S = K._state(), out = [], k, a;
  for (k in S.shared) { var p = k.split('|'); out.push({ s: p[0], r: p[1], o: p[2], tier: 'shared', source: (S.shared[k] && S.shared[k].source) || '' }); }
  for (a in (S.priv || {})) for (k in S.priv[a]) { var q = k.split('|'); out.push({ s: q[0], r: q[1], o: q[2], tier: 'private', agent: a, source: (S.priv[a][k] && S.priv[a][k].source) || '' }); }
  return out;
}
function norm(s) { return String(s).toLowerCase().replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function ground(text) {
  // longest-name-first matching against every node in the store (same convention as the Observatory's ask)
  var E = edges(), names = {}, e;
  for (var i = 0; i < E.length; i++) { e = E[i]; names[e.s] = 1; names[e.o] = 1; }
  var nt = ' ' + norm(text) + ' ';
  var hits = Object.keys(names).filter(function (n) { return nt.indexOf(' ' + norm(n) + ' ') >= 0; });
  hits.sort(function (a, b) { return norm(b).length - norm(a).length; });
  var out = [], covered = ' ' + norm(text) + ' ';
  hits.forEach(function (n) { var nn = ' ' + norm(n) + ' '; if (covered.indexOf(nn) >= 0) { out.push(n); covered = covered.split(nn).join(' '); } });
  // preserve question order
  out.sort(function (a, b) { return nt.indexOf(' ' + norm(a) + ' ') - nt.indexOf(' ' + norm(b) + ' '); });
  return out;
}
var REL_ALIAS = { isa: 'isa', kind: 'isa', type: 'isa', task: 'in_task', domain: 'in_domain', teacher: 'taught_by', taught: 'taught_by', tool: 'offers_tool', mentions: 'mentions' };
function relOf(text) {
  var t = norm(text), k;
  for (k in REL_ALIAS) if (t.indexOf(k) >= 0) return REL_ALIAS[k];
  return null;
}
function fact(e) { return e.s + ' ' + e.r + ' ' + e.o + ' [' + e.tier + (e.source ? (', ' + e.source) : '') + ']'; }
function taintOf(subject, rel) {
  var C = contra(); if (!C) return null;
  if (C.isQuarantined(subject, rel)) return 'evidence key quarantined: ' + C.reason(subject, rel);
  return null;
}

// ------------------------------------------------------------------ the four game solvers (verifier-first:
// each ABSTAINS when its structure is absent, answers ONLY what the store entails, refuses on taint)
function solveInheritance(q, ents) {
  if (!ents.length) return { verdict: 'abstain', why: 'inheritance needs a grounded entity' };
  var x = ents[0], target = ents[1] || null;
  if (!target) { var m = /\b(?:a|an)\s+([a-z_][a-z0-9_]*)/i.exec(q); if (m) target = m[1]; }
  if (!target) return { verdict: 'abstain', why: 'inheritance needs a target category (is X a Y?)' };
  var E = edges(), byS = {}; E.forEach(function (e) { if (e.r === 'isa') (byS[e.s] = byS[e.s] || []).push(e); });
  var seen = {}, frontier = [{ n: x, path: [] }], hops = 0;
  seen[x] = 1;
  while (frontier.length && hops < CFG.MAX_ISA_HOPS) {
    var next = [];
    for (var i = 0; i < frontier.length; i++) {
      var cur = frontier[i];
      var t1 = taintOf(cur.n, 'isa'); if (t1) return { verdict: 'refuse_contradicted', why: t1 };
      var out = byS[cur.n] || [];
      for (var j = 0; j < out.length; j++) {
        var e = out[j], path = cur.path.concat([e]);
        if (norm(e.o) === norm(target)) {
          return { verdict: 'yes', answer: x + ' isa ' + e.o + (path.length > 1 ? ' (via ' + path.map(function (p) { return p.o; }).join(' -> ') + ')' : ''),
            label: path.length > 1 ? 'INFERRED (multi-hop over GIVEN facts)' : 'GIVEN (direct fact)', facts: path.map(fact) };
        }
        if (!seen[e.o]) { seen[e.o] = 1; next.push({ n: e.o, path: path }); }
      }
    }
    frontier = next; hops++;
  }
  return { verdict: 'abstain', why: 'no isa path from ' + x + ' to "' + target + '" within ' + CFG.MAX_ISA_HOPS + ' hops - the store does not entail it' };
}
function solveConstraint(q, ents) {
  var rel = relOf(q);
  if (!rel || !ents.length) return { verdict: 'abstain', why: 'constraint lookup needs a relation word (task/kind/domain/teacher/...) + a grounded entity' };
  var x = ents[0];
  var t = taintOf(x, rel); if (t) return { verdict: 'refuse_contradicted', why: t };
  var hits = edges().filter(function (e) { return e.s === x && e.r === rel; });
  if (!hits.length) return { verdict: 'abstain', why: 'no ' + rel + ' fact recorded for ' + x };
  // FUNCTIONAL_RELS hold exactly one value per key (the ledger enforces it) - multiple only for non-functional rels
  return { verdict: 'yes', answer: 'the ' + rel + ' of ' + x + ' is ' + hits.map(function (e) { return e.o; }).join(', '),
    label: 'GIVEN (direct fact' + (hits.length > 1 ? 's' : '') + ')', facts: hits.slice(0, CFG.MAX_FACTS_QUOTED).map(fact) };
}
function solveComposition(q, ents) {
  if (ents.length < 2) return { verdict: 'abstain', why: 'composition needs two grounded entities' };
  var a = ents[0], b = ents[1];
  var C = contra();
  if (C) for (var fr = 0; fr < C.FUNCTIONAL_RELS.length; fr++) {
    var t = taintOf(a, C.FUNCTIONAL_RELS[fr]) || taintOf(b, C.FUNCTIONAL_RELS[fr]);
    if (t) return { verdict: 'refuse_contradicted', why: t };
  }
  var E = edges(), adj = {};
  E.forEach(function (e) { (adj[e.s] = adj[e.s] || []).push({ n: e.o, e: e, dir: '->' }); (adj[e.o] = adj[e.o] || []).push({ n: e.s, e: e, dir: '<-' }); });
  var seen = {}; seen[a] = 1;
  var frontier = [{ n: a, path: [] }], hops = 0;
  while (frontier.length && hops < CFG.MAX_PATH_HOPS) {
    var next = [];
    for (var i = 0; i < frontier.length; i++) {
      var cur = frontier[i], out = adj[cur.n] || [];
      for (var j = 0; j < out.length; j++) {
        var step = out[j], path = cur.path.concat([step]);
        if (step.n === b) {
          var chain = [a].concat(path.map(function (p) { return p.dir + p.e.r + p.dir + ' ' + p.n; })).join(' ');
          if (path.length >= 2) return { verdict: 'yes', answer: a + ' reaches ' + b + ' via a composed path of length ' + path.length + ': ' + chain,
            label: 'INFERRED (composition over GIVEN facts)', facts: path.slice(0, CFG.MAX_FACTS_QUOTED).map(function (p) { return fact(p.e); }) };
          return { verdict: 'yes', answer: a + ' and ' + b + ' are DIRECTLY related: ' + fact(path[0].e) + ' (a single edge, not a composed path)',
            label: 'GIVEN (direct fact)', facts: [fact(path[0].e)] };
        }
        if (!seen[step.n]) { seen[step.n] = 1; next.push({ n: step.n, path: path }); }
      }
    }
    frontier = next; hops++;
  }
  return { verdict: 'abstain', why: 'no path between ' + a + ' and ' + b + ' within ' + CFG.MAX_PATH_HOPS + ' hops - the store does not connect them' };
}
function solveCentric(q, ents) {
  if (ents.length < 2) return { verdict: 'abstain', why: 'shared-parent recovery needs two or more grounded entities' };
  var E = edges(), byS = {};
  E.forEach(function (e) { (byS[e.s] = byS[e.s] || []).push(e); });
  var C = contra();
  var shared = null, evid = [];
  for (var i = 0; i < ents.length; i++) {
    var x = ents[i];
    if (C) for (var fr = 0; fr < C.FUNCTIONAL_RELS.length; fr++) { var t = taintOf(x, C.FUNCTIONAL_RELS[fr]); if (t) return { verdict: 'refuse_contradicted', why: t }; }
    var mine = {};
    (byS[x] || []).forEach(function (e) { mine[e.r + '␟' + e.o] = e; });
    if (shared === null) { shared = mine; }
    else { var keep = {}; for (var k in shared) if (mine[k]) keep[k] = shared[k]; shared = keep; }
  }
  var keys = Object.keys(shared || {});
  if (!keys.length) return { verdict: 'abstain', why: 'the entities share no parent under any relation - nothing in common the store can prove' };
  keys.slice(0, CFG.MAX_FACTS_QUOTED).forEach(function (k) {
    var e = shared[k];
    evid.push(e.r + ' -> ' + e.o);
    ents.forEach(function (x) { (byS[x] || []).forEach(function (e2) { if (e2.r === e.r && e2.o === e.o) evid.push('  ' + fact(e2)); }); });
  });
  return { verdict: 'yes', answer: ents.join(' and ') + ' share: ' + keys.slice(0, CFG.MAX_FACTS_QUOTED).map(function (k) { var e = shared[k]; return e.o + ' (both ' + e.r + ')'; }).join(', '),
    label: 'INFERRED (shared-parent recovery over GIVEN facts)', facts: evid.slice(0, CFG.MAX_FACTS_QUOTED * 3) };
}

var GAME_SOLVERS = {};
GAME_SOLVERS[P.INHERITANCE] = solveInheritance;
GAME_SOLVERS[P.CONSTRAINT] = solveConstraint;
GAME_SOLVERS[P.COMPOSITION] = solveComposition;
GAME_SOLVERS[P.CENTRIC] = solveCentric;

// ------------------------------------------------------------------ solve(question): route -> propose-then-verify
function solve(question) {
  question = String(question || '').trim();
  if (!question) return { verdict: 'abstain', why: 'empty question' };
  var routing = route(question);
  var base = { routing: { order: routing.selected, why: routing.why, confidence: Math.round(routing.confidence * 100) / 100 } };
  if (!routing.selected.length) return Object.assign(base, { verdict: 'abstain', why: 'no structural signature matched - the router cannot honestly pick a pillar' });
  if (routing.abstain) return Object.assign(base, { verdict: 'router_abstain',
    why: 'DEFINING-OPERATOR TIE: two pillars matched at defining strength - the router refuses to coin-flip (' +
      routing.selected.filter(function (p) { return p !== P.CONTRADICTION; }).slice(0, 3).map(function (p) { return p + ': ' + routing.why[p]; }).join(' vs ') + ')' });
  var ents = ground(question);
  var candidates = routing.selected.filter(function (p) { return GAME_SOLVERS[p]; });
  if (!candidates.length) return Object.assign(base, { verdict: 'abstain', why: 'routed to ' + primaryDomain(routing) + ' - no game solver carries that pillar yet (honest gap)' });
  var reasons = [];
  for (var i = 0; i < candidates.length; i++) {
    var res = GAME_SOLVERS[candidates[i]](question, ents);
    if (res.verdict !== 'abstain') return Object.assign(base, res, { solver: candidates[i], grounded: ents });
    reasons.push(candidates[i] + ': ' + res.why);
  }
  return Object.assign(base, { verdict: 'abstain', grounded: ents,
    why: 'no candidate solver committed (verifier-first abstain) - ' + reasons.join(' | ') });
}

var API = { route: route, primaryDomain: primaryDomain, solve: solve, ground: ground, SIG: SIG, CFG: CFG, P: P,
  _setTestStore: function (s) { _testStore = s; }, _setTestContra: function (c) { _testContra = c; } };
if (win()) win().PROUTER = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ------------------------------------------------------------------ self-test (node)
// Part 1 replicates the router's OWN NINE pinned tests 1:1 (tests/test_pillar_router.py) - the port is
// faithful only if all nine pass unchanged. Part 2 covers the game layer against a store-shaped stub.
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  function prim(text) { return primaryDomain(route(text)); }

  check('[tdre 1] each structure routes to its pillar',
    prim('When A blarf B, B inherits every reversible property; irreversible ones are blocked.') === P.INHERITANCE &&
    prim('If A glorp B about P, exactly one of A and B has P.') === P.CONSTRAINT &&
    prim('If A wdozz B and B woz C, then A unlocks C; a single edge does not unlock.') === P.COMPOSITION &&
    prim('zibo marks a possible world, not the actual world; necessary facts are actual.') === P.MODAL &&
    prim('Group frob A or B except C: A-members and B-members are in the group unless C.') === P.SET &&
    prim('Anchors that share the same parent orbit the same hidden center; ignore the distractor.') === P.CENTRIC);
  var r2 = route('colorless green ideas sleep furiously near the quux of the blivet');
  check('[tdre 2] abstains when no signature matches', r2.selected.length === 0 && r2.confidence === 0 && r2.abstain === true);
  var r3 = route('prop_zz is reversible. prop_zz is irreversible. B inherits reversible ones.');
  check('[tdre 3] contradiction-first when polarity conflicts', r3.selected[0] === P.CONTRADICTION && primaryDomain(r3) === P.INHERITANCE);
  var r4 = route('prop_a is reversible. prop_b is irreversible. B inherits reversible ones.');
  check('[tdre 4] no false contradiction on distinct subjects', r4.selected.indexOf(P.CONTRADICTION) < 0);
  check('[tdre 5] transfer to an unseen family routes by structure',
    prim('In this realm, quibble_xyz forms a cohort from A or B except the barred ones. If Cohort quibble_xyz alpha_thing or beta_thing except gamma_thing, then alpha and beta items are in the cohort unless gamma. widget_foo is alpha_thing.') === P.SET);
  check('[tdre 6] incidental vocabulary does not outweigh the operator',
    prim('A subset of the members in the group can unlock the goal, but no single member in the group unlocks it.') === P.COMPOSITION);
  check('[tdre 7] centric sum-tiebreak at sub-defining strength',
    prim('Anchors that orbit the same hidden center form the union of two rings.') === P.CENTRIC);
  var r8a = route('zibo marks a possible world; exactly one of agent_a and agent_b knows state_x.');
  var r8b = route('Cohort dax A or B except C; each member inherits the default tag.');
  check('[tdre 8] defining-operator tie abstains, never fabricates',
    r8a.abstain === true && primaryDomain(r8a) === null && primaryDomain(r8b) === null);
  var r9 = route('If A glorp B about P, exactly one of A and B has P.');
  check('[tdre 9] router reports reason and confidence', r9.confidence > 0 && r9.why[P.CONSTRAINT] && r9.why[P.CONSTRAINT].indexOf('exactly one') >= 0);

  // ---- part 2: the game layer over a store-shaped stub -------------------------------------------------
  var EDGES = {
    shared: {
      'GNAW|isa|beast': { source: 'novel' }, 'beast|isa|creature': { source: 'novel' },
      'awb_1|in_task|android': { source: 'hf:AWB' }, 'awb_2|in_task|android': { source: 'hf:AWB' },
      'awb_1|offers_tool|tool_adb': { source: 'hf:AWB' }, 'tool_adb|isa|agent_tool': { source: 'hf:AWB' },
      'PL_Kestrel|isa|world': { source: 'game' },
    },
    priv: { ORION: { 'GNAW|isa|omen': { source: 'belief' } } },
  };
  API._setTestStore({ _state: function () { return EDGES; } });
  var CT = { FUNCTIONAL_RELS: ['isa', 'in_task'], q: {}, isQuarantined: function (s, r) { return !!this.q[s + '|' + r]; },
             reason: function (s, r) { return 'incompatible values for ' + r + ' of ' + s; } };
  API._setTestContra(CT);

  check('[game 1] grounding matches store nodes in question order',
    JSON.stringify(ground('is GNAW a creature and is awb_1 near tool_adb?')) === JSON.stringify(['GNAW', 'creature', 'awb_1', 'tool_adb']));
  var s1 = solve('is GNAW a creature?');
  check('[game 2] inheritance: 2-hop isa entailment answers YES labeled INFERRED with the facts quoted',
    s1.verdict === 'yes' && s1.solver === P.INHERITANCE && s1.label.indexOf('INFERRED') === 0 && s1.facts.length === 2);
  var s2 = solve('is GNAW a starship?');
  check('[game 3] inheritance abstains honestly when the store does not entail it',
    s2.verdict === 'abstain' && s2.why.indexOf('does not entail') >= 0);
  var s3 = solve('what is the task of awb_1?');
  check('[game 4] constraint: functional lookup answers from the direct fact',
    s3.verdict === 'yes' && s3.solver === P.CONSTRAINT && s3.answer.indexOf('android') >= 0 && s3.label.indexOf('GIVEN') === 0);
  CT.q['awb_1|in_task'] = 1;
  var s4 = solve('what is the task of awb_1?');
  check('[game 5] constraint refuses on a quarantined key (shared ledger law)',
    s4.verdict === 'refuse_contradicted' && s4.why.indexOf('quarantined') >= 0);
  delete CT.q['awb_1|in_task'];
  var s5 = solve('does awb_2 reach tool_adb?');
  check('[game 6] composition: a composed path answers YES with the chain',
    s5.verdict === 'yes' && s5.solver === P.COMPOSITION && s5.answer.indexOf('composed path') >= 0);
  var s6 = solve('does PL_Kestrel reach tool_adb?');
  check('[game 7] composition abstains when the store does not connect them',
    s6.verdict === 'abstain' && s6.why.indexOf('does not connect') >= 0);
  var s7 = solve('what do awb_1 and awb_2 have in common?');
  check('[game 8] centric: shared-parent recovery names the common parent with evidence',
    s7.verdict === 'yes' && s7.solver === P.CENTRIC && s7.answer.indexOf('android') >= 0 && s7.facts.length >= 2);
  var s8 = solve('what do GNAW and PL_Kestrel share in common?');
  check('[game 9] centric abstains when nothing is shared',
    s8.verdict === 'abstain' && s8.why.indexOf('no candidate solver committed') >= 0 || s8.verdict === 'abstain');
  var s9 = solve('zibo marks a possible world; exactly one of GNAW and awb_1 knows it.');
  check('[game 10] full solve honors the router tie-abstain (never coin-flips a solver)',
    s9.verdict === 'router_abstain' && s9.why.indexOf('TIE') >= 0);
  // propose-then-verify fall-through: 'reach' routes COMPOSITION first (w3) with CONSTRAINT behind it
  // ('which task does' at w2 - no defining tie); only one entity grounds -> composition abstains ->
  // the ranked NEXT candidate commits from the functional fact. The misroute falls through, never fabricates.
  var s10 = solve('which task does awb_1 reach?');
  check('[game 11] verifier-first fall-through: misrouted primary abstains, next candidate commits',
    s10.verdict === 'yes' && s10.solver === P.CONSTRAINT);

  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
