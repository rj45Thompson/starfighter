// thoughts.js — N5 THOUGHT REWARDS (NOVEL_SOCIETY.md pillar N5 + SCORECARD_SPEC.md §5 advisor rules).
// Per-pilot REASONING CHAINS over the baked novel graph (novel_graph.json), walked FROM THE PILOT'S OWN SEGMENT
// (canon rule 5 knowledge law: pov chapters + present scenes + broadcast scenes — nothing else is walkable).
//
// THE WALK — a chain is a sequence of connected triples (hop[i].s === hop[i-1].o) drawn ONLY from triples that are:
//   (1) inside the pilot's segment (t.sIdx ∈ segments[name].sentenceIdx), and
//   (2) MENTION-GROUNDED: the sIdx sentence LITERALLY contains the subject name. This excludes the documented
//       pattern-SVO noise per the NOVEL_SOCIETY backlog (tick-1 + tick-2 puppet audits):
//       (2a) pov-fallback triples (subject attributed to the chapter pov when no mention precedes the verb —
//            e.g. the old `VEGA tithe Halcyon Station` from "The tithe ships came to Halcyon…"), and
//       (2b) place-alias wrong-agent triples (a character word inside a multi-word PLACE name — the historical
//            ch-009 case `EMBER send/unfinish/wait CRUX` minted from "When the Ember Vigil sent for its
//            navigation master…"): a subject match inside a known multi-word place span does NOT ground, and as
//            a data-independent backstop a match immediately followed by another Capitalised word (a longer
//            proper-noun phrase: "Ember Vigil", "Meridian Yards") does not ground either. The tick-3 baker
//            landed its own PLACE_WORD_ALIASES guard, so the current bake mints the CORRECT place agent
//            (`The Ember Vigil send CRUX`) — this walk-layer law stays as defense in depth (the backlog rule:
//            N5 must never reward wrong-agent edges, whatever the baker's state). Measured before the baker fix:
//            the guards excluded exactly the 3 EMBER wrong-agent triples at ZERO cost in legitimate triples.
//       Grounding accepts the baker's leading-"The" place convention: a subject like "The Sundering"/"The Ember
//       Vigil" also grounds at its article-stripped variant ("the Sundering" mid-sentence), provided the variant
//       is not preceded by a different Capitalised word (so the future SECOND Sundering never grounds the first).
//
// THE REWARD (advisor rule, SCORECARD_SPEC §5: verified-usefulness, NOT length — "a tiny correct inference must
// beat a 100-step ramble"). For a chain scored for pilot NAME:
//   - base credit  W_BASE   per hop, ONLY if the WHOLE chain verifies (every hop re-derivable from the graph,
//     mention-grounded, inside the segment, connected s→o). One fabricated/tampered/foreign hop ⇒ total 0 (0-fab).
//   - novelty      W_NOVEL  per FRESH edge — semantic edge key s|r|o not in the pilot's own persisted chain
//     history and not already counted earlier in this same chain.
//   - bridge       W_BRIDGE per FRESH hop that CROSSES chapters (hop[i].chapter ≠ hop[i-1].chapter) and lands in
//     an EARNED sentence — one whose chapter the pilot knows through broadcast or a shared scene, NOT own pov
//     (cross-segment knowledge must be EARNED, pillar N3). Bridge is novelty-gated on purpose: re-crossing a
//     known bridge is stale news, which keeps the stale ceiling exact (below).
//   - frontier     W_FRONTIER per FRESH hop whose sentence the pilot's attached GRAPHFOG (graphfog.js — an
//     OPTIONAL soft dependency, see attachFog) revealed SINCE the fog's last mark(): thinking through
//     NEWLY-opened territory pays. Chains entirely inside the pre-revealed HOMELAND (the segment) earn ZERO
//     frontier bonus — homeland sentences are never "newly revealed" (anti-puppet). Frontier is novelty-gated
//     exactly like bridge (a stale re-walk through opened territory is stale news), so the stale ceiling stays
//     MAX_HOPS·W_BASE and the advisor law below is untouched. With a fog attached the pilot's KNOWABLE set
//     (verification + walk pool) extends from the segment to segment ∪ fog.revealed — the node-vision law: fog
//     opens ONLY along the knowledge-law edges graphfog.js enforces structurally. No fog attached ⇒ behaviour
//     is unchanged (frontier terms 0; the knowable set is the segment). Note the two bonuses are disjoint by
//     the knowledge law itself: an EARNED (broadcast/shared-scene) sentence is already in the segment, so a
//     bridge landing is never frontier territory and vice versa — no double-dip.
//   - scoring counts at most MAX_HOPS hops (the builder never exceeds it; over-long hand-fed chains truncate).
// ANTI-RAMBLE BY CONSTRUCTION: a stale chain earns exactly counted·W_BASE (novelty 0, bridges 0 since bridges
// require freshness), so its ceiling is MAX_HOPS·W_BASE; the smallest all-fresh 2-hop chain earns at least
// 2·(W_BASE+W_NOVEL). The CFG law 2·(W_BASE+W_NOVEL) > MAX_HOPS·W_BASE therefore guarantees a tiny fresh chain
// outscores ANY stale ramble — advisorLawHolds() exports the inequality; thoughts_test.js proves it numerically.
//
// FITNESS LEDGER — per pilot accumulated reward + chain count + the semantic-edge history that drives novelty.
// Persisted under STORE_KEY in window.localStorage when running as a browser script; plain in-memory in node.
// Edge history is self-bounded: keys only ever come from verified hops, so it can never exceed the graph's own
// distinct s|r|o set (no eviction logic needed). wipe() is the puppet test: a wiped ledger restarts novelty; a
// pilot whose SEGMENT is wiped from the graph builds no chain and scores 0 (anti-puppet, proven in the bench).
//
// SELF-WIRING — attaches window.THOUGHTS in a browser (script tag after the graph is fetchable; call
// THOUGHTS.load() to fetch novel_graph.json + novel/characters.json, or THOUGHTS.init({graph, roster}) with
// already-loaded JSON) AND exports module.exports for node (lazy-loads both files from __dirname on first use).
// HONESTY LEDGER — GIVEN: the baked graph (authored novel), the roster places list. LEARNED/EMERGENT: which
// chains each pilot walks, novelty, fitness ranking. Labeled honestly: GRAPH-WALK reward now; a trained GNN
// scorer is a later tier (pillar N5 text). Every number traces to the graph + the persisted ledger.
'use strict';
(function () {

const CFG = {
  STORE_KEY: 'THOUGHTS_v1',      // ledger persistence key (version stamp IS the contract)
  LEDGER_VERSION: 1,             // bump to invalidate persisted ledgers
  SEED: 20260707,                // deterministic PRNG seed (mulberry32; init({seed}) overrides)
  MAX_HOPS: 10,                  // walk cap AND the scoring truncation = the maximum possible "ramble" length
  W_BASE: 1,                     // verified-usefulness base credit per hop (chain must verify or total = 0)
  W_NOVEL: 6,                    // per FRESH semantic edge (s|r|o not in the pilot's history nor earlier in chain)
  W_BRIDGE: 3,                   // per fresh hop crossing chapters through an EARNED (broadcast/shared) sentence
  W_FRONTIER: 4,                 // per fresh hop through territory the pilot's GRAPHFOG revealed since its last mark()
  // ADVISOR LAW BY CONSTRUCTION: 2*(W_BASE+W_NOVEL)=14 > MAX_HOPS*W_BASE=10 — see advisorLawHolds().
  // W_FRONTIER is fresh-gated, so a stale ramble still caps at MAX_HOPS*W_BASE and the law is unaffected.
  MIN_VARIANT_LEN: 4,            // leading-"The" place variant minimum length (mirrors the baker's MIN_ALIAS_LEN)
  GRAPH_FILE: 'novel_graph.json',          // node lazy-load / browser load() default
  CHARS_FILE: 'novel/characters.json',     // roster (places list feeds the place-span guard)
  HOP_TEXT_CHARS: 160,           // sentence excerpt length carried per annotated hop (for the `thoughts` command)
  TOP_N: 10,                     // leaderboard rows returned by fitness()
};

// ---- deterministic PRNG (house standard: mulberry32, never Math.random) -------------------------------------
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let RNG = mulberry32(CFG.SEED);

// ---- storage adapter: browser window.localStorage, else in-memory (node) ------------------------------------
const memStore = (function () { const m = {}; return {
  getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; })();
let STORE = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : memStore;

// ---- graph state (set by init/load; node lazy-loads from __dirname) -----------------------------------------
let G = null;            // the raw baked graph {sentences, triples, segments, chapters, counts}
let PLACES = [];         // roster places (multi-word ones feed the span guard); fallback = chapter place tags
let GROUNDED = null;     // triples passing the mention-grounded law, in graph order
let TKEY = null;         // Map instance-key -> {t, grounded} for verification lookups
let SEGSET = null;       // {name: Set(sentenceIdx)}
let POOLS = null;        // {name: grounded triples inside the knowable set} (lazy per pilot)
let FOGS = {};           // {name: GRAPHFOG instance} — the optional frontier-bonus soft dependency (attachFog)
let POOLS_REV = {};      // {name: fog.revealed.size at pool-bake time} — invalidates the pool when fog moves

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const instKey = (t) => t.s + '|' + t.r + '|' + t.o + '|' + t.chapter + '|' + t.sIdx;   // one baked triple instance
const edgeKey = (t) => t.s + '|' + t.r + '|' + t.o;                                     // semantic edge (novelty unit)

// ---- THE MENTION-GROUNDED LAW (backlog rule: sIdx sentence literally contains the subject) -------------------
// A subject match grounds iff: word-boundary + Capitalised-in-prose (baker's own rule), NOT inside a known
// multi-word place span (other than the subject itself), and NOT immediately followed — across an optional
// possessive ('s) — by another Capitalised word (part of a longer proper-noun phrase, e.g. "Ember Vigil").
// Subjects starting with "The " also try their article-stripped VARIANT ("the Sundering" mid-sentence grounds
// "The Sundering"), guarded backward: a different Capitalised word right before the variant rejects the match
// (so "Second Sundering" never grounds "The Sundering").
function theVariant(name) {
  const m = /^the\s+(.+)$/i.exec(name);
  const v = m && m[1].trim();
  return (v && v.length >= CFG.MIN_VARIANT_LEN) ? v : null;
}
function placeSpans(text, exceptName) {
  const spans = [];
  for (const p of PLACES) {
    if (p === exceptName || !/\s/.test(p)) continue;                       // multi-word places only
    const pats = [p]; const v = theVariant(p); if (v && /\s/.test(v)) pats.push(v);
    for (const pat of pats) {
      const re = new RegExp('\\b' + escapeRe(pat) + '\\b', 'gi'); let m;
      while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
    }
  }
  return spans;
}
function mentionGrounded(subject, text) {
  const spans = placeSpans(text, subject);
  const pats = [{ pat: subject, variant: false }];
  const v = theVariant(subject); if (v) pats.push({ pat: v, variant: true });
  for (const { pat, variant } of pats) {
    const re = new RegExp('\\b' + escapeRe(pat) + '\\b', 'gi'); let m;
    while ((m = re.exec(text)) !== null) {
      const tok = m[0];
      if (tok[0] !== tok[0].toUpperCase() || !/[A-Za-z]/.test(tok[0])) continue;       // Capitalised-in-prose rule
      const a = m.index, b = m.index + tok.length;
      if (spans.some(([x, y]) => a < y && b > x)) continue;                            // inside a place name
      if (variant) {                                                                    // backward guard (variants only)
        const prev = /([A-Za-z][A-Za-z'’-]*)\s+$/.exec(text.slice(0, a));
        if (prev && prev[1].toLowerCase() !== 'the' && prev[1][0] >= 'A' && prev[1][0] <= 'Z') continue;
      }
      let j = b;                                                                        // capital-run backstop
      const poss = /^['’][a-z]*/.exec(text.slice(j));                              // skip possessive ('s)
      if (poss) j += poss[0].length;
      const ws = /^\s+/.exec(text.slice(j));
      if (ws) { j += ws[0].length; const nx = text[j]; if (nx && nx >= 'A' && nx <= 'Z') continue; }
      return true;
    }
  }
  return false;
}

// ---- graph wiring --------------------------------------------------------------------------------------------
function setGraph(graph, roster) {
  if (!graph || !Array.isArray(graph.sentences) || !Array.isArray(graph.triples) || !graph.segments)
    throw new Error('THOUGHTS: graph must be the RAW bake (sentences[], triples[], segments{}) — got something else');
  G = graph;
  PLACES = (roster && Array.isArray(roster.places) && roster.places.length)
    ? roster.places.map(String)
    : [...new Set((graph.chapters || []).map(c => c && c.place).filter(Boolean))];      // honest weaker fallback
  GROUNDED = []; TKEY = new Map(); POOLS = {}; FOGS = {}; POOLS_REV = {};
  for (const t of G.triples) {
    const ok = mentionGrounded(t.s, G.sentences[t.sIdx].text);
    TKEY.set(instKey(t), { t, grounded: ok });
    if (ok) GROUNDED.push(t);
  }
  SEGSET = {};
  for (const name in G.segments) SEGSET[name] = new Set(G.segments[name].sentenceIdx);
}
function ensureGraph() {
  if (G) return;
  if (typeof require === 'function' && typeof __dirname !== 'undefined') {              // node lazy default
    const fs = require('fs'), path = require('path');
    const graph = JSON.parse(fs.readFileSync(path.join(__dirname, CFG.GRAPH_FILE), 'utf8'));
    let roster = null;
    try { roster = JSON.parse(fs.readFileSync(path.join(__dirname, CFG.CHARS_FILE), 'utf8')); } catch (e) { /* places fallback */ }
    setGraph(graph, roster);
    return;
  }
  throw new Error('THOUGHTS: no graph loaded — call THOUGHTS.init({graph, roster}) or await THOUGHTS.load()');
}
function poolFor(name) {
  ensureGraph();
  if (!(name in SEGSET)) throw new Error('THOUGHTS: unknown pilot "' + name + '" (not in the graph segments)');
  const fog = FOGS[name];
  if (fog && POOLS_REV[name] !== fog.revealed.size) delete POOLS[name];    // fog moved (reveal/wipe) — pool is stale
  if (!POOLS[name]) { const seg = SEGSET[name];
    POOLS[name] = GROUNDED.filter(t => seg.has(t.sIdx) || (fog && fog.revealed.has(t.sIdx)));
    POOLS_REV[name] = fog ? fog.revealed.size : -1; }
  return POOLS[name];
}

// ---- ledger (LEARNED — persisted; wiping visibly resets novelty + fitness) -----------------------------------
function blankLedger() { return { version: CFG.LEDGER_VERSION, tick: 0, cursor: 0, pilots: {} }; }
let L = blankLedger();
(function loadLedger() {
  try { const raw = STORE.getItem(CFG.STORE_KEY); if (raw) { const p = JSON.parse(raw);
    if (p && p.version === CFG.LEDGER_VERSION) L = p; } } catch (e) { /* fresh ledger */ }
})();
function persist() { try { STORE.setItem(CFG.STORE_KEY, JSON.stringify(L)); } catch (e) { /* storage may be full */ } }
function pilotLedger(name) {
  if (!L.pilots[name]) L.pilots[name] = { fitness: 0, chains: 0, edges: {} };
  return L.pilots[name];
}

// ---- EARNED knowledge (pillar N3: cross-segment reach comes from broadcast or shared scenes, never own pov) --
function earned(name, sent) {
  return sent.pov !== name && (sent.broadcast === true || (Array.isArray(sent.present) && sent.present.includes(name)));
}

// ---- verification: every hop re-derivable from the graph, grounded, inside segment, connected ----------------
function verifyChain(name, hops) {
  ensureGraph();
  if (!(name in SEGSET)) return { ok: false, why: 'unknown pilot', at: -1 };
  for (let i = 0; i < hops.length; i++) {
    const h = hops[i];
    const rec = h && TKEY.get(instKey(h));
    if (!rec) return { ok: false, why: 'hop not a baked triple (fabricated or tampered)', at: i };
    if (!rec.grounded) return { ok: false, why: 'hop subject not mention-grounded (documented SVO noise)', at: i };
    if (!SEGSET[name].has(h.sIdx) && !(FOGS[name] && FOGS[name].revealed.has(h.sIdx)))
      return { ok: false, why: 'hop outside the pilot segment' + (FOGS[name] ? ' + revealed fog' : '') + ' (knowledge law)', at: i };
    if (i > 0 && h.s !== hops[i - 1].o) return { ok: false, why: 'hops not connected (s must equal previous o)', at: i };
  }
  return { ok: true, why: 'verified', at: hops.length };
}

// ---- scoring (PURE — no ledger mutation; commitChain records) ------------------------------------------------
function scoreChain(name, hops) {
  const v = verifyChain(name, hops);
  const zero = { verified: v.ok, why: v.why, counted: 0, base: 0, fresh_edges: 0, novelty: 0, bridges: 0, bridge_bonus: 0,
    frontier_hops: 0, frontier_bonus: 0, total: 0 };
  if (!v.ok || hops.length === 0) return zero;
  const known = pilotLedger(name).edges;
  const fog = FOGS[name];                                            // frontier soft dependency (absent ⇒ terms 0)
  const newly = fog ? new Set(fog.newlyRevealed()) : null;           // opened since the fog's last mark()
  const seenInChain = new Set();
  const counted = Math.min(hops.length, CFG.MAX_HOPS);
  let base = 0, freshN = 0, bridges = 0, frontierN = 0;
  const annotated = [];
  for (let i = 0; i < counted; i++) {
    const h = hops[i];
    base += CFG.W_BASE;
    const ek = edgeKey(h);
    const fresh = !(ek in known) && !seenInChain.has(ek);
    seenInChain.add(ek);
    let bridge = false, frontier = false;
    if (fresh) {
      freshN++;
      if (i > 0 && h.chapter !== hops[i - 1].chapter && earned(name, G.sentences[h.sIdx])) { bridge = true; bridges++; }
      if (newly && newly.has(h.sIdx)) { frontier = true; frontierN++; }        // novelty-gated, like bridge
    }
    annotated.push({ s: h.s, r: h.r, o: h.o, chapter: h.chapter, sIdx: h.sIdx, fresh, bridge, frontier,
      text: G.sentences[h.sIdx].text.slice(0, CFG.HOP_TEXT_CHARS) });
  }
  const novelty = freshN * CFG.W_NOVEL, bridge_bonus = bridges * CFG.W_BRIDGE,
    frontier_bonus = frontierN * CFG.W_FRONTIER;
  return { verified: true, why: 'verified', counted, base, fresh_edges: freshN, novelty, bridges, bridge_bonus,
    frontier_hops: frontierN, frontier_bonus, total: base + novelty + bridge_bonus + frontier_bonus, annotated };
}

// ---- commit: accrue fitness + record semantic edges into the pilot's history --------------------------------
function commitChain(name, hops, score) {
  const s = score || scoreChain(name, hops);
  if (!s.verified || s.counted === 0) return s;                     // failed/empty chains accrue NOTHING
  const P = pilotLedger(name);
  for (let i = 0; i < s.counted; i++) { const ek = edgeKey(hops[i]); P.edges[ek] = (P.edges[ek] || 0) + 1; }
  P.fitness += s.total;
  P.chains += 1;
  L.tick += 1;
  P.last = { tick: L.tick, hops: s.counted, total: s.total, fresh: s.fresh_edges, bridges: s.bridges,
    frontier: s.frontier_hops || 0 };
  persist();
  return s;
}

// ---- the walk: prefer-fresh greedy chain over the pilot's grounded segment triples --------------------------
function buildChain(name) {
  const pool = poolFor(name);
  if (!pool.length) return [];
  const known = pilotLedger(name).edges;
  const bys = {};
  for (const t of pool) (bys[t.s] = bys[t.s] || []).push(t);
  const isFresh = (t, seen) => !(edgeKey(t) in known) && !seen.has(edgeKey(t));
  const pick = (arr) => arr[Math.floor(RNG() * arr.length)];
  const seen = new Set();
  // start preference (multi-hop chains are the point): fresh-with-continuation > fresh > any (PRNG within tier)
  const freshStarts = pool.filter(t => isFresh(t, seen));
  const goingStarts = freshStarts.filter(t => (bys[t.o] || []).length > 0);
  let cur = pick(goingStarts.length ? goingStarts : (freshStarts.length ? freshStarts : pool));
  const chain = [cur]; seen.add(edgeKey(cur));
  while (chain.length < CFG.MAX_HOPS) {
    const nexts = (bys[cur.o] || []).filter(t => !seen.has(edgeKey(t)));
    if (!nexts.length) break;
    const fresh = nexts.filter(t => isFresh(t, seen));
    cur = pick(fresh.length ? fresh : nexts);
    chain.push(cur); seen.add(edgeKey(cur));
  }
  return chain;
}

// ---- public API ----------------------------------------------------------------------------------------------
function chainFor(name) {                       // one THOUGHT: build + score + commit + return (the `thoughts` command)
  const hops = buildChain(name);
  const score = scoreChain(name, hops);
  commitChain(name, hops, score);
  return { pilot: name, tick: L.tick, hops, score };
}
function tick() {                               // round-robin one pilot with a non-empty grounded pool
  ensureGraph();
  const names = Object.keys(G.segments);
  for (let step = 0; step < names.length; step++) {
    const name = names[(L.cursor + step) % names.length];
    if (poolFor(name).length) { L.cursor = (L.cursor + step + 1) % names.length; return chainFor(name); }
  }
  return { pilot: null, tick: L.tick, hops: [], score: scoreChain(names[0] || '', []),
    note: 'no pilot has a walkable grounded segment' };
}
function fitness() {
  ensureGraph();
  const pilots = {};
  for (const name in L.pilots) { const p = L.pilots[name];
    pilots[name] = { fitness: p.fitness, chains: p.chains, edges_known: Object.keys(p.edges).length, last: p.last || null }; }
  const top = Object.keys(pilots).map(n => [n, pilots[n].fitness])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, CFG.TOP_N);
  return { version: CFG.LEDGER_VERSION, tick: L.tick, law: advisorLawHolds(), pilots, top };
}
function pilots() {                             // roster view for the game: who can think, who scores
  ensureGraph();
  return Object.keys(G.segments).map(name => ({ name, pool: poolFor(name).length,
    fitness: (L.pilots[name] && L.pilots[name].fitness) || 0, chains: (L.pilots[name] && L.pilots[name].chains) || 0 }));
}
function wipe() { L = blankLedger(); persist(); }
function advisorLawHolds() {                    // tiny-fresh-chain > any-stale-ramble, BY CONSTRUCTION
  return 2 * (CFG.W_BASE + CFG.W_NOVEL) > CFG.MAX_HOPS * CFG.W_BASE;
}
function attachFog(name, fog) {                 // GRAPHFOG soft dependency (graphfog.js): the pilot's node-vision
  ensureGraph();                                // fog. Revealed fog extends the knowable set; FRESH hops through
  if (!(name in SEGSET)) throw new Error('THOUGHTS: unknown pilot "' + name + '" (not in the graph segments)');
  if (!fog || !fog.revealed || typeof fog.revealed.has !== 'function' || typeof fog.newlyRevealed !== 'function')
    throw new Error('THOUGHTS: attachFog needs a GRAPHFOG instance ({revealed:Set, newlyRevealed()})');
  if (fog.pilot && fog.pilot !== name) throw new Error('THOUGHTS: fog/pilot mismatch (' + fog.pilot + ' vs ' + name + ')');
  FOGS[name] = fog; delete POOLS[name]; delete POOLS_REV[name];       // territory opened since mark() earns W_FRONTIER
  return true;
}
function detachFog(name) { const had = !!FOGS[name]; delete FOGS[name]; delete POOLS[name]; delete POOLS_REV[name]; return had; }
function init(opts) {
  const o = opts || {};
  if (o.storage) { STORE = o.storage; L = blankLedger();
    try { const raw = STORE.getItem(CFG.STORE_KEY); if (raw) { const p = JSON.parse(raw);
      if (p && p.version === CFG.LEDGER_VERSION) L = p; } } catch (e) { /* fresh */ } }
  if (o.graph) setGraph(o.graph, o.roster || null); else ensureGraph();
  RNG = mulberry32(o.seed != null ? o.seed : CFG.SEED);
  if (o.fresh) wipe();
  return { pilots: Object.keys(G.segments).length, triples: G.triples.length, grounded: GROUNDED.length,
    walkable_pilots: Object.keys(G.segments).filter(n => poolFor(n).length > 0).length };
}
async function load(base) {                     // browser convenience: fetch graph + roster then init
  const b = base || './';
  const graph = await fetch(b + CFG.GRAPH_FILE).then(r => r.ok ? r.json() : null);
  if (!graph) throw new Error('THOUGHTS.load: cannot fetch ' + CFG.GRAPH_FILE);
  const roster = await fetch(b + CFG.CHARS_FILE).then(r => r.ok ? r.json() : null).catch(() => null);
  return init({ graph, roster });
}

const API = { CFG, init, load, tick, chainFor, scoreChain, commitChain, buildChain, verifyChain, fitness, pilots,
  wipe, advisorLawHolds, mentionGrounded, earned, groundedPoolFor: poolFor, attachFog, detachFog,
  _ledger: () => L, _grounded: () => (ensureGraph(), GROUNDED) };

if (typeof window !== 'undefined') window.THOUGHTS = API;           // browser script tag (self-wiring)
if (typeof module !== 'undefined' && module.exports) module.exports = API;   // node standalone
})();
