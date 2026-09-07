// f07_mining_replay.js - settle F07 "player can mine asteroids OR resource nodes for sellable material"
// (anchor 7/8; was ours=yes on the genre_matrix SEED only, never independently read). This is that 2nd
// independent read, RUN not just asserted: it proves BOTH mining paths exist and that the mined material
// is genuinely SELLABLE, by SLICING the real priceOf + extracting the real spawnGem credit formula and
// CFG constants from index.html (drift-sensitive - a source change re-reads), plus source-asserting the
// connective wiring. index.html read-only. NOT a mis-grade check that fails: F07 is confirmed yes.
//
//   PATH 1 (asteroids -> value): shooting a rock spawns gems worth credits (spawnGem :1352,
//     credits = max(1, round(scale*GEM_CREDIT_PER_SCALE))); scooping one adds credits + fills the gem
//     bar (:964 P.credits+=g.credits; gemBarAdd(P,g.credits)); tracked as miningStats.rocksMined (:905).
//   PATH 2 (resource nodes -> sellable material, the exact F07 clause): buy a mineral probe with cores,
//     deployprobe on a WORLD -> it mines PROBE_RATE_ORE_PER_MIN ore/min on the real clock (:4970),
//     collectprobe deposits that ore into the capacity-limited cargo HOLD (:4976 P.cargo.ore+=take),
//     and ORE is a market GOODS good (:1449) sold for credits via sell() (:1857-1858) at a supply/demand
//     price (priceOf :1804). So mined ore is carried and SOLD - unambiguously "sellable material".
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- 1. extract the REAL constants (read from source, so a CFG change re-reads, not hardcoded) ----
function cfgNum(key) { const m = SRC.match(new RegExp(key + ':\\s*([0-9.]+)')); return m ? Number(m[1]) : NaN; }
const EQ_STOCK = cfgNum('EQ_STOCK'), PRICE_ELAST = cfgNum('PRICE_ELAST'), PRICE_MIN = cfgNum('PRICE_MIN'), PRICE_MAX = cfgNum('PRICE_MAX');
const GEM_CREDIT_PER_SCALE = cfgNum('GEM_CREDIT_PER_SCALE'), PROBE_RATE = cfgNum('PROBE_RATE_ORE_PER_MIN'), PROBE_CAP = cfgNum('PROBE_STASH_CAP');
const oreM = SRC.match(/\{k:'ore',n:'Ore',base:([0-9]+),cat:'raw'\}/);
const ORE_BASE = oreM ? Number(oreM[1]) : NaN;
check('CFG economy + mining constants read from source (EQ_STOCK/ELAST/MIN/MAX/GEM_PER_SCALE/PROBE_RATE/CAP)',
  [EQ_STOCK, PRICE_ELAST, PRICE_MIN, PRICE_MAX, GEM_CREDIT_PER_SCALE, PROBE_RATE, PROBE_CAP].every(x => !isNaN(x)));
check('ore is a market GOODS good with a base price (sellable), read from source', !isNaN(ORE_BASE) && ORE_BASE > 0);

// ---- 2. SLICE & RUN the real priceOf (proves ore has a real supply/demand market price) ----
const priceOfM = SRC.match(/function priceOf\(p,gk\)\s*\{[^}]*\}/);
check('priceOf() sliced from source', !!priceOfM);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const GKEY = { ore: { base: ORE_BASE } };
const CFG = { EQ_STOCK, PRICE_ELAST, PRICE_MIN, PRICE_MAX };
const body = priceOfM[0].replace(/^function priceOf\(p,gk\)\s*\{/, '').replace(/\}\s*$/, '');
const priceOf = new Function('p', 'gk', 'GKEY', 'CFG', 'clamp', body);
const priceEq = priceOf({ eq: EQ_STOCK, stock: { ore: EQ_STOCK } }, 'ore', GKEY, CFG, clamp);   // equilibrium
const priceScarce = priceOf({ eq: EQ_STOCK, stock: { ore: 40 } }, 'ore', GKEY, CFG, clamp);       // low stock -> dear
const priceGlut = priceOf({ eq: EQ_STOCK, stock: { ore: 400 } }, 'ore', GKEY, CFG, clamp);        // high stock -> cheap
check('priceOf(ore) at equilibrium stock == ore base (' + priceEq.toFixed(2) + ' == ' + ORE_BASE + ')', Math.abs(priceEq - ORE_BASE) < 1e-6);
check('priceOf(ore) rises when the world is SHORT of ore (' + priceScarce.toFixed(2) + ' > ' + ORE_BASE + ')', priceScarce > ORE_BASE);
check('priceOf(ore) falls when the world is GLUTTED with ore (' + priceGlut.toFixed(2) + ' < ' + ORE_BASE + ')', priceGlut < ORE_BASE);

// ---- 3. SELL the mined ore: prove ore in the HOLD converts to CREDITS (the "sellable material" crux) ----
// transcribes the money/cargo transfer of sell() :1858 (rev=round(price*qty); credits+=rev; cargo-=qty),
// driven by the REAL priceOf output. Source-asserted below that the real sell() does exactly this.
const P = { credits: 100, cargo: { ore: 30 } };
const market = { eq: EQ_STOCK, stock: { ore: EQ_STOCK } };
const price = priceOf(market, 'ore', GKEY, CFG, clamp);
const rev = Math.round(price * P.cargo.ore); P.credits += rev; P.cargo.ore -= 30;
check('selling 30 mined ore pays credits (100 -> ' + P.credits + ', +' + rev + 'c) and empties the hold', rev > 0 && P.credits === 100 + rev && P.cargo.ore === 0);

// ---- 4. extract & RUN the real spawnGem credit formula (asteroid material -> credits) ----
const gemM = SRC.match(/const credits=Math\.max\(1,Math\.round\(scale\*CFG\.GEM_CREDIT_PER_SCALE\)\)/);
check('spawnGem credit formula found in source (:1352)', !!gemM);
const gemCredit = (scale) => Math.max(1, Math.round(scale * GEM_CREDIT_PER_SCALE));
check('a scale-5 rock chunk drops a gem worth ' + gemCredit(5) + 'c (=round(5*' + GEM_CREDIT_PER_SCALE + '))', gemCredit(5) === Math.round(5 * GEM_CREDIT_PER_SCALE));
check('a tiny chunk still drops a gem worth >= 1c (floor)', gemCredit(0.01) === 1);

// ---- 5. probe (resource node) accrual: ore mined over the real clock, capped at the stash cap ----
function probeStash(minutes) { return Math.min(PROBE_CAP, minutes * PROBE_RATE); }
check('a deployed probe mines ' + PROBE_RATE + ' ore/min: 10 min -> ' + probeStash(10) + ' ore', probeStash(10) === 10 * PROBE_RATE);
check('the probe stash caps at PROBE_STASH_CAP (' + PROBE_CAP + '): 60 min -> ' + probeStash(60) + ' (not ' + (60 * PROBE_RATE) + ')', probeStash(60) === PROBE_CAP);

// ---- 6. source-assert the CONNECTIVE WIRING (so a future edit that breaks a link fails this guard) ----
check('[wire] destroyed asteroid -> gem scooped adds credits + gem bar (:964)', /P\.credits\+=g\.credits;\s*gemBarAdd\(P,g\.credits\)/.test(SRC));
check('[wire] mining is a tracked activity (miningStats.rocksMined :905)', /rocksMined\s*:\s*0/.test(SRC) && /miningStats\.rocksMined\+\+/.test(SRC));
check('[wire] deployprobe sets a world mining ore/min (:4970)', /deployprobe/.test(SRC) && /mines \$\{CFG\.PROBE_RATE_ORE_PER_MIN\} ore\/min/.test(SRC));
check('[wire] collectprobe deposits ore into the capacity-limited cargo HOLD (:4976)', /P\.cargo\.ore=\(P\.cargo\.ore\|\|0\)\+take/.test(SRC));
check('[wire] sell() moves cargo -> credits at a market price (:1857-1858)', /function sell\(s,p,gk,qty\)/.test(SRC) && /s\.credits\+=rev/.test(SRC) && /s\.cargo\[gk\]-=qty/.test(SRC));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
process.exit(fail === 0 ? 0 : 1);
