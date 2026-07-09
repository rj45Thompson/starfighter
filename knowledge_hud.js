// knowledge_hud.js - THE AGI-TEST DEBUG HUD. Per the user (2026-07-07): "I want a hud just to debug the knowledge
// graph.. I want it to be apparent this is an AGI test not a game per se."
//
// This is a READ-ONLY overlay. It never mutates the sim; it snapshots the LIVE reasoning substrate every tick and
// draws it, so a viewer can SEE the AGI thinking under the space game - not play the game, but watch the mind.
// What it surfaces (each source is OPTIONAL - the HUD degrades gracefully to "pillar offline" when a global is
// absent, so it is safe to mount before any of them load):
//   window.GAME_KNOW - the persistent two-tier knowledge store (knowledge.js). GAME_KNOW.stats() gives the live
//                        counters {shared, agents, private_total}; GAME_KNOW._state() gives the raw
//                        {shared:{edgeKey:prov}, priv:{agent:{edgeKey:prov}}} we parse into the node-edge viz.
//   window.DELIBERATE - the deliberation engine (deliberate.js). Presence = the "deliberate" pillar is online.
//   window.THOUGHTS - the N5 fitness ledger (thoughts.js). THOUGHTS.fitness() gives per-mind reasoning fitness.
//   window.ACQUIRE - the multi-strategy acquisition cascade (acquire.js). Presence = the "acquire" pillar.
//   window.SEEK / DELIBERATE.seek - the goal-seek pillar (best-effort presence probe).
// An edgeKey is the store's currency: "s|r|o". We parse the most-recent ~20 SHARED facts (plus a few PRIVATE, drawn
// violet) into nodes+edges and lay them out radially (deterministic, no physics tick needed) so the graph reads as a
// growing web of facts, cyan=shared (all minds), violet=private (one mind's secret) - exactly the two-tier split the
// store enforces by provenance. Counters show SHARED growing / PRIVATE per-mind / which pillars are online, and a
// one-line "what the AGI is doing" status. Pure DOM + <canvas>, zero deps, lazy-init on first mount, ASCII only.
//
// PUBLIC API (attaches window.KHUD): { mount(parentEl?), update(), toggle(), visible() }.
//   mount(parentEl?) - build the panel once (idempotent) under parentEl (default document.body); returns the root el.
//   update() - re-snapshot the live globals and redraw. Wire this on a ~2/s timer (see wiring notes).
//   toggle() - show/hide the panel (starts HIDDEN). Returns the new visibility bool.
//   visible() - is the panel currently shown.
// SYNTAX-CLEAN under node: every browser-only ref (window/document/AudioContext/requestAnimationFrame) is guarded, so
// `require('./knowledge_hud.js')` loads without throwing. A self-test under require.main stubs a minimal DOM, mounts,
// updates against a stub store, and prints the API surface.
'use strict';
(function () {

// ---- CONFIG (every tunable is a named constant; no magic numbers buried in logic) ----------------------------
var CFG = {
  MAX_SHARED_FACTS: 20,      // most-recent shared facts drawn in the node-edge viz
  MAX_PRIV_FACTS: 6,         // a few private facts (violet) drawn alongside, to show the two-tier split
  MAX_NODES: 34,             // hard cap on nodes rendered (keeps the little canvas legible)
  CANVAS_W: 420,             // logical canvas width  (device-pixel-scaled at draw time) - BACKLOG 2026-07-08: "default larger", was 300
  CANVAS_H: 280,             // logical canvas height - was 190
  NODE_R: 4.5,               // node dot radius (px, logical)
  PANEL_W: 460,              // panel width (px) - was 330; now resizable too (see PANELS.register('khud',...))
  COL_SHARED: '#37e0ff',     // cyan - SHARED knowledge (every AGI holds it)
  COL_SHARED_DIM: '#1c6f80', // dim cyan for shared edges
  COL_PRIV: '#b98cff',       // violet - PRIVATE knowledge (one mind's secret)
  COL_PRIV_DIM: '#5b466f',   // dim violet for private edges
  COL_NODE_TXT: '#8fb8cc',   // node label colour
  COL_ONLINE: '#7fdc8a',     // pillar online (green)
  COL_OFFLINE: '#5a6b78',    // pillar offline (grey)
  COL_ACCENT: '#37e0ff',     // header accent
  COL_BG: 'rgba(6,12,20,0.94)',
  COL_BORDER: '#2b6d8a',
  Z: 11,                     // above the game HUD (z 5-9) and the reasoning side-panel (z 8)
  LABEL_MAX: 9,              // max chars of a node id shown as its label
};

// pillars we probe for + how to detect each on window (all optional)
var PILLARS = [
  { key: 'deliberate', glob: 'DELIBERATE', label: 'deliberate' },
  { key: 'seek',       glob: 'DELIBERATE', label: 'seek', sub: 'seek' }, // DELIBERATE.seek (or window.SEEK)
  { key: 'acquire',    glob: 'ACQUIRE',    label: 'acquire' },
  { key: 'knowledge',  glob: 'GAME_KNOW',  label: 'knowledge' },
];

// what-the-AGI-is-doing status lines, chosen by which pillars are live + whether the store is growing
var STATUS = {
  growing:  'ACQUIRING: cascade closed a gap -> verified fact committed (0-fab) -> store grew.',
  steady:   'DELIBERATING: chain-reasoning how/what/why/when over the live graph; store steady.',
  seeking:  'SEEKING: goal-decode active; deliberation looking for the next gap to close.',
  cold:     'IDLE: 0 facts yet - a random living mind runs its first deliberation shortly (or type deliberate <planet> to force one now).',
  nostore:  'BOOT: knowledge store not attached yet - pillars initializing.',
};

// ---- tiny DOM helpers (guarded; no-op-ish when document is absent) -------------------------------------------
function doc() { return (typeof document !== 'undefined') ? document : null; }
function win() { return (typeof window !== 'undefined') ? window : null; }
function el(tag, css, txt) {
  var d = doc(); if (!d) return null;
  var e = d.createElement(tag);
  if (css) e.style.cssText = css;
  if (txt != null) e.textContent = txt;
  return e;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ---- the singleton HUD ----------------------------------------------------------------------------------------
var H = {
  built: false, shown: false,
  root: null, canvas: null, ctx: null,
  counters: null, statusEl: null, pillarsEl: null, subEl: null,
  dpr: 1,
};

// read the live knowledge store defensively - returns null if not present / not a store
function readStore() {
  var w = win(); if (!w || !w.GAME_KNOW) return null;
  var K = w.GAME_KNOW;
  var stats = null, state = null;
  try { if (typeof K.stats === 'function') stats = K.stats(); } catch (e) {}
  try { if (typeof K._state === 'function') state = K._state(); } catch (e) {}
  if (!stats && !state) return null;
  return { stats: stats || { shared: 0, agents: 0, private_total: 0 }, state: state || { shared: {}, priv: {} } };
}

// probe pillars → [{label, on}]
function readPillars() {
  var w = win(); var out = [];
  for (var i = 0; i < PILLARS.length; i++) {
    var p = PILLARS[i]; var on = false;
    if (w) {
      var g = w[p.glob];
      if (g) {
        if (p.sub) on = (typeof g[p.sub] === 'function') || !!(w[p.label.toUpperCase()]);
        else on = true;
      } else if (p.sub && w[p.label.toUpperCase()]) on = true;
    }
    out.push({ label: p.label, on: on });
  }
  return out;
}

// read per-mind reasoning fitness (thoughts.js), best-effort → {top:[[name,fit]...], n} or null
function readFitness() {
  var w = win(); if (!w || !w.THOUGHTS || typeof w.THOUGHTS.fitness !== 'function') return null;
  var f = null; try { f = w.THOUGHTS.fitness(); } catch (e) { return null; }
  if (!f) return null;
  var top = Array.isArray(f.top) ? f.top : [];
  var n = f.pilots ? Object.keys(f.pilots).length : top.length;
  return { top: top.slice(0, 3), n: n };
}

// Build a node-edge graph from the store's most-recent facts. edgeKey = "s|r|o".
// Object key insertion order in modern JS reflects commit order, so "most recent" = the tail of Object.keys.
function buildGraph(state) {
  var nodes = {};   // id -> {id, tier}
  var edges = [];   // {a, b, r, tier}
  var order = 0;
  function addNode(id, tier) {
    if (!nodes[id]) nodes[id] = { id: id, tier: tier, ord: order++ };
    else if (tier === 'shared') nodes[id].tier = 'shared'; // shared wins the colour if a node is in both
  }
  function ingest(keys, tier, limit) {
    // take the LAST `limit` keys (most recently committed)
    var start = Math.max(0, keys.length - limit);
    for (var i = start; i < keys.length; i++) {
      var parts = keys[i].split('|');
      if (parts.length < 3) continue;
      var s = clip(parts[0], 24), o = clip(parts[2], 24), r = parts[1];
      addNode(s, tier); addNode(o, tier);
      edges.push({ a: s, b: o, r: r, tier: tier });
      if (Object.keys(nodes).length >= CFG.MAX_NODES) break;
    }
  }
  var sh = state && state.shared ? Object.keys(state.shared) : [];
  ingest(sh, 'shared', CFG.MAX_SHARED_FACTS);
  // private: merge a few from every agent, drawn violet
  var pv = state && state.priv ? state.priv : {};
  var privKeys = [];
  for (var ag in pv) { if (!pv.hasOwnProperty(ag)) continue; var ks = Object.keys(pv[ag]); for (var j = Math.max(0, ks.length - CFG.MAX_PRIV_FACTS); j < ks.length; j++) privKeys.push(ks[j]); }
  ingest(privKeys, 'private', CFG.MAX_PRIV_FACTS * 2);
  return { nodes: nodes, edges: edges };
}

// Deterministic RADIAL layout - no physics tick required, stable frame-to-frame for the same node set.
// Nodes are placed on concentric rings by insertion order; a light per-id hash jitters the angle so the web
// doesn't look like a clock. Coordinates are in logical canvas space.
function layout(graph, w, h) {
  var ids = Object.keys(graph.nodes);
  var cx = w / 2, cy = h / 2;
  var pos = {};
  var N = ids.length || 1;
  var maxR = Math.min(w, h) * 0.42;
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    // hash the id → stable angle offset
    var hstr = id, hh = 0;
    for (var k = 0; k < hstr.length; k++) { hh = (hh * 31 + hstr.charCodeAt(k)) & 0x7fffffff; }
    var jitter = ((hh % 1000) / 1000 - 0.5) * 0.6;   // +/- ~0.3 rad
    var ang = (i / N) * Math.PI * 2 + jitter;
    var ring = 0.35 + 0.65 * ((i % 3) / 2);            // 3 rings
    var rr = maxR * ring;
    pos[id] = { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
  }
  return pos;
}

function drawGraph() {
  var ctx = H.ctx; if (!ctx) return;
  var w = CFG.CANVAS_W, h = CFG.CANVAS_H;
  ctx.setTransform(H.dpr, 0, 0, H.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // faint substrate grid so an empty graph still reads as "a space where facts will appear"
  ctx.strokeStyle = 'rgba(55,224,255,0.05)'; ctx.lineWidth = 1;
  for (var gx = 0; gx <= w; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
  for (var gy = 0; gy <= h; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }

  var store = readStore();
  var state = store ? store.state : { shared: {}, priv: {} };
  var graph = buildGraph(state);
  var pos = layout(graph, w, h);
  H._lastPos = pos; H._lastGraph = graph;   // BACKLOG 2026-07-08: cached for the tooltip mousemove hit-test wired in build() - correctly empty {} when the graph is empty, no special-casing needed

  if (Object.keys(graph.nodes).length === 0) {
    ctx.fillStyle = '#4a6172'; ctx.font = '11px ui-monospace,Menlo,Consolas,monospace';
    ctx.textAlign = 'center';
    ctx.fillText('awaiting first verified fact…', w / 2, h / 2);
    ctx.textAlign = 'left';
    return;
  }
  // edges first
  for (var i = 0; i < graph.edges.length; i++) {
    var e = graph.edges[i]; var pa = pos[e.a], pb = pos[e.b]; if (!pa || !pb) continue;
    ctx.strokeStyle = (e.tier === 'shared') ? CFG.COL_SHARED_DIM : CFG.COL_PRIV_DIM;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }
  // nodes + labels
  ctx.font = '9px ui-monospace,Menlo,Consolas,monospace';
  for (var id in graph.nodes) {
    if (!graph.nodes.hasOwnProperty(id)) continue;
    var p = pos[id]; if (!p) continue;
    var tier = graph.nodes[id].tier;
    var col = (tier === 'shared') ? CFG.COL_SHARED : CFG.COL_PRIV;
    ctx.beginPath(); ctx.arc(p.x, p.y, CFG.NODE_R, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = CFG.COL_NODE_TXT;
    ctx.fillText(clip(id, CFG.LABEL_MAX), p.x + CFG.NODE_R + 2, p.y + 3);
  }
}

function statusLine(store, pillars, fit) {
  if (!store) return STATUS.nostore;
  var seekOn = false, acqOn = false;
  for (var i = 0; i < pillars.length; i++) { if (pillars[i].label === 'seek' && pillars[i].on) seekOn = true; if (pillars[i].label === 'acquire' && pillars[i].on) acqOn = true; }
  var total = store.stats.shared + store.stats.private_total;
  if (H._lastTotal != null && total > H._lastTotal) return STATUS.growing;
  if (total === 0) return STATUS.cold;   // BUGFIX: this was checked AFTER seekOn, so a genuinely-empty store (nothing has ever run yet) showed the misleading "SEEKING active" line instead of the honest "0 facts yet" one - seek/acquire presence just means the MODULE loaded, not that anything is happening
  if (seekOn) return STATUS.seeking;
  if (acqOn && total > 0) return STATUS.steady;
  return STATUS.steady;
}

function renderText() {
  var store = readStore();
  var pillars = readPillars();
  var fit = readFitness();

  // counters
  if (H.counters) {
    var st = store ? store.stats : { shared: 0, agents: 0, private_total: 0 };
    var grew = (H._lastTotal != null && (st.shared + st.private_total) > H._lastTotal);
    var arrow = grew ? ' <span style="color:' + CFG.COL_ONLINE + '">▲</span>' : '';
    var minds = '';
    if (fit && fit.top.length) {
      var bits = [];
      for (var i = 0; i < fit.top.length; i++) { bits.push(esc(clip(fit.top[i][0], 8)) + ':' + (Math.round(fit.top[i][1] * 10) / 10)); }
      minds = '<div style="margin-top:4px;color:#8fb8cc">minds(fitness): ' + bits.join('  ') + '</div>';
    }
    H.counters.innerHTML =
      '<div>SHARED facts: <b style="color:' + CFG.COL_SHARED + '">' + st.shared + '</b>' + arrow +
      '&nbsp;&nbsp;PRIVATE: <b style="color:' + CFG.COL_PRIV + '">' + st.private_total + '</b>' +
      ' <span style="opacity:.6">/ ' + st.agents + ' mind' + (st.agents === 1 ? '' : 's') + '</span></div>' + minds;
  }

  // pillars row
  if (H.pillarsEl) {
    var parts = [];
    for (var j = 0; j < pillars.length; j++) {
      var pp = pillars[j];
      var c = pp.on ? CFG.COL_ONLINE : CFG.COL_OFFLINE;
      var dot = pp.on ? '●' : '○';
      parts.push('<span style="color:' + c + '">' + dot + ' ' + esc(pp.label) + '</span>');
    }
    H.pillarsEl.innerHTML = '<span style="opacity:.55">pillars online:</span> ' + parts.join('&nbsp; ');
  }

  // status line
  if (H.statusEl) H.statusEl.textContent = statusLine(store, pillars, fit);

  // remember total for the growth arrow / status
  if (store) H._lastTotal = store.stats.shared + store.stats.private_total;
}

function build(parentEl) {
  if (H.built) return H.root;
  var d = doc(); if (!d) { H.built = true; return null; }   // node/no-DOM: mark built, nothing to show
  var parent = parentEl || (d.body || null);

  var root = el('div',
    'position:fixed;top:52px;right:12px;z-index:' + CFG.Z + ';width:' + CFG.PANEL_W + 'px;' +
    'background:' + CFG.COL_BG + ';border:1px solid ' + CFG.COL_BORDER + ';border-radius:10px;' +
    'padding:9px 10px 10px;font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#cfe6f5;' +
    'box-shadow:0 6px 26px #000a, 0 0 0 1px #0006 inset;pointer-events:auto;display:none;' +
    '-webkit-user-select:none;user-select:none');
  root.id = 'khud';

  // header
  var head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px');
  var title = el('div', 'font-weight:800;letter-spacing:.02em;color:' + CFG.COL_ACCENT + ';text-shadow:0 0 12px ' + CFG.COL_ACCENT + '66');
  title.innerHTML = '◈ AGI TEST - <span style="color:#dff2ff">reasoning substrate</span> ' +
    '<span style="color:' + CFG.COL_ONLINE + ';font-size:9px;letter-spacing:.14em">LIVE</span>';
  // KNOWLEDGE OBSERVATORY (user 2026-07-09): expand this small HUD into the fullscreen screen (knowledge_screen.js)
  var expandBtn = el('div',
    'cursor:pointer;color:#7fa6bd;font-weight:800;padding:0 4px;line-height:1;margin-left:auto;margin-right:2px', '⛶');
  expandBtn.title = 'FULLSCREEN observatory - big graph + the fed novel + live activity + talk to it (command: observatory)';
  expandBtn.onclick = function () { var w = win(); if (w && w.KOBS && typeof w.KOBS.open === 'function') w.KOBS.open(); };
  var closeBtn = el('div',
    'cursor:pointer;color:#7fa6bd;font-weight:800;padding:0 4px;line-height:1', '✕');
  closeBtn.title = 'hide (toggle: knowhud command / K key)';
  closeBtn.onclick = function () { hide(); };
  head.appendChild(title); head.appendChild(expandBtn); head.appendChild(closeBtn);
  root.appendChild(head);

  // sub-caption: makes the intent explicit - this is a probe, not a game panel
  var sub = el('div', 'font-size:9px;color:#6f93a8;margin-bottom:7px;letter-spacing:.02em');
  sub.innerHTML = 'watching the mind under the game · <span style="color:' + CFG.COL_SHARED + '">cyan=shared</span> ' +
    '<span style="color:' + CFG.COL_PRIV + '">violet=private</span> knowledge';
  root.appendChild(sub); H.subEl = sub;

  // canvas (node-edge graph)
  var cwrap = el('div', 'position:relative;border:1px solid #163243;border-radius:6px;overflow:hidden;background:#040a12;margin-bottom:7px');
  var cv = el('canvas', 'display:block;width:100%;height:' + CFG.CANVAS_H + 'px');
  H.dpr = (win() && win().devicePixelRatio) ? win().devicePixelRatio : 1;
  cv.width = Math.round(CFG.CANVAS_W * H.dpr);
  cv.height = Math.round(CFG.CANVAS_H * H.dpr);
  cwrap.appendChild(cv); root.appendChild(cwrap);
  H.canvas = cv;
  try { H.ctx = cv.getContext ? cv.getContext('2d') : null; } catch (e) { H.ctx = null; }

  // BACKLOG 2026-07-08 "add tooltips to knowledge graph HUD clickable elements": a positioned overlay div inside
  // cwrap (position:relative) - drawGraph() caches the latest node positions + edges in H._lastPos/H._lastGraph
  // every frame; a mousemove listener here hit-tests the cursor against those cached positions (no per-node DOM
  // elements needed - the graph itself stays canvas-drawn, only the tooltip is real DOM).
  var tip = el('div', 'position:absolute;pointer-events:none;z-index:2;display:none;max-width:240px;' +
    'background:rgba(6,14,22,0.96);border:1px solid #2a4a5e;border-radius:5px;padding:5px 7px;' +
    'font:10px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#dff2ff;box-shadow:0 4px 14px #000a');
  cwrap.appendChild(tip); H.tipEl = tip;
  cv.addEventListener('mousemove', function (ev) {
    if (!H._lastPos || !H._lastGraph) { tip.style.display = 'none'; return; }
    var rect = cv.getBoundingClientRect();
    var scaleX = CFG.CANVAS_W / rect.width, scaleY = CFG.CANVAS_H / rect.height;
    var mx = (ev.clientX - rect.left) * scaleX, my = (ev.clientY - rect.top) * scaleY;
    var hitId = null, hitDist = (CFG.NODE_R + 4) * (CFG.NODE_R + 4);
    for (var id in H._lastPos) { if (!H._lastPos.hasOwnProperty(id)) continue;
      var p = H._lastPos[id]; var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 <= hitDist) { hitId = id; hitDist = d2; } }
    if (!hitId) { tip.style.display = 'none'; return; }
    var edges = H._lastGraph.edges.filter(function (e) { return e.a === hitId || e.b === hitId; }).slice(0, 6);
    var node = H._lastGraph.nodes[hitId];
    var lines = edges.map(function (e) { return esc(e.a) + ' <span style="color:#6f93a8">' + esc(e.r) + '</span> ' + esc(e.b); });
    tip.innerHTML = '<b style="color:' + (node && node.tier === 'shared' ? CFG.COL_SHARED : CFG.COL_PRIV) + '">' + esc(hitId) + '</b>' +
      (lines.length ? '<br>' + lines.join('<br>') : '<br><span style="color:#6f93a8">no known relations</span>');
    var tipX = (mx / scaleX) + 12, tipY = (my / scaleY) + 12;
    if (tipX + 240 > rect.width) tipX = (mx / scaleX) - 240 - 4;   // flip left near the right edge
    tip.style.left = tipX + 'px'; tip.style.top = tipY + 'px'; tip.style.display = 'block';
  });
  cv.addEventListener('mouseleave', function () { tip.style.display = 'none'; });

  // counters block
  var counters = el('div', 'margin-bottom:5px');
  root.appendChild(counters); H.counters = counters;

  // pillars row
  var pillarsEl = el('div', 'font-size:10px;margin-bottom:5px');
  root.appendChild(pillarsEl); H.pillarsEl = pillarsEl;

  // status line ("what the AGI is doing")
  var statusWrap = el('div', 'font-size:9.5px;color:#a7cfe0;border-top:1px solid #163243;padding-top:5px;min-height:24px');
  var statusEl = el('div', 'color:#bfe3d0');
  statusWrap.appendChild(statusEl);
  root.appendChild(statusWrap); H.statusEl = statusEl;

  if (parent && parent.appendChild) parent.appendChild(root);
  H.root = root; H.built = true;
  return root;
}

// BUGFIX (user 2026-07-08: "i pinned the knowledge hud and couldn't unpin it... got stuck pinned at the top right"):
// this used to set display:none/'block' directly - a SEPARATE visibility channel from panels.js, which only ever
// moves a panel via `transform` (see panels.js's applyVisual). Once display:none landed here, panels.js's own
// pin/unpin/tab controls had nothing left to affect (a transform on a display:none element is invisible either way)
// - clicking unpin looked like it did nothing. Now this delegates to PANELS when it's registered ours, so there is
// ONE visibility owner; only falls back to raw display toggling standalone (Node self-test, or before registration).
function show() { if (!H.built) build(); if (win() && window.PANELS && typeof window.PANELS.open === 'function') { window.PANELS.open('khud'); } else if (H.root) { H.root.style.display = 'block'; } H.shown = true; update(); }
function hide() { if (win() && window.PANELS && typeof window.PANELS.close === 'function') { window.PANELS.close('khud'); } else if (H.root) { H.root.style.display = 'none'; } H.shown = false; }

// ---- public API ----------------------------------------------------------------------------------------------
function mount(parentEl) { return build(parentEl); }
function update() {
  if (!H.built) return;
  try { renderText(); } catch (e) {}
  try { if (H.shown) drawGraph(); } catch (e) {}   // only pay for the canvas draw while visible
}
function toggle() { if (!H.built) build(); if (H.shown) hide(); else show(); return H.shown; }
function visible() { return !!H.shown; }
function setShown(v) { H.shown = !!v; if (H.shown) try { update(); } catch (e) {} }   // sync point for PANELS' onOpenChange - keeps H.shown correct no matter what triggered the open/close (floating tab, this module's own button, a terminal command)

var API = { mount: mount, update: update, toggle: toggle, visible: visible, setShown: setShown, CFG: CFG, _H: H };

if (typeof window !== 'undefined') window.KHUD = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node) - stub a minimal DOM, mount, update against a stub store, print the API ----------------
if (typeof require !== 'undefined' && require.main === module) {
  // minimal DOM stub so build()/update() exercise their real paths without a browser
  function stubEl() {
    return {
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', title: '', id: '', width: 0, height: 0,
      appendChild: function (c) { this.children.push(c); return c; },
      addEventListener: function () {},   // BACKLOG 2026-07-08: the new tooltip mousemove/mouseleave listeners need this stubbed
      getBoundingClientRect: function () { return { left: 0, top: 0, width: CFG.CANVAS_W, height: CFG.CANVAS_H }; },
      getContext: function () {
        return {
          setTransform: function () {}, clearRect: function () {}, beginPath: function () {},
          moveTo: function () {}, lineTo: function () {}, stroke: function () {}, arc: function () {},
          fill: function () {}, fillText: function () {}, fillStyle: '', strokeStyle: '', lineWidth: 1,
          font: '', textAlign: 'left',
        };
      },
      set onclick(f) {}, get onclick() { return null; },
    };
  }
  global.document = { body: stubEl(), createElement: function () { return stubEl(); } };
  global.window = {
    devicePixelRatio: 2,
    // a stub two-tier store shaped exactly like knowledge.js's createStore() return
    GAME_KNOW: {
      stats: function () { return { shared: 3, agents: 1, private_total: 2 }; },
      _state: function () {
        return {
          shared: { 'YOU|serves|survival': {}, 'survival|serves|root': {}, 'ORION|isa|hostile': {} },
          priv: { YOU: { 'sector7|action|beacon': {}, 'beacon|action|gate': {} } },
        };
      },
    },
    DELIBERATE: { seek: function () {} },
    ACQUIRE: {},
    THOUGHTS: { fitness: function () { return { top: [['VEGA', 4.2], ['ORION', 1.5]], pilots: { VEGA: {}, ORION: {} } }; } },
  };

  var k = require('./knowledge_hud.js');
  var root = k.mount();
  console.log('mount() ->', root ? 'built root el' : 'null (no DOM)');
  console.log('visible() (pre-toggle) ->', k.visible());
  k.toggle();
  console.log('toggle() -> visible():', k.visible());
  k.update();   // exercises renderText + drawGraph against the stub store
  console.log('update() ran (snapshotted stub store: 3 shared / 2 private, 1 mind).');
  k.toggle();
  console.log('toggle() again -> visible():', k.visible());
  console.log('API:', Object.keys(k).filter(function (x) { return typeof k[x] === 'function'; }).join(', '));
  console.log('window.KHUD attached in browser; module.exports in node. OK.');
}

})();
