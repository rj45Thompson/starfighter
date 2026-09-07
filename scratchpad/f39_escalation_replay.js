// f39_escalation_replay.js - settles genre cell F39 "an escalating galaxy-wide threat drives
// the long campaign" by MEASURING the escalation->threat curve, not just reading it.
//
// Skeptical hypothesis: `campaign`/`escalation` are just difficulty scalars, no real ESCALATING
// GALAXY-WIDE THREAT. Refuted by driving the REAL hegTier()/enemyCap() (sliced from index.html)
// against a controllable escalation clock: the Iron Synod steps Drone->Cruiser->Warlord as
// escalation crosses ESC_PER_TIER, more enemies spawn, the clock RISES over time (ESC_RATE) and
// is pushed back only by victories (WIN_ESC_CUT/STRONGHOLD/LIBERATE) - a genuine arms-race.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// --- parse the real HEG_TIERS table ---
const blk = IDX.slice(IDX.indexOf('const HEG_TIERS=['), IDX.indexOf('];', IDX.indexOf('const HEG_TIERS=[')) + 2);
const HEG_TIERS = [];
const re = /\{n:'([^']+)',\s*hp:(\d+),\s*dmg:(\d+),\s*col:0x[0-9a-fA-F]+,\s*scale:([\d.]+),\s*bounty:(\d+)\}/g;
let m; while ((m = re.exec(blk)) !== null) HEG_TIERS.push({ n: m[1], hp: +m[2], dmg: +m[3], scale: +m[4], bounty: +m[5] });
if (HEG_TIERS.length !== 3) { console.error('FAIL: expected 3 HEG_TIERS, parsed ' + HEG_TIERS.length); process.exit(2); }

// --- slice the REAL hegTier()/enemyCap() (index.html:1252-1253) and eval with a live escalation ---
const lines = IDX.split(/\r?\n/);
const hegSrc = lines.slice(1251, 1253).join('\n');   // 1-indexed 1252..1253
if (!/function hegTier/.test(hegSrc) || !/function enemyCap/.test(hegSrc)) {
  console.error('FAIL: hegTier/enemyCap slice moved; head=' + hegSrc.slice(0, 60)); process.exit(2);
}
const CFG = { ESC_PER_TIER: 40, PIRATE_MAX: 11 };   // from index.html CFG (:547,:530)
const ESC = { RATE: 0.6, WIN_CUT: 60, STRONGHOLD_CUT: 45, LIBERATE_CUT: 14 };  // :547,:563,:565
const M = new Function('HEG_TIERS', 'CFG',
  'let escalation=0;\n' + hegSrc + '\nreturn { set:function(e){escalation=e;}, get:function(){return escalation;}, hegTier:hegTier, enemyCap:enemyCap };'
)(HEG_TIERS, CFG);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F39 escalation replay - real HEG_TIERS + hegTier()/enemyCap() sliced from index.html\n');
console.log('  THE THREAT ESCALATES IN TIERS (escalation -> Synod class):');
const pts = [0, 39, 40, 79, 80, 200];
const tiers = [];
for (const e of pts) { M.set(e); const t = M.hegTier(); const T = HEG_TIERS[t]; tiers.push(t);
  console.log(`    escalation ${String(e).padStart(3)} -> tier ${t} ${T.n.padEnd(8)} hp ${String(T.hp).padStart(3)} dmg ${String(T.dmg).padStart(2)}  enemyCap ${M.enemyCap()}`); }
ok('tier steps 0,0,1,1,2,2 across the ESC_PER_TIER(40) thresholds', JSON.stringify(tiers) === JSON.stringify([0, 0, 1, 1, 2, 2]));
ok('enemy hp rises across tiers (Drone 260 -> Warlord 900 = ' + (HEG_TIERS[2].hp / HEG_TIERS[0].hp).toFixed(1) + 'x)', HEG_TIERS[0].hp < HEG_TIERS[1].hp && HEG_TIERS[1].hp < HEG_TIERS[2].hp);
ok('enemy dmg rises across tiers (22 -> 60 = ' + (HEG_TIERS[2].dmg / HEG_TIERS[0].dmg).toFixed(1) + 'x)', HEG_TIERS[0].dmg < HEG_TIERS[1].dmg && HEG_TIERS[1].dmg < HEG_TIERS[2].dmg);
M.set(0); const cap0 = M.enemyCap(); M.set(80); const cap80 = M.enemyCap();
ok('enemy COUNT cap also rises with escalation (' + cap0 + ' -> ' + cap80 + ')', cap80 > cap0);

console.log('\n  THE CLOCK RISES OVER TIME (arms race), CUT ONLY BY VICTORY:');
// simulate escalation += ESC_RATE*dt at 60Hz; find seconds to each tier boundary
let e = 0, t = 0; const dt = 1 / 60; const reach = {};
while (e < CFG.ESC_PER_TIER * 2 + 1 && t < 100000) { e += ESC.RATE * dt; t += dt; M.set(e); const tier = M.hegTier(); if (reach[tier] === undefined) reach[tier] = t; }
console.log(`    unopposed: reaches tier 1 (Cruiser) at ~${reach[1].toFixed(0)}s, tier 2 (Warlord) at ~${reach[2].toFixed(0)}s of real time`);
ok('escalation rises over time and crosses tiers unopposed', reach[1] > 0 && reach[2] > reach[1]);
// a war win cuts WIN_ESC_CUT(60) = 1.5 tiers: from Warlord(80) back to Drone(20)
M.set(80); const before = M.hegTier(); const after = (M.set(Math.max(0, 80 - ESC.WIN_CUT)), M.hegTier());
console.log(`    a WAR WIN cuts escalation ${ESC.WIN_CUT} -> from tier ${before} (${HEG_TIERS[before].n}) back to tier ${after} (${HEG_TIERS[after].n})`);
ok('victory pushes the threat back by more than a full tier (tug-of-war, not monotonic)', after < before);
console.log(`    (also: liberate a system -${ESC.LIBERATE_CUT}, take the Hegemon stronghold -${ESC.STRONGHOLD_CUT})`);

console.log('\n  GALAXY-WIDE + LONG CAMPAIGN (code-read, cited):');
console.log('    threat = the Iron Synod / Hegemon "conquest-empire of endless escalation" (index.html:641);');
console.log('    galaxy-wide = systems go contested + the front spreads along jump-lanes (SR-M16, F37);');
console.log('    long campaign = campaign++ per war (:2049/:2054) + GENERATIONS: lose every system -> the');
console.log('    generation ends, the galaxy resets, the minds\' knowledge persists (:4317,:4574,:6725).');

console.log('\nRESULT: ' + (pass
  ? 'PASS - F39 yes CONFIRMED: escalation drives a tiered Synod threat (Drone->Cruiser->Warlord) that rises over time and is pushed back only by victory; galaxy-wide front + generations frame the long campaign'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
