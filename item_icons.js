// item_icons.js - PROCEDURAL PER-ITEM ICONS (user 2026-07-09: "can we get icons, somewhat unique for each item
// and I want to slot them in like diablo"). No sprite sheet to draw, ship, or drift out of sync: every icon is
// GENERATED deterministically from (kind, key) + the item's own REAL data, so all ~130 catalog items get a
// distinct face automatically, and any item added later gets one for free.
//
// Honesty rules (same ethos as everything else here):
//   - REAL stats drive REAL features: a weapon icon's glow is the weapon's actual projectile color (WEAPONS[k].col),
//     its silhouette follows its actual dmgType; the Diablo-style quality frame (gray/blue/gold/orange) is the
//     item's cost PERCENTILE within its own catalog - read off the data, never hand-assigned.
//   - Seeded noise is DECORATION ONLY (fin counts, facet counts, band positions) - it never claims a stat.
//   - Deterministic: same (kind,key) -> the same icon forever, across reloads and machines.
//
// PUBLIC API (window.ICONS): { dataURL(kind,key,item,table,size), img(kind,key,item,table,opts),
//   qualityOf(item,table), draw(ctx,kind,key,item,table,size), KIND_ALIAS, QUALITY, clearCache }.
'use strict';
(function () {

var CFG = {
  BASE: 64,                 // design-space units; draw() scales to any pixel size
  DPR: 2,                   // supersample factor for crisp dataURLs
  Q_CUTS: [0.35, 0.7, 0.9], // cost-percentile cuts -> common / magic / rare / legendary
  FRAME_R: 9,               // quality frame corner radius (design units)
  CACHE_MAX: 512,
};
var QUALITY = [
  { name: 'common',    col: '#7e8b99' },
  { name: 'magic',     col: '#5aa0ff' },
  { name: 'rare',      col: '#ffd24a' },
  { name: 'legendary', col: '#ff8a3d' },
];
var KIND_ALIAS = { primaryweapon: 'weapon', hardpoint: 'weapon', blackmarket: 'contraband', fence: 'contraband', bm: 'contraband' };
var METAL = '#9fb4c8', DARK = '#0e1a2a', DIM = '#44586e';

function hash32(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }
function rngOf(seed) { var t = seed >>> 0; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function hsl(h, s, l) { return 'hsl(' + Math.round(h) + ',' + Math.round(s) + '%,' + Math.round(l) + '%)'; }
function cssCol(n) { var s = (n >>> 0).toString(16); while (s.length < 6) s = '0' + s; return '#' + s; }

function qualityOf(item, table) {
  var cost = (item && item.cost) || 0;
  if (!cost || !table) return QUALITY[0];
  var costs = [], k;
  for (k in table) costs.push((table[k] && table[k].cost) || 0);
  costs.sort(function (a, b) { return a - b; });
  var below = 0, i; for (i = 0; i < costs.length; i++) if (costs[i] < cost) below++;
  var pct = costs.length > 1 ? below / (costs.length - 1) : 0;
  if (pct < CFG.Q_CUTS[0]) return QUALITY[0];
  if (pct < CFG.Q_CUTS[1]) return QUALITY[1];
  if (pct < CFG.Q_CUTS[2]) return QUALITY[2];
  return QUALITY[3];
}

// ------------------------------------------------------------------ tiny draw prims (design space 0..64)
function P(ctx, pts, close) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close !== false) ctx.closePath(); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
function C(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function glow(ctx, col, blur) { ctx.shadowColor = col; ctx.shadowBlur = blur; }
function unglow(ctx) { ctx.shadowBlur = 0; }

// ------------------------------------------------------------------ category renderers
// Each gets (ctx, rng, item, accent). Draw inside ~8..56 box; frame is added by draw().
var R = {};
R.weapon = function (ctx, rng, item, accent) {
  var barrels = (item && item.dmgType === 'missile') ? 1 : 1 + Math.floor(rng() * 3);   // missiles: one big tube
  var y0 = 32 - (barrels - 1) * 4;
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 12, 24, 20, 16, 3); ctx.fill(); ctx.stroke();                                  // receiver body
  for (var b = 0; b < barrels; b++) {
    var y = y0 + b * 8;
    ctx.strokeStyle = METAL; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(50, y); ctx.stroke();
    glow(ctx, accent, 7); ctx.fillStyle = accent; C(ctx, 52, y, 2.6 + rng() * 1.2); ctx.fill(); unglow(ctx);
  }
  if (item && item.dmgType === 'missile') {                                              // fins on the tube
    ctx.fillStyle = METAL; P(ctx, [[30, 28], [26, 24], [30, 32]]); ctx.fill(); P(ctx, [[30, 36], [26, 40], [30, 32]]); ctx.fill();
  }
  ctx.strokeStyle = DIM; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(14 + rng() * 4, 40); ctx.lineTo(12 + rng() * 4, 48); ctx.stroke();   // grip
};
R.engine = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  P(ctx, [[24, 12], [40, 12], [46, 34], [18, 34]]); ctx.fill(); ctx.stroke();            // bell
  ctx.strokeStyle = DIM; ctx.lineWidth = 1.6;
  var rings = 1 + Math.floor(rng() * 3);
  for (var i = 0; i < rings; i++) { var t = 16 + i * 6; ctx.beginPath(); ctx.moveTo(23 - i * 1.4, t); ctx.lineTo(41 + i * 1.4, t); ctx.stroke(); }
  var flame = 8 + rng() * 12;                                                            // exhaust length: decoration
  glow(ctx, accent, 9); ctx.fillStyle = accent;
  P(ctx, [[22, 36], [42, 36], [32, 36 + flame]]); ctx.fill(); unglow(ctx);
};
R.tank = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 20, 14, 24, 38, 9); ctx.fill(); ctx.stroke();
  var bands = 1 + Math.floor(rng() * 3);
  ctx.strokeStyle = accent; ctx.lineWidth = 2;
  for (var i = 0; i < bands; i++) { var y = 22 + rng() * 24; ctx.beginPath(); ctx.moveTo(21, y); ctx.lineTo(43, y); ctx.stroke(); }
  ctx.strokeStyle = METAL; ctx.lineWidth = 2; C(ctx, 32, 12, 3.5); ctx.stroke();          // valve
};
R.radar = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(32, 52); ctx.lineTo(32, 34); ctx.stroke();                  // mast
  ctx.beginPath(); ctx.moveTo(22, 52); ctx.lineTo(42, 52); ctx.stroke();
  var tilt = -0.5 - rng() * 0.6;
  ctx.save(); ctx.translate(32, 32); ctx.rotate(tilt);
  ctx.fillStyle = DARK; ctx.strokeStyle = METAL;
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  var waves = 2 + Math.floor(rng() * 2);
  ctx.strokeStyle = accent; ctx.lineWidth = 1.8; glow(ctx, accent, 5);
  for (var i = 0; i < waves; i++) { ctx.beginPath(); ctx.arc(40, 20, 5 + i * 5, -0.9, 0.6); ctx.stroke(); }
  unglow(ctx);
};
R.scanner = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.6; ctx.fillStyle = DARK;
  C(ctx, 32, 32, 17); ctx.fill(); ctx.stroke();
  var blades = 4 + Math.floor(rng() * 4);
  ctx.strokeStyle = DIM; ctx.lineWidth = 2;
  for (var i = 0; i < blades; i++) { var a = (i / blades) * Math.PI * 2 + rng() * 0.2;
    ctx.beginPath(); ctx.moveTo(32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); ctx.lineTo(32 + Math.cos(a) * 15.5, 32 + Math.sin(a) * 15.5); ctx.stroke(); }
  glow(ctx, accent, 8); ctx.fillStyle = accent; C(ctx, 32, 32, 4.5); ctx.fill(); unglow(ctx);
};
R.shieldgen = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 22, 38, 20, 12, 3); ctx.fill(); ctx.stroke();                                   // emitter base
  ctx.beginPath(); ctx.moveTo(27, 38); ctx.lineTo(27, 30); ctx.moveTo(37, 38); ctx.lineTo(37, 30); ctx.stroke();
  var arcs = 1 + Math.floor(rng() * 3);
  ctx.strokeStyle = accent; ctx.lineWidth = 2.2; glow(ctx, accent, 7);
  for (var i = 0; i < arcs; i++) { ctx.beginPath(); ctx.arc(32, 34, 12 + i * 5, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }
  unglow(ctx);
};
R.droid = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 20, 28, 24, 20, 5); ctx.fill(); ctx.stroke();                                   // torso
  ctx.beginPath(); ctx.arc(32, 26, 9, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();  // dome
  glow(ctx, accent, 6); ctx.fillStyle = accent; C(ctx, 28 + rng() * 8, 23, 2.4); ctx.fill(); unglow(ctx);  // eye
  ctx.strokeStyle = DIM; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(32, 17); ctx.lineTo(32 + (rng() * 10 - 5), 10); ctx.stroke();     // antenna
  ctx.beginPath(); ctx.moveTo(20, 34); ctx.lineTo(12, 30 + rng() * 10); ctx.stroke();           // arm
};
R.hook = function (ctx, rng, item, accent) {
  ctx.strokeStyle = DIM; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(32, 8); ctx.lineTo(30 + rng() * 4, 20); ctx.lineTo(32, 30); ctx.stroke();   // cable
  var prongs = 2 + Math.floor(rng() * 2);
  ctx.strokeStyle = METAL; ctx.lineWidth = 3;
  for (var i = 0; i < prongs; i++) { var sgn = i % 2 ? 1 : -1, sp = 6 + i * 3;
    ctx.beginPath(); ctx.arc(32 + sgn * sp, 40, 9, Math.PI * 1.5, sgn > 0 ? Math.PI * 0.4 : Math.PI * 2.6, sgn < 0); ctx.stroke(); }
  glow(ctx, accent, 6); ctx.fillStyle = accent; C(ctx, 32, 32, 3); ctx.fill(); unglow(ctx);   // magnet core
};
R.series = function (ctx, rng, item, accent) {
  var teeth = 6 + Math.floor(rng() * 5);
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  ctx.beginPath();
  for (var i = 0; i < teeth * 2; i++) { var a = (i / (teeth * 2)) * Math.PI * 2; var r = i % 2 ? 17 : 12.5;
    var x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  glow(ctx, accent, 5); ctx.strokeStyle = accent; ctx.lineWidth = 2.2; C(ctx, 32, 32, 5.5); ctx.stroke(); unglow(ctx);
};
R.gizmo = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 18, 20, 28, 24, 3); ctx.fill(); ctx.stroke();
  var pins = 3 + Math.floor(rng() * 3);
  ctx.strokeStyle = DIM; ctx.lineWidth = 2;
  for (var i = 0; i < pins; i++) { var x = 22 + i * (20 / (pins - 1 || 1));
    ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 44); ctx.lineTo(x, 50); ctx.stroke(); }
  glow(ctx, accent, 6); ctx.fillStyle = accent;
  rr(ctx, 26 + rng() * 4, 26 + rng() * 4, 8, 8, 1.5); ctx.fill(); unglow(ctx);            // die
};
R.micromodule = function (ctx, rng, item, accent) {                                       // the Diablo gem
  var sides = 5 + Math.floor(rng() * 3), rot = rng() * Math.PI;
  ctx.fillStyle = DARK; ctx.strokeStyle = accent; ctx.lineWidth = 2.4; glow(ctx, accent, 9);
  ctx.beginPath();
  for (var i = 0; i < sides; i++) { var a = rot + (i / sides) * Math.PI * 2;
    var x = 32 + Math.cos(a) * 15, y = 32 + Math.sin(a) * 15; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.stroke(); unglow(ctx);
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4;
  for (var j = 0; j < sides; j++) { var a2 = rot + (j / sides) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32 + Math.cos(a2) * 15, 32 + Math.sin(a2) * 15); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff'; C(ctx, 27 + rng() * 4, 26 + rng() * 3, 1.6); ctx.fill();     // sparkle
};
R.hull = function (ctx, rng, item, accent) {
  var role = (item && item.role) || 'fighter';
  var pts;
  if (/freight|trade|hauler/i.test(role))      pts = [[32, 10], [46, 20], [46, 48], [32, 54], [18, 48], [18, 20]];
  else if (/cruis|capital|heavy/i.test(role))  pts = [[32, 6], [40, 18], [40, 46], [46, 54], [18, 54], [24, 46], [24, 18]];
  else if (/scout|recon|fast/i.test(role))     pts = [[32, 6], [38, 30], [34, 52], [30, 52], [26, 30]];
  else                                         pts = [[32, 8], [44, 34], [40, 52], [24, 52], [20, 34]];
  ctx.fillStyle = DARK; ctx.strokeStyle = METAL; ctx.lineWidth = 2.4;
  P(ctx, pts); ctx.fill(); ctx.stroke();
  var fins = Math.floor(rng() * 3);                                                       // decoration only
  ctx.strokeStyle = DIM; ctx.lineWidth = 2;
  for (var i = 0; i < fins; i++) { var y = 30 + i * 8 + rng() * 4;
    ctx.beginPath(); ctx.moveTo(20 - i, y); ctx.lineTo(12 - i * 2, y + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44 + i, y); ctx.lineTo(52 + i * 2, y + 6); ctx.stroke(); }
  glow(ctx, accent, 6); ctx.fillStyle = accent; C(ctx, 32, 20 + rng() * 6, 2.6); ctx.fill(); unglow(ctx);  // cockpit
};
R.artifact = function (ctx, rng, item, accent) {
  ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.fillStyle = DARK; glow(ctx, accent, 8);
  ctx.beginPath();
  for (var i = 0; i < 8; i++) { var a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    var x = 32 + Math.cos(a) * 16, y = 32 + Math.sin(a) * 16; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.stroke(); unglow(ctx);
  var steps = 3 + Math.floor(rng() * 3);                                                  // rune walk: seeded path
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, 38);
  var x2 = 26, y2 = 38;
  for (var s = 0; s < steps; s++) { x2 += 4 + rng() * 6; y2 -= (rng() * 14 - 5); ctx.lineTo(x2, y2); }
  ctx.stroke();
  ctx.fillStyle = accent; C(ctx, 32 + (rng() * 12 - 6), 22, 1.8); ctx.fill();
};
R.contraband = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 16, 20, 32, 28, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
  var stripes = 2 + Math.floor(rng() * 2);
  for (var i = 0; i < stripes; i++) { var x = 20 + i * (24 / stripes) + rng() * 3;
    ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x + 8, 20); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = DIM; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(16, 28); ctx.lineTo(48, 28); ctx.stroke();
};
R.manufacturer = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  ctx.beginPath();
  for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + (i / 6) * Math.PI * 2;
    var x = 32 + Math.cos(a) * 16, y = 32 + Math.sin(a) * 16; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = accent; ctx.font = '700 18px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String((item && item.n) || '?').charAt(0).toUpperCase(), 32, 33);
};
R.generic = function (ctx, rng, item, accent) {
  ctx.strokeStyle = METAL; ctx.lineWidth = 2.4; ctx.fillStyle = DARK;
  rr(ctx, 20, 16, 24, 32, 4); ctx.fill(); ctx.stroke();
  glow(ctx, accent, 6); ctx.fillStyle = accent; C(ctx, 32, 32, 4); ctx.fill(); unglow(ctx);
};

var DMG_COL = { energy: '#66ccff', frag: '#ffc24a', missile: '#ff5a6e' };
function accentOf(kind, key, item, seed) {
  if (kind === 'weapon' && item) {
    if (item.col != null) return cssCol(item.col);                 // the weapon's REAL projectile color
    if (item.dmgType && DMG_COL[item.dmgType]) return DMG_COL[item.dmgType];
  }
  return hsl((seed % 360), 75, 62);                                // seeded decoration hue otherwise
}

function draw(ctx, kind, key, item, table, size) {
  var kn = KIND_ALIAS[kind] || kind;
  var seed = hash32(kn + '|' + key);
  var rng = rngOf(seed);
  var q = qualityOf(item, table);
  var accent = accentOf(kn, key, item, seed);
  var s = (size || CFG.BASE) / CFG.BASE;
  ctx.save(); ctx.scale(s, s);
  ctx.fillStyle = '#0a1420'; rr(ctx, 1.5, 1.5, 61, 61, CFG.FRAME_R); ctx.fill();          // cell background
  (R[kn] || R.generic)(ctx, rng, item, accent);
  ctx.strokeStyle = q.col; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;                       // Diablo quality frame
  rr(ctx, 1.5, 1.5, 61, 61, CFG.FRAME_R); ctx.stroke();
  ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(6, 6); ctx.lineTo(12, 6); ctx.stroke();   // corner ticks
  ctx.beginPath(); ctx.moveTo(52, 58); ctx.lineTo(58, 58); ctx.lineTo(58, 52); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();
  return q;
}

// ------------------------------------------------------------------ dataURL cache + img html
var _cache = {}, _cacheN = 0;
var _canvasFactory = null;   // test hook
function makeCanvas(px) {
  if (_canvasFactory) return _canvasFactory(px);
  var d = (typeof document !== 'undefined') ? document : null; if (!d) return null;
  var c = d.createElement('canvas'); c.width = px; c.height = px; return c;
}
function dataURL(kind, key, item, table, size) {
  size = size || 28;
  var ck = (KIND_ALIAS[kind] || kind) + '|' + key + '|' + size;
  if (_cache[ck]) return _cache[ck];
  var px = size * CFG.DPR;
  var c = makeCanvas(px); if (!c) return '';
  var ctx = c.getContext('2d'); if (!ctx) return '';
  ctx.scale(CFG.DPR, CFG.DPR);
  draw(ctx, kind, key, item, table, size);
  var url = c.toDataURL();
  if (_cacheN < CFG.CACHE_MAX) { _cache[ck] = url; _cacheN++; }
  return url;
}
function img(kind, key, item, table, opts) {
  opts = opts || {};
  var size = opts.size || 28;
  var u = dataURL(kind, key, item, table, size);
  if (!u) return '';
  return '<img src="' + u + '" width="' + size + '" height="' + size + '" alt="" ' +
    'style="vertical-align:middle;border-radius:5px;flex:0 0 auto;' + (opts.style || '') + '"' +
    (opts.drag ? ' draggable="true" data-drag="' + (KIND_ALIAS[kind] || kind) + '|' + key + '"' : '') + '>';
}
function clearCache() { _cache = {}; _cacheN = 0; }

var API = { dataURL: dataURL, img: img, draw: draw, qualityOf: qualityOf, KIND_ALIAS: KIND_ALIAS,
  QUALITY: QUALITY, CFG: CFG, clearCache: clearCache, _setCanvasFactory: function (f) { _canvasFactory = f; } };
if (typeof window !== 'undefined') window.ICONS = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ------------------------------------------------------------------ self-test (node) - no pixels needed:
// a MOCK ctx records every draw call into an op stream; determinism + uniqueness are proven on the streams.
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  function MockCtx() {
    var ops = [];
    var rec = function (name) { return function () { ops.push(name + ':' + Array.prototype.slice.call(arguments).map(function (a) { return typeof a === 'number' ? a.toFixed(2) : String(a); }).join(',')); }; };
    var ctx = { _ops: ops };
    ['beginPath', 'moveTo', 'lineTo', 'closePath', 'stroke', 'fill', 'arc', 'ellipse', 'quadraticCurveTo',
     'save', 'restore', 'translate', 'rotate', 'scale', 'fillText'].forEach(function (m) { ctx[m] = rec(m); });
    ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'shadowBlur', 'shadowColor', 'font', 'textAlign', 'textBaseline']
      .forEach(function (p) { var v; Object.defineProperty(ctx, p, { get: function () { return v; }, set: function (nv) { v = nv; ops.push(p + '=' + nv); } }); });
    return ctx;
  }
  function streamOf(kind, key, item, table) { var c = MockCtx(); draw(c, kind, key, item, table, 64); return c._ops.join(';'); }

  var T = { a: { n: 'A', cost: 0 }, b: { n: 'B', cost: 100 }, c: { n: 'C', cost: 300 }, d: { n: 'D', cost: 900 } };
  check('deterministic: same (kind,key) -> identical op stream', streamOf('tank', 'b', T.b, T) === streamOf('tank', 'b', T.b, T));
  var keys8 = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8'], seen = {}, uniq = 0;
  keys8.forEach(function (k) { var s = streamOf('gizmo', k, T.a, T); if (!seen[s]) { seen[s] = 1; uniq++; } });
  check('unique within category: 8 keys -> 8 distinct icons', uniq === 8);
  check('distinct silhouettes across categories', streamOf('tank', 'x', T.a, T) !== streamOf('radar', 'x', T.a, T));
  var wstream = streamOf('weapon', 'energy', { n: 'L', cost: 0, col: 0x66ccff, dmgType: 'energy' }, T);
  check('weapon accent = the REAL projectile color (0x66ccff -> #66ccff)', wstream.indexOf('#66ccff') >= 0);
  check('quality tiers read off real cost percentiles',
    qualityOf(T.a, T).name === 'common' && qualityOf(T.d, T).name === 'legendary' &&
    qualityOf(T.b, T).name !== 'legendary' && qualityOf({ cost: 0 }, null).name === 'common');
  check('KIND_ALIAS: primaryweapon renders as weapon (same icon)',
    streamOf('primaryweapon', 'energy', T.b, T) === streamOf('weapon', 'energy', T.b, T));
  API._setCanvasFactory(function (px) {
    return { width: px, height: px,
      getContext: function () { var c = MockCtx(); c._c = this; return (this._ctx = c); },
      toDataURL: function () { return 'data:mock;' + hash32(this._ctx._ops.join(';')); } };
  });
  var u1 = dataURL('droid', 'z', T.b, T, 28), u2 = dataURL('droid', 'z', T.b, T, 28);
  check('dataURL caches (second call returns the cached string)', u1 === u2 && u1.indexOf('data:mock') === 0);
  var h1 = img('hook', 'q', T.c, T, { size: 22, drag: true });
  check('img() emits draggable + data-drag for the drag-and-drop layer',
    h1.indexOf('draggable="true"') >= 0 && h1.indexOf('data-drag="hook|q"') >= 0);
  var hullA = streamOf('hull', 'h1', { n: 'F', cost: 0, role: 'fighter' }, T);
  var hullB = streamOf('hull', 'h1', { n: 'F', cost: 0, role: 'freighter' }, T);
  check('hull silhouette follows the REAL role field', hullA !== hullB);
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
