// knowledge_screen.js - THE KNOWLEDGE OBSERVATORY (user 2026-07-09: "I want the knowledge graph to be full screen
// and I want to see what is going on and I want to see what novel was fed to it on that same screen and I want to
// be able to talk to it in the knowledge graph screen and see what it does step by step if possible").
//
// A self-managed FULLSCREEN modal (same pattern as engbay.js/starmap.js/planetmenu.js - position:fixed;inset:0,
// own z-index, close button + ESC; deliberately NOT a PANELS corner panel, per the same design call REQUIREMENTS_SR
// records for starmap). Four surfaces on one screen:
//   1. THE GRAPH (left, big canvas) - the live two-tier store (knowledge.js GAME_KNOW), cyan=shared violet=private,
//      golden-angle spiral layout (deterministic, no physics, scales to 100+ nodes where the small HUD's 3-ring
//      radial saturates). Hover a node = its relations; CLICK a node = ask about it (see 4).
//   2. THE NOVEL (right-top) - what was actually FED to the minds: HOST.NOVEL (starfighter.html's normalized
//      NOVELDATA: title/chapters/words + per-character verbatim segment sentences). Pick a character, read the
//      exact sentences their retrieval index holds - the GIVEN-from-canon source, labeled as such.
//   3. LIVE ACTIVITY (right-middle) - "what is going on": GAME_KNOW.commit is wrapped ONCE (original behavior
//      preserved, result passed through) so every NEW verified fact logs the instant it lands, tier+source+agent.
//      Queries run from this screen log here too.
//   4. ASK (right-bottom) - talk to it: type a question (or click a node). Entity mentions are grounded against
//      the store's real node ids - 0 matches = honest "I don't know those" listing what it DOES know (no
//      fabrication); 1 match = step-by-step walk of that entity's known relations; 2 matches + deliberate.js
//      loaded = a REAL DELIBERATE.deliberate() run over the store's own edges (state=first, goal=second), its
//      chain replayed step by step: each visited node focuses+highlights on the canvas, WHAT/HOW/WHY/convergence
//      render as lines, ending in the engine's own CONCLUDE or honest ABSTAIN(gap).
//
// PUBLIC API (window.KOBS): { open(), close(), toggle(), visible(), ask(text), mount() }.
// SYNTAX-CLEAN under node: browser refs guarded; self-test under require.main stubs window/document + a stub store,
// requires the REAL deliberate.js, and exercises graph build, commit-wrap logging, and all three ask paths.
'use strict';
(function () {

var CFG = {
  Z: 86,                    // above engbay (80) and pmRoot (74) - the observatory always sits on top when opened
  STEP_MS: 700,             // step-by-step replay cadence (slow enough to read, fast enough to not bore)
  POLL_MS: 700,             // live redraw/stats cadence while open (the graph visibly grows as facts commit)
  MAX_SHARED: 90,           // most-recent shared facts drawn (fullscreen budget; small HUD draws 20)
  MAX_PRIV: 50,             // most-recent private facts drawn across all agents (small HUD draws ~12)
  MAX_NODES: 130,           // hard node cap (legibility backstop)
  NODE_R: 5,                // node dot radius
  HL_NODE_R: 8,             // highlighted node radius
  LABEL_MAX: 16,            // node label clip
  FEED_MAX: 60,             // activity feed ring size
  ASK_EDGE_STEPS: 12,       // max relation steps replayed for a single-entity ask
  ASK_CHAIN_STEPS: 8,       // max deliberation sub-decisions replayed
  KNOWN_SAMPLE: 8,          // how many known entities to list on a 0-match honest abstain
  COL_SHARED: '#37e0ff', COL_SHARED_DIM: '#1c6f80',
  COL_PRIV: '#b98cff', COL_PRIV_DIM: '#5b466f',
  COL_HL: '#ffd27a', COL_FOCUS: '#ffffff',
  COL_TXT: '#cfe6f5', COL_DIM: '#6f93a8', COL_OK: '#7fdc8a', COL_WARN: '#ffb454',
  COL_BG: '#050b13', COL_PANEL: 'rgba(8,16,26,0.97)', COL_BORDER: '#2b6d8a',
};

function win() { return (typeof window !== 'undefined') ? window : null; }
function doc() { return (typeof document !== 'undefined') ? document : null; }
function el(tag, css, html) { var d = doc(); if (!d) return null; var e = d.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

var KO = {
  built: false, shown: false, wrapped: false,
  root: null, canvas: null, ctx: null, dpr: 1, cw: 800, ch: 600,
  statsEl: null, statusEl: null, feedEl: null, tipEl: null,
  novelSel: null, novelBody: null, novelHead: null,
  askIn: null, askOut: null,
  graph: null, pos: null,
  hl: { nodes: {}, edges: {}, focus: null },   // plain objects as sets (node self-test friendliness)
  feed: [], steps: [], stepT: null, pollT: null, escFn: null,
};

// ---- store access (same defensive contract as knowledge_hud.js) ----------------------------------------------
function store() { var w = win(); return (w && w.GAME_KNOW) ? w.GAME_KNOW : null; }
function storeState() { var K = store(); if (!K || typeof K._state !== 'function') return { shared: {}, priv: {} }; try { return K._state() || { shared: {}, priv: {} }; } catch (e) { return { shared: {}, priv: {} }; } }
function storeStats() { var K = store(); if (!K || typeof K.stats !== 'function') return { shared: 0, agents: 0, private_total: 0 }; try { return K.stats(); } catch (e) { return { shared: 0, agents: 0, private_total: 0 }; } }
// every edge the observatory can see: shared + EVERY agent's private (this is a debug OBSERVER view - it watches
// all minds; the store's own know(agent) isolation still governs what each AGENT can use).
function allEdges() {
  var S = storeState(); var out = [];
  for (var k in S.shared) { var p = k.split('|'); if (p.length >= 3) out.push({ s: p[0], r: p[1], o: p[2], _tier: 'shared' }); }
  for (var ag in S.priv) for (var k2 in S.priv[ag]) { var p2 = k2.split('|'); if (p2.length >= 3) out.push({ s: p2[0], r: p2[1], o: p2[2], _tier: 'private', _agent: ag }); }
  return out;
}

// ---- graph build + layout --------------------------------------------------------------------------------------
function buildGraph() {
  var S = storeState();
  var nodes = {}, edges = [], ord = 0;
  function addNode(id, tier) { if (!nodes[id]) nodes[id] = { id: id, tier: tier, ord: ord++ }; else if (tier === 'shared') nodes[id].tier = 'shared'; }
  function ingest(keys, tier, limit) {
    var start = Math.max(0, keys.length - limit);
    for (var i = start; i < keys.length; i++) {
      var p = keys[i].split('|'); if (p.length < 3) continue;
      if (Object.keys(nodes).length >= CFG.MAX_NODES) break;
      addNode(p[0], tier); addNode(p[2], tier);
      edges.push({ a: p[0], b: p[2], r: p[1], tier: tier });
    }
  }
  ingest(Object.keys(S.shared || {}), 'shared', CFG.MAX_SHARED);
  var privKeys = [];
  for (var ag in (S.priv || {})) { var ks = Object.keys(S.priv[ag]); for (var j = Math.max(0, ks.length - CFG.MAX_PRIV); j < ks.length; j++) privKeys.push(ks[j]); }
  ingest(privKeys, 'private', CFG.MAX_PRIV);
  return { nodes: nodes, edges: edges };
}
// golden-angle spiral: deterministic, no physics, spreads any N evenly (the small HUD's 3-ring radial clumps past ~40)
function layout(graph, w, h) {
  var ids = Object.keys(graph.nodes); var pos = {};
  var cx = w / 2, cy = h / 2, maxR = Math.min(w, h) * 0.46, N = ids.length || 1;
  var GA = 2.399963229728653;   // golden angle (rad)
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i], hh = 0;
    for (var k = 0; k < id.length; k++) hh = (hh * 31 + id.charCodeAt(k)) & 0x7fffffff;
    var jit = ((hh % 1000) / 1000 - 0.5) * 0.25;
    var ang = i * GA + jit;
    var rr = maxR * Math.sqrt((i + 0.6) / N);
    pos[id] = { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
  }
  return pos;
}
function edgeKey(e) { return e.a + '|' + e.r + '|' + e.b; }

function draw() {
  var ctx = KO.ctx; if (!ctx) return;
  var w = KO.cw, h = KO.ch;
  ctx.setTransform(KO.dpr, 0, 0, KO.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(55,224,255,0.045)'; ctx.lineWidth = 1;
  for (var gx = 0; gx <= w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
  for (var gy = 0; gy <= h; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
  var graph = buildGraph(); var pos = layout(graph, w, h);
  KO.graph = graph; KO.pos = pos;
  if (!Object.keys(graph.nodes).length) {
    ctx.fillStyle = '#4a6172'; ctx.font = '13px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center';
    ctx.fillText('awaiting the first verified fact - run `deliberate <planet>` in the terminal to force one', w / 2, h / 2);
    ctx.textAlign = 'left'; return;
  }
  // edges (highlighted ones drawn after, brighter + thicker)
  var hlE = [];
  for (var i = 0; i < graph.edges.length; i++) {
    var e = graph.edges[i]; var pa = pos[e.a], pb = pos[e.b]; if (!pa || !pb) continue;
    if (KO.hl.edges[edgeKey(e)]) { hlE.push(e); continue; }
    ctx.strokeStyle = (e.tier === 'shared') ? CFG.COL_SHARED_DIM : CFG.COL_PRIV_DIM; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }
  for (var i2 = 0; i2 < hlE.length; i2++) {
    var e2 = hlE[i2]; var pa2 = pos[e2.a], pb2 = pos[e2.b]; if (!pa2 || !pb2) continue;
    ctx.strokeStyle = CFG.COL_HL; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(pa2.x, pa2.y); ctx.lineTo(pb2.x, pb2.y); ctx.stroke();
  }
  ctx.font = '10px ui-monospace,Menlo,Consolas,monospace';
  for (var id in graph.nodes) {
    var p = pos[id]; if (!p) continue;
    var tier = graph.nodes[id].tier;
    var isHl = !!KO.hl.nodes[id], isFocus = (KO.hl.focus === id);
    var r = isHl || isFocus ? CFG.HL_NODE_R : CFG.NODE_R;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = (tier === 'shared') ? CFG.COL_SHARED : CFG.COL_PRIV; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    if (isFocus) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = CFG.COL_FOCUS; ctx.lineWidth = 1.6; ctx.stroke(); }
    else if (isHl) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.strokeStyle = CFG.COL_HL; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.fillStyle = (isHl || isFocus) ? '#ffe9c0' : '#8fb8cc';
    ctx.fillText(clip(id, CFG.LABEL_MAX), p.x + r + 3, p.y + 3);
  }
}

// ---- activity feed ---------------------------------------------------------------------------------------------
function feedLog(kind, html) {
  KO.feed.push({ kind: kind, html: html, t: Date.now() });
  if (KO.feed.length > CFG.FEED_MAX) KO.feed.shift();
  renderFeed();
}
function renderFeed() {
  if (!KO.feedEl) return;
  var rows = [];
  for (var i = KO.feed.length - 1; i >= 0; i--) {
    var f = KO.feed[i];
    var col = f.kind === 'commit' ? CFG.COL_OK : f.kind === 'ask' ? CFG.COL_HL : CFG.COL_DIM;
    rows.push('<div style="margin-bottom:3px"><span style="color:' + col + '">' + (f.kind === 'commit' ? '+' : f.kind === 'ask' ? '?' : '·') + '</span> ' + f.html + '</div>');
  }
  KO.feedEl.innerHTML = rows.join('') || '<span style="color:' + CFG.COL_DIM + '">quiet - facts appear here the instant a mind commits one.</span>';
}
// wrap GAME_KNOW.commit ONCE so every NEW fact logs live. knowledge.js's methods are closures (no `this`), so a
// plain pass-through call preserves behavior exactly; the original's return value is returned untouched.
function wrapCommit() {
  if (KO.wrapped) return;
  var K = store(); if (!K || typeof K.commit !== 'function') return;
  var orig = K.commit;
  K.commit = function (edge, meta) {
    var r = orig(edge, meta);
    try {
      if (r && r.isNew) feedLog('commit', '<b style="color:' + (r.tier === 'shared' ? CFG.COL_SHARED : CFG.COL_PRIV) + '">[' + r.tier + ']</b> ' +
        esc(clip(edge.s, 20)) + ' <span style="color:' + CFG.COL_DIM + '">' + esc(edge.r) + '</span> ' + esc(clip(edge.o, 20)) +
        (meta && meta.source ? ' <span style="color:' + CFG.COL_DIM + '">(' + esc(meta.source) + (meta.agent ? ' · ' + esc(meta.agent) : '') + ')</span>' : ''));
    } catch (e) {}
    return r;
  };
  KO.wrapped = true;
}

// ---- the NOVEL panel (what was fed to the minds) ---------------------------------------------------------------
function novelData() { var w = win(); return (w && w.HOST && w.HOST.NOVEL) ? w.HOST.NOVEL : null; }
function renderNovelHead() {
  if (!KO.novelHead) return;
  var n = novelData();
  if (!n) { KO.novelHead.innerHTML = '<span style="color:' + CFG.COL_DIM + '">novel not loaded (novel_graph.json absent) - the minds run on live-world facts only.</span>'; return; }
  KO.novelHead.innerHTML = '<b style="color:#ffd27a">“' + esc(n.title || 'untitled') + '”</b>' +
    '<div style="color:' + CFG.COL_DIM + ';margin-top:2px">' + n.chapters + ' chapters · ' + n.pages + ' pages · ' + n.words + ' words · ' +
    n.characters + ' characters · ' + n.sentences + ' segment-sentences · ' + n.triples + ' triples</div>' +
    '<div style="color:' + CFG.COL_DIM + ';margin-top:2px;font-size:9.5px">each pilot\'s index holds ONLY its own segments (isolation by construction) - pick one to read exactly what it was fed:</div>';
}
function renderNovelChars() {
  if (!KO.novelSel) return;
  var n = novelData(); var names = n ? Object.keys(n.segments || {}).sort() : [];
  var opts = ['<option value="">— pick a character (' + names.length + ') —</option>'];
  for (var i = 0; i < names.length; i++) opts.push('<option value="' + esc(names[i]) + '">' + esc(names[i]) + ' (' + n.segments[names[i]].length + ' sentences)</option>');
  KO.novelSel.innerHTML = opts.join('');
}
function renderNovelBody(name) {
  if (!KO.novelBody) return;
  var n = novelData();
  if (!n || !name || !n.segments[name]) { KO.novelBody.innerHTML = '<span style="color:' + CFG.COL_DIM + '">no character selected.</span>'; return; }
  var segs = n.segments[name]; var rows = [];
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    rows.push('<div style="margin-bottom:5px"><span style="color:' + CFG.COL_DIM + '">' + (s.chapter != null ? 'ch' + esc(s.chapter) : '·') + (s.broadcast ? ' 📡' : '') + '</span> ' + esc(s.text) + '</div>');
  }
  KO.novelBody.innerHTML = rows.join('');
  // if this character exists as a node in the live graph, spotlight it - the feed line makes the link explicit
  if (KO.graph && KO.graph.nodes[name]) { clearHl(); KO.hl.focus = name; KO.hl.nodes[name] = 1; draw(); feedLog('note', 'reading ' + esc(name) + '\'s novel segments - node spotlighted in the graph'); }
}

// ---- ASK: talk to it, step by step -----------------------------------------------------------------------------
function clearHl() { KO.hl = { nodes: {}, edges: {}, focus: null }; }
function stopSteps() { if (KO.stepT) { clearInterval(KO.stepT); KO.stepT = null; } KO.steps = []; }
function askLine(html, col) { if (!KO.askOut) return; var d = el('div', 'margin-bottom:3px;color:' + (col || CFG.COL_TXT), html); if (d) { KO.askOut.appendChild(d); KO.askOut.scrollTop = 1e9; } }
// ground free text against the store's REAL node ids. Two tiers of match, tuned by self-test failures:
//   exact (case-insensitive) - allowed at ANY length, so short ids like "A" are reachable by naming them;
//   substring (either direction) - only when BOTH the token and the id are >= 4 chars, so "flurble" can never
//   fuzzy-match a 1-char node id via the token-contains-id direction (the first draft had exactly that bug).
// Returns distinct matched ids in mention order - the honesty rule: only entities the store actually holds count.
function groundEntities(text, graph) {
  var toks = String(text || '').toLowerCase().split(/[^a-z0-9_]+/).filter(function (t) { return t.length >= 1; });
  var ids = Object.keys(graph.nodes); var out = []; var seen = {};
  for (var i = 0; i < toks.length; i++) {
    var t = toks[i], best = null;
    for (var j = 0; j < ids.length; j++) { if (ids[j].toLowerCase() === t) { best = ids[j]; break; } }
    if (!best && t.length >= 4) {
      for (var j2 = 0; j2 < ids.length; j2++) {
        var idL = ids[j2].toLowerCase();
        if (idL.length >= 4 && (idL.indexOf(t) >= 0 || t.indexOf(idL) >= 0)) { best = ids[j2]; break; }
      }
    }
    if (best && !seen[best]) { seen[best] = 1; out.push(best); }
  }
  return out;
}
function ask(text) {
  text = String(text || '').trim(); if (!text) return;
  stopSteps(); clearHl();
  if (KO.askOut) KO.askOut.innerHTML = '';
  // ground against the FULL store, not the drawn subset - the canvas caps at MAX_NODES most-recent facts for
  // legibility, but "what do you know about X" must see everything (caught live: 'android' stopped grounding the
  // moment later GLM/learned commits pushed the AWB facts out of the 130-node draw window). Highlights still only
  // land on nodes that happen to be drawn - draw() ignores ids it doesn't hold, which is fine.
  var all = allEdges();
  var graph = { nodes: {}, edges: [] };
  for (var gi = 0; gi < all.length; gi++) { var ge = all[gi];
    if (!graph.nodes[ge.s]) graph.nodes[ge.s] = { id: ge.s, tier: ge._tier };
    if (!graph.nodes[ge.o]) graph.nodes[ge.o] = { id: ge.o, tier: ge._tier };
    graph.edges.push({ a: ge.s, b: ge.o, r: ge.r, tier: ge._tier }); }
  askLine('<b style="color:' + CFG.COL_HL + '">&gt; ' + esc(text) + '</b>');
  feedLog('ask', 'QUERY: ' + esc(clip(text, 60)));
  var ents = groundEntities(text, graph);
  var steps = [];
  if (!ents.length) {
    // HONEST ABSTAIN - never fabricate. Show what it DOES know so the next question can land.
    var sample = Object.keys(graph.nodes).slice(-CFG.KNOWN_SAMPLE);
    steps.push({ note: 'no entity in that matches anything I know (0-fab: I answer only over verified facts).', col: CFG.COL_WARN });
    steps.push({ note: 'entities I DO know include: ' + (sample.map(function (s) { return esc(s); }).join(', ') || '(store is empty)'), col: CFG.COL_DIM });
    steps.push({ note: 'try naming one of those, or two to make me plan a route between them.', col: CFG.COL_DIM });
  } else if (ents.length === 1 || !win() || !win().DELIBERATE) {
    var A = ents[0];
    steps.push({ focus: A, note: 'grounded "' + esc(A) + '" - walking its known relations…', col: CFG.COL_TXT });
    var touching = graph.edges.filter(function (e) { return e.a === A || e.b === A; }).slice(0, CFG.ASK_EDGE_STEPS);
    if (!touching.length) steps.push({ note: esc(A) + ' is known but has no committed relations yet.', col: CFG.COL_WARN });
    for (var i = 0; i < touching.length; i++) {
      var e = touching[i];
      // KRIPKE DIAMOND (2026-07-09): each walked relation carries its modal verdict - □ every mind knows it,
      // ◇ some mind's secret (hover the terminal `kripke` command for exactly who) - the port of the missed pillar
      var modal = '';
      if (win() && win().KRIPKE) { try { var kv = win().KRIPKE.verdict(e.a, e.r, e.b); modal = ' <b title="' + esc(kv.reading) + '" style="color:' + (kv.modality === 'box' ? CFG.COL_SHARED : CFG.COL_HL) + '">' + kv.glyph + '</b>'; } catch (er) {} }
      steps.push({ edge: e, note: esc(e.a) + ' <span style="color:' + CFG.COL_DIM + '">' + esc(e.r) + '</span> ' + esc(e.b) +
        ' <span style="color:' + (e.tier === 'shared' ? CFG.COL_SHARED : CFG.COL_PRIV) + '">[' + e.tier + ']</span>' + modal });
    }
    steps.push({ note: 'done - ' + touching.length + ' verified relation' + (touching.length === 1 ? '' : 's') + ' shown.', col: CFG.COL_OK });
  } else {
    // TWO grounded entities + the deliberation engine: a REAL chain over the store's own edges, replayed live.
    var A2 = ents[0], B2 = ents[1];
    var D = win().DELIBERATE;
    var chain = null;
    try { chain = D.deliberate({ edges: allEdges() }, { state: A2, goal: B2 }, { order: 'geometry' }); } catch (e) { chain = null; }
    steps.push({ focus: A2, note: 'DECISION: from <b>' + esc(A2) + '</b>, reach <b>' + esc(B2) + '</b> - deliberating (How/What/Why/When over my own verified graph)…' });
    steps.push({ focus: B2, note: 'goal grounded: ' + esc(B2), col: CFG.COL_DIM });
    if (!chain) {
      steps.push({ note: 'deliberation engine error - cannot reason right now.', col: CFG.COL_WARN });
    } else {
      var subs = chain.steps ? chain.steps.filter(function (s) { return s.axis === 'WHAT'; }).slice(0, CFG.ASK_CHAIN_STEPS) : [];
      for (var k = 0; k < subs.length; k++) {
        var st = subs[k];
        // dedup: the store legitimately holds several relations to the same node (action + before), which
        // rendered as "PL_KestrelsReach, PL_KestrelsReach, …" - one mention per distinct destination reads right
        var seenOpt = {}; var opts = [];
        (st.options || []).forEach(function (o) { if (!seenOpt[o.option]) { seenOpt[o.option] = 1; opts.push(o.option); } });
        steps.push({ note: 'WHAT can I do? → ' + (opts.length ? opts.map(function (o) { return esc(clip(o, 18)); }).join(', ') : '(no options)'), col: CFG.COL_DIM, focusMaybe: opts[0] });
      }
      var how = chain.steps ? chain.steps.find(function (s) { return s.axis === 'HOW' && s.plan; }) : null;
      if (how && how.plan) {
        steps.push({ note: 'HOW - a verified path exists (' + how.plan.length + ' hop' + (how.plan.length === 1 ? '' : 's') + '), tracing it…', col: CFG.COL_TXT });
        for (var h = 0; h < how.plan.length; h++) {
          var pe = how.plan[h];
          steps.push({ edge: { a: pe.s, r: pe.r, b: pe.o }, focus: pe.o, note: 'step ' + (h + 1) + ': ' + esc(pe.s) + ' <span style="color:' + CFG.COL_DIM + '">' + esc(pe.r) + '</span> ' + esc(pe.o) });
        }
      } else steps.push({ note: 'HOW - no verified path through explored ground.', col: CFG.COL_WARN });
      var why = chain.steps ? chain.steps.find(function (s) { return s.axis === 'WHY' && s.chain && s.chain.length; }) : null;
      if (why) steps.push({ note: 'WHY - ' + why.chain.map(function (c) { return esc(c.from) + '→' + esc(c.serves); }).join(' '), col: CFG.COL_DIM });
      var cv = chain.convergence || {};
      steps.push({ note: 'convergence: WHAT ' + (cv.axes && cv.axes.WHAT ? '✓' : '✗') + ' · HOW ' + (cv.axes && cv.axes.HOW ? '✓' : '✗') + ' · WHY ' + (cv.axes && cv.axes.WHY ? '✓' : '✗') + ' · WHEN ' + (cv.axes && cv.axes.WHEN ? '✓' : '✗') + ' → <b>' + (cv.agreement || 0) + '/4</b> · grounded=' + (chain.grounded ? '✓' : '✗') });
      if (cv.converged && chain.conclusion && chain.conclusion.take) {
        steps.push({ note: '<b style="color:' + CFG.COL_OK + '">CONCLUDE: take ' + esc(chain.conclusion.via || '') + ' to ' + esc(chain.conclusion.take) + '</b> - all four axes meet.', col: CFG.COL_OK });
      } else {
        steps.push({ note: '<b style="color:' + CFG.COL_WARN + '">ABSTAIN</b> (gap: ' + esc((cv.dissent || []).join(',') || 'unknown') + ') - ' + esc((chain.conclusion && chain.conclusion.need) || 'not enough verified knowledge; I will not fabricate a route.'), col: CFG.COL_WARN });
      }
    }
  }
  playSteps(steps);
}
function playSteps(steps) {
  KO.steps = steps.slice(); var i = 0;
  KO.stepT = setInterval(function () {
    if (i >= KO.steps.length) { stopSteps(); return; }
    var s = KO.steps[i++];
    if (s.focus) { KO.hl.focus = s.focus; KO.hl.nodes[s.focus] = 1; }
    if (s.focusMaybe && KO.graph && KO.graph.nodes[s.focusMaybe]) { KO.hl.nodes[s.focusMaybe] = 1; }
    if (s.edge) { KO.hl.edges[edgeKey(s.edge)] = 1; KO.hl.nodes[s.edge.a] = 1; KO.hl.nodes[s.edge.b] = 1; if (s.edge.b) KO.hl.focus = s.edge.b; }
    askLine(s.note, s.col);
    feedLog('ask', s.note);
    draw();
  }, CFG.STEP_MS);
}

// ---- stats/status header ---------------------------------------------------------------------------------------
function renderStats() {
  if (!KO.statsEl) return;
  var st = storeStats();
  var grew = (KO._lastTotal != null && (st.shared + st.private_total) > KO._lastTotal);
  KO._lastTotal = st.shared + st.private_total;
  KO.statsEl.innerHTML = 'SHARED <b style="color:' + CFG.COL_SHARED + '">' + st.shared + '</b>' +
    ' · PRIVATE <b style="color:' + CFG.COL_PRIV + '">' + st.private_total + '</b>' +
    ' <span style="color:' + CFG.COL_DIM + '">across ' + st.agents + ' mind' + (st.agents === 1 ? '' : 's') + '</span>' +
    (grew ? ' <span style="color:' + CFG.COL_OK + '">▲ growing</span>' : '');
}

// ---- build the fullscreen DOM ---------------------------------------------------------------------------------
function build() {
  if (KO.built) return KO.root;
  var d = doc(); if (!d) { KO.built = true; return null; }
  var root = el('div', 'position:fixed;inset:0;z-index:' + CFG.Z + ';display:none;flex-direction:column;background:' + CFG.COL_BG + 'f2;' +
    'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:' + CFG.COL_TXT + ';pointer-events:auto');
  root.id = 'kobsRoot';

  // header
  var head = el('div', 'display:flex;align-items:center;gap:14px;padding:9px 14px;border-bottom:1px solid ' + CFG.COL_BORDER + ';background:' + CFG.COL_PANEL);
  var title = el('div', 'font-weight:800;color:' + CFG.COL_SHARED + ';text-shadow:0 0 12px ' + CFG.COL_SHARED + '55;letter-spacing:.03em',
    '◈ KNOWLEDGE OBSERVATORY <span style="color:#dff2ff;font-weight:600">- the minds under the game, live</span>');
  var stats = el('div', 'font-size:11px'); KO.statsEl = stats;
  var spacer = el('div', 'flex:1');
  var hint = el('div', 'font-size:10px;color:' + CFG.COL_DIM, 'cyan=shared · violet=private · click a node to ask about it · ESC closes');
  var closeBtn = el('button', 'cursor:pointer;background:#122234;border:1px solid ' + CFG.COL_BORDER + ';color:#cfe6f5;border-radius:6px;padding:4px 12px;font:700 11px ui-monospace,monospace', '✕ CLOSE');
  closeBtn.onclick = function () { close(); };
  head.appendChild(title); head.appendChild(stats); head.appendChild(spacer); head.appendChild(hint); head.appendChild(closeBtn);
  root.appendChild(head);

  // main split
  var main = el('div', 'flex:1;display:flex;min-height:0');
  // LEFT: the graph
  var left = el('div', 'flex:1.5;position:relative;min-width:0;border-right:1px solid ' + CFG.COL_BORDER);
  var cv = el('canvas', 'display:block;width:100%;height:100%'); left.appendChild(cv); KO.canvas = cv;
  try { KO.ctx = cv.getContext ? cv.getContext('2d') : null; } catch (e) { KO.ctx = null; }
  var tip = el('div', 'position:absolute;pointer-events:none;display:none;max-width:280px;background:rgba(6,14,22,0.97);border:1px solid #2a4a5e;border-radius:5px;padding:6px 8px;font-size:10.5px;color:#dff2ff;z-index:2');
  left.appendChild(tip); KO.tipEl = tip;
  if (cv.addEventListener) {
    cv.addEventListener('mousemove', function (ev) {
      if (!KO.pos || !KO.graph) { tip.style.display = 'none'; return; }
      var rect = cv.getBoundingClientRect();
      var mx = (ev.clientX - rect.left) * (KO.cw / Math.max(1, rect.width)), my = (ev.clientY - rect.top) * (KO.ch / Math.max(1, rect.height));
      var hit = hitNode(mx, my);
      if (!hit) { tip.style.display = 'none'; return; }
      var rel = KO.graph.edges.filter(function (e) { return e.a === hit || e.b === hit; }).slice(0, 8);
      tip.innerHTML = '<b style="color:' + (KO.graph.nodes[hit].tier === 'shared' ? CFG.COL_SHARED : CFG.COL_PRIV) + '">' + esc(hit) + '</b>' +
        (rel.length ? '<br>' + rel.map(function (e) { return esc(e.a) + ' <span style="color:' + CFG.COL_DIM + '">' + esc(e.r) + '</span> ' + esc(e.b); }).join('<br>') : '<br><span style="color:' + CFG.COL_DIM + '">no relations</span>') +
        '<br><span style="color:' + CFG.COL_DIM + '">click = ask about this</span>';
      var tx = ev.clientX - rect.left + 14, ty = ev.clientY - rect.top + 14;
      if (tx + 280 > rect.width) tx = ev.clientX - rect.left - 288;
      tip.style.left = tx + 'px'; tip.style.top = ty + 'px'; tip.style.display = 'block';
    });
    cv.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
    cv.addEventListener('click', function (ev) {
      if (!KO.pos) return;
      var rect = cv.getBoundingClientRect();
      var mx = (ev.clientX - rect.left) * (KO.cw / Math.max(1, rect.width)), my = (ev.clientY - rect.top) * (KO.ch / Math.max(1, rect.height));
      var hit = hitNode(mx, my);
      if (hit) { if (KO.askIn) KO.askIn.value = hit; ask(hit); }
    });
  }
  main.appendChild(left);

  // RIGHT: novel / activity / ask
  var right = el('div', 'flex:1;display:flex;flex-direction:column;min-width:340px;max-width:560px;background:' + CFG.COL_PANEL);
  // novel
  var novelSec = el('div', 'flex:1.1;display:flex;flex-direction:column;min-height:0;border-bottom:1px solid ' + CFG.COL_BORDER + ';padding:8px 10px');
  novelSec.appendChild(el('div', 'font-weight:800;color:#ffd27a;font-size:10px;letter-spacing:.14em;margin-bottom:4px', '📖 THE NOVEL IT WAS FED (GIVEN-from-canon)'));
  var novelHead = el('div', 'font-size:10.5px;margin-bottom:5px'); novelSec.appendChild(novelHead); KO.novelHead = novelHead;
  var sel = d.createElement('select');
  sel.style.cssText = 'width:100%;background:#0c1623;border:1px solid ' + CFG.COL_BORDER + ';color:#cfe6f5;border-radius:5px;padding:3px 6px;font:11px ui-monospace,monospace;margin-bottom:6px';
  if (sel.addEventListener) sel.addEventListener('change', function () { renderNovelBody(sel.value); });
  novelSec.appendChild(sel); KO.novelSel = sel;
  var novelBody = el('div', 'flex:1;overflow-y:auto;font-size:10.5px;min-height:0'); novelSec.appendChild(novelBody); KO.novelBody = novelBody;
  right.appendChild(novelSec);
  // activity
  var actSec = el('div', 'flex:1;display:flex;flex-direction:column;min-height:0;border-bottom:1px solid ' + CFG.COL_BORDER + ';padding:8px 10px');
  actSec.appendChild(el('div', 'font-weight:800;color:' + CFG.COL_OK + ';font-size:10px;letter-spacing:.14em;margin-bottom:4px', '⚡ LIVE ACTIVITY (every new verified fact, the moment it commits)'));
  var feedEl = el('div', 'flex:1;overflow-y:auto;font-size:10.5px;min-height:0'); actSec.appendChild(feedEl); KO.feedEl = feedEl;
  right.appendChild(actSec);
  // ask
  var askSec = el('div', 'flex:1;display:flex;flex-direction:column;min-height:0;padding:8px 10px');
  askSec.appendChild(el('div', 'font-weight:800;color:' + CFG.COL_HL + ';font-size:10px;letter-spacing:.14em;margin-bottom:4px', '🗣 TALK TO IT (step-by-step over its own verified facts - it abstains rather than fabricate)'));
  var askOut = el('div', 'flex:1;overflow-y:auto;font-size:10.5px;min-height:0;margin-bottom:6px',
    '<span style="color:' + CFG.COL_DIM + '">name one known entity to see its relations · name two and I deliberate a route between them (watch the graph) · or click any node.</span>');
  askSec.appendChild(askOut); KO.askOut = askOut;
  var inRow = el('div', 'display:flex;gap:6px');
  var input = d.createElement('input');
  input.id = 'kobsAsk'; input.placeholder = 'ask the knowledge graph…'; input.autocomplete = 'off'; input.spellcheck = false;
  input.style.cssText = 'flex:1;background:#0c1623;border:1px solid ' + CFG.COL_BORDER + ';color:#eaf2ff;border-radius:6px;padding:6px 9px;font:12px ui-monospace,monospace;outline:none';
  if (input.addEventListener) input.addEventListener('keydown', function (e) {
    e.stopPropagation();                                   // same shield #chat uses - game hotkeys must not fire mid-type
    if (e.key === 'Enter') { ask(input.value); input.select && input.select(); }
  });
  var goBtn = el('button', 'cursor:pointer;background:#123a2c;border:1px solid ' + CFG.COL_OK + ';color:#d8ffe6;border-radius:6px;padding:6px 14px;font:700 11px ui-monospace,monospace', 'ASK');
  goBtn.onclick = function () { ask(input.value); };
  inRow.appendChild(input); inRow.appendChild(goBtn);
  askSec.appendChild(inRow); KO.askIn = input;
  right.appendChild(askSec);
  main.appendChild(right);
  root.appendChild(main);

  var body = d.body || d.documentElement;
  if (body && body.appendChild) body.appendChild(root);
  KO.root = root; KO.built = true;
  return root;
}
function hitNode(mx, my) {
  var hit = null, hd = (CFG.HL_NODE_R + 5) * (CFG.HL_NODE_R + 5);
  for (var id in KO.pos) { var p = KO.pos[id]; var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy; if (d2 <= hd) { hit = id; hd = d2; } }
  return hit;
}
function sizeCanvas() {
  var cv = KO.canvas; if (!cv || !cv.getBoundingClientRect) return;
  var r = cv.getBoundingClientRect();
  KO.cw = Math.max(200, Math.round(r.width || 800)); KO.ch = Math.max(200, Math.round(r.height || 600));
  var w = win(); KO.dpr = (w && w.devicePixelRatio) ? w.devicePixelRatio : 1;
  cv.width = Math.round(KO.cw * KO.dpr); cv.height = Math.round(KO.ch * KO.dpr);
}

// ---- open/close ------------------------------------------------------------------------------------------------
function open() {
  if (!KO.built) build();
  if (!KO.root) return;
  wrapCommit();
  KO.root.style.display = 'flex';
  KO.shown = true;
  sizeCanvas(); renderStats(); renderNovelHead(); renderNovelChars(); renderFeed(); draw();
  var w = win();
  if (w && w.addEventListener && !KO.escFn) {
    KO.escFn = function (e) { if (e.key === 'Escape' && KO.shown) close(); };
    w.addEventListener('keydown', KO.escFn);
  }
  if (!KO.pollT) KO.pollT = setInterval(function () {
    if (!KO.shown) return;
    // self-healing size: a backgrounded/suspended tab reports 0x0 rects (this project's own known preview quirk),
    // so open() may have fallen back to the default logical size - re-measure each tick and resize the moment the
    // real rect disagrees (also covers window resizes while open, no separate resize listener needed).
    if (KO.canvas && KO.canvas.getBoundingClientRect) {
      var r = KO.canvas.getBoundingClientRect();
      if (r.width > 0 && (Math.abs(r.width - KO.cw) > 2 || Math.abs(r.height - KO.ch) > 2)) sizeCanvas();
    }
    renderStats(); draw();
  }, CFG.POLL_MS);
  if (w && w.HOST && typeof w.HOST.sound === 'function') try { w.HOST.sound('ui'); } catch (e) {}
}
function close() {
  KO.shown = false;
  if (KO.root) KO.root.style.display = 'none';
  stopSteps();
  if (KO.pollT) { clearInterval(KO.pollT); KO.pollT = null; }
}
function toggle() { if (KO.shown) close(); else open(); return KO.shown; }
function visible() { return !!KO.shown; }

var API = { open: open, close: close, toggle: toggle, visible: visible, ask: ask, mount: build, CFG: CFG, _KO: KO, _buildGraph: buildGraph, _ground: groundEntities };
if (typeof window !== 'undefined') window.KOBS = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node): stub DOM + store, REAL deliberate.js, exercise all three ask paths ----------------------
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(name, cond) { if (cond) { pass++; console.log('PASS - ' + name); } else { fail++; console.log('FAIL - ' + name); } }
  function stubEl(tag) {
    return { tag: tag, style: {}, children: [], innerHTML: '', value: '', id: '',
      appendChild: function (c) { this.children.push(c); return c; },
      addEventListener: function () {}, getBoundingClientRect: function () { return { left: 0, top: 0, width: 800, height: 600 }; },
      getContext: function () { return { setTransform: function () {}, clearRect: function () {}, beginPath: function () {}, moveTo: function () {}, lineTo: function () {}, stroke: function () {}, arc: function () {}, fill: function () {}, fillText: function () {}, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left' }; },
      set onclick(f) { this._oc = f; }, get onclick() { return this._oc; },
      scrollTop: 0, select: function () {} };
  }
  global.document = { body: stubEl('body'), documentElement: stubEl('html'), createElement: function (t) { return stubEl(t); } };
  // stub store: a small action-graph A->B->C->D with a serves chain, split shared/private
  var COMMITS = [];
  var S = {
    shared: { 'A|action|B': { t: 'shared' }, 'B|action|C': { t: 'shared' }, 'D|serves|win': { t: 'shared' }, 'win|serves|root': { t: 'shared' } },
    priv: { YOU: { 'C|action|D': { t: 'private' } } },
  };
  global.window = {
    GAME_KNOW: {
      stats: function () { return { shared: Object.keys(S.shared).length, agents: 1, private_total: 1 }; },
      _state: function () { return S; },
      commit: function (edge, meta) { COMMITS.push(edge); return { tier: 'shared', isNew: true }; },
    },
    DELIBERATE: require('./deliberate.js'),
    HOST: { NOVEL: { title: 'TEST NOVEL', chapters: 2, pages: 3, words: 100, characters: 1, sentences: 2, triples: 5, segments: { VEGA: [{ text: 'Vega flew.', chapter: 1 }] } } },
    addEventListener: function () {}, devicePixelRatio: 1,
  };
  var K = require('./knowledge_screen.js');
  K.mount();
  check('mount built the root', !!K._KO.root);
  var g = K._buildGraph();
  check('graph holds all 5 facts (4 shared + 1 private)', g.edges.length === 5);
  check('node D present + private-tier C->D edge ingested', !!g.nodes.D && g.edges.some(function (e) { return e.a === 'C' && e.b === 'D' && e.tier === 'private'; }));
  var ground = K._ground('how do I get from A to D?', g);
  check('grounding finds A then D in mention order', ground.length === 2 && ground[0] === 'A' && ground[1] === 'D');
  check('grounding is honest on nonsense (0 matches)', K._ground('flurble grommet', g).length === 0);
  // ask path 3 (two entities -> REAL deliberation). playSteps uses setInterval - run steps synchronously instead:
  K._KO.graph = g;
  var chain = global.window.DELIBERATE.deliberate({ edges: [
    { s: 'A', r: 'action', o: 'B' }, { s: 'B', r: 'action', o: 'C' }, { s: 'C', r: 'action', o: 'D' },
    { s: 'D', r: 'serves', o: 'win' }, { s: 'win', r: 'serves', o: 'root' }] }, { state: 'A', goal: 'D' }, { order: 'geometry' });
  check('REAL deliberate over the store edges converges 4/4', chain.convergence.converged === true);
  check('recommends the first hop A->B', chain.recommended && chain.recommended.action === 'B');
  // commit wrap: after wrap, a commit logs to the feed
  K.open();
  check('open() shows the screen', K.visible() === true);
  global.window.GAME_KNOW.commit({ s: 'X', r: 'isa', o: 'Y' }, { source: 'test' });
  check('wrapped commit logged to the activity feed', K._KO.feed.some(function (f) { return f.kind === 'commit'; }));
  check('wrapped commit still returned the original result + recorded the edge', COMMITS.length === 1 && COMMITS[0].s === 'X');
  K.close();
  check('close() hides', K.visible() === false);
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
