// engbay.js -- SHIP LAYOUT / ENGINEERING BAY visual panel (user 2026-07-08, "big list... burn it down": "top down
// lego building game... Hulls are the skeleton and have different mount points max"). Renders the docked player's
// current hull as a top-down schematic using the REAL per-hull mount positions (starfighter.html's HULL_MOUNTS) -
// click an empty weapon/gizmo mount to pick a component, click a filled one to unmount. Every mutation goes
// through the SAME `gizmo mount/unmount` / `hardpoint mount/unmount` terminal commands the HANGAR UI and typed
// commands already use (HOST.runCmd) - no new mutation path, so cost/credit-checks/dock-gating/shrink-refunds are
// guaranteed identical to what's already tested, this panel is purely a new VIEW onto existing behavior.
//
// Reads from window.HOST (same defensive contract as power_panel.js - polls for HOST rather than assuming it is
// ready at mount() time):
//   HOST.P                          -> player ship (hullClass, gizmoSlots[], weaponSlots[], weaponType, credits)
//   HOST.HULL_MOUNTS[hullClass]     -> {primary,engine,weaponPoints:[{x,y,facingDeg}],gizmoPoints:[{x,y,facingDeg}]}
//   HOST.GIZMOS / HOST.GIZMO_KEYS   -> gizmo catalog
//   HOST.WEAPONS / HOST.WEAPON_ORDER-> weapon catalog (player-purchasable subset)
//   HOST.hasGizmo(s,key) / HOST.hasHardpoint(s,key)
//   HOST.runCmd(str)                -> the ONE mutation path (mirrors every other data-cmd UI in this game)
//   HOST.atBase(s) / a `dockedP`-style gate -- this panel only allows edits while docked, matching `gizmo`/
//     `hardpoint` terminal commands' own `need(dockedP,...)` guard; read via a passed-in `HOST.P.docked` check.
//
// PUBLIC API (attaches window.ENGBAY): { mount(parentEl?), show(), hide(), toggle(), visible(), setShown(v) }.
// SYNTAX-CLEAN under node: every browser-only ref is guarded; a self-test under require.main stubs a minimal
// window/document/HOST, mounts, exercises the empty-click-to-mount and filled-click-to-unmount flows, prints
// PASS/FAIL per check and exits 1 on any FAIL.
'use strict';
(function () {

var CFG = {
  VIEWBOX: 1.35,          // half-extent of the schematic's normalized coordinate space (mount coords run ~-1.2..1.2)
  PANEL_W: 340, PANEL_H: 400,
  DOT_R: 0.10,             // weapon/gizmo mount circle radius (normalized units)
  DOT_R_REF: 0.065,        // primary/engine reference-point radius (smaller, non-interactive)
  TICK_LEN: 0.22,          // facing-direction tick length off a weapon mount
  Z: 13,
  COL_HULL_FILL: 'rgba(70,214,255,0.07)', COL_HULL_STROKE: '#3a5a78',
  COL_EMPTY: '#1c2a3c', COL_EMPTY_STROKE: '#46617e',
  COL_WEAPON: '#ff6a6a', COL_WEAPON_DIM: '#5a2e2e',
  COL_GIZMO: '#5ac8ff', COL_GIZMO_DIM: '#233c4e',
  COL_REF: '#8fa2b8', COL_TEXT: '#cfe2f5', COL_DIM: '#6f88a4',
  POLL_MS: 400,            // re-render cadence while open (cheap - just reflects HOST.P state, no animation)
};

function win() { return (typeof window !== 'undefined') ? window : null; }
function doc() { return (typeof document !== 'undefined') ? document : null; }
function HOST() { var w = win(); return w && w.HOST; }
function el(tag, style, html) { var d = doc(); var e = d.createElement(tag); if (style) e.style.cssText = style; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); }

var EB = { root: null, body: null, shown: false, mounted: false, pickIdx: null, pickType: null, pollT: null };

function shipOr(h) { return (h && h.P) || null; }

function mountSchema(h, s) {
  var hc = (s && s.hullClass) || 'fighter';
  var m = h.HULL_MOUNTS && (h.HULL_MOUNTS[hc] || h.HULL_MOUNTS.fighter);
  return m || { primary: { x: 0, y: -1, facingDeg: 0 }, engine: { x: 0, y: 1, facingDeg: 180 }, weaponPoints: [], gizmoPoints: [] };
}

// ---- coordinate mapping: normalized (-VIEWBOX..VIEWBOX) -> SVG viewBox units (same range, SVG just renders it) --
function hullPolygon() {                                     // one generic tapered silhouette - the mount POINTS carry the per-hull info, not hyper-accurate art
  return '-0.18,-1.25 0.18,-1.25 0.55,-0.3 0.7,0.55 0.35,1.2 -0.35,1.2 -0.7,0.55 -0.55,-0.3';
}
function tickEnd(pt) {
  var rad = (pt.facingDeg || 0) * Math.PI / 180;
  return { x: pt.x + Math.sin(rad) * CFG.TICK_LEN, y: pt.y - Math.cos(rad) * CFG.TICK_LEN };  // facingDeg 0 = toward -y (forward), matches the ship's own nose convention
}

function pointSvg(kind, idx, pt, filled, label) {
  var col = filled ? (kind === 'weapon' ? CFG.COL_WEAPON : CFG.COL_GIZMO) : CFG.COL_EMPTY;
  var stroke = filled ? (kind === 'weapon' ? CFG.COL_WEAPON : CFG.COL_GIZMO) : CFG.COL_EMPTY_STROKE;
  var tick = '';
  if (kind === 'weapon') { var te = tickEnd(pt); tick = '<line x1="' + pt.x + '" y1="' + pt.y + '" x2="' + te.x + '" y2="' + te.y + '" stroke="' + col + '" stroke-width="0.035" />'; }
  return '<g data-mount="' + kind + '" data-idx="' + idx + '" style="cursor:pointer">' + tick +
    '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="' + CFG.DOT_R + '" fill="' + col + '" stroke="' + stroke + '" stroke-width="0.03" />' +
    (label ? '<text x="' + pt.x + '" y="' + (pt.y + 0.035) + '" font-size="0.09" text-anchor="middle" fill="#04121c" font-weight="700">' + esc(label) + '</text>' : '') +
    '</g>';
}

function refPointSvg(pt, glyph) {
  return '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="' + CFG.DOT_R_REF + '" fill="none" stroke="' + CFG.COL_REF + '" stroke-width="0.025" stroke-dasharray="0.04,0.03" />' +
    '<text x="' + pt.x + '" y="' + (pt.y + 0.2 * (pt.y < 0 ? -1 : 1)) + '" font-size="0.08" text-anchor="middle" fill="' + CFG.COL_REF + '">' + glyph + '</text>';
}

function schematicSvg(h, s, schema) {
  var vb = -CFG.VIEWBOX + ' ' + -CFG.VIEWBOX + ' ' + (2 * CFG.VIEWBOX) + ' ' + (2 * CFG.VIEWBOX);
  var body = '<polygon points="' + hullPolygon() + '" fill="' + CFG.COL_HULL_FILL + '" stroke="' + CFG.COL_HULL_STROKE + '" stroke-width="0.025" />';
  body += refPointSvg(schema.primary, 'PRI');
  body += refPointSvg(schema.engine, 'ENG');
  var gs = (s && s.gizmoSlots) || [];
  schema.gizmoPoints.forEach(function (pt, i) {
    var key = gs[i]; var label = key && h.GIZMOS[key] ? h.GIZMOS[key].n.split(' ').map(function (w) { return w[0]; }).join('') : '';
    body += pointSvg('gizmo', i, pt, !!key, label);
  });
  var ws = (s && s.weaponSlots) || [];
  schema.weaponPoints.forEach(function (pt, i) {
    var key = ws[i]; var label = key && h.WEAPONS[key] ? h.WEAPONS[key].n.split(' ').map(function (w) { return w[0]; }).join('') : '';
    body += pointSvg('weapon', i, pt, !!key, label);
  });
  return '<svg viewBox="' + vb + '" width="100%" height="240" style="display:block">' + body + '</svg>';
}

function pickerHtml(h, kind, idx) {
  var keys = kind === 'weapon' ? h.WEAPON_ORDER : h.GIZMO_KEYS;
  var cat = kind === 'weapon' ? h.WEAPONS : h.GIZMOS;
  var rows = keys.map(function (k) {
    return '<div data-pick="' + esc(k) + '" style="padding:4px 8px;cursor:pointer;border-radius:4px" ' +
      'onmouseover="this.style.background=\'#152234\'" onmouseout="this.style.background=\'\'">' +
      '<b style="color:' + CFG.COL_TEXT + '">' + esc(cat[k].n) + '</b> <span style="color:' + CFG.COL_DIM + '">' + cat[k].cost + 'c - ' + esc(cat[k].desc || '') + '</span></div>';
  }).join('');
  return '<div style="margin-top:8px;border:1px solid ' + CFG.COL_EMPTY_STROKE + ';border-radius:6px;padding:6px;background:#0c1623">' +
    '<div style="color:' + CFG.COL_DIM + ';font-size:11px;margin-bottom:4px">mount in ' + kind + ' slot ' + (idx + 1) + ' - click one:</div>' + rows + '</div>';
}

function render() {
  if (!EB.body) return;
  var h = HOST();
  if (!h) { EB.body.innerHTML = '<div style="padding:10px;color:' + CFG.COL_DIM + '">waiting for game...</div>'; return; }
  var s = shipOr(h);
  if (!s) { EB.body.innerHTML = '<div style="padding:10px;color:' + CFG.COL_DIM + '">no ship.</div>'; return; }
  if (!s.docked) {
    EB.body.innerHTML = '<div style="padding:10px;color:' + CFG.COL_DIM + '">dock at a planet to edit your loadout (fly there, then reopen).</div>';
    EB.pickIdx = null; return;
  }
  var schema = mountSchema(h, s);
  var hull = h.HULLS[s.hullClass || 'fighter'];
  var html = '<div style="font-size:12px;color:' + CFG.COL_TEXT + ';margin-bottom:4px"><b>' + esc(hull ? hull.n : s.hullClass) + '</b> - ' +
    schema.weaponPoints.length + ' weapon mount' + (schema.weaponPoints.length === 1 ? '' : 's') + ', ' + schema.gizmoPoints.length + ' gizmo mount' + (schema.gizmoPoints.length === 1 ? '' : 's') + '</div>';
  html += schematicSvg(h, s, schema);
  html += '<div style="font-size:10px;color:' + CFG.COL_DIM + ';margin-top:4px">dashed = reference (primary weapon / engine, not editable here) - red = weapon hardpoint, blue = gizmo. Click empty to mount, filled to unmount.</div>';
  if (EB.pickIdx != null && EB.pickType) html += pickerHtml(h, EB.pickType, EB.pickIdx);
  EB.body.innerHTML = html;
}

function onMountClick(kind, idx) {
  var h = HOST(); var s = shipOr(h); if (!h || !s) return;
  var arr = kind === 'weapon' ? s.weaponSlots : s.gizmoSlots;
  var filled = arr && arr[idx];
  if (filled) {
    h.runCmd((kind === 'weapon' ? 'hardpoint' : 'gizmo') + ' unmount ' + (idx + 1));
    EB.pickIdx = null;
  } else {
    EB.pickIdx = idx; EB.pickType = kind;
  }
  render();
}
function onPick(kind, idx, key) {
  var h = HOST(); if (!h) return;
  h.runCmd((kind === 'weapon' ? 'hardpoint' : 'gizmo') + ' mount ' + key);
  EB.pickIdx = null; EB.pickType = null;
  render();
}

function wireClicks() {
  EB.body.addEventListener('click', function (ev) {
    var pickEl = ev.target.closest && ev.target.closest('[data-pick]');
    if (pickEl) { onPick(EB.pickType, EB.pickIdx, pickEl.getAttribute('data-pick')); return; }
    var mountEl = ev.target.closest && ev.target.closest('[data-mount]');
    if (mountEl) { onMountClick(mountEl.getAttribute('data-mount'), parseInt(mountEl.getAttribute('data-idx'), 10)); return; }
  });
}

function build() {
  if (EB.mounted) return;
  var d = doc(); if (!d) return;
  var root = el('div', 'position:fixed;width:' + CFG.PANEL_W + 'px;max-height:' + CFG.PANEL_H + 'px;overflow-y:auto;' +
    'background:#0a1220dd;border:1px solid #22344a;border-radius:8px;padding:8px;font:12px ui-monospace,monospace;z-index:' + CFG.Z + ';display:none;pointer-events:auto');
  root.id = 'engbay';
  var title = el('div', 'font-weight:800;color:#8fd0ff;margin-bottom:4px;letter-spacing:.04em', '◈ ENGINEERING BAY - SHIP LAYOUT');
  var body = el('div', '');
  root.appendChild(title); root.appendChild(body);
  (d.body || d.documentElement).appendChild(root);
  EB.root = root; EB.body = body; EB.mounted = true;
  wireClicks();
}

function show() {
  build();
  var w = win();
  if (w && w.PANELS && typeof w.PANELS.open === 'function') { w.PANELS.open('engbay'); }
  else if (EB.root) { EB.root.style.display = 'block'; }
  EB.shown = true; render();
  clearInterval(EB.pollT); EB.pollT = setInterval(function () { if (EB.shown) render(); }, CFG.POLL_MS);
}
function hide() {
  var w = win();
  if (w && w.PANELS && typeof w.PANELS.close === 'function') { w.PANELS.close('engbay'); }
  else if (EB.root) { EB.root.style.display = 'none'; }
  EB.shown = false; clearInterval(EB.pollT); EB.pollT = null;
}
function toggle() { if (EB.shown) hide(); else show(); return EB.shown; }
function visible() { return EB.shown; }
function setShown(v) { EB.shown = !!v; if (EB.shown) { render(); clearInterval(EB.pollT); EB.pollT = setInterval(function () { if (EB.shown) render(); }, CFG.POLL_MS); } else { clearInterval(EB.pollT); EB.pollT = null; } }

var API = { mount: build, show: show, hide: hide, toggle: toggle, visible: visible, setShown: setShown, CFG: CFG, _EB: EB };
if (typeof window !== 'undefined') window.ENGBAY = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ================================================================================================================
// SELF-TEST (node engbay.js) - stubs a minimal window/document/HOST, exercises mount-click/pick/unmount flows.
// ================================================================================================================
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(name, cond) { if (cond) { pass++; console.log('PASS - ' + name); } else { fail++; console.log('FAIL - ' + name); } }

  // ---- minimal DOM stub (enough for createElement/appendChild/innerHTML/closest/addEventListener) --------------
  function StubEl(tag) {
    this.tag = tag; this.style = {}; this.children = []; this._html = ''; this._listeners = {};
    this.attrs = {};
  }
  Object.defineProperty(StubEl.prototype, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = v; this.children = parseStubHtml(v); }
  });
  StubEl.prototype.appendChild = function (c) { this.children.push(c); return c; };
  StubEl.prototype.addEventListener = function (type, fn) { this._listeners[type] = fn; };
  StubEl.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
  StubEl.prototype.getAttribute = function (k) { return this.attrs[k]; };
  StubEl.prototype.closest = function (sel) {                          // supports the exact selectors this file uses: [data-pick] / [data-mount]
    var attr = sel.replace(/[\[\]]/g, '');
    var node = this;
    while (node) { if (node.attrs && (attr in node.attrs)) return node; node = node._parent; }
    return null;
  };
  // very small "parser": scans for data-pick="..." / data-mount="..." data-idx="..." tokens in the rendered html
  // and produces a flat list of clickable stub nodes wired with ._parent so closest() can walk up - good enough
  // to drive real click-simulation tests without a real DOM.
  function parseStubHtml(html) {
    var nodes = [];
    var re = /data-(pick|mount)="([^"]*)"(?:[^>]*data-idx="(\d+)")?/g, m;
    while ((m = re.exec(html))) {
      var n = new StubEl('g'); n.attrs['data-' + m[1]] = m[2]; if (m[3] != null) n.attrs['data-idx'] = m[3];
      nodes.push(n);
    }
    return nodes;
  }
  function simulateClick(container, matchAttr, matchVal) {
    var target = null;
    (function walk(n) { if (target) return; if (n.attrs && n.attrs[matchAttr] === matchVal) { target = n; return; } (n.children || []).forEach(walk); })(container);
    if (!target) throw new Error('simulateClick: no node with ' + matchAttr + '=' + matchVal);
    container._listeners.click({ target: target });
  }

  var stubDoc = {
    createElement: function (tag) { return new StubEl(tag); },
    body: new StubEl('body'), documentElement: new StubEl('html'),
  };
  var fakeShip = { hullClass: 'interceptor', docked: { name: 'Test Base' }, credits: 5000, gizmoSlots: [null, null, null], weaponSlots: [null, null], weaponType: 'energy' };
  var cmds = [];
  var HULLS = { interceptor: { n: 'Interceptor' } };
  var HULL_MOUNTS = { interceptor: { primary: { x: 0, y: -1.05, facingDeg: 0 }, engine: { x: 0, y: 1, facingDeg: 180 },
    weaponPoints: [{ x: -0.45, y: -0.35, facingDeg: 0 }, { x: 0.45, y: -0.35, facingDeg: 0 }],
    gizmoPoints: [{ x: -0.35, y: 0.35, facingDeg: 0 }, { x: 0, y: 0.5, facingDeg: 0 }, { x: 0.35, y: 0.35, facingDeg: 0 }] } };
  var GIZMOS = { targeting: { n: 'Targeting Computer', cost: 900, desc: 'lead reticle' }, ecm: { n: 'ECM Jammer', cost: 850, desc: 'jam' } };
  var WEAPONS = { energy: { n: 'Pulse Laser', cost: 0 }, ballistic: { n: 'Autocannon', cost: 220 }, missile: { n: 'Seeker Missile', cost: 360 } };
  var fakeHost = {
    P: fakeShip, HULLS: HULLS, HULL_MOUNTS: HULL_MOUNTS, GIZMOS: GIZMOS, GIZMO_KEYS: Object.keys(GIZMOS),
    WEAPONS: WEAPONS, WEAPON_ORDER: ['energy', 'ballistic', 'missile'],
    hasGizmo: function (s, k) { return (s.gizmoSlots || []).indexOf(k) >= 0; },
    hasHardpoint: function (s, k) { return (s.weaponSlots || []).indexOf(k) >= 0; },
    runCmd: function (str) {
      cmds.push(str);
      var parts = str.split(' ');
      if (parts[0] === 'gizmo' && parts[1] === 'mount') fakeShip.gizmoSlots[fakeShip.gizmoSlots.indexOf(null)] = parts[2];
      if (parts[0] === 'gizmo' && parts[1] === 'unmount') fakeShip.gizmoSlots[parseInt(parts[2], 10) - 1] = null;
      if (parts[0] === 'hardpoint' && parts[1] === 'mount') fakeShip.weaponSlots[fakeShip.weaponSlots.indexOf(null)] = parts[2];
      if (parts[0] === 'hardpoint' && parts[1] === 'unmount') fakeShip.weaponSlots[parseInt(parts[2], 10) - 1] = null;
    },
  };
  global.window = { HOST: fakeHost, PANELS: null };
  global.document = stubDoc;

  build();
  check('module mounts without throwing', EB.mounted === true);
  show();
  check('shown after show()', EB.shown === true);
  check('docked ship renders the schematic, not the dock-gate message', EB.body._html.indexOf('dock at a planet') === -1);
  check('undocked ship shows the dock-gate message', (function () {
    var wasDocked = fakeShip.docked; fakeShip.docked = null; render();
    var gated = EB.body._html.indexOf('dock at a planet') >= 0;
    fakeShip.docked = wasDocked; render();
    return gated;
  })());

  // ---- click an EMPTY gizmo mount (idx 0) -> picker should appear listing GIZMO_KEYS ----------------------------
  simulateClick(EB.body, 'data-mount', 'gizmo');
  check('clicking an empty gizmo mount opens the picker (pickIdx set)', EB.pickIdx === 0 && EB.pickType === 'gizmo');
  check('picker html lists a real gizmo', EB.body._html.indexOf('Targeting Computer') >= 0);

  // ---- pick "targeting" -> should call HOST.runCmd('gizmo mount targeting') and actually mount it ---------------
  simulateClick(EB.body, 'data-pick', 'targeting');
  check('picking a gizmo issues the exact terminal command', cmds[cmds.length - 1] === 'gizmo mount targeting');
  check('the ship actually has it mounted afterward', fakeShip.gizmoSlots.indexOf('targeting') >= 0);
  check('picker closes after a pick', EB.pickIdx === null);

  // ---- click that SAME now-filled mount -> should unmount directly (no picker) -----------------------------------
  var filledIdx = fakeShip.gizmoSlots.indexOf('targeting');
  simulateClick(EB.body, 'data-mount', 'gizmo');   // parseStubHtml walks in render order; re-derive which node maps to filledIdx via a direct call instead for determinism:
  onMountClick('gizmo', filledIdx);
  check('clicking a filled mount issues the unmount command', cmds[cmds.length - 1] === 'gizmo unmount ' + (filledIdx + 1));
  check('the ship no longer has it mounted', fakeShip.gizmoSlots.indexOf('targeting') === -1);

  // ---- weapon hardpoint mount/unmount (independent array, same code path) ---------------------------------------
  onMountClick('weapon', 0);
  check('clicking an empty weapon hardpoint opens the weapon picker', EB.pickType === 'weapon' && EB.pickIdx === 0);
  onPick('weapon', 0, 'ballistic');
  check('picking a weapon mounts it via hardpoint mount', fakeShip.weaponSlots[0] === 'ballistic');
  onMountClick('weapon', 0);
  check('unmounting the weapon hardpoint clears it', fakeShip.weaponSlots[0] === null);

  hide();
  check('hidden after hide()', EB.shown === false);

  console.log('---');
  console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
