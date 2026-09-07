// f64_rebind_replay.js - settles genre cell F64 "the player can rebind controls" (anchor: a 2026-09-06
// code read - "KB_ACTIONS lists 7 rebindable actions; window._rebindCapture grabs the next keypress").
// Verdict: YES. A 2nd independent read that CONFIRMS the seed and adds what it did not measure: the rebinds
// PERSIST across sessions (localStorage SF_CONTROLS_v1) and an ARROW/right-Shift fallback can never be
// rebound away, so a bad rebind cannot lock you out. wStats-style: the persistence + fallback logic is pure,
// so this SLICES KB_DEFAULT/KEYBIND/loadControls/saveControls/flightBound from index.html and drives them on
// a localStorage stub; the keydown-capture + panel DOM (need the browser) are asserted structurally.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

// slice KB_DEFAULT(6857) .. flightBound(6864) - the controls state + persistence + fallback
const src = lines.slice(6856, 6864).join('\n');
if (!/const KB_DEFAULT=/.test(src) || !/function loadControls\(\)/.test(src) || !/function flightBound\(code\)/.test(src)) { console.error('FAIL: keybind slice moved'); process.exit(2); }
const store = {};
const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const M = new Function('localStorage', src + '\n;return { KB_ACTIONS, loadControls, saveControls, flightBound, getKB:()=>KEYBIND, setKB:(k,v)=>{KEYBIND[k]=v} };')(localStorage);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F64 rebind replay - real KEYBIND/loadControls/saveControls/flightBound sliced from index.html\n');

// (1) the rebindable action set
const acts = M.KB_ACTIONS.map(a => a[0]);
console.log('  KB_ACTIONS: ' + acts.join(', '));
ok('7 rebindable flight actions (thrust/pitch up+down/yaw left+right/boost/fire)', M.KB_ACTIONS.length === 7 && ['thrust', 'pitchDown', 'pitchUp', 'yawLeft', 'yawRight', 'nitro', 'fire'].every(a => acts.includes(a)));
ok('defaults are seeded (thrust=Space, fire=KeyF)', M.getKB().thrust === 'Space' && M.getKB().fire === 'KeyF');

// (2) a rebind PERSISTS across a session reload (localStorage SF_CONTROLS_v1)
M.setKB('fire', 'KeyJ'); M.saveControls();
console.log('  after rebind fire->KeyJ + save, localStorage holds: ' + (store['SF_CONTROLS_v1'] || '(nothing)'));
ok('saveControls writes the binding to localStorage SF_CONTROLS_v1', /"fire":"KeyJ"/.test(store['SF_CONTROLS_v1'] || ''));
M.setKB('fire', 'KeyZ');                 // clobber in memory - a reload would lose this unless it re-reads storage
M.loadControls();                        // simulate the next session's boot load
ok('loadControls restores the SAVED rebind (fire=KeyJ), not the clobber -> rebinds persist', M.getKB().fire === 'KeyJ');
ok('unchanged actions keep their default after load (thrust still Space) - merged over KB_DEFAULT', M.getKB().thrust === 'Space');

// (3) the un-rebindable ARROW / right-Shift fallback can never be lost
ok('a bound key reads as flight-bound (thrust=Space)', M.flightBound('Space') === true);
ok('the ARROW keys + right-Shift are ALWAYS flight-bound (fallback), even though not in KEYBIND', M.flightBound('ArrowUp') && M.flightBound('ArrowLeft') && M.flightBound('ShiftRight'));
ok('an unbound key is not flight-bound', M.flightBound('KeyQ') === false);
// rebind every action onto one key -> arrows still work (a bad rebind cannot brick flying)
['thrust', 'pitchDown', 'pitchUp', 'yawLeft', 'yawRight', 'nitro', 'fire'].forEach(a => M.setKB(a, 'KeyP'));
ok('even after rebinding EVERY action onto one key, the arrow fallback still flies', M.flightBound('ArrowUp') && M.flightBound('ArrowDown') && M.flightBound('ArrowLeft') && M.flightBound('ArrowRight'));

// (4) structural: the capture mechanism + the panel UI + the card generated from live bindings
ok('a keydown routes to window._rebindCapture while a rebind is armed (grabs the next key)', /addEventListener\('keydown',e=>\{ if\(window\._rebindCapture\)\{ window\._rebindCapture\(e\); return; \}/.test(IDX));
ok('the options panel lists FLIGHT KEYS with "click to rebind" + an .awaiting state', /FLIGHT KEYS <span[^>]*>· click to rebind/.test(IDX) && /\.kb-key\.awaiting\{/.test(IDX));
ok('the FIRST FLIGHT help card is GENERATED FROM the live KEYBIND (never drifts)', /keyLabel\(KEYBIND\.thrust\)/.test(IDX) && /keyLabel\(KEYBIND\.fire\)/.test(IDX));
ok('Esc cancels an in-progress rebind', /Esc cancels a rebind/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F64 yes: 7 rebindable flight actions captured from the next keypress, PERSISTED to localStorage (round-trip verified), with an un-rebindable arrow/right-Shift fallback so a bad rebind cannot lock you out, an Esc cancel, and a help card generated from the live bindings - confirms + extends the seed to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
