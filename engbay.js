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
  PANEL_W: 320,           // width of the schematic column inside the fullscreen frame (was the whole panel's width pre-fullscreen)
  Z: 80,                  // FULLSCREEN 2026-07-08: above planetmenu.js's pmRoot (Z_INDEX 74) so this modal always sits on top of the docked menu it's embedding
  DOT_R: 0.10,             // weapon/gizmo mount circle radius (normalized units)
  DOT_R_REF: 0.065,        // primary/engine reference-point radius (smaller, non-interactive)
  TICK_LEN: 0.22,          // facing-direction tick length off a weapon mount
  COL_HULL_FILL: 'rgba(70,214,255,0.07)', COL_HULL_STROKE: '#3a5a78',
  COL_EMPTY: '#1c2a3c', COL_EMPTY_STROKE: '#46617e',
  COL_WEAPON: '#ff6a6a', COL_WEAPON_DIM: '#5a2e2e',
  COL_GIZMO: '#5ac8ff', COL_GIZMO_DIM: '#233c4e',
  COL_REF: '#8fa2b8', COL_TEXT: '#cfe2f5', COL_DIM: '#6f88a4',
  POLL_MS: 400,            // re-render cadence while open (cheap - just reflects HOST.P state, no animation)
  // SHIELD ARCS (task #83, "shield coverage as spatial arcs on the same schematic"): a bubble drawn around the
  // FIXED generic hull silhouette (not per-hull mount extents, which vary too much across the 57 hull classes) -
  // sized to stay inside VIEWBOX with margin regardless of hull class. Same violet-blue as power_panel.js's
  // CFG.COL_SHIELDS so the two panels read as the same "shield" color language.
  COL_SHIELD: '#9fe6ff', COL_SHIELD_DIM: 'rgba(159,230,255,0.16)',
  SHIELD_CY: -0.025, SHIELD_RX: 0.82, SHIELD_RY: 1.28, SHIELD_STROKE: 0.07,
};

function win() { return (typeof window !== 'undefined') ? window : null; }
function doc() { return (typeof document !== 'undefined') ? document : null; }
function HOST() { var w = win(); return w && w.HOST; }
function el(tag, style, html) { var d = doc(); var e = d.createElement(tag); if (style) e.style.cssText = style; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); }

var EB = { root: null, body: null, shown: false, mounted: false, pickIdx: null, pickType: null, pollT: null, gridPick: null,
  dragging: null };   // "kind|key" while an item icon is mid-drag - the poll must NOT re-render then (a re-render destroys the dragged element and cancels the drag)

// PROCEDURAL ITEM ICONS (user 2026-07-09 "icons, somewhat unique for each item... slot them in like diablo"):
// item_icons.js generates a deterministic per-item face from the item's own real data. Soft dependency - every
// call falls back to the old category glyph when ICONS isn't loaded, so this file still works standalone.
function iconImg(kind, key, item, table, size, drag) {
  var w = win();
  if (!w || !w.ICONS || !item) return null;
  try { return w.ICONS.img(kind, key, item, table, { size: size, drag: !!drag }); } catch (e) { return null; }
}

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

// SHIELD ARCS: two half-ellipse paths wrapping the hull silhouette, one for the nose-side (forward) arc and one
// for the tail-side (aft) arc - the REAL fwd/aft charge pools from the X-Wing shield rewrite (s.shieldFwd/
// shieldAft via HOST.shieldArcsOf), not a cosmetic placeholder. Each half draws a dim full-strength outline (max
// capacity) plus a bright overlay whose length is proportional to current charge, using pathLength="100" so the
// dasharray fraction maps directly to charge% regardless of the arc's real SVG path length.
function shieldArcPaths() {
  var cx = 0, cy = CFG.SHIELD_CY, rx = CFG.SHIELD_RX, ry = CFG.SHIELD_RY;
  return {
    fwd: 'M ' + (cx - rx) + ',' + cy + ' A ' + rx + ',' + ry + ' 0 0,1 ' + (cx + rx) + ',' + cy,   // left -> top(nose) -> right
    aft: 'M ' + (cx + rx) + ',' + cy + ' A ' + rx + ',' + ry + ' 0 0,1 ' + (cx - rx) + ',' + cy,   // right -> bottom(tail) -> left
  };
}
function shieldArcSvg(h, s) {
  if (!h || typeof h.shieldArcsOf !== 'function') return '';
  var arcs = h.shieldArcsOf(s); if (!arcs || !arcs.max) return '';
  var fwdFrac = Math.max(0, Math.min(1, arcs.fwd / arcs.max));
  var aftFrac = Math.max(0, Math.min(1, arcs.aft / arcs.max));
  var p = shieldArcPaths(), sw = CFG.SHIELD_STROKE;
  var dim = ' stroke="' + CFG.COL_SHIELD_DIM + '" stroke-width="' + sw + '" fill="none"';
  function bright(frac) { return ' stroke="' + CFG.COL_SHIELD + '" stroke-width="' + sw + '" fill="none" stroke-linecap="round" pathLength="100" stroke-dasharray="' + Math.round(frac * 100) + ' 100" style="filter:drop-shadow(0 0 0.03px ' + CFG.COL_SHIELD + ')"'; }
  return '<path d="' + p.fwd + '"' + dim + ' />' + '<path d="' + p.aft + '"' + dim + ' />' +
    '<path d="' + p.fwd + '"' + bright(fwdFrac) + ' />' + '<path d="' + p.aft + '"' + bright(aftFrac) + ' />';
}
// numeric readout below the schematic - the arcs above are the spatial view, this is the precise value (avoids
// cramming text into the SVG where it could collide with the PRI/ENG reference labels on tall/short hulls).
function shieldReadoutHtml(h, s) {
  if (!h || typeof h.shieldArcsOf !== 'function') return '';
  var arcs = h.shieldArcsOf(s); if (!arcs || !arcs.max) return '';
  var pct = function (v) { return Math.round(100 * Math.max(0, Math.min(1, v / arcs.max))); };
  var divert = (typeof h.shieldDivertOf === 'function' && h.shieldDivertOf(s)) || null;
  return '<div style="font-size:10px;color:' + CFG.COL_SHIELD + ';margin-top:2px">SHIELDS - FWD ' + Math.round(arcs.fwd) + '/' + Math.round(arcs.max) + ' (' + pct(arcs.fwd) + '%) · AFT ' + Math.round(arcs.aft) + '/' + Math.round(arcs.max) + ' (' + pct(arcs.aft) + '%)' +
    (divert ? ' · diverting to ' + esc(divert) : '') + '</div>';
}
function schematicSvg(h, s, schema) {
  var vb = -CFG.VIEWBOX + ' ' + -CFG.VIEWBOX + ' ' + (2 * CFG.VIEWBOX) + ' ' + (2 * CFG.VIEWBOX);
  var body = shieldArcSvg(h, s);
  body += '<polygon points="' + hullPolygon() + '" fill="' + CFG.COL_HULL_FILL + '" stroke="' + CFG.COL_HULL_STROKE + '" stroke-width="0.025" />';
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
    var face = iconImg(kind, k, cat[k], cat, 24, true) || '';
    return '<div data-pick="' + esc(k) + '" draggable="true" data-drag="' + esc(kind) + '|' + esc(k) + '" style="padding:4px 8px;cursor:grab;border-radius:4px;display:flex;align-items:center;gap:6px" ' +
      'onmouseover="this.style.background=\'#152234\'" onmouseout="this.style.background=\'\'">' + face +
      '<span><b style="color:' + CFG.COL_TEXT + '">' + esc(cat[k].n) + '</b> <span style="color:' + CFG.COL_DIM + '">' + cat[k].cost + 'c - ' + esc(cat[k].desc || '') + '</span></span></div>';
  }).join('');
  return '<div style="margin-top:8px;border:1px solid ' + CFG.COL_EMPTY_STROKE + ';border-radius:6px;padding:6px;background:#0c1623">' +
    '<div style="color:' + CFG.COL_DIM + ';font-size:11px;margin-bottom:4px">mount in ' + kind + ' slot ' + (idx + 1) + ' - click one:</div>' + rows + '</div>';
}

// DIABLO-2-STYLE SLOT GRID (user 2026-07-08 "make a visual UI of putting the components in sort of like diablo
// 2... each hull has different slots that items can fit... make a matrix and document it - basically we are
// copying space rangers 2"): a grid of labeled icon-boxes for every SINGLE-SLOT equipment category (as opposed to
// the spatial schematic above, which already covers the two MULTI-SLOT categories - weapon hardpoints and gizmos -
// as clickable mount points). Click an empty/swappable box to open a picker (same interaction as the schematic);
// click a PERMANENT box (locked Hull Series, or Manufacturer/Micromodules which are always read-only) does nothing.
// Reuses PLANETMENU.GEAR_SLOTS as the single source of truth for tank/radar/scanner/shieldgen/droid/hook/series so
// this grid can never drift out of sync with the HANGAR tab's own list of the same categories.
var GRID_GLYPH = { primaryweapon:'⚔', tank:'⛽', radar:'📡', scanner:'🔍', shieldgen:'🛡', droid:'🔧', hook:'🪝', series:'⚙', manufacturer:'🏭', micromodule:'✦' };
function gridSlotDefs(h) {
  var defs = [ { kind:'primaryweapon', label:'PRIMARY WEAPON', table:h.WEAPONS, keys:h.WEAPON_ORDER, field:'weaponType', defKey:'energy', cmd:'weapon', lockField:null },
    // ENGINE (2026-07-09, added with the icon pass): it was fittable in the HANGAR tab (`engine <key>`) but missing
    // from this Diablo grid - the character screen should show the whole character.
    { kind:'engine', label:'ENGINE', table:h.ENGINES, keys:h.ENGINE_KEYS, field:'engineType', defKey:'standard', cmd:'engine', lockField:null } ];
  (h && Array.isArray(win() && win().PLANETMENU && win().PLANETMENU.GEAR_SLOTS) ? win().PLANETMENU.GEAR_SLOTS : []).forEach(function (g) {
    defs.push({ kind:g[0], label:g[1], table:h[g[2]], keys:h[g[3]], field:g[4], defKey:g[5], cmd:g[6], lockField:g[7] || null });
  });
  // MANUFACTURER: no standalone fit command exists (only bundled into `hull <class> <manufacturer>`, see
  // starfighter.html's own comment on MANUFACTURERS) - read-only by omitting cmd, same as the audit found.
  if (h.MANUFACTURERS && h.MANUFACTURER_KEYS) defs.push({ kind:'manufacturer', label:'MANUFACTURER', table:h.MANUFACTURERS, keys:null, field:'manufacturer', defKey:'human', cmd:null, lockField:null });
  return defs;
}
function gridBoxHtml(h, s, def) {
  var locked = !!(def.lockField && s[def.lockField]);
  var readOnly = !def.cmd;   // manufacturer/micromodules have no fit command - display only
  var curKey = (s && s[def.field]) || def.defKey;
  var it = def.table && def.table[curKey];
  var filled = it && ((s[def.field] || def.defKey) !== def.defKey);
  // DIABLO ICONS: a slot holding a REAL item (even factory default gear like the Pulse Laser) shows that item's
  // own procedural icon; only a genuinely empty slot ('none') keeps the faint category glyph.
  var isEmpty = curKey === 'none' || !it;
  var face = !isEmpty && iconImg(def.kind, curKey, it, def.table, 34, false);
  var glyph = GRID_GLYPH[def.kind] || '◇';
  var boxCol = readOnly ? CFG.COL_REF : (locked ? '#ff9a9a' : (filled ? CFG.COL_GIZMO : CFG.COL_EMPTY_STROKE));
  var attrs = (readOnly ? '' : ' data-grid="' + def.kind + '"') +
    (readOnly || locked ? '' : ' data-drop="' + def.kind + '"') +
    ' style="' + (readOnly ? '' : 'cursor:pointer;') +
    'border:1px solid ' + boxCol + ';border-radius:8px;padding:8px;background:#0c1623;text-align:center;min-width:96px"';
  return '<div' + attrs + '>' +
    '<div style="font-size:20px;min-height:36px;display:flex;align-items:center;justify-content:center;gap:2px">' +
      (face || '<span style="opacity:.45">' + glyph + '</span>') + (locked ? ' <span style="font-size:13px">🔒</span>' : '') + '</div>' +
    '<div style="font-size:9px;color:' + CFG.COL_DIM + ';letter-spacing:.04em;margin-top:2px">' + esc(def.label) + '</div>' +
    '<div style="font-size:10px;color:' + (filled ? CFG.COL_TEXT : CFG.COL_DIM) + ';margin-top:2px">' + esc(it ? it.n : 'empty') + '</div>' +
    '</div>';
}
function micromoduleGridHtml(h, s) {
  var mods = s.micromodules || [];
  var glyph = GRID_GLYPH.micromodule;
  // DIABLO GEMS: each socketed micromodule renders as its own faceted-gem icon (the closest thing this game has
  // to D2 gems - permanent once socketed, hence the lock).
  var faces = mods.map(function (k) { return iconImg('micromodule', k, (h.MICROMODULES && h.MICROMODULES[k]) || { n: k }, h.MICROMODULES, 26, false) || ''; }).join('');
  var label = mods.length ? mods.map(function (k) { return (h.MICROMODULES && h.MICROMODULES[k] && h.MICROMODULES[k].n) || k; }).join(', ') : 'none yet';
  return '<div style="border:1px solid ' + CFG.COL_REF + ';border-radius:8px;padding:8px;background:#0c1623;text-align:center;min-width:96px">' +
    '<div style="font-size:20px;min-height:36px;display:flex;align-items:center;justify-content:center;gap:2px">' + (faces || '<span style="opacity:.45">' + glyph + '</span>') + (mods.length ? ' <span style="font-size:13px">🔒</span>' : '') + '</div>' +
    '<div style="font-size:9px;color:' + CFG.COL_DIM + ';letter-spacing:.04em;margin-top:2px">MICROMODULES</div>' +
    '<div style="font-size:10px;color:' + (mods.length ? CFG.COL_TEXT : CFG.COL_DIM) + ';margin-top:2px">' + esc(label) + '</div></div>';
}
function slotGridHtml(h, s) {
  var defs = gridSlotDefs(h);
  var boxes = defs.map(function (def) { return gridBoxHtml(h, s, def); }).join('');
  boxes += micromoduleGridHtml(h, s);
  var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">' + boxes + '</div>';
  var gp = EB.gridPick;
  if (gp) {
    var def = defs.filter(function (d) { return d.kind === gp; })[0];
    if (def && def.keys) {
      var rows = def.keys.map(function (k) {
        var it2 = def.table[k]; if (!it2) return '';
        var face = iconImg(def.kind, k, it2, def.table, 24, true) || '';
        return '<div data-gridpick="' + esc(k) + '" draggable="true" data-drag="' + esc(def.kind) + '|' + esc(k) + '" style="padding:4px 8px;cursor:grab;border-radius:4px;display:flex;align-items:center;gap:6px" ' +
          'onmouseover="this.style.background=\'#152234\'" onmouseout="this.style.background=\'\'">' + face +
          '<span><b style="color:' + CFG.COL_TEXT + '">' + esc(it2.n) + '</b> <span style="color:' + CFG.COL_DIM + '">' + (it2.cost ? it2.cost + 'c' : 'free') + ' - ' + esc(it2.desc || '') + '</span></span></div>';
      }).join('');
      html += '<div style="border:1px solid ' + CFG.COL_EMPTY_STROKE + ';border-radius:6px;padding:6px;background:#0c1623;margin-bottom:6px">' +
        '<div style="color:' + CFG.COL_DIM + ';font-size:11px;margin-bottom:4px">fit ' + esc(def.label) + ' - click one, or DRAG it onto the slot:</div>' + rows + '</div>';
    }
  }
  return html;
}
function onGridClick(kind) {
  var h = HOST(); var s = shipOr(h); if (!h || !s) return;
  var def = gridSlotDefs(h).filter(function (d) { return d.kind === kind; })[0]; if (!def || !def.cmd) return;
  if (def.lockField && s[def.lockField]) return;   // PERMANENT SLOT - no picker, nothing to do
  EB.gridPick = (EB.gridPick === kind) ? null : kind;   // click again to close the same picker
  render();
}
function onGridPick(kind, key) {
  var h = HOST(); if (!h) return;
  var def = gridSlotDefs(h).filter(function (d) { return d.kind === kind; })[0]; if (!def) return;
  h.runCmd(def.cmd + ' ' + key);
  EB.gridPick = null;
  render();
}

// FULLSCREEN SHOP ATTACH (user 2026-07-08 "make the item shop a fullscreen window that attaches to the engineering
// bay... the items would be showing what's at the nearest ranger station perhaps. same menu for now... or it will
// just open the nearest stores to you. but still you need to travel to the planet or something"): when genuinely
// docked, the RIGHT column embeds PLANETMENU's own hangarHtml() output verbatim - the identical shop/loadout UI the
// docked menu already shows, not a rebuild. When not docked, it shows a READ-ONLY nearest-station name/distance
// hint instead of any buy UI - deliberately no price list or mutate path here, since that would let a player shop
// from anywhere; the existing dock-gated commands (hardpoint/gizmo mount, hull, upgrade, ...) remain the only way
// to actually transact, same as always. "Still need to travel" is preserved by construction, not by a new check.
function nearestStationHtml(h, s) {
  var ns = (typeof h.nearestStation === 'function') ? h.nearestStation(s.pos) : null;
  if (!ns) return '<div style="color:' + CFG.COL_DIM + '">no station data yet.</div>';
  return '<div style="color:' + CFG.COL_TEXT + '"><b>' + esc(ns.name) + '</b>' + (ns.isBase ? ' <span style="color:' + CFG.COL_DIM + '">(Ranger Command)</span>' : '') +
    '</div><div style="color:' + CFG.COL_DIM + ';margin-top:4px">' + ns.dist + 'u away - fly there and dock to browse and buy. ' +
    'The shop only shows real, live stock while you\'re actually there - this is a distance hint, not a catalog.</div>';
}

function render() {
  if (!EB.body) return;
  var h = HOST();
  if (!h) { EB.body.innerHTML = '<div style="padding:10px;color:' + CFG.COL_DIM + '">waiting for game...</div>'; return; }
  var s = shipOr(h);
  if (!s) { EB.body.innerHTML = '<div style="padding:10px;color:' + CFG.COL_DIM + '">no ship.</div>'; return; }

  var top = '<div style="width:100%;order:-1">' +
    '<div style="font-size:11px;color:' + CFG.COL_DIM + ';letter-spacing:.04em;margin-bottom:6px">LOADOUT - click a box to fit, 🔒 = permanent for this hull</div>' +
    slotGridHtml(h, s) + '</div>';

  var schema = mountSchema(h, s);
  var hull = h.HULLS[s.hullClass || 'fighter'];
  var left = '<div style="width:' + CFG.PANEL_W + 'px;max-width:100%;flex:0 0 auto">' +
    '<div style="font-size:12px;color:' + CFG.COL_TEXT + ';margin-bottom:4px"><b>' + esc(hull ? hull.n : s.hullClass) + '</b> - ' +
    schema.weaponPoints.length + ' weapon mount' + (schema.weaponPoints.length === 1 ? '' : 's') + ', ' + schema.gizmoPoints.length + ' gizmo mount' + (schema.gizmoPoints.length === 1 ? '' : 's') + '</div>' +
    schematicSvg(h, s, schema) + shieldReadoutHtml(h, s);
  if (!s.docked) {
    left += '<div style="font-size:10px;color:' + CFG.COL_DIM + ';margin-top:4px">dock at a planet or base to edit your loadout.</div>';
    EB.pickIdx = null;
  } else {
    left += '<div style="font-size:10px;color:' + CFG.COL_DIM + ';margin-top:4px">dashed = reference (primary weapon / engine, not editable here) - red = weapon hardpoint, blue = gizmo, cyan bubble = shield charge (fwd/aft). Click empty to mount, filled to unmount.</div>';
    if (EB.pickIdx != null && EB.pickType) left += pickerHtml(h, EB.pickType, EB.pickIdx);
  }
  left += '</div>';

  // SHOP REMOVED (user 2026-07-09 "I don't want to see hull purchases in engineering bay - that is just for
  // editing the component slots and layout like diablo character control"): the Bay is LOADOUT-ONLY now - the
  // schematic + paperdoll grid above. BUYING lives in the docked planet menu's SHOP tab (flat SR:AWA store).
  var right = '<div style="flex:1 1 300px;min-width:260px;max-width:480px;border-left:1px solid ' + CFG.COL_EMPTY_STROKE + ';padding-left:14px">';
  if (s.docked) {
    right += '<div style="font-size:12px;color:' + CFG.COL_TEXT + ';margin-bottom:6px"><b>THIS IS YOUR CHARACTER SCREEN</b></div>' +
      '<div style="font-size:11px;color:' + CFG.COL_DIM + '">Fit, swap, and arrange what you already own here.<br><br>' +
      '🛒 To BUY new hulls, weapons, or gear: close this (ESC) and open the docked menu\'s <b style="color:' + CFG.COL_TEXT + '">SHOP</b> tab - one flat list, one BUY button each.</div>';
  } else {
    right += '<div style="font-size:12px;color:' + CFG.COL_TEXT + ';margin-bottom:6px"><b>NEAREST STATION</b></div>' + nearestStationHtml(h, s);
  }
  right += '</div>';

  EB.body.innerHTML = top + left + right;
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
    // DIABLO-2-STYLE SLOT GRID: data-grid/data-gridpick are this section's own vocabulary, disjoint from
    // data-pick/data-mount (schematic) and data-act (embedded shop) above/below - checked in the same
    // closest-match-and-return chain so exactly one handler ever fires per click.
    var gridPickEl = ev.target.closest && ev.target.closest('[data-gridpick]');
    if (gridPickEl) { onGridPick(EB.gridPick, gridPickEl.getAttribute('data-gridpick')); return; }
    var gridEl = ev.target.closest && ev.target.closest('[data-grid]');
    if (gridEl) { onGridClick(gridEl.getAttribute('data-grid')); return; }
    // (2026-07-09: the embedded-shop data-act delegation is GONE with the shop itself - the Bay is loadout-only;
    // buying happens in the docked menu's SHOP tab.)
  });
  wireDrag();
}

// DIABLO DRAG-AND-DROP (user 2026-07-09 "I want to slot them in like diablo"): drag an item's icon from a picker
// list onto its slot. The drop routes through the SAME real fit commands as clicking (weapon/tank/.../hardpoint
// mount) - drag is a gesture, never a second mutate path. Wrong-slot drops are simply not accepted (no dragover
// preventDefault -> the browser shows no-drop), exactly Diablo's "item won't go in that socket".
function dropAccepts(targetKind, dragKind) {
  if (targetKind === dragKind) return true;
  var wk = { weapon: 1, primaryweapon: 1 };   // both draw on the WEAPONS table - a gun fits any gun socket
  return !!(wk[targetKind] && wk[dragKind]);
}
function clearDropHl() { if (EB._hl) { try { EB._hl.style.outline = ''; } catch (e) {} EB._hl = null; } }
function dropTargetOf(ev, dragKind) {
  var t = ev.target;
  var box = t.closest && t.closest('[data-drop]');
  if (box && dropAccepts(box.getAttribute('data-drop'), dragKind)) return { el: box, type: 'grid', kind: box.getAttribute('data-drop') };
  var mnt = t.closest && t.closest('[data-mount]');
  if (mnt && dropAccepts(mnt.getAttribute('data-mount') === 'weapon' ? 'weapon' : 'gizmo', dragKind))
    return { el: mnt, type: 'mount', kind: mnt.getAttribute('data-mount') };
  return null;
}
function wireDrag() {
  EB.body.addEventListener('dragstart', function (ev) {
    var d = ev.target.closest && ev.target.closest('[data-drag]');
    if (!d) return;
    EB.dragging = d.getAttribute('data-drag');
    try { ev.dataTransfer.setData('text/plain', EB.dragging); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
  });
  EB.body.addEventListener('dragover', function (ev) {
    if (!EB.dragging) return;
    var tgt = dropTargetOf(ev, EB.dragging.split('|')[0]);
    clearDropHl();
    if (tgt) { ev.preventDefault(); if (tgt.el && tgt.el.style) { tgt.el.style.outline = '2px solid #46d6ff'; EB._hl = tgt.el; } }
  });
  EB.body.addEventListener('drop', function (ev) {
    if (!EB.dragging) return;
    var parts = (EB.dragging || '').split('|'), dragKind = parts[0], key = parts[1];
    var tgt = dropTargetOf(ev, dragKind);
    clearDropHl(); EB.dragging = null;
    if (!tgt || !key) return;
    ev.preventDefault();
    var h = HOST(); if (!h) return;
    if (tgt.type === 'grid') {
      var def = gridSlotDefs(h).filter(function (d) { return d.kind === tgt.kind; })[0];
      if (def && def.cmd) h.runCmd(def.cmd + ' ' + key);
    } else {
      h.runCmd((tgt.kind === 'weapon' ? 'hardpoint' : 'gizmo') + ' mount ' + key);
    }
    EB.gridPick = null; EB.pickIdx = null; EB.pickType = null;
    render();
  });
  EB.body.addEventListener('dragend', function () { clearDropHl(); EB.dragging = null; });
}

function build() {
  if (EB.mounted) return;
  var d = doc(); if (!d) return;
  var backdrop = el('div', 'position:fixed;inset:0;z-index:' + CFG.Z + ';display:none;align-items:center;justify-content:center;' +
    'background:rgba(4,8,14,0.82);pointer-events:auto');
  backdrop.id = 'engbay';
  var frame = el('div', 'position:relative;width:min(1150px,95vw);height:min(780px,92vh);display:flex;flex-direction:column;' +
    'background:#0a1220ee;border:1px solid #22344a;border-radius:10px;padding:14px;font:12px ui-monospace,monospace;box-shadow:0 0 60px rgba(0,0,0,0.7)');
  var head = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex:0 0 auto');
  var title = el('div', 'font-weight:800;color:#8fd0ff;letter-spacing:.04em;font-size:14px', '◈ ENGINEERING BAY - SHIP LAYOUT &amp; FITTING');
  var closeBtn = el('button', 'background:#1c2a3c;border:1px solid #46617e;color:#cfe2f5;border-radius:6px;padding:6px 16px;cursor:pointer;font:12px ui-monospace,monospace;font-weight:700', '✕ CLOSE (E)');
  closeBtn.addEventListener('click', function () { hide(); });
  head.appendChild(title); head.appendChild(closeBtn);
  var body = el('div', 'flex:1 1 auto;overflow-y:auto;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap');
  frame.appendChild(head); frame.appendChild(body);
  backdrop.appendChild(frame);
  backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) hide(); });   // click the dim backdrop (outside the frame) to close, same convention as most fullscreen modals
  (d.body || d.documentElement).appendChild(backdrop);
  EB.root = backdrop; EB.body = body; EB.mounted = true;
  wireClicks();
}

// FULLSCREEN 2026-07-08: self-managed, same pattern as planetmenu.js's own pmRoot - no PANELS involvement (a
// fullscreen modal doesn't have an edge/pin/resize-grip concept to opt into).
function show() {
  build();
  if (EB.root) EB.root.style.display = 'flex';
  EB.shown = true; render();
  clearInterval(EB.pollT); EB.pollT = setInterval(function () { if (EB.shown && !EB.dragging) render(); }, CFG.POLL_MS);
}
function hide() {
  if (EB.root) EB.root.style.display = 'none';
  EB.shown = false; clearInterval(EB.pollT); EB.pollT = null;
}
function toggle() { if (EB.shown) hide(); else show(); return EB.shown; }
function visible() { return EB.shown; }
function setShown(v) { EB.shown = !!v; if (EB.shown) { render(); clearInterval(EB.pollT); EB.pollT = setInterval(function () { if (EB.shown && !EB.dragging) render(); }, CFG.POLL_MS); } else { clearInterval(EB.pollT); EB.pollT = null; } }

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
  var fakeShip = { hullClass: 'interceptor', docked: { name: 'Test Base' }, credits: 5000, gizmoSlots: [null, null, null], weaponSlots: [null, null], weaponType: 'energy', shieldFwd: 15, shieldAft: 8, shieldDivert: 'fwd' };
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
    shieldArcsOf: function (s) { s = s || fakeShip; return { fwd: s.shieldFwd, aft: s.shieldAft, max: 20 }; },
    shieldDivertOf: function (s) { s = s || fakeShip; return s.shieldDivert || null; },
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
  // ---- shield arcs (task #83): fwd 15/20=75%, aft 8/20=40%, both driven by the REAL HOST.shieldArcsOf pool -------
  check('shield arc bright dasharray reflects fwd charge (15/20=75%)', EB.body._html.indexOf('stroke-dasharray="75 100"') >= 0);
  check('shield arc bright dasharray reflects aft charge (8/20=40%)', EB.body._html.indexOf('stroke-dasharray="40 100"') >= 0);
  check('shield readout line shows real fwd/aft numeric values', EB.body._html.indexOf('FWD 15/20') >= 0 && EB.body._html.indexOf('AFT 8/20') >= 0);
  check('shield readout shows the active divert mode', EB.body._html.indexOf('diverting to fwd') >= 0);
  check('shield arcs update live when charge changes', (function () {
    fakeShip.shieldFwd = 20; render();
    var updated = EB.body._html.indexOf('stroke-dasharray="100 100"') >= 0 && EB.body._html.indexOf('FWD 20/20') >= 0;
    fakeShip.shieldFwd = 15; render();
    return updated;
  })());
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
