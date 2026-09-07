// f51_replacement_replay.js - settles genre cell F51 "a destroyed ship is replaced through
// insurance OR a free starter." Star Fighter takes the FREE-STARTER path: on death the player
// respawns in a stock Scout at no cost; there is no insurance/rebuy/premium mechanic.
//   FREE STARTER: killShip applies a stock Scout on player death (applyHull(s,'scout') index.html
//     :2839, the F49 real-stakes wipe), and the respawn block (:2669) brings the ship back with NO
//     credit charge - the Scout is given free (credits were already wiped to 0, F49).
//   NOT INSURANCE: no insurance/rebuy/premium/payout mechanic. The only "insurance" tokens are a
//     pilot-SPEECH temperament regex (index.html:4045, speech_gen.js:40) and a quest-gambling
//     comment (textquests.js:8) - neither is a ship-replacement cost.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F51 ship-replacement replay - free-starter path (index.html), grep for insurance\n');

// FREE STARTER: the death handler applies a stock Scout; the respawn block charges no credits
const killBlk = IDX.slice(IDX.indexOf('function killShip'), IDX.indexOf('function killShip') + 3200);
ok('on player death the ship is replaced by a stock SCOUT (applyHull(s,\'scout\'), :2839)', /if\(s\.role==='player'\)\{[^]*applyHull\(s,'scout'\); \}/.test(killBlk));
const respawnLine = lines[2668];   // 1-indexed :2669 respawn block
ok('the respawn brings the ship back (s.alive=true; s.hp=s.maxHp)', /s\.respawn<=0\)\{ s\.alive=true[^]*s\.hp=s\.maxHp/.test(respawnLine));
ok('the free Scout costs NOTHING - the respawn block deducts no credits', respawnLine.includes('s.alive=true') && !/credits\s*-=|s\.credits\s*=\s*s\.credits\s*-/.test(respawnLine));

// NOT INSURANCE: no ship-insurance/rebuy mechanic; the death+respawn paths never mention one
const insuranceInDeath = /insurance|\brebuy\b|premium|payout|buy.?back/i.test(killBlk) || /insurance|\brebuy\b|premium|payout/i.test(respawnLine);
ok('no insurance/rebuy/premium in the death or respawn path (free-starter, not insurance)', !insuranceInDeath);
// the only "insurance" tokens in the whole tree are non-mechanic (speech temperament + quest comment)
const insuranceHits = [];
for (const f of ['index.html', 'speech_gen.js', 'textquests.js']) {
  const src = fs.readFileSync(path.join(REPO, f), 'utf8');
  src.split(/\r?\n/).forEach((ln, i) => { if (/\binsurance\b|\brebuy\b/i.test(ln)) insuranceHits.push(`${f}:${i + 1}`); });
}
console.log('  "insurance"/"rebuy" tokens tree-wide: ' + (insuranceHits.join(', ') || 'none'));
ok('every "insurance" token is a speech-temperament regex, not a ship mechanic', insuranceHits.every(h => /index\.html:4045|speech_gen\.js:40/.test(h)));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F51 yes (free-starter): a destroyed player ship is replaced by a FREE stock Scout (applyHull scout + no-cost respawn); no insurance/rebuy mechanic exists'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
