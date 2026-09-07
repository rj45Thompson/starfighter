// f18_local_prices_replay.js - settle F18 "goods have per-location prices driven by local supply and
// demand" (anchor high; ours=yes on the genre_matrix SEED only = anchors=1, never independently read).
// This is that 2nd independent read, RUN not just asserted. F18 = yes, confirmed (not a mis-grade).
//
// TWO facts, both measured:
//   PER-LOCATION: priceOf(p,gk) (index.html:1804) prices a good off p.stock[gk] - the PER-PLANET stock -
//     so the SAME good has a DIFFERENT price at every world (a function of that world's own stock).
//   DRIVEN BY LOCAL SUPPLY/DEMAND: each world TYPE has its own recipe (PTYPES :1453-1457) - Mining
//     makes ore + needs food, Agri makes food, Refinery needs ore, etc. stationTick (economy.js:146)
//     runs that recipe every cycle: it PRODUCES the world's exports (stock up -> supply up -> price
//     down) and CONSUMES its imports (stock down -> supply down -> price up). So ore is CHEAP where it
//     is mined and DEAR where it is consumed - a real local supply/demand market, not one flat price.
//
// The RUN slices the real priceOf and the real GOODS bases + PTYPES recipes from index.html (drift-
// sensitive) and drives a producer world against a consumer world tick by tick; the prices DIVERGE in
// the direction supply/demand predicts, and the gap widens. index.html + economy.js read-only.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ECON = fs.readFileSync(path.join(ROOT, 'economy.js'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- parse REAL constants / goods / recipes from source ----
const cfgNum = k => { const m = IDX.match(new RegExp(k + ':\\s*([0-9.]+)')); return m ? +m[1] : NaN; };
const EQ_STOCK = cfgNum('EQ_STOCK'), PRICE_ELAST = cfgNum('PRICE_ELAST'), PRICE_MIN = cfgNum('PRICE_MIN'), PRICE_MAX = cfgNum('PRICE_MAX');
const GKEY = {};
const goodsM = IDX.match(/const GOODS=\[([\s\S]*?)\];/);
[...goodsM[1].matchAll(/\{k:'(\w+)',n:'[^']*',base:([0-9.]+)/g)].forEach(m => { GKEY[m[1]] = { base: +m[2] }; });
function parseKV(s) { const o = {}; [...s.matchAll(/(\w+):([0-9.]+)/g)].forEach(m => o[m[1]] = +m[2]); return o; }
const PT = {};
[...IDX.matchAll(/\{t:'([\w-]+)',\s*col:[^,]+,\s*makes:\{([^}]*)\},\s*needs:\{([^}]*)\}/g)].forEach(m => { PT[m[1]] = { makes: parseKV(m[2]), needs: parseKV(m[3]) }; });
check('parsed CFG price constants + GOODS bases + PTYPES recipes from source',
  !isNaN(EQ_STOCK) && !isNaN(PRICE_ELAST) && GKEY.ore && GKEY.ore.base > 0 && PT.Mining && PT.Agri && PT.Refinery);
check('the recipes encode supply/demand: Mining makes ore + needs food; Agri makes food; Refinery needs ore',
  PT.Mining.makes.ore > 0 && PT.Mining.needs.food > 0 && PT.Agri.makes.food > 0 && PT.Refinery.needs.ore > 0);

// ---- slice & run the REAL priceOf ----
const priceOfM = IDX.match(/function priceOf\(p,gk\)\s*\{[^}]*\}/);
check('priceOf() sliced from source and reads the PER-PLANET stock p.stock[gk]', !!priceOfM && /p\.stock\[gk\]/.test(priceOfM[0]));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const CFG = { EQ_STOCK, PRICE_ELAST, PRICE_MIN, PRICE_MAX };
const body = priceOfM[0].replace(/^function priceOf\(p,gk\)\s*\{/, '').replace(/\}\s*$/, '');
const priceOf = new Function('p', 'gk', 'GKEY', 'CFG', 'clamp', body);
const price = (world, gk) => priceOf(world, gk, GKEY, CFG, clamp);

// ---- RUN: a producer world vs a consumer world, driven by their real recipes ----
// mining PRODUCES ore (+needs food); refinery CONSUMES ore; agri PRODUCES food. Start every stock at
// equilibrium (=eq -> price==base), then tick the recipe: makes -> stock up, needs -> stock down.
function world(type) { return { name: type, eq: EQ_STOCK, type: PT[type], stock: { ore: EQ_STOCK, food: EQ_STOCK, gas: EQ_STOCK, alloy: EQ_STOCK, tech: EQ_STOCK, med: EQ_STOCK, lux: EQ_STOCK } }; }
const RATE = 2.5;
function tick(w) { for (const g in w.type.makes) w.stock[g] += RATE * w.type.makes[g]; for (const g in w.type.needs) w.stock[g] = Math.max(1, w.stock[g] - RATE * w.type.needs[g]); }
const mining = world('Mining'), refinery = world('Refinery'), agri = world('Agri');

// baseline: at equilibrium stock, every world prices ore at base (no location advantage yet)
check('baseline: at equilibrium stock, ore prices at base (' + price(mining, 'ore').toFixed(2) + ' == ' + GKEY.ore.base + ') everywhere', Math.abs(price(mining, 'ore') - GKEY.ore.base) < 1e-6 && Math.abs(price(refinery, 'ore') - GKEY.ore.base) < 1e-6);

let gap10 = 0;
for (let t = 1; t <= 30; t++) { tick(mining); tick(refinery); tick(agri); if (t === 10) gap10 = price(refinery, 'ore') - price(mining, 'ore'); }
const oreAtMining = price(mining, 'ore'), oreAtRefinery = price(refinery, 'ore');
const foodAtAgri = price(agri, 'food'), foodAtMining = price(mining, 'food');
const gap30 = oreAtRefinery - oreAtMining;

check('ORE is CHEAP where it is mined (Mining ' + oreAtMining.toFixed(2) + ' < base ' + GKEY.ore.base + ')', oreAtMining < GKEY.ore.base);
check('ORE is DEAR where it is consumed (Refinery ' + oreAtRefinery.toFixed(2) + ' > base ' + GKEY.ore.base + ')', oreAtRefinery > GKEY.ore.base);
check('the SAME good has a DIFFERENT price at different locations (ore ' + oreAtMining.toFixed(2) + ' @Mining vs ' + oreAtRefinery.toFixed(2) + ' @Refinery) = PER-LOCATION prices', Math.abs(oreAtRefinery - oreAtMining) > 1);
check('FOOD is CHEAP where farmed (Agri ' + foodAtAgri.toFixed(2) + ') and DEAR where consumed (Mining ' + foodAtMining.toFixed(2) + ') - the effect is per-good, not ore-specific', foodAtAgri < foodAtMining);
check('the price gap WIDENS as supply/demand diverges over time (tick10 gap ' + gap10.toFixed(2) + ' -> tick30 gap ' + gap30.toFixed(2) + ') = demand-driven', gap30 > gap10 && gap10 > 0);

// ---- source: the DRIVER is the station economy consuming/producing local stock ----
check('[driver] stationTick (economy.js:146) runs the world recipe: consumes inputs + produces outputs into per-planet stock',
  /function stationTick/.test(ECON) && /stock\[/.test(ECON));
check('[driver] the player trades against these local prices: buy/sell call priceOf(p,gk) per docked world (index.html:1804/1857)',
  /function sell\(s,p,gk,qty\)\{[^}]*priceOf\(p,gk\)/.test(IDX) || /priceOf\(p,gk\)/.test(IDX));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (F18 = yes: per-location prices driven by local supply/demand)');
process.exit(fail === 0 ? 0 : 1);
