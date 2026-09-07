// survey_verify.js - verify F45 (survey.js / window.SURVEY + the `survey` command) LIVE via H2 against
// the REAL wired game: filing exploration/survey data pays a cartographics fee and does not double-dip.
// Self-cleaning, hard-timeout-bounded, isolated --user-data-dir.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9339, GAME_URL = 'file:///D:/code/starfighter/index.html';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-f45-')); const HARD = 60000;
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
async function ev(c, sid, expr) { const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sid); if (r.exceptionDetails) return { __exc: JSON.stringify(r.exceptionDetails).slice(0, 200) }; return r.result && r.result.value; }

// bare identifiers (SURVEY/ships/runCmd/term are top-level in the game scope); term captured by swapping the global
const EV = {
  wiring: `(function(){var o={};try{o.hasSURVEY=(typeof SURVEY==='object');}catch(e){o.hasSURVEY=false;}try{o.hasRunCmd=(typeof runCmd==='function');}catch(e){o.hasRunCmd=false;}return o;})()`,
  setup: `(function(){SURVEY.reset();ships[0].discoveries=3;ships[0].credits=1000;var r=SURVEY.read();return {total:r.total,unsold:r.unsold,price:r.price};})()`,
  logCmd: `(function(){var cap=[];var o=term;try{term=function(h,c){cap.push(String(h));return o(h,c);};runCmd('survey');}finally{term=o;}return {text:cap.join(' ').replace(/\\s+/g,' ').slice(0,240)};})()`,
  sellUndocked: `(function(){ships[0].docked=null;var cap=[];var o=term;try{term=function(h,c){cap.push(String(h));return o(h,c);};runCmd('survey sell');}finally{term=o;}return {text:cap.join(' ').replace(/\\s+/g,' ').slice(0,200),credits:ships[0].credits,unsold:SURVEY.read().unsold};})()`,
  sellDocked: `(function(){ships[0].docked={name:'Kessari Reach'};var before=ships[0].credits;var cap=[];var o=term;try{term=function(h,c){cap.push(String(h));return o(h,c);};runCmd('survey sell');}finally{term=o;}return {text:cap.join(' ').replace(/\\s+/g,' ').slice(0,220),gain:ships[0].credits-before,unsold:SURVEY.read().unsold};})()`,
  sellAgain: `(function(){var before=ships[0].credits;var cap=[];var o=term;try{term=function(h,c){cap.push(String(h));return o(h,c);};runCmd('survey sell');}finally{term=o;}return {text:cap.join(' ').replace(/\\s+/g,' ').slice(0,200),gain:ships[0].credits-before};})()`,
  moreThenSell: `(function(){ships[0].discoveries=5;ships[0].docked={name:'Kessari Reach'};var before=ships[0].credits;runCmd('survey sell');return {gain:ships[0].credits-before,unsold:SURVEY.read().unsold,total:SURVEY.read().total};})()`,
};

async function main() {
  const R = { errors: [] };
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let ver = null; for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { ver = await r.json(); break; } } catch (e) { } await sleep(500); }
  if (!ver) { R.errors.push('no CDP'); return R; }
  const c = cdp(ver.webSocketDebuggerUrl); await c.ready;
  const { targetId } = await c.send('Target.createTarget', { url: GAME_URL });
  const { sessionId: sid } = await c.send('Target.attachToTarget', { targetId, flatten: true });
  await c.send('Runtime.enable', {}, sid); await c.send('Page.enable', {}, sid);
  await sleep(6500);

  R.s0_wiring = await ev(c, sid, EV.wiring);
  R.s1_setup = await ev(c, sid, EV.setup);
  R.s2_log = await ev(c, sid, EV.logCmd);
  R.s3_undocked = await ev(c, sid, EV.sellUndocked);
  R.s4_docked = await ev(c, sid, EV.sellDocked);
  R.s5_again = await ev(c, sid, EV.sellAgain);
  R.s6_more = await ev(c, sid, EV.moreThenSell);

  await c.send('Target.closeTarget', { targetId }).catch(() => { });
  try { c.ws.close(); } catch (e) { }

  const w = R.s0_wiring || {}, s1 = R.s1_setup || {}, s2 = R.s2_log || {}, s3 = R.s3_undocked || {}, s4 = R.s4_docked || {}, s5 = R.s5_again || {}, s6 = R.s6_more || {};
  const PRICE = s1.price || 45;
  R.checks = {
    wiring_present: w.hasSURVEY === true && w.hasRunCmd === true,
    setup_3_unfiled: s1.total === 3 && s1.unsold === 3,
    log_shows_unfiled: /3 discoveries/.test(s2.text || '') && /3.*unfiled/.test(s2.text || ''),
    undocked_sell_refused: /dock/i.test(s3.text || '') && s3.unsold === 3,
    docked_sell_pays: s4.gain === 3 * PRICE && s4.unsold === 0 && /Filed/.test(s4.text || '') && new RegExp('\\+' + (3 * PRICE) + 'c').test(s4.text || ''),
    no_double_dip: s5.gain === 0 && /No new survey data/i.test(s5.text || ''),
    new_discoveries_sellable: s6.gain === 2 * PRICE && s6.unsold === 0 && s6.total === 5,
  };
  R.PASS = Object.keys(R.checks).every(k => R.checks[k] === true);
  return R;
}
Promise.race([main(), sleep(HARD).then(() => { throw new Error('HARD TIMEOUT'); })])
  .then(r => { console.log(JSON.stringify(r, null, 2)); console.log('RESULT: ' + (r.PASS ? 'PASS' : 'FAIL')); cleanup(); process.exit(r.PASS ? 0 : 1); })
  .catch(e => { console.log('FAILED: ' + e.message); cleanup(); process.exit(1); });
