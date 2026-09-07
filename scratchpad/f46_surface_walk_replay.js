// f46_surface_walk_replay.js - settles genre cell F46 "player can leave the ship and move on a
// planetary surface." LEAVE is a code read (dock -> `land` command index.html:4788 -> AWAY.enter ->
// on foot; `launch` returns). MOVE is measured here: it slices the REAL first-person movement
// integrator out of ground.js (the WASD->wishDir->vel->cam.position + jump + gravity + collision +
// ground-clamp portion of update(), lines 282-317, closed off before the head-bob/entity tail) and
// drives it on flat open ground to show the player actually walks, runs faster, jumps ~1.2m, and is
// stopped by a wall.
const fs = require('fs');
const path = require('path');
const G = fs.readFileSync(path.join(__dirname, '..', 'ground.js'), 'utf8');
const lines = G.split(/\r?\n/);

// CFG movement constants, parsed from ground.js
const grab = (k) => +G.match(new RegExp(k + ':\\s*([0-9.]+)'))[1];
const CFG = { WALK: grab('WALK'), RUN: grab('RUN'), ACCEL: grab('ACCEL'), FRICTION: grab('FRICTION'),
              GRAVITY: grab('GRAVITY'), JUMP: grab('JUMP'), EYE: grab('EYE'), SIZE: grab('SIZE') };

// slice the movement portion of update(): line 282 (`function update(dt) {`) .. 317 (ground-clamp end)
const moveSrc = lines.slice(281, 317).join('\n') + '\n}';   // 1-indexed 282..317, closed
if (!/function update\(dt\)/.test(moveSrc) || !/S\.onGround = true/.test(moveSrc)) {
  console.error('FAIL: update() movement slice (282-317) moved'); process.exit(2);
}
let BLOCK = () => false;                    // collision oracle (open field by default)
function blocked(x, z, y) { return BLOCK(x, z, y); }
// the sliced source defines `update` referencing S/CFG/blocked from its scope; bind a fresh one per fixture
function makeUpdate(S) { return new Function('S', 'CFG', 'blocked', moveSrc + '\n;return update;')(S, CFG, blocked); }

function fresh() {
  return { built: true, t: 0, yaw: 0, pitch: 0, onGround: true, keys: new Set(),
           vel: { x: 0, y: 0, z: 0 }, cam: { position: { x: 0, y: CFG.EYE, z: 13 } }, height: () => 0 };
}
function run(S, frames) { const up = makeUpdate(S); for (let i = 0; i < frames; i++) up(1 / 60); return S; }

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F46 surface-walk replay - real ground.js movement integrator (update() :282-317)\n');
console.log(`  CFG: WALK ${CFG.WALK} RUN ${CFG.RUN} JUMP ${CFG.JUMP} GRAVITY ${CFG.GRAVITY} EYE ${CFG.EYE}\n`);

// A) WALK forward (KeyW) - at yaw 0 forward is -Z, so cam.position.z decreases
let s = fresh(); s.keys.add('KeyW'); const z0 = s.cam.position.z; run(s, 60);
const walked = z0 - s.cam.position.z;
console.log(`  walk 1s (KeyW): z ${z0} -> ${s.cam.position.z.toFixed(2)}  (moved ${walked.toFixed(2)}m forward)`);
ok('KeyW moves the player forward on the surface (>3m in 1s)', walked > 3);

// B) RUN (Shift) is faster than WALK over the same time
let sr = fresh(); sr.keys.add('KeyW'); sr.keys.add('ShiftLeft'); run(sr, 60);
const ran = z0 - sr.cam.position.z;
console.log(`  run  1s (Shift+KeyW): moved ${ran.toFixed(2)}m  (RUN ${CFG.RUN} > WALK ${CFG.WALK})`);
ok('Shift runs FASTER than walking', ran > walked);

// C) JUMP: Space while onGround -> rises then gravity pulls back to ground; apex ~ JUMP^2/(2*GRAVITY)
let sj = fresh(); sj.keys.add('Space');
const up = makeUpdate(sj); let apex = 0;
for (let i = 0; i < 120; i++) { up(1 / 60); apex = Math.max(apex, sj.cam.position.y - CFG.EYE); }
const analytic = CFG.JUMP * CFG.JUMP / (2 * CFG.GRAVITY);
console.log(`  jump (Space): apex ${apex.toFixed(2)}m above ground (analytic ${analytic.toFixed(2)}m); back onGround=${sj.onGround}`);
ok('jump rises ~1.0-1.3m then lands (onGround true again)', apex > 1.0 && apex < 1.4 && sj.onGround === true);

// D) COLLISION: a wall at z<=-5 stops forward progress (blocked gates the z-move)
BLOCK = (x, z, y) => z <= -5;
let sc = fresh(); sc.keys.add('KeyW'); run(sc, 120);
BLOCK = () => false;
console.log(`  wall at z=-5: walked into it, stopped at z=${sc.cam.position.z.toFixed(2)} (never crosses -5)`);
ok('a solid blocks the walk (z never passes the wall)', sc.cam.position.z > -5);

console.log('\n  LEAVE THE SHIP (code read): dock, then `land`/`disembark`/`surface` (index.html:4788) -> AWAY.enter(pl)');
console.log('  -> on foot ("Landed ... W A S D walk / Shift run / Space jump", :7678); `launch` returns to the ship.');

console.log('\nRESULT: ' + (pass
  ? 'PASS - F46 yes: the player LEAVES the ship (land -> AWAY.enter) and MOVES first-person on the surface (real ground.js walk/run/jump/collision on a heightfield)'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
