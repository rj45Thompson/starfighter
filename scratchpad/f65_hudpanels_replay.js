// f65_hudpanels_replay.js - settles genre cell F65 "the player can rearrange, resize or hide HUD panels"
// (anchor: genre_matrix seed "WINDOWS menu shows/hides any panel; UC-602 per-panel transparency; panels.js
// drags, resizes and redocks"). Verdict: YES. A 2nd independent read confirming the seed via the mechanism.
// panels.js is a browser IIFE (DOM/mouse), so PART A asserts its wiring; PART B drives the REAL HUD_WIN
// inset show/hide persistence, extracted verbatim from index.html and run on a localStorage stub.
//   REARRANGE: panels.js drag (startDrag) + redock() to the nearest screen edge past DRAG_THRESHOLD.
//   RESIZE:    a corner RESIZE_GRIP + RESIZE_EDGE strips; the dragged w/h persist.
//   HIDE:      a close button + always-visible EDGE TAB + a PIN/auto-hide toggle, and the always-visible
//              WINDOWS menu (built from PANELS.list()) toggles every registered panel + the GL insets.
//   TRANSPARENCY: a per-panel opacity slider (setOpacity), UC-602.
//   PERSISTS:  {pinned, open, opacity} (+ dragged w/h) per id to localStorage SF_PANELS_v3; the GL insets'
//              show/hide to SF_WINDOWS_v1.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PJ = fs.readFileSync(path.join(ROOT, 'panels.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F65 HUD-panels replay - panels.js + WINDOWS menu wiring, HUD_WIN persistence driven\n');

// ---- PART A: panels.js mechanism ----
ok('panels.js exports the PANELS API on window', /window\.PANELS\s*=\s*api/.test(PJ));
ok('the API can open/close/toggle/list panels + report isOpen', /function toggle\(id\)/.test(PJ) && /function isOpen\(id\)/.test(PJ) && /function list\(\)/.test(PJ) && /function setOpen\(rec, ?open\)/.test(PJ));
ok('REARRANGE: a drag redocks a panel to the nearest screen edge past DRAG_THRESHOLD', /function redock\(rec/.test(PJ) && /nearestEdge\(/.test(PJ) && /DRAG_THRESHOLD/.test(PJ));
ok('RESIZE: a corner grip + edge strips (RESIZE_GRIP / RESIZE_EDGE)', /RESIZE_GRIP:/.test(PJ) && /RESIZE_EDGE:/.test(PJ) && /nwse-resize/.test(PJ));
ok('HIDE: a PIN toggle + auto-hide + an always-visible edge tab (no hotkey needed)', /pinned/.test(PJ) && /auto-hide/i.test(PJ) && /edge tab/i.test(PJ));
ok('TRANSPARENCY: a per-panel opacity slider (setOpacity, UC-602)', /function setOpacity\(rec, ?v\)/.test(PJ) && /OP_MIN:/.test(PJ) && /OP_MAX:/.test(PJ));
ok('PERSISTS {pinned,open,opacity} per id to localStorage SF_PANELS_v3', /STORE_KEY:'SF_PANELS_v3'/.test(PJ) && /function persist\(rec\)\{[\s\S]*?pinned:rec\.pinned,\s*open:rec\.open,\s*opacity:rec\.opacity[\s\S]*?save\(\);/.test(PJ) && /localStorage\.setItem\(CFG\.STORE_KEY/.test(PJ));
ok('register() restores the SAVED open/pinned/opacity over the panel defaults', /function register\(id, ?el, ?opts\)/.test(PJ) && /saved\.open!=null\?saved\.open/.test(PJ) && /saved\.opacity!=null\?saved\.opacity/.test(PJ));

// ---- PART A2: the WINDOWS menu (index.html) ----
ok('an always-visible WINDOWS button lists every registered panel from PANELS.list()', /▤ WINDOWS/.test(IDX) && /PANELS\.list\(\)/.test(IDX) && /data-panel=/.test(IDX));
ok('the menu also toggles the two GL insets + the power dock (HUD_WIN), persisted to SF_WINDOWS_v1', /const HUD_WIN=\(function\(\)\{/.test(IDX) && /localStorage\.setItem\('SF_WINDOWS_v1'/.test(IDX) && /if\(HUD_WIN\.top\) renderView\(VIEW\.top/.test(IDX));

// ---- PART B: DRIVE the real HUD_WIN inset show/hide persistence ----
// extract the loader IIFE body + saveWin body verbatim from index.html, run them on a localStorage stub
const loaderBody = (IDX.match(/const HUD_WIN=\(function\(\)\{([\s\S]*?)\}\)\(\);/) || [])[1];
const saverBody = (IDX.match(/function saveWin\(\)\s*\{(.*)\}\s*$/m) || [])[1];
if (!loaderBody || !saverBody) { console.error('FAIL: HUD_WIN loader/saver extraction moved'); process.exit(2); }
const store = {};
const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const loadWin = new Function('localStorage', loaderBody);                 // returns d (the merged HUD_WIN)
const saveWin = new Function('localStorage', 'HUD_WIN', saverBody);       // writes SF_WINDOWS_v1

const fresh = loadWin(localStorage);
ok('fresh load (empty storage) -> all insets visible {top,brain,power}=true', fresh.top === true && fresh.brain === true && fresh.power === true);
fresh.top = false;                       // player hides the top-down radar inset via the WINDOWS menu
saveWin(localStorage, fresh);
console.log('  after hiding the top inset + save, SF_WINDOWS_v1 = ' + store['SF_WINDOWS_v1']);
ok('saveWin persists the hidden state to localStorage SF_WINDOWS_v1', /"top":false/.test(store['SF_WINDOWS_v1'] || ''));
const reloaded = loadWin(localStorage);
ok('a reload RESTORES the hidden inset (top:false persists across sessions)', reloaded.top === false && reloaded.brain === true && reloaded.power === true);
// a partial save merges over the defaults (a missing key stays visible, not undefined)
store['SF_WINDOWS_v1'] = '{"brain":false}';
const partial = loadWin(localStorage);
ok('a partial save merges over defaults (brain:false honoured, top/power fall back to true)', partial.brain === false && partial.top === true && partial.power === true);

console.log('\nRESULT: ' + (pass
  ? 'PASS - F65 yes: panels.js drags/redocks (rearrange), grip+edge resizes, pin/auto-hide/edge-tab + the always-visible WINDOWS menu hides, and a per-panel opacity slider - all persisted (SF_PANELS_v3); the GL-inset show/hide persistence (SF_WINDOWS_v1) round-trips on the real extracted loader/saver - confirms the seed to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
