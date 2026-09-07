// n3b_verify.js - verify the N3b cut (default the ROSTER panel closed for first-time players).
// Three DONE-WHEN conditions, all headless via H2:
//   (1) on a WIPED first load the on-screen visible-box count drops (roster's ~225 on-screen desc -> 0),
//   (2) every panel still one click away (roster's edge tab is visible + PANELS.open('roster') reopens it),
//   (3) a returning player's SF_PANELS_v3 layout is untouched (seed roster.open=true -> stays OPEN).
// Run BEFORE and AFTER the index.html edit; compare. Self-cleaning, hard-timeout-bounded.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9335, GAME_URL='file:///D:/code/starfighter/index.html';
const PROFILE=fs.mkdtempSync(path.join(os.tmpdir(),'sf-n3b-')); const HARD=60000;
let chrome=null;
function cleanup(){ try{ if(chrome&&!chrome.killed) chrome.kill('SIGKILL'); }catch(e){} try{ fs.rmSync(PROFILE,{recursive:true,force:true}); }catch(e){} }
process.on('exit',cleanup);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cdp(wsUrl){ const ws=new WebSocket(wsUrl); let id=1; const p=new Map();
  ws.onmessage=ev=>{ const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){ const {res,rej}=p.get(m.id); p.delete(m.id); m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);} };
  const ready=new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=()=>rej(new Error('ws')); });
  return { ws, ready, send:(method,params={},sessionId)=>new Promise((res,rej)=>{ const i=id++; p.set(i,{res,rej}); ws.send(JSON.stringify({id:i,method,params,sessionId})); }) };
}
const PROBE = `(function(){
  function vis(el){ if(!el||el.nodeType!==1) return false; var cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false; if(el.getClientRects().length===0) return false; return true; }
  function onScreen(el){ var r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth; }
  function onDesc(el){ if(!el) return 0; return [].slice.call(el.querySelectorAll('*')).filter(function(e){return vis(e)&&onScreen(e);}).length; }
  var all=[].slice.call(document.querySelectorAll('body *'));
  var out={ totalOnScreen: all.filter(function(e){return vis(e)&&onScreen(e);}).length };
  try{ out.rosterOpen = (window.PANELS&&PANELS.isOpen)?PANELS.isOpen('roster'):'n/a'; }catch(e){ out.rosterOpen='ERR '+e.message; }
  out.rosterOnScreenDesc = onDesc(document.getElementById('rosterWrap'));
  // roster edge tab visible? (always-findable one-click handle)
  var tabs=[].slice.call(document.querySelectorAll('.pnl-tab'));
  var rtab=tabs.filter(function(t){ return /ROSTER/i.test(t.textContent||''); });
  out.rosterTabVisible = rtab.length>0 && vis(rtab[0]);
  try{ out.openPanels=(window.PANELS&&PANELS.list)?PANELS.list().filter(function(p){return p.open;}).map(function(p){return p.id;}):'n/a'; }catch(e){ out.openPanels='ERR'; }
  return out;
})()`;

async function measure(send, sid){ const r=await send('Runtime.evaluate',{expression:PROBE,returnByValue:true},sid); if(r.exceptionDetails) return {err:JSON.stringify(r.exceptionDetails).slice(0,200)}; return r.result.value; }

async function main(){
  const result={errors:[]};
  chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--enable-unsafe-swiftshader','--window-size=1440,900','--hide-scrollbars','about:blank'],{stdio:'ignore'});
  let ver=null; for(let i=0;i<40;i++){ try{ const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){ ver=await r.json(); break; } }catch(e){} await sleep(500); }
  if(!ver){ result.errors.push('no CDP'); return result; }
  const c=cdp(ver.webSocketDebuggerUrl); await c.ready;
  const {targetId}=await c.send('Target.createTarget',{url:GAME_URL});
  const {sessionId:sid}=await c.send('Target.attachToTarget',{targetId,flatten:true});
  await c.send('Runtime.enable',{},sid); await c.send('Page.enable',{},sid);
  await sleep(6000);

  // (1)+(2) fresh wiped first load
  result.firstLoad = await measure(c.send.bind(c), sid);
  // (2) one-click: open roster via its API (what the tab click calls) and confirm it opens
  await c.send('Runtime.evaluate',{expression:"window.PANELS&&PANELS.open&&PANELS.open('roster')"},sid);
  await sleep(600);
  result.afterOpenRoster = await measure(c.send.bind(c), sid);

  // (3) returning player: seed SF_PANELS_v3 with roster explicitly OPEN, reload, confirm respected
  await c.send('Runtime.evaluate',{expression:"localStorage.setItem('SF_PANELS_v3', JSON.stringify({roster:{open:true,pinned:true}}))"},sid);
  await c.send('Page.reload',{},sid); await sleep(6500);
  result.returningRosterOpen = await measure(c.send.bind(c), sid);

  await c.send('Target.closeTarget',{targetId}).catch(()=>{});
  try{ c.ws.close(); }catch(e){}
  return result;
}
Promise.race([ main(), sleep(HARD).then(()=>{throw new Error('HARD TIMEOUT');}) ])
  .then(r=>{ console.log(JSON.stringify(r,null,2)); cleanup(); process.exit(0); })
  .catch(e=>{ console.log('FAILED: '+e.message); cleanup(); process.exit(1); });
