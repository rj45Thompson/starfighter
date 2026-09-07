// combat_probe.js - drive the REAL Star Fighter combat headlessly and MEASURE the four B10-B13
// observables. Launches a CLI headless Chrome (no puppeteer), loads index.html?harness=1, and for
// each job navigates a FRESH target (clean world), applies CFG/HEG_TIERS overrides, runs a scenario
// by driving frame() directly (rAF stubbed, exactly like SIM.run), and returns numbers.
//
// Scenarios:
//   playerVsGroup (natural): frozen player, N pirates spawned nearby, forced to hunt the player,
//       re-anchored if they stray - a real dogfight around a stationary target. Measures player TTD.
//   playerVsSolo  (natural): same, 1 pirate - the "solo pirate should NOT kill a competent player" leg.
//   ttkPointBlank (ring)   : player (invulnerable, so the fight is purely player-DPS-vs-pirate-HP)
//       fires continuously at ONE frozen point-blank pirate. Measures pirate time-to-kill. This mirrors
//       the task's own "3s of point-blank continuous fire" B12 methodology.
//   population             : run the natural sim for T seconds, sample the live pirate count vs cap.
//
// Usage:
//   node scratchpad/combat_probe.js                 -> run the built-in BASELINE jobs (no overrides)
//   node scratchpad/combat_probe.js path/to/jobs.json  -> run {jobs:[...]} from a file (for tuning)
// Self-cleaning (kills its chrome, rm temp profile), hard-timeout-bounded so it can never hang the loop.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;   // was 9334; moved to avoid the Chrome-debug-port collision with the concurrent combat worker
const GAME_URL = 'file:///D:/code/starfighter/index.html?harness=1';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-combat-'));
const HARD_TIMEOUT_MS = 560000;   // ceiling for the whole run; keep under the caller's 600s. Use noRender to stay well under.

let chrome = null;
function cleanup() {
  try { if (chrome && !chrome.killed) chrome.kill('SIGKILL'); } catch (e) {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
}
process.on('exit', cleanup);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
  };
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = e => rej(new Error('ws error')); });
  function send(method, params = {}, sessionId) {
    const id = nextId++;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  }
  return { ws, ready, send };
}

// ---- the in-page driver. Never called in node; injected via .toString(). References page globals. ----
function runCombat(opts) {
  var r = { scenario: opts.scenario, ok: false, errors: [], samples: [], notes: [] };
  try {
    if (typeof SF_LOCK !== 'undefined' && SF_LOCK.paused) { r.error = 'SIM_PAUSED'; return r; }
    if (typeof ships === 'undefined' || !ships[0] || typeof frame !== 'function') { r.error = 'game_not_ready'; return r; }
    var P = ships[0];
    // CONFOUND FIX (2026-09-07): killShip -> killFeed -> SBHUD.refresh() writes innerHTML on a HUD element that is NOT
    // built in this fresh-navigated headless target, so it THROWS, and because killFeed runs BEFORE `s.alive=false`
    // (index.html:2826 before :2827) the throw aborts killShip and the "dead" ship keeps taking hurt() forever
    // (that is the run1 hp=-6841/"survived" artifact). killFeed guards the call with `if(window.SBHUD)`, so nulling it
    // here skips the refresh cleanly and lets deaths register. No restore needed: main() runs each job in a FRESH
    // target that is closed right after, so the stub dies with the page - it never leaks across jobs.
    if (opts.stubHud) { try { r._hudStubbed = (typeof window.SBHUD !== 'undefined' && window.SBHUD != null); window.SBHUD = null; } catch (e) {} }
    // CFG overrides (live-read levers: SHIELD_REGEN_*, PIRATE_SPAWN_CD, PIRATE_MAX, LASER_CAP_*, ...)
    var ov = opts.cfg || {}; r.cfg = {};
    for (var k in ov) { r.cfg[k] = [CFG[k], ov[k]]; CFG[k] = ov[k]; }
    // HEG_TIERS overrides: opts.heg = { "0": {hp:170,dmg:22}, ... }
    if (opts.heg) { for (var ti in opts.heg) { var h = opts.heg[ti]; var HT = HEG_TIERS[+ti]; if (HT) { if (h.hp != null) { r.notes.push('HEG' + ti + '.hp ' + HT.hp + '->' + h.hp); HT.hp = h.hp; } if (h.dmg != null) { r.notes.push('HEG' + ti + '.dmg ' + HT.dmg + '->' + h.dmg); HT.dmg = h.dmg; } } } }

    var STEP = 1000 / 60, t = performance.now();
    var realRAF = window.requestAnimationFrame; window.requestAnimationFrame = function () { return 0; };
    // SPEED: skip the (software-swiftshader, ~6-8ms/frame) draw - these measurements read game STATE, not pixels.
    // renderAll is a global-scope binding (that is exactly why sim_harness.profile can wrap it), so reassigning
    // window.renderAll changes what frame()'s bare renderAll() call resolves to. Fresh page per job -> no restore.
    if (opts.noRender) { try { if (typeof renderAll === 'function') { r._noRender = true; window.renderAll = function () { return; }; } } catch (e) {} }
    var seconds = opts.seconds || 30, frames = Math.round(seconds * 60);
    var sampleEvery = opts.sampleEvery || 30;
    var _q = new T.Vector3(), _o = new T.Vector3();
    function nowT() { return (typeof T0 !== 'undefined' ? T0 : 0); }

    // ---------- POPULATION: just run the natural sim ----------
    if (opts.scenario === 'population') {
      var lr = opts.localR || 400, parena = null;
      if (opts.moveOut) { for (var mo = 0; mo < systems.length; mo++) { if (!systems[mo].peaceful) { P.pos.copy(systems[mo].center); parena = P.pos.clone(); break; } } }
      for (var f = 0; f < frames; f++) {
        if (parena) { P.pos.copy(parena); P.vel.set(0, 0, 0); P.docked = null; }   // hold the player in combat space so local density is meaningful
        t += STEP; try { frame(t); } catch (e) { if (r.errors.length < 8) r.errors.push('f' + f + ': ' + String(e && e.message || e)); }
        if (f % sampleEvery === 0) {
          r.samples.push({
            t: +(f / 60).toFixed(1),
            pirates: ships.filter(function (s) { return s.team === 'pirate' && s.alive; }).length,
            local: (P ? ships.filter(function (s) { return s.team === 'pirate' && s.alive && s.pos.distanceTo(P.pos) < lr; }).length : null),
            hp: (parena ? +P.hp.toFixed(0) : null),
            squad: ships.filter(function (s) { return s.team === 'squad' && s.alive; }).length,
            cap: (typeof enemyCap === 'function' ? enemyCap() : null),
            esc: (typeof escalation !== 'undefined' ? +escalation.toFixed(1) : null),
            ships: ships.length
          });
        }
      }
      window.requestAnimationFrame = realRAF;
      var lastThird = r.samples.slice(Math.floor(r.samples.length * 2 / 3));
      r.steadyPirates = +(lastThird.reduce(function (a, b) { return a + b.pirates; }, 0) / Math.max(1, lastThird.length)).toFixed(2);
      r.maxPirates = r.samples.reduce(function (a, b) { return Math.max(a, b.pirates); }, 0);
      r.finalCap = r.samples.length ? r.samples[r.samples.length - 1].cap : null;
      r.ok = true; return r;
    }

    // ---------- WAR SIM: run the natural sim and time the campaign cadence (warTick index.html:2144 flips systems
    // contested -> warScore, +-WIN_THRESHOLD ends a campaign: warWin coalition / warLose = HEGEMON victory). ----
    if (opts.scenario === 'warSim') {
      var lastCamp = (typeof campaign !== 'undefined') ? campaign : 1, prevWS = 0, events = [];
      for (var f = 0; f < frames; f++) {
        prevWS = (typeof warScore !== 'undefined') ? warScore : 0;
        t += STEP; try { frame(t); } catch (e) { if (r.errors.length < 8) r.errors.push('f' + f + ': ' + String(e && e.message || e)); }
        var camp = (typeof campaign !== 'undefined') ? campaign : 1;
        if (camp !== lastCamp) { events.push({ t: +(f / 60).toFixed(1), campaign: camp, type: prevWS > 0 ? 'coalition-WIN' : (prevWS < 0 ? 'HEGEMON-WIN' : '?'), ws: +prevWS.toFixed(2) }); lastCamp = camp; }
        if (f % sampleEvery === 0) {
          r.samples.push({ t: +(f / 60).toFixed(1), camp: camp, ws: +((typeof warScore !== 'undefined' ? warScore : 0)).toFixed(2), esc: +((typeof escalation !== 'undefined' ? escalation : 0)).toFixed(1), contested: systems.filter(function (s) { return s.contested; }).length, pir: ships.filter(function (s) { return s.team === 'pirate' && s.alive; }).length });
        }
      }
      window.requestAnimationFrame = realRAF;
      r.events = events; r.campaignEnds = events.length; r.firstEndT = events.length ? events[0].t : null;
      r.hegemonWins = events.filter(function (e) { return e.type === 'HEGEMON-WIN'; }).length;
      r.ok = true; return r;
    }

    // ---------- SPAWN TEST: spawn N pirates AT ONCE and count how many the near-player bias placed close to the player.
    // Isolates the spawn-location bias from "they fly away to hunt squad ships" confounds. ----
    if (opts.scenario === 'spawntest') {
      if (opts.moveOut) {   // put the test-player in NON-peaceful space (where fights happen) - the default start is the safe belt
        for (var mo = 0; mo < systems.length; mo++) { if (!systems[mo].peaceful) { P.pos.copy(systems[mo].center); break; } }
      }
      r.playerInPeaceful = (typeof inPeaceful === 'function') ? inPeaceful(P.pos) : 'no-fn';
      r.playerPos = [+P.pos.x.toFixed(0), +P.pos.y.toFixed(0), +P.pos.z.toFixed(0)];
      r.bias = (typeof CFG !== 'undefined') ? CFG.PIRATE_NEAR_PLAYER_BIAS : 'undef';
      var spawned = [];
      for (var si = 0; si < (opts.n || 40); si++) { var sp = addPirate(true); if (sp) spawned.push(sp); }
      var d400 = 0, d800 = 0, d1500 = 0;
      for (var sj = 0; sj < spawned.length; sj++) { var dd = spawned[sj].pos.distanceTo(P.pos); if (dd < 400) d400++; if (dd < 800) d800++; if (dd < 1500) d1500++; }
      window.requestAnimationFrame = realRAF;
      r.spawnedTotal = spawned.length; r.within400 = d400; r.within800 = d800; r.within1500 = d1500; r.ok = true; return r;
    }

    // ---------- DAMAGE STREAM: apply a KNOWN dps through the real hurt() path (shields absorb, regen-delay resets),
    // in an on/off duty cycle, and watch whether the player's regen erases it (immortal) or it accumulates (mortal).
    // Zero AI confounds - a clean, deterministic read on the SHIELD_REGEN_* / REGEN levers, which is the B10 crux. ----
    if (opts.scenario === 'damageStream') {
      if (opts.playerCredits != null) P.credits = opts.playerCredits;   // isolate the gems-as-hull buffer (credits = extra HP below 50%)
      var dps = opts.dps || 20, dOn = opts.dutyOn || 1e9, dOff = opts.dutyOff || 0, cyc = dOn + dOff;
      var atk = new T.Vector3(), fwd = new T.Vector3();
      var deathF = -1, mHp = P.maxHp, mSh = 1e9;
      for (var g = 0; g < frames; g++) {
        var ph = (g / 60) % cyc, on = ph < dOn;
        if (on && P.alive && !(P.iframe > 0) && !P.docked) {
          fwd.copy(FWD).applyQuaternion(P.quat); atk.copy(P.pos).addScaledVector(fwd, 10);   // shooter in front -> front arc
          if (typeof hurt === 'function') hurt(P, dps / 60, atk);
        }
        t += STEP; try { frame(t); } catch (e) { if (r.errors.length < 8) r.errors.push('g' + g + ': ' + String(e && e.message || e)); }
        if (P.hp < mHp) mHp = P.hp; if ((P.shield || 0) < mSh) mSh = P.shield || 0;
        if (g % (opts.sampleEvery || 60) === 0) r.samples.push({ t: +(g / 60).toFixed(1), hp: +P.hp.toFixed(1), sh: +((P.shield || 0)).toFixed(1) });
        if ((!P.alive || P.hp <= 0) && deathF < 0) { deathF = g; if (!opts.runFull) break; }
      }
      window.requestAnimationFrame = realRAF;
      r.playerTTD = deathF >= 0 ? +(deathF / 60).toFixed(2) : null; r.playerSurvived = deathF < 0;
      r.minHp = +mHp.toFixed(1); r.minShield = +mSh.toFixed(1); r.finalHp = +P.hp.toFixed(1); r.effectiveDps = +(dps * dOn / cyc).toFixed(1);
      r.ok = true; return r;
    }

    // ---------- COMBAT: spawn pirates ----------
    var N = opts.nPirates || 1, range = opts.range || 16, mode = opts.mode || 'natural';
    var pirates = [];
    for (var i = 0; i < N; i++) { var pr = (typeof addPirate === 'function') ? addPirate(true) : null; if (pr) pirates.push(pr); }
    if (!pirates.length) { r.error = 'no_pirates_spawned'; window.requestAnimationFrame = realRAF; return r; }
    r.pirateHp0 = pirates[0].hp; r.pirateHpMax = pirates[0].maxHp;
    var arena = pirates[0].pos.clone();   // a guaranteed non-peaceful spot
    P.pos.copy(arena); P.alive = true; P.docked = null; P.warping = false; P.iframe = 0; P.hp = P.maxHp;
    if (typeof shieldArcMaxFor === 'function') { P.shieldFwd = shieldArcMaxFor(P); P.shieldAft = shieldArcMaxFor(P); P.shield = P.shieldFwd + P.shieldAft; }
    P.vel.set(0, 0, 0);
    if (typeof MAN !== 'undefined') MAN.active = true;   // route ships[0] through manualControl (line 2668), not autopilot
    if (opts.drainPlayerCap && typeof capMaxFor === 'function') P.capLaser = 0;   // measure SUSTAINED TTK (no opening burst)
    var fires = !!opts.playerFires;
    var minDist = opts.minDist || 14;   // keep pirates outside ram range so we measure GUNFIRE, not collision-overlap
    var reanchor = opts.reanchor || 45;
    if (fires) { try { keysDown.add('KeyF'); } catch (e) {} }

    var deathFrame = -1, pirateDeathFrame = -1, minHp = P.maxHp, minShield = 1e9;
    function dead(sh) { return !sh.alive || sh.hp <= 0; }   // robust to a kill-path UI throw that aborts killShip before it flips .alive
    // ISOLATION: a fair player-vs-my-pirates measurement means NO 35-ship coalition squad joining in (they were
    // killing the pirates for me and inflating the TTK). Banish every other ship far out of sense range each frame,
    // and stop natural pirate spawns from cluttering the arena.
    var mineIds = {}; mineIds[P.id] = 1; for (var mi = 0; mi < pirates.length; mi++) mineIds[pirates[mi].id] = 1;
    if (opts.isolate) { CFG.PIRATE_SPAWN_CD = 1e9; }
    function banish() { for (var oi = 0; oi < ships.length; oi++) { var o = ships[oi]; if (mineIds[o.id]) continue; o.pos.set(5000, 5000, 5000); o.vel.set(0, 0, 0); o.target = null; o.huntTarget = null; o.lock = null; o.docked = true; } }

    for (var f2 = 0; f2 < frames; f2++) {
      if (opts.isolate) banish();
      P.pos.copy(arena); P.vel.set(0, 0, 0); P.docked = null; P.warping = false;
      if (opts.invulnPlayer) P.iframe = 1e9;   // ttk mode: the fight is pure player-DPS vs pirate-HP
      for (var pi = 0; pi < pirates.length; pi++) {
        var p = pirates[pi]; if (!p.alive) continue;
        p.docked = null; p.warping = false;
        p.mode = 'HUNT'; p.target = P; p.huntTarget = P; p.huntUntil = nowT() + 9999; p.lock = P;
        if (mode === 'ring') {
          // deterministic point-blank ring, faces the player, frozen; capacitor left natural unless feedCap
          var ang = (pi / pirates.length) * Math.PI * 2;
          _o.set(Math.cos(ang) * range, (pi % 2 ? 2 : -2), Math.sin(ang) * range);
          p.pos.copy(arena).add(_o); p.vel.set(0, 0, 0); p.iframe = 0;
          _q.copy(arena).sub(p.pos); if (_q.lengthSq() > 1e-6) { _q.normalize(); p.quat.setFromUnitVectors(FWD, _q); }
          if (opts.feedCap && typeof capMaxFor === 'function') p.capLaser = capMaxFor(p);
        } else {
          // natural: let think() fly + aim the pirate; clamp distance to [minDist,reanchor] so it stays in a real
          // point-blank fight without ramming the frozen player (overlap collisions dwarf gunfire and are an artifact)
          _o.copy(p.pos).sub(arena); var d = _o.length();
          if (d > reanchor || d < minDist || d < 1e-6) {
            if (d < 1e-6) { _o.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1); if (_o.lengthSq() < 1e-6) _o.set(1, 0, 0); }
            _o.setLength(d > reanchor ? range : minDist);
            p.pos.copy(arena).add(_o);
          }
        }
      }
      // duty-cycle: gate pirate fire on/off to test whether intermittent damage ACCUMULATES (the felt B10 bug:
      // shield regen + delay lets every lull fully reset, so damage never adds up). off-phase = capacitor forced to 0.
      if (opts.dutyOn) {
        var cyc = opts.dutyOn + (opts.dutyOff || 0), ph = (f2 / 60) % cyc, firing = ph < opts.dutyOn;
        if (!firing) for (var dk = 0; dk < pirates.length; dk++) { if (pirates[dk].alive) pirates[dk].capLaser = 0; }
      }
      if (fires) {
        MAN.fire = true; MAN.keyFire = true; MAN.rearActive = false; MAN.thr = 0; MAN.nitro = false;
        var tgt = null; for (var pj = 0; pj < pirates.length; pj++) { if (pirates[pj].alive) { tgt = pirates[pj]; break; } }
        if (tgt) { _q.copy(tgt.pos).sub(P.pos); if (_q.lengthSq() > 1e-6) { _q.normalize(); P.quat.setFromUnitVectors(FWD, _q); } }
      }
      t += STEP;
      try { frame(t); } catch (e) { if (r.errors.length < 8) r.errors.push('f' + f2 + ': ' + String(e && e.message || e)); }
      if (fires) { MAN.fire = true; MAN.keyFire = true; }
      if (P.hp < minHp) minHp = P.hp;
      if ((P.shield || 0) < minShield) minShield = P.shield || 0;
      if (f2 % sampleEvery === 0) {
        r.samples.push({ t: +(f2 / 60).toFixed(1), hp: +P.hp.toFixed(1), sh: +((P.shield || 0)).toFixed(1), pHp: pirates[0] ? +((pirates[0].hp) || 0).toFixed(1) : null, pAlive: pirates.filter(function (p) { return p.alive; }).length });
      }
      if (dead(P) && deathFrame < 0) { deathFrame = f2; if (!opts.runFull) break; }
      if (pirates[0] && dead(pirates[0]) && pirateDeathFrame < 0) { pirateDeathFrame = f2; if (N === 1 && fires && !opts.runFull) break; }
    }
    window.requestAnimationFrame = realRAF;
    if (fires) { try { keysDown.delete('KeyF'); } catch (e) {} MAN.fire = false; MAN.keyFire = false; }

    r.deathFrame = deathFrame;
    r.playerTTD = deathFrame >= 0 ? +(deathFrame / 60).toFixed(2) : null;
    r.playerSurvived = deathFrame < 0;
    r.finalHp = +P.hp.toFixed(1); r.minHp = +minHp.toFixed(1); r.minShield = +minShield.toFixed(1);
    r.pirateTTK = pirateDeathFrame >= 0 ? +(pirateDeathFrame / 60).toFixed(2) : null;
    r.pirateFinalHp = pirates[0] ? +((pirates[0].hp) || 0).toFixed(1) : null;
    r.piratesAlive = pirates.filter(function (p) { return p.alive; }).length;
    r.ok = true;
    return r;
  } catch (e) { r.error = String(e && e.message || e); r.stack = String(e && e.stack || '').slice(0, 400); return r; }
}

const DRIVER_SRC = runCombat.toString();

const BASELINE_JOBS = [
  { label: 'B10 baseline: 4 pirates vs frozen player (natural), 30s', scenario: 'playerVsGroup', nPirates: 4, mode: 'natural', range: 18, seconds: 30, runFull: true },
  { label: 'B10 baseline run2', scenario: 'playerVsGroup', nPirates: 4, mode: 'natural', range: 18, seconds: 30, runFull: true },
  { label: 'B10-solo baseline: 1 pirate vs frozen player (natural), 30s', scenario: 'playerVsSolo', nPirates: 1, mode: 'natural', range: 18, seconds: 30, runFull: true },
  { label: 'B12 baseline: player kills 1 point-blank pirate (ring, invuln player)', scenario: 'ttkPointBlank', nPirates: 1, mode: 'ring', range: 15, seconds: 40, playerFires: true, invulnPlayer: true },
  { label: 'B11 baseline: pirate population over 120s natural sim', scenario: 'population', seconds: 120, sampleEvery: 300 },
];

async function main(jobs) {
  const out = { chromeVersion: null, jobs: [] };
  chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--enable-unsafe-swiftshader', '--window-size=1400,900', '--hide-scrollbars', 'about:blank',
  ], { detached: false, stdio: 'ignore' });
  chrome.on('error', e => out.spawnError = e.message);

  let ver = null;
  for (let i = 0; i < 40; i++) { try { const rr = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (rr.ok) { ver = await rr.json(); break; } } catch (e) {} await sleep(500); }
  if (!ver) { out.error = 'CDP endpoint never came up'; return out; }
  out.chromeVersion = ver.Browser;
  const client = cdpClient(ver.webSocketDebuggerUrl);
  await client.ready;

  for (const job of jobs) {
    const jr = { label: job.label };
    try {
      const { targetId } = await client.send('Target.createTarget', { url: GAME_URL });
      const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
      await client.send('Runtime.enable', {}, sessionId);
      // poll for readiness (world built + harness up)
      let ready = false;
      for (let i = 0; i < 48; i++) {
        const probe = await client.send('Runtime.evaluate', {
          expression: `(function(){try{return (typeof ships!=='undefined'&&ships[0]&&ships[0].maxHp>0&&typeof frame==='function'&&typeof addPirate==='function'&&typeof T!=='undefined'&&typeof systems!=='undefined'&&systems&&systems.length>0&&typeof HEG_TIERS!=='undefined');}catch(e){return 'ERR '+e.message;}})()`,
          returnByValue: true
        }, sessionId);
        if (probe.result && probe.result.value === true) { ready = true; break; }
        await sleep(500);
      }
      if (!ready) { jr.error = 'never_ready'; out.jobs.push(jr); await client.send('Target.closeTarget', { targetId }).catch(() => {}); continue; }
      // run the scenario
      const call = `(${DRIVER_SRC})(${JSON.stringify(job)})`;
      const res = await client.send('Runtime.evaluate', { expression: call, returnByValue: true, awaitPromise: false }, sessionId);
      if (res.exceptionDetails) jr.exception = JSON.stringify(res.exceptionDetails).slice(0, 400);
      jr.result = res.result && res.result.value;
      await client.send('Target.closeTarget', { targetId }).catch(() => {});
    } catch (e) { jr.error = String(e && e.message || e); }
    out.jobs.push(jr);
  }
  try { client.ws.close(); } catch (e) {}
  return out;
}

let jobs = BASELINE_JOBS;
if (process.argv[2]) { try { const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); if (spec && spec.jobs) jobs = spec.jobs; } catch (e) { console.log('bad jobs file: ' + e.message); process.exit(1); } }

Promise.race([
  main(jobs),
  sleep(HARD_TIMEOUT_MS).then(() => { throw new Error('HARD TIMEOUT ' + HARD_TIMEOUT_MS + 'ms'); }),
]).then(r => {
  console.log(JSON.stringify(r, null, 2));
  cleanup(); process.exit(0);
}).catch(e => { console.log('PROBE FAILED: ' + e.message); cleanup(); process.exit(1); });
