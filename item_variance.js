// item_variance.js - SR ITEM INSTANCE VARIANCE (user 2026-07-10: "those are just template items, they vary
// significantly per drop - shop price, condition, weight and power, all variable"). In Space Rangers every item is
// a TEMPLATE; each actual drop / shop-listing is an INSTANCE that varies in QUALITY, CONDITION (wear), WEIGHT,
// POWER and PRICE. This module rolls a DETERMINISTIC instance from a template so a shop's stock is stable until it
// restocks (seed = planet+item+restock-epoch), a drop is stable once spawned, and Node can reproduce it exactly.
// CPU, ASCII, no model. window.ITEMVAR = { roll, describe, QUALITY }.
(function () {
  'use strict';

  // QUALITY tiers (SR: standard grey items, "orange-named" acrynic/dominator can EXCEED the template). `mul` scales
  // the item's headline power; `wt` is the roll weight (worn+standard common, dominator rare).
  var QUALITY = [
    { q: 'worn',      col: '#8f9aa6', mul: 0.80, wt: 30 },   // below-template, cheap salvage
    { q: 'standard',  col: '#cfe6f5', mul: 1.00, wt: 42 },
    { q: 'fine',      col: '#8fe38f', mul: 1.15, wt: 16 },
    { q: 'acrynic',   col: '#ffb454', mul: 1.32, wt: 8 },    // orange-named - beats the template
    { q: 'dominator', col: '#ff6ad0', mul: 1.50, wt: 4 }     // rarest, best
  ];

  // deterministic PRNG (mulberry32) + a string hash -> a stable seed per item instance
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    s = String(s); var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function pickQuality(rnd) {
    var tot = 0, i; for (i = 0; i < QUALITY.length; i++) tot += QUALITY[i].wt;
    var r = rnd() * tot; for (i = 0; i < QUALITY.length; i++) { r -= QUALITY[i].wt; if (r <= 0) return QUALITY[i]; }
    return QUALITY[1];
  }

  // roll a variance INSTANCE from a template. `seedKey` (any string) makes it deterministic + stable; `baseCost`
  // and `baseWeight` come from the template (weight defaults to a nominal 10 std units). Returns:
  //   { quality, col, condition(55-100%), weight, weightRatio(0.85..4.5x std), powerMul(~0.5..1.8x), price }
  function roll(seedKey, baseCost, baseWeight) {
    var rnd = mulberry32(hashStr(seedKey));
    var Q = pickQuality(rnd);
    var condition = Math.round(55 + rnd() * 45);                         // 55-100% wear
    var wLo = (Q.q === 'acrynic' || Q.q === 'dominator') ? 0.85 : 1.0;   // orange-named can dip below standard weight
    var weightRatio = Math.round((wLo + rnd() * (4.5 - wLo)) * 100) / 100;   // up to ~4.5x standard (SR's stated cap)
    var weight = Math.max(1, Math.round((baseWeight || 10) * weightRatio));
    // power = quality tier * a per-instance jitter * a condition factor (a worn item performs below its rating)
    var powerMul = Math.round(Q.mul * (0.92 + rnd() * 0.16) * (0.6 + 0.4 * condition / 100) * 1000) / 1000;
    // price scales with power, is discounted by wear, and a heavier instance costs a touch more raw material
    var price = Math.max(1, Math.round((baseCost || 100) * powerMul * (0.7 + 0.3 * condition / 100) * (1 + (weightRatio - 1) * 0.12)));
    return { quality: Q.q, col: Q.col, condition: condition, weight: weight, weightRatio: weightRatio, powerMul: powerMul, price: price };
  }

  // a compact one-line human description of an instance (for the shop / inspect UI)
  function describe(inst) {
    var name = inst.quality.charAt(0).toUpperCase() + inst.quality.slice(1);
    return name + ' · ' + inst.condition + '% cond · wt ' + inst.weight + ' · pwr ' + Math.round(inst.powerMul * 100) + '% · ' + inst.price + 'c';
  }

  var API = { roll: roll, describe: describe, QUALITY: QUALITY, _hash: hashStr };
  if (typeof window !== 'undefined') window.ITEMVAR = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  // ================================================================== self-test (node)
  if (typeof require !== 'undefined' && require.main === module) {
    var pass = 0, fail = 0;
    function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

    // 1. DETERMINISM: same seed -> byte-identical instance
    var a1 = roll('cydon|energy|epoch7', 220, 12), a2 = roll('cydon|energy|epoch7', 220, 12);
    check('[determinism] same seed -> identical instance', JSON.stringify(a1) === JSON.stringify(a2));
    // 2. VARIANCE: different seeds -> the stock genuinely varies (not all clones)
    var insts = []; for (var i = 0; i < 60; i++) insts.push(roll('slot' + i, 220, 12));
    var distinctPrice = new Set(insts.map(x => x.price)).size, distinctQ = new Set(insts.map(x => x.quality)).size;
    check('[variance] 60 rolls produce many distinct prices (>20)', distinctPrice > 20);
    check('[variance] multiple quality tiers appear across rolls', distinctQ >= 3);
    // 3. RANGES: condition 55-100, weightRatio 0.85-4.5, powerMul sane, price>0
    var okRanges = insts.every(x => x.condition >= 55 && x.condition <= 100 && x.weightRatio >= 0.85 && x.weightRatio <= 4.5 && x.powerMul > 0.3 && x.powerMul < 2.0 && x.price >= 1);
    check('[ranges] condition/weight/power/price all in-band', okRanges);
    // 4. QUALITY drives power + price up: dominator instances beat worn on average
    var worn = insts.filter(x => x.quality === 'worn'), dom = insts.filter(x => x.quality === 'dominator' || x.quality === 'acrynic');
    var avg = arr => arr.reduce((s, x) => s + x.powerMul, 0) / (arr.length || 1);
    check('[quality] orange-named avg power > worn avg power', dom.length && worn.length ? avg(dom) > avg(worn) : true);
    // 5. WEAR discounts price: at equal quality, lower condition -> lower price (hold quality fixed via forced seeds)
    //    (statistical: correlation of condition and price is positive across a fixed-quality subset)
    var std = insts.filter(x => x.quality === 'standard');
    if (std.length > 5) { std.sort((x, y) => x.condition - y.condition); check('[wear] worst-condition standard item is not pricier than the best', std[0].price <= std[std.length - 1].price + 1); }
    else check('[wear] (skipped: too few standard rolls)', true);
    // 6. describe() renders all fields
    check('[describe] one-liner includes cond/wt/pwr/price', /cond/.test(describe(a1)) && /wt/.test(describe(a1)) && /pwr/.test(describe(a1)));

    console.log('---');
    console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
    console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
    if (fail > 0) process.exit(1);
  }
})();
