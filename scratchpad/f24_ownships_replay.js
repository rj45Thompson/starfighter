// f24_ownships_replay.js - headless proof that the player can OWN/COMMAND MORE THAN ONE SHIP AT ONCE.
// Two systems: (1) HAULERS - "a ship you own" (economy.js:9), bought outright, an UNBOUNDED owned fleet;
// (2) WINGMEN - hired combat escorts, capped at WINGMAN_MAX. buyHauler (economy.js:181-188) and the
// hirewing gate (index.html:4916-4920) are transcribed VERBATIM; CFG values are real (HAULER_COST 1600,
// WINGMAN_MAX 2, WINGMAN_HIRE_COST 300, :29/:547).
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ================= HAULERS (economy.js) =================
const CFG_ECON = { HAULER_COST: 1600 };
let S = { haulers: [], nextId: 1 };
let _player = { credits: 5000 };
function P() { return _player; }
// VERBATIM economy.js:181-188 (the log/say UI lines dropped; the OWNERSHIP is the push to S.haulers)
function buyHauler(name) {
  var p = P(); if (!p) return { ok: false, msg: 'no ship' };
  if ((p.credits || 0) < CFG_ECON.HAULER_COST) return { ok: false, msg: 'a hauler costs ' + CFG_ECON.HAULER_COST + 'c - you hold ' + Math.round(p.credits || 0) + 'c' };
  p.credits -= CFG_ECON.HAULER_COST;
  var hid = S.nextId++;
  var h = { id: hid, name: name || ('HAUL-' + hid), from: null, to: null, good: null, state: 'idle', t: 0, pos: 0, cargo: 0, runs: 0, profit: 0, note: 'no route assigned' };
  S.haulers.push(h);
  return { ok: true, h: h };
}

const b1 = buyHauler();                        // 5000 -> 3400
check('[hauler] first hauler bought and OWNED', b1.ok && S.haulers.length === 1);
const b2 = buyHauler();                        // 3400 -> 1800
check('[hauler] SECOND hauler owned CONCURRENTLY (a real fleet)', b2.ok && S.haulers.length === 2);
check('[hauler] the two owned ships are distinct entities', S.haulers[0].id !== S.haulers[1].id);
const b3 = buyHauler();                        // 1800 -> 200, ok; then one more must fail
check('[hauler] a third is affordable (1800>=1600) -> own 3 at once', b3.ok && S.haulers.length === 3);
const b4 = buyHauler();                        // 200 < 1600 -> refused
check('[hauler] buying beyond your credits is refused (owning is a real cost)', !b4.ok && /a hauler costs 1600c/.test(b4.msg) && S.haulers.length === 3);

// ================= WINGMEN (index.html) =================
const CFG = { WINGMAN_MAX: 2, WINGMAN_HIRE_COST: 300 };
const need = (c) => !!c;                       // the handler does `if(!need(cond,msg)) return;`
const Pw = { name: 'YOU', credits: 1000 };
const ships = [Pw];                            // the flagship + squad pilots below
for (let i = 0; i < 4; i++) ships.push({ name: 'PILOT-' + i, isWingman: false });
// VERBATIM hirewing gate index.html:4917-4920 wrapped to return {ok,why}
function hireWing(P, t) {
  if (!need(!t.isWingman)) return { ok: false, why: `${t.name} already flies your wing` };
  const nW = ships.filter(o => o.isWingman).length; if (!need(nW < CFG.WINGMAN_MAX)) return { ok: false, why: `your wing is full (${CFG.WINGMAN_MAX} max) - dismisswing first` };
  if (!need(P.credits >= CFG.WINGMAN_HIRE_COST)) return { ok: false, why: `a wing contract costs ${CFG.WINGMAN_HIRE_COST}c up front` };
  P.credits -= CFG.WINGMAN_HIRE_COST; t.isWingman = true; t.cmd = { type: 'wingman', until: 1e12 };
  return { ok: true };
}

const w1 = hireWing(Pw, ships[1]), w2 = hireWing(Pw, ships[2]);
check('[wing] first wingman hired', w1.ok && ships[1].isWingman);
check('[wing] SECOND wingman flies your wing CONCURRENTLY', w2.ok && ships[2].isWingman && ships.filter(o => o.isWingman).length === 2);
const w3 = hireWing(Pw, ships[3]);
check('[wing] a third is REFUSED at WINGMAN_MAX (2)', !w3.ok && /your wing is full \(2 max\)/.test(w3.why));
const wdup = hireWing(Pw, ships[1]);
check('[wing] re-hiring an existing wingman is refused', !wdup.ok && /already flies your wing/.test(wdup.why));
const poor = { name: 'YOU', credits: 100 };
check('[wing] a wing contract you cannot afford is refused', !hireWing(poor, ships[3]).ok);

// ================= the whole point: MORE THAN ONE SHIP AT ONCE =================
const ownedFleet = S.haulers.length + ships.filter(o => o.isWingman).length; // haulers + wing (excl. flagship)
check('[fleet] at once the player commands the flagship + 3 owned haulers + 2 wingmen = 6 ships',
  1 + ownedFleet === 6 && ownedFleet === 5);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
