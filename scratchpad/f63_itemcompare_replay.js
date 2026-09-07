// f63_itemcompare_replay.js - settles genre cell F63 "the player can compare an item on sale against the
// one already equipped" (anchor: genre_matrix seed "20 comparison rows in SHOP: dps, damage, rate, reach,
// barrels, homing, splash, damage type"). Verdict: YES. A 2nd independent read that CONFIRMS the seed and
// finds it is RICHER than a static table: the docked shop states a SIGNED DELTA against the fitted item.
//   planetmenu.js: wStats(w) reads a weapon's dmg/cd/rate(1/cd)/dps(dmg/cd)/reach(speed*life)/twin/homing/
//   splash/type from the SAME WEAPONS registry the game flies on; weaponCompareHtml(key) compares the on-sale
//   weapon a=wStats(W[key]) against the FITTED weapon b=wStats(W[P.weaponType]) across dps/dmg/rate/reach/
//   barrels/homing/splash/damage-type; deltaChip(label,mine,theirs,..,higherIsBetter) prints the value + the
//   signed delta (+X, +Y%) coloured up/dn/eq, and "n/a" when the registry lacks the field; hullCompareHtml does
//   the same for hulls; shopRow tags the currently-fitted item FITTED (no compare) and shows compareForCmd on a
//   BUY row. wStats + deltaChip are pure, so this SLICES them from planetmenu.js and drives them on the real
//   WEAPONS numbers; the DOM builders (need the browser host) are asserted structurally.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PM = fs.readFileSync(path.join(ROOT, 'planetmenu.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pmLines = PM.split(/\r?\n/);

// slice wStats (736-740) + deltaChip (741-750); stub the module's num()/esc() helpers
const src = pmLines.slice(735, 750).join('\n');
if (!/function wStats\(w\)/.test(src) || !/function deltaChip\(/.test(src)) { console.error('FAIL: planetmenu slice moved'); process.exit(2); }
const num = (v, d) => { v = parseFloat(v); return isFinite(v) ? v : d; };
const esc = (s) => String(s);
const M = new Function('num', 'esc', src + '\n;return { wStats, deltaChip };')(num, esc);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };
const approx = (a, b) => Math.abs(a - b) < 0.01;

console.log('F63 item-compare replay - real wStats/deltaChip sliced from planetmenu.js\n');

// real WEAPONS numbers (index.html:3738-3740)
const PULSE = { dmg: 18, cd: 0.27, speed: 118, life: 1.10, twin: false, homing: 0, splash: 0, dmgType: 'energy' };
const AUTO = { dmg: 31, cd: 0.50, speed: 150, life: 1.35, twin: true, homing: 0, splash: 0, dmgType: 'frag' };
const MISSILE = { dmg: 48, cd: 0.90, speed: 80, life: 2.30, twin: false, homing: 2.4, splash: 11, dmgType: 'missile' };

// (1) wStats derives the flown numbers correctly
const wp = M.wStats(PULSE), wa = M.wStats(AUTO), wm = M.wStats(MISSILE);
console.log(`  Pulse: dps=${wp.dps.toFixed(2)} rate=${wp.rate.toFixed(2)} reach=${wp.reach.toFixed(1)}  | Autocannon: dps=${wa.dps.toFixed(2)} reach=${wa.reach.toFixed(1)} twin=${wa.twin}`);
ok('dps = dmg / cd (Pulse 18/0.27=66.67, Autocannon 31/0.50=62)', approx(wp.dps, 66.6667) && approx(wa.dps, 62));
ok('rate = 1 / cd (Pulse ~3.70/s)', approx(wp.rate, 1 / 0.27));
ok('reach = speed x life (Pulse 118*1.10=129.8, Autocannon 150*1.35=202.5)', approx(wp.reach, 129.8) && approx(wa.reach, 202.5));
ok('carries barrels(twin)/homing/splash/type for the comparison', wa.twin === true && approx(wm.homing, 2.4) && wm.splash === 11 && wm.type === 'missile');
ok('a field the registry lacks becomes NaN (so deltaChip can print n/a, not a guess)', Number.isNaN(M.wStats({}).dps));

// (2) deltaChip states a SIGNED DELTA vs the fitted item, coloured better/worse/eq
const chDps = M.deltaChip('dps', wa.dps, wp.dps, '', 1);              // 62 vs fitted 66.67 -> worse
const chReach = M.deltaChip('reach', wa.reach, wp.reach, '', 0);      // 202.5 vs 129.8 -> better
const chEq = M.deltaChip('dmg', 30, 30, '', 0);                      // equal
const chNa = M.deltaChip('dps', NaN, 66.67, '', 1);                  // missing -> n/a
console.log(`  chip(dps 62 vs 66.67): class=${(chDps.match(/pm-cmp (\w+)/) || [])[1]}   chip(reach 202.5 vs 129.8): class=${(chReach.match(/pm-cmp (\w+)/) || [])[1]}`);
ok('a WORSE stat (lower dps) is marked "dn" with a negative delta', /pm-cmp dn/.test(chDps) && /-4\.7/.test(chDps));
ok('a BETTER stat (longer reach) is marked "up" with a positive delta', /pm-cmp up/.test(chReach) && /\+73|\+72/.test(chReach));
ok('an EQUAL stat is marked "eq" (no delta shown)', /pm-cmp eq/.test(chEq));
ok('a missing number prints "n/a" (no fabricated comparison)', /pm-cmp none/.test(chNa) && /n\/a/.test(chNa));

// (3) structural: the DOM builders compare on-sale vs FITTED across the seed's stat set
ok('weaponCompareHtml compares the on-sale weapon against the FITTED weapon (P.weaponType)', /function weaponCompareHtml\(key\)/.test(PM) && /b=wStats\(W\[P\.weaponType\|\|'energy'\]\)/.test(PM));
ok('the weapon comparison shows all seed rows (dps/dmg/rate/reach/barrels/homing/splash/type)', /deltaChip\('dps'/.test(PM) && /deltaChip\('dmg'/.test(PM) && /deltaChip\('rate'/.test(PM) && /deltaChip\('reach'/.test(PM) && /barrels|barrel/.test(PM) && /homing/.test(PM) && /splash/.test(PM) && /not '\+esc\(b\.type\)/.test(PM));
ok('hullCompareHtml compares an on-sale hull against the FITTED hull (P.hullClass)', /function hullCompareHtml\(key\)/.test(PM) && /b=HU\[P\.hullClass\|\|'fighter'\]/.test(PM));
ok('shopRow tags the currently-fitted item FITTED and shows the compare only on BUY rows', /tag==='fitted' \? '' : compareForCmd\(cmd\)/.test(PM) && /currently fitted/.test(PM));
ok('compareForCmd routes weapon/hull shop commands to the right comparison', /function compareForCmd\(cmd\)/.test(PM) && /weapon\|hull/.test(PM));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F63 yes: the docked shop compares an on-sale weapon/hull against the FITTED one as a signed, coloured delta (dps=dmg/cd, reach=speed*life, ... verified on the real WEAPONS numbers), n/a for missing fields, the fitted item tagged FITTED - confirms + exceeds the seed to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
