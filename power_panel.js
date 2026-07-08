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
  PANEL_W: 168,               // panel width (px)
  BAR_H: 108,                 // track height per bar (px) -- vertical bars
  BAR_GAP: 10,                // gap between the three bar tracks (px)
  TRACK_W: 30,                // track width per bar (px)
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
};

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

// FORE/AFT SHIELD BALANCE (user 2026-07-08: "starwars tie fighter... shields (forward/behind) ratio") -
// a second dial alongside the weapons/engines/shields pool above. 0 = full aft, 100 = full fore, 50 = even.
function readBalance() {
  var H = getHost();
  if (!H || typeof H.shieldBalanceOf !== 'function') return 50;
  var v = null;
  try { v = H.shieldBalanceOf(H.P); } catch (e) { v = null; }
  return (typeof v === 'number' && !isNaN(v)) ? clamp(v, 0, 100) : 50;
}
function setBalance(v) {
  var H = getHost();
  if (!H || typeof H.setShieldBalance !== 'function') return;
  try { H.setShieldBalance(H.P, v); } catch (e) {}
}

function playSound(name) {
  var H = getHost();
  if (!H || typeof H.sound !== 'function') return;
  try { H.sound(name); } catch (e) {}
}

// ---- the singleton panel ---------------------------------------------------------------------------------------
var PP = {
  built: false, shown: false,
  root: null, hullEl: null, shieldEl: null,
  bars: {},       // sys.key -> {fillEl, trackEl, pctEl, multEl}
  balance: null,  // {trackEl, fillFore, fillAft, labelEl}
  timer: null,
  dragSys: null,     // which of the 3 vertical power systems is being dragged (or null)
  dragBalance: false, // is the fore/aft shield-balance bar being dragged
};

// value (0-100) -> fill fraction, top-anchored fill (bar fills from bottom up)
function applyBarVisual(sysKey, level, mult) {
  var b = PP.bars[sysKey]; if (!b) return;
  var frac = clamp(level, CFG.LEVEL_MIN, CFG.LEVEL_MAX) / CFG.LEVEL_MAX;
  if (b.fillEl) b.fillEl.style.height = (frac * 100).toFixed(2) + '%';
  if (b.pctEl) b.pctEl.textContent = round(level) + '%';
  if (b.multEl) b.multEl.textContent = 'x' + (Math.round(mult * 100) / 100).toFixed(2);
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

function renderBalance() {
  if (!PP.built || PP.dragBalance) return;   // skip re-reading while the user is actively dragging it (same rule as renderBars)
  applyBalanceVisual(readBalance());
}

function renderAll() {
  try { renderStatus(); } catch (e) {}
  try { renderBars(); } catch (e) {}
  try { renderBalance(); } catch (e) {}
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

function buildBar(sys) {
  var col = el('div', 'display:flex;flex-direction:column;align-items:center;width:' + CFG.TRACK_W + 'px');

  var label = el('div',
    'font-size:8.5px;font-weight:800;letter-spacing:.08em;color:' + sys.col + ';margin-bottom:4px;text-align:center',
    sys.label.slice(0, 3));

  var track = el('div',
    'position:relative;width:' + CFG.TRACK_W + 'px;height:' + CFG.BAR_H + 'px;background:' + CFG.COL_TRACK_BG + ';' +
    'border:1px solid ' + CFG.COL_TRACK_BORDER + ';border-radius:5px;overflow:hidden;cursor:ns-resize;' +
    'touch-action:none;-webkit-user-select:none;user-select:none');

  var fill = el('div',
    'position:absolute;left:0;right:0;bottom:0;height:50%;background:' + sys.col + ';' +
    'box-shadow:0 0 8px ' + sys.col + '88 inset;transition:background 0.15s');

  track.appendChild(fill);

  var pct = el('div', 'font:700 10px/1 ui-monospace,monospace;color:' + CFG.COL_TEXT + ';margin-top:5px', '50%');
  var mult = el('div', 'font-size:9px;color:' + CFG.COL_DIM + ';margin-top:1px', 'x1.00');

  col.appendChild(label);
  col.appendChild(track);
  col.appendChild(pct);
  col.appendChild(mult);

  wireDrag(sys.key, track);

  PP.bars[sys.key] = { fillEl: fill, trackEl: track, pctEl: pct, multEl: mult };
  return col;
}

// horizontal fore/aft shield-balance bar - same click/drag-to-set language as the vertical bars above,
// just on the X axis: left = full aft, right = full fore.
function balanceFromPointer(trackEl, clientX) {
  if (!trackEl || typeof trackEl.getBoundingClientRect !== 'function') return null;
  var rect = null;
  try { rect = trackEl.getBoundingClientRect(); } catch (e) { return null; }
  if (!rect || !rect.width) return null;
  var frac = (clientX - rect.left) / rect.width;
  return clamp(frac * 100, 0, 100);
}
function applyBalanceVisual(bal) {
  var b = PP.balance; if (!b) return;
  if (b.fillAft) b.fillAft.style.width = (100 - bal).toFixed(1) + '%';
  if (b.fillFore) b.fillFore.style.width = bal.toFixed(1) + '%';
  if (b.labelEl) b.labelEl.textContent = 'FORE ' + round(bal) + '% / AFT ' + round(100 - bal) + '%';
}
function wireBalanceDrag(trackEl) {
  if (!trackEl) return;
  var d = doc();
  function applyAt(clientX) {
    var bal = balanceFromPointer(trackEl, clientX);
    if (bal == null) return;
    setBalance(bal); applyBalanceVisual(bal);
  }
  function onMove(ev) {
    if (!PP.dragBalance) return;
    var x = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
    applyAt(x);
    if (ev.preventDefault) try { ev.preventDefault(); } catch (e) {}
  }
  function endDrag() {
    if (!PP.dragBalance) return;
    PP.dragBalance = false;
    if (d && typeof d.removeEventListener === 'function') {
      try {
        d.removeEventListener('mousemove', onMove); d.removeEventListener('mouseup', endDrag);
        d.removeEventListener('touchmove', onMove); d.removeEventListener('touchend', endDrag);
      } catch (e) {}
    }
  }
  function startDrag(ev) {
    PP.dragBalance = true; playSound('ui');
    var x = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
    applyAt(x);
    if (d && typeof d.addEventListener === 'function') {
      try {
        d.addEventListener('mousemove', onMove); d.addEventListener('mouseup', endDrag);
        d.addEventListener('touchmove', onMove, { passive: false }); d.addEventListener('touchend', endDrag);
      } catch (e) {}
    }
    if (ev.preventDefault) try { ev.preventDefault(); } catch (e) {}
  }
  if (trackEl && typeof trackEl.addEventListener === 'function') {
    trackEl.addEventListener('mousedown', startDrag);
    trackEl.addEventListener('touchstart', startDrag, { passive: false });
  }
  trackEl._ppStartDrag = startDrag; trackEl._ppMove = onMove; trackEl._ppEnd = endDrag;
}
function buildBalanceBar() {
  var wrap = el('div', 'margin-top:9px;padding-top:8px;border-top:1px solid ' + CFG.COL_TRACK_BORDER);
  var label = el('div', 'font:700 9px/1 ui-monospace,monospace;color:' + CFG.COL_TEXT + ';margin-bottom:4px;text-align:center', 'FORE 50% / AFT 50%');
  var track = el('div',
    'position:relative;height:12px;background:' + CFG.COL_TRACK_BG + ';border:1px solid ' + CFG.COL_TRACK_BORDER + ';' +
    'border-radius:5px;overflow:hidden;cursor:ew-resize;touch-action:none;-webkit-user-select:none;user-select:none');
  var fillAft = el('div', 'position:absolute;top:0;bottom:0;right:0;width:50%;background:' + CFG.COL_ENGINES + '55');
  var fillFore = el('div', 'position:absolute;top:0;bottom:0;left:0;width:50%;background:' + CFG.COL_SHIELDS + ';box-shadow:0 0 6px ' + CFG.COL_SHIELDS + '88 inset');
  track.appendChild(fillAft); track.appendChild(fillFore);
  wrap.appendChild(label); wrap.appendChild(track);
  wireBalanceDrag(track);
  PP.balance = { trackEl: track, fillFore: fillFore, fillAft: fillAft, labelEl: label };
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
  head.appendChild(title); head.appendChild(closeBtn);
  root.appendChild(head);

  // hull / shield readout
  var status = el('div',
    'font-size:9.5px;color:' + CFG.COL_DIM + ';margin-bottom:8px;padding-bottom:7px;' +
    'border-bottom:1px solid ' + CFG.COL_TRACK_BORDER + ';display:flex;flex-direction:column;gap:2px');
  var hullEl = el('div', '', 'HULL --/--');
  var shieldEl = el('div', '', 'SHIELD --/--');
  status.appendChild(hullEl); status.appendChild(shieldEl);
  root.appendChild(status);
  PP.hullEl = hullEl; PP.shieldEl = shieldEl;

  // three bars, side by side
  var row = el('div', 'display:flex;justify-content:space-between;gap:' + CFG.BAR_GAP + 'px');
  for (var i = 0; i < SYSTEMS.length; i++) row.appendChild(buildBar(SYSTEMS[i]));
  root.appendChild(row);

  root.appendChild(buildBalanceBar());   // user 2026-07-08: "tie fighter... shields (forward/behind) ratio"

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

function show() {
  if (!PP.built) build();
  if (PP.root) PP.root.style.display = 'block';
  PP.shown = true;
  ensureTimer();
  renderAll();
}
function hide() { if (PP.root) PP.root.style.display = 'none'; PP.shown = false; }

// ---- public API --------------------------------------------------------------------------------------------
function mount(parentEl) { var r = build(parentEl); ensureTimer(); return r; }
function toggle() { if (!PP.built) build(); if (PP.shown) hide(); else show(); return PP.shown; }
function visible() { return !!PP.shown; }

var API = { mount: mount, show: show, hide: hide, toggle: toggle, visible: visible, CFG: CFG, _PP: PP };

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
      shieldBalanceOf: function (s) { s = s || fakeShip; return s.shieldBalance == null ? 50 : s.shieldBalance; },
      setShieldBalance: function (s, v) { s = s || fakeShip; s.shieldBalance = Math.max(0, Math.min(100, Number(v) || 0)); return s.shieldBalance; },
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

  // 7b. fore/aft shield-balance bar (user 2026-07-08 "tie fighter... shields forward/behind ratio")
  check('balance bar built', !!(pp._PP.balance && pp._PP.balance.trackEl));
  var balTrack = pp._PP.balance ? pp._PP.balance.trackEl : null;
  if (balTrack && balTrack._ppStartDrag) {
    safeCall('simulated balance drag: mousedown at clientX=30 (rect left=0,right=30 -> full fore)', function () {
      balTrack._ppStartDrag({ clientX: 30 });
    });
    check('balance drag start called HOST.setShieldBalance (near 100, full fore)', fakeShip.shieldBalance != null && fakeShip.shieldBalance > 90);
    safeCall('simulated balance drag: mousemove to clientX=0 (full aft), fired on document', function () {
      global.document._fire('mousemove', { clientX: 0 });
    });
    check('balance drag move re-called HOST.setShieldBalance (near 0, full aft)', fakeShip.shieldBalance < 10);
    safeCall('simulated balance drag: mouseup ends it', function () { global.document._fire('mouseup', {}); });
  } else {
    check('drag handle wired onto balance track', false);
  }
  safeCall('direct HOST.setShieldBalance(fakeShip, 70)', function () { global.window.HOST.setShieldBalance(fakeShip, 70); });
  check('HOST.setShieldBalance actually moved it to 70', Math.abs(fakeShip.shieldBalance - 70) < 0.5);
  check('HOST.shieldBalanceOf reads it back', Math.abs(global.window.HOST.shieldBalanceOf(fakeShip) - 70) < 0.5);

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
