// f45_discovery_replay.js - confirms genre cell F45 "player can discover unvisited systems and
// record or sell the data" is correctly PARTIAL. Two halves:
//   RECORD (yes): discoveries are tracked on P.discoveries (index.html:1761 - resolving a
//     derelict/cache/distress signal IS a discovery) and count toward the campaign score
//     (discoveries * CAMPAIGN_SCORE_W_DISCOVERY, :2016-2017). The game also models visited vs
//     unvisited markets (per-ship price memory, :1860-1863 - the epistemic limit).
//   SELL  (no):  nothing sells survey/exploration data (no Universal-Cartographics-style buyer).
// This replay MEASURES the record-and-score half off the real campaignScore formula, and
// grep-PROVES the sell half is absent - so the grade is partial, not yes or no.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

const CFG = {};
for (const m of IDX.matchAll(/CAMPAIGN_SCORE_W_([A-Z]+):(\d+)/g)) CFG['CAMPAIGN_SCORE_W_' + m[1]] = +m[2];

// slice the real campaignScore total= expression (index.html:2016-2017) and eval it
const totalSrc = lines.slice(2015, 2017).join('\n');   // 1-indexed 2016..2017
if (!/const total=Math\.round/.test(totalSrc) || !/CAMPAIGN_SCORE_W_DISCOVERY/.test(totalSrc)) {
  console.error('FAIL: campaignScore total= slice moved'); process.exit(2);
}
const score = new Function('war', 'wealth', 'rank', 'missions', 'quests', 'discoveries', 'CFG',
  totalSrc + '\n;return total;');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F45 discovery replay - real campaignScore formula sliced from index.html\n');
console.log('  CAMPAIGN_SCORE weights: ' + JSON.stringify(CFG));

// RECORD + SCORE half: two identical careers differing ONLY in discoveries
const base = [30, 500, 3, 4, 2];   // war, wealth, rank, missions, quests (all equal)
const s0 = score(...base, 0, CFG);
const s5 = score(...base, 5, CFG);
console.log(`\n  RECORD half (measured): score(discoveries=0)=${s0}, score(discoveries=5)=${s5}, delta=${s5 - s0}`);
ok('discoveries are recorded and SCORED: +5 discoveries adds exactly 5 * W_DISCOVERY(' + CFG.CAMPAIGN_SCORE_W_DISCOVERY + ')', s5 - s0 === 5 * CFG.CAMPAIGN_SCORE_W_DISCOVERY);
ok('P.discoveries is incremented on a resolved derelict/cache/distress (index.html:1761)', /P\.discoveries=\(P\.discoveries\|\|0\)\+1/.test(IDX));
ok('the game records a visited/unvisited knowledge model (explore the nearest UNVISITED market)', /unvisited market/.test(IDX));

// SELL half: nothing sells survey/exploration data (only contraband, which is not exploration data)
// require the exploration DATA to be the thing sold (so contraband's "sell dear ... scan risk" :3994 is not a match)
const sellData = /sell[^\n]{0,25}(scan|survey|exploration|chart|cartograph)[a-z]*\s*data|(scan|survey|exploration|cartograph)[a-z]*\s*data[^\n]{0,20}(sold|sale|buy|reward)|universal cartograph|first.?discovery[^\n]{0,25}(sold|sale|buy)/i.test(IDX);
ok('SELL half ABSENT: no survey/exploration-data sale mechanic (the partial boundary)', !sellData);

console.log('\nRESULT: ' + (pass
  ? 'PASS - F45 PARTIAL confirmed: discoveries are RECORDED + scored (P.discoveries -> campaignScore) and visited/unvisited is modelled, but survey data cannot be SOLD'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
