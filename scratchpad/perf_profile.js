// perf_profile.js - re-measure the CURRENT frame breakdown via H2 (?harness=1) to REPLACE the stale
// TASKS baseline (which still names writeRockInstance 7,781 calls/frame as THE hotspot - that was fixed
// on 2026-09-06 by the strided distance-LOD rewrite, CFG ROCK_LOD_UNIT/ROCK_LOD_MAX :439 + line 2741).
// Faithful for the pure-JS `step` half (CPU-bound); renderAll timing is software swiftshader (NOT a real
// GPU) so it is reported but flagged unrepresentative, per the headless-verification-limits note.
// Self-cleaning, hard-timeout-bounded, isolated --user-data-dir.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9340, GAME_URL = 'file:///D:/code/starfighter/index.html?harness=1';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-perf-')); const HARD = 70000;
let chrome = null;
function cleanup() { try { if (chrome && !chrome.killed) chrome.kill('SIGKILL'); } catch (e) { } try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) { } }
process.on('exit', cleanup);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 1; const p = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && p.has(m.id)) { const { res, rej } = p.get(m.id); p.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')); });
  return { ws, ready, send: (method, params = {}, sessionId) => new Promise((res, rej) => { const i = id++; p.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); }) };
}
async function ev(c, sid, expr) { const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sid); if (r.exceptionDetails) return { __exc: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result && r.result.value; }

// one IIFE (no bare globals - trap #2); confirm innerWidth + not-paused before believing anything (trap #1/#3)
const PROBE = `(function(){
  var o={ innerWidth: window.innerWidth, timelineAdvances: (typeof document!=='undefined' && document.timeline && document.timeline.currentTime>0) };
  if(typeof SIM==='undefined'){ o.err='no SIM - harness not loaded'; return o; }
  try{ o.census=SIM.census(); }catch(e){ o.err='census: '+e.message; return o; }
  if(o.census && o.census.simPaused){ o.err='SIM PAUSED (singleton lock) - numbers would be meaningless'; return o; }
  try{ o.run=SIM.run(3); }catch(e){ o.err='run: '+e.message; }
  try{ o.prof=SIM.profile(['step','renderAll','writeRockInstance','think','flyStep','astHitShip','shieldTick','capacitorTick'],3).hot; }catch(e){ o.errProf='prof: '+e.message; }
  try{ o.rock=SIM.rockReport(3); }catch(e){ o.errRock='rock: '+e.message; }
  return o;
})()`;

async function main() {
  const R = { errors: [] };
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let ver = null; for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { ver = await r.json(); break; } } catch (e) { } await sleep(500); }
  if (!ver) { R.errors.push('no CDP'); return R; }
  const c = cdp(ver.webSocketDebuggerUrl); await c.ready;
  const { targetId } = await c.send('Target.createTarget', { url: GAME_URL });
  const { sessionId: sid } = await c.send('Target.attachToTarget', { targetId, flatten: true });
  await c.send('Runtime.enable', {}, sid); await c.send('Page.enable', {}, sid);
  await sleep(7000);
  R.probe = await ev(c, sid, PROBE);
  await c.send('Target.closeTarget', { targetId }).catch(() => { });
  try { c.ws.close(); } catch (e) { }
  return R;
}
Promise.race([main(), sleep(HARD).then(() => { throw new Error('HARD TIMEOUT'); })])
  .then(r => {
    const p = r.probe || {};
    console.log(JSON.stringify(r, null, 2));
    console.log('--- SUMMARY ---');
    if (p.err) { console.log('PROBE ERROR: ' + p.err); }
    else {
      console.log('innerWidth ' + p.innerWidth + ' (0 = hidden pane, distrust); timeline advances: ' + p.timelineAdvances);
      if (p.census) console.log('census: shipsAlive=' + p.census.shipsAlive + ' asteroids=' + (p.census.asteroids) + ' simPaused=' + p.census.simPaused);
      if (p.run) console.log('whole frame: ' + p.run.msPerFrame + ' ms/frame over ' + p.run.frames + ' frames, errors=' + p.run.uniqueErrors + ' (renderAll half is SOFTWARE-GPU, unrepresentative)');
      if (p.prof) { console.log('per-fn (faithful for step/CPU; renderAll unrepresentative):'); p.prof.forEach(function (x) { console.log('  ' + x.fn + ': ' + x.ms + ' ms  (' + x.calls + ' calls, ' + (x.calls / 180).toFixed(0) + '/frame)'); }); }
      if (p.rock) console.log('rockReport: ' + JSON.stringify(p.rock));
    }
    cleanup(); process.exit(0);
  })
  .catch(e => { console.log('FAILED: ' + e.message); cleanup(); process.exit(1); });
