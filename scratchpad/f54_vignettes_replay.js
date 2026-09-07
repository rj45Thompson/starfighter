// f54_vignettes_replay.js - settles genre cell F54 "ports offer self-contained text vignettes or
// mini-narratives." Two independent sources, distinct from F53's dialogue-CHOICE mechanic:
//   BAR VIGNETTES (planetmenu.js): barRumors() emits several self-contained mini-narratives, each
//     "0-fab BY CONSTRUCTION" - READ OFF live HOST state and carrying a check() so a rumor with no
//     live backing isn't generated (a hostile sighting, a price whisper, war intel, the treasury,
//     the wing market). barPatrons()/barLineFor() give named patrons with histories/backstory.
//   SELF-CONTAINED STORIES (textquests.js): each TEXTQUESTS template is a complete interactive
//     vignette; its node-safe self-test walks every one to a terminal ending.
// This replay parses barRumors' check()-gated vignettes (structure), and runs the textquests
// self-test (the measured self-contained-narrative observable). planetmenu.js is DOM-heavy + hands-
// off, so its vignettes are read structurally, not executed.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const REPO = path.join(__dirname, '..');
const PM = fs.readFileSync(path.join(REPO, 'planetmenu.js'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

// slice barRumors()
const rumBlk = PM.slice(PM.indexOf('function barRumors'), PM.indexOf('function barHtml'));
// each vignette is an out.push({ text:..., check:function... })
const texts = (rumBlk.match(/text:\s*'/g) || []).length;
const checks = (rumBlk.match(/check:\s*(function|\()/g) || []).length;

console.log('F54 port-vignettes replay - barRumors structure (planetmenu.js) + textquests self-test\n');
console.log(`  barRumors() emits ${texts} self-contained rumor vignettes, ${checks} carrying a check() gate`);
ok('the bar offers several self-contained rumor vignettes (>= 4)', texts >= 4);
ok('every rumor is 0-fab: grounded by a check() against live state (checks == texts)', checks === texts && checks >= 4);
ok('the rumors are grounded off live HOST state (comment: "READ OFF live HOST state ... check()")', /READ OFF live HOST state[^]*check\(\)/.test(PM));
// named patrons with histories/backstory
ok('named patrons with histories/backstory (barPatrons + barLineFor)', /function barPatrons/.test(PM) && /function barLineFor/.test(PM) && /backstory/.test(PM));
// concrete vignette examples present
ok('concrete vignettes: hostile sighting / price whisper / war intel / treasury', /was sighted near/.test(PM) && /going cheap here/.test(PM) && /the Synod runs those lanes/.test(PM) && /treasury runs about/.test(PM));

// SELF-CONTAINED STORIES: run the textquests self-test (each template is a complete vignette)
let tq = 'not run';
try { const out = execSync('node ' + JSON.stringify(path.join(REPO, 'textquests.js')), { encoding: 'utf8' }); tq = /RESULT: PASS/.test(out) ? 'PASS' : 'FAIL'; }
catch (e) { tq = 'FAIL'; }
ok('TEXTQUESTS templates are self-contained stories (node textquests.js -> ' + tq + ')', tq === 'PASS');

console.log('\nRESULT: ' + (pass
  ? 'PASS - F54 yes: ports offer self-contained text vignettes - the BAR\'s check()-grounded rumors + patron histories, and TEXTQUESTS self-contained interactive stories'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
