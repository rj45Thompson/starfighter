// f09_flight3d_replay.js - settle F09 "flight is full 3D with pitch, yaw AND roll rather than a fixed
// plane" (anchor 4/8; ours=partial, read once on 2026-09-06 = anchors=1). This is the 2nd independent
// read, RUN not just asserted, and a SKEPTICAL mis-grade check that RESOLVES: partial is CORRECT.
//
// FINDING (both halves measured):
//   FULL 3D, NOT a fixed plane  -> YES. flyStep (index.html:2585-2589) rotates the ship's quaternion
//     about its RIGHT axis by ctrl.pitch (:2586) and its UP axis by -ctrl.yaw (:2587), then thrusts along
//     FWD*quat (:2589). Pitch+yaw with no plane constraint: the nose reaches any direction on the sphere.
//   pitch + yaw + ROLL          -> roll is NOT a player axis. The control vector is s.ctrl={thr,pitch,yaw}
//     (:1271,:2512,:6823) - no roll term; KB_DEFAULT (:6872) binds thrust/pitch/yaw/nitro/fire - no roll
//     key; CFG has PITCH_RATE+YAW_RATE but no ROLL_RATE (:382). s.bank (:2588) is a COSMETIC auto-roll
//     lerped from -ctrl.yaw (banks INTO a turn) and applied ONLY to the visual mesh quaternion (:2618
//     s.mesh.quaternion.copy(s.quat).multiply(bank)), never to s.quat (the physics heading).
//   => partial: full-3D movement + 2 of 3 rotational axes (pitch, yaw); roll is cosmetic bank only.
//      More than a fixed plane (not "no"); less than Elite/X 6DOF pitch/yaw/roll (not "yes").
//
// The RUN below replicates flyStep's EXACT rotation sequence (pitch about RGT, yaw about UPL, body-frame
// right-multiply, the -yaw sign) with a minimal quaternion, using the REAL rates + axes parsed from
// index.html. index.html read-only.
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- parse the REAL rates + axes from source (drift-sensitive) ----
function cfgNum(k) { const m = SRC.match(new RegExp(k + ':\\s*([0-9.]+)')); return m ? Number(m[1]) : NaN; }
const PITCH_RATE = cfgNum('PITCH_RATE'), YAW_RATE = cfgNum('YAW_RATE'), BANK_MAX = cfgNum('BANK_MAX');
const axM = SRC.match(/const FWD=new T\.Vector3\(([-\d,]+)\)[^;]*UPL=new T\.Vector3\(([-\d,]+)\)[^;]*RGT=new T\.Vector3\(([-\d,]+)\)/);
const FWD = axM[1].split(',').map(Number), UPL = axM[2].split(',').map(Number), RGT = axM[3].split(',').map(Number);
check('rates + axes parsed from source (PITCH_RATE/YAW_RATE/BANK_MAX, FWD/UPL/RGT)',
  [PITCH_RATE, YAW_RATE, BANK_MAX].every(x => !isNaN(x)) && FWD.join() === '0,0,-1' && UPL.join() === '0,1,0' && RGT.join() === '1,0,0');
check('CFG defines PITCH_RATE and YAW_RATE but NO ROLL_RATE (roll is not a control rate)',
  /PITCH_RATE:/.test(SRC) && /YAW_RATE:/.test(SRC) && !/ROLL_RATE/.test(SRC));

// ---- minimal quaternion (standard formulas; matches THREE's setFromAxisAngle/multiply/applyQuaternion) ----
const qAA = (ax, a) => { const h = a / 2, s = Math.sin(h); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(h)]; };
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qNorm = q => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
const qApply = (q, v) => { const [x, y, z, w] = q, [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]; };

// replicate flyStep's rotation: s.quat.multiply(pitch about RGT); s.quat.multiply(yaw about UPL, -yaw sign)
function makeShip() { return { quat: [0, 0, 0, 1] }; }
function fly(s, pitch, yaw, dt) {
  s.quat = qMul(s.quat, qAA(RGT, pitch * PITCH_RATE * dt));       // :2586 s.quat.multiply(setFromAxisAngle(RGT, ctrl.pitch*RATE*dt))
  s.quat = qNorm(qMul(s.quat, qAA(UPL, -yaw * YAW_RATE * dt)));    // :2587 s.quat.multiply(setFromAxisAngle(UPL, -ctrl.yaw*RATE*dt))
}
const fwdOf = s => qApply(s.quat, FWD);

// ---- RUN 1: baseline nose points along FWD ----
let s = makeShip(); let f = fwdOf(s);
check('baseline: nose points along FWD (0,0,-1)', Math.abs(f[0]) < 1e-9 && Math.abs(f[1]) < 1e-9 && Math.abs(f[2] + 1) < 1e-9);

// ---- RUN 2: PITCH is a real 3D axis - holding pitch lifts the nose OUT of the horizontal plane ----
s = makeShip(); for (let i = 0; i < 30; i++) fly(s, 1, 0, 1 / 60); f = fwdOf(s);
check('pitch-up lifts the nose above the horizontal plane (fwd.y ' + f[1].toFixed(3) + ' > 0) - vertical steering, not a fixed plane', f[1] > 0.1);

// ---- RUN 3: YAW turns the nose horizontally ----
s = makeShip(); for (let i = 0; i < 30; i++) fly(s, 0, 1, 1 / 60); f = fwdOf(s);
check('yaw turns the nose sideways (fwd.x ' + f[0].toFixed(3) + ' != 0) while level (|fwd.y| ~ 0)', Math.abs(f[0]) > 0.1 && Math.abs(f[1]) < 1e-6);

// ---- RUN 4: PITCH then YAW -> the nose points OFF every axis-plane (genuinely full 3D) ----
s = makeShip(); for (let i = 0; i < 25; i++) fly(s, 1, 0, 1 / 60); for (let i = 0; i < 25; i++) fly(s, 0, 1, 1 / 60); f = fwdOf(s);
check('pitch THEN yaw -> nose has all three components non-trivial (' + f.map(v => v.toFixed(2)).join(',') + ') = NOT a fixed plane',
  Math.abs(f[0]) > 0.05 && Math.abs(f[1]) > 0.05 && Math.abs(f[2]) > 0.05);

// ---- RUN 5: sustained pitch loops the nose toward straight UP - no plane lock on the pitch axis ----
s = makeShip(); for (let i = 0; i < 55; i++) fly(s, 1, 0, 1 / 60); f = fwdOf(s);
check('sustained pitch reaches near-vertical (fwd.y ' + f[1].toFixed(3) + ' > 0.9) - the ship can loop, no plane constraint', f[1] > 0.9);

// ---- SOURCE: roll is NOT a control axis (the reason it is partial, not yes) ----
check('[roll-absent] the control vector is s.ctrl={thr,pitch,yaw} - no roll term (:1271/:2512/:6823)',
  /ctrl:\{thr:0,pitch:0,yaw:0\}/.test(SRC) && /s\.ctrl=\{\s*thr:[^}]*pitch:[^}]*yaw:[^}]*\}/.test(SRC) && !/ctrl.*\broll:/.test(SRC));
const kbM = SRC.match(/const KB_DEFAULT=\{[^}]*\}/);
check('[roll-absent] KB_DEFAULT binds thrust/pitch/yaw/nitro/fire - NO roll key (:6872)',
  !!kbM && /pitchDown/.test(kbM[0]) && /yawLeft/.test(kbM[0]) && !/roll/i.test(kbM[0]));

// ---- SOURCE: flyStep applies pitch about RGT + yaw about UPL to the PHYSICS quat (full-3D orientation) ----
check('[full-3d] flyStep rotates s.quat about RGT (pitch) and UPL (yaw) (:2586-2587)',
  /setFromAxisAngle\(RGT,s\.ctrl\.pitch\*CFG\.PITCH_RATE/.test(SRC) && /setFromAxisAngle\(UPL,-s\.ctrl\.yaw\*CFG\.YAW_RATE/.test(SRC));

// ---- SOURCE: s.bank is a COSMETIC roll (from yaw) applied ONLY to the visual mesh, never to s.quat ----
check('[cosmetic-roll] s.bank is lerped from -ctrl.yaw (banks into a turn) (:2588)',
  /s\.bank=lerp\(s\.bank,-s\.ctrl\.yaw\*CFG\.BANK_MAX/.test(SRC));
check('[cosmetic-roll] bank is applied to s.mesh.quaternion only, built from s.quat - physics heading unaffected (:2618)',
  /setFromAxisAngle\(FWD,s\.bank\)/.test(SRC) && /s\.mesh\.quaternion\.copy\(s\.quat\)\.multiply\(_q\)/.test(SRC));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (F09 = partial: full-3D pitch+yaw, roll is cosmetic bank only)');
process.exit(fail === 0 ? 0 : 1);
