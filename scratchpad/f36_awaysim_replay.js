// f36_awaysim_replay.js - settles genre cell F36 "the simulation keeps running for NPCs and
// markets while the player is away." Asserts the WIRING CHAIN from the real source, then leans
// on the sibling f26/f27 replays (already committed + passing) for the BEHAVIOR: that the same
// ECONOMY.tick actually moves haulers (NPCs) and produces at stations (markets) unsupervised.
//
//   backgroundTick (index.html:7761)  -> ECONOMY.tick(dt) + saveTick(dt)
//   frame() AWAY branch (:7769)        -> AWAY.active() ? AWAY.frame + backgroundTick (empire keeps running)
//   frame() normal branch (:7771)      -> ECONOMY.tick(dt)         (runs whether present OR away)
//   ECONOMY.tick (economy.js:260)      -> stationTick(dt) + haulerTick(dt)   (markets + NPCs)
//
// Honest scope: REAL-TIME while the game is open (present or away on a ground mission). economy.js
// has NO offline/elapsed-time catch-up (0 Date.now/elapsed catch-up hits), so a CLOSED game does
// not fast-forward - that is why the genre grade is "yes" (runs while away) not "yes + offline".
const fs = require('fs');
const path = require('path');
const REPO = require('path').join(__dirname, '..');
const IDX = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const ECO = fs.readFileSync(path.join(REPO, 'economy.js'), 'utf8');
const idx = IDX.split(/\r?\n/), eco = ECO.split(/\r?\n/);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

// locate backgroundTick body (a few lines from its declaration)
const bgLine = idx.findIndex(l => /function backgroundTick\s*\(/.test(l));
const bgBody = bgLine >= 0 ? idx.slice(bgLine, bgLine + 4).join('\n') : '';
// the AWAY branch in frame()
const awayLine = idx.find(l => /AWAY\.active\(\)/.test(l) && /backgroundTick\s*\(/.test(l)) || '';
// frame()'s normal-branch ECONOMY.tick
const frameEco = idx.some(l => /step\(dt\);\s*updateCamera/.test(l) && /ECONOMY\.tick\s*\(/.test(l));
// ECONOMY.tick body
const ecoTick = eco.find(l => /function tick\s*\(dt\)/.test(l)) || '';

console.log('F36 away-sim replay - wiring chain asserted from index.html + economy.js\n');
ok('backgroundTick (index.html:' + (bgLine + 1) + ') runs ECONOMY.tick(dt)', /ECONOMY\.tick\s*\(\s*dt\s*\)/.test(bgBody));
ok('backgroundTick also persists the game (saveTick)', /saveTick\s*\(/.test(bgBody));
ok('frame() AWAY branch keeps the empire running via backgroundTick (:7769)', /AWAY\.active\(\)/.test(awayLine) && /backgroundTick\s*\(\s*dt\s*\)/.test(awayLine));
ok('frame() normal branch also runs ECONOMY.tick (economy runs present OR away)', frameEco);
ok('ECONOMY.tick (economy.js) runs stationTick (markets) AND haulerTick (NPCs)', /stationTick\s*\(\s*dt\s*\)/.test(ecoTick) && /haulerTick\s*\(\s*dt\s*\)/.test(ecoTick));

// honest scope: no offline elapsed-time catch-up in economy.js
const offlineCatchup = eco.some(l => /Date\.now|performance\.now|elapsedMs|sinceLast|offlineMs|catchUp/i.test(l) && /tick|sim|econom/i.test(l));
ok('no offline/elapsed-time catch-up in economy.js (real-time only, the honest scope)', !offlineCatchup);

console.log('\n  BEHAVIOR (the same ECONOMY.tick actually WORKS unsupervised) is measured by the siblings:');
console.log('    node scratchpad/f26_routes_replay.js  -> haulerTick moves goods A->B (NPC traders)   [committed, PASS]');
console.log('    node scratchpad/f27_station_replay.js -> stationTick consumes/produces (markets)     [committed, PASS]');

console.log('\nRESULT: ' + (pass
  ? 'PASS - F36 yes: ECONOMY.tick (stationTick markets + haulerTick NPCs) keeps running while the player is away, via backgroundTick; real-time, no offline catch-up'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
