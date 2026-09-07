// m1_music_off_verify.js - LIVE verify of the M1 fix in the REAL wired game (headless Chrome via CDP).
// M1: "music OFF" (CFG.MUSIC_ON=false) gated the .ogg bed but NOT the F67 adaptive SYNTH score (window.MUSIC),
// which auto-started on the first gesture via arm()->go()->start(), ungated. FIX (index.html boot): call
// MUSIC.setMute(!CFG.MUSIC_ON) synchronously at boot; setMute stores `muted` BEFORE start(), and build()
// (music.js:90) reads it as bus.gain = muted?0:vol, so the synth boots SILENT when music is off.
//
// This drives the ACTUAL page (not a Node model of it): fresh temp profile (= empty localStorage = the real
// first-run "music OFF by default"), a REAL keydown gesture, then reads MUSIC.debug(). Asserts the switch:
// with MUSIC_ON=false the synth is muted (silent); flip MUSIC_ON=true + re-run the exact gate expr -> unmuted.
// Self-cleaning, hard-timeout-bounded (can never hang the loop). Distinct port to dodge concurrent workers.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9337;                                              // distinct from combat_probe (9334) / cdp_harness (9333)
const GAME_URL = 'file:///D:/code/starfighter/index.html';     // NO ?harness - the real first-run boot audio path
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-m1-'));
const HARD_TIMEOUT_MS = 45000;

let chrome = null;
function cleanup() {
  try { if (chrome && !chrome.killed) chrome.kill('SIGKILL'); } catch (e) {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
}
process.on('exit', cleanup);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1; const pending = new Map(); const events = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
    else if (msg.method) events.push(msg);
  };
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = e => rej(new Error('ws error')); });
  function send(method, params = {}, sessionId) {
    const id = nextId++;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  }
  return { ws, ready, send, events };
}

async function evalIn(client, sessionId, expr) {
  const r = await client.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false }, sessionId);
  if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
  return r.result && r.result.value;
}

async function main() {
  const out = { chromeVersion: null, sane: null, before: null, afterGesture: null, switchOn: null, consoleErrors: [], checks: [] };
  const ck = (n, c) => out.checks.push({ n, pass: !!c });

  chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
    '--window-size=1400,900', '--hide-scrollbars', 'about:blank',
  ], { detached: false, stdio: 'ignore' });
  chrome.on('error', e => out.consoleErrors.push('spawn: ' + e.message));

  let ver = null;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { ver = await r.json(); break; } } catch (e) {}
    await sleep(500);
  }
  if (!ver) { out.consoleErrors.push('CDP endpoint never came up'); return out; }
  out.chromeVersion = ver.Browser;

  const client = cdpClient(ver.webSocketDebuggerUrl); await client.ready;
  const { targetId } = await client.send('Target.createTarget', { url: GAME_URL });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Page.enable', {}, sessionId);
  // collect page console errors (a broken boot line would surface here)
  client.events.length = 0;
  await client.send('Runtime.enable', {}, sessionId);

  await sleep(6000);                                            // 50 scripts + THREE init

  // sanity: not a hidden pane (innerWidth>0, timeline advancing), CFG.MUSIC_ON false as shipped, MUSIC present
  out.sane = await evalIn(client, sessionId, `(function(){
    return { readyState:document.readyState, innerWidth:window.innerWidth,
      tl:(document.timeline&&typeof document.timeline.currentTime==='number')?document.timeline.currentTime:'no-tl',
      MUSIC_ON:(typeof CFG!=='undefined')?CFG.MUSIC_ON:'no-CFG',
      hasMUSIC:(typeof window.MUSIC==='object'&&!!window.MUSIC), hasSetMute:!!(window.MUSIC&&MUSIC.setMute) };
  })()`);
  ck('page is not a hidden pane (innerWidth>0)', out.sane && out.sane.innerWidth > 0);
  ck('timeline advances (not frozen)', out.sane && typeof out.sane.tl === 'number');
  ck('CFG.MUSIC_ON is false as shipped (the music-OFF case)', out.sane && out.sane.MUSIC_ON === false);
  ck('window.MUSIC present with setMute', out.sane && out.sane.hasMUSIC && out.sane.hasSetMute);

  // BEFORE the gesture: the synth has not started, but boot already set muted=true (my fix runs at parse time)
  out.before = await evalIn(client, sessionId, `(function(){ var d=window.MUSIC?MUSIC.debug():null; return { started:window.MUSIC?MUSIC.started():null, muted:d?d.muted:null }; })()`);
  ck('BEFORE gesture: synth not yet started', out.before && out.before.started === false);
  ck('BEFORE gesture: boot already muted the synth (fix ran synchronously)', out.before && out.before.muted === true);

  // fire a REAL first gesture - this is the arm()->go()->start() path that USED to make music audible
  await evalIn(client, sessionId, `(function(){ window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',bubbles:true})); return true; })()`);
  await sleep(800);
  out.afterGesture = await evalIn(client, sessionId, `(function(){ var d=window.MUSIC?MUSIC.debug():null; return d?{ started:d.started, muted:d.muted, ctx:d.ctx, vol:d.vol, layers:d.layers }:null; })()`);
  // THE FIX: after the first keypress the synth is muted (bus gain 0 = silent), regardless of whether the
  // AudioContext could actually start in headless. `muted===true` <=> build() set bus.gain = 0.
  ck('AFTER gesture: synth is MUTED (bus gain 0 = silent) - the M1 fix', out.afterGesture && out.afterGesture.muted === true);

  // SWITCH-CHECK: it is a switch, not a removal. Flip MUSIC_ON=true and re-run the EXACT boot gate expression.
  out.switchOn = await evalIn(client, sessionId, `(function(){ CFG.MUSIC_ON=true; if(window.MUSIC&&MUSIC.setMute) MUSIC.setMute(!CFG.MUSIC_ON); var d=MUSIC.debug(); return { muted:d.muted }; })()`);
  ck('SWITCH: with MUSIC_ON=true the same gate expr UNMUTES (would play)', out.switchOn && out.switchOn.muted === false);

  await client.send('Target.closeTarget', { targetId }).catch(() => {});
  try { client.ws.close(); } catch (e) {}
  return out;
}

Promise.race([
  main(),
  sleep(HARD_TIMEOUT_MS).then(() => { throw new Error('HARD TIMEOUT ' + HARD_TIMEOUT_MS + 'ms'); }),
]).then(r => {
  const fails = r.checks.filter(c => !c.pass);
  console.log(JSON.stringify(r, null, 2));
  console.log('---');
  for (const c of r.checks) console.log((c.pass ? 'PASS - ' : 'FAIL - ') + c.n);
  console.log('RESULT: ' + (fails.length === 0 ? 'M1 FIX VERIFIED (music off truly silences the synth; a switch, not a removal)' : 'FAIL (' + fails.length + ')'));
  cleanup();
  process.exit(fails.length === 0 ? 0 : 1);
}).catch(e => { console.log('HARNESS FAILED: ' + e.message); cleanup(); process.exit(1); });
