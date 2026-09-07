// f34_rivalrep_replay.js - settle F34 "attacking one faction raises standing with its rival"
// (anchor 3/6; ours=partial, one read 2026-09-06 = anchors=1). 2nd independent read + RUN; the
// skeptical "is it actually complete (yes) or absent (no)?" check RESOLVES: partial is correct.
//
// THE CROSSOVER EXISTS (one direction): the Coalition and the Iron Synod/Hegemon are rivals. Killing a
// Hegemon (a pirate) as a Coalition pilot warms the Coalition to you - killByShip index.html:2872,
// inside `if(wasPirate){ ... if(killer.team==='squad'){ repAdd(nearestPlanet, REP_KILL_HEG 0.4) } }`
// (CFG comment :531 "coalition standing - fight the Hegemon, planets warm to you"). repAdd (:1806) also
// spreads the gain to same-system neighbours at half rate.
// BUT it is ONE-DIRECTIONAL and SINGLE-PAIR (why partial, not yes):
//   - No reverse: there is no Hegemon/pirate standing the player can GAIN. Attacking the Coalition only
//     LOWERS Coalition rep (bombing repAdd(p,-REP_BOMB) :2720, customs :1723) - it buys you nothing with
//     the rival. A pirate station merely tolerates hostile-rep ships (:1702), not a gainable standing.
//   - Single scalar, not a matrix: standing is one per-planet Coalition scalar p.rep; there is no
//     multi-faction reputation matrix (cf EVE/Elite/SR2 yes-games where attacking A raises B AND B
//     raises A across many pairs).
// => partial. index.html read-only.
'use strict';
const fs = require('fs'), path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- parse the REAL rep constants ----
const cfgNum = k => { const m = IDX.match(new RegExp(k + ':\\s*(-?[0-9.]+)')); return m ? +m[1] : NaN; };
const REP_KILL_HEG = cfgNum('REP_KILL_HEG'), REP_MAX = cfgNum('REP_MAX'), REP_BOMB = cfgNum('REP_BOMB');
check('parsed CFG rep constants (REP_KILL_HEG=' + REP_KILL_HEG + ', REP_MAX=' + REP_MAX + ', REP_BOMB=' + REP_BOMB + ')', !isNaN(REP_KILL_HEG) && !isNaN(REP_MAX) && REP_KILL_HEG > 0);

// ---- slice & run the REAL repAdd (it is one physical line) ----
const repAddLine = IDX.split(/\r?\n/).find(l => /function repAdd\(p,amt\)\{/.test(l));
check('repAdd() sliced from source', !!repAddLine);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const CFG = { REP_MAX };
let planets = [];
const body = repAddLine.replace(/^\s*function repAdd\(p,amt\)\{/, '').replace(/\}\s*$/, '');
const repAdd = new Function('p', 'amt', 'planets', 'CFG', 'clamp', body);

// ---- RUN: a Coalition pilot kills a Hegemon (pirate) -> nearest planet warms, spreads within system ----
const sysA = { planets: [] }, sysB = { planets: [] };
const kessari = { name: 'Kessari', rep: 0, system: sysA }, thorne = { name: 'Thorne', rep: 0, system: sysA }, far = { name: 'Far', rep: 0, system: sysB };
sysA.planets = [kessari, thorne]; sysB.planets = [far];
planets = [kessari, thorne, far];
// this is exactly what killByShip :2872 does on a squad kill of a pirate near Kessari:
repAdd(kessari, REP_KILL_HEG, planets, CFG, clamp);
check('killing a Hegemon raises the nearest Coalition planet standing (Kessari rep 0 -> ' + kessari.rep + ' = +REP_KILL_HEG)', Math.abs(kessari.rep - REP_KILL_HEG) < 1e-9);
check('the standing gain SPREADS to a same-system neighbour at half rate (Thorne rep -> ' + thorne.rep + ' = +REP_KILL_HEG/2)', Math.abs(thorne.rep - REP_KILL_HEG / 2) < 1e-9);
check('a DIFFERENT system is unaffected (Far rep stays 0)', far.rep === 0);
// repeated kills accumulate but clamp at REP_MAX (bounded standing)
let big = { name: 'Big', rep: 0, system: { planets: [] } }; big.system.planets = [big]; planets = [big];
for (let i = 0; i < 200; i++) repAdd(big, REP_KILL_HEG, planets, CFG, clamp);
check('repeated Hegemon kills warm the Coalition but clamp at REP_MAX (' + big.rep + ' == ' + REP_MAX + ')', big.rep === REP_MAX);

// ---- SOURCE: the crossover is ONE-DIRECTIONAL and SINGLE-PAIR (why partial) ----
const hegHits = (IDX.match(/REP_KILL_HEG/g) || []).length;   // CFG def + the single use site
check('[one-crossover] REP_KILL_HEG is the SOLE faction-kill crossover (def + 1 use site = 2 mentions): ' + hegHits, hegHits === 2);
check('[one-crossover] it fires only on killing a pirate as a squad pilot (killByShip :2872)', /if\(wasPirate\)\{[\s\S]{0,260}killer\.team==='squad'\)\{[^}]*repAdd\([^,]+,CFG\.REP_KILL_HEG\)/.test(IDX));
check('[no-reverse] there is NO gainable pirate/Synod/Hegemon standing (a reverse crossover)', !/(pirate|synod|hegemon)Rep\b/i.test(IDX) && !/repAdd\([^,]*pirate/i.test(IDX));
check('[no-reverse] attacking the Coalition only LOWERS Coalition rep (bombing repAdd(p,-REP_BOMB) :2720), it raises no rival standing', /repAdd\(p,-CFG\.REP_BOMB\)/.test(IDX));
check('[single-pair] standing is one per-planet Coalition scalar p.rep - no multi-faction reputation MATRIX', !/factionRep|repMatrix|standings\s*[:=]\s*\{|reputationMatrix/.test(IDX));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL') + '  (F34 = partial: rival crossover exists, one-directional + single-pair)');
process.exit(fail === 0 ? 0 : 1);
