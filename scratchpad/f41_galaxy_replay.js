// f41_galaxy_replay.js - re-grades genre cell F41 "the playable galaxy is procedurally
// generated rather than hand-authored". Seed said YES; a skeptical read finds it is a MIS-GRADE.
//
// The galaxy IS built under a seeded PRNG (withSeed(galaxySeed()) index.html:6565), BUT only the
// PLACEMENT is procedural: the galaxy's IDENTITY - which systems exist, which planets, their
// types, their home systems, their specialties - is HAND-AUTHORED constant tables cycled by i%len
// with NO rng (the game's own comment at :1456 says "planets regenerate in a fixed order, NO rng").
// So every seed yields the SAME 9 named systems holding the SAME 16 named planets of the SAME
// types on the SAME nearest-2 lanes; only orbital positions/radii/elevations vary. That is exactly
// x_series's genre "no" ("sector layout is identical across game-starts"), not a "yes". Honest
// grade: PARTIAL (procedural placement on a hand-authored skeleton).
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

const strs = (re) => { const m = IDX.match(re); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : null; };
const N_SYSTEMS = +IDX.match(/N_SYSTEMS:(\d+)/)[1];
const N_PLANETS = +IDX.match(/N_PLANETS:(\d+)/)[1];
const SYSNAMES = strs(/const SYSNAMES=(\[[^\]]*\])/);
const PNAMES = strs(/const PNAMES=(\[[\s\S]*?\])/);
const PTYPES = [...IDX.slice(IDX.indexOf('const PTYPES=[')).matchAll(/\{t:'([^']+)'/g)].slice(0, 5).map(m => m[1]);
if (!SYSNAMES || !PNAMES || PTYPES.length !== 5) { console.error('FAIL: could not parse the authored tables'); process.exit(2); }

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F41 galaxy replay - authored tables parsed from index.html\n');
console.log(`  N_SYSTEMS=${N_SYSTEMS}, N_PLANETS=${N_PLANETS}, PTYPES=${PTYPES.length} (${PTYPES.join('/')})`);
console.log('\n  THE INVARIANT GALAXY SKELETON (identical for EVERY seed - assigned by i%len, no rng):');
console.log('    systems: ' + SYSNAMES.slice(0, N_SYSTEMS).join(', '));
console.log('    planets:');
for (let i = 0; i < N_PLANETS; i++)
  console.log(`      ${String(i).padStart(2)}. ${PNAMES[i].padEnd(9)} ${PTYPES[i % PTYPES.length].padEnd(8)} @ ${SYSNAMES[i % N_SYSTEMS]}`);

// The IDENTITY assignment lines use i%len and NO rand -> seed-independent (hand-authored).
const idLines = { 'system name :1515': lines[1514], 'planet type/sys :1525': lines[1524], 'planet name :1529': lines[1528] };
console.log('\n  IDENTITY is rand-free (so it does not vary with the galaxy seed):');
for (const [k, ln] of Object.entries(idLines)) {
  const hasIdx = /\[i\s*%/.test(ln), hasRand = /\brand\s*\(/.test(ln);
  ok(`${k}: uses i%len index=${hasIdx}, uses rand=${hasRand} (want index=true, rand=false)`, hasIdx && !hasRand);
}
// The PLACEMENT lines DO use rand -> procedural positions (the real, but cosmetic, generation).
const posLines = { 'system elevation :1513': lines[1512], 'planet orbit :1526': lines[1525], 'planet radius :1527': lines[1526] };
console.log('\n  PLACEMENT is procedural (rand under the seeded withSeed):');
for (const [k, ln] of Object.entries(posLines)) {
  const hasRand = /\brand\s*\(/.test(ln);
  ok(`${k}: uses rand=${hasRand} (want true)`, hasRand);
}
// The game's own comment corroborates the fixed order / no rng for identity.
ok('game comment confirms "planets regenerate in a fixed order, NO rng" (:1456-1459)', /planets regenerate in a fixed\s*[\r\n]*\s*\/\/\s*order,?\s*NO rng|regenerate in a fixed order, NO rng/i.test(IDX) || /fixed[\s\S]{0,40}NO rng/i.test(IDX));

console.log('\n  VERDICT: PARTIAL, not yes. The galaxy is a HAND-AUTHORED skeleton (9 named systems,');
console.log('  16 named planets, fixed types + specialties + nearest-2 lanes - identical every start,');
console.log('  = x_series genre "no") with PROCEDURAL PLACEMENT (seeded orbital positions/radii/nebulae).');
console.log('\nRESULT: ' + (pass ? 'PASS - evidence supports re-grading F41 yes -> PARTIAL' : 'FAIL - evidence did not hold, do NOT regrade'));
process.exit(pass ? 0 : 1);
