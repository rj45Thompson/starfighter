// f49_death_cost_replay.js - settles genre cell F49 "death costs resources but the campaign
// continues." It slices the REAL player-reset block out of killShip() (index.html:2831-2839) and
// runs it on a maxed-out player to MEASURE the cost (everything wiped to stock), then asserts from
// the source that killShip also drops+zeros credits, spills cargo, and sets a RESPAWN timer (the
// campaign continues). This is the "real stakes" death: lose your ship and wealth, keep the run.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

// slice the player-only reset block (1-indexed 2831..2839: `if(s.role==='player'){ ... applyHull(s,'scout'); }`)
const resetSrc = lines.slice(2830, 2839).join('\n');
if (!/if\(s\.role==='player'\)/.test(resetSrc) || !/applyHull\(s,'scout'\)/.test(resetSrc)) {
  console.error('FAIL: player-reset slice (2831-2839) moved; head=' + resetSrc.slice(0, 60)); process.exit(2);
}
const CFG = { FUEL_CAP: 60, SENSE_R: 95, GIZMO_SLOTS: 2, MISSILE_AMMO_START: 10 };
function applyHull(s, key) { s.hullClass = key; }   // stub: the real one recomputes hp/hold/model; we only need the class swap
const reset = new Function('s', 'CFG', 'applyHull', resetSrc + '\n;');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

// a maxed-out player, everything to lose
const s = {
  role: 'player', hullClass: 'dreadnought', credits: 5000,
  lvl: { weapon: 5, engine: 4, hull: 6 }, weaponType: 'plasma', equip: { shieldgen: 1 },
  artifacts: ['relic'], contraband: { relics: 3 }, artifactsUnid: ['unk'], cores: 12, probesOwned: 3,
  fuelCap: 120, senseR: 220, warpEff: 2, regenBonus: 5, engineType: 'ion',
  gizmoSlots: ['scanner', 'jammer'], fuelTankType: 'reserve', radarType: 'mk3', scannerType: 'deep',
  shieldGenType: 'mk2', droidType: 'mk3', cargoHookType: 'grapple', missileAmmo: 2, dmgMult: 0.5,
  micromodules: ['gripper'], gripBonus: 0.3, manufacturer: 'synod', hullSeries: 'dandy',
  weaponSlots: [{}, {}], slotFire: {}
};
reset(s, CFG, applyHull);

console.log('F49 death-cost replay - real player-reset block sliced from killShip() (index.html:2831-2839)\n');
console.log('  after death, a maxed player is reset to stock:');
ok('hull class -> stock Scout (was dreadnought)', s.hullClass === 'scout');
ok('upgrade levels -> {1,1,1} (was 5/4/6)', s.lvl.weapon === 1 && s.lvl.engine === 1 && s.lvl.hull === 1);
ok('weapon/equip/artifacts/contraband wiped', s.weaponType === 'energy' && Object.keys(s.equip).length === 0 && s.artifacts.length === 0 && Object.keys(s.contraband).length === 0);
ok('cores/probes/unid-artifacts aboard lost', s.cores === 0 && s.probesOwned === 0 && s.artifactsUnid.length === 0);
ok('full loadout -> stock (engine/gizmos/tank/radar/scanner/shieldgen/droid/hook)', s.engineType === 'standard' && s.gizmoSlots.every(x => x === null) && s.gizmoSlots.length === CFG.GIZMO_SLOTS && s.fuelTankType === 'standard' && s.radarType === 'basic' && s.scannerType === 'none' && s.shieldGenType === 'none' && s.droidType === 'none' && s.cargoHookType === 'none');
ok('micromodules/grip/manufacturer/hull-series/weapon-hardpoints -> stock', s.micromodules.length === 0 && s.gripBonus === 0 && s.manufacturer === 'human' && s.hullSeries === 'standard' && s.weaponSlots === null && s.slotFire === null);
ok('ship stats (fuelCap/senseR/warpEff/regen/missiles) -> CFG defaults', s.fuelCap === CFG.FUEL_CAP && s.senseR === CFG.SENSE_R && s.warpEff === 1 && s.regenBonus === 0 && s.missileAmmo === CFG.MISSILE_AMMO_START);

// COST + CONTINUES, asserted from the killShip source
console.log('\n  from the killShip() source:');
ok('ALL credits dropped then zeroed (dropCredits + s.credits=0, :2826)', /dropCredits\(s\.pos, s\.credits\); s\.credits=0/.test(IDX));
ok('cargo spills as salvage pods (dropCargo(s), :2824)', /dropCargo\(s\);/.test(IDX));
ok('campaign CONTINUES: a respawn timer is set (s.respawn=CFG.RESPAWN_DELAY, :2822)', /s\.respawn=CFG\.RESPAWN_DELAY/.test(IDX));
ok('the wipe is scoped to the human PLAYER only (AI gear untouched)', /if\(s\.role==='player'\)\{/.test(resetSrc));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F49 yes: death has a HEAVY resource cost (all credits + cargo + upgrades + loadout wiped, hull -> stock Scout) yet the campaign CONTINUES (respawn timer)'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
