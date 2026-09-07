// cdp_harness.js - VIABILITY TEST: can a CLI-launched headless Chrome (no puppeteer) load and read
// state from the real Star Fighter game? If yes, the "browser-bound" backlog (N3 first-load boxes,
// M1 synth verify, perf) is unblocked. Uses node's built-in WebSocket + fetch to drive the Chrome
// DevTools Protocol. Self-cleaning (kills its own chrome, rm temp profile) and hard-timeout-bounded
// so it can NEVER hang the loop. Isolated --user-data-dir so it never touches RJ's live Chrome.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const GAME_URL = 'file:///D:/code/starfighter/index.html?harness=1';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-cdp-'));
const HARD_TIMEOUT_MS = 40000;

let chrome = null;
function cleanup() {
  try { if (chrome && !chrome.killed) chrome.kill('SIGKILL'); } catch (e) {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
}
process.on('exit', cleanup);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// minimal CDP client over one WS (flatten mode: sessionId routing)
function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];
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

async function main() {
  const result = { chromeLaunched: false, cdpUp: false, targetCreated: false, loaded: false, probe: null, errors: [] };

  chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--enable-unsafe-swiftshader', '--window-size=1400,900', '--hide-scrollbars', 'about:blank',
  ], { detached: false, stdio: 'ignore' });
  chrome.on('error', e => result.errors.push('spawn: ' + e.message));
  result.chromeLaunched = true;

  // wait for the CDP HTTP endpoint
  let ver = null;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { ver = await r.json(); break; } } catch (e) {}
    await sleep(500);
  }
  if (!ver) { result.errors.push('CDP endpoint never came up'); return result; }
  result.cdpUp = true; result.chromeVersion = ver.Browser;

  const client = cdpClient(ver.webSocketDebuggerUrl);
  await client.ready;

  // create the game target, attach flat
  const { targetId } = await client.send('Target.createTarget', { url: GAME_URL });
  result.targetCreated = true;
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Page.enable', {}, sessionId);

  // give the 50 scripts + THREE.js init time to run
  await sleep(6000);

  const probeExpr = `(function(){
    var out={};
    try{ out.readyState=document.readyState; }catch(e){ out.readyState='ERR '+e.message; }
    try{ out.innerWidth=window.innerWidth; out.innerHeight=window.innerHeight; }catch(e){}
    try{ out.bareCFG=(typeof CFG); out.NSHIPS=(typeof CFG!=='undefined')?CFG.NSHIPS:'n/a'; }catch(e){ out.bareCFG='ERR '+e.message; }
    try{ out.shipsLen=(typeof ships!=='undefined'&&ships)?ships.length:'n/a'; }catch(e){ out.shipsLen='ERR '+e.message; }
    try{ out.hasSIM=(typeof window.SIM==='object'); }catch(e){}
    try{ out.census=(window.SIM&&SIM.census)?SIM.census():'no census'; }catch(e){ out.census='ERR '+e.message; }
    try{ var c=document.createElement('canvas'); var gl=c.getContext('webgl2')||c.getContext('webgl'); out.webgl=!!gl; if(gl){ out.glRenderer=gl.getParameter(gl.RENDERER); } }catch(e){ out.webgl='ERR '+e.message; }
    try{ out.timelineAdvances = (document.timeline && typeof document.timeline.currentTime==='number') ? document.timeline.currentTime : 'no-timeline'; }catch(e){}
    try{ out.bodyChildBoxes=document.querySelectorAll('body *').length; }catch(e){}
    return out;
  })()`;
  const evalRes = await client.send('Runtime.evaluate', { expression: probeExpr, returnByValue: true, awaitPromise: false }, sessionId);
  if (evalRes.exceptionDetails) result.errors.push('probe exception: ' + JSON.stringify(evalRes.exceptionDetails).slice(0, 300));
  result.probe = evalRes.result && evalRes.result.value;
  result.loaded = !!(result.probe && result.probe.readyState === 'complete');

  await client.send('Target.closeTarget', { targetId }).catch(() => {});
  try { client.ws.close(); } catch (e) {}
  return result;
}

Promise.race([
  main(),
  sleep(HARD_TIMEOUT_MS).then(() => { throw new Error('HARD TIMEOUT ' + HARD_TIMEOUT_MS + 'ms'); }),
]).then(r => {
  console.log(JSON.stringify(r, null, 2));
  cleanup();
  process.exit(0);
}).catch(e => {
  console.log('HARNESS FAILED: ' + e.message);
  cleanup();
  process.exit(1);
});
