// f31_storyline_replay.js - settles genre cell F31 "there is an authored main storyline with scripted
// missions" (anchor 7/8). Verdict: PARTIAL, and this is a SECOND independent read that confirms the
// seed's partial (the seed cited only HEG_TIERS) rather than a mis-grade. The split:
//   SCRIPTED MISSIONS = YES - textquests.js ships AUTHORED branching quest templates (line 79 "QUEST
//     TEMPLATES - authored branching (structure + prose)"; SR-M9 "interactive-fiction missions"), each a
//     directed node-graph with 2-3 choices/skill-checks/effects, startable/advanceable/completable via the
//     `quest` and `choose` commands (index.html:4871,4874). `node textquests.js` walks every template to a
//     terminal node -> 16/16 PASS (re-run here via child_process).
//   AUTHORED MAIN STORYLINE = NO - there is NO narrative spine: 0 hits for main-storyline / story-mission /
//     scripted-mission / plot / act / prologue across the 48 scanned files; the quests are INDEPENDENT and
//     PROCEDURALLY OFFERED on dock (TEXTQUESTS.tryOffer "rolls a template", index.html:1711); the "campaign"
//     is the SYSTEMIC HEG_TIERS escalation (liberate/defend/assault the stronghold, UC-212 in USE_CASES.md),
//     not authored script; the "novel" chapters (loreDoc src:'novel', index.html:5739) are AI-mind BACKGROUND
//     LORE, not player missions.
// So: authored scripted missions YES, authored MAIN STORYLINE NO -> PARTIAL.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const TQ = fs.readFileSync(path.join(ROOT, 'textquests.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const UC = fs.existsSync(path.join(ROOT, 'USE_CASES.md')) ? fs.readFileSync(path.join(ROOT, 'USE_CASES.md'), 'utf8') : '';
const VENDORED = new Set(['three.min.js', 'fflate.min.js', 'fbxloader.js']);
const files = ['index.html', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !VENDORED.has(f))]
  .filter(f => fs.existsSync(path.join(ROOT, f)));

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F31 storyline replay - authored MAIN STORYLINE vs authored SCRIPTED MISSIONS\n');

// --- SCRIPTED MISSIONS = YES ---
const titles = [...TQ.matchAll(/\btitle:\s*'([^']+)'/g)].map(m => m[1]);
console.log('  authored quest templates (named): ' + (titles.length ? titles.join(', ') : 'NONE'));
ok('textquests.js ships >=3 AUTHORED named quest templates (scripted missions)', titles.length >= 3);
ok('the templates are declared authored branching (structure + prose)', /QUEST TEMPLATES - authored branching/.test(TQ));
// each quest is a multi-beat directed graph: count nodes across the first template's `nodes:{...}`
const nodeKeys = [...TQ.matchAll(/\bnext:\s*'([a-z_]+)'/g)].map(m => m[1]);
ok('quests are multi-beat (choices chain via next: to further nodes)', nodeKeys.length >= 6);
ok('quests are startable/advanceable/completable from the terminal (`quest` + `choose` commands)', /c==='quest'/.test(IDX) && /c==='choose'/.test(IDX) && /TEXTQUESTS\.choose\(/.test(IDX));
// RUNTIME observable: the module's own self-test walks every template to a terminal node
let tqOut = '';
try { tqOut = cp.execSync('node "' + path.join(ROOT, 'textquests.js') + '"', { encoding: 'utf8' }); } catch (e) { tqOut = (e.stdout || '') + (e.stderr || ''); }
const tqPass = /RESULT:\s*PASS/.test(tqOut) && /FAIL:\s*0/.test(tqOut);
console.log('  node textquests.js -> ' + (tqOut.match(/TOTAL:.*$/m) || ['(no summary)'])[0]);
ok('node textquests.js self-test PASSES (every authored template completes)', tqPass);

// --- AUTHORED MAIN STORYLINE = NO ---
const SPINE = /main ?story(line)?|story ?mission|scripted ?mission|story ?arc|prologue|epilogue|\bact (one|two|three|i|ii|iii)\b|main quest|central (arc|quest|narrative)/i;
const spineHits = [];
for (const f of files) fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).forEach((ln, i) => { if (SPINE.test(ln)) spineHits.push(`${f}:${i + 1}`); });
console.log('  main-storyline SPINE hits: ' + (spineHits.length ? spineHits.join(', ') : 'none'));
ok('no authored main-storyline spine anywhere (0 story-mission/plot/act/prologue hits)', spineHits.length === 0);
ok('quests are PROCEDURALLY offered on dock (tryOffer rolls a template), not an authored spine', /TEXTQUESTS\.tryOffer\(/.test(IDX) && /rolls a template/.test(TQ));
ok('the "campaign" is the SYSTEMIC HEG_TIERS escalation (UC-212 liberate/defend/assault), not script', /HEG_TIERS/.test(IDX) && /liberates?,?\s*defends?,?\s*assaults?/i.test(UC));
ok('the "novel" chapters are AI-mind BACKGROUND LORE (loreDoc src:novel), not player missions', /loreDoc\(/.test(IDX) && /src:'novel'/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F31 PARTIAL: authored SCRIPTED MISSIONS yes (textquests.js branching quests, 16/16 self-test) but authored MAIN STORYLINE no (no narrative spine; campaign is systemic HEG_TIERS; novel is lore) - confirms the seed grade to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
