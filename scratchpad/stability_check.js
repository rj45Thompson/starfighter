// stability_check.js - a bounded RUNTIME-DEFECT / regression pass (the directive's #1 rung: a defect a
// player would actually hit). This run added storyline.js + survey.js + 3 index.html edits (saga command,
// survey command, warWin->onWarWin hook), each verified in ISOLATION but never in a COMBINED sustained
// real-game run. This drives the REAL game via H2 for ~20 simulated seconds and (a) checks for runtime
// errors / NaN ships / unbounded growth, and (b) exercises the command surface (incl. the new saga/survey
// commands + the B5 bare-arg class) checking none throw. Faithful for step/CPU; renderAll is software-GPU.
// Self-cleaning, hard-timeout-bounded, isolated --user-data-dir.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9341, GAME_URL = 'file:///D:/code/starfighter/index.html?harness=1';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-stab-')); const HARD = 80000;
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

// a curated SAFE command sweep (read-only / list-only forms; no buy/sell/fence/newgame/attack). Includes the
// new saga/survey commands and the B5 bare-arg gear commands (which must LIST, not act, and must not throw).
const SWEEP = ['saga', 'saga start', 'saga', 'survey', 'survey sell', 'survey', 'rank', 'skills', 'contracts',
  'quest', 'commands', 'help', 'power', 'status', 'warmap', 'campaign', 'probes', 'cores', 'map', 'wing',
  'hull', 'tank', 'radar', 'droid', 'scanner', 'shieldgen', 'hook', 'gizmo', 'series', 'stim'];

const PROBE = `(function(){
  var o={ innerWidth: window.innerWidth };
  if(typeof SIM==='undefined'){ o.err='no SIM'; return o; }
  o.before=SIM.census();
  if(o.before && o.before.simPaused){ o.err='SIM PAUSED (lock)'; return o; }
  o.run=SIM.run(20);                         // ~1200 frames of the real sim
  o.after=SIM.census();
  // command surface: none may throw
  var sweep=${JSON.stringify(SWEEP)}, threw=[];
  for(var i=0;i<sweep.length;i++){ try{ if(typeof runCmd==='function') runCmd(sweep[i]); }catch(e){ threw.push(sweep[i]+': '+(e&&e.message||e)); } }
  o.cmdThrew=threw; o.cmdCount=sweep.length;
  // a couple more sim seconds AFTER the command sweep, to catch a command that corrupts state
  o.run2=SIM.run(5);
  o.after2=SIM.census();
  return o;
})()`;

async function main() {
  const R = {};
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let ver = null; for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { ver = await r.json(); break; } } catch (e) { } await sleep(500); }
  if (!ver) { R.err = 'no CDP'; return R; }
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
    console.log('--- VERDICT ---');
    if (p.err || !p.run) { console.log('COULD NOT MEASURE: ' + (p.err || 'no run')); cleanup(); process.exit(1); }
    const checks = {
      no_run_errors: p.run.uniqueErrors === 0 && (!p.run2 || p.run2.uniqueErrors === 0),
      no_nan_ships: p.after && (!p.after.nanShips || p.after.nanShips.length === 0),
      no_commands_threw: Array.isArray(p.cmdThrew) && p.cmdThrew.length === 0,
      no_unbounded_growth: p.before && p.after2 && (p.after2.gems == null || p.after2.gems < 5000) && (p.after2.bullets == null || p.after2.bullets < 5000),
      window_ok: p.innerWidth > 0,
    };
    Object.keys(checks).forEach(k => console.log((checks[k] ? 'PASS' : 'FAIL') + ' - ' + k));
    if (p.run) console.log('  run(20): ' + p.run.msPerFrame + ' ms/frame, uniqueErrors=' + p.run.uniqueErrors + (p.run.uniqueErrors ? ' ' + JSON.stringify(p.run.firstErrors) : ''));
    if (p.cmdThrew && p.cmdThrew.length) console.log('  commands that threw: ' + JSON.stringify(p.cmdThrew));
    if (p.before && p.after2) console.log('  ships ' + p.before.shipsAlive + '->' + p.after2.shipsAlive + ', gems ' + p.before.gems + '->' + p.after2.gems + ', bullets ' + p.before.bullets + '->' + p.after2.bullets);
    const PASS = Object.keys(checks).every(k => checks[k]);
    console.log('RESULT: ' + (PASS ? 'PASS - runtime healthy, no player-hit defect surfaced' : 'FAIL - see above'));
    cleanup(); process.exit(PASS ? 0 : 1);
  })
  .catch(e => { console.log('FAILED: ' + e.message); cleanup(); process.exit(1); });
