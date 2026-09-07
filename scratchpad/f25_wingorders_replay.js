// f25_wingorders_replay.js - headless proof that the player's wingman ORDERS produce REAL, DISTINCT
// in-sim behaviour (not a stub). applyCommand(s,c,dt) (index.html:2368-2398) is transcribed VERBATIM;
// the flight loop consumes its {mode,target} at :2455. CFG values are real (WING_DEFEND_R 260, SENSE_R 95,
// CMD_MINE_MUL 1.6, WINGMAN_STANDOFF 16, GEM_EASE_R 16). The `wing` command (:5052) issues these via
// HOST.wingOrder -> dispatch -> s.cmd; here we drive applyCommand directly with each order type.
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- minimal THREE.Vector3 so the verbatim vector math runs (only distances/modes are asserted) ----
function Vec3(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
Vec3.prototype.copy = function (v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; };
Vec3.prototype.clone = function () { return new Vec3(this.x, this.y, this.z); };
Vec3.prototype.sub = function (v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; };
Vec3.prototype.distanceTo = function (v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
Vec3.prototype.lengthSq = function () { return this.x * this.x + this.y * this.y + this.z * this.z; };
Vec3.prototype.multiplyScalar = function (k) { this.x *= k; this.y *= k; this.z *= k; return this; };
Vec3.prototype.setLength = function (k) { const l = Math.sqrt(this.lengthSq()) || 1; return this.multiplyScalar(k / l); };
Vec3.prototype.applyQuaternion = function () { return this; };
const T = { Vector3: Vec3 };
const _v = new Vec3(), FWD = new Vec3(0, 0, 1);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const CFG = { WINGMAN_STANDOFF: 16, WING_DEFEND_R: 260, DEFEND_R: 115, SENSE_R: 95, CMD_MINE_MUL: 1.6, GEM_EASE_R: 16 };
const T0 = 1000;

// ---- sim stubs (a wingman `s`, a leader/player `L`, a rival, asteroids, gems) ----
let _rival = null;
function nearestRival(s, range) { return _rival; }
function senseRangeOf(s) { return CFG.SENSE_R; }
function pickTarget(s, arr) { return arr[0]; }
let _tradeRan = false;
function doTrade(s, dt) { _tradeRan = true; return { mode: 'DOCK', target: null, aimDir: FWD.clone(), ease: 0.15 }; }
const player = { alive: true, team: 'coalition', pos: new Vec3(0, 0, 0), lock: null, obj: null, quat: {} };   // same team as the wingman, so the defend filter never mistakes the leader for a foe
const asteroids = [], gems = [];
let ships = [player];

// ---- VERBATIM index.html:2368-2398 ----
function applyCommand(s, c, dt) { let mode = 'SEEK', target = null, aimDir = null, ease = 1;
  if (c.type === 'hunt') { let t = c.target; if (!t || !t.alive || t === s) t = nearestRival(s, senseRangeOf(s)); if (t) { mode = 'HUNT'; target = t; aimDir = _v.copy(t.pos).sub(s.pos); } else aimDir = FWD.clone().applyQuaternion(s.quat); }
  else if (c.type === 'follow') { let t = c.target; if (!t || !t.alive || t === s) t = nearestRival(s, senseRangeOf(s)); if (t) { mode = 'ESCORT'; target = t; aimDir = _v.copy(t.pos).sub(s.pos); const d = s.pos.distanceTo(t.pos); if (d < 16) ease = clamp(d / 16, 0.12, 1); } else aimDir = FWD.clone().applyQuaternion(s.quat); }
  else if (c.type === 'wingman') { const L = ships[0];
    if (L && L.alive) {
      const lt = (L.lock && L.lock.alive && L.lock.team === 'pirate') ? L.lock : ((L.obj && L.obj.type === 'hunt' && L.obj.target && L.obj.target.alive) ? L.obj.target : null);
      if (lt) { mode = 'HUNT'; target = lt; aimDir = _v.copy(lt.pos).sub(s.pos); s.huntTarget = lt; s.huntUntil = T0 + 3; }
      else { mode = 'ESCORT'; target = L; aimDir = _v.copy(L.pos).sub(s.pos); const d = s.pos.distanceTo(L.pos); if (d < CFG.WINGMAN_STANDOFF) ease = clamp(d / CFG.WINGMAN_STANDOFF, 0.12, 1); } }
    else { mode = 'HOLD'; aimDir = FWD.clone().applyQuaternion(s.quat); ease = 0; } }
  else if (c.type === 'defend') { const w = c.world;
    if (!w) { mode = 'HOLD'; aimDir = FWD.clone().applyQuaternion(s.quat); ease = 0; }
    else { const foe = ships.filter(x => x.alive && x.team !== s.team && x.pos.distanceTo(w.pos) < CFG.WING_DEFEND_R)
             .sort((a, b) => a.pos.distanceTo(w.pos) - b.pos.distanceTo(w.pos))[0];
      if (foe) { mode = 'HUNT'; target = foe; aimDir = _v.copy(foe.pos).sub(s.pos); s.huntTarget = foe; s.huntUntil = T0 + 3; }
      else { const d = s.pos.distanceTo(w.pos); mode = d > CFG.WING_DEFEND_R * 0.6 ? 'SEEK' : 'HOLD';
        aimDir = _v.copy(w.pos).sub(s.pos); if (d < CFG.WING_DEFEND_R * 0.6) ease = 0.15; } } }
  else if (c.type === 'mine') { const r = asteroids.filter(a => s.pos.distanceTo(a.pos) < CFG.SENSE_R * CFG.CMD_MINE_MUL); if (r.length) { mode = 'MINE'; target = pickTarget(s, r); aimDir = _v.copy(target.pos).sub(s.pos); } else { mode = 'SEEK'; aimDir = FWD.clone().applyQuaternion(s.quat); } }
  else if (c.type === 'collect') { if (gems.length) { mode = 'COLLECT'; target = pickTarget(s, gems.slice()); aimDir = _v.copy(target.pos).sub(s.pos); const gd = s.pos.distanceTo(target.pos); if (gd < CFG.GEM_EASE_R) ease = clamp(gd / CFG.GEM_EASE_R, 0.25, 1); } else { mode = 'SEEK'; aimDir = FWD.clone().applyQuaternion(s.quat); } }
  else if (c.type === 'flee') { mode = 'EVADE'; const th = nearestRival(s, senseRangeOf(s)); aimDir = th ? _v.copy(s.pos).sub(th.pos) : _v.copy(s.pos).multiplyScalar(-1); }
  else if (c.type === 'hold') { mode = 'HOLD'; aimDir = FWD.clone().applyQuaternion(s.quat); ease = 0; }
  else if (c.type === 'trade') { const tr = doTrade(s, dt || 0.016); if (tr) return tr; aimDir = FWD.clone().applyQuaternion(s.quat); }
  else { aimDir = FWD.clone().applyQuaternion(s.quat); }
  return { mode, target, aimDir, ease }; }

const wm = () => ({ team: 'coalition', pos: new Vec3(0, 0, 0), quat: {} });   // a fresh wingman each test

// ---- the proof: each order -> its own real behaviour ----
// HUNT / ATTACK
const enemy = { alive: true, team: 'pirate', pos: new Vec3(50, 0, 0) };
check('[hunt] "hunt <target>" -> mode HUNT on that target', (r => r.mode === 'HUNT' && r.target === enemy)(applyCommand(wm(), { type: 'hunt', target: enemy })));
_rival = enemy;
check('[hunt] "hunt" with a dead target falls back to nearestRival', (r => r.mode === 'HUNT' && r.target === enemy)(applyCommand(wm(), { type: 'hunt', target: { alive: false } })));
_rival = null;
// FOLLOW
check('[follow] "follow <target>" -> mode ESCORT on that target', (r => r.mode === 'ESCORT' && r.target === enemy)(applyCommand(wm(), { type: 'follow', target: enemy })));
// HOLD
check('[hold] "hold" -> mode HOLD, ease 0 (holds position)', (r => r.mode === 'HOLD' && r.ease === 0)(applyCommand(wm(), { type: 'hold' })));
// DEFEND a world
const world = { pos: new Vec3(0, 0, 0) };
const foe = { alive: true, team: 'pirate', pos: new Vec3(100, 0, 0) };   // 100 < WING_DEFEND_R 260
ships = [player, foe];
check('[defend] hostile inside WING_DEFEND_R -> HUNT it', (r => r.mode === 'HUNT' && r.target === foe)(applyCommand(wm(), { type: 'defend', world })));
ships = [player];
const farWm = () => ({ team: 'coalition', pos: new Vec3(200, 0, 0), quat: {} });   // 200 > 0.6*260=156
check('[defend] no foe + far from world -> SEEK back to the world', (r => r.mode === 'SEEK')(applyCommand(farWm(), { type: 'defend', world })));
check('[defend] no foe + near the world -> HOLD station over it', (r => r.mode === 'HOLD')(applyCommand(wm(), { type: 'defend', world })));
// MINE
asteroids.push({ pos: new Vec3(20, 0, 0) });   // within SENSE_R*CMD_MINE_MUL = 152
check('[mine] asteroid in range -> mode MINE on it', (r => r.mode === 'MINE' && r.target === asteroids[0])(applyCommand(wm(), { type: 'mine' })));
asteroids.length = 0;
check('[mine] no asteroid in range -> SEEK', (r => r.mode === 'SEEK')(applyCommand(wm(), { type: 'mine' })));
// COLLECT
gems.push({ pos: new Vec3(10, 0, 0) });
check('[collect] gem present -> mode COLLECT on it', (r => r.mode === 'COLLECT' && r.target === gems[0])(applyCommand(wm(), { type: 'collect' })));
gems.length = 0;
// FLEE
check('[flee] "flee" -> mode EVADE', (r => r.mode === 'EVADE')(applyCommand(wm(), { type: 'flee' })));
// TRADE
_tradeRan = false; const tr = applyCommand(wm(), { type: 'trade' });
check('[trade] "trade" -> runs doTrade (the wingman trades)', _tradeRan && tr.mode === 'DOCK');
// WINGMAN default order: escort the player, but engage the player's locked pirate
player.alive = true; player.lock = null;
check('[wingman] player alive, no target -> ESCORT the player', (r => r.mode === 'ESCORT' && r.target === player)(applyCommand(wm(), { type: 'wingman' })));
player.lock = { alive: true, team: 'pirate', pos: new Vec3(80, 0, 0) };
check('[wingman] player has a pirate locked -> ENGAGE it (HUNT)', (r => r.mode === 'HUNT' && r.target === player.lock)(applyCommand(wm(), { type: 'wingman' })));
player.alive = false;
check('[wingman] player dead -> HOLD formation', (r => r.mode === 'HOLD')(applyCommand(wm(), { type: 'wingman' })));
player.alive = true; player.lock = null;
// distinctness: with real context (a target, an asteroid, a gem) the order set maps to distinct modes
_rival = enemy; asteroids.push({ pos: new Vec3(20, 0, 0) }); gems.push({ pos: new Vec3(10, 0, 0) });
const modes = new Set([
  applyCommand(wm(), { type: 'hunt', target: enemy }).mode,    // HUNT
  applyCommand(wm(), { type: 'follow', target: enemy }).mode,  // ESCORT
  applyCommand(wm(), { type: 'hold' }).mode,                   // HOLD
  applyCommand(wm(), { type: 'mine' }).mode,                   // MINE
  applyCommand(wm(), { type: 'collect' }).mode,               // COLLECT
  applyCommand(wm(), { type: 'flee' }).mode,                  // EVADE
]);
asteroids.length = 0; gems.length = 0; _rival = null;
check('[distinct] the order set yields >=5 distinct modes, not one stubbed behaviour (got ' + modes.size + ': ' + [...modes].join(',') + ')', modes.size >= 5);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
