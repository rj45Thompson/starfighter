// f50_save_replay.js - settles genre cell F50 "progress is saved to one persistent world state
// rather than save slots." Structural facts read from the real source, plus a cited existing guard:
//   ONE STATE: SAVE_KEY='SF_SAVE_v1' (index.html:6454); saveGame() writes the whole
//     gatherSaveState() to that single key (:6535); loadGame() restores it on boot (:6536).
//   AUTOSAVE: saveTick() saves every CFG.SAVE_INTERVAL_S (:6538); beforeunload saves (:7779);
//     the `save` command is manual-on-demand only ("autosaves every 15s anyway").
//   NO SLOTS: exactly one game-save key exists; the other SF_ keys are non-save (controls/seed/
//     leaderboard/windows/error/singleton); no save-slot selection anywhere.
//   ROUND-TRIP: gatherSaveState <-> applySaveState symmetry is already guarded by tools/save_symmetry.js.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const REPO = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

const keyM = IDX.match(/const SAVE_KEY='(SF_[A-Za-z0-9_]+)'/);
const SAVE_KEY = keyM && keyM[1];
const interval = +IDX.match(/SAVE_INTERVAL_S:(\d+)/)[1];

console.log('F50 save-model replay - structure from index.html + cited save_symmetry guard\n');

// ONE persistent state
ok('a single game SAVE_KEY is declared (' + SAVE_KEY + ')', SAVE_KEY === 'SF_SAVE_v1');
ok('saveGame() writes the whole gatherSaveState() to that one key', /function saveGame\(\)\{[^]*?localStorage\.setItem\(SAVE_KEY, JSON\.stringify\(gatherSaveState\(\)\)\)/.test(IDX));
ok('loadGame() restores it on boot (getItem(SAVE_KEY) -> applySaveState)', /function loadGame\(\)\{[^]*?localStorage\.getItem\(SAVE_KEY\)[^]*?applySaveState\(JSON\.parse\(raw\)\)/.test(IDX));

// AUTOSAVE (not a manual-slot save)
ok('autosaves on a timer every SAVE_INTERVAL_S=' + interval + 's (saveTick)', /function saveTick\(dt\)\{[^]*?_saveCd=CFG\.SAVE_INTERVAL_S; saveGame\(\)/.test(IDX) && interval === 15);
ok('also saves on beforeunload (close/refresh)', /addEventListener\('beforeunload',\(\)=>saveGame\(\)\)/.test(IDX));
ok('the `save` command is manual-on-demand ("autosaves every 15s anyway")', /c==='save'[^]*?saveGame\(\)[^]*?autosaves every 15s anyway/.test(IDX));

// NO SAVE SLOTS
const sfKeys = [...new Set([...IDX.matchAll(/'(SF_[A-Za-z0-9_]+)'/g)].map(m => m[1]))].sort();
const gameSaveKeys = sfKeys.filter(k => /SF_SAVE/.test(k));
console.log('  SF_ localStorage keys: ' + sfKeys.join(', '));
ok('exactly ONE game-save key (the rest are controls/seed/leaderboard/windows/error/singleton)', gameSaveKeys.length === 1);
ok('no save-slot selection mechanism (0 "save slot"/"slot N" hits in the save code)', !/save slot|slot \d+ save|load slot|choose a save/i.test(IDX));

// ROUND-TRIP: run the existing guard
let sym = 'not run';
try { execSync('node ' + JSON.stringify(path.join(REPO, 'tools', 'save_symmetry.js')), { stdio: 'pipe' }); sym = 'PASS'; }
catch (e) { sym = 'FAIL'; }
ok('gatherSaveState <-> applySaveState symmetry holds (tools/save_symmetry.js -> ' + sym + ')', sym === 'PASS');

console.log('\nRESULT: ' + (pass
  ? 'PASS - F50 yes: progress is one autosaved persistent world state (SF_SAVE_v1, every 15s + on unload), not manual save slots; round-trip guarded'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
