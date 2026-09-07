// f43_fuel_replay.js - settles genre cell F43 "interstellar travel consumes fuel that must be
// replenished." Consumption is already measured by F42 (the jump cost formula + P.fuel-=cost);
// this replay measures the REPLENISHMENT: it slices the real refuel()/fuelCapOf() out of
// index.html and drives them to show refuel BUYS the traded good 'gas' for credits, capped by
// the tank, and LIMITED by both the player's credits and the planet's gas stock - a real
// economic action, not free/automatic. Fuel is finite (FUEL_CAP 60), so it can run out.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

const FUEL_CAP = +IDX.match(/FUEL_CAP:(\d+)/)[1];
const CFG = { FUEL_CAP };
// slice the real functions (fuelCapOf :3612, refuel :1856-1857) verbatim
const fuelCapSrc = lines[3611];                 // 1-indexed 3612
const refuelSrc = lines.slice(1855, 1857).join('\n');   // 1-indexed 1856..1857
if (!/function fuelCapOf/.test(fuelCapSrc) || !/function refuel/.test(refuelSrc)) {
  console.error('FAIL: fuelCapOf/refuel slice moved'); process.exit(2);
}
let GAS_PRICE = 5;                               // stand-in for priceOf(p,'gas') - the market price
function priceOf(_p, _gk) { return GAS_PRICE; } // (real refuel reads the market here; the LIMIT logic under test is refuel's own)
const M = new Function('CFG', 'priceOf', 'window',
  fuelCapSrc + '\n' + refuelSrc + '\n;return { refuel: refuel, fuelCapOf: fuelCapOf };'
)(CFG, priceOf, {});

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };
const ship = (fuel, credits) => ({ role: 'trader', fuel, credits, fuelCap: FUEL_CAP });
const planet = (gas) => ({ stock: { gas } });

console.log('F43 fuel replay - real refuel()/fuelCapOf() sliced from index.html\n');
console.log(`  fuel is FINITE: FUEL_CAP ${FUEL_CAP} (a jump can empty it; the jump command refuses "refuel first")\n`);

// a) normal refuel: buys up to the tank, pays credits, draws down the planet's gas stock
let s = ship(20, 500), p = planet(100);
let q = M.refuel(s, p);
console.log(`  normal:        fuel 20->${s.fuel}, credits 500->${s.credits}, planet gas 100->${p.stock.gas}, bought ${q}`);
ok('refuel fills the tank (need 40 met), pays 40*5=200c, gas stock -40', q === 40 && s.fuel === 60 && s.credits === 300 && p.stock.gas === 60);

// b) CREDIT-limited: a near-broke ship can only buy what it can afford
s = ship(20, 50); p = planet(100); q = M.refuel(s, p);
console.log(`  credit-limited: fuel 20->${s.fuel}, credits 50->${s.credits}, bought ${q} (afford floor(50/5)=10)`);
ok('credit-limited to 10 units -> fuel 30, credits 0', q === 10 && s.fuel === 30 && s.credits === 0);

// c) STOCK-limited: a low-gas planet can't fully supply (keeps a floor of 4)
s = ship(20, 500); p = planet(8); q = M.refuel(s, p);
console.log(`  stock-limited:  fuel 20->${s.fuel}, planet gas 8->${p.stock.gas}, bought ${q} (floor(8-4)=4)`);
ok('stock-limited to 4 units -> fuel 24, gas stock 4', q === 4 && s.fuel === 24 && p.stock.gas === 4);

// d) tank already full: nothing bought, nothing charged
s = ship(60, 500); p = planet(100); q = M.refuel(s, p);
ok('full tank: refuel returns 0, no credits spent', q === 0 && s.credits === 500);

// price scales the cost (fuel is bought at the market gas price -> ties into F18/F19)
GAS_PRICE = 12; s = ship(50, 500); p = planet(100); M.refuel(s, p);
ok('cost tracks the gas market price (10 units @ 12 = 120c spent)', s.credits === 380 && s.fuel === 60);

// code-read wiring (not a stub): the player refuels via a command; hostile worlds bar it
ok('a "refuel" command exists (NL alias -> cmd:\'refuel\'), buying gas at the dock', /cmd:\s*'refuel'/.test(IDX) && /refuel for gas/.test(IDX));
ok('cannot dock/refuel/repair at a Hegemon-held world until liberated (:2055)', /can no longer dock, refuel or repair/.test(IDX));

console.log('\n  CONSUMPTION side (already measured by F42): the jump command charges');
console.log('  cost = ceil((JUMP_FUEL_BASE 8 + d/JUMP_DIST_PER_FUEL 85) * fuelMult) and P.fuel -= cost (index.html:5022-5024).');

console.log('\nRESULT: ' + (pass
  ? 'PASS - F43 yes: interstellar jump CONSUMES fuel (F42), and fuel is a FINITE resource REPLENISHED by buying gas at a friendly dock (credit- and stock-limited)'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
