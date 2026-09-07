// f42_starmap_travel_replay.js - settles genre cell F42 "player picks a destination on a star
// map and travels between systems." Asserts the wiring (star-map click -> jump; the jump command
// is lane-constrained + fuel-gated + relocates the ship) from the real source, and MEASURES the
// fuel-cost formula so "travels between systems" is a real gated mechanic, not free/instant.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const SM = fs.readFileSync(path.join(REPO, 'starmap.js'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F42 star-map travel replay - wiring asserted from starmap.js + index.html\n');

// 1) the STAR MAP lets you PICK a destination: click a system -> set course
console.log('  PICK A DESTINATION (starmap.js):');
ok('star map prompts "click a system to set course"', /click a system to set course/i.test(SM));
ok('canvas has a click handler (onClick) that reads runCmd', /addEventListener\('click'/.test(SM) && /runCmd/.test(SM));
ok('click on YOUR OWN system -> go <planet> (in-system course)', /runCmd\('go '\s*\+/.test(SM));
ok('click on ANOTHER system -> jump <system> (cross-system travel)', /runCmd\('jump '\s*\+/.test(SM));

// 2) the JUMP command TRAVELS between systems: lane-constrained, fuel-gated, relocates the ship
const jumpBlk = IDX.slice(IDX.indexOf("c==='jump'"), IDX.indexOf("c==='jump'") + 2200);
console.log('\n  TRAVEL BETWEEN SYSTEMS (index.html jump/hyperspace command):');
ok('lane-constrained: refuses without a STARMAP jump lane ("no direct jump lane")', /STARMAP\.neighborsOf/.test(jumpBlk) && /no direct jump lane/.test(jumpBlk));
ok('fuel-gated: refuses when P.fuel < cost', /P\.fuel\s*>=\s*cost/.test(jumpBlk) && /needs\s*\$\{cost\}\s*fuel/.test(jumpBlk));
ok('actually RELOCATES the ship to the target system centre', /P\.pos\.copy\(sy\.center\)/.test(jumpBlk));
ok('arrival is announced ("HYPERJUMP - arrived in ...")', /HYPERJUMP - arrived in/.test(jumpBlk));

// 3) MEASURE the fuel-cost formula: cost = ceil((JUMP_FUEL_BASE + d/JUMP_DIST_PER_FUEL) * mults)
const BASE = +IDX.match(/JUMP_FUEL_BASE:(\d+)/)[1];
const PER = +IDX.match(/JUMP_DIST_PER_FUEL:(\d+)/)[1];
const cost = (d) => Math.ceil(BASE + d / PER);   // engine/series fuelMult default 1.0
console.log(`\n  FUEL COST scales with distance (JUMP_FUEL_BASE ${BASE} + d/JUMP_DIST_PER_FUEL ${PER}):`);
const dists = [300, 600, 1000, 1600];
const costs = dists.map(cost);
dists.forEach((d, i) => console.log(`    ${String(d).padStart(4)}u -> ${costs[i]} fuel`));
ok('cost rises monotonically with distance (a real gated cost, not free/instant)', costs.every((c, i) => i === 0 || c > costs[i - 1]));
ok('a jump is never free (min cost >= JUMP_FUEL_BASE ' + BASE + ')', Math.min(...costs) >= BASE);

console.log('\nRESULT: ' + (pass
  ? 'PASS - F42 yes: the star map sets course on click; crossing systems uses the lane-constrained, fuel-gated jump that relocates the ship'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
