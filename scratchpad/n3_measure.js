// n3_measure.js - N3 baseline: measure what a FIRST-TIME player is shown on a WIPED first load.
// Fresh temp --user-data-dir = empty localStorage = a genuine brand-new player. Loads the REAL game
// (no ?harness - the true first-run UI) and reports several candidate "visible box" sweeps so we can
// (a) pin down which one reproduces the recorded 144 and (b) see WHAT the boxes are, to plan the cut.
// Self-cleaning, hard-timeout-bounded. Reuses the cdp_harness.js CDP-over-node-WebSocket approach.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const GAME_URL = 'file:///D:/code/starfighter/index.html';   // NO ?harness - the real first-run UI
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-n3-'));
const HARD_TIMEOUT_MS = 45000;
const VIEW_W = 1440, VIEW_H = 900;

let chrome = null;
function cleanup(){ try{ if(chrome&&!chrome.killed) chrome.kill('SIGKILL'); }catch(e){} try{ fs.rmSync(PROFILE,{recursive:true,force:true}); }catch(e){} }
process.on('exit', cleanup);
const sleep = ms => new Promise(r=>setTimeout(r,ms));

function cdpClient(wsUrl){
  const ws=new WebSocket(wsUrl); let nextId=1; const pending=new Map(); const events=[];
  ws.onmessage=ev=>{ const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){ const {resolve,reject}=pending.get(m.id); pending.delete(m.id); m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);} else if(m.method) events.push(m); };
  const ready=new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=()=>rej(new Error('ws error')); });
  function send(method,params={},sessionId){ const id=nextId++; return new Promise((resolve,reject)=>{ pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params,sessionId})); }); }
  return {ws,ready,send,events};
}

async function main(){
  const result={errors:[]};
  chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,
    '--no-first-run','--no-default-browser-check','--disable-extensions','--enable-unsafe-swiftshader',
    `--window-size=${VIEW_W},${VIEW_H}`,'--hide-scrollbars','about:blank'],{stdio:'ignore'});
  chrome.on('error',e=>result.errors.push('spawn: '+e.message));
  let ver=null;
  for(let i=0;i<40;i++){ try{ const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){ ver=await r.json(); break; } }catch(e){} await sleep(500); }
  if(!ver){ result.errors.push('CDP never came up'); return result; }
  const c=cdpClient(ver.webSocketDebuggerUrl); await c.ready;
  const {targetId}=await c.send('Target.createTarget',{url:GAME_URL});
  const {sessionId}=await c.send('Target.attachToTarget',{targetId,flatten:true});
  await c.send('Runtime.enable',{},sessionId); await c.send('Page.enable',{},sessionId);
  await sleep(6000);   // let the intro + game UI build

  const probe = `(function(){
    function vis(el){ if(!el||el.nodeType!==1) return false; var cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false; if(el.getClientRects().length===0) return false; return true; }
    function onScreen(el){ var r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && r.bottom>0 && r.right>0 && r.top<innerHeight && r.left<innerWidth; }
    var all=[].slice.call(document.querySelectorAll('body *'));
    var out={ innerW:innerWidth, innerH:innerHeight, allUnderBody:all.length };
    out.visible = all.filter(vis).length;                                  // rendered (display/vis/opacity/rects)
    out.visibleOnScreen = all.filter(function(e){return vis(e)&&onScreen(e);}).length;  // + within the viewport
    // "box"-like: a visible element that draws a box (border or background), the intuitive count
    out.visibleBoxes = all.filter(function(e){ if(!vis(e)||!onScreen(e)) return false; var cs=getComputedStyle(e); var hasBg=cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent'; var hasBorder=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0)+(parseFloat(cs.borderLeftWidth)||0)+(parseFloat(cs.borderRightWidth)||0)>0; return hasBg||hasBorder; }).length;
    // intro / lore overlay present?
    var introSel=['#awaken','#controlCard','.control-card','#intro','#lore','#story','.intro','.lore','#introOverlay'];
    out.introVisible=false; for(var i=0;i<introSel.length;i++){ var n=document.querySelector(introSel[i]); if(n&&vis(n)){ out.introVisible=introSel[i]; break; } }
    // top-level visible children of body, with their visible-descendant counts (to see what dominates)
    out.bodyChildren = [].slice.call(document.body.children).filter(vis).map(function(e){
      var desc=[].slice.call(e.querySelectorAll('*')).filter(vis).length;
      return { tag:e.tagName.toLowerCase(), id:e.id||'', cls:(e.className&&e.className.toString?e.className.toString():'').slice(0,40), visDesc:desc };
    }).sort(function(a,b){return b.visDesc-a.visDesc;}).slice(0,20);
    // PANELS manager (F65) present?
    try{ out.hasPANELS=(typeof window.PANELS==='object'); out.panelList=(window.PANELS&&PANELS.list)?PANELS.list():'n/a'; }catch(e){ out.hasPANELS='ERR '+e.message; }
    out.readyState=document.readyState;
    return out;
  })()`;
  const ev=await c.send('Runtime.evaluate',{expression:probe,returnByValue:true},sessionId);
  if(ev.exceptionDetails) result.errors.push('probe exc: '+JSON.stringify(ev.exceptionDetails).slice(0,300));
  result.measured=ev.result&&ev.result.value;
  await c.send('Target.closeTarget',{targetId}).catch(()=>{});
  try{ c.ws.close(); }catch(e){}
  return result;
}
Promise.race([ main(), sleep(HARD_TIMEOUT_MS).then(()=>{throw new Error('HARD TIMEOUT');}) ])
  .then(r=>{ console.log(JSON.stringify(r,null,2)); cleanup(); process.exit(0); })
  .catch(e=>{ console.log('FAILED: '+e.message); cleanup(); process.exit(1); });
