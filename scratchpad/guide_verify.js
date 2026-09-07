// guide_verify.js - verify F58 (guide.js) headless via H2. On a WIPED first load the guided banner
// boots at step 1; driving the REAL loop functions advances it collect->bank->upgrade->done, sets
// SF_GUIDE_v1, and it does NOT reappear on reload (returning player). Self-cleaning, timeout-bounded.
'use strict';
const { spawn } = require('child_process');
const fs=require('fs'), os=require('os'), path=require('path');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9336, GAME_URL='file:///D:/code/starfighter/index.html';
const PROFILE=fs.mkdtempSync(path.join(os.tmpdir(),'sf-f58-')); const HARD=60000;
let chrome=null;
function cleanup(){ try{ if(chrome&&!chrome.killed) chrome.kill('SIGKILL'); }catch(e){} try{ fs.rmSync(PROFILE,{recursive:true,force:true}); }catch(e){} }
process.on('exit',cleanup);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cdp(wsUrl){ const ws=new WebSocket(wsUrl); let id=1; const p=new Map();
  ws.onmessage=ev=>{ const m=JSON.parse(ev.data); if(m.id&&p.has(m.id)){ const {res,rej}=p.get(m.id); p.delete(m.id); m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);} };
  const ready=new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=()=>rej(new Error('ws')); });
  return { ws, ready, send:(method,params={},sessionId)=>new Promise((res,rej)=>{ const i=id++; p.set(i,{res,rej}); ws.send(JSON.stringify({id:i,method,params,sessionId})); }) };
}
const STATE = `(function(){
  var o={}; try{ o.hasGUIDE=(typeof window.GUIDE==='object'); }catch(e){ o.hasGUIDE=false; }
  try{ o.st=(window.GUIDE&&GUIDE._state)?GUIDE._state():null; }catch(e){ o.st='ERR '+e.message; }
  var g=document.getElementById('sfGuide');
  o.hudPresent=!!g; o.hudText = g ? (g.textContent||'').replace(/\\s+/g,' ').trim().slice(0,90) : null;
  try{ o.hudVisible = !!(g && getComputedStyle(g).display!=='none'); }catch(e){ o.hudVisible='ERR'; }
  try{ o.seenFlag=!!localStorage.getItem('SF_GUIDE_v1'); }catch(e){ o.seenFlag='ERR'; }
  return o;
})()`;
async function state(c,sid){ const r=await c.send('Runtime.evaluate',{expression:STATE,returnByValue:true},sid); if(r.exceptionDetails) return {err:JSON.stringify(r.exceptionDetails).slice(0,200)}; return r.result.value; }
async function run(c,sid,expr){ const r=await c.send('Runtime.evaluate',{expression:expr,returnByValue:true},sid); return r.exceptionDetails?('EXC '+JSON.stringify(r.exceptionDetails).slice(0,160)):(r.result&&r.result.value); }

async function main(){
  const R={errors:[]};
  chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--enable-unsafe-swiftshader','--window-size=1440,900','--hide-scrollbars','about:blank'],{stdio:'ignore'});
  let ver=null; for(let i=0;i<40;i++){ try{ const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){ ver=await r.json(); break; } }catch(e){} await sleep(500); }
  if(!ver){ R.errors.push('no CDP'); return R; }
  const c=cdp(ver.webSocketDebuggerUrl); await c.ready;
  const {targetId}=await c.send('Target.createTarget',{url:GAME_URL});
  const {sessionId:sid}=await c.send('Target.attachToTarget',{targetId,flatten:true});
  await c.send('Runtime.enable',{},sid); await c.send('Page.enable',{},sid);
  await sleep(6000);

  R.boot = await state(c,sid);                                             // expect: hasGUIDE, hud STEP 1/3, cur 0, seen false
  R.drove_collect_ret = await run(c,sid,"gemBarAdd(ships[0], 3)");         // fire real collect hook
  R.afterCollect = await state(c,sid);                                     // expect cur 1, STEP 2/3
  R.drove_bank_ret = await run(c,sid,"gemBarAdd(ships[0], CFG.GEM_BAR_MAX+5)");  // banks a point -> bank hook
  R.afterBank = await state(c,sid);                                        // expect cur 2, STEP 3/3
  R.playerPts = await run(c,sid,"ships[0].gemPts");
  R.drove_upgrade_ret = await run(c,sid,"var r=spendStat(ships[0],'speed'); r&&r.ok");  // real upgrade hook
  R.afterUpgrade = await state(c,sid);                                     // expect cur 3 (done), seen true

  // returning player: reload, the guide must NOT reappear
  await c.send('Page.reload',{},sid); await sleep(6500);
  R.afterReload = await state(c,sid);                                      // expect hud not visible, cur -1, seen true

  // existing-player gate: CLEAR the seen flag but SET a save; the guide must STILL not boot (hasSave)
  await run(c,sid,"try{localStorage.removeItem('SF_GUIDE_v1');localStorage.setItem('SF_SAVE_v1','{}');}catch(e){}");
  await c.send('Page.reload',{},sid); await sleep(6500);
  R.existingPlayer = await state(c,sid);   // expect: seenFlag false (cleared) but hud NOT visible (blocked by hasSave)

  await c.send('Target.closeTarget',{targetId}).catch(()=>{});
  try{ c.ws.close(); }catch(e){}
  // verdict
  const b=R.boot||{}, ac=R.afterCollect||{}, ab=R.afterBank||{}, au=R.afterUpgrade||{}, ar=R.afterReload||{}, ep=R.existingPlayer||{};
  R.PASS = !!(b.hasGUIDE && b.st && b.st.cur===0 && b.hudVisible && /STEP 1\/3/.test(b.hudText||'')
    && ac.st && ac.st.cur===1 && /STEP 2\/3/.test(ac.hudText||'')
    && ab.st && ab.st.cur===2 && /STEP 3\/3/.test(ab.hudText||'')
    && au.st && au.st.cur>=3 && au.seenFlag===true && /got the loop/i.test(au.hudText||'')
    && ar.seenFlag===true && ar.hudVisible!==true
    && ep.seenFlag===false && ep.hudVisible!==true);   // existing player (save present) not shown, even with seen cleared
  return R;
}
Promise.race([ main(), sleep(HARD).then(()=>{throw new Error('HARD TIMEOUT');}) ])
  .then(r=>{ console.log(JSON.stringify(r,null,2)); console.log('RESULT: '+(r.PASS?'PASS':'FAIL')); cleanup(); process.exit(r.PASS?0:1); })
  .catch(e=>{ console.log('FAILED: '+e.message); cleanup(); process.exit(1); });
