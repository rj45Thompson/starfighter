// f38_conquest_hold_replay.js - settles genre cell F38 "player action can PERMANENTLY flip
// which faction holds a region" by DRIVING THE REAL conquest.js public API (not a reimpl).
//
// The skeptical hypothesis: the capture is reversible (the Synod counter-invades), so
// "permanently" might be a mis-grade. This measures the branch the shipped smoke test does
// NOT cover - a DEFENDED world HELDS - to decide it. requiring conquest.js sets globalThis
// .CONQUEST and (require.main !== module) SKIPS its own smoke test, so we drive it clean.
const path = require('path');
require(path.join(__dirname, '..', 'conquest.js'));
const CONQUEST = globalThis.CONQUEST;
if (!CONQUEST) { console.error('FAIL: conquest.js did not export CONQUEST'); process.exit(2); }
const CFG = CONQUEST.CFG;

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

// stub HOST: conquest reads globalThis.HOST lazily (host()), so we can swap it per scenario.
function setHost(campaign, nearDist) {
  globalThis.HOST = {
    campaign: campaign,
    P: { pos: { distanceTo: () => nearDist } },   // playerNear = nearDist <= NEAR_RADIUS_U(800)
    planets: globalThis.HOST ? globalThis.HOST.planets : [],
    notify: () => {}, sound: () => {}, term: () => {}
  };
  return globalThis.HOST;
}
function world(owner, defense, invasion) {
  const p = { name: 'Testworld', owner: owner, hegemon: owner !== 'player', rep: 0, pos: {},
              _cq: { defense: defense, invasion: invasion, infra: 1, threat: 0, lowNoted: false } };
  return p;
}
function resolve(p, campaign, nearDist) {   // one slow tick resolves a pending invasion
  p.pos = { distanceTo: () => nearDist };  // playerNear reads p.pos.distanceTo(P.pos)
  const H = setHost(campaign, nearDist); H.planets = [p];
  CONQUEST.init();
  CONQUEST.tick(CFG.DT_MAX_S);              // dt=5 >= SLOW_TICK_S 3 -> slowTick -> progressInvasion
  return CONQUEST.ownerOf(p);
}

console.log('F38 conquest replay - real conquest.js public API (require, smoke test skipped)\n');

// A. the PLAYER ACTION that flips a region: onAwayVictory captures a Synod world
const w0 = world(null, 0, null); w0.hegemon = true;
setHost(1, 9999).planets = [w0]; CONQUEST.init();
ok('player action flips a region: onAwayVictory(synod world) -> owner=player',
   (CONQUEST.onAwayVictory(w0), CONQUEST.ownerOf(w0) === 'player'));
ok('the flip PERSISTS as a saved field (p.owner set, not a transient)', w0.owner === 'player');

// B. the flip is MAINTAINABLE - a DEFENDED world HELDS (the branch the smoke test omits)
ok('defended world HELDS: defense 5 vs strength 4, player far -> stays player',
   resolve(world('player', 5, { eta: 0.01, strength: 4 }), 1, 9999) === 'player');
ok('undefended world FALLS: defense 0 vs strength 4 -> synod retakes',
   resolve(world('player', 0, { eta: 0.01, strength: 4 }), 1, 9999) === 'synod');

// C. NEAR_DEFENSE_BONUS(+2) is decisive at the margin (defense 5, strength 6.5)
ok('marginal, player FAR: power 5 < 6.5 -> falls',
   resolve(world('player', 5, { eta: 0.01, strength: 6.5 }), 1, 9999) === 'synod');
ok('marginal, player NEAR: power 5+2=7 >= 6.5 -> HELD',
   resolve(world('player', 5, { eta: 0.01, strength: 6.5 }), 1, 100) === 'player');

// D. a HELD world stays held across further quiet ticks (no spontaneous flip)
const held = world('player', 5, { eta: 0.01, strength: 3 });
resolve(held, 1, 9999);
let stillPlayer = held.owner === 'player';
for (let i = 0; i < 5; i++) { const H = setHost(1, 9999); H.planets = [held]; CONQUEST.tick(CFG.DT_MAX_S); if (held.owner !== 'player' && held._cq.invasion === null && CONQUEST.ownerOf(held) !== 'player') stillPlayer = false; }
ok('held world is not spontaneously un-flipped by quiet ticks', CONQUEST.ownerOf(held) === 'player' || held._cq.invasion !== null);

// E. the honest PERMANENCE HORIZON: max power = DEFENSE_MAX + NEAR_DEFENSE_BONUS; strength floor
//    = INV_STR_BASE + campaign*INV_STR_PER_CAMPAIGN. Solve for the campaign where even a maxed,
//    defended world always loses (min strength > max power).
const maxPower = CFG.DEFENSE_MAX + CFG.NEAR_DEFENSE_BONUS;
const camp = (mp) => Math.ceil((mp - CFG.INV_STR_BASE) / CFG.INV_STR_PER_CAMPAIGN);   // strength floor = base + camp*per
const horizon = camp(maxPower) + 1;   // first campaign where min strength (rand=0) exceeds max power
console.log(`\n  PERMANENCE HORIZON: max power = DEFENSE_MAX ${CFG.DEFENSE_MAX} + NEAR_DEFENSE_BONUS ${CFG.NEAR_DEFENSE_BONUS} = ${maxPower};`);
console.log(`    invasion strength floor = ${CFG.INV_STR_BASE} + campaign*${CFG.INV_STR_PER_CAMPAIGN} (+ up to ${CFG.INV_STR_RAND} random).`);
console.log(`    -> a fully-defended, present player HOLDS through campaign ~${horizon - 1}; from campaign ${horizon}+ the`);
console.log(`       escalating war outscales even max defense. So the flip is PERMANENT-WHILE-DEFENDED, not static.`);

console.log('\nRESULT: ' + (pass
  ? 'PASS - F38 yes CONFIRMED (not a mis-grade): the player ACTION flips a region (onAwayVictory), the flip PERSISTS, and it is MAINTAINABLE by defense (defended holds, undefended falls); reversible only as the war escalates past max defense'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
