// starmap.js -- SR2-style 2D galaxy starmap + territory model + generation persistence (starfighter.html).
//
// THE ASK (user, verbatim intent): "when we lose a system we need to have more systems in a larger 2d
// starmap.. if destroyed you go back to your territory. if all territory is lost then the game ends BUT
// the knowledge graphs persist and get better across games. make the systems massive like Space Rangers 2
// Rise of the Dominators."
//
// WHAT THIS MODULE OWNS
//   1) A full-screen 2D galaxy map overlay (canvas). Systems are star nodes laid out from their planets'
//      average world x/z (scaled to fit), colored by OWNER (coalition/hegemon/contested). Planet dots
//      orbit each node (name + rep tint + Synod skull), nearest-2 jump lines link neighbors, the player's
//      current system pulses, and a header tallies territory ("COALITION 4/9 SYSTEMS - GENERATION 3").
//      Click a system -> HOST.runCmd('go <nearest planet of that system>') and the map closes.
//      Hover a system -> detail tooltip (planets, owner, contested).
//   2) The territory model: STARMAP.ownerOf(sys) and STARMAP.territory().
//   3) Retreat + game end (checked on a slow timer inside tick): STARMAP.safePlanet() = nearest coalition
//      world (for the host's "if destroyed you go back to your territory" respawn path). When
//      territory().coalition hits 0 (and total > 0) a ONE-SHOT game-over overlay ends the generation:
//      the knowledge store is NEVER touched (the minds persist across games by design); only the
//      SF_GENERATION counter (localStorage int) advances, then HOST.onNewGeneration() is invoked
//      (the host implements the actual galaxy reset).
//
// PUBLIC API (window.STARMAP):
//   init()           -- once, after window.HOST exists. Idempotent. Never throws.
//   tick(dt)         -- every frame; cheap. Slow work runs every CHECK_EVERY_S inside.
//   draw()           -- optional per-frame hook; repaints the map when open (throttled to REDRAW_MS).
//   open() / close() / toggle() / isOpen()
//   ownerOf(sys)     -- 'hegemon' | 'contested' | 'coalition'
//   territory()      -- {coalition, hegemon, contested, total}
//   safePlanet()     -- nearest coalition planet (rep > SAFE_REP_MIN, not hegemon) to HOST.P, or null
//   generation()     -- current generation int (localStorage key SF_GENERATION)
//
// Reads window.HOST only; every access is defensive (missing fields degrade silently, nothing throws).
// Plain JS, ASCII only, node --check clean. Exports exactly one global: window.STARMAP.
'use strict';
(function () {

// ---------------------------------------------------------------- CFG (every tunable named; no magic numbers in logic)
var CFG = {
  // layering + chrome
  Z_OVERLAY: 72,               // starmap overlay z-index (above the game HUD)
  Z_GAMEOVER: 84,              // game-over overlay z-index (above the map)
  HEADER_H: 56,                // px reserved at the top of the canvas for the header bar
  FOOTER_H: 40,                // px reserved at the bottom for the hint line
  MARGIN_PX: 46,               // inner padding around the fitted galaxy layout
  // cadence
  CHECK_EVERY_S: 2,            // territory / game-over / layout-signature check period (the "slow timer")
  LAYOUT_EVERY_S: 5,           // relayout period while open (planets drift little; cheap anyway)
  REDRAW_MS: 33,               // min ms between canvas repaints (~30 fps while open)
  DT_MAX_S: 0.25,              // clamp a single tick's dt (tab-switch spikes)
  // territory / retreat rules
  SAFE_REP_MIN: -4,            // a retreat world must have rep STRICTLY above this
  // generation persistence
  GEN_KEY: 'SF_GENERATION',    // localStorage int key -- the ONLY key this module ever writes
  GEN_DEFAULT: 1,              // first generation number
  // node + planet drawing
  NODE_R: 9,                   // star node radius (px)
  NODE_GLOW_R: 26,             // radial glow radius around a node (px)
  NODE_GLOW_A: 0.35,           // glow alpha at the core
  HIT_R: 30,                   // mouse hit radius around a node (px)
  ORBIT_R0: 24,                // first planet orbit radius (px)
  ORBIT_R_STEP: 10,            // extra radius per orbit band (px)
  ORBIT_BANDS: 3,              // planet dots cycle across this many orbit bands
  ORBIT_SPEED: 0.12,           // planet dot angular speed (rad/s) -- slow, decorative
  ORBIT_RING_A: 0.10,          // alpha of the faint orbit-band rings
  PLANET_DOT_R: 3,             // planet dot radius (px)
  PULSE_HZ: 1.1,               // "you are here" pulse frequency
  PULSE_RING_MAX: 26,          // px the expanding pulse ring travels
  PULSE_RING_A: 0.8,           // starting alpha of the pulse ring
  CONTEST_DASH: 4,             // dash length of the contested ring (px)
  CONTEST_RING_PAD: 5,         // contested/hover ring padding beyond NODE_R (px)
  NEIGHBORS: 2,                // jump lines: each system links to its N nearest neighbors
  LINK_W: 1,                   // jump line width (px)
  // fonts (px) -- family matches the game
  FONT: 'ui-monospace,Consolas,Menlo,monospace',
  FS_HEADER: 14, FS_NAME: 13, FS_PLANET: 10, FS_HINT: 12, FS_TIP: 12, FS_EMPTY: 16,
  FS_GO_TITLE: 26, FS_GO_BODY: 15, FS_GO_BTN: 15, FS_GO_SMALL: 12,
  // colors (game palette)
  COL_HEADER: '#8fd0ff',       // header / accent cyan
  COL_COALITION: '#7fd0b0',    // owner: coalition (green)
  COL_HEGEMON: '#ff8a8a',      // owner: hegemon (red)
  COL_CONTESTED: '#ffd27a',    // owner: contested (amber)
  COL_LAWLESS: '#ff8a4a',      // owner: lawless (orange) - user 2026-07-08 "pirate space not owned", matches the war/warmap terminal label color
  COL_VIOLET: '#c9a0ff',       // knowledge/minds accent
  COL_TEXT: '#c9d6e8',         // body text
  COL_DIM: '#6f8296',          // dim text
  COL_PANEL_BG: 'rgba(9,15,25,0.92)',
  COL_PANEL_BORDER: '#24344a',
  COL_MAP_BG: '#050910',       // canvas deep-space fill
  COL_LINK: 'rgba(90,130,180,0.30)',   // jump lines
  COL_ORBIT: 'rgba(120,150,190,1)',    // orbit-band ring stroke (alpha applied separately)
  COL_STAR_BG: 'rgba(200,220,255,0.35)', // background starfield dots
  COL_REP_NEU: '#9fb6cc',      // planet label: neutral rep
  COL_GO_SCRIM: 'rgba(4,7,13,0.88)',   // game-over backdrop
  REP_POS_MIN: 1,              // rep >= this tints a planet label green
  REP_NEG_MAX: -1,             // rep <= this tints a planet label red
  // background starfield (deterministic, seeded -- pure decoration)
  N_BG_STARS: 110,
  BG_STAR_SEED: 1337,
  BG_STAR_R_MAX: 1.4,          // px
  LCG_A: 1664525, LCG_C: 1013904223, INV_U32: 1 / 4294967296,   // LCG PRNG constants
  // tooltip
  TIP_OFF: 16,                 // px offset from the cursor
  TIP_W_MAX: 320,              // px
  TIP_PLANETS_MAX: 12,         // cap tooltip planet rows (massive systems stay readable)
  // misc
  DPR_MAX: 2,                  // devicePixelRatio cap
  SKULL: '\u2620',             // hegemon-held world marker (skull)
  DOT: '\u25CF',               // legend swatch glyph (filled circle)
  PULSE_GLYPH: '\u25CE',       // legend "you are here" glyph (bullseye)
  EMPTY_MSG: 'NO SYSTEMS CHARTED',
  WORLD_EPS: 0.001,            // min world span so a 1-system galaxy still fits
};
var TAU = Math.PI * 2;
var OWNER_COL = { coalition: CFG.COL_COALITION, hegemon: CFG.COL_HEGEMON, contested: CFG.COL_CONTESTED, lawless: CFG.COL_LAWLESS };

// ---------------------------------------------------------------- tiny guards / helpers
function W() { return (typeof window !== 'undefined') ? window : null; }
function DOC() { return (typeof document !== 'undefined') ? document : null; }
function H() { var w = W(); return (w && w.HOST) ? w.HOST : null; }
function nowMs() {
  try { if (typeof performance !== 'undefined' && performance.now) return performance.now(); } catch (e) {}
  return Date.now();
}
function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function posOf(o) { // defensive world position read -> {x,y,z} or null
  if (!o || !o.pos || typeof o.pos !== 'object') return null;
  var p = o.pos;
  if (typeof p.x !== 'number' || typeof p.z !== 'number') return null;
  return { x: p.x, y: num(p.y, 0), z: p.z };
}
function dist2XZ(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function dist2XYZ(a, b) { var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return dx * dx + dy * dy + dz * dz; }

// ---------------------------------------------------------------- generation counter (localStorage; knowledge store untouched)
function lsGetGen() {
  try {
    var w = W(); if (!w || !w.localStorage) return CFG.GEN_DEFAULT;
    var v = parseInt(w.localStorage.getItem(CFG.GEN_KEY), 10);
    return (isFinite(v) && v >= CFG.GEN_DEFAULT) ? v : CFG.GEN_DEFAULT;
  } catch (e) { return CFG.GEN_DEFAULT; }
}
function lsSetGen(v) {
  try { var w = W(); if (w && w.localStorage) w.localStorage.setItem(CFG.GEN_KEY, String(v)); } catch (e) {}
}

// ---------------------------------------------------------------- territory model
function ownerOf(sys) {
  if (!sys) return 'contested';
  if (sys.lawless) return 'lawless';   // user 2026-07-08 "pirate space not owned" - a permanent designation, distinct from the shifting war/contest state below
  var ps = (sys.planets && sys.planets.length) ? sys.planets : [];
  var nHeg = 0;
  for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].hegemon) nHeg++;
  if (ps.length > 0 && nHeg === ps.length) return 'hegemon';
  if (sys.contested || nHeg > 0) return 'contested';
  return 'coalition';
}
function territory() {
  var t = { coalition: 0, hegemon: 0, contested: 0, total: 0 };
  var h = H(); var arr = (h && h.systems && h.systems.length) ? h.systems : [];
  for (var i = 0; i < arr.length; i++) {
    var o = ownerOf(arr[i]); t[o] = (t[o] || 0) + 1; t.total++;
  }
  return t;
}
function safePlanet() {
  var h = H(); if (!h || !h.planets || !h.planets.length) return null;
  var pp = h.P ? posOf(h.P) : null;
  var best = null, bd = Infinity;
  for (var i = 0; i < h.planets.length; i++) {
    var p = h.planets[i]; if (!p || p.hegemon) continue;
    if (num(p.rep, 0) <= CFG.SAFE_REP_MIN) continue;
    var wp = posOf(p); if (!wp) continue;
    var d = pp ? dist2XYZ(pp, wp) : 0;
    if (d < bd) { bd = d; best = p; }
    if (!pp) break; // no player position: first qualifying world is as good as any
  }
  return best;
}

// ---------------------------------------------------------------- layout (world x/z -> canvas)
var nodes = [];   // [{sys, wx, wz, x, y}]
var links = [];   // [{a, b}] indices into nodes
var laySig = '';  // galaxy signature; changing it forces a relayout
var cssW = 0, cssH = 0;

function galaxySig() {
  var h = H(); if (!h) return 'none';
  var ns = (h.systems && h.systems.length) || 0, np = (h.planets && h.planets.length) || 0;
  return ns + ':' + np;
}
function centroidOf(sys, idx, count) {
  var ps = (sys && sys.planets) ? sys.planets : [], sx = 0, sz = 0, n = 0;
  for (var i = 0; i < ps.length; i++) { var wp = posOf(ps[i]); if (wp) { sx += wp.x; sz += wp.z; n++; } }
  if (n > 0) return { x: sx / n, z: sz / n };
  var c = sys ? posOf({ pos: sys.center }) : null;              // fallback: the sun position if the host has one
  if (c) return { x: c.x, z: c.z };
  var a = (count > 0 ? idx / count : 0) * TAU;                   // last resort: deterministic ring by index
  return { x: Math.cos(a), z: Math.sin(a) };
}
function rebuildLayout() {
  nodes = []; links = [];
  var h = H(); var arr = (h && h.systems && h.systems.length) ? h.systems : [];
  var i, j;
  for (i = 0; i < arr.length; i++) {
    if (!arr[i]) continue;
    var c = centroidOf(arr[i], i, arr.length);
    nodes.push({ sys: arr[i], wx: c.x, wz: c.z, x: 0, y: 0 });
  }
  if (!nodes.length) { laySig = galaxySig(); return; }
  var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (i = 0; i < nodes.length; i++) {
    minX = Math.min(minX, nodes[i].wx); maxX = Math.max(maxX, nodes[i].wx);
    minZ = Math.min(minZ, nodes[i].wz); maxZ = Math.max(maxZ, nodes[i].wz);
  }
  var spanX = Math.max(maxX - minX, CFG.WORLD_EPS), spanZ = Math.max(maxZ - minZ, CFG.WORLD_EPS);
  var rx = CFG.MARGIN_PX, ry = CFG.HEADER_H + CFG.MARGIN_PX;
  var rw = Math.max(1, cssW - CFG.MARGIN_PX * 2), rh = Math.max(1, cssH - CFG.HEADER_H - CFG.FOOTER_H - CFG.MARGIN_PX * 2);
  var s = Math.min(rw / spanX, rh / spanZ);
  var ox = rx + (rw - spanX * s) / 2, oy = ry + (rh - spanZ * s) / 2;
  for (i = 0; i < nodes.length; i++) {
    nodes[i].x = ox + (nodes[i].wx - minX) * s;
    nodes[i].y = oy + (nodes[i].wz - minZ) * s;
  }
  links = nearestNeighborLinks(nodes.map(function (nd) { return { x: nd.x, z: nd.y }; }), CFG.NEIGHBORS);
  laySig = galaxySig();
}
// nearest-N jump graph (deduped) - extracted so SR-M16's headless neighborsOf() below can compute the EXACT same
// topology without needing a canvas/open starmap UI at all. Works identically on canvas coords (px) or raw world
// coords (units) - a uniform affine transform (rebuildLayout's own scale+offset) preserves nearest-neighbor
// ranking, so the two call sites always agree on which systems are lane-connected.
function nearestNeighborLinks(pts, n) {
  var links = [], seen = {};
  for (var i = 0; i < pts.length; i++) {
    var ds = [];
    for (var j = 0; j < pts.length; j++) if (j !== i) ds.push({ j: j, d: dist2XZ(pts[i], pts[j]) });
    ds.sort(function (a, b) { return a.d - b.d; });
    var take = Math.min(n, ds.length);
    for (var k = 0; k < take; k++) {
      var a = Math.min(i, ds[k].j), b = Math.max(i, ds[k].j), key = a + '-' + b;
      if (!seen[key]) { seen[key] = 1; links.push({ a: a, b: b }); }
    }
  }
  return links;
}
// SR-M16 (REQUIREMENTS_SR.md "grow 3 -> 8+ systems... starmap shows lanes; war spreads along them"): the jump-lane
// graph already existed for DRAWING but was read nowhere else (confirmed via full-repo grep before writing this) -
// gameplay (jump-gating, war-spread) needs it even when the player has never opened the starmap UI, so this is a
// headless, world-space-only recomputation - independent of `nodes`/`links`/`cssW`/`cssH`, which only populate
// while `openFlag` is true (see tick() above). Cheap enough to recompute on every call at this system count (O(n^2)
// on ~9 systems) - no cache/invalidation complexity needed.
function neighborsOf(sysName) {
  var h = H(); var arr = (h && h.systems && h.systems.length) ? h.systems : [];
  var pts = [], sysIdx = -1;
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i]) continue;
    var c = centroidOf(arr[i], i, arr.length);
    if (arr[i].name === sysName) sysIdx = pts.length;
    pts.push({ x: c.x, z: c.z, sys: arr[i] });
  }
  if (sysIdx < 0) return [];
  var lk = nearestNeighborLinks(pts, CFG.NEIGHBORS);
  var out = [];
  for (var i = 0; i < lk.length; i++) {
    if (lk[i].a === sysIdx) out.push(pts[lk[i].b].sys.name);
    else if (lk[i].b === sysIdx) out.push(pts[lk[i].a].sys.name);
  }
  return out;
}
function playerNodeIndex() {
  var h = H(); var pp = (h && h.P) ? posOf(h.P) : null; if (!pp) return -1;
  var best = -1, bd = Infinity;
  for (var i = 0; i < nodes.length; i++) {
    var d = dist2XZ(pp, { x: nodes[i].wx, z: nodes[i].wz });
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function nearestPlanetOfSystem(sys) {
  var h = H(); if (!sys || !sys.planets || !sys.planets.length) return null;
  var pp = (h && h.P) ? posOf(h.P) : null;
  var best = null, bd = Infinity;
  for (var i = 0; i < sys.planets.length; i++) {
    var p = sys.planets[i]; if (!p || !p.name) continue;
    var wp = posOf(p); if (!wp) { if (!best) best = p; continue; }
    var d = pp ? dist2XYZ(pp, wp) : 0;
    if (d < bd) { bd = d; best = p; }
    if (!pp) break;
  }
  return best;
}

// ---------------------------------------------------------------- DOM (lazy; all inline-styled to match the game)
var openFlag = false, inited = false;
var rootEl = null, canvasEl = null, ctx = null, tipEl = null, tallyEl = null, goEl = null, goBodyEl = null, goBtnEl = null;
var hoverIdx = -1, mouseX = 0, mouseY = 0;
var bgStars = null;

function panelCss() {
  return 'background:' + CFG.COL_PANEL_BG + ';border:1px solid ' + CFG.COL_PANEL_BORDER + ';border-radius:5px;';
}
function ensureUI() {
  var d = DOC(); if (!d || rootEl) return !!rootEl;
  try {
    rootEl = d.createElement('div');
    rootEl.style.cssText = 'position:fixed;inset:0;z-index:' + CFG.Z_OVERLAY + ';display:none;pointer-events:auto;' +
      'background:' + CFG.COL_MAP_BG + ';font-family:' + CFG.FONT + ';user-select:none;';
    canvasEl = d.createElement('canvas');
    canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:default;';
    rootEl.appendChild(canvasEl);
    ctx = canvasEl.getContext('2d');

    // header bar: tally (left) + legend + close (right)
    var bar = d.createElement('div');
    bar.style.cssText = 'position:absolute;top:8px;left:12px;right:12px;height:' + (CFG.HEADER_H - 16) +
      'px;display:flex;align-items:center;justify-content:space-between;pointer-events:none;gap:12px;';
    tallyEl = d.createElement('div');
    tallyEl.style.cssText = panelCss() + 'padding:7px 12px;font-size:' + CFG.FS_HEADER + 'px;font-weight:bold;' +
      'letter-spacing:1px;color:' + CFG.COL_HEADER + ';white-space:nowrap;';
    tallyEl.textContent = 'GALAXY STARMAP';
    bar.appendChild(tallyEl);
    var right = d.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:10px;pointer-events:none;';
    var lg = d.createElement('div');
    lg.style.cssText = panelCss() + 'padding:7px 12px;font-size:' + CFG.FS_HINT + 'px;color:' + CFG.COL_TEXT + ';white-space:nowrap;';
    lg.innerHTML =
      '<span style="color:' + CFG.COL_COALITION + '">' + CFG.DOT + ' coalition</span>&nbsp;&nbsp;' +
      '<span style="color:' + CFG.COL_HEGEMON + '">' + CFG.DOT + ' hegemon</span>&nbsp;&nbsp;' +
      '<span style="color:' + CFG.COL_CONTESTED + '">' + CFG.DOT + ' contested</span>&nbsp;&nbsp;' +
      '<span style="color:' + CFG.COL_HEADER + '">' + CFG.PULSE_GLYPH + ' you</span>&nbsp;&nbsp;' +
      '<span style="color:' + CFG.COL_HEGEMON + '">' + CFG.SKULL + ' Synod world</span>';
    right.appendChild(lg);
    var close = d.createElement('button');
    close.textContent = 'X  close [Esc]';
    close.style.cssText = panelCss() + 'pointer-events:auto;cursor:pointer;padding:7px 12px;font-family:' + CFG.FONT +
      ';font-size:' + CFG.FS_HINT + 'px;font-weight:bold;color:' + CFG.COL_HEGEMON + ';';
    close.onclick = function () { api.close(); };
    right.appendChild(close);
    bar.appendChild(right);
    rootEl.appendChild(bar);

    // footer hint
    var foot = d.createElement('div');
    foot.style.cssText = 'position:absolute;left:0;right:0;bottom:10px;text-align:center;pointer-events:none;' +
      'font-size:' + CFG.FS_HINT + 'px;color:' + CFG.COL_DIM + ';';
    foot.textContent = 'click a system to set course - hover for detail - Esc to close';
    rootEl.appendChild(foot);

    // hover tooltip
    tipEl = d.createElement('div');
    tipEl.style.cssText = panelCss() + 'position:absolute;display:none;pointer-events:none;padding:8px 11px;' +
      'font-size:' + CFG.FS_TIP + 'px;line-height:1.45;color:' + CFG.COL_TEXT + ';max-width:' + CFG.TIP_W_MAX + 'px;z-index:2;';
    rootEl.appendChild(tipEl);

    canvasEl.addEventListener('mousemove', onMove);
    canvasEl.addEventListener('mouseleave', function () { hoverIdx = -1; if (tipEl) tipEl.style.display = 'none'; });
    canvasEl.addEventListener('click', onClick);
    d.body.appendChild(rootEl);
  } catch (e) { rootEl = null; canvasEl = null; ctx = null; return false; }
  return true;
}
function resizeCanvas() {
  var w = W(), d = DOC(); if (!w || !d || !canvasEl || !ctx) return;
  cssW = w.innerWidth || 1280; cssH = w.innerHeight || 760;
  var dpr = Math.min(num(w.devicePixelRatio, 1), CFG.DPR_MAX);
  canvasEl.width = Math.round(cssW * dpr); canvasEl.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgStars = null;                       // starfield is sized to the canvas; regenerate
  rebuildLayout();
}
function ensureBgStars() {
  if (bgStars) return bgStars;
  bgStars = [];
  var s = CFG.BG_STAR_SEED >>> 0;
  function rnd() { s = (Math.imul(s, CFG.LCG_A) + CFG.LCG_C) >>> 0; return s * CFG.INV_U32; }
  for (var i = 0; i < CFG.N_BG_STARS; i++) bgStars.push({ x: rnd() * cssW, y: rnd() * cssH, r: rnd() * CFG.BG_STAR_R_MAX });
  return bgStars;
}

// ---------------------------------------------------------------- interaction
function hitTest(mx, my) {
  var best = -1, bd = CFG.HIT_R * CFG.HIT_R;
  for (var i = 0; i < nodes.length; i++) {
    var dx = nodes[i].x - mx, dy = nodes[i].y - my, d = dx * dx + dy * dy;
    if (d <= bd) { bd = d; best = i; }
  }
  return best;
}
function onMove(e) {
  try {
    if (!canvasEl) return;
    var r = canvasEl.getBoundingClientRect();
    mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
    var idx = hitTest(mouseX, mouseY);
    if (idx !== hoverIdx) { hoverIdx = idx; updateTip(); }
    positionTip();
    canvasEl.style.cursor = (hoverIdx >= 0) ? 'pointer' : 'default';
  } catch (err) {}
}
function updateTip() {
  if (!tipEl) return;
  if (hoverIdx < 0 || !nodes[hoverIdx]) { tipEl.style.display = 'none'; return; }
  var sys = nodes[hoverIdx].sys, own = ownerOf(sys);
  var html = '<div style="color:' + CFG.COL_HEADER + ';font-weight:bold">' + esc(sys.name || 'system') +
    ' <span style="color:' + OWNER_COL[own] + '">[' + own.toUpperCase() + (sys.contested ? ' - CONTESTED' : '') + ']</span></div>';
  var ps = sys.planets || [];
  var n = Math.min(ps.length, CFG.TIP_PLANETS_MAX);
  for (var i = 0; i < n; i++) {
    var p = ps[i]; if (!p) continue;
    var rep = num(p.rep, 0);
    var col = p.hegemon ? CFG.COL_HEGEMON : (rep >= CFG.REP_POS_MIN ? CFG.COL_COALITION : (rep <= CFG.REP_NEG_MAX ? CFG.COL_HEGEMON : CFG.COL_REP_NEU));
    html += '<div style="color:' + col + '">' + (p.hegemon ? CFG.SKULL + ' ' : '') + esc(p.name || '?') +
      '<span style="color:' + CFG.COL_DIM + '"> - ' + esc((p.type && p.type.t) || '?') +
      ' Lv' + num(p.dev, 1) + ' rep ' + (rep > 0 ? '+' : '') + (Math.round(rep * 10) / 10) + '</span></div>';
  }
  if (ps.length > n) html += '<div style="color:' + CFG.COL_DIM + '">+' + (ps.length - n) + ' more worlds</div>';
  var h2 = H(), here = h2 ? currentSystemId(h2) : null;
  html += '<div style="color:' + CFG.COL_DIM + '">' + (here != null && sys.id === here
    ? 'click: set course to nearest world (in-system, free)'
    : 'click: HYPERJUMP here (costs fuel)') + '</div>';
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
}
function positionTip() {
  if (!tipEl || tipEl.style.display === 'none') return;
  var x = mouseX + CFG.TIP_OFF, y = mouseY + CFG.TIP_OFF;
  var tw = tipEl.offsetWidth || CFG.TIP_W_MAX, th = tipEl.offsetHeight || 0;
  if (x + tw > cssW - CFG.TIP_OFF) x = mouseX - tw - CFG.TIP_OFF;
  if (y + th > cssH - CFG.TIP_OFF) y = mouseY - th - CFG.TIP_OFF;
  tipEl.style.left = Math.max(0, x) + 'px'; tipEl.style.top = Math.max(0, y) + 'px';
}
function currentSystemId(h) {   // which system is the player physically in right now (nearest system center)
  var P = h.P, pos = P && posOf(P); if (!pos || !h.systems) return null;
  var best = null, bd = Infinity;
  for (var i = 0; i < h.systems.length; i++) {
    var c = posOf({ pos: h.systems[i].center }); if (!c) continue;
    var d = dist2XZ(pos, c); if (d < bd) { bd = d; best = h.systems[i].id; }
  }
  return best;
}
function onClick(e) {
  try {
    if (!canvasEl) return;
    var r = canvasEl.getBoundingClientRect();
    var idx = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (idx < 0 || !nodes[idx]) return;
    var sys = nodes[idx].sys;
    var p = nearestPlanetOfSystem(sys);
    var h = H();
    if (!p || !p.name || !h || typeof h.runCmd !== 'function') { api.close(); return; }
    // HYPERSPACE (user 2026-07-07): a click on your OWN system is a free in-system course; any OTHER system is a
    // fuel-gated hyperjump (starfighter.html's `jump` command owns the cost math + the actual teleport).
    var here = currentSystemId(h);
    if (here != null && sys && sys.id === here) h.runCmd('go ' + String(p.name).toLowerCase());
    else h.runCmd('jump ' + String(sys.name).toLowerCase());
    if (typeof h.sound === 'function') h.sound('ui');
    api.close();
  } catch (err) {}
}
function onKey(e) {
  try {
    if (!e || e.key !== 'Escape') return;
    if (goEl && goEl.style.display !== 'none') { goEl.style.display = 'none'; return; }  // dismiss (does NOT advance the generation)
    if (openFlag) api.close();
  } catch (err) {}
}

// ---------------------------------------------------------------- render
var lastPaint = 0;
function tallyText() {
  var t = terrCache;
  return 'COALITION ' + t.coalition + '/' + t.total + ' SYSTEMS - GENERATION ' + lsGetGen();
}
function refreshHeader() {
  if (!tallyEl) return;
  tallyEl.textContent = tallyText();
  var t = terrCache;
  tallyEl.style.color = (t.total > 0 && t.coalition === 0) ? CFG.COL_HEGEMON : (t.contested > 0 || t.hegemon > 0) ? CFG.COL_CONTESTED : CFG.COL_COALITION;
}
function paint() {
  if (!ctx || !openFlag) return;
  var t = nowMs() / 1000;
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = CFG.COL_MAP_BG; ctx.fillRect(0, 0, cssW, cssH);
  var i, j;
  // starfield
  var st = ensureBgStars();
  ctx.fillStyle = CFG.COL_STAR_BG;
  for (i = 0; i < st.length; i++) { ctx.beginPath(); ctx.arc(st[i].x, st[i].y, st[i].r, 0, TAU); ctx.fill(); }
  if (!nodes.length) {
    ctx.fillStyle = CFG.COL_DIM; ctx.font = CFG.FS_EMPTY + 'px ' + CFG.FONT; ctx.textAlign = 'center';
    ctx.fillText(CFG.EMPTY_MSG, cssW / 2, cssH / 2);
    return;
  }
  // jump lines
  ctx.strokeStyle = CFG.COL_LINK; ctx.lineWidth = CFG.LINK_W;
  for (i = 0; i < links.length; i++) {
    var A = nodes[links[i].a], B = nodes[links[i].b];
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  var pIdx = playerNodeIndex();
  for (i = 0; i < nodes.length; i++) {
    var nd = nodes[i], sys = nd.sys, own = ownerOf(sys), col = OWNER_COL[own];
    // glow
    var g = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, CFG.NODE_GLOW_R);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = CFG.NODE_GLOW_A; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(nd.x, nd.y, CFG.NODE_GLOW_R, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // orbit-band rings
    var ps = sys.planets || [];
    var bands = Math.min(CFG.ORBIT_BANDS, Math.max(1, ps.length));
    ctx.globalAlpha = CFG.ORBIT_RING_A; ctx.strokeStyle = CFG.COL_ORBIT; ctx.lineWidth = 1;
    for (j = 0; j < bands; j++) {
      ctx.beginPath(); ctx.arc(nd.x, nd.y, CFG.ORBIT_R0 + j * CFG.ORBIT_R_STEP, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // star node
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(nd.x, nd.y, CFG.NODE_R, 0, TAU); ctx.fill();
    // contested dashed ring
    if (own === 'contested') {
      ctx.setLineDash([CFG.CONTEST_DASH, CFG.CONTEST_DASH]);
      ctx.strokeStyle = CFG.COL_CONTESTED; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, CFG.NODE_R + CFG.CONTEST_RING_PAD, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // player pulse (expanding ring + halo)
    if (i === pIdx) {
      var ph = (t * CFG.PULSE_HZ) % 1;
      ctx.globalAlpha = (1 - ph) * CFG.PULSE_RING_A;
      ctx.strokeStyle = CFG.COL_HEADER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, CFG.NODE_R + ph * CFG.PULSE_RING_MAX, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // system name (owner-colored)
    ctx.font = 'bold ' + CFG.FS_NAME + 'px ' + CFG.FONT; ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(String(sys.name || '?'), nd.x, nd.y + CFG.ORBIT_R0 + CFG.ORBIT_BANDS * CFG.ORBIT_R_STEP + CFG.FS_NAME);
    // planet dots orbiting the node: name + rep tint + hegemon skull
    ctx.font = CFG.FS_PLANET + 'px ' + CFG.FONT; ctx.textAlign = 'left';
    for (j = 0; j < ps.length; j++) {
      var p = ps[j]; if (!p) continue;
      var band = j % CFG.ORBIT_BANDS;
      var orbR = CFG.ORBIT_R0 + band * CFG.ORBIT_R_STEP;
      var ang = (ps.length ? (j / ps.length) * TAU : 0) + t * CFG.ORBIT_SPEED + i;   // +i staggers systems
      var px = nd.x + Math.cos(ang) * orbR, py = nd.y + Math.sin(ang) * orbR;
      var rep = num(p.rep, 0);
      var pc = p.hegemon ? CFG.COL_HEGEMON : (rep >= CFG.REP_POS_MIN ? CFG.COL_COALITION : (rep <= CFG.REP_NEG_MAX ? CFG.COL_HEGEMON : CFG.COL_REP_NEU));
      ctx.fillStyle = pc;
      ctx.beginPath(); ctx.arc(px, py, CFG.PLANET_DOT_R, 0, TAU); ctx.fill();
      ctx.fillText((p.hegemon ? CFG.SKULL + ' ' : '') + String(p.name || ''), px + CFG.PLANET_DOT_R + 2, py + CFG.PLANET_DOT_R);
    }
    // hover ring
    if (i === hoverIdx) {
      ctx.strokeStyle = CFG.COL_HEADER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, CFG.NODE_R + CFG.CONTEST_RING_PAD + 2, 0, TAU); ctx.stroke();
    }
  }
}
function maybePaint() {
  var n = nowMs();
  if (n - lastPaint < CFG.REDRAW_MS) return;
  lastPaint = n;
  try { paint(); } catch (e) {}
}

// ---------------------------------------------------------------- game over / generations
var armed = true;               // one-shot latch; re-arms only after a check sees coalition territory again
var terrCache = { coalition: 0, hegemon: 0, contested: 0, total: 0 };

function knowCounts() {
  var shared = 0, priv = 0;
  try {
    var h = H();
    var st = (h && h.KNOW && typeof h.KNOW.stats === 'function') ? h.KNOW.stats() : null;
    if (st) { shared = num(st.shared, 0); priv = num(st.private_total, num(st.private, 0)); }
  } catch (e) {}
  return { shared: shared, priv: priv };
}
function ensureGameOverUI() {
  var d = DOC(); if (!d || goEl) return !!goEl;
  try {
    goEl = d.createElement('div');
    goEl.style.cssText = 'position:fixed;inset:0;z-index:' + CFG.Z_GAMEOVER + ';display:none;align-items:center;' +
      'justify-content:center;background:' + CFG.COL_GO_SCRIM + ';font-family:' + CFG.FONT + ';pointer-events:auto;';
    var panel = d.createElement('div');
    panel.style.cssText = panelCss() + 'border-radius:6px;padding:30px 40px;text-align:center;max-width:680px;margin:0 16px;';
    var title = d.createElement('div');
    title.style.cssText = 'font-size:' + CFG.FS_GO_TITLE + 'px;font-weight:bold;letter-spacing:3px;color:' + CFG.COL_HEGEMON + ';margin-bottom:14px;';
    title.textContent = 'THE COALITION HAS FALLEN';
    panel.appendChild(title);
    goBodyEl = d.createElement('div');
    goBodyEl.style.cssText = 'font-size:' + CFG.FS_GO_BODY + 'px;line-height:1.7;color:' + CFG.COL_TEXT + ';';
    panel.appendChild(goBodyEl);
    goBtnEl = d.createElement('button');
    goBtnEl.style.cssText = 'margin-top:20px;padding:11px 26px;cursor:pointer;font-family:' + CFG.FONT + ';font-size:' +
      CFG.FS_GO_BTN + 'px;font-weight:bold;letter-spacing:1px;color:' + CFG.COL_COALITION +
      ';background:rgba(127,208,176,0.10);border:1px solid ' + CFG.COL_COALITION + ';border-radius:5px;';
    goBtnEl.onclick = function () { beginNextGeneration(); };
    panel.appendChild(goBtnEl);
    var dis = d.createElement('div');
    var a = d.createElement('button');
    a.textContent = 'dismiss [Esc]';
    a.style.cssText = 'margin-top:12px;background:none;border:none;cursor:pointer;font-family:' + CFG.FONT +
      ';font-size:' + CFG.FS_GO_SMALL + 'px;color:' + CFG.COL_DIM + ';text-decoration:underline;';
    a.onclick = function () { if (goEl) goEl.style.display = 'none'; };
    dis.appendChild(a);
    panel.appendChild(dis);
    goEl.appendChild(panel);
    d.body.appendChild(goEl);
  } catch (e) { goEl = null; return false; }
  return true;
}
function fireGameOver() {
  armed = false;
  var g = lsGetGen(), k = knowCounts();
  if (ensureGameOverUI()) {
    goBodyEl.innerHTML =
      'Every free world is gone - generation <b>' + g + '</b> ends.<br>' +
      'The minds persist: <span style="color:' + CFG.COL_VIOLET + '"><b>' + k.shared + '</b> shared facts + <b>' +
      k.priv + '</b> private</span> survive into generation <b>' + (g + 1) + '</b>.';
    goBtnEl.textContent = 'BEGIN GENERATION ' + (g + 1);
    goEl.style.display = 'flex';
  }
  var h = H();
  try {
    if (h && typeof h.notify === 'function')
      h.notify('<b>THE COALITION HAS FALLEN</b> - generation ' + g + ' ends. The knowledge (' + k.shared + ' shared + ' + k.priv + ' private facts) persists.', 'alert');
    if (h && typeof h.sound === 'function') h.sound('alarm');
  } catch (e) {}
}
function beginNextGeneration() {
  var g = lsGetGen() + 1;
  lsSetGen(g);                                   // ONLY this key changes; the knowledge store persists by design
  var h = H();
  try { if (h && typeof h.onNewGeneration === 'function') h.onNewGeneration(); } catch (e) {}
  try {
    if (h && typeof h.notify === 'function') h.notify('<b>GENERATION ' + g + ' BEGINS</b> - the minds remember.', 'flag');
    if (h && typeof h.sound === 'function') h.sound('warp');
  } catch (e) {}
  if (goEl) goEl.style.display = 'none';
  laySig = '';                                   // force a relayout against the rebuilt galaxy
  terrCache = territory();
  refreshHeader();
}

// ---------------------------------------------------------------- lifecycle
var checkAcc = 0, layoutAcc = 0;

function slowCheck() {
  terrCache = territory();
  if (terrCache.coalition > 0) armed = true;                                  // territory regained -> re-arm the latch
  else if (armed && terrCache.total > 0 && terrCache.coalition === 0) fireGameOver();
  if (openFlag) {
    if (galaxySig() !== laySig) rebuildLayout();                              // galaxy grew/reset under us
    refreshHeader();
  }
}
var api = {
  init: function () {
    if (inited) return;
    inited = true;
    try {
      var w = W();
      if (w && w.addEventListener) {
        w.addEventListener('keydown', onKey);
        w.addEventListener('resize', function () { if (openFlag) { try { resizeCanvas(); } catch (e) {} } });
      }
    } catch (e) {}
  },
  tick: function (dt) {
    try {
      var d = Math.min(Math.max(num(dt, 0), 0), CFG.DT_MAX_S);
      checkAcc += d;
      if (checkAcc >= CFG.CHECK_EVERY_S) { checkAcc = 0; slowCheck(); }       // slow work only on the timer
      if (openFlag) {
        layoutAcc += d;
        if (layoutAcc >= CFG.LAYOUT_EVERY_S) { layoutAcc = 0; rebuildLayout(); }
        maybePaint();
      }
    } catch (e) {}
  },
  draw: function () { try { if (openFlag) maybePaint(); } catch (e) {} },
  open: function () {
    try {
      if (!ensureUI()) return;
      openFlag = true;
      rootEl.style.display = 'block';
      resizeCanvas();
      terrCache = territory();
      refreshHeader();
      lastPaint = 0; maybePaint();
      var h = H(); if (h && typeof h.sound === 'function') h.sound('ui');
    } catch (e) {}
  },
  close: function () {
    try {
      openFlag = false; hoverIdx = -1;
      if (rootEl) rootEl.style.display = 'none';
      if (tipEl) tipEl.style.display = 'none';
    } catch (e) {}
  },
  toggle: function () { if (openFlag) api.close(); else api.open(); },
  isOpen: function () { return openFlag; },
  ownerOf: ownerOf,
  territory: territory,
  safePlanet: safePlanet,
  neighborsOf: neighborsOf,   // SR-M16: jump-lane graph, headless (works whether or not the starmap UI has ever been opened)
  generation: lsGetGen,
};

if (W()) W().STARMAP = api;
else if (typeof module !== 'undefined' && module.exports) module.exports = api;   // node --check / require smoke-load

})();
