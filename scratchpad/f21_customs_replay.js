// f21_customs_replay.js - headless proof that illegal goods EXIST and are DETECTED by customs with
// a real CONSEQUENCE (seizure + fine + standing loss). The dock-scan GATE (index.html:1701) and the
// scanBust body (:1714-1716) are transcribed VERBATIM; the CFG constants are the real values
// (SCAN_CHANCE 0.5, SCAN_FINE 0.6, REP_BOMB 0.5, SKILL_CHARISMA_FINE 0.12, :511/:523/:585) and the
// CONTRABAND bases are the real table (:3991). rand() is made deterministic so the 50% roll is driven.
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { SCAN_CHANCE: 0.5, SCAN_FINE: 0.6, REP_BOMB: 0.5, SKILL_CHARISMA_FINE: 0.12 };
const CONTRABAND = { relics: { n: 'Alien Relics', base: 120 }, narcotics: { n: 'Spice', base: 90 }, arms: { n: 'Black-market Arms', base: 150 } };
let _rep = null;                       // captured repAdd side effect
function repAdd(p, d) { _rep = { p: p.name, d }; }
function skillLvl(s, k) { return (s.skills && s.skills[k]) || 0; }
let _flag = null;
function notify(msg) { _flag = msg; }

// ---- VERBATIM index.html:1714-1716 ----
function contraCount(s) { let n = 0; for (const k in (s.contraband || {})) n += s.contraband[k] || 0; return n; }
function scanBust(s, p) {
  let val = 0; for (const k in s.contraband) val += CONTRABAND[k].base * s.contraband[k];
  const fine = Math.round(val * CFG.SCAN_FINE * (1 - CFG.SKILL_CHARISMA_FINE * skillLvl(s, 'charisma')));
  s.contraband = {}; s.credits = Math.max(0, s.credits - fine); repAdd(p, -CFG.REP_BOMB * 2);
  notify(`⚠ CUSTOMS SCAN at ${p.name} - contraband seized, fined ${fine}c, standing dropped.`);
  return fine;                         // (return added only so the harness can read the fine; game ignores it)
}
// VERBATIM gate index.html:1701, with rand injected so the roll is deterministic
function dockScanGate(s, p, roll) {
  const rand = () => roll;
  if (s.role === 'player' && contraCount(s) > 0 && !p.isPirateStation && rand(0, 1) < CFG.SCAN_CHANCE) return scanBust(s, p);
  return null;
}

const lawful = { name: 'Halcyon', rep: 5, isPirateStation: false };
const pirate = { name: 'Rustport', rep: -6, isPirateStation: true };

// 1) illegal goods EXIST and count correctly
const s1 = { role: 'player', credits: 1000, contraband: { relics: 2, arms: 1 }, skills: {} };
check('[exist] contraband is a real inventory (2 relics + 1 arms = 3 units)', contraCount(s1) === 3);

// 2) DETECTED: docking at a lawful world with a scan roll that HITS -> bust with all three consequences
const s2 = { role: 'player', credits: 1000, contraband: { relics: 3 }, skills: {} };  // val 360
const fine2 = dockScanGate(s2, lawful, 0.3);        // 0.3 < 0.5 -> scan hits
check('[detect] scan HIT seizes ALL contraband', Object.keys(s2.contraband).length === 0);
check('[detect] fine = round(360 * 0.6) = 216 charged to credits', fine2 === 216 && s2.credits === 784);
check('[detect] standing dropped by REP_BOMB*2 = 1.0 at the docked world', _rep && _rep.p === 'Halcyon' && _rep.d === -1);
check('[detect] player is flagged with a CUSTOMS SCAN notice', /CUSTOMS SCAN at Halcyon/.test(_flag));

// 3) the roll is a real 50% gamble: a MISS leaves the smuggler untouched
const s3 = { role: 'player', credits: 1000, contraband: { relics: 3 }, skills: {} };
const fine3 = dockScanGate(s3, lawful, 0.7);        // 0.7 >= 0.5 -> no scan
check('[gamble] scan MISS -> contraband kept, no fine', fine3 === null && s3.contraband.relics === 3 && s3.credits === 1000);

// 4) pirate station is EXEMPT (the fence's home) even on a roll that would hit
const s4 = { role: 'player', credits: 1000, contraband: { relics: 3 }, skills: {} };
const fine4 = dockScanGate(s4, pirate, 0.01);
check('[exempt] pirate station never scans', fine4 === null && s4.contraband.relics === 3);

// 5) no contraband -> no scan at all (the gate short-circuits)
const s5 = { role: 'player', credits: 1000, contraband: {}, skills: {} };
check('[clean] a clean hold is never busted', dockScanGate(s5, lawful, 0.01) === null);

// 6) CHARISMA talks the fine down (SR-M17): higher charisma -> smaller fine on the same load
const sHi = { role: 'player', credits: 1000, contraband: { relics: 3 }, skills: { charisma: 5 } };  // 1 - 0.12*5 = 0.40
const fineHi = dockScanGate(sHi, lawful, 0.1);
check('[charisma] charisma 5 cuts the 216c fine to round(360*0.6*0.40)=86', fineHi === 86);
check('[charisma] a talker pays less than a brute (86 < 216)', fineHi < fine2);

// 7) the fine is floored at 0 credits (never negative)
const sPoor = { role: 'player', credits: 50, contraband: { relics: 3 }, skills: {} };  // fine 216 > 50
dockScanGate(sPoor, lawful, 0.1);
check('[floor] credits floored at 0, never negative', sPoor.credits === 0);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
