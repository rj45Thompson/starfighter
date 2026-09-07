// f02_inertia_replay.js - settle F02 "ship movement carries momentum or inertia rather than instant-stop
// arcade handling" (ours=yes on a single code read 2026-09-06 = anchors=1, NEVER run). This is the 2nd
// independent read, RUN not just read: it replicates flyStep's real velocity integration with the real
// CFG constants and measures the COAST. F02 = yes, confirmed.
//
// flyStep (index.html:2585-2603): thrust ACCUMULATES into velocity (:2595 s.vel.addScaledVector(fwd,
// THRUST*...*s.ctrl.thr*dt) - note *s.ctrl.thr, so it only adds while thrusting), DRAG decays velocity
// EXPONENTIALLY every frame (:2601 s.vel.multiplyScalar(Math.exp(-CFG.DRAG*dt))), VMAX clamps top speed
// (:2602), and position INTEGRATES from velocity (:2603 s.pos.addScaledVector(s.vel,dt)). So releasing
// thrust does NOT stop the ship - velocity persists and decays smoothly (half-life ln2/DRAG ~ 1s) while
// the hull keeps coasting forward. That is momentum/inertia, the opposite of instant-stop arcade handling.
// For a stock ship every thrust/vmax multiplier (engine lvl, skills, hull, series, nitro) is 1, so the
// base integration below is faithful. index.html read-only.
'use strict';
const fs = require('fs'), path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- parse the REAL flight constants ----
const cfgNum = k => { const m = IDX.match(new RegExp(k + ':\\s*([0-9.]+)')); return m ? +m[1] : NaN; };
const THRUST = cfgNum('THRUST'), DRAG = cfgNum('DRAG'), VMAX = cfgNum('VMAX');
check('parsed CFG flight constants (THRUST=' + THRUST + ', DRAG=' + DRAG + ', VMAX=' + VMAX + ')', !isNaN(THRUST) && !isNaN(DRAG) && !isNaN(VMAX) && DRAG > 0);

// ---- source-assert the integration structure (drift-sensitive) ----
check('[thrust] velocity ACCUMULATES from thrust only while thrusting (s.ctrl.thr) (:2595)', /s\.vel\.addScaledVector\(fwd,CFG\.THRUST\*[^;]*\*s\.ctrl\.thr\*dt\)/.test(IDX));
check('[drag] velocity decays EXPONENTIALLY every frame: s.vel.multiplyScalar(Math.exp(-CFG.DRAG*dt)) (:2601)', /s\.vel\.multiplyScalar\(Math\.exp\(-CFG\.DRAG\*dt\)\)/.test(IDX));
check('[vmax] top speed is clamped: if(s.vel.length()>vmax) s.vel.setLength(vmax) (:2602)', /if\(s\.vel\.length\(\)>vmax\)\s*s\.vel\.setLength\(vmax\)/.test(IDX));
check('[position] position INTEGRATES from velocity: s.pos.addScaledVector(s.vel,dt) (:2603)', /s\.pos\.addScaledVector\(s\.vel,dt\)/.test(IDX));

// ---- RUN the real integration (stock ship: every thrust/vmax multiplier is 1) ----
const dt = 1 / 60;
function sim(thrustFrames, coastFrames) {
  let vel = 0, pos = 0; const trace = [];
  for (let i = 0; i < thrustFrames; i++) { vel += THRUST * 1 * dt; vel *= Math.exp(-DRAG * dt); if (vel > VMAX) vel = VMAX; pos += vel * dt; }
  const vAtRelease = vel; const posAtRelease = pos;
  for (let i = 0; i < coastFrames; i++) { /* thr=0, no thrust term */ vel *= Math.exp(-DRAG * dt); if (vel > VMAX) vel = VMAX; pos += vel * dt; trace.push(vel); }
  return { vAtRelease, posAtRelease, velAfterCoast: vel, coastDistance: pos - posAtRelease, trace };
}

// thrust for 2s, then coast for 1s
const r = sim(120, 60);
check('thrusting builds up real speed (v at release ' + r.vAtRelease.toFixed(2) + ' > 0, near VMAX ' + VMAX + ')', r.vAtRelease > VMAX * 0.9);

// the crux: after releasing thrust, velocity PERSISTS and decays exponentially - it does NOT snap to 0
const expected1s = r.vAtRelease * Math.exp(-DRAG * 1);
check('after 1s of COAST, velocity persists and matches the exp(-DRAG*t) decay (' + r.velAfterCoast.toFixed(3) + ' ~= ' + expected1s.toFixed(3) + ')', Math.abs(r.velAfterCoast - expected1s) < 0.05);
check('that is NOT instant-stop: ~' + Math.round(100 * r.velAfterCoast / r.vAtRelease) + '% of speed REMAINS after 1s (an arcade instant-stop would be 0%)', r.velAfterCoast > 0.4 * r.vAtRelease);
check('the ship COASTS a real distance forward after thrust is released (' + r.coastDistance.toFixed(1) + ' units in 1s)', r.coastDistance > 10);
check('velocity is monotonically DECREASING during the coast (a smooth glide, not a snap)', r.trace.every((v, i) => i === 0 || v < r.trace[i - 1]));

// VMAX clamp holds under sustained thrust
const long = sim(600, 0);
check('sustained thrust clamps at VMAX (' + long.vAtRelease.toFixed(3) + ' == ' + VMAX + ')', Math.abs(long.vAtRelease - VMAX) < 1e-6);

// half-life sanity: with DRAG=0.7, speed halves in ~ln2/DRAG seconds
const halfLife = Math.log(2) / DRAG;
check('drag half-life is ~' + halfLife.toFixed(2) + 's (a gentle glide, ' + (halfLife > 0.5 ? '>0.5s' : '') + ') - momentum you must fly against, not instant handling', halfLife > 0.5);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (F02 = yes: velocity accumulates + drag-decays + coasts; not instant-stop)');
process.exit(fail === 0 ? 0 : 1);
