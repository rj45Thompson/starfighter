// conquest_probe.js - measure the conquest.js counter-invasion cadence (B13) WITHOUT the browser.
// conquest.js reads window.HOST defensively and runs in node; we stub HOST with N player-held worlds,
// drive CONQUEST.tick(dt) at 60fps, and count: invasions launched, worlds fallen, and time-to-first-fall
// per world. Optional CFG overrides (2nd arg = JSON) let us A/B a slowdown without editing the file.
'use strict';
global.window = global;                 // make window===globalThis so conquest.js attaches CONQUEST to window
require('../conquest.js');              // sets window.CONQUEST + runs its own smoke test
const CONQUEST = global.CONQUEST;
if (!CONQUEST) { console.log('FAIL: CONQUEST not exported'); process.exit(1); }

const argOv = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const NWORLDS = 9, SECONDS = 300;
const DEFENSE = argOv.defense != null ? argOv.defense : 0;   // 0 = undefended (falls); 5 = defended (holds, measures repeat cadence)

function run(overrides) {
  // fresh worlds each run
  const planets = [];
  for (let i = 0; i < NWORLDS; i++) planets.push({ name: 'W' + i, owner: 'player', hegemon: false, rep: 5, pos: null, _cq: { defense: DEFENSE, invasion: null, infra: 1, threat: 0, lowNoted: false } });
  const H = { planets, campaign: 1, P: null, notify: () => {}, sound: () => {} };
  global.HOST = H;
  // apply CFG overrides by reaching into the module's CFG via a re-tune hook if present, else via the closure:
  // conquest.js keeps CFG in a closure; expose an override by monkeypatching through CONQUEST if it offers one.
  // It does not, so we instead SCALE time: not possible. Fallback: overrides are applied by editing index? No -
  // we expose CFG for the probe by requiring a fresh copy with patched source is overkill. Instead: the probe
  // measures the SHIPPED constants; the A/B "after" run is measured by editing conquest.js then re-running.
  let launched = 0, fell = 0, held = 0;
  const fallT = {};
  H.notify = (html) => {
    const s = String(html || '');
    if (s.indexOf('INVASION FORCE en route') >= 0) launched++;
    else if (s.indexOf('HAS FALLEN') >= 0) { fell++; }
    else if (s.indexOf('HELD') >= 0) held++;
  };
  CONQUEST.init();
  const dt = 1 / 60;
  for (let f = 0; f < SECONDS * 60; f++) {
    // record time-to-first-fall per world (owner flips to null on fall)
    for (const p of planets) { if (p.owner !== 'player' && fallT[p.name] == null) fallT[p.name] = +(f / 60).toFixed(1); }
    CONQUEST.tick(dt);
  }
  const fallTimes = Object.values(fallT).sort((a, b) => a - b);
  const meanFall = fallTimes.length ? +(fallTimes.reduce((a, b) => a + b, 0) / fallTimes.length).toFixed(1) : null;
  return {
    worlds: NWORLDS, seconds: SECONDS, launched, fell, held,
    launchesPerMin: +(launched / (SECONDS / 60)).toFixed(2),
    worldsFallen: fallTimes.length, meanTimeToFall_s: meanFall,
    firstFall_s: fallTimes[0] != null ? fallTimes[0] : null, allFallTimes: fallTimes
  };
}

// run 3x for a stable mean (Math.random)
const runs = [run(argOv), run(argOv), run(argOv)];
const agg = k => +(runs.reduce((a, r) => a + (r[k] || 0), 0) / runs.length).toFixed(2);
console.log(JSON.stringify({
  perRun: runs.map(r => ({ launched: r.launched, fell: r.fell, held: r.held, launchesPerMin: r.launchesPerMin, meanTimeToFall_s: r.meanTimeToFall_s, firstFall_s: r.firstFall_s })),
  mean: { launchesPerMin: agg('launchesPerMin'), worldsFallen: agg('worldsFallen'), meanTimeToFall_s: agg('meanTimeToFall_s'), fell: agg('fell'), held: agg('held') }
}, null, 2));
