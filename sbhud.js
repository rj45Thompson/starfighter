// sbhud.js - the STARBLAST strip (STARBLAST_REQ.md SB3/SB4/SB5/SB14, 2026-09-06): the gem bar, the banked upgrade
// points, the eight stat rows with their key hints, and the TIER-UP card when the ship is maxed. Reads HOST.sb(),
// spends through HOST.spendStat / HOST.takeTierUp - no game state of its own. Registered with PANELS like every
// other window (opacity / hide / dock all shared).
(function(){
  const CFG={ TICK_MS:250, FLASH_MS:900, EDGE:'bottom', RGB:[10,22,30], DEFAULT_OPACITY:0.86 };
  let el=null, body=null, flashUntil=0, lastKey='', tierEl=null;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  function pips(lv,max){ let s=''; for(let i=0;i<max;i++) s+=`<i class="${i<lv?'on':''}"></i>`; return `<span class="sbPips">${s}</span>`; }
  function render(){
    if(!window.HOST||!HOST.sb) return; const d=HOST.sb(); if(!d) return;
    const pct=Math.max(0,Math.min(100,100*d.bar/d.barMax));
    const key=[Math.round(pct),d.pts,d.order.map(k=>d.stat[k]).join(''),d.tierReady?1:0,d.hull,performance.now()<flashUntil?1:0,(d.kills||[]).length,(d.kills||[])[0]&&d.kills[0].t].join('|');
    if(key===lastKey) return; lastKey=key;
    const rows=d.order.map((k,i)=>`<div class="sbRow${d.stat[k]>=d.statMax?' max':''}${d.pts>0&&d.stat[k]<d.statMax?' can':''}" data-k="${k}" title="press ${i+1} or click to spend a point">
        <b>${i+1}</b><span class="sbName">${esc(d.label[k])}</span>${pips(d.stat[k],d.statMax)}<span class="sbMult">×${d.mult[k].toFixed(2)}</span></div>`).join('');
    const feed=(d.kills&&d.kills.length)?`<div class="sbFeed">${d.kills.map(k=>`<div class="sbKill${k.mine?' mine':''}${k.yours?' yours':''}">${k.killer?esc(k.killer):'something'} <span>destroyed</span> ${esc(k.victim)}</div>`).join('')}</div>`:'';
    const tier=d.tierReady?`<div class="sbTier"><div class="sbTierT">⬆ TIER UP READY</div><div>every stat is maxed and a point is banked - take the next hull, here in space</div>
        <button class="sbTake" data-hull="${esc(d.nextHull)}">TAKE <b>${esc(d.nextHullName)}</b> · tier ${d.tier+1}</button><div class="sbTierS">${esc(d.nextHullDesc||'')}</div></div>`:'';
    body.innerHTML=`<div class="sbTop"><span class="sbHull">${esc(d.hullName)} <em>tier ${d.tier}</em></span><span class="sbPts">${d.pts} point${d.pts===1?'':'s'}</span></div>
      <div class="sbBar${performance.now()<flashUntil?' flash':''}"><div class="sbFill" style="width:${pct.toFixed(1)}%"></div><span>GEM BAR ${Math.round(pct)}%</span></div>
      ${rows}${tier}${feed}<div class="sbHint">mine gems → the bar fills → a full bar banks a point → <b>1-8</b> spend it · max all eight for the next tier</div>`;
  }
  function onClick(e){
    const row=e.target.closest('.sbRow'); if(row&&window.HOST&&HOST.spendStat){ const r=HOST.spendStat(row.dataset.k); if(r&&!r.ok&&window.HOST.term) HOST.term('◆ '+r.msg,'sys'); lastKey=''; render(); return; }
    const take=e.target.closest('.sbTake'); if(take&&window.HOST&&HOST.takeTierUp){ const r=HOST.takeTierUp(take.dataset.hull); if(r&&!r.ok&&window.HOST.term) HOST.term('◆ '+r.msg,'sys'); lastKey=''; render(); }
  }
  function init(){
    if(el) return; el=document.createElement('div'); el.id='sbhud'; el.innerHTML='<div id="sbhudBody"></div>'; document.body.appendChild(el); body=el.firstChild;
    const st=document.createElement('style'); st.textContent=`
      #sbhud{ font:12px/1.35 'Segoe UI',system-ui,sans-serif; color:#dbe7f1; width:262px; padding:8px 10px 6px; box-sizing:border-box; }
      #sbhud .sbTop{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; }
      #sbhud .sbHull{ font-weight:600; letter-spacing:.04em; text-transform:uppercase; font-size:11px; color:#9fd8ff; } #sbhud .sbHull em{ font-style:normal; opacity:.6; margin-left:4px; text-transform:none; }
      #sbhud .sbPts{ font-variant-numeric:tabular-nums; color:#ffd479; font-weight:600; }
      #sbhud .sbBar{ position:relative; height:14px; border:1px solid rgba(160,220,255,.35); border-radius:3px; overflow:hidden; background:rgba(0,0,0,.35); margin-bottom:6px; }
      #sbhud .sbFill{ position:absolute; inset:0 auto 0 0; background:linear-gradient(90deg,#3ed6a2,#8ff5ff); transition:width .25s; }
      #sbhud .sbBar span{ position:absolute; inset:0; text-align:center; font-size:10px; line-height:14px; letter-spacing:.08em; color:#fff; text-shadow:0 0 3px #000; }
      #sbhud .sbBar.flash{ box-shadow:0 0 10px #8ff5ff; }
      #sbhud .sbRow{ display:grid; grid-template-columns:14px 82px 1fr 40px; align-items:center; gap:4px; padding:2px 3px; border-radius:3px; cursor:default; }
      #sbhud .sbRow.can{ cursor:pointer; } #sbhud .sbRow.can:hover{ background:rgba(143,245,255,.12); }
      #sbhud .sbRow.max .sbName{ color:#ffd479; }
      #sbhud .sbRow b{ color:#8ff5ff; font-variant-numeric:tabular-nums; } #sbhud .sbName{ font-size:10px; letter-spacing:.05em; }
      #sbhud .sbPips{ display:flex; gap:2px; } #sbhud .sbPips i{ display:block; width:9px; height:8px; border:1px solid rgba(160,220,255,.4); border-radius:1px; }
      #sbhud .sbPips i.on{ background:#5ee6a8; border-color:#5ee6a8; }
      #sbhud .sbMult{ text-align:right; font-variant-numeric:tabular-nums; opacity:.7; font-size:10px; }
      #sbhud .sbTier{ margin-top:6px; padding:6px 7px; border:1px solid #ffd479; border-radius:4px; background:rgba(255,212,121,.08); }
      #sbhud .sbTierT{ color:#ffd479; font-weight:700; letter-spacing:.06em; } #sbhud .sbTierS{ opacity:.65; font-size:10px; margin-top:3px; }
      #sbhud .sbTake{ margin-top:5px; width:100%; padding:5px; background:#ffd479; color:#1a1a1a; border:0; border-radius:3px; font-weight:700; cursor:pointer; }
      #sbhud .sbFeed{ margin-top:5px; border-top:1px solid rgba(160,220,255,.18); padding-top:4px; display:flex; flex-direction:column; gap:1px; }
      #sbhud .sbKill{ font-size:10px; opacity:.72; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #sbhud .sbKill span{ opacity:.5; } #sbhud .sbKill.mine{ color:#5ee6a8; opacity:1; } #sbhud .sbKill.yours{ color:#ff8a8a; opacity:1; }
      #sbhud .sbHint{ margin-top:5px; opacity:.5; font-size:10px; line-height:1.3; }`;
    document.head.appendChild(st);
    el.addEventListener('click',onClick);
    if(window.PANELS&&PANELS.register) PANELS.register('sbhud', el, { title:'UPGRADES', edge:CFG.EDGE, rgb:CFG.RGB, defaultOpacity:CFG.DEFAULT_OPACITY, hotkeyLabel:'1-8' });
    setInterval(render, CFG.TICK_MS); render();
  }
  window.SBHUD={ init, refresh:()=>{ lastKey=''; render(); }, flash:()=>{ flashUntil=performance.now()+CFG.FLASH_MS; lastKey=''; render(); }, offerTier:()=>{ lastKey=''; render(); }, CFG };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
