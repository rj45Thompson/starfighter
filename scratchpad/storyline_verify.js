// storyline_verify.js - verify F31 (storyline.js / window.STORYLINE) LIVE via H2 (headless Chrome/CDP)
// against the REAL wired game. Drives the authored main-story spine "The Iron Synod War" end to end
// through the four ORDERED beats using REAL game objects (planets/ships/base/warWin/runCmd):
//   0 wiring    STORYLINE present + warWin() source actually calls STORYLINE.onWarWin()
//   1 start     saga command shows Beat 1/4 The Oath, grounded to a REAL staging planet
//   2 oath->blooded   docking the staging planet advances the beat (real HOST.P.docked)
//   3 blooded->front  reaching the rank target advances the beat (real HOST.P.score vs RANKS)
//   4 front->armistice a war win advances it (STORYLINE.onWarWin(), the hook warWin() calls)
//   5 armistice->done docking Ranger Command completes the arc + pays the reward on the REAL player
//   6 command+persist  saga shows COMPLETE and progress is persisted to localStorage
// Self-cleaning, hard-timeout-bounded so it can never hang the loop. Isolated --user-data-dir.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9338, GAME_URL = 'file:///D:/code/starfighter/index.html';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-f31-')); const HARD = 60000;
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

// each step is an IIFE returning a plain object (returnByValue). No bare vars leak (IIFE-wrapped, per the
// "never a bare var in an injected eval" trap). tick() is called synchronously right after mutating game
// state so the story reads it before the next sim frame can clear ships[0].docked.
// NB: planets/base/ships/STORYLINE/warWin/runCmd/term are top-level bindings in the game's inline
// script. `let`/`const` ones (planets, base) are NOT window properties, so they are reached as BARE
// identifiers here (eval runs in global scope), never as window.*. term() output is captured by briefly
// swapping the global term (a function-declaration binding, reassignable) - reading #logbody scrapes
// whichever log TAB is showing, not the terminal channel.
const EV = {
  wiring: `(function(){var o={};try{o.hasSTORYLINE=(typeof STORYLINE==='object');}catch(e){o.hasSTORYLINE=false;}
    try{o.hasWarWin=(typeof warWin==='function');o.warWinWired=o.hasWarWin&&/STORYLINE\\.onWarWin/.test(warWin.toString());}catch(e){o.warWinWired='ERR '+e.message;}
    try{o.planetsN=(typeof planets!=='undefined'&&planets.length)||0;}catch(e){o.planetsN='ERR';}
    try{o.baseName=(typeof base!=='undefined'&&base&&base.name)||null;}catch(e){o.baseName='ERR';}
    return o;})()`,
  // start VIA THE COMMAND (runCmd 'saga start') so the command's start path is exercised, and capture term
  start: `(function(){try{localStorage.setItem('SF_SAVE_v1','{}');}catch(e){}
    STORYLINE.reset();var cap=[];var orig=term;try{term=function(h,c){cap.push(String(h));return orig(h,c);};runCmd('saga start');}finally{term=orig;}
    var v=STORYLINE.view();var st=STORYLINE._state();var staging=st&&st.ctx&&st.ctx.staging;
    var real=false;try{real=!!(typeof planets!=='undefined'&&planets.some(function(p){return p.name===staging;}));}catch(e){}
    return {started:v.started,beatNo:v.beatNo,beatId:v.beatId,title:v.beatTitle,staging:staging,stagingIsReal:real,announce:cap.join(' | ').slice(0,300)};})()`,
  sagaCmd: `(function(){var cap=[];var orig=term;try{term=function(h,c){cap.push(String(h));return orig(h,c);};runCmd('saga');}finally{term=orig;}
    return {text:cap.join(' ').replace(/\\s+/g,' ').trim().slice(0,700)};})()`,
  dockStaging: `(function(){var st=STORYLINE._state();var sn=st.ctx.staging;var pl=(typeof planets!=='undefined'?planets:[]).find(function(p){return p.name===sn;});
    if(!pl) return {err:'no staging planet '+sn};ships[0].docked=pl;try{ships[0].pos.copy(pl.pos);}catch(e){}STORYLINE.tick();
    var v=STORYLINE.view();return {beatNo:v.beatNo,beatId:v.beatId,title:v.beatTitle,obj:v.objective};})()`,
  reachRank: `(function(){var st=STORYLINE._state();var pts=st.ctx.rankTargetPts;ships[0].docked=null;ships[0].score=pts+1;STORYLINE.tick();
    var v=STORYLINE.view();return {beatNo:v.beatNo,beatId:v.beatId,targetPts:pts,score:ships[0].score};})()`,
  warWin: `(function(){STORYLINE.onWarWin();var v=STORYLINE.view();return {beatNo:v.beatNo,beatId:v.beatId,title:v.beatTitle};})()`,
  dockHome: `(function(){var before=ships[0].credits,sb=ships[0].score;
    var home=(typeof base!=='undefined'&&base&&base.name==='Ranger Command')?base:{name:'Ranger Command',pos:ships[0].pos.clone(),_base:true};
    ships[0].docked=home;try{if(home.pos)ships[0].pos.copy(home.pos);}catch(e){}STORYLINE.tick();
    var v=STORYLINE.view();return {done:v.done,creditGain:Math.round(ships[0].credits-before),scoreGain:ships[0].score-sb};})()`,
  doneCmd: `(function(){var cap=[];var orig=term;try{term=function(h,c){cap.push(String(h));return orig(h,c);};runCmd('saga');}finally{term=orig;}
    var raw=null;try{raw=JSON.parse(localStorage.getItem('SF_STORY_v1'));}catch(e){}
    return {text:cap.join(' ').replace(/\\s+/g,' ').trim().slice(0,200),persistedDone:!!(raw&&raw.done===true),persistedBeat:raw&&raw.beat};})()`,
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
  R.s1_start = await ev(c, sid, EV.start);
  R.s2_sagaCmd = await ev(c, sid, EV.sagaCmd);
  R.s3_dockStaging = await ev(c, sid, EV.dockStaging);
  R.s4_reachRank = await ev(c, sid, EV.reachRank);
  R.s5_warWin = await ev(c, sid, EV.warWin);
  R.s6_dockHome = await ev(c, sid, EV.dockHome);
  R.s7_doneCmd = await ev(c, sid, EV.doneCmd);

  await c.send('Target.closeTarget', { targetId }).catch(() => { });
  try { c.ws.close(); } catch (e) { }

  const w = R.s0_wiring || {}, s1 = R.s1_start || {}, s2 = R.s2_sagaCmd || {}, s3 = R.s3_dockStaging || {}, s4 = R.s4_reachRank || {}, s5 = R.s5_warWin || {}, s6 = R.s6_dockHome || {}, s7 = R.s7_doneCmd || {};
  R.checks = {
    wiring_present: w.hasSTORYLINE === true && w.planetsN > 0,
    warWin_calls_onWarWin: w.warWinWired === true,
    start_via_command_beat1_oath: s1.started === true && s1.beatNo === 1 && s1.beatId === 'oath',
    staging_is_real_planet: s1.stagingIsReal === true,
    saga_cmd_shows_beat1: /Iron Synod War/.test(s2.text || '') && /1\/4/.test(s2.text || '') && /The Oath/.test(s2.text || '') && /OBJECTIVE/.test(s2.text || ''),
    oath_to_blooded: s3.beatNo === 2 && s3.beatId === 'blooded',
    blooded_to_front: s4.beatNo === 3 && s4.beatId === 'front',
    front_to_armistice: s5.beatNo === 4 && s5.beatId === 'armistice',
    armistice_completes: s6.done === true,
    reward_paid_once: s6.creditGain === 750 && s6.scoreGain === 8,
    saga_cmd_shows_complete: /COMPLETE/.test(s7.text || ''),
    progress_persisted: s7.persistedDone === true && s7.persistedBeat === 4,
  };
  R.PASS = Object.keys(R.checks).every(k => R.checks[k] === true);
  return R;
}
Promise.race([main(), sleep(HARD).then(() => { throw new Error('HARD TIMEOUT'); })])
  .then(r => { console.log(JSON.stringify(r, null, 2)); console.log('RESULT: ' + (r.PASS ? 'PASS' : 'FAIL')); cleanup(); process.exit(r.PASS ? 0 : 1); })
  .catch(e => { console.log('FAILED: ' + e.message); cleanup(); process.exit(1); });
