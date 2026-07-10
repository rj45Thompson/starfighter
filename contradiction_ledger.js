// contradiction_ledger.js - THE SHARED CONTRADICTION / QUARANTINE LEDGER, ported (AGI_SALVAGE queue item 2;
// source read verbatim first: D:\code\TDRE_fixed_5\TDRE\src\tdre\contradiction.py). The governing principle,
// quoted from the original: "no pillar maintains private truth" - a conflict surfaced anywhere makes EVERY
// consumer abstain on the tainted key instead of answering by local check-order.
//
// Ported faithfully:
//   - claims keyed (world, subject, predicate); predicates are FUNCTIONAL by default - two DISTINCT values on
//     the same key in the SAME world = contradiction -> the key is QUARANTINED until explicitly cleared.
//   - the MODAL RULE ("do not collapse worlds"): a private belief that differs from the shared actual world is
//     NOT a contradiction - different keys. This maps 1:1 onto the game's two-tier store: world '@' = the shared
//     tier, world '<agent>' = that mind's private layer. A mind may privately believe what the shared record
//     denies; only same-world conflicts quarantine. (Exactly the original's "bel:alice" case.)
//   - the (type,value) bucket trick: 1 and true must occupy DISTINCT buckets (the original found bool/int
//     hash-collision let a real contradiction last-write-win) - JS keys as typeof+'|'+String(value).
//   - tainted(evidence): any evidence key quarantined -> the caller must answer unknown/abstain.
//
// Game wiring: FUNCTIONAL_RELS declares which store relations are functional (isa / in_task / in_domain /
// taught_by / inferred_in_task - one value each per subject per world). attach(store) audits everything already
// committed, then wraps store.commit so future conflicting commits are flagged the moment they land. Consumers:
// the sober gate refuses queries whose grounded evidence is tainted, the centroid mind abstains on tainted
// labels, the Observatory marks tainted edges. One ledger, every pillar consults it.
//
// PUBLIC API (window.CONTRA): { note, quarantine, isQuarantined, status, value, reason, tainted,
//   quarantinedKeys, clear, snapshot, restore, attach, auditStore, FUNCTIONAL_RELS }.
'use strict';
(function () {

var ACTUAL = '@';   // the shared/actual world (ported constant)
var FUNCTIONAL_RELS = ['isa', 'in_task', 'in_domain', 'taught_by', 'inferred_in_task'];   // one value per (world,subject) each

function win() { return (typeof window !== 'undefined') ? window : null; }
function vkey(value) { return typeof value + '|' + String(value); }   // the (type,value) bucket trick, JS form
function kkey(world, subject, predicate) { return String(world) + '␟' + String(subject) + '␟' + String(predicate); }

var L = {
  claims: {},        // kkey -> { vkey: {value, sources:Set} }
  quarantined: {},   // kkey -> 1
  reasons: {},       // kkey -> string
};

function note(subject, predicate, value, world, source) {
  world = world == null ? ACTUAL : world;
  var k = kkey(world, subject, predicate);
  var bucket = L.claims[k] = L.claims[k] || {};
  var vk = vkey(value);
  if (!bucket[vk]) bucket[vk] = { value: value, sources: new Set() };
  if (source != null) bucket[vk].sources.add(source);
  if (Object.keys(bucket).length > 1) {
    L.quarantined[k] = 1;
    var vals = Object.keys(bucket).map(function (b) { return JSON.stringify(bucket[b].value); }).sort();
    L.reasons[k] = 'incompatible values for ' + predicate + ' of ' + subject + ' in world ' + world + ': ' + vals.join(' vs ');
    return 'contradiction';
  }
  return 'ok';
}
function quarantine(subject, predicate, world, reason) {
  world = world == null ? ACTUAL : world;
  var k = kkey(world, subject, predicate);
  L.quarantined[k] = 1; if (reason) L.reasons[k] = reason;
}
function isQuarantined(subject, predicate, world) { return !!L.quarantined[kkey(world == null ? ACTUAL : world, subject, predicate)]; }
function status(subject, predicate, world) {
  var k = kkey(world == null ? ACTUAL : world, subject, predicate);
  if (L.quarantined[k]) return 'quarantined';
  var b = L.claims[k];
  return (b && Object.keys(b).length === 1) ? 'known' : 'unknown';
}
function value(subject, predicate, world) {
  if (status(subject, predicate, world) !== 'known') return null;
  var b = L.claims[kkey(world == null ? ACTUAL : world, subject, predicate)];
  return b[Object.keys(b)[0]].value;
}
function reason(subject, predicate, world) { return L.reasons[kkey(world == null ? ACTUAL : world, subject, predicate)] || ''; }
function tainted(evidence) {   // items: [subject,predicate] (actual world) or [world,subject,predicate]
  for (var i = 0; i < evidence.length; i++) { var ev = evidence[i];
    var k = ev.length === 2 ? kkey(ACTUAL, ev[0], ev[1]) : kkey(ev[0], ev[1], ev[2]);
    if (L.quarantined[k]) return true; }
  return false;
}
function quarantinedKeys() { return Object.keys(L.quarantined).map(function (k) { var p = k.split('␟'); return { world: p[0], subject: p[1], predicate: p[2], reason: L.reasons[k] || '' }; }); }
function clear() { L.claims = {}; L.quarantined = {}; L.reasons = {}; }
function snapshot() { return Object.keys(L.quarantined); }
function restore(snap) { L.quarantined = {}; (snap || []).forEach(function (k) { L.quarantined[k] = 1; }); }

// ---- game wiring -------------------------------------------------------------------------------------------------
// audit everything already in the two-tier store: shared facts note under '@', each agent's private facts under
// their own world - the modal rule keeps a private belief from colliding with the shared record.
function auditStore(store) {
  var K = store || (win() && win().GAME_KNOW); if (!K || typeof K._state !== 'function') return { noted: 0, contradictions: [] };
  var S = K._state(); var noted = 0; var found = [];
  function ingest(k, world) {
    var p = k.split('|'); if (p.length < 3) return;
    if (FUNCTIONAL_RELS.indexOf(p[1]) < 0) return;
    noted++;
    if (note(p[0], p[1], p[2], world, 'store') === 'contradiction') found.push({ world: world, subject: p[0], predicate: p[1], reason: reason(p[0], p[1], world) });
  }
  for (var k1 in S.shared) ingest(k1, ACTUAL);
  for (var ag in S.priv) for (var k2 in S.priv[ag]) ingest(k2, ag);
  return { noted: noted, contradictions: found };
}
// wrap store.commit so future functional-relation commits are checked the moment they land (pass-through
// preserved exactly like the Observatory's own feed wrap - knowledge.js methods take no `this`).
function attach(store) {
  var K = store || (win() && win().GAME_KNOW); if (!K || typeof K.commit !== 'function' || K.__contraWrapped) return auditStore(K);
  var res = auditStore(K);
  var orig = K.commit;
  K.commit = function (edge, meta) {
    var r = orig(edge, meta);
    try {
      if (r && r.isNew && FUNCTIONAL_RELS.indexOf(edge.r) >= 0) {
        var world = (r.tier === 'shared') ? ACTUAL : ((meta && meta.agent) || '_anon');
        var st = note(edge.s, edge.r, edge.o, world, (meta && meta.source) || 'commit');
        if (st === 'contradiction' && win() && typeof win().ev === 'function') {
          try { win().ev('⚠ CONTRADICTION quarantined: ' + reason(edge.s, edge.r, world)); } catch (e) {}
        }
      }
    } catch (e) {}
    return r;
  };
  K.__contraWrapped = true;
  return res;
}

var API = { note: note, quarantine: quarantine, isQuarantined: isQuarantined, status: status, value: value,
  reason: reason, tainted: tainted, quarantinedKeys: quarantinedKeys, clear: clear, snapshot: snapshot,
  restore: restore, attach: attach, auditStore: auditStore, FUNCTIONAL_RELS: FUNCTIONAL_RELS, ACTUAL: ACTUAL };
if (typeof window !== 'undefined') window.CONTRA = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node): port-faithful behaviors + the game-shape audit -------------------------------------------
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  var C = module.exports;
  check('same value twice is idempotent (ok)', C.note('x', 'isa', 'star') === 'ok' && C.note('x', 'isa', 'star') === 'ok' && C.status('x', 'isa') === 'known');
  check('two distinct values same world = contradiction + quarantine', C.note('x', 'isa', 'planet') === 'contradiction' && C.isQuarantined('x', 'isa'));
  check('reason names the conflict', C.reason('x', 'isa').indexOf('star') >= 0 && C.reason('x', 'isa').indexOf('planet') >= 0);
  check('quarantined key yields no value', C.value('x', 'isa') === null);
  check('MODAL RULE: a private-world belief does NOT collide with actual', C.note('x', 'isa', 'ghost', 'VEGA') === 'ok' && !C.isQuarantined('x', 'isa', 'VEGA'));
  check('the (type,value) bucket trick: 1 vs true is a REAL contradiction', (C.note('y', 'count', 1) === 'ok') && (C.note('y', 'count', true) === 'contradiction'));
  check('tainted() flags evidence touching a quarantined key', C.tainted([['x', 'isa']]) === true && C.tainted([['z', 'isa']]) === false);
  var snap = C.snapshot(); C.clear();
  check('clear() empties; restore() brings the quarantine set back', C.isQuarantined('x', 'isa') === false && (C.restore(snap), C.isQuarantined('x', 'isa') === true));
  C.clear();
  // game-shape audit: stub store with a planted shared conflict + a private non-conflict
  var S = { shared: { 'awb_1|in_task|search': 1, 'awb_1|in_task|swe': 1, 'sun|isa|star': 1 }, priv: { ORION: { 'sun|isa|beacon': 1 } } };
  var r = C.auditStore({ _state: function () { return S; } });
  check('auditStore finds exactly the planted shared conflict', r.contradictions.length === 1 && r.contradictions[0].subject === 'awb_1');
  check('private isa differing from shared isa stays clean (worlds not collapsed)', !C.isQuarantined('sun', 'isa') && !C.isQuarantined('sun', 'isa', 'ORION'));
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
