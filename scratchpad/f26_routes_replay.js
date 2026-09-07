// f26_routes_replay.js - headless proof that the player can ASSIGN an owned ship a TRADE ROUTE that
// RUNS WITHOUT SUPERVISION: assign once, then the hauler cycles buy-at-A / fly / sell-at-B / fly / buy
// forever from a background tick, HOLDING a leg that stops paying. assign (economy.js:193-204),
// legTime (:213), and haulerTick (:214-247) are transcribed VERBATIM; CFG values are real (HAULER_SPEED
// 120, HAULER_DOCK_S 3.5, HAULER_HOLD 40, HAULER_MIN_MARGIN 0.5, economy.js:30-34). In the game
// ECONOMY.tick -> haulerTick is driven every frame (index.html:7767) AND during away missions via
// backgroundTick (:7757-7760) - i.e. while the player is off flying or walking a planet.
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { HAULER_SPEED: 120, HAULER_DOCK_S: 3.5, HAULER_HOLD: 40, HAULER_MIN_MARGIN: 0.5 };
const A = { name: 'Halcyon', price: { ore: 10 }, stock: { ore: 100 } };
const B = { name: 'Cydon', price: { ore: 25 }, stock: { ore: 100 } };
const _player = { credits: 5000 };
let S = { haulers: [] };
let PLANETS = { Halcyon: A, Cydon: B };          // repointable so the margin sub-test can swap prices
function P() { return _player; }
function planetByName(nm) { return PLANETS[nm] || null; }
function priceAt(planet, good) { return planet.price[good]; }
function goods() { return [{ k: 'ore' }]; }
function goodName() { return 'Ore'; }
function dist(a, b) { return 240; }             // fixed route distance
function log() {} function say() {}

// ---- VERBATIM economy.js:193-247 ----
function assign(h, fromName, toName, goodKey) {
  if (!h) return { ok: false, msg: 'no hauler' };
  var a = planetByName(fromName), b = planetByName(toName);
  if (!a) return { ok: false, msg: 'no world called ' + fromName };
  if (!b) return { ok: false, msg: 'no world called ' + toName };
  if (a === b) return { ok: false, msg: 'a route needs two different worlds' };
  if (!goods().filter(function (g) { return g.k === goodKey; }).length) return { ok: false, msg: 'no good called ' + goodKey };
  h.from = a.name; h.to = b.name; h.good = goodKey; h.state = 'toBuy'; h.t = 0; h.pos = 0; h.cargo = 0; h.note = '';
  return { ok: true };
}
function legTime(h, a, b) { var d = dist(a, b); return d == null ? 8 : Math.max(2, d / CFG.HAULER_SPEED); }
function haulerTick(dt) {
  var p = P(); if (!p) return;
  for (var i = 0; i < S.haulers.length; i++) {
    var h = S.haulers[i];
    if (h.state === 'idle' || !h.from || !h.to || !h.good) continue;
    var a = planetByName(h.from), b = planetByName(h.to);
    if (!a || !b) { h.state = 'idle'; h.note = 'a world on the route is gone'; continue; }
    h.t += dt;
    if (h.state === 'toBuy') { h.pos = Math.min(1, h.t / legTime(h, b, a)); if (h.t >= legTime(h, b, a)) { h.state = 'buying'; h.t = 0; } }
    else if (h.state === 'buying') {
      if (h.t < CFG.HAULER_DOCK_S) continue;
      h.t = 0;
      var buyP = priceAt(a, h.good), sellP = priceAt(b, h.good);
      if (!(sellP - buyP >= CFG.HAULER_MIN_MARGIN)) { h.note = 'holding at ' + a.name + ': ' + goodName(h.good) + ' buys at ' + Math.round(buyP) + 'c and only fetches ' + Math.round(sellP) + 'c at ' + b.name; continue; }
      var afford = Math.floor((p.credits || 0) / Math.max(1, buyP));
      var spare = Math.floor((a.stock[h.good] || 0) - 4);
      var qty = Math.max(0, Math.min(CFG.HAULER_HOLD, afford, spare));
      if (qty <= 0) { h.note = (afford <= 0 ? 'no credits to buy with' : 'no spare ' + goodName(h.good) + ' at ' + a.name); continue; }
      p.credits -= Math.round(buyP * qty); a.stock[h.good] -= qty; h.cargo = qty; h.buyPrice = buyP;
      h.state = 'toSell'; h.note = 'carrying ' + qty + ' ' + goodName(h.good) + ' to ' + b.name;
    }
    else if (h.state === 'toSell') { h.pos = Math.min(1, h.t / legTime(h, a, b)); if (h.t >= legTime(h, a, b)) { h.state = 'selling'; h.t = 0; } }
    else if (h.state === 'selling') {
      if (h.t < CFG.HAULER_DOCK_S) continue;
      h.t = 0;
      var sp = priceAt(b, h.good), rev = Math.round(sp * h.cargo);
      p.credits += rev; b.stock[h.good] = (b.stock[h.good] || 0) + h.cargo;
      var gain = rev - Math.round((h.buyPrice || 0) * h.cargo);
      h.profit += gain; h.runs++;
      h.note = 'last run ' + (gain >= 0 ? '+' : '') + gain + 'c';
      h.cargo = 0; h.state = 'toBuy';
    }
  }
}

// ---- the proof ----
const h = { id: 1, name: 'HAUL-1', from: null, to: null, good: null, state: 'idle', t: 0, pos: 0, cargo: 0, runs: 0, profit: 0, note: 'no route assigned' };
S.haulers.push(h);
check('[idle] a fresh hauler is idle until you assign it', h.state === 'idle');
const as = assign(h, 'Halcyon', 'Cydon', 'ore');
check('[assign] assigning A->B for a good puts it on route (state toBuy)', as.ok && h.state === 'toBuy' && h.from === 'Halcyon' && h.to === 'Cydon');

// drive the route with ONLY background ticks - NO player input at all (this IS "without supervision")
// tick until EXACTLY one run completes, then assert the one-run outcome (stops before run 2 buys)
const cred0 = _player.credits;
let guard = 0; while (h.runs < 1 && guard++ < 400) haulerTick(0.5);
check('[unsupervised] the route completed a run with ZERO player input', h.runs === 1);
check('[buy] goods bought at A (stock 100 -> 60) with the player\'s credits', A.stock.ore === 60);
check('[sell] goods sold at B (stock 100 -> 140) - a real A->B run', B.stock.ore === 140);
check('[profit] the run cleared +600c profit (40 x (25-10))', h.profit === 600 && h.runs === 1);
check('[credits] player net +600 from a route they never touched', _player.credits - cred0 === 600);

// keep ticking: the loop runs AGAIN, unsupervised
while (h.runs < 2 && guard++ < 800) haulerTick(0.5);
check('[repeat] a second run completes on its own (runs === 2)', h.runs === 2);

// margin HOLD: when a leg stops paying, the hauler HOLDS instead of running blind
const A2 = { name: 'Halcyon', price: { ore: 10 }, stock: { ore: 100 } };
const B2 = { name: 'Cydon', price: { ore: 10.2 }, stock: { ore: 100 } };   // margin 0.2 < HAULER_MIN_MARGIN 0.5
PLANETS = { Halcyon: A2, Cydon: B2 };            // repoint the world lookup for this sub-test
S = { haulers: [] };
const h2 = { id: 2, name: 'HAUL-2', from: null, to: null, good: null, state: 'idle', t: 0, pos: 0, cargo: 0, runs: 0, profit: 0, note: '' };
S.haulers.push(h2); assign(h2, 'Halcyon', 'Cydon', 'ore');
const cred1 = _player.credits;
for (let i = 0; i < 40; i++) haulerTick(0.5);
check('[hold] an unprofitable leg makes the hauler HOLD, not run blind', /holding at Halcyon/.test(h2.note) && h2.runs === 0);
check('[hold] holding costs the player nothing (no blind purchase)', _player.credits === cred1 && A2.stock.ore === 100);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
