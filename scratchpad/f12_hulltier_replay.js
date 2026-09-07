// f12_hulltier_replay.js - settles genre cell F12 "player advances mainly by buying larger
// hull CLASSES rather than upgrading one ship" from a MEASUREMENT, not a reading.
//
// It parses the real HULL_ORDER + the 7 hand-authored HULLS entries out of index.html, and
// evals the VERBATIM gate functions (index.html:2193-2196: hullTierIdx, nextTierHull,
// statsMaxed, tierUpReady). Then it drives them to show:
//   1. the tier LADDER is real and ordered - nextTierHull walks scout->...->capital, cost rising
//   2. the gate is GATED behind F11 - tierUpReady is false until all 8 stats are maxed AND a
//      point is banked (so F12 and F11 share one currency; a tier-up is EARNED by maxing the ship)
//   3. the top of the ladder terminates (capital -> null)
// The stat-RESET and point-SPEND on tier-up are a code read of takeTierUp (index.html:2212):
//   `const from=...; s.gemPts--; s.gemBar=0; applyHull(s,key); CFG.STAT_ORDER.forEach(k=>s.stat[k]=0)`
// - the same s.gemPts that spendStat (:2205) draws, confirming ONE economy with two spend-modes.
const fs = require('fs');
const path = require('path');

const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// --- parse the real data ---
const orderM = IDX.match(/const HULL_ORDER=(\[[^\]]*\]);/);
if (!orderM) { console.error('FAIL: HULL_ORDER literal not found'); process.exit(2); }
const HULL_ORDER_ORIGINAL = JSON.parse(orderM[1].replace(/'/g, '"'));

const HULLS = {};
for (const key of HULL_ORDER_ORIGINAL) {
  const re = new RegExp(key + "\\s*:\\s*\\{n:'([^']+)',\\s*hp:(\\d+),\\s*hold:(\\d+),\\s*speed:([\\d.]+),\\s*cost:(\\d+)");
  const m = IDX.match(re);
  if (!m) { console.error('FAIL: could not parse HULLS entry for ' + key); process.exit(2); }
  HULLS[key] = { n: m[1], hp: +m[2], hold: +m[3], speed: +m[4], cost: +m[5] };
}

// --- eval the VERBATIM gate functions from index.html:2193-2196 ---
const lines = IDX.split(/\r?\n/);
const gateSrc = lines.slice(2192, 2196).join('\n');   // 1-indexed 2193..2196
if (!/function tierUpReady/.test(gateSrc) || !/function nextTierHull/.test(gateSrc)) {
  console.error('FAIL: gate-function slice (2193-2196) moved; head:', gateSrc.slice(0, 80)); process.exit(2);
}
const CFG = { STAT_ORDER: ['shieldCap','shieldRegen','energyCap','energyRegen','speed','agility','damage','fireRate'], STAT_MAX: 8, TIER_UP: true };
function ensureStat(s){ if(!s.stat){ s.stat={}; CFG.STAT_ORDER.forEach(k=>s.stat[k]=0); } return s; }
const gate = new Function('HULLS','HULL_ORDER_ORIGINAL','CFG','ensureStat',
  gateSrc + '\n;return { hullTierIdx, nextTierHull, statsMaxed, tierUpReady };'
)(HULLS, HULL_ORDER_ORIGINAL, CFG, ensureStat);

function player(hullClass, opts){ opts=opts||{}; const s={ role:'player', alive:true, hullClass, gemPts:opts.gemPts||0 }; ensureStat(s); if(opts.maxed) CFG.STAT_ORDER.forEach(k=>s.stat[k]=CFG.STAT_MAX); return s; }

let pass = true;
console.log('F12 hull-tier replay - real HULL_ORDER + verbatim gate funcs (index.html:2193-2196)\n');

// 1. the ladder: walk nextTierHull from the bottom
console.log('  TIER LADDER (nextTierHull walks HULL_ORDER_ORIGINAL):');
let cur = HULL_ORDER_ORIGINAL[0], steps = 0, costs = [];
const chain = [cur];
while (true) {
  const nx = gate.nextTierHull(player(cur, { maxed: true, gemPts: 1 }));
  costs.push(HULLS[cur].cost);
  if (!nx) break;
  chain.push(nx); cur = nx; if (++steps > 20) { console.log('  FAIL: ladder did not terminate'); pass = false; break; }
}
for (const k of chain) console.log(`    ${HULLS[k].n.padEnd(13)} hp ${String(HULLS[k].hp).padStart(3)}  hold ${String(HULLS[k].hold).padStart(2)}  speed x${HULLS[k].speed.toFixed(2)}  cost ${HULLS[k].cost}c`);
const reachedTop = chain.length === HULL_ORDER_ORIGINAL.length && gate.nextTierHull(player(chain[chain.length-1], { maxed:true, gemPts:1 })) === null;
console.log(`    -> ${chain.length} classes, terminates at ${HULLS[chain[chain.length-1]].n} (nextTier=null): ${reachedTop ? 'OK' : 'FAIL'}`);
if (!reachedTop) pass = false;

// cost is non-decreasing along the ladder (the "buying LARGER classes" economics)
const costMono = costs.every((c, i) => i === 0 || c >= costs[i-1]);
console.log(`    cost non-decreasing along ladder [${costs.join(', ')}]: ${costMono ? 'YES' : 'NO'}`);
if (!costMono) pass = false;

// 2. the gate (F12 is EARNED through F11: all 8 stats maxed + a banked point)
console.log('\n  TIER-UP GATE (tierUpReady):');
const cases = [
  ['stats NOT maxed, 5 points', player('scout', { gemPts: 5 }), false],
  ['stats maxed, 0 points',     player('scout', { maxed: true, gemPts: 0 }), false],
  ['stats maxed, 1 point',      player('scout', { maxed: true, gemPts: 1 }), true],
  ['at top (capital), maxed+pt',player('capital', { maxed: true, gemPts: 1 }), false],
];
for (const [label, s, want] of cases) {
  const got = !!gate.tierUpReady(s);
  const ok = got === want;
  console.log(`    ${label.padEnd(28)} -> tierUpReady ${String(got).padEnd(5)} (expect ${want}) ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) pass = false;
}

// 3. code-read facts (asserted against the source, not just narrated)
const takeTier = lines[2211];   // 1-indexed :2212
const spend = lines[2204];      // 1-indexed :2205
const resets = /CFG\.STAT_ORDER\.forEach\(k=>s\.stat\[k\]=0\)/.test(takeTier) && /s\.gemPts--/.test(takeTier);
const sharedCurrency = /s\.gemPts--/.test(spend);
console.log('\n  CODE-READ (takeTierUp :2212, spendStat :2205):');
console.log(`    tier-up spends a point AND resets all 8 stats to 0: ${resets ? 'CONFIRMED' : 'NOT FOUND'}`);
console.log(`    same s.gemPts currency as the F11 stat spend:        ${sharedCurrency ? 'CONFIRMED' : 'NOT FOUND'}`);
if (!resets || !sharedCurrency) pass = false;

console.log('\nRESULT: ' + (pass ? 'PASS - F12 yes: a real 7-class hull ladder, advanced by a banked point, GATED behind maxing the ship (F11); shares one currency, tier-up resets the stats' : 'FAIL'));
process.exit(pass ? 0 : 1);
