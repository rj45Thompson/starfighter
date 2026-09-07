// f22_market_replay.js - headless proof that the `market` command (index.html GALAXY MARKET,
// :4966-4973) SHOWS THE PLAYER WHERE THEIR HELD GOODS SELL BEST: for every good it names the
// best-sell world (highest bid) and best-buy world (cheapest ask) across the OPEN (non-hostile,
// non-Hegemon) dockable worlds, the per-unit spread, and flags the goods the player is holding.
// The scan loop below is transcribed VERBATIM from index.html:4968-4972. (The second, independent
// surface - planetmenu.js routesHtml TRADE ROUTES, "YOUR HOLD - best price seen elsewhere", best two
// SEEN buyers per HELD good with distance + per-unit gain, :591-630 - is hands-off; read to corroborate.)
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { REP_HOSTILE: -3 };   // representative; the loop only depends on the > comparison
const GOODS = [{ k: 'ore', n: 'Ore' }, { k: 'water', n: 'Water' }];
// per-planet, per-good prices (stand in for priceOf(q,g.k))
const PRICES = {
  Halcyon: { ore: 12, water: 40 },
  Cydon:   { ore: 28, water: 22 },
  Pallas:  { ore: 99, water: 99 },   // HOSTILE - would be top best-sell if the filter were broken
  Drex:    { ore: 88, water: 5 },    // Hegemon-held - excluded too
};
function priceOf(q, k) { return PRICES[q.name][k]; }
const planets = [
  { name: 'Halcyon', rep: 5,  hegemon: false },
  { name: 'Cydon',   rep: 3,  hegemon: false },
  { name: 'Pallas',  rep: -5, hegemon: false },   // rep <= REP_HOSTILE -> excluded
  { name: 'Drex',    rep: 5,  hegemon: true },     // hegemon -> excluded
];
const P = { hold: { ore: 30 } };   // the player is CARRYING 30 ore, 0 water

// ---- VERBATIM index.html:4968-4972 (captured into `report` instead of term()) ----
const report = [];
const open = planets.filter(q => q.rep > CFG.REP_HOSTILE && !q.hegemon);
GOODS.forEach(g => {
  let lo = null, hi = null;
  for (const q of open) { const pr = priceOf(q, g.k); if (!lo || pr < lo.pr) lo = { q, pr }; if (!hi || pr > hi.pr) hi = { q, pr }; }
  const spread = lo && hi ? Math.round(hi.pr - lo.pr) : 0, hold = (P.hold && P.hold[g.k]) || (P.cargo && P.cargo[g.k]) || 0;
  report.push({ good: g.k, bestBuy: lo && { name: lo.q.name, pr: lo.pr }, bestSell: hi && { name: hi.q.name, pr: hi.pr }, spread, hold });
});
const R = Object.fromEntries(report.map(r => [r.good, r]));

// ---- the proof ----
// 1) the OPEN filter excludes hostile + Hegemon worlds (so a hostile world's high bid is NOT shown as "best sell")
check('[filter] open worlds are exactly Halcyon + Cydon (Pallas hostile, Drex Hegemon excluded)',
  open.length === 2 && open.map(q => q.name).sort().join(',') === 'Cydon,Halcyon');

// 2) BEST SELL = the highest bid among OPEN worlds (the core "where it sells best")
check('[best-sell] ore sells best at Cydon (28c), NOT hostile Pallas (99) or Hegemon Drex (88)',
  R.ore.bestSell.name === 'Cydon' && R.ore.bestSell.pr === 28);
check('[best-sell] water sells best at Halcyon (40c)',
  R.water.bestSell.name === 'Halcyon' && R.water.bestSell.pr === 40);

// 3) BEST BUY = the cheapest ask among OPEN worlds
check('[best-buy] ore is cheapest at Halcyon (12c)', R.ore.bestBuy.name === 'Halcyon' && R.ore.bestBuy.pr === 12);
check('[best-buy] water is cheapest at Cydon (22c)', R.water.bestBuy.name === 'Cydon' && R.water.bestBuy.pr === 22);

// 4) per-unit spread is best-sell minus best-buy
check('[spread] ore spread = 28-12 = 16c/u', R.ore.spread === 16);
check('[spread] water spread = 40-22 = 18c/u', R.water.spread === 18);

// 5) the table FLAGS the goods the player is HOLDING (this is what makes it "held goods sell best")
check('[held] ore shows hold 30 (the player is carrying it)', R.ore.hold === 30);
check('[held] water shows hold 0 (not carried)', R.water.hold === 0);

// 6) the reverse mis-grade would be: best-sell ignores the filter and just picks the global max.
//    Prove it does NOT - the excluded worlds hold the true global maxima but never win.
check('[not-omniscient-of-hostiles] neither best-sell is an excluded world',
  R.ore.bestSell.name !== 'Pallas' && R.ore.bestSell.name !== 'Drex' &&
  R.water.bestSell.name !== 'Pallas' && R.water.bestSell.name !== 'Drex');

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
