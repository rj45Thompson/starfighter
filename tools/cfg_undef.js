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
// SCOPE: index.html's global CFG, PLUS every root module that reads that global CFG directly. Most root modules
// wrap themselves in an IIFE with their OWN local `const CFG = {...}` (engbay COL_DIM, knowledge NODE_R, ...) and
// are correctly out of scope - a module's bare `CFG.KEY` means its own local object. But a module with NO local
// `const/let/var CFG` and a bare `CFG.KEY` is reading the WINDOW global: inhabitant.js does (`:58 CFG.SENSE_R`,
// `:65 CFG.DOCK_R`, `:133 CFG.COMM_R`; it keeps its own config under INH_CFG), and those reads carry the exact
// same rename-to-NaN exposure as index.html's own reads - so they are checked here too, against the same global
// literal. (An earlier version of this header claimed EVERY module was self-contained; inhabitant.js disproves it.)
// `RETICLE_CFG.x`, `TOMTEST.CFG.x` etc. are OTHER objects, not the global. The scanner therefore (a) walks each
// source skipping strings and both comment forms, and (b) matches `CFG.` only when it is NOT preceded by a word
// char or a dot - the false-positive traps a naive grep hits. A read is fine if the key is in the literal OR is
// assigned via `CFG.key =` anywhere in index.html, sim_harness.js (which drives frame()), or a scanned module.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BS = String.fromCharCode(92);
const VENDORED = new Set(['three.min.js', 'fbxloader.js', 'fflate.min.js']);

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
// strip strings + both comment forms to spaces, so a declaration test cannot fire inside one
function stripSC(src) {
  let out = ''; const n = src.length; let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === BS) i++; i++; } i++; out += ' '; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue; }
    out += c; i++;
  }
  return out;
}
// A module with its OWN `const/let/var CFG = ...` shadows the global; its bare CFG.KEY reads are local, out of scope.
function hasLocalCFG(src) { return /\b(?:const|let|var)\s+CFG\s*=/.test(stripSC(src)); }

// Collect distinct read keys and per-key line lists from a ref list.
function readSitesOf(refs) {
  const sites = {};
  for (const r of refs) { if (r.assign) continue; (sites[r.key] = sites[r.key] || []).push(r.line); }
  return sites;
}

// modules: [{file, src}]. A module is IN SCOPE only if it has NO local CFG and does read the global.
function analyse(idx, harness, modules) {
  const lit = literalAt(idx, idx.indexOf('const CFG'));
  if (!lit) return { error: 'could not find the `const CFG` literal in index.html' };
  const defined = new Set(topLevelKeys(lit.body));
  const assigned = new Set();
  const idxRefs = cfgRefs(idx);
  for (const r of cfgRefs(harness)) if (r.assign) assigned.add(r.key);
  for (const r of idxRefs) if (r.assign) assigned.add(r.key);

  // global-reading modules (no local const CFG), gathering their assigns first so a self-consistent module passes
  const modReaders = [];
  for (const m of (modules || [])) {
    if (hasLocalCFG(m.src)) continue;
    const refs = cfgRefs(m.src);
    if (!refs.some(r => !r.assign)) continue;           // references CFG but only assigns - nothing to read-check
    for (const r of refs) if (r.assign) assigned.add(r.key);
    modReaders.push({ file: m.file, sites: readSitesOf(refs) });
  }

  const idxReadSites = readSitesOf(idxRefs);
  const problems = [];
  for (const key of Object.keys(idxReadSites)) if (!defined.has(key) && !assigned.has(key)) problems.push([key, idxReadSites[key]]);

  const modProblems = [], modReaderOut = [];
  for (const mr of modReaders) {
    const keys = Object.keys(mr.sites);
    modReaderOut.push({ file: mr.file, keys });
    for (const key of keys) if (!defined.has(key) && !assigned.has(key)) modProblems.push({ file: mr.file, key, lines: mr.sites[key] });
  }
  return { defined: defined.size, assigned: assigned.size, reads: Object.keys(idxReadSites).length, problems, modReaders: modReaderOut, modProblems };
}

function readModules() {
  return fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.js') && !VENDORED.has(f) && f !== 'sim_harness.js')
    .map(f => ({ file: f, src: fs.readFileSync(path.join(ROOT, f), 'utf8') }));
}

function main() {
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const harness = fs.readFileSync(path.join(ROOT, 'sim_harness.js'), 'utf8');
  const modules = readModules();

  if (process.argv.includes('--self-test')) {
    // 1) index.html: a read of a key not in the literal and never assigned MUST be flagged.
    const plantedIdx = idx.replace('const CFG', 'const _probe = CFG.__CFG_UNDEF_SELFTEST__ + 1;\nconst CFG');
    const rIdx = analyse(plantedIdx, harness, modules);
    const caughtIdx = !rIdx.error && rIdx.problems.some(([k]) => k === '__CFG_UNDEF_SELFTEST__');
    // 2) a MODULE that reads the global CFG (no local CFG) with an undefined key MUST be flagged.
    const synthReader = [{ file: '__selftest_reader.js', src: '(function(){ var x = CFG.__CFG_MODULE_SELFTEST__ + 1; })();' }];
    const rMod = analyse(idx, harness, synthReader);
    const caughtMod = !rMod.error && rMod.modProblems.some(p => p.file === '__selftest_reader.js' && p.key === '__CFG_MODULE_SELFTEST__');
    // 3) a module with its OWN local const CFG must NOT be flagged (its CFG.KEY is local, out of scope).
    const synthLocal = [{ file: '__selftest_local.js', src: '(function(){ const CFG = { A: 1 }; var y = CFG.__NOT_THE_GLOBAL__; })();' }];
    const rLoc = analyse(idx, harness, synthLocal);
    const noFalsePos = !rLoc.error && !rLoc.modProblems.some(p => p.file === '__selftest_local.js');
    const ok = caughtIdx && caughtMod && noFalsePos;
    console.log(ok
      ? 'self-test PASS - planted undefined reads caught in index.html AND in a global-reading module; a module with its own local CFG was not falsely flagged.'
      : `self-test FAIL - index:${caughtIdx} module:${caughtMod} localCFGnotFlagged:${noFalsePos}`);
    process.exit(ok ? 0 : 1);
  }

  const r = analyse(idx, harness, modules);
  if (r.error) { console.log('cfg_undef: ' + r.error); process.exit(2); }
  const total = r.problems.length + r.modProblems.length;
  if (total === 0) {
    const modLine = r.modReaders.length
      ? ` Also checked ${r.modReaders.length} module(s) that read the global CFG (${r.modReaders.map(m => m.file + ': ' + m.keys.join('/')).join('; ')}) - all resolve.`
      : '';
    console.log(`index.html: ${r.reads} distinct CFG.<key> reads, all resolve (${r.defined} literal keys + ${r.assigned} runtime-assigned).${modLine} No undefined reads.`);
    process.exit(0);
  }
  console.log(`cfg_undef: FAIL - ${total} CFG.<key> read(s) with NO definition (undefined -> NaN risk):`);
  for (const [key, lines] of r.problems.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  CFG.${key}  at index.html ${lines.slice(0, 8).map(l => ':' + l).join(', ')}${lines.length > 8 ? ' ...' : ''}`);
  }
  for (const p of r.modProblems.sort((a, b) => b.lines.length - a.lines.length)) {
    console.log(`  CFG.${p.key}  at ${p.file} ${p.lines.slice(0, 8).map(l => ':' + l).join(', ')}${p.lines.length > 8 ? ' ...' : ''}  (module reads the GLOBAL CFG; key not in index.html literal)`);
  }
  console.log('  -> add the key to the CFG literal, or fix the misspelled read.');
  process.exit(1);
}
main();
