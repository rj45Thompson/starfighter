// f55_pilots_replay.js - settles genre cell F55 "individual NPCs have persistent names and
// readable histories." Distinct from F28 (named-with-backstory): F55 is the persistent NAME POOL
// + the live-accumulated, READABLE interaction CHRONICLE.
//   PERSISTENT NAMES: a large fixed PILOTS pool (index.html:633+); the RANGER LEADERBOARD persists
//     every pilot across generations (SR-M14, SF_LEADERBOARD_v1, :6456).
//   READABLE HISTORY: noteLog(s,text,val) :2989 is a per-pilot interaction ledger (capped 40);
//     noteHarm :2990-2993 records first-contact + an accumulating grudge (s.rel); renderChronicle
//     :2994+ shows a pilot's last-8 notes + top grudges ("click a pilot ... to read its notes").
// This replay parses the name pool and drives the REAL noteLog/noteHarm to show a readable,
// accumulating per-pilot history.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

// parse the PILOTS name pool
const pilotsBlk = IDX.slice(IDX.indexOf('const PILOTS=['), IDX.indexOf('];', IDX.indexOf('const PILOTS=[')) + 1);
const PILOTS = [...pilotsBlk.matchAll(/'([A-Z]+)'/g)].map(m => m[1]);

// slice the real noteLog + noteHarm (index.html:2989-2993)
const src = lines.slice(2988, 2993).join('\n');
if (!/function noteLog/.test(src) || !/function noteHarm/.test(src)) { console.error('FAIL: noteLog/noteHarm slice moved'); process.exit(2); }
let T0 = 100;
const facLabel = () => 'Coalition';
const M = new Function('facLabel', 'T0', src + '\n;return { noteLog, noteHarm };')(facLabel, T0);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F55 pilots replay - PILOTS name pool + real noteLog/noteHarm (index.html)\n');

// PERSISTENT NAMES
console.log(`  PILOTS pool: ${PILOTS.length} named individuals (${PILOTS.slice(0, 6).join(', ')}, ...)`);
ok('a large fixed pool of named pilots (>= 20)', PILOTS.length >= 20);
ok('all names are distinct (persistent identities, not "Pirate #3")', new Set(PILOTS).size === PILOTS.length);
ok('leaderboard persists pilots across generations (SR-M14, SF_LEADERBOARD_v1)', /RANGER LEADERBOARD ACROSS GENERATIONS[^]*persistent/.test(IDX) && /SF_LEADERBOARD_v1/.test(IDX));

// READABLE, ACCUMULATING HISTORY
const vega = { name: 'VEGA', alive: true };
const orion = { name: 'ORION' };
M.noteHarm(vega, orion);                 // first contact -> a readable note + grudge
M.noteHarm(vega, orion);                 // repeat -> no new note, deeper grudge
M.noteLog(vega, '☠ killed by ORION (Iron Synod)', -1);
console.log(`  VEGA's ledger after 2 hits + a kill: ${vega.log.length} notes, grudge vs ORION = ${vega.rel.ORION.toFixed(2)}, hitBy ORION = ${vega.hitBy.ORION}`);
ok('noteLog builds a readable per-pilot ledger (2 entries: first-contact + kill)', vega.log.length === 2 && /opened fire on me/.test(vega.log[0].t) && /killed by ORION/.test(vega.log[1].t));
ok('the grudge ACCUMULATES across hits (rel vs ORION deepened past one hit)', vega.rel.ORION < -0.03 && vega.hitBy.ORION === 2);
ok('first-contact note fires ONCE, not per hit (2 hits -> 1 opened-fire note)', vega.log.filter(n => /opened fire/.test(n.t)).length === 1);

// the ledger is capped (bounded, still readable)
const busy = { name: 'CRUX', alive: true };
for (let i = 0; i < 45; i++) M.noteLog(busy, 'note ' + i, -1);
ok('the ledger is capped at 40 (oldest dropped) - bounded + readable', busy.log.length === 40 && busy.log[0].t === 'note 5');

// readable render exists (code read)
ok('renderChronicle shows a pilot\'s notes + grudges ("click a pilot ... to read its notes")', /function renderChronicle/.test(IDX) && /click a pilot in the roster to read its notes/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F55 yes: a large fixed pool of named pilots (persistent across generations via the leaderboard), each carrying a readable, accumulating interaction chronicle (noteLog ledger + grudges)'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
