// f60_startchoice_replay.js - settles genre cell F60 "the player picks a difficulty or a starting
// scenario before playing" (anchor 5/7 - Elite's ship/start, X's game-start scenarios). Verdict: NO.
// This is a grep-PROVEN absence backed by the structural single-start facts, so the observable is a
// re-runnable scan (mirrors tools/genre_selfcheck.js's F60 guard), not a driven-game replay:
//   (1) the DIFFICULTY/SCENARIO PICKER regex has 0 hits across the 48 scanned files - every "difficulty"
//       in the source is a DEV-TUNED balance constant ("DIFFICULTY PASS 4/5", ESC_RATE/HEG_TIERS) or the
//       AI auto-curriculum, never a player-facing chooser; "scenario" is 0 hits outright.
//   (2) there is ONE fixed start: START_IN_BELT:true (index.html:395) drops every boot AND every
//       generation-reset into the same Ceres Belt (:6578 boot, :6753 rebirth) - no branch, no choice.
//   (3) the `newgame`/`restart` command (:4592) is a CONFIRM-GATED reset to that same start ("newgame
//       confirm"), offering no difficulty/scenario options - a reset, not a picker.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const VENDORED = new Set(['three.min.js', 'fflate.min.js', 'fbxloader.js']);
const files = ['index.html', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !VENDORED.has(f))]
  .filter(f => fs.existsSync(path.join(ROOT, f)));

// the SAME regex baked into tools/genre_selfcheck.js's F60 guard
const PICKER = /(choose|select|pick|set)\s+(a\s+|your\s+|the\s+)?(difficulty|game.?mode|starting scenario|start scenario|scenario)\b|difficulty\s*(select|picker|slider|setting|option|level|menu|screen|chooser)|scenario\s*(select|picker|menu|screen|chooser|choice|list|preset)|\b(easy|normal|hard|casual|iron ?man|hard ?core)\s+(mode|difficulty)\b|game.?mode\s*(select|picker|menu|option)|choose your (difficulty|scenario|start)/i;

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F60 start-choice replay - is there a difficulty / scenario picker before play?\n');

// (1) NO PICKER anywhere in the source
const hits = [];
for (const f of files) {
  fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).forEach((ln, i) => { if (PICKER.test(ln)) hits.push(`${f}:${i + 1}: ${ln.trim().slice(0, 90)}`); });
}
console.log(`  picker-regex hits across ${files.length} scanned files: ${hits.length ? '\n     ' + hits.join('\n     ') : 'none'}`);
ok('no difficulty / scenario / game-mode PICKER in any source file (0 hits)', hits.length === 0);
ok('"scenario" appears nowhere in the source (no scenario system at all)', !/scenario/i.test(files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')));

// (2) ONE fixed start - START_IN_BELT, used by both boot and rebirth, no branch
ok('START_IN_BELT is a single fixed flag (:395), not a chosen option', /START_IN_BELT:\s*true/.test(IDX));
ok('boot puts the player at the one belt start (CFG.START_IN_BELT && ships[0] -> beltStartPos)', /CFG\.START_IN_BELT && ships\[0\]/.test(IDX) && /beltStartPos\(\)/.test(IDX));
ok('generation-reset rebirth reuses the SAME belt start (no alternate scenario)', /CFG\.START_IN_BELT\?beltStartPos\(\)/.test(IDX));

// (3) `newgame` is a confirm-gated RESET to that same start, not a chooser
ok('`newgame`/`restart` exists but is a confirm-gated reset (needs "newgame confirm")', /c==='newgame'\|\|c==='restart'/.test(IDX) && /newgame confirm/.test(IDX));
ok('the reset changes NO starting condition by choice (resets war front/territory/ship to the fixed start)', /resets the war front\/territory\/your ship/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F60 no: one fixed start (Scout in the Ceres Belt), baked-in dev-tuned difficulty, no difficulty/scenario/game-mode picker; `newgame` is a confirm-gated reset to that same start, not a choice'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
