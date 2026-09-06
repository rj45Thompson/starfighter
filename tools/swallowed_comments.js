// swallowed_comments.js - find lines where a `//` comment eats CODE that followed it on the same line.
//
// Why this exists: twice on 2026-09-06 a comment was inserted mid-line by a patch script and silently deleted the
// statements after it. Once in panels.js (a broken `if` body, caught immediately by a parse error) and once in
// index.html's generation reset, where `P.weaponType='energy'; P.equip={}; P.contraband={}; P.cargo={};` ended up
// INSIDE a comment. That one still parsed, so nothing complained: a whole line of the game's reset simply stopped
// running. A parse check cannot catch it, so this does.
//
//   node tools/swallowed_comments.js              # exit 1 and print every suspect line
//   node tools/swallowed_comments.js --self-test  # prove it by planting one
//
// The rule: inside a line comment, look for text that is unmistakably CODE rather than prose - an assignment, a
// call followed by a semicolon, or a statement keyword with a semicolon. Prose that merely mentions `foo()` is not
// flagged, because a trailing semicolon or `=` is what separates a sentence from a statement.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['index.html', 'panels.js', 'planetmenu.js', 'engbay.js', 'missions.js', 'economy.js', 'empire.js',
  'shell.js', 'sbhud.js', 'passenger.js', 'starmap.js', 'power_panel.js'];
const BS = String.fromCharCode(92);

// the code-looking shapes: `x.y='v';`  `x.y = 1;`  `foo();`  `return x;`  `if(x) y;`
// A first attempt flagged 44 lines, nearly all prose that happens to contain "=" and ";" ("docked = safe harbor,
// 2x;"). A check that cries wolf is not a check. The rule is now the shape prose does not write: a PROPERTY
// assignment to a LITERAL ending in a semicolon (P.weaponType='energy';), a method call with a semicolon followed
// by more code, or a bare return/delete/throw statement.
const CODEISH = [
  /[A-Za-z_$][\w$]*\.[\w$]+\s*=\s*(?:'[^']*'|"[^"]*"|-?\d[\d.]*|\{[^}]*\}|\[[^\]]*\]|null|true|false)\s*;/,
  /[A-Za-z_$][\w$]*\.[\w$]+\([^)]{0,60}\)\s*;\s*[A-Za-z_$]/,
  /\b(?:return|delete|throw)\s+[A-Za-z_$][\w$.]*\s*;/
];

function lineComments(src) {
  // walk the file so a `//` inside a string or a block comment is never mistaken for a comment start
  const out = [];
  let i = 0, line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && src[i] !== q) { if (src[i] === BS) i++; if (src[i] === '\n') line++; i++; }
      i++; continue;
    }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); while (i < (e < 0 ? n : e)) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      out.push({ line: line, text: src.slice(i + 2, j) });
      i = j; continue;
    }
    i++;
  }
  return out;
}

let flagged = [];
function scan(src, label) {
  const found = [];
  for (const c of lineComments(src)) {
    if (c.text.indexOf('...') >= 0) continue;   // prose quoting a shape ("HOST.RANKS = [{n,score}...];") is not code
    for (const re of CODEISH) {
      const m = re.exec(c.text);
      if (m) { found.push({ file: label, line: c.line, snippet: m[0].trim().slice(0, 90), comment: c.text.trim().slice(0, 60) }); break; }
    }
  }
  return found;
}

if (process.argv.indexOf('--self-test') >= 0) {
  // the REAL case, taken verbatim from index.html's generation reset as it stood on 2026-09-06
  const planted = "      P.lvl={weapon:1};   // STARBLAST LOOP: death restarts the ladder (SB10) P.weaponType='energy'; P.equip={}; P.cargo={};\n";
  const hits = scan(planted, 'planted');
  console.log(hits.length ? 'PROVEN: catches a comment that swallowed `' + hits[0].snippet + '`' : 'BLIND: missed the planted case');
  process.exit(hits.length ? 0 : 1);
}

for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  flagged = flagged.concat(scan(fs.readFileSync(p, 'utf8'), f));
}
if (!flagged.length) { console.log('no comment appears to have swallowed code (' + FILES.length + ' files scanned)'); process.exit(0); }
console.log(flagged.length + ' suspect line' + (flagged.length === 1 ? '' : 's') + ' - a comment containing what looks like a statement:');
for (const h of flagged) console.log('  ' + h.file + ':' + h.line + '  //' + h.comment + '  <- ' + h.snippet);
process.exit(1);
