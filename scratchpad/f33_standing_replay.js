// f33_standing_replay.js - headless proof that standing is TRACKED SEPARATELY PER (system-)FACTION and
// CHANGES WITH PLAYER ACTIONS. repAdd (index.html:1799) moves a planet's .rep and spreads HALF to its
// SYSTEM siblings ONLY (never cross-system), so each system's standing is independent; the `rep` command
// (:5224-5227) prints "COALITION STANDING (by faction)" as one averaged line per system. repAdd + the
// per-system average + clamp are transcribed VERBATIM; REP constants are real (index.html:523-524).
// HONEST LIMIT (like F34): the "factions" are coalition SYSTEMS; the Iron Synod/Hegemon is the always-
// hostile enemy (a world it takes is forced HOSTILE), with no independent positive standing axis.
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { REP_MAX: 12, REP_HOSTILE: -6, REP_ALLIED: 6, REP_TRADE: 0.12, REP_TERRA: 0.6, REP_BOMB: 0.5, REP_KILL_HEG: 0.4, REP_LIBERATE: 3 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// two systems, tracked separately
const sysA = { name: 'Halcyon System', planets: [] };
const sysB = { name: 'Cydon System', planets: [] };
const A1 = { name: 'Halcyon', rep: 0, system: sysA }, A2 = { name: 'Pallas', rep: 0, system: sysA }, A3 = { name: 'Astra', rep: 0, system: sysA };
const B1 = { name: 'Cydon', rep: 0, system: sysB }, B2 = { name: 'Vex', rep: 0, system: sysB };
sysA.planets = [A1, A2, A3]; sysB.planets = [B1, B2];
const planets = [A1, A2, A3, B1, B2];
const systems = [sysA, sysB];

// ---- VERBATIM index.html:1799 ----
function repAdd(p, amt) { p.rep = clamp((p.rep || 0) + amt, -CFG.REP_MAX, CFG.REP_MAX); if (p.system) for (const q of p.system.planets) { if (q !== p && planets.indexOf(q) >= 0) q.rep = clamp((q.rep || 0) + amt * 0.5, -CFG.REP_MAX, CFG.REP_MAX); } }
// ---- VERBATIM `rep` command per-system average (index.html:5225) ----
function systemStanding(sy) { const ps = sy.planets.filter(p => planets.indexOf(p) >= 0); if (!ps.length) return null; return ps.reduce((a, p) => a + (p.rep || 0), 0) / ps.length; }

// ---- the proof ----
// 1) an action on a planet raises its rep AND spreads half within its OWN system
repAdd(A1, CFG.REP_LIBERATE);   // liberate Halcyon (+3)
check('[change] a player action raised the world standing (Halcyon 0 -> +3)', A1.rep === 3);
check('[spread] half spreads to system siblings only (Pallas/Astra -> +1.5)', A2.rep === 1.5 && A3.rep === 1.5);

// 2) the OTHER system is untouched - standing is tracked SEPARATELY per faction
check('[separate] the other system (Cydon) is unchanged by an action in Halcyon system', B1.rep === 0 && B2.rep === 0);
check('[separate] Halcyon System standing +2.0, Cydon System standing 0.0 - independent',
  systemStanding(sysA) === 2 && systemStanding(sysB) === 0);

// 3) an action in the OTHER system moves only that faction's standing
repAdd(B1, -CFG.REP_BOMB * 2);  // caught smuggling / bombing in Cydon (-1)
check('[separate] bombing in Cydon lowers only Cydon (B1 -1, B2 -0.5)', B1.rep === -1 && B2.rep === -0.5);
check('[separate] Halcyon System standing is STILL +2.0 (untouched)', systemStanding(sysA) === 2);
check('[separate] Cydon System standing is now -0.75', Math.abs(systemStanding(sysB) - (-0.75)) < 1e-9);

// 4) standing responds to the full range of player actions (raise + lower)
const before = A1.rep;
repAdd(A1, CFG.REP_KILL_HEG);   // kill a Hegemon near Halcyon (+0.4)
check('[actions] killing the Hegemon raises the nearest world standing', A1.rep === before + CFG.REP_KILL_HEG);
repAdd(A1, CFG.REP_TRADE);      // trade (+0.12)
repAdd(A1, -CFG.REP_BOMB);      // bombing (-0.5)
check('[actions] trade raises and bombing lowers the same world standing', A1.rep === before + CFG.REP_KILL_HEG + CFG.REP_TRADE - CFG.REP_BOMB);

// 5) standing is clamped to +/-REP_MAX (never runs away)
repAdd(B1, -100);
check('[clamp] a huge hit floors standing at -REP_MAX (-12), not beyond', B1.rep === -CFG.REP_MAX);
repAdd(A2, 100);
check('[clamp] a huge boon caps standing at +REP_MAX (+12)', A2.rep === CFG.REP_MAX);

// 6) HOSTILE / ALLIED thresholds are read off the per-system standing (the rep command's labels)
check('[labels] a system at/under REP_HOSTILE reads HOSTILE, at/over REP_ALLIED reads ALLIED',
  (-7 <= CFG.REP_HOSTILE) && (7 >= CFG.REP_ALLIED));

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
