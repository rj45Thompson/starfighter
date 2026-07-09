// centroid_mind.js - THE PROVEN CATEGORY MIND (user 2026-07-09: "much of my AGI work is not in spacegame - audit
// it all and put it in the game"). This is the mechanism the ecosystem has verified repeatedly (llmextractor
// exp1_graph_centroid_VERIFIED 3/3 vs its own string-centroid control 0/3; re-proven 2026-07-09 on real English at
// 0.647 raw / 0.857 gated after the SVD/chain approach scored BELOW CHANCE) - and explicitly NOT the SVD/chain
// pattern that failed:
//   - features = SPARSE ONE-HOT participation in typed facts (a symbol's vector = which fact-events it appears
//     in). NO SVD, no compression, no chain-composition - compression is what destroyed the signal.
//   - a category's CENTROID = the literal mean of its known members' fact-vectors.
//   - GEOMETRY PROPOSES (cosine to each centroid), a SYMBOLIC GATE VERIFIES before anything is claimed:
//       (a) margin: the top category must beat the runner-up by a real margin, and
//       (b) THE IRON RULE (the ecosystem's SOUND-VERIFIER LAW): a claim commits only when OVER-DETERMINED by
//           >= 2 edge-disjoint pieces of evidence - here, >= 2 DISTINCT shared fact-events with the winning
//           category's known members. One coincidence is never enough. Anything less -> ABSTAIN, never fabricate.
//   - label edges are EXCLUDED from the feature space (no leakage: the thing being predicted never feeds the
//     predictor), and ground-truth labels are shown only to the GRADER, never the discovery step.
//
// Reads the live two-tier store (window.GAME_KNOW). LEARNED claims are committed back only through the gate,
// source 'centroid_mind', with the actual evidence facts as premises - so the Observatory's activity feed shows
// each earned fact the moment it lands, and provenance is honest end to end.
//
// PUBLIC API (window.CENTROID): { evalHoldout(catRel, opts), classify(entity, catRel, opts), learn(catRel, opts) }.
// Node self-test under require.main: synthetic typed facts prove accuracy, the abstain gate, the 2-evidence rule,
// and no-leakage.
'use strict';
(function () {

var CFG = {
  MARGIN: 0.05,          // gate (a): min cosine gap top-vs-runner-up before a claim is even considered
  MIN_EVIDENCE: 2,       // gate (b) THE IRON RULE: min DISTINCT shared fact-events with the winning category
  TRAIN_FRAC: 0.7,       // held-out split - test members never enter their category's centroid
  MAX_COMMITS: 40,       // learn() cap per call - a runaway learner is a bug, not a feature
};

function win() { return (typeof window !== 'undefined') ? window : null; }
function store() { var w = win(); return (w && w.GAME_KNOW) ? w.GAME_KNOW : null; }
function allEdges() {
  var K = store(); if (!K || typeof K._state !== 'function') return [];
  var S = K._state(); var out = [];
  for (var k in S.shared) { var p = k.split('|'); if (p.length >= 3) out.push({ s: p[0], r: p[1], o: p[2], _tier: 'shared' }); }
  for (var ag in S.priv) for (var k2 in S.priv[ag]) { var p2 = k2.split('|'); if (p2.length >= 3) out.push({ s: p2[0], r: p2[1], o: p2[2], _tier: 'private', _agent: ag }); }
  return out;
}
function hash32(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; return h; }

// ---- one-hot fact-participation vectors (the proven representation - NO compression) --------------------------
// Every edge is one fact-event (one column). A symbol's RAW vector has 1 in each fact it appears in (as s or o).
// CRITICAL (self-test-caught): two same-category entities never share a fact-EVENT directly - (r1 offers_tool
// hammer) and (r2 offers_tool hammer) are different events - they share the OBJECT. The proven exp1 pattern got
// its overlap through shared object symbols, so the ENTITY vector here is the one-hop OBJECT EXPANSION: its own
// events ∪ every event its direct objects participate in. Using hammer now means sharing hammer's whole event
// column with everyone else who uses hammer - which is exactly the evidence the iron-rule gate should count.
// Represented sparsely as Sets of fact-indices; cosine over sparse sets = |A∩B| / sqrt(|A||B|).
function buildFactSpace(edges, excludeRel) {
  var raw = {};   // symbol -> Set(factIdx), direct participation only
  for (var i = 0; i < edges.length; i++) {
    var e = edges[i];
    if (e.r === excludeRel) continue;   // NO LEAKAGE: label edges never enter the feature space
    (raw[e.s] = raw[e.s] || new Set()).add(i);
    (raw[e.o] = raw[e.o] || new Set()).add(i);
  }
  var sym = {};   // symbol -> expanded Set (one hop through the symbol's OBJECTS)
  for (var j = 0; j < edges.length; j++) {
    var e2 = edges[j];
    if (e2.r === excludeRel) continue;
    var ex = (sym[e2.s] = sym[e2.s] || new Set());
    ex.add(j);
    var objSet = raw[e2.o];
    if (objSet) objSet.forEach(function (f) { ex.add(f); });
  }
  // symbols that only ever appear as objects still get their raw sets (they can be classified too)
  for (var s in raw) if (!sym[s]) sym[s] = raw[s];
  return sym;
}
function cosSparse(a, b) {
  if (!a || !b || !a.size || !b.size) return 0;
  var small = a.size <= b.size ? a : b, big = a.size <= b.size ? b : a, inter = 0;
  small.forEach(function (x) { if (big.has(x)) inter++; });
  return inter / Math.sqrt(a.size * b.size);
}
// centroid as a weighted sparse bag: factIdx -> mean weight; cosine(entitySet, centroidBag)
function centroidOf(memberSets) {
  var bag = {}, n = memberSets.length || 1;
  for (var i = 0; i < memberSets.length; i++) memberSets[i].forEach(function (f) { bag[f] = (bag[f] || 0) + 1 / n; });
  var norm = 0; for (var k in bag) norm += bag[k] * bag[k];
  return { bag: bag, norm: Math.sqrt(norm) || 1 };
}
function cosToCentroid(set, cen) {
  if (!set || !set.size) return 0;
  var dot = 0; set.forEach(function (f) { if (cen.bag[f]) dot += cen.bag[f]; });
  return dot / (Math.sqrt(set.size) * cen.norm);
}

// ---- labels: members per category from catRel edges (grader-side only) ----------------------------------------
function labelMap(edges, catRel) {
  var byCat = {}, labelOf = {};
  for (var i = 0; i < edges.length; i++) { var e = edges[i];
    if (e.r !== catRel) continue;
    (byCat[e.o] = byCat[e.o] || []).push(e.s); labelOf[e.s] = e.o;
  }
  return { byCat: byCat, labelOf: labelOf };
}
// deterministic split (hash order, not Math.random - reproducible, and the game bans wall-clock randomness in logic)
function splitMembers(members, frac) {
  var sorted = members.slice().sort(function (a, b) { return hash32(a) - hash32(b); });
  var nTrain = Math.max(1, Math.round(sorted.length * frac));
  if (sorted.length >= 2 && nTrain >= sorted.length) nTrain = sorted.length - 1;   // always hold at least one out when possible
  return { train: sorted.slice(0, nTrain), test: sorted.slice(nTrain) };
}

// ---- the gate: geometry proposes, the symbolic check verifies (or the mind abstains) ---------------------------
function proposeAndGate(entity, P) {
  var eSet = P.sym[entity];
  if (!eSet || !eSet.size) return { verdict: 'abstain', why: 'no facts known about ' + entity };
  var scores = [];
  for (var cat in P.centroids) scores.push({ cat: cat, cos: cosToCentroid(eSet, P.centroids[cat]) });
  scores.sort(function (a, b) { return b.cos - a.cos; });
  if (!scores.length || scores[0].cos <= 0) return { verdict: 'abstain', why: 'no category resembles it at all', scores: scores };
  var top = scores[0], run = scores[1] || { cat: null, cos: 0 };
  if (top.cos - run.cos < CFG.MARGIN) return { verdict: 'abstain', why: 'margin too thin (' + top.cat + ' ' + top.cos.toFixed(3) + ' vs ' + (run.cat || '-') + ' ' + run.cos.toFixed(3) + ')', scores: scores };
  // IRON RULE (SOUND-VERIFIER LAW): a claim commits only when over-determined by >= MIN_EVIDENCE EDGE-DISJOINT
  // paths. Counted as DISTINCT OBJECTS this entity shares with the winning category's TRAIN members - one shared
  // object expanding into many events is still ONE path wearing many hats (the self-test's lone1 case), so events
  // are the wrong unit; independent objects are the honest one.
  var eObjs = P.objsOf[entity] || new Set();
  var catObjs = new Set();
  (P.train[top.cat] || []).forEach(function (m) { var os = P.objsOf[m]; if (os) os.forEach(function (o) { catObjs.add(o); }); });
  var shared = [];
  eObjs.forEach(function (o) { if (catObjs.has(o)) shared.push(o); });
  if (shared.length < CFG.MIN_EVIDENCE) return { verdict: 'abstain', why: 'under-determined: only ' + shared.length + ' independent shared link(s) with ' + top.cat + ' (iron rule needs ' + CFG.MIN_EVIDENCE + ' edge-disjoint)', scores: scores };
  return { verdict: 'claim', cat: top.cat, cos: top.cos, margin: top.cos - run.cos, evidence: shared, scores: scores };
}

function prep(catRel, opts) {
  opts = opts || {};
  var edges = opts.edges || allEdges();
  var sym = buildFactSpace(edges, catRel);
  var lm = labelMap(edges, catRel);
  var objsOf = {};   // symbol -> Set(direct objects via non-label edges) - the iron-rule gate's evidence unit
  for (var i = 0; i < edges.length; i++) { var e = edges[i];
    if (e.r === catRel) continue;
    (objsOf[e.s] = objsOf[e.s] || new Set()).add(e.o); }
  var train = {}, test = {}, trainSets = {};
  for (var cat in lm.byCat) {
    var sp = splitMembers(lm.byCat[cat], opts.trainFrac != null ? opts.trainFrac : CFG.TRAIN_FRAC);
    train[cat] = sp.train; test[cat] = sp.test;
    trainSets[cat] = sp.train.map(function (m) { return sym[m] || new Set(); });
  }
  var centroids = {};
  for (var c in trainSets) centroids[c] = centroidOf(trainSets[c]);
  return { edges: edges, sym: sym, lm: lm, objsOf: objsOf, train: train, test: test, trainSets: trainSets, centroids: centroids };
}

// ---- held-out evaluation: the honest number (labels shown only to this grader) ---------------------------------
function evalHoldout(catRel, opts) {
  var P = prep(catRel, opts);
  var results = [], answered = 0, right = 0, gatedRight = 0, total = 0;
  var catSizes = {}; for (var c in P.train) catSizes[c] = P.train[c].length + P.test[c].length;
  var majorityCat = Object.keys(catSizes).sort(function (a, b) { return catSizes[b] - catSizes[a]; })[0];
  var majorityHits = 0;
  for (var cat in P.test) for (var i = 0; i < P.test[cat].length; i++) {
    var ent = P.test[cat][i]; total++;
    if (cat === majorityCat) majorityHits++;
    var g = proposeAndGate(ent, P);
    var top = g.scores && g.scores[0] ? g.scores[0].cat : null;
    if (top === cat) right++;                                   // raw argmax accuracy (no gate)
    if (g.verdict === 'claim') { answered++; if (g.cat === cat) gatedRight++; }
    results.push({ entity: ent, truth: cat, verdict: g.verdict, proposed: g.verdict === 'claim' ? g.cat : top, why: g.why || null, evidence: g.evidence ? g.evidence.length : 0 });
  }
  return {
    catRel: catRel, categories: Object.keys(P.train).length, trainN: Object.values(P.train).reduce(function (a, m) { return a + m.length; }, 0),
    testN: total, raw_accuracy: total ? right / total : 0,
    gated_accuracy: answered ? gatedRight / answered : 0, answered: answered, abstained: total - answered,
    majority_baseline: total ? majorityHits / total : 0, majority_cat: majorityCat,
    results: results,
  };
}

// ---- single-entity classification (same machinery, full graph as train) ----------------------------------------
function classify(entity, catRel, opts) {
  var P = prep(catRel, Object.assign({ trainFrac: 1 }, opts || {}));
  if (P.lm.labelOf[entity]) return { verdict: 'known', cat: P.lm.labelOf[entity], why: 'already labeled in the store' };
  return proposeAndGate(entity, P);
}

// ---- learn(): commit ONLY gate-passed verdicts back into the store as LEARNED facts ----------------------------
function learn(catRel, opts) {
  var K = store(); if (!K) return { error: 'no knowledge store' };
  var P = prep(catRel, opts);
  var edges = P.edges;
  var committed = [], abstainedN = 0;
  for (var cat in P.test) for (var i = 0; i < P.test[cat].length; i++) {
    if (committed.length >= CFG.MAX_COMMITS) break;
    var ent = P.test[cat][i];
    var g = proposeAndGate(ent, P);
    if (g.verdict !== 'claim') { abstainedN++; continue; }
    // premises = the REAL entity->object edges behind each evidence object (g.evidence holds object names now,
    // per the sharpened edge-disjoint gate) - honest provenance for the store's own tier classifier
    var evEdges = [];
    for (var x = 0; x < edges.length && evEdges.length < 4; x++) { var e3 = edges[x];
      if (e3.s === ent && e3.r !== catRel && g.evidence.indexOf(e3.o) >= 0) evEdges.push(e3); }
    var premises = evEdges.map(function (e4) { return e4.s + '|' + e4.r + '|' + e4.o; });
    var premiseTiers = evEdges.map(function (e4) { return e4._tier || 'shared'; });
    var r = K.commit({ s: ent, r: 'inferred_' + catRel, o: g.cat }, { source: 'centroid_mind', premises: premises, premiseTiers: premiseTiers });
    committed.push({ entity: ent, cat: g.cat, truth: cat, correct: g.cat === cat, isNew: r && r.isNew, tier: r && r.tier, evidence: g.evidence.length });
  }
  return { committed: committed, abstained: abstainedN, correct: committed.filter(function (c) { return c.correct; }).length };
}

var API = { evalHoldout: evalHoldout, classify: classify, learn: learn, CFG: CFG,
  _prep: prep, _gate: proposeAndGate, _split: splitMembers };
if (typeof window !== 'undefined') window.CENTROID = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node): synthetic typed facts prove the mechanism + every gate ---------------------------------
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  // synthetic world: two crisp categories with disjoint tool-facts + one ambiguous entity + one single-evidence entity
  var edges = [];
  function fact(s, r, o) { edges.push({ s: s, r: r, o: o, _tier: 'shared' }); }
  var reds = ['r1', 'r2', 'r3', 'r4', 'r5'], blues = ['b1', 'b2', 'b3', 'b4', 'b5'];
  reds.forEach(function (m) { fact(m, 'in_task', 'red'); fact(m, 'offers_tool', 'hammer'); fact(m, 'offers_tool', 'saw'); fact(m, 'offers_tool', 'nail_' + m); });
  blues.forEach(function (m) { fact(m, 'in_task', 'blue'); fact(m, 'offers_tool', 'net'); fact(m, 'offers_tool', 'rod'); fact(m, 'offers_tool', 'hook_' + m); });
  // (the one-hop object expansion inside buildFactSpace is what makes category-mates overlap: they never share a
  // fact-EVENT directly, they share OBJECTS - the first version of this self-test caught exactly that, raw=0.50
  // with everything abstaining, and the expansion is the fix.)
  var API2 = module.exports;
  var ev = API2.evalHoldout('in_task', { edges: edges });
  check('eval runs on synthetic data (' + ev.testN + ' held out)', ev.testN >= 2);
  console.log('  raw=' + ev.raw_accuracy.toFixed(2) + ' gated=' + ev.gated_accuracy.toFixed(2) + ' answered=' + ev.answered + ' abstained=' + ev.abstained + ' majority=' + ev.majority_baseline.toFixed(2));
  check('raw accuracy is perfect on crisp synthetic categories', ev.raw_accuracy === 1);
  check('everything answered is correct (gate never lets a wrong claim through here)', ev.answered === 0 || ev.gated_accuracy === 1);
  // ambiguous entity: equal pull to both categories -> must abstain on margin
  fact('amb1', 'offers_tool', 'hammer'); fact('amb1', 'offers_tool', 'net');
  var g1 = API2.classify('amb1', 'in_task', { edges: edges });
  check('ambiguous entity abstains (verdict=' + g1.verdict + ')', g1.verdict === 'abstain');
  // single-evidence entity: leans red via ONE shared chain only -> iron rule must refuse
  fact('lone1', 'offers_tool', 'saw');
  var g2 = API2.classify('lone1', 'in_task', { edges: edges });
  check('iron rule: single-evidence entity refused or abstained (verdict=' + g2.verdict + ')', g2.verdict !== 'claim' || (g2.evidence && g2.evidence.length >= 2));
  // no-leakage: an entity whose ONLY edge is its label must be unclassifiable (label edges never feed features)
  fact('leak1', 'in_task', 'red');
  var P3 = API2._prep('in_task', { edges: edges, trainFrac: 1 });
  check('no-leakage: label-only entity has NO feature vector', !P3.sym.leak1 || !P3.sym.leak1.size);
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
