// panels.js - THE WINDOW STANDARD (user 2026-07-07): "make the market window have a slide in and out pin, same
// as chat... semi-transparent so I can drive... a window standard to have them slide to the sides or top so we
// can have them not overlap... user don't know to hit M to lose the menu... a slider for the transparency top-right".
//
// A small reusable chrome layer applied to EXISTING panel elements (market, terminal/"chat") - no new wrapper
// nodes, no game-logic changes. Each registered panel gets, as an appended child (so it survives the panel's own
// innerHTML rebuilds only if we target the RIGHT node - callers must register the OUTER persistent element, not
// one that gets replaced wholesale):
//   - a PIN toggle: pinned = stays open until you close it; unpinned = auto-hides a moment after your mouse
//     leaves (the standard IDE "auto-hide docked panel" pattern) and slides back on hover/click of its edge tab.
//   - an always-visible EDGE TAB (title + chevron) so closing/opening never depends on knowing a hotkey - this
//     directly fixes "user don't know to hit M".
//   - a small opacity slider, top-right, so a panel that "takes up a lot of screen" can be driven through.
//   - slide in/out via transform (an edge: 'top'|'bottom'|'left'|'right' - the direction it slides toward when
//     hidden), and a same-edge STACKING reflow so multiple panels never overlap (offsets accumulate along the
//     cross-axis) - the "standard" multiple windows share, extensible to future panels.
// Persists {pinned, open, opacity} per id to localStorage (lazy load once, save on change - never wipes).
'use strict';
(function(){
const CFG = {
  STORE_KEY:'SF_PANELS_v1',
  AUTO_HIDE_MS:1600,           // unpinned: delay after mouseleave before sliding away
  SLIDE_MS:320,                // slide transition duration
  GAP:8,                       // px between stacked panels on the same edge
  OP_MIN:0.16, OP_MAX:0.97, OP_STEP:0.01, TEXT_OP_FLOOR:0.38,   // TEXT_OP_FLOOR: the text fades with the same slider but never past this, so a panel dragged to minimum still has a way back
  TAB_W:118, TAB_H:20,         // edge pull-tab footprint
  Z:6,                         // header/tab layer (panels themselves already sit at the game's own z-index)
};
const COL={ cyan:'#46d6ff', ink:'#080a10', txt:'#cfe2f5', dim:'#6f88a4', border:'#22344a' };

let store={};
function load(){ try{ store=JSON.parse(localStorage.getItem(CFG.STORE_KEY)||'{}'); }catch(e){ store={}; } }
let saveT=null;
function save(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem(CFG.STORE_KEY, JSON.stringify(store)); }catch(e){} }, 200); }
load();

if(!document.getElementById('pnl-style')){
  const st=document.createElement('style'); st.id='pnl-style';
  st.textContent=
    // ctl is position:FIXED and appended to <body> (not a child of the panel) - a panel with overflow-y:auto
    // (the terminal) would otherwise drag an absolutely-positioned child along as its log content scrolls.
    '.pnl-ctl{ position:fixed; display:flex; gap:5px; align-items:center; z-index:'+(CFG.Z+1)+'; pointer-events:auto; }'+
    '.pnl-btn{ font:700 10px/1 ui-monospace,monospace; color:'+COL.dim+'; background:#0c1623dd; border:1px solid '+COL.border+'; border-radius:5px; width:20px; height:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }'+
    '.pnl-btn:hover{ color:'+COL.txt+'; border-color:#3a567a; }'+
    '.pnl-btn.on{ color:'+COL.cyan+'; border-color:'+COL.cyan+'; }'+
    '.pnl-op{ width:46px; height:12px; cursor:pointer; accent-color:'+COL.cyan+'; }'+
    '.pnl-tab{ position:fixed; z-index:'+(CFG.Z+1)+'; font:700 9.5px/1 ui-monospace,monospace; letter-spacing:.06em; color:'+COL.dim+';'+
      ' background:#0c1623ee; border:1px solid '+COL.border+'; border-radius:6px; padding:4px 9px; cursor:pointer; pointer-events:auto; white-space:nowrap; user-select:none; transition:color .15s,border-color .15s; }'+
    '.pnl-tab:hover{ color:'+COL.txt+'; border-color:#3a567a; }'+
    '.pnl-tab .pnl-pinned{ color:'+COL.cyan+'; }';
  document.head.appendChild(st);
}

const PANELS_={};                       // id -> record
const EDGE_MEMBERS={ top:[], bottom:[], left:[], right:[] };

function clamp01(v){ return Math.max(CFG.OP_MIN, Math.min(CFG.OP_MAX, v)); }
function rgba(rgb,a){ return 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+a+')'; }

function closedTransform(edge, centerX){
  const base=centerX?'translateX(-50%) ':'';
  if(edge==='top') return base+'translateY(-140%)';
  if(edge==='bottom') return base+'translateY(140%)';
  if(edge==='left') return 'translateX(-140%)';
  return 'translateX(140%)';                                     // right
}
function openTransform(centerX){ return centerX?'translateX(-50%)':'none'; }

function tabPosition(rec){
  // the tab sits just outside the panel's own footprint on its edge - a fixed, always-findable handle. Vertical
  // (top/bottom edge) position is a CONSTANT so it stays put even while its panel is slid off-screen; horizontal
  // (left/right edge) reads the panel's live top since that's unaffected by its own horizontal slide.
  const r=rec.el.getBoundingClientRect(); const s={};
  if(rec.edge==='top'){ s.top='2px'; s.left=(r.left+r.width/2)+'px'; s.transform='translateX(-50%)'; }
  else if(rec.edge==='bottom'){ s.bottom='2px'; s.left=(r.left+r.width/2)+'px'; s.transform='translateX(-50%)'; }
  else if(rec.edge==='left'){ s.left='2px'; s.top=Math.max(4,r.top)+'px'; }
  else { s.right='2px'; s.top=Math.max(4,r.top)+'px'; }
  return s;
}
function ctlPosition(rec){
  // top-right corner of the panel's OWN current rect (only meaningful while open - hidden otherwise).
  const r=rec.el.getBoundingClientRect();
  return { top:(r.top+4)+'px', left:'', right:(window.innerWidth-r.right+6)+'px' };
}

function textOpacityFor(v){   // user 2026-07-07: "we want the text to be semi-transparent as well based on that slider" - tracks the same slider, with a soft floor (TEXT_OP_FLOOR) so a panel dragged to minimum never becomes fully unreadable/stuck.
  const frac=(clamp01(v)-CFG.OP_MIN)/(CFG.OP_MAX-CFG.OP_MIN||1);
  return CFG.TEXT_OP_FLOOR+frac*(1-CFG.TEXT_OP_FLOOR); }
function applyVisual(rec){
  rec.el.style.transition='transform '+CFG.SLIDE_MS+'ms ease, opacity .18s ease';
  rec.el.style.transform = rec.open ? openTransform(rec.centerX) : closedTransform(rec.edge, rec.centerX);
  rec.el.style.backgroundColor = rgba(rec.rgb, rec.opacity);
  rec.el.style.opacity = textOpacityFor(rec.opacity);   // fades the panel's OWN text/content - the header controls (.pnl-ctl/.pnl-tab) live outside `el` so they stay fully legible
  const chev = rec.edge==='top'?(rec.open?'▴':'▾') : rec.edge==='bottom'?(rec.open?'▾':'▴') : rec.edge==='left'?(rec.open?'◂':'▸') : (rec.open?'▸':'◂');
  rec.tab.innerHTML = rec.title+' '+chev+(rec.pinned?' <span class="pnl-pinned">● pinned</span>':'');
  rec.pinBtn.classList.toggle('on', rec.pinned);
  rec.pinBtn.textContent = rec.pinned ? '📌' : '📍';   // filled pin (pinned) vs outline-ish (unpinned) - both render fine, distinct glyphs
  const t=tabPosition(rec); rec.tab.style.top=t.top||''; rec.tab.style.bottom=t.bottom||''; rec.tab.style.left=t.left||''; rec.tab.style.right=t.right||''; rec.tab.style.transform=t.transform||'';
  rec.ctl.style.display = rec.open ? 'flex' : 'none';
  if(rec.open){ const c=ctlPosition(rec); rec.ctl.style.top=c.top; rec.ctl.style.right=c.right; }
}

function persist(rec){ store[rec.id]={pinned:rec.pinned, open:rec.open, opacity:rec.opacity}; save(); }

function armAutoHide(rec){
  clearTimeout(rec.hideT);
  if(rec.pinned || !rec.open) return;
  rec.hideT=setTimeout(()=>{
    if(rec.pinned) return;
    if(rec.keepOpenWhile && rec.keepOpenWhile()) { armAutoHide(rec); return; }   // e.g. the chat input still has focus
    if(rec.hovering) return;                                                     // still under the mouse - recheck won't fire til leave
    setOpen(rec, false);
  }, CFG.AUTO_HIDE_MS);
}

function setOpen(rec, open){
  rec.open=open; applyVisual(rec); persist(rec); reflowEdge(rec.edge);
  if(rec.onOpenChange) try{ rec.onOpenChange(open); }catch(e){}
  if(open && !rec.pinned) armAutoHide(rec);
}
function setPinned(rec, pinned){
  rec.pinned=pinned; applyVisual(rec); persist(rec);
  if(pinned) clearTimeout(rec.hideT); else if(rec.open) armAutoHide(rec);
}
function setOpacity(rec, v){ rec.opacity=clamp01(v); rec.el.style.backgroundColor=rgba(rec.rgb,rec.opacity); rec.el.style.opacity=textOpacityFor(rec.opacity); persist(rec); }

function reflowEdge(edge){
  // STACKING: open panels sharing an edge offset along the cross-axis so they never overlap - the "window
  // standard" the user asked for. With one panel per edge today this is a no-op; it's ready for more.
  const members=EDGE_MEMBERS[edge].filter(r=>r.open);
  let cross=CFG.GAP;
  for(const rec of members){
    const r=rec.el.getBoundingClientRect();
    if(edge==='top'||edge==='bottom') rec.el.style.setProperty('--pnl-stack', cross+'px');
    else rec.el.style.setProperty('--pnl-stack', cross+'px');
    cross += (edge==='top'||edge==='bottom' ? r.width : r.height) + CFG.GAP;
  }
}

// -------------------------------------------------------------------------------------------------------------
// register(id, el, opts) - el must be a persistent element (never wholesale innerHTML-replaced by the caller;
// content that DOES get rebuilt should live in a child, e.g. #marketBody inside #market).
// opts: {title, edge:'top'|'bottom'|'left'|'right', centerX, rgb:[r,g,b], defaultOpacity, defaultOpen,
//        defaultPinned, hotkeyLabel, onOpenChange(open), keepOpenWhile()->bool}
// -------------------------------------------------------------------------------------------------------------
function register(id, el, opts){
  opts=opts||{}; if(!el) return null;
  const saved=store[id]||{};
  const rec={ id, el, edge:opts.edge||'top', centerX:!!opts.centerX, rgb:opts.rgb||[9,17,27], title:opts.title||id,
    open: saved.open!=null?saved.open:(opts.defaultOpen!==false), pinned: saved.pinned!=null?saved.pinned:(opts.defaultPinned!==false),
    opacity: clamp01(saved.opacity!=null?saved.opacity:(opts.defaultOpacity!=null?opts.defaultOpacity:0.88)),
    onOpenChange:opts.onOpenChange||null, keepOpenWhile:opts.keepOpenWhile||null, hovering:false, hideT:null };

  el.style.pointerEvents='auto';
  const body=document.body||document.documentElement;
  const ctl=document.createElement('div'); ctl.className='pnl-ctl'; body.appendChild(ctl);           // fixed + body-level: immune to el's own scroll/slide
  const pinBtn=document.createElement('button'); pinBtn.className='pnl-btn'; pinBtn.title='pin (stay open) / unpin (auto-hide when idle)';
  const op=document.createElement('input'); op.type='range'; op.className='pnl-op'; op.min=CFG.OP_MIN; op.max=CFG.OP_MAX; op.step=CFG.OP_STEP; op.title='transparency';
  const xBtn=document.createElement('button'); xBtn.className='pnl-btn'; xBtn.textContent='✕'; xBtn.title='close (tab stays to reopen)'+(opts.hotkeyLabel?(' · key '+opts.hotkeyLabel):'');
  ctl.appendChild(pinBtn); ctl.appendChild(op); ctl.appendChild(xBtn);
  rec.ctl=ctl; rec.pinBtn=pinBtn; rec.opInput=op; op.value=rec.opacity;

  const tab=document.createElement('div'); tab.className='pnl-tab'; body.appendChild(tab);
  rec.tab=tab;

  pinBtn.onclick=(e)=>{ e.stopPropagation(); setPinned(rec, !rec.pinned); };
  xBtn.onclick=(e)=>{ e.stopPropagation(); setOpen(rec, false); };
  op.addEventListener('input', ()=>setOpacity(rec, parseFloat(op.value)));
  tab.onclick=()=>setOpen(rec, !rec.open);
  const stayAwake=()=>{ rec.hovering=true; clearTimeout(rec.hideT); };
  const mayDoze=()=>{ rec.hovering=false; if(rec.open&&!rec.pinned) armAutoHide(rec); };
  el.addEventListener('mouseenter',stayAwake); el.addEventListener('mouseleave',mayDoze);
  tab.addEventListener('mouseenter',stayAwake); tab.addEventListener('mouseleave',mayDoze);
  ctl.addEventListener('mouseenter',stayAwake); ctl.addEventListener('mouseleave',mayDoze);   // the controls float outside `el` now - count hovering them too

  PANELS_[id]=rec; (EDGE_MEMBERS[rec.edge]=EDGE_MEMBERS[rec.edge]||[]).push(rec);
  applyVisual(rec); reflowEdge(rec.edge);
  if(rec.onOpenChange) try{ rec.onOpenChange(rec.open); }catch(e){}   // sync callers (e.g. marketOn) to a state RESTORED from a prior session, not just the default
  if(rec.open && !rec.pinned) armAutoHide(rec);
  if(!retickT) retickT=setInterval(retickTabs, 450);            // follows size changes from OUTSIDE our API (e.g. the ticker's own .big toggle)
  return rec;
}
let retickT=null;
function retickTabs(){ for(const id in PANELS_){ const rec=PANELS_[id]; const t=tabPosition(rec);
  rec.tab.style.top=t.top||''; rec.tab.style.bottom=t.bottom||''; rec.tab.style.left=t.left||''; rec.tab.style.right=t.right||''; rec.tab.style.transform=t.transform||'';
  if(rec.open){ const c=ctlPosition(rec); rec.ctl.style.top=c.top; rec.ctl.style.right=c.right; } } }

function open(id){ const r=PANELS_[id]; if(r) setOpen(r,true); }
function close(id){ const r=PANELS_[id]; if(r) setOpen(r,false); }
function toggle(id){ const r=PANELS_[id]; if(r) setOpen(r,!r.open); return r?r.open:null; }
function isOpen(id){ const r=PANELS_[id]; return r?r.open:null; }
function reflowAll(){ for(const e of Object.keys(EDGE_MEMBERS)) reflowEdge(e); }
addEventListener('resize', ()=>{ for(const id in PANELS_) applyVisual(PANELS_[id]); reflowAll(); });

const api={ register, open, close, toggle, isOpen, reflow:reflowAll };
if(typeof window!=='undefined') window.PANELS=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
