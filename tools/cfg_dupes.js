// cfg_dupes.js - scan the game's CFG object literal for DUPLICATE KEYS.
//
// Why this exists: on 2026-09-06 a new CFG.DEFEND_R was added near the top of the literal while an older
// DEFEND_R sat 36 lines below. JavaScript keeps the LAST one, silently, so the new setting did nothing and the
// reason was invisible in the source. That class of failure does not get left to eyesight here.
//
//   node tools/cfg_dupes.js            # exit 1 and name every duplicated key
//   node tools/cfg_dupes.js --self-test # prove the check by planting a duplicate in a copy first
//
// The scanner walks the literal ONE character at a time, tracking strings, line comments and block comments
// together. The first version pre-stripped `//` comments with a regex and was blind from the moment it hit
// CFG.BRAIN_WORLD_URL - the `//` inside 'http://127.0.0.1:8793/data/' was eaten as a comment, the string was left
// unterminated, and every key after it went uncounted. It reported "no duplicates" over 68 of 200-odd keys. A
// check that passes without covering what it claims to cover is worse than no check, so this one reports its
// coverage (the key count) every run, and --self-test plants a duplicate at the END of the literal.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BS = String.fromCharCode(92);

// returns {body, start, end} of the object literal that begins at/after `from`
function literalAt(src, from) {
  let i = src.indexOf('{', from);
  if (i < 0) return null;
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; k++;
      while (k < src.length && src[k] !== q) { if (src[k] === BS) k++; k++; }
    } else if (c === '/' && src[k + 1] === '/') { while (k < src.length && src[k] !== '\n') k++; }
    else if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2); if (k < 0) return null; k++; }
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { body: src.slice(i + 1, k), start: i, end: k }; }
  }
  return null;
}

// top-level `key:` names inside one literal body - strings, both comment forms and nesting all handled in the
// same pass, so nothing can be mistaken for something else
function topLevelKeys(body) {
  const keys = [];
  let depth = 0, i = 0;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && body[i] !== q) { if (body[i] === BS) i++; i++; }
      i++; continue;
    }
    if (c === '/' && body[i + 1] === '/') { while (i < n && body[i] !== '\n') i++; continue; }
    if (c === '/' && body[i + 1] === '*') { const e = body.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue; }
    if (depth === 0 && /[A-Za-z_$]/.test(c)) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(body.slice(i, i + 80));
      if (m) { keys.push(m[1]); i += m[0].length; continue; }
    }
    i++;
  }
  return keys;
}

function scan(src, label) {
  const re = /(?:const|let|var)\s+CFG\s*=\s*\{/g;
  let m, found = 0, bad = 0;
  while ((m = re.exec(src))) {
    const lit = literalAt(src, m.index);
    if (!lit) continue;
    found++;
    const keys = topLevelKeys(lit.body);
    const count = {};
    keys.forEach(k => { count[k] = (count[k] || 0) + 1; });
    const dupes = Object.keys(count).filter(k => count[k] > 1);
    console.log(label + ': CFG literal, ' + lit.body.split('\n').length + ' lines, ' + keys.length + ' top-level keys read - '
      + (dupes.length ? 'DUPLICATED: ' + dupes.join(', ') : 'no duplicates'));
    bad += dupes.length;
  }
  if (!found) { console.log(label + ': no CFG literal found - the pattern this tool looks for has moved'); return 1; }
  return bad ? 1 : 0;
}

const file = path.join(ROOT, 'index.html');
const src = fs.readFileSync(file, 'utf8');

if (process.argv.indexOf('--self-test') >= 0) {
  // plant a duplicate at the very END of the literal: anything that stops reading early will miss it
  const lit = literalAt(src, src.search(/(?:const|let|var)\s+CFG\s*=\s*\{/));
  const poisoned = src.slice(0, lit.end) + ',\n  THRUST:1   /* planted by --self-test */\n' + src.slice(lit.end);
  const code = scan(poisoned, 'self-test copy');
  console.log(code === 1 ? 'PROVEN: a duplicate planted at the end of the literal is caught' : 'BLIND: the planted duplicate was missed');
  process.exit(code === 1 ? 0 : 1);
}
process.exit(scan(src, 'index.html'));
