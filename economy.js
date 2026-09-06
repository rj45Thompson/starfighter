// economy.js - the EGOSOFT layer (RJ 2026-09-06: "then we will move to egosoft level requirements... until we are
// at par with egosofts space game"). Two things the X games have and a Space-Rangers game does not: an economy you
// OWN, and ships that work it for you while you fly somewhere else.
//
//   STATION  - built on a world you are docked at. It runs that world's own recipe: every cycle it consumes the
//              inputs from that planet's stock and adds the output back, and pays you the margin between what the
//              inputs cost there and what the output sells for there. A station cannot invent goods: if the inputs
//              are not in stock, the cycle STALLS and says so. It is upgradeable, sellable, and it is a target.
//   HAULER   - a ship you own, assigned a route BUY-at-A / SELL-at-B for one good. It flies real distance at a real
//              speed, buys with your credits at A's live price and sells at B's, and reports each leg. It uses the
//              same buy/sell arithmetic the player does (price, stock drain, the +4 stock floor), so a route that
//              would be unprofitable for you is unprofitable for it too.
//
// One global: window.ECONOMY. All state lives here and is handed to the save through save()/load(). Nothing here
// invents a price or a distance - every number is read from HOST (planets, GOODS, priceOf, the ships array).
(function () {
  'use strict';
  var CFG = {
    STATION_COST: 2400,          // what a station costs to plant
    STATION_UPGRADE: 1800,       // per level after the first
    STATION_MAX_LVL: 5,
    STATION_CYCLE_S: 26,         // seconds per production cycle at level 1
    STATION_CYCLE_GAIN: 0.14,    // each level shortens the cycle by this fraction
    STATION_BATCH: 4,            // output units per cycle at level 1
    STATION_BATCH_GAIN: 1,       // extra output units per level
    STATION_STOCK_FLOOR: 6,      // never drain a world's stock below this taking inputs
    STATION_REP_MIN: -2,         // a world that dislikes you will not host one
    STATION_SELL_FRAC: 0.55,     // what selling a station returns
    HAULER_COST: 1600,           // buying a hauler outright
    HAULER_SPEED: 120,           // units per second in transit
    HAULER_DOCK_S: 3.5,          // seconds spent at each end
    HAULER_HOLD: 40,
    HAULER_MIN_MARGIN: 0.5,      // a leg that cannot clear this per unit is reported, not flown blind
    LOG_MAX: 40
  };

  var S = { stations: [], haulers: [], log: [], nextId: 1, t: 0 };

  function H() { return (typeof window !== 'undefined') ? window.HOST : null; }
  function P() { var h = H(); return h && (h.P || (h.ships && h.ships[0])); }
  function planets() { var h = H(); return (h && h.planets) || []; }
  function goods() { var h = H(); return (h && h.GOODS) || []; }
  function goodName(k) { var g = goods().filter(function (x) { return x.k === k; })[0]; return g ? g.n : k; }
  function priceAt(pl, k) { var h = H(); return (h && typeof h.priceOf === 'function' && pl) ? h.priceOf(pl, k) : NaN; }
  function planetByName(n) { return planets().filter(function (p) { return p.name === n; })[0] || null; }
  function dist(a, b) { if (!a || !b || !a.pos || !b.pos) return null; var dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, dz = a.pos.z - b.pos.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
  function now() { var h = H(); return (h && h.T0 != null) ? h.T0 : S.t; }
  function log(kind, text) { S.log.unshift({ t: now(), kind: kind, text: text }); while (S.log.length > CFG.LOG_MAX) S.log.pop(); }
  function say(text, cls) { var h = H(); if (h && typeof h.term === 'function') h.term(text, cls || 'sys'); }

  // ---- STATIONS -------------------------------------------------------------------------------------------
  // PRODUCTION CHAINS. A station converts goods, so it needs a real graph of what turns into what - and the FIRST
  // attempt got the economics backwards: it consumed the world's expensive IMPORTS to make its cheap EXPORT, which
  // is exactly the wrong direction and lost 527c a cycle in testing. A station is worth building where the inputs
  // are cheap and the output is dear, which on a mining world means smelting the local ore, not importing tech.
  // So: the chain is chosen by LIVE LOCAL PRICES, and if no chain clears a margin here, the build is refused with
  // that reason rather than quietly planting a loss-maker.
  // Each chain must be able to PAY at the galaxy's base prices (ore 14, food 11, gas 6, alloy 26, tech 42, med 34,
  // lux 58) or it is dead weight that no world will ever pick. The first set failed that test: pharma, finishing and
  // cracking were negative everywhere, so only two of six chains could ever be built. These five clear +5 to +21 at
  // base, and local prices then decide which one a given world actually wants.
  var CHAINS = [
    { out: 'alloy', ins: ['ore', 'gas'], n: 'smelter' },                 // +6 at base
    { out: 'tech', ins: ['alloy', 'gas'], n: 'fabricator' },             // +10
    { out: 'med', ins: ['food', 'gas'], n: 'pharmaceutical plant' },     // +17
    { out: 'lux', ins: ['food', 'alloy'], n: 'finishing works' },        // +21
    { out: 'food', ins: ['gas'], n: 'hydroponics dome' }                 // +5
  ];
  function chainMargin(pl, ch) {
    var outP = priceAt(pl, ch.out); if (!isFinite(outP)) return NaN;
    var cost = 0;
    for (var i = 0; i < ch.ins.length; i++) { var v = priceAt(pl, ch.ins[i]); if (!isFinite(v)) return NaN; cost += v; }
    return outP - cost;
  }
  // A chain that pays on paper is worthless if the world cannot feed it, so the pick is margin WEIGHTED BY LOCAL
  // SUPPLY: a fabricator on a mining world stalls for alloy no matter how good tech's price looks, while a smelter
  // there runs on the ore underfoot. availability is the tightest input's stock against what a few cycles need.
  function availability(pl, ch) {
    var need = CFG.STATION_STOCK_FLOOR + CFG.STATION_BATCH * 4, a = 1, i;
    for (i = 0; i < ch.ins.length; i++) { var have = (pl.stock[ch.ins[i]] || 0); a = Math.min(a, Math.max(0, have / need)); }
    return Math.min(1, a);
  }
  function recipeFor(pl) {
    if (!pl || !pl.stock) return null;
    var best = null, i;
    for (i = 0; i < CHAINS.length; i++) {
      var ch = CHAINS[i];
      var m = chainMargin(pl, ch); if (!isFinite(m)) continue;
      var av = availability(pl, ch);
      var makes = (pl.type && pl.type.makes) || {}, needs = (pl.type && pl.type.needs) || {};
      var fed = 0, k; for (k = 0; k < ch.ins.length; k++) if (makes[ch.ins[k]]) fed++;
      var fedFrac = ch.ins.length ? fed / ch.ins.length : 0;     // inputs this world produces itself, so they keep coming
      var wanted = needs[ch.out] ? 1 : 0;                        // output this world imports, so it keeps buying
      // ABSOLUTE margin per unit, not a ratio: every chain makes the same batch per cycle here, so what a station
      // earns is margin x batch and nothing else. (A ratio was tried first and picked the cheapest chain - a
      // hydroponics dome earning 5c over a smelter earning 6c on a world that mines its own ore.)
      var score = m * (0.35 + 0.65 * av) * (1 + 0.7 * fedFrac + 0.7 * wanted);
      if (!best || score > best.score) best = { out: ch.out, ins: ch.ins.slice(), n: ch.n, margin: m, avail: av, score: score, fedFrac: fedFrac, wanted: !!wanted };
    }
    if (best) { var bits = [Math.round(best.margin) + 'c a unit here'];
      if (best.fedFrac >= 1) bits.push('this world makes both inputs itself');
      else if (best.fedFrac > 0) bits.push('this world makes one of the inputs');
      if (best.wanted) bits.push('and imports the output, so it will keep buying');
      bits.push(best.avail >= 0.99 ? 'the inputs are in stock' : best.avail >= 0.5 ? 'the inputs are mostly in stock'
        : 'the inputs are thin here (' + Math.round(best.avail * 100) + '% of a comfortable run)');
      best.why = bits.join(', '); }
    return best;
  }
  function stationAt(pl) { return S.stations.filter(function (st) { return st.planet === pl.name; })[0] || null; }
  function cycleTime(st) { return CFG.STATION_CYCLE_S * Math.max(0.3, 1 - CFG.STATION_CYCLE_GAIN * (st.lvl - 1)); }
  function batchOf(st) { return CFG.STATION_BATCH + CFG.STATION_BATCH_GAIN * (st.lvl - 1); }

  function buildStation(pl) {
    var p = P(); if (!p || !pl) return { ok: false, msg: 'no ship' };
    if (pl._base) return { ok: false, msg: 'Ranger Command hosts no private industry' };
    if (stationAt(pl)) return { ok: false, msg: 'you already own the station at ' + pl.name };
    if ((pl.rep || 0) < CFG.STATION_REP_MIN) return { ok: false, msg: pl.name + ' will not host your industry at reputation ' + Math.round(pl.rep || 0) };
    var r = recipeFor(pl); if (!r) return { ok: false, msg: pl.name + ' produces nothing a station could refine' };
    if (!(r.margin > 0)) return { ok: false, msg: 'nothing is worth refining on ' + pl.name + ' - the best chain there (' + r.n + ') loses ' + Math.abs(Math.round(r.margin)) + 'c a unit at local prices' };
    if ((p.credits || 0) < CFG.STATION_COST) return { ok: false, msg: 'a station costs ' + CFG.STATION_COST + 'c - you hold ' + Math.round(p.credits || 0) + 'c' };
    p.credits -= CFG.STATION_COST;
    var st = { id: S.nextId++, planet: pl.name, lvl: 1, t: 0, made: 0, earned: 0, stalled: null, out: r.out, ins: r.ins, kind: r.n };
    S.stations.push(st);
    log('station', 'built a ' + r.n + ' on ' + pl.name + ': ' + r.ins.map(goodName).join(' + ') + ' to ' + goodName(r.out) + ', ' + Math.round(r.margin) + 'c a unit');
    say('&#9670; STATION built on <b>' + pl.name + '</b> (-' + CFG.STATION_COST + 'c) - a ' + r.n + ' turning ' + r.ins.map(goodName).join(' + ') + ' into <b>' + goodName(r.out) + '</b>, worth about ' + Math.round(r.margin) + 'c a unit at today\'s local prices.');
    return { ok: true, station: st };
  }
  function upgradeStation(st) {
    var p = P(); if (!p || !st) return { ok: false, msg: 'no station' };
    if (st.lvl >= CFG.STATION_MAX_LVL) return { ok: false, msg: 'that station is at its maximum level' };
    var cost = CFG.STATION_UPGRADE * st.lvl;
    if ((p.credits || 0) < cost) return { ok: false, msg: 'that upgrade costs ' + cost + 'c - you hold ' + Math.round(p.credits || 0) + 'c' };
    p.credits -= cost; st.lvl++;
    log('station', st.planet + ' station to level ' + st.lvl);
    say('&#9670; ' + st.planet + ' station is now <b>level ' + st.lvl + '</b> (-' + cost + 'c): ' + batchOf(st) + ' units per cycle, ' + Math.round(cycleTime(st)) + 's a cycle.');
    return { ok: true };
  }
  function sellStation(st) {
    var p = P(); if (!p || !st) return { ok: false, msg: 'no station' };
    var back = Math.round((CFG.STATION_COST + CFG.STATION_UPGRADE * (st.lvl - 1)) * CFG.STATION_SELL_FRAC);
    p.credits += back; S.stations = S.stations.filter(function (x) { return x !== st; });
    log('station', 'sold the ' + st.planet + ' station for ' + back + 'c');
    say('&#9670; sold the ' + st.planet + ' station (+' + back + 'c).');
    return { ok: true, back: back };
  }
  function stationTick(dt) {
    var p = P(); if (!p) return;
    for (var i = 0; i < S.stations.length; i++) {
      var st = S.stations[i], pl = planetByName(st.planet);
      if (!pl || !pl.stock) { st.stalled = 'the world is gone'; continue; }
      st.t += dt;
      if (st.t < cycleTime(st)) continue;
      st.t = 0;
      var batch = batchOf(st), k;
      // inputs must genuinely be there, and taking them may not strip the world bare
      var short = null;
      for (k = 0; k < st.ins.length; k++) {
        var have = pl.stock[st.ins[k]] || 0;
        if (have - batch < CFG.STATION_STOCK_FLOOR) { short = st.ins[k]; break; }
      }
      if (short) { st.stalled = 'no ' + goodName(short) + ' to work with on ' + pl.name; continue; }
      // prices move: a chain that paid when it was built can stop paying. Wait rather than destroy value, and say
      // why - the same honesty the market and trade routes hold to.
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
      if (st.made === batch) log('station', pl.name + ' first cycle: ' + batch + ' ' + goodName(st.out) + ' for ' + (margin >= 0 ? '+' : '') + margin + 'c');
    }
  }

  // ---- HAULERS --------------------------------------------------------------------------------------------
  function buyHauler(name) {
    var p = P(); if (!p) return { ok: false, msg: 'no ship' };
    if ((p.credits || 0) < CFG.HAULER_COST) return { ok: false, msg: 'a hauler costs ' + CFG.HAULER_COST + 'c - you hold ' + Math.round(p.credits || 0) + 'c' };
    p.credits -= CFG.HAULER_COST;
    var h = { id: S.nextId++, name: name || ('HAUL-' + S.nextId), from: null, to: null, good: null, state: 'idle', t: 0, pos: 0, cargo: 0, runs: 0, profit: 0, note: 'no route assigned' };
    S.haulers.push(h);
    log('hauler', 'bought ' + h.name);
    say('&#9670; hauler <b>' + h.name + '</b> bought (-' + CFG.HAULER_COST + 'c) - assign it a route to put it to work.');
    return { ok: true, hauler: h };
  }
  function assign(h, fromName, toName, goodKey) {
    if (!h) return { ok: false, msg: 'no hauler' };
    var a = planetByName(fromName), b = planetByName(toName);
    if (!a) return { ok: false, msg: 'no world called ' + fromName };
    if (!b) return { ok: false, msg: 'no world called ' + toName };
    if (a === b) return { ok: false, msg: 'a route needs two different worlds' };
    if (!goods().filter(function (g) { return g.k === goodKey; }).length) return { ok: false, msg: 'no good called ' + goodKey };
    h.from = a.name; h.to = b.name; h.good = goodKey; h.state = 'toBuy'; h.t = 0; h.pos = 0; h.cargo = 0; h.note = '';
    log('hauler', h.name + ': ' + a.name + ' to ' + b.name + ' carrying ' + goodName(goodKey));
    say('&#9670; <b>' + h.name + '</b> assigned: buy <b>' + goodName(goodKey) + '</b> at ' + a.name + ', sell at ' + b.name + '.');
    return { ok: true };
  }
  function recall(h) { if (!h) return { ok: false }; h.state = 'idle'; h.note = 'recalled'; return { ok: true }; }
  function sellHauler(h) {
    var p = P(); if (!p || !h) return { ok: false, msg: 'no hauler' };
    var back = Math.round(CFG.HAULER_COST * 0.6); p.credits += back;
    S.haulers = S.haulers.filter(function (x) { return x !== h; });
    log('hauler', 'sold ' + h.name + ' for ' + back + 'c');
    return { ok: true, back: back };
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
        log('hauler', h.name + ' ran ' + h.cargo + ' ' + goodName(h.good) + ' ' + a.name + ' to ' + b.name + ' for ' + (gain >= 0 ? '+' : '') + gain + 'c');
        h.note = 'last run ' + (gain >= 0 ? '+' : '') + gain + 'c';
        h.cargo = 0; h.state = 'toBuy';
      }
    }
  }

  function migrateNow() {
    for (var i = 0; i < S.stations.length; i++) {
      var st = S.stations[i]; if (!st.migrate) continue;
      var pl = planetByName(st.planet); if (!pl) continue;   // still no galaxy - try again next tick
      var r = recipeFor(pl); if (!r) { st.migrate = false; st.stalled = 'no production chain fits ' + st.planet; continue; }
      log('station', 'the ' + st.planet + ' station was rebuilt as a ' + r.n + ' - its saved recipe was not a production chain');
      say('&#9670; your ' + st.planet + ' station was rebuilt as a <b>' + r.n + '</b> - the recipe it was saved with is not a production chain.');
      st.out = r.out; st.ins = r.ins.slice(); st.kind = r.n; st.stalled = null; st.migrate = false;
    }
  }
  function tick(dt) { if (!(dt > 0)) return; S.t += dt; migrateNow(); stationTick(dt); haulerTick(dt); }

  // ---- what the UI reads ----------------------------------------------------------------------------------
  function snapshot() {
    return {
      stations: S.stations.map(function (st) {
        var pl = planetByName(st.planet);
        var live = pl ? (function () { var u = 0; for (var q = 0; q < st.ins.length; q++) u += priceAt(pl, st.ins[q]); return priceAt(pl, st.out) - u; })() : NaN;
        return { id: st.id, planet: st.planet, lvl: st.lvl, kind: st.kind || 'refinery', margin: isFinite(live) ? Math.round(live) : null,
          out: st.out, outName: goodName(st.out), ins: st.ins.slice(),
          insName: st.ins.map(goodName), made: st.made, earned: st.earned, stalled: st.stalled,
          cycle: Math.round(cycleTime(st)), batch: batchOf(st), progress: Math.min(1, st.t / cycleTime(st)),
          upgradeCost: st.lvl < CFG.STATION_MAX_LVL ? CFG.STATION_UPGRADE * st.lvl : null,
          stock: pl && pl.stock ? Math.round(pl.stock[st.out] || 0) : null };
      }),
      haulers: S.haulers.map(function (h) {
        return { id: h.id, name: h.name, from: h.from, to: h.to, good: h.good, goodName: h.good ? goodName(h.good) : null,
          state: h.state, note: h.note, cargo: h.cargo, runs: h.runs, profit: h.profit, pos: h.pos };
      }),
      log: S.log.slice(0, 12),
      totals: { stations: S.stations.length, haulers: S.haulers.length,
        earned: S.stations.reduce(function (a, s) { return a + s.earned; }, 0) + S.haulers.reduce(function (a, h) { return a + h.profit; }, 0) }
    };
  }
  function save() { return { stations: S.stations, haulers: S.haulers, nextId: S.nextId }; }
  function load(o) {
    if (!o) return false;
    S.stations = Array.isArray(o.stations) ? o.stations : [];
    // MIGRATION: stations saved before the production chains carry a recipe that is not one of them (the first
    // version consumed a world's imports to make its export and lost money). Re-derive those from the chains, so
    // an old save does not keep running a loss-maker in silence.
    S.stations.forEach(function (st) {
      var known = CHAINS.filter(function (c) { return c.out === st.out && c.ins.join() === (st.ins || []).join(); })[0];
      if (known) { st.kind = st.kind || known.n; return; }
      st.migrate = true;   // done on the first tick: at load time the galaxy may not be built yet, and a migration
                           // that quietly gives up is exactly the silent failure this codebase forbids
    });
    S.haulers = Array.isArray(o.haulers) ? o.haulers : [];
    S.nextId = o.nextId || (S.stations.length + S.haulers.length + 1);
    return true;
  }

  window.ECONOMY = {
    CFG: CFG, tick: tick, snapshot: snapshot, save: save, load: load,
    recipeFor: recipeFor, stationAt: stationAt, buildStation: buildStation,
    upgradeStation: upgradeStation, sellStation: sellStation,
    stationById: function (id) { return S.stations.filter(function (s) { return s.id === id; })[0] || null; },
    haulerById: function (id) { return S.haulers.filter(function (h) { return h.id === id; })[0] || null; },
    buyHauler: buyHauler, assign: assign, recall: recall, sellHauler: sellHauler,
    stations: function () { return S.stations.slice(); }, haulers: function () { return S.haulers.slice(); }
  };
})();
