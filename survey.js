// =================================================================================================
// survey.js - F45: SELL your exploration/survey DATA for a cartographics fee (the missing half of
// "player can discover unvisited systems and record OR SELL the data"). The RECORD half already exists:
// resolving a derelict/cache/distress signal increments P.discoveries (index.html:1764), a scored
// career stat. This adds the SELL half the genre's yes-games have (Elite's Universal Cartographics,
// Space Rangers survey payouts): file your unfiled survey records at any dock for credits.
//
// Self-contained (guide.js / storyline.js pattern): one new file + a `survey` command, no save-state or
// CFG edit. It owns its OWN localStorage key (SF_SURVEY_v1 = how many records you've already filed), so
// selling does NOT touch P.discoveries - the campaign-score counter is unchanged; filing is a SEPARATE
// cartographics payment. New-game safe: if the filed count ever exceeds P.discoveries (a fresh
// playthrough reset discoveries to 0), it snaps back to 0 so a new pilot can file their new finds.
//
// Exports window.SURVEY: read()->{total,sold,unsold,price}, sell()->{ok,paid,filed,total}, reset().
// SYNTAX-CLEAN under node: `node survey.js` runs a self-test (stub HOST) and exits 1 on any FAIL.
// =================================================================================================
'use strict';
(function () {
  var KEY = 'SF_SURVEY_v1', PRICE = 45;   // credits per unfiled survey record (a modest cartographics fee)

  function H() { return (typeof window !== 'undefined' && window.HOST) ? window.HOST : null; }
  function num(v, d) { v = Number(v); return isNaN(v) ? d : v; }
  function loadSold() { try { var j = JSON.parse(localStorage.getItem(KEY) || '{}'); return num(j && j.sold, 0); } catch (e) { return 0; } }
  function saveSold(n) { try { localStorage.setItem(KEY, JSON.stringify({ sold: n })); } catch (e) { } }

  function read() {
    var h = H(), total = num(h && h.P && h.P.discoveries, 0), sold = loadSold();
    if (sold > total) { sold = 0; saveSold(0); }   // new game (discoveries reset) - snap filed count back
    return { total: total, sold: sold, unsold: Math.max(0, total - sold), price: PRICE };
  }

  function sell() {
    var h = H(); if (!h || !h.P) return { ok: false, msg: 'no pilot' };
    var r = read();
    if (r.unsold <= 0) return { ok: false, msg: 'no new survey data to file' };
    var pay = r.unsold * PRICE;
    h.P.credits = num(h.P.credits, 0) + pay;
    saveSold(r.total);
    return { ok: true, paid: pay, filed: r.unsold, total: r.total };
  }

  function reset() { saveSold(0); }

  var API = { read: read, sell: sell, reset: reset, PRICE: PRICE, KEY: KEY };
  if (typeof window !== 'undefined') window.SURVEY = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  // ---- self-test (node): stub HOST, drive read/sell, the new-game reset, and no-double-sell ----
  if (typeof require !== 'undefined' && require.main === module) {
    var PASS = 0, FAIL = 0;
    function check(n, c) { if (c) { PASS++; console.log('PASS - ' + n); } else { FAIL++; console.log('FAIL - ' + n); } }
    var LS = {}; global.localStorage = { getItem: function (k) { return Object.prototype.hasOwnProperty.call(LS, k) ? LS[k] : null; }, setItem: function (k, v) { LS[k] = String(v); }, removeItem: function (k) { delete LS[k]; } };
    var P = { discoveries: 0, credits: 100 };
    global.window = { HOST: { P: P } };

    reset();
    check('a fresh pilot with 0 discoveries has nothing to file', read().unsold === 0);
    var s0 = sell(); check('selling with no data is a safe no-op (ok:false)', s0.ok === false);

    P.discoveries = 3;
    var r1 = read();
    check('after 3 discoveries, 3 records are unfiled worth 3*PRICE', r1.unsold === 3 && r1.total === 3 && r1.sold === 0);
    var s1 = sell();
    check('filing pays unsold*PRICE (' + s1.paid + ' == ' + (3 * PRICE) + ') and credits rise 100 -> ' + P.credits, s1.ok && s1.paid === 3 * PRICE && P.credits === 100 + 3 * PRICE);
    check('after filing, there is nothing left to file (no double-dip)', read().unsold === 0);
    var s2 = sell(); check('a second file with no new data is a safe no-op', s2.ok === false && P.credits === 100 + 3 * PRICE);

    P.discoveries = 5;   // two more discoveries after filing
    var r2 = read();
    check('two NEW discoveries after filing -> exactly 2 unfiled (the filed 3 stay filed)', r2.unsold === 2 && r2.sold === 3);
    var creditsBefore = P.credits; sell();
    check('filing the 2 new records pays 2*PRICE only', P.credits === creditsBefore + 2 * PRICE);

    // new-game safety: discoveries reset to 0 while sold=5 -> unfiled snaps to 0, not negative
    P.discoveries = 0;
    var r3 = read();
    check('new game (discoveries reset to 0) snaps the filed count back - unfiled 0, not negative', r3.unsold === 0 && r3.sold === 0);
    P.discoveries = 1;
    check('the new pilot can then file their first NEW discovery', read().unsold === 1);

    console.log('---');
    console.log('TOTAL: ' + (PASS + FAIL) + '  PASS: ' + PASS + '  FAIL: ' + FAIL);
    if (FAIL > 0) { console.log('RESULT: FAIL'); process.exit(1); }
    else { console.log('RESULT: PASS'); process.exit(0); }
  }
})();
