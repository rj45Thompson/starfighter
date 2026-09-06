// shell.js - the one top bar (RJ 2026-09-06: "start the UI from scratch make it cool only have what works visible
// what is broken you can put in a tab called broken at the top"). Every button opens something that WORKS; the
// rightmost tab is BROKEN, and its contents are read from uml/status.json - the same use-case model USE_CASES.md
// renders - so the in-game "what is half built" list cannot drift from the plan. No game state of its own.
(function(){
  const CFG={ STATUS_URL:'uml/status.json', KEY:'SF_SHELL_v1', BAR_H:34 };
  let bar=null, sheet=null, model=null, openTab=null;
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const cmd=c=>{ if(typeof runCmd==='function') runCmd(c); };
  const panel=(id,on)=>{ if(!window.PANELS) return; const p=(PANELS.list?PANELS.list():[]).find(x=>x.id===id); const want=on==null?!(p&&p.open):on; want?PANELS.open(id):PANELS.close(id); };

  // Each tab names a place the player can actually go today. `live()` decides whether the button is lit, so a tab
  // never advertises a module that failed to load - it says so instead of throwing on click.
  const TABS=[
    { id:'fly',       t:'FLY',       hint:'back to the cockpit - close every screen', live:()=>true,
      go:()=>{ if(window.ENGBAY&&ENGBAY.visible&&ENGBAY.visible()) ENGBAY.hide(); if(window.STARMAP&&STARMAP.isOpen&&STARMAP.isOpen()) STARMAP.close(); if(window.PLANETMENU&&PLANETMENU.isOpen&&PLANETMENU.isOpen()) PLANETMENU.close(); closeSheet(); } },
    { id:'map',       t:'MAP',       hint:'star map - jump between systems (G)', live:()=>!!window.STARMAP, go:()=>cmd('starmap') },
    { id:'ship',      t:'SHIP',      hint:'engineering bay - hardpoints, gizmos, hull (E)', live:()=>!!window.ENGBAY, go:()=>ENGBAY.toggle() },
    { id:'market',    t:'MARKET',    hint:'buy and sell cargo (M)', live:()=>!!window.PANELS, go:()=>panel('market') },
    { id:'upgrades',  t:'UPGRADES',  hint:'gem bar, the eight stats, tier-up (keys 1-8)', live:()=>!!window.SBHUD, go:()=>panel('sbhud') },
    { id:'contracts', t:'CONTRACTS', hint:'the mission board and what is accepted', live:()=>!!window.MISSIONS, go:()=>{ panel('missionlog',true); cmd('missions'); } },
    { id:'passenger', t:'PASSENGER', hint:'talk to the ship AI - it answers from the novel and the live game', live:()=>!!window.PASSENGER,
      go:()=>{ panel('ticker',true); const t=[...document.querySelectorAll('#ticker .tab')].find(e=>/parasite/i.test(e.textContent)); if(t) t.click(); const c=document.getElementById('chat'); if(c) c.focus(); } },
    { id:'broken',    t:'BROKEN',    hint:'what is half built or a toy - listed honestly, not hidden', live:()=>true, sheet:true, go:()=>toggleSheet('broken') }
  ];

  function closeSheet(){ if(sheet){ sheet.hidden=true; } openTab=null; paint(); }
  function toggleSheet(id){ if(openTab===id){ closeSheet(); return; } openTab=id; renderSheet(); sheet.hidden=false; paint(); }

  function statusRows(){
    if(!model) return null;
    const dep=model.useCases.filter(c=>c.status==='DEPRECATED');
    const partly=model.useCases.filter(c=>c.status==='PARTLY');
    const missing=model.useCases.filter(c=>c.status==='MISSING');
    return {dep,partly,missing};
  }
  function epicName(e){ return (model&&model.epics&&model.epics[e])?`${e} ${model.epics[e].name}`:e; }
  function rowHtml(c,cls){ return `<div class="shRow ${cls}"><span class="shId">${esc(c.id)}</span><span class="shEpic">${esc(epicName(c.epic))}</span>
      <span class="shStory">${esc(c.story)}</span><span class="shTest">${esc(c.test)}</span></div>`; }

  function renderSheet(){
    if(!sheet) return;
    if(!model){ sheet.innerHTML='<div class="shPad">reading the use-case model…</div>'; return; }
    const r=statusRows(); const t=model.tally||{};
    sheet.innerHTML=`<div class="shPad">
      <div class="shHead"><b>WHAT IS NOT READY</b><span>${t.WORKS||0} work · ${t.PARTLY||0} half built · ${t.MISSING||0} not built · ${t.DEPRECATED||0} deprecated · model of ${model.generated}</span>
        <button class="shX" title="close">✕</button></div>
      <p class="shNote">This list is generated from the same use-case model the plan is written in (USE_CASES.md → uml/status.json), so it cannot quietly disagree with what the game actually does. A row here is a promise the game does not keep yet.</p>
      <h5>DEPRECATED - built, but a toy; reachable only from here</h5>
      ${r.dep.map(c=>rowHtml(c,'dep')).join('')||'<div class="shRow">nothing deprecated</div>'}
      <div class="shBtns"><button data-go="away">land and walk (needs a planet under you)</button><button data-go="battle">watch a demo ground battle (needs the C# rules sidecar)</button></div>
      <h5>HALF BUILT - it runs, but not to the standard the rest holds</h5>
      ${r.partly.map(c=>rowHtml(c,'part')).join('')}
      <h5>NOT BUILT YET - named so it is not sold as present</h5>
      ${r.missing.map(c=>rowHtml(c,'miss')).join('')}
    </div>`;
    sheet.querySelector('.shX').onclick=closeSheet;
    // the same commands the player would type - if the precondition is missing the command says so itself,
    // which is the honest answer; the tab never pretends a screen is one click away when it is not.
    sheet.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ closeSheet(); cmd(b.dataset.go==='away'?'land':'demo battle'); });
  }

  function paint(){
    if(!bar) return;
    bar.querySelectorAll('button[data-tab]').forEach(b=>{
      const tab=TABS.find(x=>x.id===b.dataset.tab); const on=openTab===tab.id;
      b.classList.toggle('on',on); b.classList.toggle('dead',!tab.live());
    });
  }

  function build(){
    if(bar) return;
    bar=document.createElement('div'); bar.id='shellBar';
    bar.innerHTML=TABS.map(t=>`<button type="button" data-tab="${t.id}" title="${esc(t.hint)}">${t.t}</button>`).join('');
    sheet=document.createElement('div'); sheet.id='shellSheet'; sheet.hidden=true;
    const st=document.createElement('style'); st.textContent=`
      #shellBar{ position:fixed; top:0; left:50%; transform:translateX(-50%); z-index:60; display:flex; gap:1px; padding:3px 4px;
        background:linear-gradient(180deg,rgba(8,16,26,.96),rgba(8,16,26,.78)); border:1px solid #22344a; border-top:0; border-radius:0 0 9px 9px;
        font:600 11px/1 'Segoe UI',system-ui,sans-serif; letter-spacing:.09em; box-shadow:0 4px 16px rgba(0,0,0,.45); }
      #shellBar button{ background:transparent; color:#9fd8ff; border:0; padding:7px 11px; border-radius:5px; cursor:pointer; letter-spacing:.09em; }
      #shellBar button:hover{ background:rgba(143,245,255,.14); color:#dff4ff; }
      #shellBar button.on{ background:#9fd8ff; color:#08101a; }
      #shellBar button.dead{ color:#5b6b7d; cursor:not-allowed; }
      #shellBar button[data-tab="broken"]{ color:#ffb074; margin-left:6px; border-left:1px solid #22344a; border-radius:0 5px 5px 0; }
      #shellBar button[data-tab="broken"].on{ background:#ffb074; color:#1a1008; }
      #shellSheet{ position:fixed; top:${CFG.BAR_H}px; left:50%; transform:translateX(-50%); z-index:59; width:min(980px,94vw); max-height:74vh; overflow:auto;
        background:rgba(8,14,22,.97); border:1px solid #33465e; border-top:0; border-radius:0 0 10px 10px; color:#dbe7f1;
        font:12px/1.45 'Segoe UI',system-ui,sans-serif; box-shadow:0 10px 34px rgba(0,0,0,.6); }
      #shellSheet .shPad{ padding:12px 16px 18px; }
      #shellSheet .shHead{ display:flex; align-items:baseline; gap:12px; border-bottom:1px solid #22344a; padding-bottom:7px; margin-bottom:8px; }
      #shellSheet .shHead b{ color:#ffb074; letter-spacing:.1em; } #shellSheet .shHead span{ opacity:.6; font-size:11px; }
      #shellSheet .shX{ margin-left:auto; background:transparent; border:1px solid #33465e; color:#9fd8ff; border-radius:4px; cursor:pointer; padding:2px 8px; }
      #shellSheet .shNote{ opacity:.62; margin:0 0 10px; max-width:78ch; }
      #shellSheet h5{ margin:14px 0 5px; font-size:11px; letter-spacing:.1em; color:#9fd8ff; font-weight:600; }
      #shellSheet .shRow{ display:grid; grid-template-columns:58px 128px 1fr 30ch; gap:8px; padding:4px 6px; border-radius:4px; align-items:baseline; }
      #shellSheet .shRow:nth-child(odd){ background:rgba(255,255,255,.03); }
      #shellSheet .shId{ font-variant-numeric:tabular-nums; opacity:.55; } #shellSheet .shEpic{ font-size:10px; letter-spacing:.06em; opacity:.5; }
      #shellSheet .shTest{ font-size:11px; opacity:.55; }
      #shellSheet .shRow.dep .shStory{ color:#c9a6ff; } #shellSheet .shRow.part .shStory{ color:#ffd479; } #shellSheet .shRow.miss .shStory{ opacity:.75; }
      #shellSheet .shBtns{ display:flex; gap:8px; margin-top:7px; }
      #shellSheet .shBtns button{ background:#2a2040; color:#c9a6ff; border:1px solid #6a4fa0; border-radius:4px; padding:5px 10px; cursor:pointer; font:inherit; }
      @media (max-width:820px){ #shellSheet .shRow{ grid-template-columns:52px 1fr; } #shellSheet .shEpic,#shellSheet .shTest{ display:none; } }`;
    document.head.appendChild(st); document.body.appendChild(bar); document.body.appendChild(sheet);
    bar.querySelectorAll('button[data-tab]').forEach(b=>b.onclick=()=>{ const t=TABS.find(x=>x.id===b.dataset.tab);
      if(!t.live()){ if(typeof term==='function') term(`${t.t} is not available - its module did not load`,'err'); return; }
      if(!t.sheet) closeSheet(); t.go(); paint(); });
    fetch(CFG.STATUS_URL).then(r=>r.ok?r.json():Promise.reject(new Error('status '+r.status)))
      .then(j=>{ model=j; if(openTab==='broken') renderSheet(); })
      .catch(e=>{ model=null; if(sheet&&!sheet.hidden) sheet.innerHTML=`<div class="shPad">the use-case model did not load (${esc(e.message)}) - run <code>py tools/uml_js.py</code> to regenerate uml/status.json</div>`; });
    paint();
  }
  window.SHELL={ build, open:toggleSheet, close:closeSheet, tabs:()=>TABS.map(t=>({id:t.id,title:t.t,live:t.live()})), model:()=>model, CFG };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
