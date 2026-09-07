// guide.js - F58: a GUIDED OPENING that walks a first-time player through the core loop, live.
// The FIRST FLIGHT card (index.html:3322 controlCardHtml) NAMES the loop once - "Shoot a rock ...
// collect them ... a full bar buys an upgrade" - then vanishes. The 8/8 genre anchors instead GUIDE
// you through it (Freelancer escort, Elite tutorial, EV Nova mentor, X scenarios). This is that: a
// tiny HUD banner that advances step-by-step as the player actually does each action, driven by the
// game via window.GUIDE.hit('collect'|'bank'|'upgrade') from the REAL loop functions (gemBarAdd /
// spendStat in index.html). It reuses those clean, already-player-gated hooks - no fuzzy detection.
//
// FIRST-RUN ONLY + dismissible: shows only for a brand-new player (no SF_SAVE_v1 save AND not already
// seen), sets SF_GUIDE_v1 the moment it finishes or is skipped, and never appears again. An existing
// player (who has a save) never sees it. Self-contained: one new file + a <script> tag + three
// one-line hook taps; nothing else in the game changes.
'use strict';
(function(){
  var SEEN_KEY='SF_GUIDE_v1', SAVE_KEY='SF_SAVE_v1';
  function seen(){ try{ return !!localStorage.getItem(SEEN_KEY); }catch(e){ return false; } }
  function markSeen(){ try{ localStorage.setItem(SEEN_KEY,'1'); }catch(e){} }
  function hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
  // ordered: each step advances only on ITS OWN event, so out-of-order gem pickups before the bar
  // fills just wait at 'bank'. Text mirrors the FIRST FLIGHT card's own wording.
  var STEPS=[
    { id:'collect', n:'Shoot a rock, then scoop the gems it spills', sub:'hold Fire on a rock - it splits and drops gems; fly through them to collect' },
    { id:'bank',    n:'Keep collecting to fill the GEM BAR', sub:'a full bar banks an upgrade point (watch the bar climb)' },
    { id:'upgrade', n:'Press 1-8 to spend the point on an upgrade', sub:"that's the whole loop - mine, collect, upgrade" },
  ];
  var cur=-1, el=null, doneT=null;
  function build(){
    if(el||!document.body) return;
    if(!document.getElementById('sf-guide-style')){
      var st=document.createElement('style'); st.id='sf-guide-style'; st.textContent=
        '#sfGuide{position:fixed;left:50%;top:54px;transform:translateX(-50%);z-index:5;max-width:min(92vw,560px);'+
        'background:#0b1524ee;border:1px solid #2b6fb0;border-radius:8px;padding:8px 12px;color:#cfe2f5;'+
        'font:600 12px/1.35 ui-monospace,monospace;box-shadow:0 4px 18px #0009;pointer-events:auto}'+
        '#sfGuide .gh{display:flex;align-items:center;gap:8px}'+
        '#sfGuide .gstep{color:#46d6ff;font-weight:700;white-space:nowrap}'+
        '#sfGuide .gx{margin-left:auto;cursor:pointer;color:#6f88a4;border:1px solid #22344a;border-radius:5px;padding:1px 7px;font-weight:700}'+
        '#sfGuide .gx:hover{color:#cfe2f5;border-color:#3a567a}'+
        '#sfGuide .gsub{color:#8fb0d0;font-weight:400;margin-top:3px;font-size:11px}'+
        '#sfGuide .gdone{color:#7fe0a0}';
      document.head.appendChild(st);
    }
    el=document.createElement('div'); el.id='sfGuide'; document.body.appendChild(el);
  }
  function render(){
    if(!el) return;
    if(cur<0){ el.style.display='none'; return; }
    el.style.display='block';
    if(cur>=STEPS.length){
      el.innerHTML='<div class="gh"><span class="gstep gdone">&#10003; You\'ve got the loop</span><span class="gx" id="sfGuideX">dismiss</span></div>'+
        '<div class="gsub">mine, collect, upgrade - the rest is yours. The <b>?</b> button (bottom-right) brings the controls back any time.</div>';
    } else {
      var s=STEPS[cur];
      el.innerHTML='<div class="gh"><span class="gstep">STEP '+(cur+1)+'/'+STEPS.length+'</span><span>'+s.n+'</span><span class="gx" id="sfGuideX" title="skip the guide">skip</span></div>'+
        '<div class="gsub">'+s.sub+'</div>';
    }
    var x=document.getElementById('sfGuideX'); if(x) x.onclick=function(e){ e.stopPropagation(); finish(); };
  }
  function finish(){ cur=-2; markSeen(); if(doneT){ clearTimeout(doneT); doneT=null; } if(el) el.style.display='none'; }
  function hit(id){
    if(cur<0 || cur>=STEPS.length) return;      // inactive, or already finished
    if(STEPS[cur].id!==id) return;              // only the CURRENT ordered step advances
    cur++;
    render();
    if(cur>=STEPS.length){ markSeen(); doneT=setTimeout(finish, 7000); }   // hold the "done" banner briefly, then auto-dismiss
  }
  function boot(){
    if(cur!==-1) return;                         // boot once
    if(seen()||hasSave()) return;                // returning player, or already guided
    build(); if(!el) return; cur=0; render();
  }
  window.GUIDE={ hit:hit, boot:boot, finish:finish, _state:function(){ return { cur:cur, seen:seen(), visible: !!(el&&el.style.display!=='none'), steps:STEPS.length }; } };
  if(document.readyState!=='loading') boot(); else addEventListener('DOMContentLoaded', boot);
})();
