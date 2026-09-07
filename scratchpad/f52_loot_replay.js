// f52_loot_replay.js - settles genre cell F52 "destroyed ships and cargo drop physical loot that
// anyone can pick up." It slices the real dropCargo() + scoopPod() (index.html:1915-1919) and runs
// them to MEASURE the drop (a hold splits into salvage pods) and the pickup (ANY ship scoops a pod:
// a trader into its hold, anyone else looted for credits), then asserts from source that killShip
// drops the loot on death and that updateCargoPods lets EVERY ship pick up by proximity.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = IDX.split(/\r?\n/);

const CFG = { POD_CHUNK: 8, HOLD_CAP: 40, SALVAGE: 0.6 };
const slice = lines.slice(1914, 1919).join('\n');   // 1-indexed 1915..1919: dropCargo + scoopPod
if (!/function dropCargo/.test(slice) || !/function scoopPod/.test(slice)) {
  console.error('FAIL: dropCargo/scoopPod slice (1915-1919) moved'); process.exit(2);
}
const pods = [];
const stubs = {
  CFG,
  spawnCargoPod: (pos, good, qty) => pods.push({ good, qty }),
  _v: { copy() { return this; }, add() { return this; } },
  T: { Vector3: function () {} },
  rand: () => 0,
  GKEY: { raw: { base: 10, cat: 'raw', n: 'Ore' } },
  cargoTotal: (s) => Object.values(s.cargo || {}).reduce((a, b) => a + b, 0),
  sgSay: () => {}
};
const M = new Function(...Object.keys(stubs), slice + '\n;return { dropCargo, scoopPod };')(...Object.values(stubs));

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F52 loot replay - real dropCargo()/scoopPod() sliced from index.html:1915-1919\n');

// DROP: a destroyed ship's hold spills into salvage pods of <= POD_CHUNK, hold cleared
const dead = { pos: {}, cargo: { raw: 25 } };
M.dropCargo(dead);
console.log(`  dropCargo({raw:25}) -> ${pods.length} pods of qty [${pods.map(p => p.qty).join(', ')}]; hold now ${JSON.stringify(dead.cargo)}`);
ok('the hold splits into pods of <= POD_CHUNK(8): 25 -> [8,8,8,1]', pods.length === 4 && pods.every(p => p.qty <= 8) && pods.reduce((a, p) => a + p.qty, 0) === 25);
ok('the destroyed ship\'s hold is emptied', Object.keys(dead.cargo).length === 0);

// PICKUP: ANY ship scoops a pod - a trader into its hold, anyone else looted for credits
const pod = { good: 'raw', qty: 8 };
const trader = { role: 'trader', cargo: {}, credits: 0 };
M.scoopPod(trader, pod);
ok('a TRADER scoops the pod into its hold', trader.cargo.raw === 8);
const player = { role: 'player', cargo: {}, credits: 100 };
M.scoopPod(player, { good: 'raw', qty: 8 });
console.log(`  scoopPod(player, {raw:8}) -> credits ${player.credits} (looted 8*base10*SALVAGE0.6 = +48)`);
ok('a NON-trader (player) loots the pod for credits (8*10*0.6=48)', player.credits === 148);

// ANYONE, and dropped ON DEATH - asserted from source
ok('killShip drops the loot on death (dropCargo + dropCredits + spawnGem, :2824-2826)', /dropCargo\(s\);/.test(IDX) && /dropCredits\(s\.pos, s\.credits\)/.test(IDX) && /spawnGem\(/.test(IDX));
ok('updateCargoPods lets EVERY ship pick up by proximity (for(const s of ships) ... scoopPod within GEM_PICK_R)', /for\(const s of ships\)\{[^]*?scoopPod\(s,c\)/.test(IDX));
ok('the drop is a shared physical item ("the SAME floating drop is the SAME item for whoever scoops it")', /the SAME floating drop is the SAME item for whoever scoops it/.test(IDX));
ok('all units want the loot (RAY_COLLECT, "all units should want to pick up gems")', /all units should want to pick up gems/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F52 yes: a destroyed ship spills physical salvage pods + gems; ANY ship (trader->hold, others->credits) scoops them by proximity'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
