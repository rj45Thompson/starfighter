// f27_station_replay.js - headless proof that the player can own a STATION/FACTORY that PRODUCES over
// time WHILE THE PLAYER IS AWAY: a station runs a production cycle from a background tick - consuming
// input goods from the world, producing an output good, and paying the player the margin - stalling
// (not destroying value) when inputs run short or the chain stops paying. stationTick (economy.js:146-177),
// cycleTime (:110) and batchOf (:111) are transcribed VERBATIM; CFG values are real (STATION_CYCLE_S 26,
// STATION_CYCLE_GAIN 0.14, STATION_BATCH 4, STATION_BATCH_GAIN 1, STATION_STOCK_FLOOR 6, economy.js:22-26).
// In the game ECONOMY.tick -> stationTick is driven every frame (index.html:7767) AND during away missions
// via backgroundTick (:7757-7760) - i.e. while the player flies elsewhere or walks a planet.
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { STATION_CYCLE_S: 26, STATION_CYCLE_GAIN: 0.14, STATION_BATCH: 4, STATION_BATCH_GAIN: 1, STATION_STOCK_FLOOR: 6 };
let PLANETS = {};
const _player = { credits: 0 };
let S = { stations: [] };
function P() { return _player; }
function planetByName(nm) { return PLANETS[nm] || null; }
function priceAt(planet, good) { return planet.price[good]; }
function goodName(k) { return ({ ore: 'Ore', alloy: 'Alloy' })[k] || k; }
function log() {}

// ---- VERBATIM economy.js:110-111, 146-177 ----
function cycleTime(st) { return CFG.STATION_CYCLE_S * Math.max(0.3, 1 - CFG.STATION_CYCLE_GAIN * (st.lvl - 1)); }
function batchOf(st) { return CFG.STATION_BATCH + CFG.STATION_BATCH_GAIN * (st.lvl - 1); }
function stationTick(dt) {
  var p = P(); if (!p) return;
  for (var i = 0; i < S.stations.length; i++) {
    var st = S.stations[i], pl = planetByName(st.planet);
    if (!pl || !pl.stock) { st.stalled = 'the world is gone'; continue; }
    st.t += dt;
    if (st.t < cycleTime(st)) continue;
    st.t = 0;
    var batch = batchOf(st), k;
    var short = null;
    for (k = 0; k < st.ins.length; k++) {
      var have = pl.stock[st.ins[k]] || 0;
      if (have - batch < CFG.STATION_STOCK_FLOOR) { short = st.ins[k]; break; }
    }
    if (short) { st.stalled = 'no ' + goodName(short) + ' to work with on ' + pl.name; continue; }
    var unit = 0; for (k = 0; k < st.ins.length; k++) unit += priceAt(pl, st.ins[k]);
    unit = priceAt(pl, st.out) - unit;
    if (!(unit > 0)) { st.stalled = goodName(st.out) + ' is worth less on ' + pl.name + ' than its inputs cost there (' + Math.round(unit) + 'c a unit) - holding'; continue; }
    st.stalled = null;
    var inCost = 0;
    for (k = 0; k < st.ins.length; k++) { inCost += priceAt(pl, st.ins[k]) * batch; pl.stock[st.ins[k]] -= batch; }
    var revenue = priceAt(pl, st.out) * batch;
    pl.stock[st.out] = (pl.stock[st.out] || 0) + batch;
    var margin = Math.round(revenue - inCost);
    st.made += batch; st.earned += margin;
    p.credits += margin;
    if (st.made === batch) log('station', pl.name + ' first cycle');
  }
}

// ---- the proof ----
// level scaling (cycleTime shortens, batch grows) - a station gets better with levels
check('[scale] cycleTime shortens with level (26 -> 22.36)', cycleTime({ lvl: 1 }) === 26 && Math.abs(cycleTime({ lvl: 2 }) - 22.36) < 1e-9);
check('[scale] batch grows with level (4 -> 5 -> 6)', batchOf({ lvl: 1 }) === 4 && batchOf({ lvl: 2 }) === 5 && batchOf({ lvl: 3 }) === 6);

// a healthy factory: ore (10c) -> alloy (30c), 20c/unit margin
const H = { name: 'Halcyon', price: { ore: 10, alloy: 30 }, stock: { ore: 100, alloy: 0 } };
PLANETS = { Halcyon: H };
const st = { id: 1, planet: 'Halcyon', lvl: 1, t: 0, made: 0, earned: 0, stalled: null, out: 'alloy', ins: ['ore'] };
S = { stations: [st] };
const cred0 = _player.credits;
// drive ONLY background ticks until exactly ONE cycle fires (this IS "produces while away")
let guard = 0; while (st.made < 4 && guard++ < 400) stationTick(0.5);
check('[produce] a cycle fired from background ticks with ZERO player input', st.made === 4);
check('[consume] inputs were consumed from the world (ore 100 -> 96)', H.stock.ore === 96);
check('[output] output produced into the world (alloy 0 -> 4)', H.stock.alloy === 4);
check('[earn] the player earned the margin (revenue 120 - inCost 40 = 80c)', st.earned === 80 && _player.credits - cred0 === 80);
// keep ticking: it produces AGAIN, unsupervised
while (st.made < 8 && guard++ < 800) stationTick(0.5);
check('[repeat] a second cycle produces on its own (made 8, earned 160)', st.made === 8 && st.earned === 160);

// STALL 1: inputs run short -> hold, do not produce (never strips the world below the floor)
const H2 = { name: 'Halcyon', price: { ore: 10, alloy: 30 }, stock: { ore: 8, alloy: 0 } };   // 8-4=4 < STOCK_FLOOR 6
PLANETS = { Halcyon: H2 };
const st2 = { id: 2, planet: 'Halcyon', lvl: 1, t: 0, made: 0, earned: 0, stalled: null, out: 'alloy', ins: ['ore'] };
S = { stations: [st2] };
for (let i = 0; i < 120; i++) stationTick(0.5);
check('[stall-inputs] a world short on inputs STALLS the plant (made 0)', st2.made === 0 && /no Ore to work with/.test(st2.stalled || ''));
check('[stall-inputs] stalling leaves the world stock untouched (ore stays 8)', H2.stock.ore === 8);

// STALL 2: the chain stops paying (output worth less than inputs) -> hold rather than destroy value
const H3 = { name: 'Halcyon', price: { ore: 10, alloy: 8 }, stock: { ore: 100, alloy: 0 } };   // unit = 8-10 = -2 <= 0
PLANETS = { Halcyon: H3 };
const st3 = { id: 3, planet: 'Halcyon', lvl: 1, t: 0, made: 0, earned: 0, stalled: null, out: 'alloy', ins: ['ore'] };
S = { stations: [st3] };
const cred1 = _player.credits;
for (let i = 0; i < 120; i++) stationTick(0.5);
check('[stall-margin] an unprofitable chain HOLDS instead of producing at a loss', st3.made === 0 && /worth less/.test(st3.stalled || ''));
check('[stall-margin] holding costs the player nothing', _player.credits === cred1 && H3.stock.ore === 100);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
