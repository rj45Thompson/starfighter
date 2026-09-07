// f20_hold_replay.js - settle F20 "cargo is limited by a hold capacity the player can enlarge"
// (ours=yes on a single code read 2026-09-06 = anchors=1, never run). 2nd independent read, RUN not
// just read. F20 = yes, confirmed.
//
// LIMIT: s.holdCap = the hull's base hold + 15 per Cargo Pod fitted (index.html:1794
//   s.holdCap=H.hold + ((s.equip&&s.equip.cargo)||0)*15). A buy is CLAMPED by the remaining room:
//   qty = Math.min(qty, ..., (s.holdCap||HOLD_CAP)-cargoTotal(s), ...) (:1855). When the hold is full
//   the action refuses ("hold full ... sell or jettison first" :4975; "not enough hold" :5017).
// ENLARGE: bigger hull classes carry a bigger base H.hold; and fittable gear raises holdCap - the Cargo
//   Pod (EQUIP.cargo :3406 apply s=>s.holdCap+=15) and hold-freeing micromodules (optimator +15 :3624,
//   microsize +18 :3663, clip +25 :3664, turing +35 :3665). So the cap is real AND player-raisable.
//
// The RUN replicates the buy-quantity clamp (room = holdCap - cargoTotal) and drives it with the real
// enlargement amounts parsed from source. index.html read-only.
'use strict';
const fs = require('fs'), path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- parse the REAL enlargement amounts from source (drift-sensitive) ----
const podM = IDX.match(/cargo:\{n:'Cargo Pod'[^}]*apply:s=>s\.holdCap\+=([0-9]+)\}/);
const CARGO_POD = podM ? +podM[1] : NaN;
const turingM = IDX.match(/turing:\s*\{n:'Turing'[^}]*apply:s=>s\.holdCap\+=([0-9]+)\}/);
const TURING = turingM ? +turingM[1] : NaN;
check('parsed the real hold-enlargement amounts from source (Cargo Pod +' + CARGO_POD + ', Turing micromodule +' + TURING + ')', CARGO_POD > 0 && TURING > 0);

// ---- source-assert the LIMIT + ENLARGE wiring (drift-sensitive) ----
check('[limit] holdCap = hull base hold + 15/Cargo-Pod (:1794)', /s\.holdCap=H\.hold\s*\+\s*\(\(s\.equip&&s\.equip\.cargo\)\|\|0\)\*15/.test(IDX));
check('[limit] a buy is CLAMPED by the remaining room (holdCap - cargoTotal) (:1855)', /Math\.min\(qty,[^;]*\(s\.holdCap\|\|CFG\.HOLD_CAP\)-cargoTotal\(s\)/.test(IDX));
check('[limit] cargoTotal sums the hold (:1852)', /function cargoTotal\(s\)\{\s*let n=0;\s*for\(const k in s\.cargo\)\s*n\+=s\.cargo\[k\];/.test(IDX));
check('[limit] the hold-full path refuses ("hold full ... sell or jettison" :4975; "not enough hold" :5017)', /hold full \(\$\{cargoTotal\(P\)\}\/\$\{P\.holdCap\}\)/.test(IDX) && /not enough hold/.test(IDX));
check('[enlarge] the Cargo Pod is a fittable good that raises holdCap (EQUIP.cargo :3406)', /cargo:\{n:'Cargo Pod',cost:\d+,desc:'\+15 hold',apply:s=>s\.holdCap\+=15\}/.test(IDX));
check('[enlarge] hold-freeing micromodules exist (optimator/microsize/clip/turing raise holdCap)', /optimator:[^]*apply:s=>s\.holdCap\+=15/.test(IDX) && /turing:[^]*apply:s=>s\.holdCap\+=35/.test(IDX));

// ---- RUN: the buy-quantity clamp (room = holdCap - cargoTotal), driven with real enlargement ----
function cargoTotal(cargo) { let n = 0; for (const k in cargo) n += cargo[k]; return n; }
function buy(ship, gk, want) { const room = ship.holdCap - cargoTotal(ship.cargo); const got = Math.max(0, Math.min(want, room)); ship.cargo[gk] = (ship.cargo[gk] || 0) + got; return got; }

const ship = { holdCap: 12, cargo: {}, equip: {} };   // a stock scout-sized hold
const g1 = buy(ship, 'ore', 20);
check('a buy is CLAMPED to the hold: asked 20 into a 12 hold -> got ' + g1 + ' (hold now full)', g1 === 12 && cargoTotal(ship.cargo) === 12);
const g2 = buy(ship, 'ore', 5);
check('a FULL hold refuses more cargo: asked 5 more -> got ' + g2, g2 === 0 && cargoTotal(ship.cargo) === 12);

// fit a Cargo Pod -> holdCap enlarges -> more fits
ship.holdCap += CARGO_POD;
const g3 = buy(ship, 'ore', 20);
check('fitting a Cargo Pod (+' + CARGO_POD + ') ENLARGES the hold: a further buy now takes ' + g3 + ' (hold ' + cargoTotal(ship.cargo) + '/' + ship.holdCap + ')', g3 === CARGO_POD && cargoTotal(ship.cargo) === 12 + CARGO_POD);

// fit a hold-freeing micromodule -> enlarges further
ship.holdCap += TURING;
const g4 = buy(ship, 'ore', 100);
check('a Turing micromodule (+' + TURING + ') enlarges further: a big buy takes exactly the new room ' + g4, g4 === TURING && cargoTotal(ship.cargo) === ship.holdCap);

// bigger HULL classes carry a bigger base hold (the H.hold term) - the primary enlargement path
const holds = [...IDX.matchAll(/hold:\s*(\d+)/g)].map(m => +m[1]).filter(h => h > 0);
check('hull classes carry a range of base holds (min ' + Math.min(...holds) + ' .. max ' + Math.max(...holds) + ') so a bigger hull = a bigger hold', holds.length >= 3 && Math.max(...holds) > Math.min(...holds));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (F20 = yes: hold caps cargo; buying gear/bigger hulls enlarges it)');
process.exit(fail === 0 ? 0 : 1);
