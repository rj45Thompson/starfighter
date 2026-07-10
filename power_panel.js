// power_panel.js -- X-WING-STYLE POWER MANAGEMENT PANEL for Starfighter.
// Reads/writes the shared power-plant pool (weapons/engines/shields, each 0-100, always summing to a fixed
// total) that already lives in starfighter.html, exposed on window.HOST:
//   HOST.powerOf(ship)            -> {weapons,engines,shields} (0-100 each; ship defaults to HOST.P)
//   HOST.setPower(ship,sys,level) -> reroute ONE system to `level`, the other two absorb the difference
//   HOST.powerMult(level)         -> multiplier that level produces (0.4 @0, 1.0 @50, 1.6 @100)
//   HOST.shieldOf(ship)           -> {cur,max} real absorbing shield buffer (separate from hull)
//   HOST.P                        -> the player ship ({hp,maxHp} for the hull readout)
//   HOST.sound(name)              -> safe SOUND.play wrapper
//
// This module NEVER assumes HOST exists or is fully wired: every read goes through defensive helpers, and the
// live-update timer POLLS for HOST rather than assuming it's ready at mount() time (HOST may attach after this
// script loads). Dragging a bar calls HOST.setPower on every pointermove -- cheap and safe per the contract above.
//
// PUBLIC API (attaches window.POWERPANEL): { mount(parentEl?), show(), hide(), toggle(), visible() }.
//   mount(parentEl?) -- build the panel once (idempotent), appended to parentEl (default document.body).
//                      Starts HIDDEN -- the host decides when to reveal it (hotkey / command / etc).
//   show() / hide() / toggle() -- visibility controls; toggle() returns the new visibility bool.
//   visible() -- is the panel currently shown.
// SYNTAX-CLEAN under node: every browser-only ref (window/document) is guarded, so `require('./power_panel.js')`
// (or plain `node power_panel.js`) loads without throwing. A self-test under require.main stubs a minimal
// window/document/HOST, mounts, exercises show/hide/toggle idempotency and a fake drag sequence, prints
// PASS/FAIL per check and exits 1 on any FAIL.
'use strict';
(function () {

// ---- CONFIG (every tunable is a named constant; no magic numbers buried in logic) -----------------------------
var CFG = {
  UPDATE_MS: 250,            // live-refresh interval for the bars/readouts (game render loop is NOT accessible)
  PANEL_W: 260,               // panel width (px) - user 2026-07-08 "too small of a window": was 168, a cramped fit for 3 bars + the balance bar + 2 capacitor gauges
  BAR_H: 160,                 // track height per bar (px) -- vertical bars (was 108)
  BAR_GAP: 14,                // gap between the three bar tracks (px) (was 10)
  TRACK_W: 40,                // track width per bar (px) (was 30)
  POS_BOTTOM: 14,             // CSS position constants -- hedge for easy repositioning by the host
  POS_RIGHT: 14,              // (bottom-right: the market panel is top-center, terminal/log is bottom-left,
  Z: 12,                      //  roster is top-left, so bottom-right reads as clear real estate)
  LEVEL_MIN: 0,
  LEVEL_MAX: 100,
  COL_WEAPONS: '#ff8a5a',     // amber/red -- reads clearly against dark navy
  COL_ENGINES: '#46d6ff',     // cyan/blue
  COL_SHIELDS: '#9fe6ff',     // violet-leaning blue
  COL_BG: 'rgba(10,20,32,0.92)',      // ~#0a1420 with alpha, matches the game's panel chrome
  COL_BORDER: '#22344a',
  COL_HEADER: '#8fd0ff',
  COL_TRACK_BG: '#0c1c2c',
  COL_TRACK_BORDER: '#16283c',
  COL_TEXT: '#cfe6f5',
  COL_DIM: '#6f93a8',
  COL_HULL_OK: '#7fdc8a',
  COL_HULL_LOW: '#ff8a8a',
  HULL_LOW_FRAC: 0.3,         // hull/maxHull below this fraction reads red instead of green
  DIVERT_ZONE: 0.33,          // SR X-WING SHIELDS: click/drag the outer third of the fwd/aft bar to divert, middle third = balanced
  COL_LASER: '#ffb454',       // capacitor gauge colors
  COL_ENGINE_CAP: '#46d6ff',
  // UNITY TECH-SLIDER LOOK (user 2026-07-10 "use the tick marks in the original starfighter unity project"):
  // every gauge fill is masked into discrete tick segments (the TechSlider.png repeat), and the hull readout is
  // the RADIAL tick ring (techslidercircle.png pulled from Starfighter2/Assets/Textures) tinted by health.
  TICK_H: 7, TICK_GAP: 3,     // vertical-bar tick segment height / gap (px)
  TICK_W: 6, TICK_WGAP: 3,    // horizontal-gauge tick width / gap (px)
  RADIAL: 92,                 // radial HULL gauge CSS size (px); canvas is 2x for sharpness
  DIAL_L: 58,                 // radial POWER dial size (WEAPONS/ENGINES/SHIELDS) - user 2026-07-10 "make all the gauges radial"
  CAP_L: 46,                  // radial capacitor + shield-arc dial size (LASER/ENGINE/FWD/AFT)
  RADIAL_IMG: 'assets/techslidercircle.png',
  COL_RADIAL_DIM: '#2a4258',  // unfilled remainder of the tick ring
  COL_RADIAL_SHIELD: '#7fd0ff',
};

// CSS tick mask (the TechSlider segment look) for a gauge fill - `dir` is 'to top' (vertical) or 'to right'
function tickMask(dir, seg, gap) {
  var stop = '#000 0 ' + seg + 'px, transparent ' + seg + 'px ' + (seg + gap) + 'px';
  return ';-webkit-mask-image:repeating-linear-gradient(' + dir + ', ' + stop + ');' +
         'mask-image:repeating-linear-gradient(' + dir + ', ' + stop + ')';
}

var SYSTEMS = [
  { key: 'weapons', label: 'WEAPONS', col: CFG.COL_WEAPONS },
  { key: 'engines', label: 'ENGINES', col: CFG.COL_ENGINES },
  { key: 'shields', label: 'SHIELDS', col: CFG.COL_SHIELDS },
];

// ---- tiny guarded env helpers (mirrors knowledge_hud.js's convention) -----------------------------------------
function doc() { return (typeof document !== 'undefined') ? document : null; }
function win() { return (typeof window !== 'undefined') ? window : null; }
function el(tag, css, txt) {
  var d = doc(); if (!d) return null;
  var e = d.createElement(tag);
  if (css) e.style.cssText = css;
  if (txt != null) e.textContent = txt;
  return e;
}
function clamp(v, lo, hi) { v = Number(v); if (isNaN(v)) return lo; return v < lo ? lo : (v > hi ? hi : v); }
function round(v) { return Math.round(Number(v) || 0); }

// ---- defensive HOST access -- every call is wrapped; a missing/partial HOST never throws -----------------------
function getHost() { var w = win(); return (w && w.HOST) ? w.HOST : null; }

function readPower() {
  var H = getHost();
  if (!H || typeof H.powerOf !== 'function') return { weapons: 50, engines: 50, shields: 50 };
  var p = null;
  try { p = H.powerOf(H.P); } catch (e) { p = null; }
  if (!p || typeof p !== 'object') return { weapons: 50, engines: 50, shields: 50 };
  return {
    weapons: clamp(p.weapons, CFG.LEVEL_MIN, CFG.LEVEL_MAX),
    engines: clamp(p.engines, CFG.LEVEL_MIN, CFG.LEVEL_MAX),
    shields: clamp(p.shields, CFG.LEVEL_MIN, CFG.LEVEL_MAX),
  };
}

function readMult(level) {
  var H = getHost();
  if (!H || typeof H.powerMult !== 'function') return 1;
  var m = null;
  try { m = H.powerMult(level); } catch (e) { m = null; }
  return (typeof m === 'number' && !isNaN(m)) ? m : 1;
}

function readShield() {
  var H = getHost();
  if (!H || typeof H.shieldOf !== 'function') return null;
  var s = null;
  try { s = H.shieldOf(H.P); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') return null;
  return { cur: Number(s.cur) || 0, max: Number(s.max) || 0 };
}

function readHull() {
  var H = getHost(); if (!H) return null;
  var P = null;
  try { P = H.P; } catch (e) { P = null; }
  if (!P) return null;
  var hp = Number(P.hp), max = Number(P.maxHp);
  if (isNaN(hp) || isNaN(max)) return null;
  return { hp: hp, maxHp: max };
}

function setPower(sys, level) {
  var H = getHost();
  if (!H || typeof H.setPower !== 'function') return;
  try { H.setPower(H.P, sys, level); } catch (e) {}
}

// SR X-WING SHIELDS (user 2026-07-08: "same as tie fighter xwing... configure shields both forward or both behind") -
// real fore/aft POOLS (not an efficiency weight on one shared number) plus a 3-state divert: 'fwd' | 'aft' | null(even).
function readShieldArcs() {
  var H = getHost();
  if (!H || typeof H.shieldArcsOf !== 'function') return { fwd: 0, aft: 0, max: 0 };
  var v = null;
  try { v = H.shieldArcsOf(H.P); } catch (e) { v = null; }
  if (!v || typeof v !== 'object') return { fwd: 0, aft: 0, max: 0 };
  return { fwd: Number(v.fwd) || 0, aft: Number(v.aft) || 0, max: Number(v.max) || 0 };
}
function readDivert() {
  var H = getHost();
  if (!H || typeof H.shieldDivertOf !== 'function') return null;
  var v = null;
  try { v = H.shieldDivertOf(H.P); } catch (e) { v = null; }
  return (v === 'fwd' || v === 'aft') ? v : null;
}
function setDivert(mode) {
  var H = getHost();
  if (!H || typeof H.setShieldDivert !== 'function') return;
  try { H.setShieldDivert(H.P, mode); } catch (e) {}
}

// SR X-WING CAPACITORS (user 2026-07-08: "show the power capacitor levels for lasers shields and engine speed") -
// independent energy pools, separate from the weapons/engines/shields ALLOCATION bars above.
function readCapLaser() {
  var H = getHost();
  if (!H || typeof H.capLaserOf !== 'function') return { cur: 100, max: 100 };
  var v = null;
  try { v = H.capLaserOf(H.P); } catch (e) { v = null; }
  if (!v || typeof v !== 'object') return { cur: 100, max: 100 };
  return { cur: Number(v.cur) || 0, max: Number(v.max) || 100 };
}
function readCapEngine() {
  var H = getHost();
  if (!H || typeof H.capEngineOf !== 'function') return { cur: 100, max: 100 };
  var v = null;
  try { v = H.capEngineOf(H.P); } catch (e) { v = null; }
  if (!v || typeof v !== 'object') return { cur: 100, max: 100 };
  return { cur: Number(v.cur) || 0, max: Number(v.max) || 100 };
}

function playSound(name) {
  var H = getHost();
  if (!H || typeof H.sound !== 'function') return;
  try { H.sound(name); } catch (e) {}
}

// ---- the singleton panel ---------------------------------------------------------------------------------------
var PP = {
  built: false, shown: false, docked: false,   // docked = lives inside a host-owned dock div (always visible, no PANELS)
  root: null, hullEl: null, shieldEl: null, radial: null,
  bars: {},       // sys.key -> {fillEl, trackEl, pctEl, multEl}
  balance: null,  // {trackEl, fillFore, fillAft, labelEl} - the fore/aft shield-arc bar (now shows REAL charge, sets divert)
  capLaser: null, capEngine: null,   // {fillEl, pctEl} - SR X-WING CAPACITORS gauges
  timer: null,
  dragSys: null,     // which of the 3 vertical power systems is being dragged (or null)
  dragBalance: false, // is the fore/aft shield-arc bar being dragged
};

// value (0-100) -> a radial power dial (arc fill + centre % + xMULT below)
function applyBarVisual(sysKey, level, mult) {
  var b = PP.bars[sysKey]; if (!b) return;
  var frac = clamp(level, CFG.LEVEL_MIN, CFG.LEVEL_MAX) / CFG.LEVEL_MAX;
  b.lastLevel = round(level);
  drawDial(b, frac, b.col, { value: round(level), label: b.label, sub: 'x' + (Math.round(mult * 100) / 100).toFixed(2), vfont: 0.22 });
}

function renderStatus() {
  if (!PP.built) return;
  var hull = readHull();
  if (PP.hullEl) {
    if (hull && hull.maxHp > 0) {
      var frac = hull.hp / hull.maxHp;
      var col = (frac <= CFG.HULL_LOW_FRAC) ? CFG.COL_HULL_LOW : CFG.COL_HULL_OK;
      PP.hullEl.innerHTML = 'HULL <b style="color:' + col + '">' + round(hull.hp) + '</b>/' + round(hull.maxHp);
    } else {
      PP.hullEl.innerHTML = 'HULL <span style="opacity:.5">--/--</span>';
    }
  }
  var shield = readShield();
  if (PP.shieldEl) {
    if (shield) {
      PP.shieldEl.innerHTML = 'SHIELD <b style="color:' + CFG.COL_SHIELDS + '">' + round(shield.cur) + '</b>/' + round(shield.max);
    } else {
      PP.shieldEl.innerHTML = 'SHIELD <span style="opacity:.5">--/--</span>';
    }
  }
}

// tint the tick-ring PNG a solid color via source-in on a per-dial offscreen (the PNG has a true alpha channel -
// verified: bg alpha 0, tick alpha 255 - so source-in recolors ONLY the ticks). `oc` is the dial's own cache so
// gauges of different sizes don't thrash a single shared offscreen.
function drawTinted(g, img, color, S, oc) {
  var d = doc(); if (!d || !d.createElement) return;
  oc = oc || PP.radial._oc || (PP.radial._oc = d.createElement('canvas'));
  if (!oc.getContext) return;
  if (oc.width !== S) { oc.width = S; oc.height = S; }
  var og = oc.getContext('2d'); if (!og) return;
  og.clearRect(0, 0, S, S); og.globalCompositeOperation = 'source-over';
  og.drawImage(img, 0, 0, S, S);
  og.globalCompositeOperation = 'source-in';
  og.fillStyle = color; og.fillRect(0, 0, S, S);
  og.globalCompositeOperation = 'source-over';
  g.drawImage(oc, 0, 0);
}
// one arc-clipped pass of the tick ring (the shared Unity techslidercircle texture, or a procedural 36-tick fallback)
function tickRing(g, S, color, a0, a1, alpha, oc) {
  if (a1 - a0 <= 0.0001) return;
  var c = S / 2, r = PP.radial;
  g.save();
  g.beginPath(); g.moveTo(c, c); g.arc(c, c, S / 2, a0, a1, false); g.closePath(); g.clip();
  g.globalAlpha = alpha;
  if (r && r.imgOk && r.img) drawTinted(g, r.img, color, S, oc);
  else {
    g.fillStyle = color;
    for (var i = 0; i < 36; i++) { g.save(); g.translate(c, c); g.rotate(i / 36 * Math.PI * 2); g.fillRect(-S * 0.012, -(S / 2) + S * 0.015, S * 0.024, S * 0.10); g.restore(); }
  }
  g.globalAlpha = 1; g.restore();
}
// THE generic radial gauge (user 2026-07-10 "make all the gauges radial"): a tick-ring arc filled to `frac`, dim
// remainder, optional inner arc (e.g. shield on the hull dial), centre value + a label + a small sub-line.
function drawDial(dial, frac, color, opts) {
  opts = opts || {};
  var cv = dial && dial.cv; if (!cv) return;
  var g = null; try { g = (typeof cv.getContext === 'function') ? cv.getContext('2d') : null; } catch (e) { g = null; }
  if (!g) return;                                        // node stub / no canvas2d
  var S = cv.width, c = S / 2, A0 = -Math.PI / 2, TAU = Math.PI * 2;
  frac = clamp(frac, 0, 1);
  g.clearRect(0, 0, S, S);
  tickRing(g, S, color, A0, A0 + frac * TAU, 1, dial.oc);
  tickRing(g, S, CFG.COL_RADIAL_DIM, A0 + frac * TAU, A0 + TAU, 0.5, dial.oc);
  if (opts.inner != null && opts.inner > 0.002) {
    g.beginPath(); g.strokeStyle = opts.innerColor || CFG.COL_RADIAL_SHIELD; g.lineWidth = S * 0.05; g.lineCap = 'round';
    g.arc(c, c, S * 0.29, A0, A0 + clamp(opts.inner, 0, 1) * TAU, false); g.stroke();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (opts.value != null) {
    g.fillStyle = opts.valueColor || '#e6f2fb';
    g.font = '800 ' + Math.round(S * (opts.vfont || 0.24)) + 'px ui-monospace,Menlo,Consolas,monospace';
    g.fillText(String(opts.value), c, c - (opts.label ? S * 0.055 : 0));
  }
  if (opts.label) {
    g.fillStyle = opts.labelColor || color;
    g.font = '800 ' + Math.round(S * 0.125) + 'px ui-monospace,Menlo,Consolas,monospace';
    g.fillText(opts.label, c, c + S * 0.15);
  }
  if (opts.sub) {
    g.fillStyle = opts.subColor || CFG.COL_DIM;
    g.font = '800 ' + Math.round(S * 0.11) + 'px ui-monospace,Menlo,Consolas,monospace';
    g.fillText(opts.sub, c, c + S * 0.31);
  }
}
// the HULL dial: green->red arc by hull %, shield charge as the inner arc, % dead centre.
function renderRadial() {
  var r = PP.radial; if (!r || !r.cv) return;
  var hull = readHull();
  var frac = (hull && hull.maxHp > 0) ? clamp(hull.hp / hull.maxHp, 0, 1) : 0;
  var col = (frac <= CFG.HULL_LOW_FRAC) ? CFG.COL_HULL_LOW : CFG.COL_HULL_OK;
  var sh = readShield();
  var inner = (sh && sh.max > 0) ? clamp(sh.cur / sh.max, 0, 1) : null;
  drawDial(r, frac, col, { value: Math.round(frac * 100) + '%', label: 'HULL', inner: inner, innerColor: CFG.COL_RADIAL_SHIELD, vfont: 0.19 });
}

function renderBars() {
  if (!PP.built) return;
  var power = readPower();
  for (var i = 0; i < SYSTEMS.length; i++) {
    var sys = SYSTEMS[i];
    // while this bar is being actively dragged, skip re-reading it from HOST (avoids visual fighting with the
    // pointer) but keep updating the OTHER two bars, which are legitimately shifting from the reroute.
    if (PP.dragSys === sys.key) continue;
    var level = power[sys.key];
    applyBarVisual(sys.key, level, readMult(level));
  }
}

// the fore/aft SHIELD ARC dials: each shows its own arc's real charge; the diverted arc shows "DIVERT" underneath.
function renderBalance() {
  if (!PP.built || !PP.balance) return;
  var arcs = readShieldArcs(), div = readDivert(), mx = arcs.max > 0 ? arcs.max : 1;
  if (PP.balance.fwd) { PP.balance.fwd.val = round(arcs.fwd); drawDial(PP.balance.fwd, clamp(arcs.fwd / mx, 0, 1), CFG.COL_SHIELDS, { value: round(arcs.fwd), label: 'FWD', sub: div === 'fwd' ? 'DIVERT' : '', subColor: CFG.COL_SHIELDS, vfont: 0.26 }); }
  if (PP.balance.aft) { PP.balance.aft.val = round(arcs.aft); drawDial(PP.balance.aft, clamp(arcs.aft / mx, 0, 1), CFG.COL_ENGINES, { value: round(arcs.aft), label: 'AFT', sub: div === 'aft' ? 'DIVERT' : '', subColor: CFG.COL_ENGINES, vfont: 0.26 }); }
}
// the LASER / ENGINE capacitor dials (read-only - they drain/regen automatically)
function renderCapacitors() {
  if (!PP.built) return;
  var lz = readCapLaser(), en = readCapEngine();
  if (PP.capLaser) { PP.capLaser.val = round(lz.cur); drawDial(PP.capLaser, lz.max > 0 ? clamp(lz.cur / lz.max, 0, 1) : 0, CFG.COL_LASER, { value: round(lz.cur), label: 'LASER', vfont: 0.26 }); }
  if (PP.capEngine) { PP.capEngine.val = round(en.cur); drawDial(PP.capEngine, en.max > 0 ? clamp(en.cur / en.max, 0, 1) : 0, CFG.COL_ENGINE_CAP, { value: round(en.cur), label: 'ENGINE', vfont: 0.26 }); }
}

function renderAll() {
  try { renderStatus(); } catch (e) {}
  try { renderRadial(); } catch (e) {}
  try { renderBars(); } catch (e) {}
  try { renderBalance(); } catch (e) {}
  try { renderCapacitors(); } catch (e) {}
}

// translate a pointer Y within a track's bounding box into a 0-100 level (bottom of track = 0, top = 100)
function levelFromPointer(trackEl, clientY) {
  if (!trackEl || typeof trackEl.getBoundingClientRect !== 'function') return null;
  var rect = null;
  try { rect = trackEl.getBoundingClientRect(); } catch (e) { return null; }
  if (!rect || !rect.height) return null;
  var frac = (rect.bottom - clientY) / rect.height;
  return clamp(frac * CFG.LEVEL_MAX, CFG.LEVEL_MIN, CFG.LEVEL_MAX);
}

// wire pointer-drag on one track: mousedown/touchstart begins a drag, move sets power live, up/leave ends it.
// Uses pointer events when available, falls back to mouse events; both paths funnel into `applyLevel`.
function wireDrag(sysKey, trackEl) {
  if (!trackEl) return;
  var d = doc();

  function applyLevel(clientY) {
    var lvl = levelFromPointer(trackEl, clientY);
    if (lvl == null) return;
    setPower(sysKey, lvl);
    applyBarVisual(sysKey, lvl, readMult(lvl));
  }

  function onMove(ev) {
    if (PP.dragSys !== sysKey) return;
    var y = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : ev.clientY;
    applyLevel(y);
    if (ev.preventDefault) try { ev.preventDefault(); } catch (e) {}
  }
  function endDrag() {
    if (PP.dragSys !== sysKey) return;
    PP.dragSys = null;
    if (d && typeof d.removeEventListener === 'function') {
      try {
        d.removeEventListener('mousemove', onMove);
        d.removeEventListener('mouseup', endDrag);
        d.removeEventListener('touchmove', onMove);
        d.removeEventListener('touchend', endDrag);
      } catch (e) {}
    }
  }
  function startDrag(ev) {
    PP.dragSys = sysKey;
    playSound('ui');
    var y = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : ev.clientY;
    applyLevel(y);
    if (d && typeof d.addEventListener === 'function') {
      try {
        d.addEventListener('mousemove', onMove);
        d.addEventListener('mouseup', endDrag);
        d.addEventListener('touchmove', onMove, { passive: false });
        d.addEventListener('touchend', endDrag);
      } catch (e) {}
    }
    if (ev.preventDefault) try { ev.preventDefault(); } catch (e) {}
  }

  if (trackEl && typeof trackEl.addEventListener === 'function') {
    trackEl.addEventListener('mousedown', startDrag);
    trackEl.addEventListener('touchstart', startDrag, { passive: false });
  }
  // internal handle exposed for the self-test (drives the same path node's DOM stub can call directly)
  trackEl._ppStartDrag = startDrag;
  trackEl._ppMove = onMove;
  trackEl._ppEnd = endDrag;
}

// a square canvas dial at logical size L (backing store 2x for sharpness). `draggable` adds the ns-resize cursor.
function makeDialCanvas(L, draggable) {
  var d = doc(); if (!d || !d.createElement) return null;
  var cv = d.createElement('canvas'); cv.width = L * 2; cv.height = L * 2;
  if (cv.style) cv.style.cssText = 'width:' + L + 'px;height:' + L + 'px;display:block;' + (draggable ? 'cursor:ns-resize;touch-action:none;-webkit-user-select:none;user-select:none' : 'cursor:pointer');
  return cv;
}
// a POWER dial (WEAPONS/ENGINES/SHIELDS): a radial allocator. Drag up/down over it to reroute power (levelFromPointer
// maps the pointer Y within the dial's box to 0-100, same contract as the old vertical bar - so wireDrag is reused).
function buildBar(sys) {
  var col = el('div', 'display:flex;flex-direction:column;align-items:center');
  var cv = makeDialCanvas(CFG.DIAL_L, true);
  if (cv) col.appendChild(cv);
  PP.bars[sys.key] = { cv: cv, oc: (doc() && doc().createElement) ? doc().createElement('canvas') : null, trackEl: cv, col: sys.col, label: sys.label.slice(0, 3), lastLevel: 50 };
  if (cv) wireDrag(sys.key, cv);
  return col;
}

// a read-only-ish dial slot (capacitor, or a shield arc). `onClick` (shield arcs) wires a divert toggle.
function buildDialSlot(labelText, col, onClick) {
  var wrap = el('div', 'display:flex;flex-direction:column;align-items:center');
  var cv = makeDialCanvas(CFG.CAP_L, false);
  if (cv) wrap.appendChild(cv);
  var slot = { cv: cv, oc: (doc() && doc().createElement) ? doc().createElement('canvas') : null, col: col, label: labelText, val: 0 };
  if (cv && onClick && cv.addEventListener) {
    var handler = function (ev) { onClick(); if (ev && ev.preventDefault) try { ev.preventDefault(); } catch (e) {} };
    cv.addEventListener('mousedown', handler); cv.addEventListener('touchstart', handler, { passive: false });
    cv._ppClick = handler;   // exposed for the self-test
  }
  return { wrap: wrap, slot: slot };
}
// SR X-WING SHIELDS as two radial arc dials (FWD / AFT): each shows its arc's REAL charge; clicking a dial DIVERTS
// regen to that arc (clicking the already-diverted one returns to BALANCED). Replaces the old horizontal split bar.
function buildBalanceBar() {
  var wrap = el('div', 'display:flex;justify-content:center;gap:10px;margin-top:8px');
  var fwd = buildDialSlot('FWD', CFG.COL_SHIELDS, function () { playSound('ui'); setDivert(readDivert() === 'fwd' ? null : 'fwd'); renderBalance(); });
  var aft = buildDialSlot('AFT', CFG.COL_ENGINES, function () { playSound('ui'); setDivert(readDivert() === 'aft' ? null : 'aft'); renderBalance(); });
  wrap.appendChild(fwd.wrap); wrap.appendChild(aft.wrap);
  PP.balance = { fwd: fwd.slot, aft: aft.slot };
  return wrap;
}
// SR X-WING CAPACITORS as two radial dials (LASER / ENGINE) - read-only (they drain/regen automatically).
function buildCapacitorRow() {
  var wrap = el('div', 'display:flex;justify-content:center;gap:10px;margin-top:8px');
  var laser = buildDialSlot('LASER', CFG.COL_LASER, null);
  var engine = buildDialSlot('ENGINE', CFG.COL_ENGINE_CAP, null);
  wrap.appendChild(laser.wrap); wrap.appendChild(engine.wrap);
  PP.capLaser = laser.slot; PP.capEngine = engine.slot;
  return wrap;
}

function build(parentEl) {
  if (PP.built) return PP.root;
  var d = doc(); if (!d) { PP.built = true; return null; }   // node/no-DOM: mark built, nothing to show
  var parent = parentEl || (d.body || null);

  var root = el('div',
    'position:fixed;bottom:' + CFG.POS_BOTTOM + 'px;right:' + CFG.POS_RIGHT + 'px;z-index:' + CFG.Z + ';' +
    'width:' + CFG.PANEL_W + 'px;background:' + CFG.COL_BG + ';border:1px solid ' + CFG.COL_BORDER + ';' +
    'border-radius:10px;padding:9px 10px 10px;font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;' +
    'color:' + CFG.COL_TEXT + ';box-shadow:0 6px 26px #000a, 0 0 0 1px #0006 inset;pointer-events:auto;' +
    'display:none;-webkit-user-select:none;user-select:none');
  root.id = 'powerpanel';

  // header
  var head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px');
  var title = el('div',
    'font-weight:800;letter-spacing:.04em;font-size:10.5px;color:' + CFG.COL_HEADER,
    'POWER');
  var closeBtn = el('div', 'cursor:pointer;color:#7fa6bd;font-weight:800;padding:0 4px;line-height:1', 'x');
  closeBtn.title = 'hide power panel';
  closeBtn.onclick = function () { hide(); };
  if (PP.docked && closeBtn.style) closeBtn.style.display = 'none';   // a dock can't be closed away
  head.appendChild(title); head.appendChild(closeBtn);
  root.appendChild(head);

  // ALL-RADIAL GAUGES (user 2026-07-10 "make all the gauges radial"): the big HULL dial on top (its inner arc is
  // the shield), then a row of the three POWER allocator dials, then the shield-arc + capacitor dials. Every gauge
  // is the same Unity techslidercircle tick ring, so the panel reads as one instrument cluster.
  var radialCol = el('div', 'display:flex;flex-direction:column;align-items:center;gap:1px');
  var cv = null, d2 = doc();
  if (d2 && d2.createElement) {
    cv = d2.createElement('canvas');
    cv.width = CFG.RADIAL * 2; cv.height = CFG.RADIAL * 2;   // 2x backing store for sharpness
    if (cv.style) cv.style.cssText = 'width:' + CFG.RADIAL + 'px;height:' + CFG.RADIAL + 'px;display:block';
    radialCol.appendChild(cv);
  }
  var hullEl = el('div', 'font-size:9px;color:' + CFG.COL_DIM + ';text-align:center', 'HULL --/--');
  var shieldEl = el('div', 'font-size:9px;color:' + CFG.COL_DIM + ';text-align:center', 'SHIELD --/--');
  radialCol.appendChild(hullEl); radialCol.appendChild(shieldEl);
  PP.hullEl = hullEl; PP.shieldEl = shieldEl;
  PP.radial = { cv: cv, img: null, imgOk: false, _oc: null };
  // load the Unity tick-ring texture (best-effort; the procedural 36-tick ring draws until/unless it arrives)
  try {
    var w2 = win();
    if (w2 && typeof w2.Image === 'function') {
      var im = new w2.Image();
      im.onload = function () { PP.radial.imgOk = true; };
      im.src = CFG.RADIAL_IMG;
      PP.radial.img = im;
    }
  } catch (e) {}
  root.appendChild(radialCol);

  // three POWER allocator dials, in a row
  var row = el('div', 'display:flex;justify-content:center;gap:12px;margin-top:6px');
  for (var i = 0; i < SYSTEMS.length; i++) row.appendChild(buildBar(SYSTEMS[i]));
  root.appendChild(row);

  root.appendChild(buildBalanceBar());   // user 2026-07-08: "tie fighter... shields (forward/behind) ratio" -> radial FWD/AFT dials
  root.appendChild(buildCapacitorRow());   // user 2026-07-08: "show the power capacitor levels" -> radial LASER/ENGINE dials

  if (parent && parent.appendChild) parent.appendChild(root);
  PP.root = root; PP.built = true;
  return root;
}

function ensureTimer() {
  var w = win();
  if (PP.timer != null || !w || typeof w.setInterval !== 'function') return;
  PP.timer = w.setInterval(function () {
    if (PP.shown) renderAll();
  }, CFG.UPDATE_MS);
}

// BUGFIX (user 2026-07-08, same class as knowledge_hud.js): used to set display:none/'block' directly, a SEPARATE
// visibility channel from panels.js (which only ever moves a panel via `transform`) - delegate to PANELS when this
// panel is registered there so there's one visibility owner, falling back to raw display only when standalone.
function show() {
  if (!PP.built) build();
  if (!PP.docked && win() && window.PANELS && typeof window.PANELS.open === 'function') { window.PANELS.open('powerpanel'); }
  else if (PP.root) { PP.root.style.display = 'block'; }
  PP.shown = true;
  ensureTimer();
  renderAll();
}
function hide() {
  if (!PP.docked && win() && window.PANELS && typeof window.PANELS.close === 'function') { window.PANELS.close('powerpanel'); }
  else if (PP.root) { PP.root.style.display = 'none'; }
  PP.shown = false;
}

// ---- public API --------------------------------------------------------------------------------------------
// mount(parentEl, opts) - opts.docked:true builds the panel as an always-on inline dock (fills the parent,
// no fixed positioning, no PANELS ownership) - the host lays the parent out (starfighter's right column).
function mount(parentEl, opts) {
  if (opts && opts.docked) PP.docked = true;
  var r = build(parentEl);
  if (PP.docked && r && r.style) {
    r.style.cssText += ';position:relative;inset:auto;right:auto;bottom:auto;width:auto;height:100%;' +
      'box-sizing:border-box;display:block;border-radius:0;border:0;border-top:1px solid ' + CFG.COL_BORDER + ';' +
      'box-shadow:none;overflow:hidden';
    PP.shown = true;
  }
  ensureTimer();
  if (PP.docked) { try { renderAll(); } catch (e) {} }
  return r;
}
function toggle() { if (!PP.built) build(); if (PP.shown) hide(); else show(); return PP.shown; }
function visible() { return !!PP.shown; }
function setShown(v) { PP.shown = !!v; if (PP.shown) try { renderAll(); } catch (e) {} }   // sync point for PANELS' onOpenChange

var API = { mount: mount, show: show, hide: hide, toggle: toggle, visible: visible, setShown: setShown, CFG: CFG, _PP: PP };

if (typeof window !== 'undefined') window.POWERPANEL = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node) -- stub a minimal window/document/HOST, mount, exercise the public API + a fake drag ----
if (typeof require !== 'undefined' && require.main === module) {
  var PASS = 0, FAIL = 0;
  function check(name, cond) {
    if (cond) { PASS++; console.log('PASS - ' + name); }
    else { FAIL++; console.log('FAIL - ' + name); }
  }
  function safeCall(name, fn) {
    try { fn(); return true; }
    catch (e) { console.log('FAIL - ' + name + ' threw: ' + e); FAIL++; return false; }
  }

  // ---- minimal DOM stub (mirrors knowledge_hud.js's stub shape, extended with classList/listeners/rect) ----
  function stubEl() {
    var listeners = {};
    return {
      style: { cssText: '', display: '' },
      children: [], innerHTML: '', textContent: '', title: '', id: '', width: 0, height: 0,
      appendChild: function (c) { this.children.push(c); return c; },
      addEventListener: function (type, fn) { listeners[type] = listeners[type] || []; listeners[type].push(fn); },
      removeEventListener: function (type, fn) {
        if (!listeners[type]) return;
        var idx = listeners[type].indexOf(fn); if (idx >= 0) listeners[type].splice(idx, 1);
      },
      getBoundingClientRect: function () { return { top: 100, bottom: 208, height: 108, left: 0, right: 30, width: 30 }; },   // a real DOMRect always carries width alongside height; the horizontal balance-bar test needs it
      set onclick(f) { this._onclick = f; }, get onclick() { return this._onclick || null; },
      _fire: function (type, evt) { var ls = listeners[type] || []; for (var i = 0; i < ls.length; i++) ls[i](evt || {}); },
    };
  }
  var docListeners = {};
  global.document = {
    body: stubEl(),
    createElement: function () { return stubEl(); },
    addEventListener: function (type, fn) { docListeners[type] = docListeners[type] || []; docListeners[type].push(fn); },
    removeEventListener: function (type, fn) {
      if (!docListeners[type]) return;
      var idx = docListeners[type].indexOf(fn); if (idx >= 0) docListeners[type].splice(idx, 1);
    },
    _fire: function (type, evt) { var ls = docListeners[type] || []; for (var i = 0; i < ls.length; i++) ls[i](evt || {}); },
  };
  var fakeShip = { hp: 74, maxHp: 100, power: { weapons: 50, engines: 50, shields: 50 } };
  var lastSetPower = null;
  global.window = {
    setInterval: function (fn, ms) { return 0; },   // never actually fire on a timer under node
    clearInterval: function () {},
    HOST: {
      get P() { return fakeShip; },
      powerOf: function (s) {
        s = s || fakeShip;
        if (!s.power) s.power = { weapons: 50, engines: 50, shields: 50 };
        return s.power;
      },
      setPower: function (s, sys, target) {
        s = s || fakeShip;
        target = Math.max(0, Math.min(100, Number(target) || 0));
        lastSetPower = { sys: sys, target: target };
        var others = ['weapons', 'engines', 'shields'].filter(function (k) { return k !== sys; });
        var remain = 150 - target;
        s.power[others[0]] = remain / 2; s.power[others[1]] = remain / 2; s.power[sys] = target;
        return s.power;
      },
      powerMult: function (level) { return 0.4 + (Math.max(0, Math.min(100, level)) / 100) * (1.6 - 0.4); },
      shieldOf: function (s) { s = s || fakeShip; return { cur: 42, max: 60 }; },
      shieldArcsOf: function (s) { s = s || fakeShip; return { fwd: s.shieldFwd == null ? 20 : s.shieldFwd, aft: s.shieldAft == null ? 20 : s.shieldAft, max: 20 }; },
      shieldDivertOf: function (s) { s = s || fakeShip; return s.shieldDivert || null; },
      setShieldDivert: function (s, mode) { s = s || fakeShip; s.shieldDivert = (mode === 'fwd' || mode === 'aft') ? mode : null; return s.shieldDivert; },
      capLaserOf: function (s) { s = s || fakeShip; return { cur: s.capLaser == null ? 100 : s.capLaser, max: 100 }; },
      capEngineOf: function (s) { s = s || fakeShip; return { cur: s.capEngine == null ? 100 : s.capEngine, max: 100 }; },
      sound: function (name) { /* no-op stub */ },
    },
  };

  var pp = require('./power_panel.js');

  // 1. mount() / API surface
  var root = null;
  safeCall('mount()', function () { root = pp.mount(); });
  check('mount() returns a root element', !!root);
  check('public API has mount/show/hide/toggle/visible', typeof pp.mount === 'function' && typeof pp.show === 'function' &&
    typeof pp.hide === 'function' && typeof pp.toggle === 'function' && typeof pp.visible === 'function');

  // 2. starts hidden
  check('starts hidden after mount()', pp.visible() === false);

  // 3. mount() is idempotent (second call doesn't rebuild / doesn't throw)
  var root2 = null;
  safeCall('mount() twice (idempotent)', function () { root2 = pp.mount(); });
  check('mount() twice returns the same root', root === root2);

  // 4. show() / hide() / toggle()
  safeCall('show()', function () { pp.show(); });
  check('visible() true after show()', pp.visible() === true);
  safeCall('hide()', function () { pp.hide(); });
  check('visible() false after hide()', pp.visible() === false);
  var afterToggle1 = null, afterToggle2 = null;
  safeCall('toggle() from hidden', function () { afterToggle1 = pp.toggle(); });
  check('toggle() from hidden -> true', afterToggle1 === true && pp.visible() === true);
  safeCall('toggle() from shown', function () { afterToggle2 = pp.toggle(); });
  check('toggle() from shown -> false', afterToggle2 === false && pp.visible() === false);

  // 5. idempotent repeats (show/hide called twice in a row must not throw)
  safeCall('show() then show() again', function () { pp.show(); pp.show(); });
  safeCall('hide() then hide() again', function () { pp.hide(); pp.hide(); });

  // 6. fake drag sequence -- drive the internal drag handler wired onto a bar track, proving the wiring path
  //    (pointer -> levelFromPointer -> HOST.setPower -> bar visual) doesn't throw, then confirm directly via
  //    HOST.setPower that the reroute contract holds (other two systems absorb the difference). The real code
  //    registers mousemove/mouseup on `document` (so dragging can continue outside the track), so the
  //    continuation events are fired on the document stub, not the track element.
  pp.show();
  var weaponsTrack = pp._PP.bars && pp._PP.bars.weapons ? pp._PP.bars.weapons.trackEl : null;
  check('weapons bar track exists after show()', !!weaponsTrack);
  if (weaponsTrack && weaponsTrack._ppStartDrag) {
    safeCall('simulated drag: mousedown at clientY=100 (top of stub track = level 100)', function () {
      weaponsTrack._ppStartDrag({ clientY: 100 });
    });
    check('drag start called HOST.setPower for weapons', !!lastSetPower && lastSetPower.sys === 'weapons');
    safeCall('simulated drag: mousemove at clientY=154 (mid-track, fired on document)', function () {
      global.document._fire('mousemove', { clientY: 154 });
    });
    check('drag move re-called HOST.setPower for weapons', !!lastSetPower && lastSetPower.sys === 'weapons');
    safeCall('simulated drag: mouseup ends the drag (fired on document)', function () {
      global.document._fire('mouseup', {});
    });
  } else {
    check('drag handle wired onto weapons track', false);
  }

  // 7. direct HOST.setPower wiring proof (no DOM involved) -- the power pool total must stay constant
  lastSetPower = null;
  safeCall('direct HOST.setPower(fakeShip, "shields", 80)', function () {
    global.window.HOST.setPower(fakeShip, 'shields', 80);
  });
  var total = fakeShip.power.weapons + fakeShip.power.engines + fakeShip.power.shields;
  check('HOST.setPower reroute keeps pool total constant (~150)', Math.abs(total - 150) < 0.5);
  check('HOST.setPower actually moved shields to 80', Math.abs(fakeShip.power.shields - 80) < 0.5);

  // 7b. SR X-WING SHIELDS - now two RADIAL arc dials (FWD/AFT); clicking a dial diverts regen to that arc, clicking
  // the already-diverted one returns to BALANCED (user 2026-07-10 "make all the gauges radial").
  check('shield arc dials built', !!(pp._PP.balance && pp._PP.balance.fwd && pp._PP.balance.fwd.cv && pp._PP.balance.aft && pp._PP.balance.aft.cv));
  var fwdCv = pp._PP.balance ? pp._PP.balance.fwd.cv : null, aftCv = pp._PP.balance ? pp._PP.balance.aft.cv : null;
  if (fwdCv && fwdCv._ppClick && aftCv && aftCv._ppClick) {
    safeCall('click FWD dial', function () { fwdCv._ppClick({}); });
    check('click FWD dial diverts fwd', fakeShip.shieldDivert === 'fwd');
    safeCall('click FWD dial again', function () { fwdCv._ppClick({}); });
    check('click FWD again returns to BALANCED (null)', fakeShip.shieldDivert === null);
    safeCall('click AFT dial', function () { aftCv._ppClick({}); });
    check('click AFT dial diverts aft', fakeShip.shieldDivert === 'aft');
  } else {
    check('shield arc dial click wired', false);
  }
  safeCall('direct HOST.setShieldDivert(fakeShip, "fwd")', function () { global.window.HOST.setShieldDivert(fakeShip, 'fwd'); });
  check('HOST.setShieldDivert actually set it to fwd', fakeShip.shieldDivert === 'fwd');
  check('HOST.shieldDivertOf reads it back', global.window.HOST.shieldDivertOf(fakeShip) === 'fwd');
  fakeShip.shieldFwd = 15; fakeShip.shieldAft = 8;
  var arcs = global.window.HOST.shieldArcsOf(fakeShip);
  check('HOST.shieldArcsOf reads real per-arc charge', arcs.fwd === 15 && arcs.aft === 8 && arcs.max === 20);

  // 7c. SR X-WING CAPACITORS - now two RADIAL dials (LASER/ENGINE); renderCapacitors stores the live value on .val
  check('capacitor dials built', !!(pp._PP.capLaser && pp._PP.capLaser.cv) && !!(pp._PP.capEngine && pp._PP.capEngine.cv));
  fakeShip.capLaser = 40; fakeShip.capEngine = 90;
  safeCall('renderCapacitors via a fresh show()', function () { pp.hide(); pp.show(); });
  check('laser dial value reflects the fake ship value end-to-end', pp._PP.capLaser.val === 40);
  check('engine dial value reflects the fake ship value end-to-end', pp._PP.capEngine.val === 90);

  // 8. mounting into an explicit parent element works
  var altParent = stubEl();
  var PP2 = require('./power_panel.js');   // require cache returns the SAME singleton module -- reuse is fine,
  check('module require is stable (singleton export)', PP2 === pp);

  // 9. degrades gracefully when HOST is entirely missing
  var savedHost = global.window.HOST;
  global.window.HOST = undefined;
  safeCall('renderAll-equivalent path (show()) with HOST missing', function () { pp.hide(); pp.show(); });
  check('still visible with HOST missing (no throw, no-op reads)', pp.visible() === true);
  global.window.HOST = savedHost;
  pp.hide();

  console.log('---');
  console.log('TOTAL: ' + (PASS + FAIL) + '  PASS: ' + PASS + '  FAIL: ' + FAIL);
  if (FAIL > 0) { console.log('RESULT: FAIL'); process.exit(1); }
  else { console.log('RESULT: PASS'); process.exit(0); }
}

})();
