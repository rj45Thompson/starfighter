// parse_check.js - syntax-validate every INLINE <script> block in index.html without executing it.
// Catches the index.html edit hazard (a mid-line `//` that swallows code, or an unbalanced edit) that a
// human eye misses in a 7,700-line single-script file. vm.Script COMPILES (parse only), never runs.
'use strict';
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('D:/code/starfighter/index.html', 'utf8');

// pull every <script> ... </script> that is NOT a src= include (those are separate files)
const re = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gi;
let m, idx = 0, fails = 0, checked = 0;
while ((m = re.exec(src)) !== null) {
  const attrs = m[1] || '';
  if (/\bsrc\s*=/.test(attrs)) continue;         // external file, not inline code
  const body = m[2];
  if (!body.trim()) continue;
  idx++;
  // line number where this block starts, for a useful error
  const startLine = src.slice(0, m.index).split('\n').length;
  try {
    new vm.Script(body, { filename: `index.html:inline#${idx}@L${startLine}` });
    checked++;
    console.log(`PASS  inline #${idx} @ line ${startLine}  (${body.split('\n').length} lines)`);
  } catch (e) {
    fails++;
    console.log(`FAIL  inline #${idx} @ line ${startLine}: ${e.message}`);
  }
}
console.log('---');
console.log(`inline scripts checked: ${checked}  failures: ${fails}`);
console.log('RESULT: ' + (fails === 0 ? 'ALL INLINE SCRIPTS PARSE' : 'PARSE FAILURE'));
process.exit(fails === 0 ? 0 : 1);
