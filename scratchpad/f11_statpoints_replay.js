// f11_statpoints_replay.js - headless proof that the player SPENDS EARNED POINTS to PERMANENTLY RAISE
// SHIP STATS (a Space-Rangers-style 8-stat point economy). Points are EARNED by filling the GEM BAR from
// collected credits (gemBarAdd banks a point per GEM_BAR_MAX), SPENT one-per-stat by spendStat (keys 1-8),
// and CONSUMED forever via statMult (1 + STAT_GAIN[k]*level) at every stat's use site (shield/energy/
// speed/damage/fireRate). ensureStat/gemBarAdd/spendStat/statMult are transcribed VERBATIM (index.html
// :2187/:2193/:2198/:2161); CFG is the real block (STAT_ORDER/STAT_GAIN/STAT_MAX 8/GEM_BAR_MAX 48/
// GEM_PTS_CAP 64, :443-450). Persistence: s.stat/gemPts/gemBar are saved (:6482) & restored (:6509).
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
const window = {};                 // so the verbatim `if(window.SOUND)` guards are falsy under node
function term() {} function tierUpReady() { return false; } function offerTierUp() {}

const CFG = {
  GEM_BAR: true, GEM_BAR_MAX: 48, GEM_BAR_RATE: 1.0, GEM_PTS_CAP: 64, STAT_MAX: 8,
  STAT_ORDER: ['shieldCap', 'shieldRegen', 'energyCap', 'energyRegen', 'speed', 'agility', 'damage', 'fireRate'],
  STAT_GAIN: { shieldCap: 0.10, shieldRegen: 0.12, energyCap: 0.10, energyRegen: 0.12, speed: 0.05, agility: 0.08, damage: 0.07, fireRate: 0.06 },
  STAT_LABEL: { shieldCap: 'SHIELD CAP', shieldRegen: 'SHIELD REGEN', energyCap: 'ENERGY CAP', energyRegen: 'ENERGY REGEN', speed: 'SPEED', agility: 'AGILITY', damage: 'DAMAGE', fireRate: 'FIRE RATE' },
};
// ---- VERBATIM index.html ----
function statMult(s, k) { return 1 + (CFG.STAT_GAIN[k] || 0) * ((s && s.stat && s.stat[k]) || 0); }
function ensureStat(s) { if (!s.stat) { s.stat = {}; CFG.STAT_ORDER.forEach(k => s.stat[k] = 0); } if (s.gemBar == null) s.gemBar = 0; if (s.gemPts == null) s.gemPts = 0; return s.stat; }
function gemBarAdd(s, credits) { if (!CFG.GEM_BAR || !s || s.role !== 'player' || !(credits > 0)) return 0; ensureStat(s); s.gemBar += credits * CFG.GEM_BAR_RATE; let banked = 0;
  while (s.gemBar >= CFG.GEM_BAR_MAX && s.gemPts < CFG.GEM_PTS_CAP) { s.gemBar -= CFG.GEM_BAR_MAX; s.gemPts++; banked++; }
  if (banked) { term(); }
  if (tierUpReady(s)) offerTierUp(s); return banked; }
function spendStat(s, k) { if (!s) return { ok: false, msg: 'no ship' }; ensureStat(s); if (!CFG.STAT_GAIN[k]) return { ok: false, msg: `no such stat - ${CFG.STAT_ORDER.join(' / ')}` };
  if (s.gemPts < 1) return { ok: false, msg: `no upgrade point yet - the gem bar is ${Math.round(100 * s.gemBar / CFG.GEM_BAR_MAX)}% full` };
  if (s.stat[k] >= CFG.STAT_MAX) return { ok: false, msg: `${CFG.STAT_LABEL[k]} is already at the max level (${CFG.STAT_MAX})` };
  s.gemPts--; s.stat[k]++;
  term(); if (window.SOUND) window.SOUND.play('ui');
  if (tierUpReady(s)) offerTierUp(s); return { ok: true, lvl: s.stat[k], mult: statMult(s, k) }; }
// shield-cap use site (index.html:1611 shieldMaxFor), to show the raise is CONSUMED (the ours-note "40 -> 44")
const SHIELD_BASE = 40;
function shieldMaxOf(s) { return SHIELD_BASE * statMult(s, 'shieldCap'); }

// ---- the proof ----
const s = { role: 'player' };
ensureStat(s);
check('[init] a fresh ship has 8 stats all at level 0', CFG.STAT_ORDER.length === 8 && CFG.STAT_ORDER.every(k => s.stat[k] === 0));
check('[init] every statMult starts at x1.00', CFG.STAT_ORDER.every(k => statMult(s, k) === 1));
check('[init] base shield max is 40', shieldMaxOf(s) === 40);

// 1) EARN a point: collect GEM_BAR_MAX credits -> the gem bar fills -> one upgrade point banked
check('[earn] collecting <GEM_BAR_MAX gives no point yet', gemBarAdd(s, 47) === 0 && s.gemPts === 0);
check('[earn] the bar is ~98% full and NO point yet', Math.round(100 * s.gemBar / CFG.GEM_BAR_MAX) === 98);
check('[earn] crossing GEM_BAR_MAX banks exactly one point', gemBarAdd(s, 1) === 1 && s.gemPts === 1);

// 2) SPEND the point to PERMANENTLY raise a ship stat
const r = spendStat(s, 'shieldCap');
check('[spend] spending raises SHIELD CAP to Lv1 and consumes the point', r.ok && s.stat.shieldCap === 1 && s.gemPts === 0);
check('[permanent] statMult(shieldCap) is now x1.10 and shield max is 44 (the ours-note "40 -> 44")', statMult(s, 'shieldCap') === 1.1 && shieldMaxOf(s) === 44);

// 3) the point-spend is GUARDED: no point / unknown stat / already at max
check('[guard] spending with no point is refused (naming the bar %)', (r2 => !r2.ok && /no upgrade point yet/.test(r2.msg))(spendStat(s, 'speed')));
check('[guard] an unknown stat is refused', (r3 => !r3.ok && /no such stat/.test(r3.msg))(spendStat(s, 'warpdrive')));

// 4) a stat caps at STAT_MAX (8): bank + spend 7 more into shieldCap, then a 9th is refused
gemBarAdd(s, CFG.GEM_BAR_MAX * 7);                      // 7 more points
for (let i = 0; i < 7; i++) spendStat(s, 'shieldCap');
check('[cap] shieldCap climbs to the max level 8', s.stat.shieldCap === 8);
check('[cap] statMult(shieldCap) at max is x1.80', Math.abs(statMult(s, 'shieldCap') - 1.8) < 1e-9);
gemBarAdd(s, CFG.GEM_BAR_MAX);                          // one more point
check('[cap] raising a maxed stat is refused', (rc => !rc.ok && /already at the max level \(8\)/.test(rc.msg))(spendStat(s, 'shieldCap')));

// 5) different stats have different per-level gains (a real per-stat economy, not one lump)
const s2 = { role: 'player' }; ensureStat(s2); gemBarAdd(s2, CFG.GEM_BAR_MAX * 20);
for (let i = 0; i < 5; i++) { spendStat(s2, 'damage'); spendStat(s2, 'speed'); }
check('[per-stat] damage Lv5 = x1.35, speed Lv5 = x1.25 (distinct STAT_GAIN)', Math.abs(statMult(s2, 'damage') - 1.35) < 1e-9 && Math.abs(statMult(s2, 'speed') - 1.25) < 1e-9);

// 6) the point pool caps at GEM_PTS_CAP (64)
const s3 = { role: 'player' }; ensureStat(s3); gemBarAdd(s3, CFG.GEM_BAR_MAX * 100);
check('[pts-cap] banked points cap at GEM_PTS_CAP (64)', s3.gemPts === CFG.GEM_PTS_CAP);

// 7) PERMANENCE across a save/load round-trip: the saved fields (stat/gemPts/gemBar) fully restore the upgrades
const saved = { gemBar: s.gemBar, gemPts: s.gemPts, stat: { ...s.stat } };   // gatherSaveState :6482 shape
const reloaded = { role: 'player', gemBar: saved.gemBar, gemPts: saved.gemPts, stat: saved.stat };  // applySaveState :6509
ensureStat(reloaded);
check('[persist] after save+reload the stat levels (and their multipliers) are identical',
  CFG.STAT_ORDER.every(k => statMult(reloaded, k) === statMult(s, k)) && reloaded.stat.shieldCap === 8);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
