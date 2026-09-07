// cfg_undef.js - scan the game's global CFG for READS of a key that was never defined.
//
// Why this exists: cfg_dupes.js catches a key DEFINED twice; this catches a key READ but never defined.
// `CFG.FOO` where the CFG literal has no `FOO:` (a typo, or a key renamed at the definition but not at one of
// its reads) evaluates to `undefined`, and `undefined` in the arithmetic that fills most of this file becomes
// NaN - a ship stat, a price, a cooldown silently goes NaN and the reason is invisible in the source. Two agents
// edit this 489-key CFG here; a rename that misses one read site is exactly the kind of thing eyesight loses.
//
//   node tools/cfg_undef.js            # exit 1 and name every CFG.<key> read that resolves to nothing
//   node tools/cfg_undef.js --self-test # prove the check by planting an undefined read in a copy first
//
// SCOPE is index.html's global CFG only. Every root MODULE wraps itself in an IIFE with its OWN local
// `const CFG = {...}` (engbay COL_DIM, knowledge NODE_R, ...), so their reads are out of scope here; and
// `RETICLE_CFG.x`, `TOMTEST.CFG.x` etc. are OTHER objects, not the global. The scanner therefore (a) walks the
// source skipping strings and both comment forms, and (b) matches `CFG.` only when it is NOT preceded by a word
// char or a dot - the three false-positive traps that made a naive grep report 41 phantom misses. A read is fine
// if the key is in the literal OR is assigned via `CFG.key =` anywhere in index.html or sim_harness.js (the one
// script that legitimately reaches the global CFG - it drives frame()).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BS = String.fromCharCode(92);

function literalAt(src, from) {
  let i = src.indexOf('{', from);
  if (i < 0) return null;
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === '"' || c === "'" || c === '`') { const q = c; k++; while (k < src.length && src[k] !== q) { if (src[k] === BS) k++; k++; } }
    else if (c === '/' && src[k + 1] === '/') { while (k < src.length && src[k] !== '\n') k++; }
    else if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2); if (k < 0) return null; k++; }
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { body: src.slice(i + 1, k), start: i, end: k }; }
  }
  return null;
}
function topLevelKeys(body) {
  const keys = []; let depth = 0, i = 0; const n = body.length;
  while (i < n) {
    const c = body[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && body[i] !== q) { if (body[i] === BS) i++; i++; } i++; continue; }
    if (c === '/' && body[i + 1] === '/') { while (i < n && body[i] !== '\n') i++; continue; }
    if (c === '/' && body[i + 1] === '*') { const e = body.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue; }
    if (depth === 0 && /[A-Za-z_$]/.test(c)) { const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(body.slice(i, i + 80)); if (m) { keys.push(m[1]); i += m[0].length; continue; } }
    i++;
  }
  return keys;
}
// bare `CFG.<key>` tokens, skipping strings + comments, rejecting a preceding word char (XXX_CFG) or dot (obj.CFG)
function cfgRefs(src) {
  const out = []; const n = src.length; let i = 0, line = 1;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === BS) i++; else if (src[i] === '\n') line++; i++; } i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === 'C' && src.startsWith('CFG.', i) && !(i > 0 && /[\w$.]/.test(src[i - 1]))) {
      const m = /^CFG\.([A-Za-z_$][\w$]*)/.exec(src.slice(i, i + 60));
      if (m) { const assign = /^\s*(\+=|-=|\*=|\/=|=(?!=))/.test(src.slice(i + m[0].length)); out.push({ key: m[1], line, assign }); i += m[0].length; continue; }
    }
    i++;
  }
  return out;
}

function analyse(idx, harness) {
  const lit = literalAt(idx, idx.indexOf('const CFG'));
  if (!lit) return { error: 'could not find the `const CFG` literal in index.html' };
  const defined = new Set(topLevelKeys(lit.body));
  const idxRefs = cfgRefs(idx);
  const assigned = new Set();
  for (const r of cfgRefs(harness)) if (r.assign) assigned.add(r.key);
  for (const r of idxRefs) if (r.assign) assigned.add(r.key);
  const readSites = {}, problems = [];
  for (const r of idxRefs) { if (r.assign) continue; (readSites[r.key] = readSites[r.key] || []).push(r.line); }
  for (const key of Object.keys(readSites)) if (!defined.has(key) && !assigned.has(key)) problems.push([key, readSites[key]]);
  return { defined: defined.size, assigned: assigned.size, reads: Object.keys(readSites).length, problems };
}

function main() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const harness = fs.readFileSync(path.join(ROOT, 'sim_harness.js'), 'utf8');

  if (process.argv.includes('--self-test')) {
    // plant a read of a key that is NOT in the literal and never assigned; the checker MUST flag it.
    const planted = idx.replace('const CFG', 'const _probe = CFG.__CFG_UNDEF_SELFTEST__ + 1;\nconst CFG');
    const r = analyse(planted, harness);
    const caught = !r.error && r.problems.some(([k]) => k === '__CFG_UNDEF_SELFTEST__');
    console.log(caught ? 'self-test PASS - the planted undefined read was caught'
      : 'self-test FAIL - a planted undefined read went unnoticed, this checker proves nothing');
    process.exit(caught ? 0 : 1);
  }

  const r = analyse(idx, harness);
  if (r.error) { console.log('cfg_undef: ' + r.error); process.exit(2); }
  if (r.problems.length === 0) {
    console.log(`index.html: ${r.reads} distinct CFG.<key> reads, all resolve (${r.defined} literal keys + ${r.assigned} runtime-assigned) - no undefined reads.`);
    process.exit(0);
  }
  console.log(`cfg_undef: FAIL - ${r.problems.length} CFG.<key> read(s) with NO definition (undefined -> NaN risk):`);
  for (const [key, lines] of r.problems.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  CFG.${key}  at index.html ${lines.slice(0, 8).map(l => ':' + l).join(', ')}${lines.length > 8 ? ' ...' : ''}`);
  }
  console.log('  -> add the key to the CFG literal, or fix the misspelled read.');
  process.exit(1);
}
main();
