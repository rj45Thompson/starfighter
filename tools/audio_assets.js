// audio_assets.js - guard: every audio file the game REFERENCES actually exists on disk.
//   node tools/audio_assets.js            -> lists each referenced sample/bed, exits 1 if any missing
//   node tools/audio_assets.js --self-test-> proves the guard fails when a path is wrong
//
// WHY THIS EXISTS. c7c8f1f ("Every effect is a recording now, not an oscillator") replaced the
// eight FM-synth effects RJ called "slop" with generated recordings, wired as a PREFERENCE over
// the FM voices: anything that 404s falls through to its oscillator twin. That fallback is a
// safety net and a trap - the commit itself records "the first wiring had the wrong path and all
// ten 404'd, and the game played all 13 sounds through the synth with zero errors." A wrong path
// or a dropped file therefore reintroduces the slop SILENTLY: no crash, no console error, just
// the old sound. This guard makes that failure loud by checking every referenced file resolves.
//
// It derives the referenced set from source (sound.js SAMPLE_FILES + SAMPLE_DIR/MUSIC_DIR,
// index.html MUSIC_TRACK) rather than hardcoding it, so it stays correct as the tables change.
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const SOUND = fs.readFileSync(path.join(REPO, 'sound.js'), 'utf8');
const INDEX = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

function one(re, src, what) {
  const m = src.match(re);
  if (!m) { console.error(`FAIL: could not parse ${what} - its declaration moved or changed shape.`); process.exit(2); }
  return m[1];
}
const SAMPLE_DIR = one(/SAMPLE_DIR:\s*'([^']*)'/, SOUND, 'SAMPLE_DIR (sound.js)');
const MUSIC_DIR  = one(/MUSIC_DIR:\s*'([^']*)'/, SOUND, 'MUSIC_DIR (sound.js)');
const MUSIC_TRACK = one(/MUSIC_TRACK:\s*'([^']*)'/, INDEX, 'MUSIC_TRACK (index.html)');

// pull the SAMPLE_FILES object literal and read every key: 'path' pair out of it
const decl = SOUND.indexOf('var SAMPLE_FILES');
if (decl < 0) { console.error('FAIL: SAMPLE_FILES table not found in sound.js.'); process.exit(2); }
const block = SOUND.slice(decl, SOUND.indexOf('};', decl) + 2);
const refs = [];
let m; const pair = /(\w+)\s*:\s*'([^']+)'/g;
while ((m = pair.exec(block)) !== null) refs.push({ key: m[1], rel: SAMPLE_DIR + m[2], kind: 'sfx' });
if (refs.length === 0) { console.error('FAIL: parsed SAMPLE_FILES but found no entries.'); process.exit(2); }
// the music bed the game actually plays (index.html: SOUND.playMusic(CFG.MUSIC_TRACK))
refs.push({ key: 'MUSIC_TRACK', rel: MUSIC_DIR + MUSIC_TRACK + '.ogg', kind: 'bed' });

function check(rel) {
  const abs = path.join(REPO, rel);
  try { const st = fs.statSync(abs); return st.isFile() ? (st.size > 0 ? { ok: true, size: st.size } : { ok: false, why: 'EMPTY' }) : { ok: false, why: 'NOT-A-FILE' }; }
  catch { return { ok: false, why: 'MISSING' }; }
}

const selfTest = process.argv.includes('--self-test');
if (selfTest) refs.push({ key: 'PLANTED', rel: SAMPLE_DIR + 'audio/sfx/__does_not_exist__.ogg', kind: 'sfx' });

let bad = 0;
console.log(`audio_assets: ${refs.length} referenced files (SAMPLE_DIR='${SAMPLE_DIR}', MUSIC_DIR='${MUSIC_DIR}', track='${MUSIC_TRACK}')\n`);
for (const r of refs) {
  const res = check(r.rel);
  if (res.ok) console.log(`  OK    [${r.kind}] ${r.key.padEnd(18)} ${r.rel}  (${res.size} B)`);
  else { console.log(`  ${res.why.padEnd(6)}[${r.kind}] ${r.key.padEnd(18)} ${r.rel}`); bad++; }
}

if (selfTest) {
  const ok = bad === 1;   // exactly the planted one should fail
  console.log(`\nself-test: planted a bogus path; guard flagged ${bad} file(s) -> ${ok ? 'PASS (catches a missing recording)' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
}

if (bad) {
  console.log(`\nRESULT: FAIL - ${bad} referenced audio file(s) missing/empty. The game will silently fall back to`);
  console.log('        FM-synth "slop" for these (no crash, no console error). Restore the file(s) or fix the path.');
  process.exit(1);
}
console.log('\nRESULT: PASS - every referenced effect sample and the music bed exists and is non-empty.');
process.exit(0);
