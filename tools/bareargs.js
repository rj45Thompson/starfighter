// bareargs.js - guards the "empty-defaulted matcher" footgun (the B1/B2/B5 class).
//
// Why this exists: `X.startsWith((a[N]||''))` (or .includes/.endsWith with the same empty default) is TRUE
// for every X, because "".startsWith("") is true. Fed to a `.find(...)` or an `if`, a bare command (no arg)
// then silently matches the FIRST item and acts on it - selling a station (B1/B2), or downgrading a hull /
// fencing contraband unbidden (B5). Two agents edit these command handlers, so a new `KEYS.find(k=>
// k.startsWith((a[N]||'').toLowerCase()))` is easy to reintroduce. The correct shape guards the arg first:
// `const q=(a[N]||'').toLowerCase(); const key=q?KEYS.find(k=>k.startsWith(q)):null;` so an empty arg yields
// null and the no-arg branch LISTS instead of picking KEYS[0].
//
//   node tools/bareargs.js             # exit 1 and name every live footgun site (strings + comments skipped)
//   node tools/bareargs.js --self-test # plant one; the check MUST catch it
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BS = String.fromCharCode(92);

// Return src with COMMENTS blanked to spaces (newlines preserved), strings LEFT INTACT. The footgun's own
// `(a[N]||'')` contains an empty-string literal, so we must NOT blank strings (that would erase the very `''`
// the pattern matches); we only blank comments, so the copy in the index.html:4262 comment is not flagged.
// Strings are still tracked while scanning (so a `//` inside a string is not mistaken for a comment).
function stripComments(src) {
  const n = src.length, out = src.split('');
  for (let i = 0; i < n; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === BS) i++; i++; } continue; } // skip string, leave intact
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') { out[i] = ' '; i++; } i--; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; while (i < end) { if (src[i] !== '\n') out[i] = ' '; i++; } i--; continue; }
  }
  return out.join('');
}

// .startsWith / .endsWith / .includes given an EMPTY-string-defaulted a[N] arg: `(a[N]||'')` or `a[N]||''`.
const FOOTGUN = /\.(?:startsWith|endsWith|includes)\(\(?a\[\d+\]\s*\|\|\s*(?:''|"")/g;

function findFootguns(src) {
  const code = stripComments(src);
  const rawLines = src.split('\n');
  const hits = []; let m; FOOTGUN.lastIndex = 0;
  while ((m = FOOTGUN.exec(code))) {
    const line = code.slice(0, m.index).split('\n').length;
    hits.push({ line, text: (rawLines[line - 1] || '').trim().slice(0, 110) });
  }
  return hits;
}

function main() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  if (process.argv.includes('--self-test')) {
    // plant a live footgun; the check MUST flag it. Also prove a COMMENT copy is NOT flagged.
    const planted = idx.replace('function frame(', "var _x=BADKEYS.find(kk=>kk.startsWith((a[7]||'').toLowerCase()));\nfunction frame(");
    const hits = findFootguns(planted);
    const caught = hits.some(h => /a\[7\]/.test(h.text));
    const commentSafe = findFootguns("//   list.find(x => x.name.startsWith((a[2]||'').toLowerCase()))\n").length === 0;
    console.log(caught && commentSafe
      ? 'self-test PASS - planted footgun caught, comment copy ignored'
      : `self-test FAIL - caught=${caught} commentSafe=${commentSafe}`);
    process.exit(caught && commentSafe ? 0 : 1);
  }

  const hits = findFootguns(idx);
  if (!hits.length) { console.log('no bare-arg matcher footguns: every .startsWith/.includes with an a[N] arg guards the empty case (B1/B2/B5 class clean).'); process.exit(0); }
  console.log(`bareargs: FAIL - ${hits.length} empty-defaulted matcher footgun(s) (a bare command matches the FIRST item):`);
  for (const h of hits) console.log(`  index.html:${h.line}  ${h.text}`);
  console.log("  -> guard the arg first: `const q=(a[N]||'').toLowerCase(); const key=q?KEYS.find(k=>k.startsWith(q)):null;`");
  process.exit(1);
}
main();
