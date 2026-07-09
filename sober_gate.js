// sober_gate.js - THE SOBER CHECK, ported (AGI_SALVAGE queue item 1; source read verbatim before porting:
// D:\code\sober-ai-complete\baseline_1\sober_ai_api.py:163 sober_check). The original is a 3-check
// refuse-BEFORE-answer gate over an embedding manifold; this is the honest adaptation to the game's {s,r,o}
// store (no embeddings, no NLI model in a browser - the NLI fallback is deliberately NOT ported and that is
// stated, not hidden):
//   1. GROUNDING FLOOR  (was: similarity floor)  - at least one query token must ground to a real store node
//      (same exact-any-length / substring-both>=4 rule the Observatory uses). Nothing grounds -> refuse_no_match.
//   2. IDENTIFIER CHECK (was: API-name exact match) - identifier-shaped tokens (snake_case, dotted, or known
//      prefixes like tool_/awb_/glm_/PL_) are hallucination bait: EVERY one must exist in the store or the gate
//      refuses, NAMING the missing ones (refuse_unaddressable). This is the check that catches "tell me about
//      tool_quantum_uplink" before anything downstream tries to be helpful about a thing that does not exist.
//   3. CONTENT COVERAGE (ported near-verbatim: stopwords, len>2, 4-char prefix stems, <=1 uncovered allowed) -
//      the facts touching the grounded nodes must cover the query's content words; >1 uncovered -> refuse,
//      listing exactly which words the store knows nothing about.
// Only a query that passes all three earns 'commit' - and only then does the Observatory/mind even try.
// Refusing early is the point: the original exists to stop hallucination at the door, not to apologize after.
//
// PUBLIC API (window.SOBER): { check(query) -> {decision, reason, grounded, missing}, CFG }.
// decision: 'commit' | 'refuse_no_match' | 'refuse_unaddressable'.
'use strict';
(function () {

var CFG = {
  PREFIX_N: 4,             // stem length (ported: prefix(w,4))
  MAX_UNCOVERED: 1,        // ported: <=1 missing content word still commits
  SUB_MIN: 4,              // substring-grounding floor (both sides >= this), exact matches any length
  MAX_LISTED: 5,           // missing items named per refusal (display cap)
};
// ported stopword idea + the game's own question phrasing ("what do you know about X" must not trip coverage)
var STOP = {};
('the a an and or but of to in on at for from with by is are was were be been do does did done have has had ' +
 'what which who whom whose where when why how tell me you your yours know knows known about say says said ' +
 'can could should would will shall may might must this that these those there here it its they them their ' +
 'i we us our mine ours am not no yes if then else so as than into over under between').split(' ').forEach(function (w) { STOP[w] = 1; });
var IRREG = { won: 'win', sorted: 'sort' };   // ported verbatim

function win() { return (typeof window !== 'undefined') ? window : null; }
function store() { var w = win(); return (w && w.GAME_KNOW) ? w.GAME_KNOW : null; }
function edges() {
  var K = store(); if (!K || typeof K._state !== 'function') return [];
  var S = K._state(); var out = [];
  for (var k in S.shared) { var p = k.split('|'); if (p.length >= 3) out.push(p); }
  for (var ag in S.priv) for (var k2 in S.priv[ag]) { var p2 = k2.split('|'); if (p2.length >= 3) out.push(p2); }
  return out;
}
function contentWords(text) {
  var toks = String(text || '').toLowerCase().match(/[a-zA-Z][a-zA-Z0-9_]+/g) || [];
  return toks.filter(function (t) { return !STOP[t] && t.length > 2; });
}
function prefix(w) { w = IRREG[w] || w; return w.length >= CFG.PREFIX_N ? w.slice(0, CFG.PREFIX_N) : w; }
// identifier-shaped tokens: dotted paths, snake_case, or the store's own known node prefixes
function identifiers(text) {
  var t = String(text || '').toLowerCase();
  var out = new Set();
  (t.match(/[a-z]+(?:\.[a-z_][a-z_0-9]+)+/g) || []).forEach(function (x) { out.add(x); });
  (t.match(/[a-z][a-z0-9]*_[a-z0-9_]+/g) || []).forEach(function (x) { out.add(x); });
  return [...out];
}
function groundToken(t, nodeIds, nodeLower) {
  for (var i = 0; i < nodeIds.length; i++) if (nodeLower[i] === t) return nodeIds[i];
  if (t.length >= CFG.SUB_MIN) for (var j = 0; j < nodeIds.length; j++) {
    if (nodeLower[j].length >= CFG.SUB_MIN && (nodeLower[j].indexOf(t) >= 0 || t.indexOf(nodeLower[j]) >= 0)) return nodeIds[j];
  }
  return null;
}

function check(query, opts) {
  opts = opts || {};
  var E = opts.edges || edges();
  var nodeSet = {};
  for (var i = 0; i < E.length; i++) { nodeSet[E[i][0]] = 1; nodeSet[E[i][2]] = 1; }
  var nodeIds = Object.keys(nodeSet);
  var nodeLower = nodeIds.map(function (n) { return n.toLowerCase(); });
  var qWords = contentWords(query);
  if (!qWords.length) return { decision: 'refuse_no_match', reason: 'empty query - nothing to ground', grounded: [], missing: [] };

  // CHECK 2 FIRST when identifiers are present (ported order keeps floor first, but an identifier query with a
  // fake name must name the fake even if another token grounds - matching the original's separate API branch)
  var ids = identifiers(query);
  var missingIds = ids.filter(function (id) { return !groundToken(id, nodeIds, nodeLower); });

  // CHECK 1: grounding floor
  var grounded = [], seen = {};
  for (var q = 0; q < qWords.length; q++) { var g = groundToken(qWords[q], nodeIds, nodeLower); if (g && !seen[g]) { seen[g] = 1; grounded.push(g); } }
  // identifier verdict OUTRANKS the bare floor (live-caught: "tell me about tool_quantum_uplink" alone hit the
  // floor first and the fake name was never NAMED - the whole point of this check is naming the invention)
  if (missingIds.length) return { decision: 'refuse_unaddressable', reason: 'identifier(s) not in the store: ' + missingIds.slice(0, CFG.MAX_LISTED).join(', ') + ' - refusing rather than inventing them', grounded: grounded, missing: missingIds.slice(0, CFG.MAX_LISTED) };
  if (!grounded.length) return { decision: 'refuse_no_match', reason: 'below grounding floor - no query term matches anything the store holds', grounded: [], missing: qWords.slice(0, CFG.MAX_LISTED) };

  // CHECK 3: content coverage by the facts touching the grounded nodes (top-k analog = the grounded neighborhood)
  var gSet = {}; grounded.forEach(function (g2) { gSet[g2] = 1; });
  var factText = [];
  for (var e2 = 0; e2 < E.length; e2++) { var ed = E[e2];
    if (gSet[ed[0]] || gSet[ed[2]]) factText.push(ed[0] + ' ' + ed[1] + ' ' + ed[2]); }
  // the store's "text" is compound identifiers (PL_KestrelsReach, a_safe_run) where the original had natural
  // prose - split them on underscores + camel boundaries before stemming, or a query in plain words can never be
  // covered by the very facts that ground it (live-caught: "is kestrel reach a safe run" refused despite
  // grounding PL_KestrelsReach + a_safe_run). Splitting is reading what's already there, not inventing.
  var stems = {};
  contentWords(factText.join(' ').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')).forEach(function (w2) { stems[prefix(w2)] = 1; });
  var uncovered = qWords.filter(function (w3) { return !stems[prefix(w3)]; });
  if (uncovered.length <= CFG.MAX_UNCOVERED) {
    return { decision: 'commit', reason: 'store covers the query' + (uncovered.length ? ' (missing: ' + uncovered.join(', ') + ')' : ''), grounded: grounded, missing: uncovered };
  }
  // (the original falls back to an NLI entailment model here - there is no NLI in a browser game, so the honest
  // behavior is to refuse; stated, not hidden)
  return { decision: 'refuse_unaddressable', reason: 'the store cannot address: ' + uncovered.slice(0, CFG.MAX_LISTED).join(', ') + ' (no NLI fallback in this port - refusing instead)', grounded: grounded, missing: uncovered.slice(0, CFG.MAX_LISTED) };
}

var API = { check: check, CFG: CFG, _contentWords: contentWords, _identifiers: identifiers };
if (typeof window !== 'undefined') window.SOBER = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node) -------------------------------------------------------------------------------------------
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check2(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  var E = [
    ['tool_web_search', 'isa', 'agent_tool'], ['awb_row1', 'offers_tool', 'tool_web_search'],
    ['awb_row1', 'in_task', 'search'], ['PL_Cydon', 'serves', 'a_safe_run'],
  ];
  var S = require('./sober_gate.js');
  var r1 = S.check('what do you know about tool_web_search?', { edges: E });
  check2('known identifier commits (question words stopworded)', r1.decision === 'commit' && r1.grounded.indexOf('tool_web_search') >= 0);
  var r2 = S.check('tell me about tool_quantum_uplink and tool_web_search', { edges: E });
  check2('fake identifier refused BY NAME even beside a real one', r2.decision === 'refuse_unaddressable' && r2.missing.indexOf('tool_quantum_uplink') >= 0);
  var r2b = S.check('tell me about tool_quantum_uplink', { edges: E });
  check2('fake identifier ALONE still named (outranks the bare floor - live-caught)', r2b.decision === 'refuse_unaddressable' && r2b.missing.indexOf('tool_quantum_uplink') >= 0);
  var r2c = S.check('is kestrels reach a safe run?', { edges: [['PL_KestrelsReach', 'serves', 'a_safe_run']] });
  check2('compound-id splitting: plain words covered by PL_KestrelsReach/a_safe_run (live-caught)', r2c.decision === 'commit');
  var r3 = S.check('do dragons rule the galaxy?', { edges: E });
  check2('nothing grounds -> refuse_no_match (grounding floor)', r3.decision === 'refuse_no_match');
  var r4 = S.check('what does cydon serve?', { edges: E });
  check2('substring grounding works (cydon -> PL_Cydon) and commits', r4.decision === 'commit' && r4.grounded.indexOf('PL_Cydon') >= 0);
  var r5 = S.check('explain the thermodynamic entropy paradox of cydon farming quotas', { edges: E });
  check2('grounded but uncovered content words -> refuse, naming them', r5.decision === 'refuse_unaddressable' && r5.missing.length >= 2);
  check2('empty query refused', S.check('   ', { edges: E }).decision === 'refuse_no_match');
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
