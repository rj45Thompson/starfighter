// uc_live.js - LIVE USE CASES: watch the use-case model fill in as the game runs.
//
// RJ 2026-09-08: "can you add a window to watch it run and see the uml cases or logging fill it in as it goes?"
//
// A panels.js window (USE CASES) lists every use case of uml/status.json - the same model USE_CASES.md is written
// in and the BROKEN tab reads - and a case LIGHTS the moment the game does the thing its story is about. How a case
// knows: HOOKS below names the game function(s) whose call IS that story (destroyAsteroid is "a rock splits",
// killShip on the player is "the pilot dies"...). At load, every named function that really exists in this page is
// wrapped to count; a case whose functions are not in this build stays grey and SAYS so - nothing lights from
// memory or from a comment. The window's log fills as calls land: time, case, function, how many so far.
//
// The Egosoft epic (E3) is listed as REMOVED FOR NOW: economy.js / synod.js / empire.js are not loaded
// (RJ 2026-09-08 "remove egosoft for now"); its rows cannot light and say why.
(function(){
  const CFG={ STATUS_URL:'uml/status.json', EDGE:'right', RGB:[10,18,30], DEFAULT_OPACITY:0.92, TICK_MS:500,
              LOG_MAX:80, HOOK_RETRY_MS:800, HOOK_RETRIES:25, REMOVED_EPICS:{E3:'removed for now - the Egosoft layer is not loaded'} };

  // case -> the calls that ARE its story. `A.B` is a module method (window.A.B); a bare name is a page global.
  // Only a PLAYER-side call counts where the story is the pilot's (killShip / spillGems check the ship's role).
  const HOOKS={
    'UC-101':['destroyAsteroid','spawnGem'],
    'UC-104':['gemBarAdd'],
    'UC-105':['spendStat'],
    'UC-106':['doUpgrade'],
    'UC-107':['offerTierUp','takeTierUp'],
    'UC-108':['killShip:player','spillGems:player'],
    'UC-201':['PLANETMENU.open','completeDock','dockMenu'],
    'UC-206':['ENGBAY.show','ENGBAY.toggle'],
    'UC-207':['MISSIONS.accept'],
    'UC-210':['updateMissionArrow'],
    'UC-211':['STARMAP.open'],
    'UC-403':['GROUND.enter','GROUND.land'],
    'UC-501':['PASSENGER.ask'],
    'UC-502':['advise','PASSENGER.advise'],
    'UC-503':['noteAdvice','PASSENGER.noteAdvice'],
    'UC-504':['think'],
    'UC-603':['SHELL.open'],
  };

  const S={ model:null, hits:{}, log:[], hooked:{}, missing:{}, el:null, body:null, t0:performance.now(), tries:0, built:false };
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const secs=()=>((performance.now()-S.t0)/1000);

  function hit(ids,how,note){
    const list=Array.isArray(ids)?ids:[ids]; const t=secs();
    for(const id of list){ const h=S.hits[id]||(S.hits[id]={n:0,last:0,by:''}); h.n++; h.last=t; h.by=how; }
    S.log.push({t, ids:list.slice(), how, note:note||''}); if(S.log.length>CFG.LOG_MAX) S.log.shift();
  }

  // wrap one target (global or module method) so its call records a hit; false when it is not in this page (yet)
  function wrapTarget(spec, ids){
    let cond=null; let name=spec; const c=spec.indexOf(':'); if(c>=0){ cond=spec.slice(c+1); name=spec.slice(0,c); }
    let owner=window, key=name; const dot=name.indexOf('.');
    if(dot>=0){ owner=window[name.slice(0,dot)]; key=name.slice(dot+1); if(!owner) return false; }
    const f=owner[key]; if(typeof f!=='function') return false;
    if(f.__uclive) { f.__uclive.ids.push(...ids); return true; }
    const wrapped=function(){
      let ok=true;
      if(cond==='player'){ const s=arguments[0]; ok=!!(s&&s.role==='player'); }
      if(ok) hit(wrapped.__uclive.ids, name, cond?('role '+cond):'');
      return f.apply(this,arguments); };
    wrapped.__uclive={ ids:ids.slice(), orig:f };
    try{ owner[key]=wrapped; }catch(e){ return false; }
    return true;
  }

  // the game defines its functions over several scripts and some only after load; try a few times, then stop and
  // report what was never found - a missing hook is a fact about this build, shown, not hidden
  function arm(){
    S.tries++;
    for(const id in HOOKS){ for(const spec of HOOKS[id]){ if(S.hooked[spec]) continue;
      if(wrapTarget(spec,[id])) S.hooked[spec]=true; else S.missing[spec]=true; } }
    const missing=Object.keys(S.missing).filter(k=>!S.hooked[k]);
    if(missing.length && S.tries<CFG.HOOK_RETRIES) setTimeout(arm, CFG.HOOK_RETRY_MS);
    for(const k of Object.keys(S.missing)) if(S.hooked[k]) delete S.missing[k];
  }

  function armedFor(id){ return (HOOKS[id]||[]).filter(s=>S.hooked[s]); }
  function missingFor(id){ return (HOOKS[id]||[]).filter(s=>!S.hooked[s]); }

  function render(){
    if(!S.body) return;
    const m=S.model;
    if(!m){ S.body.innerHTML='<div class="ucPad">reading the use-case model (uml/status.json)…</div>'; return; }
    const cases=m.useCases||[]; const lit=cases.filter(c=>S.hits[c.id]).length; const hookable=cases.filter(c=>armedFor(c.id).length).length;
    const byEpic={}; for(const c of cases){ (byEpic[c.epic]=byEpic[c.epic]||[]).push(c); }
    let h=`<div class="ucHead"><b>${lit}</b> of ${cases.length} cases seen this run · ${hookable} hooked · ${Object.keys(S.hooked).length} calls armed · ${secs().toFixed(0)}s</div>`;
    for(const e of Object.keys(byEpic).sort()){
      const removed=CFG.REMOVED_EPICS[e];
      const en=(m.epics&&m.epics[e])?m.epics[e].name:'';
      h+=`<div class="ucEpic">${esc(e)} ${esc(en)}${removed?` <i>${esc(removed)}</i>`:''}</div>`;
      for(const c of byEpic[e]){
        const hh=S.hits[c.id]; const armed=armedFor(c.id), miss=missingFor(c.id);
        const cls=removed?'gone':(hh?'lit':(armed.length?'armed':'nohook'));
        const right=removed?'—':(hh?`×${hh.n} · ${(secs()-hh.last).toFixed(0)}s ago · ${esc(hh.by)}`:(armed.length?'waiting: '+esc(armed.join(', ')):(miss.length?'not in this build: '+esc(miss.join(', ')):'no hook')));
        h+=`<div class="ucRow ${cls}" title="${esc(c.test||'')}"><span class="ucId">${esc(c.id)}</span><span class="ucSt ${esc(c.status)}">${esc(c.status)}</span><span class="ucStory">${esc(c.story)}</span><span class="ucHit">${right}</span></div>`;
      }
    }
    h+=`<div class="ucEpic">LOG - what fired, newest first</div>`;
    if(!S.log.length) h+=`<div class="ucRow"><span class="ucStory" style="opacity:.6">nothing yet - fly, mine, dock, fight</span></div>`;
    for(const l of S.log.slice().reverse().slice(0,40)) h+=`<div class="ucLog">${l.t.toFixed(1)}s  <b>${esc(l.ids.join(' '))}</b>  ${esc(l.how)} ${esc(l.note)}</div>`;
    S.body.innerHTML=h;
  }

  function build(){
    if(S.built) return; S.built=true;
    const el=document.createElement('div'); el.id='uccases';
    el.innerHTML='<div class="ucBody"></div>';
    S.el=el; S.body=el.querySelector('.ucBody');
    const st=document.createElement('style'); st.textContent=`
      #uccases{ width:520px; max-height:70vh; overflow:auto; font:11.5px/1.4 'Segoe UI',system-ui,sans-serif; color:#dbe7f1; }
      #uccases .ucPad{ padding:10px; opacity:.7; }
      #uccases .ucHead{ padding:6px 8px; border-bottom:1px solid #22344a; color:#9fd8ff; letter-spacing:.06em; }
      #uccases .ucHead b{ color:#5ee6a8; font-size:14px; }
      #uccases .ucEpic{ margin:8px 8px 3px; font-size:10px; letter-spacing:.1em; color:#9fd8ff; font-weight:600; }
      #uccases .ucEpic i{ color:#ffb074; font-weight:400; letter-spacing:0; }
      #uccases .ucRow{ display:grid; grid-template-columns:52px 62px 1fr 150px; gap:6px; padding:3px 8px; align-items:baseline; border-left:3px solid transparent; }
      #uccases .ucRow:nth-child(odd){ background:rgba(255,255,255,.025); }
      #uccases .ucRow.lit{ border-left-color:#5ee6a8; background:rgba(94,230,168,.10); }
      #uccases .ucRow.armed .ucStory{ opacity:.85; } #uccases .ucRow.nohook{ opacity:.45; } #uccases .ucRow.gone{ opacity:.35; text-decoration:line-through; }
      #uccases .ucId{ font-variant-numeric:tabular-nums; opacity:.6; }
      #uccases .ucSt{ font-size:9px; letter-spacing:.06em; opacity:.6; } #uccases .ucSt.PARTLY{ color:#ffd479; } #uccases .ucSt.DEPRECATED{ color:#c9a6ff; } #uccases .ucSt.MISSING{ color:#ff8a8a; }
      #uccases .ucHit{ font-size:10px; opacity:.75; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #uccases .ucRow.lit .ucHit{ color:#5ee6a8; opacity:1; }
      #uccases .ucLog{ padding:1px 8px; font:10.5px/1.35 ui-monospace,monospace; opacity:.85; } #uccases .ucLog b{ color:#8ff5ff; }`;
    document.head.appendChild(st);
    if(window.PANELS&&PANELS.register) PANELS.register('uccases', el, { title:'USE CASES', edge:CFG.EDGE, rgb:CFG.RGB, defaultOpacity:CFG.DEFAULT_OPACITY, resizable:true });
    else document.body.appendChild(el);
    fetch(CFG.STATUS_URL).then(r=>r.ok?r.json():Promise.reject(new Error('status '+r.status))).then(j=>{ S.model=j; render(); })
      .catch(e=>{ S.model=null; if(S.body) S.body.innerHTML=`<div class="ucPad">the use-case model did not load (${esc(e.message)}) - run <code>py tools/uml_js.py</code></div>`; });
    setInterval(()=>{ if(!window.PANELS||!PANELS.isOpen||PANELS.isOpen('uccases')) render(); }, CFG.TICK_MS);
    arm();
  }

  window.UCLIVE={ hit, stats:()=>({ seconds:secs(), lit:Object.keys(S.hits).length, hits:S.hits, armed:Object.keys(S.hooked), missing:Object.keys(S.missing).filter(k=>!S.hooked[k]), log:S.log.slice(-12), cases:S.model?S.model.useCases.length:0 }), render, CFG, HOOKS };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
