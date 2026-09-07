// f01_pilot_replay.js - headless proof of genre F01: THE PLAYER DIRECTLY PILOTS A SINGLE SHIP IN
// REAL TIME. This is not a transcription - it READS index.html, SLICES the real control bytes and
// EXECUTES them, and asserts the real-time wiring is present in the CURRENT source, so a rewrite of
// the piloting path fails this test (it guards the property, it does not just describe it).
//
// The chain proven (all index.html line numbers as of this commit):
//   keydown            :6896  flightBound(code) -> keysDown.add(code); applyKeys()
//   applyKeys          :6865-6872  maps keysDown (rebindable KEYBIND + always-on arrows) -> the
//                                  analog MAN intents thr/yaw/pitch/fire/nitro, and arms manOn()
//   manOn / MAN.active :6806  the human takes the stick (MAN.active=true)
//   frame(now)         :7766  requestAnimationFrame-driven (:7776 re-arm, :7778 kickoff) -> step(dt) :7771
//   step               :2662-2668  for every ship: ONLY ships[0] with MAN.active gets manualControl;
//                                  the other 62 run think() (AI). flyStep runs for EVERYONE every
//                                  frame (real-time physics, comment :2665).
//   manualControl      :6807  writes s.ctrl={thr,pitch,yaw} from MAN (:6808) - analog piloting of the
//                             hull itself, per axis, not click-to-move orders.
//   the SINGLE player  :6579  (function(){ const P=ships[0]; P.role='player'; P.name='YOU'; ... })()
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function check(n, c){ if(c){ pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
function slice(re, label){ const m = SRC.match(re); if(!m){ fail++; console.log('FAIL - could not slice ' + label + ' out of index.html'); return null; } return m[0]; }

// ---------------------------------------------------------------------------------------------
// 1) DRIVE the real applyKeys(): a held key becomes an analog control intent + arms manual control
// ---------------------------------------------------------------------------------------------
const applyKeysSrc = slice(/function applyKeys\(\)\{[\s\S]*?manOn\(\);\s*\}/, 'applyKeys');
const kbDefaultSrc = slice(/KB_DEFAULT=\{[\s\S]*?\};/, 'KB_DEFAULT');
const manSrc       = slice(/const MAN=\{[\s\S]*?\};/, 'MAN literal');

if (applyKeysSrc && kbDefaultSrc && manSrc) {
  const KEYBIND = (new Function('var ' + kbDefaultSrc + ' return KB_DEFAULT;'))();
  check('[keybind] real KB_DEFAULT: thrust=Space, WASD flies, F fires', KEYBIND.thrust==='Space' && KEYBIND.pitchDown==='KeyW' && KEYBIND.pitchUp==='KeyS' && KEYBIND.yawLeft==='KeyA' && KEYBIND.yawRight==='KeyD' && KEYBIND.fire==='KeyF');

  const MAN = (new Function(manSrc + ' return MAN;'))();
  let manOnCalls = 0; function manOn(){ manOnCalls++; MAN.active = true; }
  const keysDown = new Set();
  // materialise the REAL applyKeys bytes with our scope objects closed over as parameters
  const applyKeys = (new Function('keysDown','KEYBIND','MAN','manOn', applyKeysSrc + '\n return applyKeys;'))(keysDown, KEYBIND, MAN, manOn);

  applyKeys();
  check('[idle] no key held -> zero thr/yaw/pitch, manual NOT armed', MAN.thr===0 && MAN.yaw===0 && MAN.pitch===0 && MAN.active===false && manOnCalls===0);

  keysDown.add(KEYBIND.thrust); applyKeys();
  check('[thrust] holding thrust -> MAN.thr=1 AND manOn() armed manual control (human takes the stick)', MAN.thr===1 && MAN.active===true && manOnCalls===1);
  keysDown.delete(KEYBIND.thrust); applyKeys();
  check('[release] releasing thrust -> MAN.thr back to 0 (real-time, not latched)', MAN.thr===0);

  keysDown.add(KEYBIND.yawRight);  applyKeys(); check('[yaw] D -> yaw +1', MAN.yaw===1);   keysDown.delete(KEYBIND.yawRight);
  keysDown.add(KEYBIND.yawLeft);   applyKeys(); check('[yaw] A -> yaw -1', MAN.yaw===-1);  keysDown.delete(KEYBIND.yawLeft);
  keysDown.add(KEYBIND.pitchDown); applyKeys(); check('[pitch] W -> pitch +1 (nose down)', MAN.pitch===1);  keysDown.delete(KEYBIND.pitchDown);
  keysDown.add(KEYBIND.pitchUp);   applyKeys(); check('[pitch] S -> pitch -1 (nose up)', MAN.pitch===-1);   keysDown.delete(KEYBIND.pitchUp);
  keysDown.add(KEYBIND.fire);      applyKeys(); check('[fire] F -> MAN.fire true', MAN.fire===true);        keysDown.delete(KEYBIND.fire);
  applyKeys();
  // the always-on ARROW fallback flies even when nothing is bound to it (a bad rebind can't lock you out)
  keysDown.add('ArrowRight'); applyKeys(); check('[fallback] ArrowRight yaws +1 with no rebind (un-lockout-able fallback)', MAN.yaw===1); keysDown.delete('ArrowRight'); applyKeys();
}

// ---------------------------------------------------------------------------------------------
// 2) DRIVE the real manualControl mapping: MAN intents -> the ship's own per-axis ctrl (analog)
// ---------------------------------------------------------------------------------------------
const manualStart = SRC.indexOf('function manualControl(s,dt){');
const ctrlM = manualStart >= 0 ? SRC.slice(manualStart).match(/s\.ctrl=\{[\s\S]*?\};/) : null;
if (!ctrlM) { fail++; console.log('FAIL - could not slice the s.ctrl mapping out of manualControl'); }
else {
  const ctrlSrc = ctrlM[0];
  const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));   // = T.MathUtils.clamp (index.html:631)
  function driveCtrl(man){ const s={}; (new Function('s','MAN','clamp', ctrlSrc))(s, man, clamp); return s.ctrl; }
  const c1 = driveCtrl({throttle:0, thr:1, mouseThr:false, pitch:1, mousePitch:0, yaw:-1, mouseYaw:0});
  check('[obey] MAN{thr1,pitch1,yaw-1} -> ship.ctrl {thr1,pitch1,yaw-1} (the hull obeys the human, per axis)', c1.thr===1 && c1.pitch===1 && c1.yaw===-1);
  const c2 = driveCtrl({throttle:0, thr:0, mouseThr:false, pitch:5, mousePitch:0, yaw:-9, mouseYaw:0});
  check('[obey] out-of-range intents clamp to a bounded analog stick ([-1,1] / [0,1])', c2.pitch===1 && c2.yaw===-1 && c2.thr>=0 && c2.thr<=1);
  const c3 = driveCtrl({throttle:0.30, thr:0, mouseThr:false, pitch:0, mousePitch:0, yaw:0, mouseYaw:0});
  check('[throttle] a persistent throttle lever holds thrust with no key held (set-it-dont-hold-it)', Math.abs(c3.thr-0.30)<1e-9);
}

// ---------------------------------------------------------------------------------------------
// 3) the real-time / single-ship WIRING is present in the CURRENT source (fails if it is rewritten)
// ---------------------------------------------------------------------------------------------
check('[single] exactly one ship is the player: ships[0].role=player, name YOU (:6579)', /const P=ships\[0\];\s*P\.role='player';\s*P\.name='YOU'/.test(SRC));
check('[dispatch] step() hands ONLY ships[0] (with MAN.active) to manualControl (:2663)', /if\(s===ships\[0\]\s*&&\s*MAN\.active\)\{\s*manualControl\(s,dt\);\s*\}/.test(SRC));
check('[ai-others] non-player ships run think() (AI) - so only ONE ship is human-piloted (:2667)', /think\(s,s\._thinkAcc\)/.test(SRC));
check('[realtime] frame(now) is requestAnimationFrame-driven and calls step(dt) (:7766/:7771/:7776)', /function frame\(now\)\{/.test(SRC) && /requestAnimationFrame\(frame\)/.test(SRC) && /\bstep\(dt\);/.test(SRC));
check('[everyframe] flyStep(s,dt) integrates every ship every frame (real-time physics :2668)', /flyStep\(s,dt\);/.test(SRC));
check('[input] a flight keydown feeds keysDown then applyKeys() (:6896)', /keysDown\.add\(e\.code\);\s*applyKeys\(\)/.test(SRC));

console.log('---');
console.log('TOTAL: ' + (pass+fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail===0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
