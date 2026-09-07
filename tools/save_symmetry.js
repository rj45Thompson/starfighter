// save_symmetry.js - every field gatherSaveState() writes into player:{...} must be read back by applySaveState().
//
// Why this exists: a field that is SAVED but never RESTORED silently resets on reload - the player buys a new gear
// type, plays, reloads, and it is gone, with nothing in the source hinting why. Two agents edit this save/load path
// (index.html gatherSaveState / applySaveState); adding `foo:P.foo` to the save object and forgetting the matching
// `foo:sp.foo` in the restore is exactly the asymmetry eyesight loses. This checks the player block both ways.
//
//   node tools/save_symmetry.js             # exit 1 and name every player field written but never read back
//   node tools/save_symmetry.js --self-test # prove the check by planting a write-without-read first
//
// SCOPE: the `player:{...}` object inside gatherSaveState vs the `sp.<field>` reads inside applySaveState (index.html).
// Top-level records (campaign/escalation/warScore/probes/planets/systems/newsLog) are read by their own code paths and
// are out of scope here. A read with no matching write (a default that never receives a saved value, or a legacy
// MIGRATION field like targetingComputer) is reported informationally, NOT as a failure - only write-without-read,
// the silent-data-loss direction, fails the check. Strings and both comment forms are skipped, so a `foo:` inside a
// comment ("EGOSOFT layer:") is not mistaken for a field.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BS = String.fromCharCode(92);
const READ_ONLY_OK = new Set(['targetingComputer']); // legacy migration: read from old saves, no longer written

// From the `{` at `open`, return the top-level (depth-1) `key:` names, skipping strings + both comment forms and any
// nested {}/[]/() so a key inside lvl:{...} or a value like rankOf(s).n is never counted.
function topKeysOfBlock(src, open) {
  const keys = []; let depth = 0; const n = src.length;
  for (let i = open; i < n; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === BS) i++; i++; } continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 1; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; if (depth === 0) break; continue; }
    if (depth === 1 && /[A-Za-z_$]/.test(c) && (i === 0 || /[,{\s]/.test(src[i - 1]))) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(src.slice(i, i + 60));
      if (m) { keys.push(m[1]); i += m[0].length - 1; }
    }
  }
  return keys;
}
// all distinct `sp.<key>` reads in a slice, skipping strings + comments (sp is applySaveState's save.player alias)
function spReads(src) {
  const out = new Set(); const n = src.length; let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === BS) i++; i++; } i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === 's' && src.startsWith('sp.', i) && !(i > 0 && /[\w$.]/.test(src[i - 1]))) {
      const m = /^sp\.([A-Za-z_$][\w$]*)/.exec(src.slice(i, i + 40));
      if (m) { out.add(m[1]); i += m[0].length; continue; }
    }
    i++;
  }
  return out;
}
function analyse(src) {
  const gi = src.indexOf('function gatherSaveState');
  if (gi < 0) return { error: 'gatherSaveState() not found in index.html' };
  const pj = src.indexOf('player:{', gi);
  if (pj < 0) return { error: 'the player:{ block was not found inside gatherSaveState' };
  const written = topKeysOfBlock(src, src.indexOf('{', pj));
  const ai = src.indexOf('function applySaveState');
  if (ai < 0) return { error: 'applySaveState() not found in index.html' };
  let ae = src.indexOf('\nfunction ', ai + 1); if (ae < 0) ae = src.length;
  const read = spReads(src.slice(ai, ae));
  const writtenNotRead = written.filter(k => !read.has(k));
  const readNotWritten = [...read].filter(k => !written.includes(k) && !READ_ONLY_OK.has(k));
  return { written, readCount: read.size, writtenNotRead, readNotWritten };
}
function main() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  if (process.argv.includes('--self-test')) {
    // plant a player field that is written but has no matching sp. read; the check MUST flag it.
    const planted = idx.replace('player:{', 'player:{ __SAVE_SYM_SELFTEST__:P.__x,');
    const r = analyse(planted);
    const caught = !r.error && r.writtenNotRead.includes('__SAVE_SYM_SELFTEST__');
    console.log(caught
      ? 'self-test PASS - the planted write-without-read (__SAVE_SYM_SELFTEST__) was caught'
      : 'self-test FAIL - a planted write-without-read went unnoticed, this checker proves nothing');
    process.exit(caught ? 0 : 1);
  }

  const r = analyse(idx);
  if (r.error) { console.log('save_symmetry: ' + r.error); process.exit(2); }
  if (r.writtenNotRead.length === 0) {
    console.log(`save/load player block symmetric: ${r.written.length} fields written in gatherSaveState(), all read back in applySaveState() (${r.readCount} distinct sp.<field> reads).`
      + (r.readNotWritten.length ? ` [read-only, no matching write: ${r.readNotWritten.join(', ')}]` : ''));
    process.exit(0);
  }
  console.log(`save_symmetry: FAIL - ${r.writtenNotRead.length} player field(s) SAVED but never RESTORED (silent reset on reload):`);
  for (const k of r.writtenNotRead) console.log(`  player.${k}  written in gatherSaveState() but never read as sp.${k} in applySaveState()`);
  console.log(`  -> add \`${r.writtenNotRead[0]}:sp.${r.writtenNotRead[0]}\` (or num2(...)) to applySaveState, or drop it from gatherSaveState.`);
  process.exit(1);
}
main();
