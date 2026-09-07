// f14_slots_replay.js - headless proof that Star Fighter fits modular equipment into a LIMITED,
// hull+series-dependent number of slots, and the cap is ENFORCED (mount refuses when full). The
// mountGizmo/mountHardpoint/gizmoSlotsFor/hardpointCountFor bodies below are transcribed VERBATIM
// from index.html (:3451-3455, :3679-3683, :3676-3677, :3876) with the real HULL_MOUNTS counts
// (:3853-3874) and the real Fast-series slot deltas (:HULL_SERIES fast gizmoDelta -1/hardpointDelta -1).
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

// ---- real data (verbatim counts from index.html HULL_MOUNTS, only .length matters here) ----
const HULL_MOUNTS = {
  scout:       { weaponPoints: n(1), gizmoPoints: n(2) },
  fighter:     { weaponPoints: n(1), gizmoPoints: n(2) },
  interceptor: { weaponPoints: n(2), gizmoPoints: n(3) },
  freighter:   { weaponPoints: n(0), gizmoPoints: n(1) },
  cruiser:     { weaponPoints: n(3), gizmoPoints: n(4) },
  dreadnought: { weaponPoints: n(4), gizmoPoints: n(5) },
  capital:     { weaponPoints: n(5), gizmoPoints: n(6) },
};
function n(k){ return new Array(k).fill({}); }   // k mount points; only the count is read by *For()
const HULL_SERIES = {
  standard: { gizmoDelta: 0,  hardpointDelta: 0 },
  fast:     { gizmoDelta: -1, hardpointDelta: -1 },   // "sacrifices one weapon hardpoint and one gizmo slot"
};
const GIZMOS  = { targeting:{n:'Targeting Computer',cost:200}, ecm:{n:'ECM Jammer',cost:200}, shieldboost:{n:'Shield Booster',cost:200} };
const WEAPONS = { energy:{n:'Energy',cost:60}, ballistic:{n:'Ballistic',cost:120}, missile:{n:'Missile',cost:200}, flame:{n:'Flame',cost:0} };

// ---- VERBATIM from index.html ----
function seriesOf(s){ return HULL_SERIES[s.series || 'standard']; }
function hullMounts(s){ return HULL_MOUNTS[s.hullClass] || HULL_MOUNTS.fighter; }
function gizmoSlotsFor(s){ return Math.max(0, hullMounts(s).gizmoPoints.length + seriesOf(s).gizmoDelta); }
function hardpointCountFor(s){ return Math.max(0, hullMounts(s).weaponPoints.length + seriesOf(s).hardpointDelta); }
function hasGizmo(s,key){ return !!(s.gizmoSlots && s.gizmoSlots.includes(key)); }
function mountGizmo(s,key){ if(!GIZMOS[key]) return {ok:false,why:'no such gizmo'};
  if(!s.gizmoSlots) s.gizmoSlots=new Array(gizmoSlotsFor(s)).fill(null);
  if(hasGizmo(s,key)) return {ok:false,why:'already mounted'};
  const free=s.gizmoSlots.indexOf(null); if(free<0) return {ok:false,why:'no free gizmo slot - unmount one first'};
  s.gizmoSlots[free]=key; return {ok:true,slot:free}; }
function unmountGizmo(s,idx){ if(!s.gizmoSlots||idx<0||idx>=s.gizmoSlots.length||!s.gizmoSlots[idx]) return {ok:false,why:'that slot is empty'};
  const key=s.gizmoSlots[idx]; s.gizmoSlots[idx]=null; return {ok:true,key}; }
function mountHardpoint(s,key){ if(!WEAPONS[key]||key==='flame') return {ok:false,why:'no such weapon'};
  if(!s.weaponSlots) s.weaponSlots=new Array(hardpointCountFor(s)).fill(null);
  const free=s.weaponSlots.indexOf(null); if(free<0) return {ok:false,why:'no free hardpoint - unmount one first'};
  s.weaponSlots[free]=key; return {ok:true,slot:free}; }

// ---- the proof ----
// 1. slot COUNTS are hull-dependent (0..5 hardpoints, 1..6 gizmos), not one-per-category
check('[count] freighter has 0 weapon hardpoints, capital has 5',
  hardpointCountFor({hullClass:'freighter'})===0 && hardpointCountFor({hullClass:'capital'})===5);
check('[count] freighter has 1 gizmo slot, capital has 6',
  gizmoSlotsFor({hullClass:'freighter'})===1 && gizmoSlotsFor({hullClass:'capital'})===6);

// 2. the GIZMO cap is ENFORCED (a fighter has 2 gizmo slots; a 3rd mount is refused)
const g = {hullClass:'fighter'};
check('[gizmo] mount #1 ok (slot 0)', mountGizmo(g,'targeting').slot===0);
check('[gizmo] mount #2 ok (slot 1)', mountGizmo(g,'ecm').slot===1);
const g3 = mountGizmo(g,'shieldboost');
check('[gizmo] mount #3 REFUSED - bay full', g3.ok===false && /no free gizmo slot/.test(g3.why));
const gdup = mountGizmo(g,'targeting');
check('[gizmo] duplicate REFUSED - already mounted', gdup.ok===false && /already mounted/.test(gdup.why));
check('[gizmo] unmount slot 1 frees it', unmountGizmo(g,1).ok===true);
check('[gizmo] now the 3rd fits into the freed slot', mountGizmo(g,'shieldboost').slot===1);

// 3. the WEAPON HARDPOINT cap is ENFORCED (a fighter has 1 hardpoint; a 2nd is refused)
const w = {hullClass:'fighter'};
check('[hardpoint] mount #1 ok', mountHardpoint(w,'ballistic').slot===0);
const w2 = mountHardpoint(w,'missile');
check('[hardpoint] mount #2 REFUSED - only 1 hardpoint', w2.ok===false && /no free hardpoint/.test(w2.why));
// freighter: zero hardpoints -> the very first mount is refused
const wf = mountHardpoint({hullClass:'freighter'},'energy');
check('[hardpoint] freighter (0 hardpoints) refuses the first mount', wf.ok===false && /no free hardpoint/.test(wf.why));
// flame is Hegemon-only, never player-mountable
check('[hardpoint] flame is refused (Hegemon-only)', mountHardpoint({hullClass:'capital'},'flame').ok===false);

// 4. the SERIES tradeoff is real and measurable: Fast sacrifices a hardpoint AND a gizmo slot
check('[tradeoff] fast fighter: 1->0 hardpoints', hardpointCountFor({hullClass:'fighter',series:'fast'})===0);
check('[tradeoff] fast fighter: 2->1 gizmo slots', gizmoSlotsFor({hullClass:'fighter',series:'fast'})===1);
check('[tradeoff] fast cruiser: 3->2 hardpoints, 4->3 gizmos',
  hardpointCountFor({hullClass:'cruiser',series:'fast'})===2 && gizmoSlotsFor({hullClass:'cruiser',series:'fast'})===3);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
