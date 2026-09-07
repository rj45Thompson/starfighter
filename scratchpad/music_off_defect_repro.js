// music_off_defect_repro.js - REPRODUCES a player-facing defect in the other lane's "Music OFF by default"
// commit (1abbd66, 2026-09-07): CFG.MUSIC_ON=false gates the .ogg bed (index.html:6775 SOUND.playMusic) but
// NOT the F67 adaptive SYNTH score (window.MUSIC / music.js), which auto-starts on the first gesture via its
// OWN arm()/go()->start() chain (music.js:337-346), ungated by CFG.MUSIC_ON (grep MUSIC_ON music.js = 0 hits).
// So after "music OFF" the first keypress/click STILL starts the 5-layer synth score. This models the
// arm/go structure VERBATIM (music.js:337-345) with a stub start() to isolate the GATING, and shows a
// one-line fix that closes it. NOT A FIX (other lane's live feature + browser-bound audio) - a reproduction.
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// a tiny window with gesture dispatch, standing in for the browser
function makeWindow(MUSIC_ON) {
  const listeners = {};
  return {
    CFG: { MUSIC_ON },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn); },
    dispatch(type) { (listeners[type] || []).slice().forEach(f => f()); },
  };
}

// ---- CURRENT music.js (VERBATIM arm/go, music.js:337-345; start() stubbed to a flag) ----
function armCurrent(win, synth) {
  function start() { synth.started = true; }                 // real start() (:287) fires the note scheduler + poller
  function arm() {
    var go = function () {
      start();                                                // <-- music.js:339, NO CFG.MUSIC_ON check
      win.removeEventListener('pointerdown', go, true);
      win.removeEventListener('keydown', go, true);
    };
    win.addEventListener('pointerdown', go, true);
    win.addEventListener('keydown', go, true);
  }
  arm();                                                      // music.js:346 auto-runs on load
}

// ---- the DEFECT: with MUSIC_ON=false, the first gesture STILL starts the synth ----
const winOff = makeWindow(false);
const synth = { started: false };
armCurrent(winOff, synth);
check('[repro] before any gesture the synth has not started', synth.started === false);
winOff.dispatch('keydown');                                   // the player presses a key (e.g. thrust)
check('[DEFECT] with MUSIC_ON=false the first keypress STILL starts the synth score', synth.started === true);
// (in the live game: MUSIC.debug() would then report started:true with layer gains > 0 - audible music)

// ---- the FIX direction (gate go on window.CFG.MUSIC_ON; CFG exists by gesture time) ----
function armFixed(win, synth) {
  function start() { synth.started = true; }
  function arm() {
    var go = function () {
      if (!(win.CFG && win.CFG.MUSIC_ON)) { win.removeEventListener('keydown', go, true); win.removeEventListener('pointerdown', go, true); return; }  // <-- the one-line gate
      start();
      win.removeEventListener('pointerdown', go, true);
      win.removeEventListener('keydown', go, true);
    };
    win.addEventListener('pointerdown', go, true);
    win.addEventListener('keydown', go, true);
  }
  arm();
}
const winFixOff = makeWindow(false); const synthFix = { started: false };
armFixed(winFixOff, synthFix); winFixOff.dispatch('keydown');
check('[fix] gating go on CFG.MUSIC_ON keeps the synth OFF when music is off', synthFix.started === false);
const winFixOn = makeWindow(true); const synthOn = { started: false };
armFixed(winFixOn, synthOn); winFixOn.dispatch('keydown');
check('[fix] and it still plays when MUSIC_ON=true (a switch, not a removal)', synthOn.started === true);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'DEFECT REPRODUCED (all checks pass)' : 'FAIL'));
if (fail > 0) process.exit(1);
