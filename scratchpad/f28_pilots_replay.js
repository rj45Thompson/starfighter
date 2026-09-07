// f28_pilots_replay.js - headless proof that the player can HIRE NAMED PILOTS WITH INDIVIDUAL
// IDENTITIES: the BAR lists the named squad pilots present, each with a history/backstory line; you
// hire a SPECIFIC one by name and the hired wingman KEEPS its identity (name, backstory, temperament,
// skills). barPatrons (planetmenu.js:432-441) and barLineFor's fallback (:442-449) and the hirewing
// lookup+hire (index.html:4915-4920) are transcribed VERBATIM. CFG values are real (DEFEND_R 115,
// BAR_RADIUS_MULT 2, BAR_MAX_PATRONS 8, BAR_LINE_MAX 140, WINGMAN_MAX 2, WINGMAN_HIRE_COST 300).
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// minimal Vector3 (barPatrons uses pos.distanceTo)
function Vec3(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
Vec3.prototype.distanceTo = function (v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); };

const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const esc = s => String(s);
const COL = { DIM: '#8fa2b8' };
const gameT = () => 0;
function hash32pm(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const CFG = { BAR_RADIUS_MULT: 2, BAR_MAX_PATRONS: 8, BAR_LINE_MAX: 140, WINGMAN_MAX: 2, WINGMAN_HIRE_COST: 300 };

// --- the roster: named pilots, each a distinct individual (name/backstory/aggr/skills) ---
const p = { name: 'Halcyon', pos: new Vec3(0, 0, 0) };
const player = { name: 'YOU', role: 'player', team: 'squad', alive: true, pos: new Vec3(0, 0, 0) };
const altair = { name: 'Altair', role: 'raider', team: 'squad', alive: true, pos: new Vec3(50, 0, 0), isWingman: false,
  backstory: 'a salvage-runner who took the Warden oath after pulling survivors from a wreck', aggr: 0.3, skills: { gunnery: 2, tech: 1 } };
const vega = { name: 'Vega', role: 'trader', team: 'squad', alive: true, pos: new Vec3(80, 0, 0), isWingman: false,
  backstory: 'grew up on a relay the Synod starved out; now she jams their fleets for a living', aggr: 0.7, skills: { trade: 3, charisma: 2 } };
const rax = { name: 'Rax', role: 'raider', team: 'pirate', alive: true, pos: new Vec3(40, 0, 0) };        // pirate - not at your bar
const warden = { name: 'Warden-9', role: 'defender', team: 'squad', alive: true, home: p, pos: new Vec3(30, 0, 0) };  // defender - present but not hireable
const H = () => ({ CFG: { DEFEND_R: 115 }, ships });
const ships = [player, altair, vega, rax, warden];

// --- VERBATIM planetmenu.js:432-449 ---
function barPatrons(pp) {
  var h = H(); if (!h || !pp || !pp.pos) return [];
  var R = num(h.CFG && h.CFG.DEFEND_R, 120) * CFG.BAR_RADIUS_MULT;
  var out = [], sh = (h.ships || []);
  for (var i = 0; i < sh.length; i++) { var o = sh[i];
    if (!o || !o.alive || o.role === 'player' || o.team === 'pirate') continue;
    var near = (o.role === 'defender' && o.home === pp) || (o.pos && typeof o.pos.distanceTo === 'function' && o.pos.distanceTo(pp.pos) < R);
    if (near) out.push(o);
    if (out.length >= CFG.BAR_MAX_PATRONS) break; }
  return out; }
function barLineFor(name, fallback) {
  var w = (typeof window !== 'undefined') ? window : null;
  var segs = (w && typeof w.novelSegOf === 'function') ? w.novelSegOf(name) : null;
  if (segs && segs.length) { var t = Math.floor(num(gameT(), 0) / 60); var rec = segs[(hash32pm(name) + t) % segs.length];
    if (rec && rec.text) return '“' + esc(String(rec.text).slice(0, CFG.BAR_LINE_MAX)) + '”'; }
  return fallback ? esc(String(fallback).slice(0, CFG.BAR_LINE_MAX)) : '<span style="color:' + COL.DIM + '">nurses a drink in silence.</span>'; }

// --- VERBATIM hirewing lookup + hire, index.html:4915-4920 ---
const need = (c) => !!c;
function hirewing(P, nm) {
  const t = ships.find(o => o !== P && o.alive && o.team === 'squad' && o.role !== 'player' && o.role !== 'defender' && o.name.toLowerCase().startsWith(nm));
  if (!need(t)) return { ok: false, why: 'no such squad pilot here - defenders and synod raiders don\'t fly wings' };
  if (!need(!t.isWingman)) return { ok: false, why: `${t.name} already flies your wing` };
  const nW = ships.filter(o => o.isWingman).length; if (!need(nW < CFG.WINGMAN_MAX)) return { ok: false, why: 'wing full' };
  if (!need(P.credits >= CFG.WINGMAN_HIRE_COST)) return { ok: false, why: 'cannot afford' };
  P.credits -= CFG.WINGMAN_HIRE_COST; t.isWingman = true; t.cmd = { type: 'wingman' };
  return { ok: true, pilot: t };
}

// --- the proof ---
// 1) the BAR lists the NAMED pilots present (not the player, not pirates)
const patrons = barPatrons(p);
check('[bar] lists the named squad pilots present (Altair + Vega + the defender)', patrons.includes(altair) && patrons.includes(vega));
check('[bar] excludes the player and the pirate (Rax not at your bar)', !patrons.includes(player) && !patrons.includes(rax));

// 2) each pilot shows a HISTORY line (falls back to their own backstory)
const line = barLineFor('Altair', altair.backstory);
check('[history] a listed pilot shows their backstory/history', /salvage-runner who took the Warden oath/.test(line));
check('[history] a different pilot shows a DIFFERENT history', barLineFor('Vega', vega.backstory) !== line);

// 3) individual IDENTITIES: two pilots differ in name, backstory, temperament AND skills
check('[identity] Altair and Vega are distinct individuals', altair.name !== vega.name && altair.backstory !== vega.backstory && altair.aggr !== vega.aggr && JSON.stringify(altair.skills) !== JSON.stringify(vega.skills));

// 4) you hire a SPECIFIC named pilot by name
const P = { name: 'YOU', credits: 1000 };
const r = hirewing(P, 'alt');
check('[hire] "hirewing alt" signs the specific pilot Altair', r.ok && r.pilot === altair && altair.isWingman === true);
check('[hire] the hire cost 300c (WINGMAN_HIRE_COST)', P.credits === 700);

// 5) hiring PRESERVES the pilot's identity (same individual, not a generic unit)
check('[keeps-identity] the hired wingman keeps its name/backstory/temperament/skills',
  altair.name === 'Altair' && /salvage-runner/.test(altair.backstory) && altair.aggr === 0.3 && altair.skills.gunnery === 2);

// 6) you cannot hire a name that isn't a hireable pilot here (pirate / defender excluded)
check('[scope] a pirate is not hireable at your bar', !hirewing(P, 'rax').ok);
check('[scope] a defender is not hireable as a wingman', !hirewing(P, 'warden').ok);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
