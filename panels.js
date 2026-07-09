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
// ANDROID/TOUCH FIX (user 2026-07-08 "fix the panels for android"): the auto-hide-when-idle behavior below is
// entirely mouseenter/mouseleave-driven - a desktop-only "IDE hover" affordance. Touch has no hover state at all,
// so on a phone an unpinned panel's hide timer starts the instant it opens and is NEVER refreshed (tapping inside
// it doesn't fire mouseenter), meaning it slides away ~1.6s after opening even while you're still tapping around
// in it. Same IS_TOUCH formula index.html already uses (kept independent - this file stays self-contained).
const IS_TOUCH = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window);
const CFG = {
  STORE_KEY:'SF_PANELS_v2',   // bumped v1->v2 (user 2026-07-07 "i don't see the xwing bars"): powerpanel's defaultOpen flipped false->true, but anyone who'd already loaded the earlier build has a saved open:false for it that would otherwise outrank the new default forever - same fix as the PASSENGER_STATE_v1->v2 bump for the intro story
  AUTO_HIDE_MS:1600,           // unpinned: delay after mouseleave before sliding away
  SLIDE_MS:320,                // slide transition duration
  GAP:8,                       // px between stacked panels on the same edge
  OP_MIN:0.16, OP_MAX:0.97, OP_STEP:0.01, TEXT_OP_FLOOR:0.38,   // TEXT_OP_FLOOR: the text fades with the same slider but never past this, so a panel dragged to minimum still has a way back
  CHROME_RESERVE:24,   // user report "the terminal pinned box seems to overlap the parasite tab": the ctl cluster/tab float AT the panel's own top corner, which collided with the panel's OWN header content (market's title, the ticker's PARASITE/TERMINAL/... row) - reserving this much top padding on every registered panel gives the chrome a real strip instead of sitting on top of the content
  TAB_W:118, TAB_H:20,         // edge pull-tab footprint
  Z:6,                         // header/tab layer (panels themselves already sit at the game's own z-index)
  RESIZE_GRIP:16,              // resize-handle footprint (user 2026-07-08: "make the terminal sizable and it should not change size unless I size it")
  RESIZE_MIN_W:220, RESIZE_MIN_H:120,
};
const COL={ cyan:'#46d6ff', ink:'#080a10', txt:'#cfe2f5', dim:'#6f88a4', border:'#22344a' };

let store={};
function load(){ try{ store=JSON.parse(localStorage.getItem(CFG.STORE_KEY)||'{}'); }catch(e){ store={}; } }
let saveT=null;
function save(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem(CFG.STORE_KEY, JSON.stringify(store)); }catch(e){} }, 200); }
load();
// ONE-TIME MIGRATION (user 2026-07-08 "the knowledge graph hud got stuck pinned"): khud/powerpanel's register()
// call didn't pass defaultPinned before, so both defaulted pinned:true - combined with their now-fixed legacy
// display:none close buttons, that produced the stuck-pinned bug. Fixing the DEFAULT only helps a FRESH
// registration though; anyone who already has pinned:true saved (as this user does) has it outrank the new
// default forever, same class of problem CFG.STORE_KEY's v1->v2 bump solved for powerpanel's defaultOpen. A full
// key bump would also wipe unrelated saved state (e.g. the ticker's manually-dragged w/h) that has nothing to do
// with this bug, so migrate just these two ids' `pinned` flag once, flagged so a deliberate re-pin afterward sticks.
if(!store.__migratedDefaultPinned2026_07_08){
  for(const id of ['khud','powerpanel']){ if(store[id]) store[id].pinned=false; }
  store.__migratedDefaultPinned2026_07_08=true; save();
}
// SECOND MIGRATION (user 2026-07-08 "the power window is stuck when you close it"): the one above force-unpinned
// powerpanel, which turned out to be the wrong call for it specifically - unpinned means it auto-hides ~1.6s after
// opening whenever the mouse isn't over it, which for a combat HUD read WHILE FLYING (not hovering with a mouse)
// is exactly "keeps closing on its own." powerpanel's registration now omits defaultPinned again (pinned by
// default, like market/roster/ticker) - but anyone who already ran the migration above has pinned:false SAVED,
// which would silently outrank that reverted default forever, same recurring class of bug. khud is deliberately
// NOT touched here - auto-hide genuinely is correct for that one (a secondary/debug view, not read mid-flight).
if(!store.__migratedPowerpanelRepin2026_07_08){
  if(store.powerpanel){ store.powerpanel.pinned=true; store.powerpanel.open=true; }   // also force back OPEN, not just pinned - anyone hitting this bug almost certainly has it saved closed from the auto-hide cycle, and the whole point of this panel is defaultOpen:true
  store.__migratedPowerpanelRepin2026_07_08=true; save();
}

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
    '.pnl-tab .pnl-pinned{ color:'+COL.cyan+'; }'+
    '.pnl-grip{ position:fixed; z-index:'+(CFG.Z+1)+'; width:'+CFG.RESIZE_GRIP+'px; height:'+CFG.RESIZE_GRIP+'px; cursor:nwse-resize; pointer-events:auto;'+
      ' background:linear-gradient(135deg,transparent 0%,transparent 45%,'+COL.border+' 45%,'+COL.border+' 55%,transparent 55%,transparent 100%),'+
      'linear-gradient(135deg,transparent 0%,transparent 65%,'+COL.border+' 65%,'+COL.border+' 75%,transparent 75%,transparent 100%); border-radius:0 0 6px 0; }'+
    '.pnl-grip:hover{ background-color:'+COL.cyan+'22; }'+
    // ANDROID/TOUCH: the desktop sizes above (20x18 buttons, 16x16 grip) are well under a comfortable touch
    // target (~40px+) - fine for a mouse pointer, fiddly for a fingertip. `pointer:coarse` is the standard signal
    // for "primary input is imprecise" and degrades gracefully on hybrid devices (a touchscreen laptop with a
    // mouse plugged in still gets the small desktop sizing once the mouse is the active pointer).
    '@media (pointer:coarse){'+
      '.pnl-btn{ width:34px; height:30px; font-size:13px; }'+
      '.pnl-op{ width:70px; height:20px; }'+
      '.pnl-tab{ padding:8px 14px; font-size:12px; }'+
      '.pnl-grip{ width:28px; height:28px; }'+
    '}';
  document.head.appendChild(st);
}

const PANELS_={};                       // id -> record
const EDGE_MEMBERS={ top:[], bottom:[], left:[], right:[] };

function clamp01(v){ return Math.max(CFG.OP_MIN, Math.min(CFG.OP_MAX, v)); }
function rgba(rgb,a){ return 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+a+')'; }
// RESIZE (user 2026-07-08: "make the terminal sizable and it should not change size unless I size it") - once a
// panel is manually resized it becomes a FIXED w/h box (maxWidth/maxHeight cleared so nothing else - a content
// reflow, the ticker's own .big toggle, a CSS breakpoint - can silently override the size you picked).
function applyStoredSize(el, w, h){ el.style.width=w+'px'; el.style.maxWidth='none'; el.style.height=h+'px'; el.style.maxHeight='none'; }
// user 2026-07-08 "the terminal pinning works different than the other windows": not actually the pin/open
// mechanics (verified those match market/roster exactly) - the real inconsistency is the ticker's OWN pre-existing
// `.big` class toggle (Backquote key / tbLog button), which only sets max-width/max-height. Once you drag the NEW
// resize grip, applyStoredSize above sets explicit width/height + maxWidth/maxHeight:none, which silently outranks
// `.big` forever - the legacy toggle looks broken because it is, for anyone who has ever resized the box. Letting
// the `.big` toggle call this first restores "CSS decides the size" so it does something again; the grip remains
// the way to pick an exact custom size afterward.
function clearSize(id){
  const r=PANELS_[id]; if(!r||!r.resizable) return;
  r.el.style.width=''; r.el.style.maxWidth=''; r.el.style.height=''; r.el.style.maxHeight='';
  if(store[id]){ delete store[id].w; delete store[id].h; save(); }
  if(r.open && r.grip) positionGrip(r);
}

// BACKLOG 2026-07-08 "gear-icon options menu with Reset Layout button": wipes every panel's saved
// size/position/pin/opacity preference (the entire STORE_KEY blob, not per-panel) and reloads - the simplest
// reliable way to get back to shipped defaults, since register() already re-derives every default fresh from
// opts whenever nothing is saved. localStorage.removeItem is synchronous (unlike save()'s own 200ms debounce),
// so this is safe to call immediately before a reload with no risk of the clear losing a race with the write.
function resetLayout(){
  try{ localStorage.removeItem(CFG.STORE_KEY); }catch(e){}
  if(typeof location!=='undefined') location.reload();
}

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
  if(rec.grip){ rec.grip.style.display=rec.open?'block':'none'; if(rec.open) positionGrip(rec); }
}
function positionGrip(rec){   // bottom-right corner of the panel's own current rect (only meaningful while open)
  const r=rec.el.getBoundingClientRect();
  // read the grip's OWN rendered size rather than assume CFG.RESIZE_GRIP - the touch media query above enlarges
  // it, and anchoring off the wrong (smaller) constant would leave it hanging partway off the panel's corner.
  const gw=rec.grip.offsetWidth||CFG.RESIZE_GRIP, gh=rec.grip.offsetHeight||CFG.RESIZE_GRIP;
  rec.grip.style.top=(r.bottom-gh)+'px'; rec.grip.style.left=(r.right-gw)+'px';
}

// BUGFIX (found live-testing 2026-07-08 "terminal pinning inconsistent"): this used to REPLACE store[id] wholesale
// on every pin/open/opacity change, silently dropping the resize grip's saved w/h the instant you so much as
// clicked pin or dragged the opacity slider afterward - reproduced live (ticker's saved 663x191 vanished after a
// handful of pin-toggle test clicks). Spreading the previous entry first preserves any field persist() doesn't
// itself own (currently just w/h, whatever a future feature adds too).
function persist(rec){ store[rec.id]={...(store[rec.id]||{}), pinned:rec.pinned, open:rec.open, opacity:rec.opacity}; save(); }

function armAutoHide(rec){
  clearTimeout(rec.hideT);
  if(rec.pinned || !rec.open) return;
  // ANDROID/TOUCH: auto-hide-on-idle is a hover affordance with no touch equivalent - arming it here would just
  // close the panel out from under a touch user with no warning. Touch users open/close explicitly (tab or ✕);
  // the pin button still works exactly the same (still shows "pinned" state, still user-toggleable).
  if(IS_TOUCH) return;
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
  // ANDROID/TOUCH: every panel here defaults to open+pinned (the caller has to opt OUT per-panel, and most don't -
  // see khud/powerpanel above for the only two that do). That's fine on a wide desktop screen where edge panels
  // have room; on a narrow phone every "on by default" panel piles up on top of the others (roster+market+
  // terminal all open+pinned = three overlapping boxes before the player has touched anything). Only touches the
  // FIRST-EVER load (saved.open/pinned stay authoritative the moment a player actually opens/closes/pins anything -
  // this never overrides a real preference, only the un-set initial default) - a phone starts clean, every panel
  // still one tap away on its edge tab exactly as before.
  const touchDefaultOpen = !IS_TOUCH && opts.defaultOpen!==false, touchDefaultPinned = !IS_TOUCH && opts.defaultPinned!==false;
  const rec={ id, el, edge:opts.edge||'top', centerX:!!opts.centerX, rgb:opts.rgb||[9,17,27], title:opts.title||id,
    open: saved.open!=null?saved.open:touchDefaultOpen, pinned: saved.pinned!=null?saved.pinned:touchDefaultPinned,
    opacity: clamp01(saved.opacity!=null?saved.opacity:(opts.defaultOpacity!=null?opts.defaultOpacity:0.88)),
    onOpenChange:opts.onOpenChange||null, keepOpenWhile:opts.keepOpenWhile||null, hovering:false, hideT:null };

  el.style.pointerEvents='auto';
  // BUGFIX (user 2026-07-08: "i pinned the knowledge hud and couldn't unpin it... got stuck pinned"): some panels
  // (knowledge_hud.js, power_panel.js) have their OWN legacy internal close button that sets `display:none` DIRECTLY,
  // left over from before they were wired into this module - this system only ever moves a panel via `transform`
  // (see applyVisual below), so once display:none lands, no amount of pin/unpin/tab-click can bring it back (a
  // transform on a display:none element does nothing). Clearing any stale display here means every panel starts
  // this module's management from a clean, actually-visible baseline, no matter what happened before registration.
  el.style.display='';
  // reserve a strip for the ctl/tab chrome ON TOP OF whatever top padding the panel already had - so its OWN
  // content (market's title row, the ticker's PARASITE/TERMINAL/... tab row) starts BELOW the chrome instead of
  // underneath it. Longhand paddingTop set inline beats the stylesheet's `padding` shorthand for just this one side.
  const existingPadTop=parseFloat(getComputedStyle(el).paddingTop)||0;
  el.style.paddingTop=(existingPadTop+CFG.CHROME_RESERVE)+'px';
  const body=document.body||document.documentElement;
  rec.resizable=!!opts.resizable;
  if(rec.resizable && saved.w!=null && saved.h!=null) applyStoredSize(el, saved.w, saved.h);   // a size you set yourself sticks across reloads - the whole point of the feature
  const ctl=document.createElement('div'); ctl.className='pnl-ctl'; body.appendChild(ctl);           // fixed + body-level: immune to el's own scroll/slide
  const pinBtn=document.createElement('button'); pinBtn.className='pnl-btn'; pinBtn.title='pin (stay open) / unpin (auto-hide when idle)';
  const op=document.createElement('input'); op.type='range'; op.className='pnl-op'; op.min=CFG.OP_MIN; op.max=CFG.OP_MAX; op.step=CFG.OP_STEP; op.title='transparency';
  const xBtn=document.createElement('button'); xBtn.className='pnl-btn'; xBtn.textContent='✕'; xBtn.title='close (tab stays to reopen)'+(opts.hotkeyLabel?(' · key '+opts.hotkeyLabel):'');
  ctl.appendChild(pinBtn); ctl.appendChild(op); ctl.appendChild(xBtn);
  rec.ctl=ctl; rec.pinBtn=pinBtn; rec.opInput=op; op.value=rec.opacity;

  const tab=document.createElement('div'); tab.className='pnl-tab'; body.appendChild(tab);
  rec.tab=tab;

  let grip=null;
  if(rec.resizable){
    grip=document.createElement('div'); grip.className='pnl-grip'; grip.title='drag to resize'; body.appendChild(grip);
    rec.grip=grip;
    let dragging=false, startX=0, startY=0, startW=0, startH=0;
    const onMove=(ev)=>{ if(!dragging) return;
      const x=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX, y=(ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY;
      const w=Math.max(CFG.RESIZE_MIN_W, startW+(x-startX)), h=Math.max(CFG.RESIZE_MIN_H, startH+(y-startY));
      applyStoredSize(el, w, h); positionGrip(rec);
      if(ev.preventDefault) try{ ev.preventDefault(); }catch(e){} };
    const endDrag=()=>{ if(!dragging) return; dragging=false;
      const r=el.getBoundingClientRect(); store[id]=store[id]||{}; store[id].w=Math.round(r.width); store[id].h=Math.round(r.height); save();
      document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',endDrag);
      document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',endDrag); };
    const startDrag=(ev)=>{ dragging=true; const r=el.getBoundingClientRect(); startW=r.width; startH=r.height;
      startX=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX; startY=(ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY;
      document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',endDrag);
      document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',endDrag);
      if(ev.preventDefault) try{ ev.preventDefault(); }catch(e){} };
    grip.addEventListener('mousedown',startDrag); grip.addEventListener('touchstart',startDrag,{passive:false});
  }

  pinBtn.onclick=(e)=>{ e.stopPropagation(); setPinned(rec, !rec.pinned); };
  xBtn.onclick=(e)=>{ e.stopPropagation(); setOpen(rec, false); };
  op.addEventListener('input', ()=>setOpacity(rec, parseFloat(op.value)));
  tab.onclick=()=>setOpen(rec, !rec.open);
  const stayAwake=()=>{ rec.hovering=true; clearTimeout(rec.hideT); };
  const mayDoze=()=>{ rec.hovering=false; if(rec.open&&!rec.pinned) armAutoHide(rec); };
  el.addEventListener('mouseenter',stayAwake); el.addEventListener('mouseleave',mayDoze);
  tab.addEventListener('mouseenter',stayAwake); tab.addEventListener('mouseleave',mayDoze);
  ctl.addEventListener('mouseenter',stayAwake); ctl.addEventListener('mouseleave',mayDoze);   // the controls float outside `el` now - count hovering them too
  if(grip){ grip.addEventListener('mouseenter',stayAwake); grip.addEventListener('mouseleave',mayDoze); }

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
  if(rec.open){ const c=ctlPosition(rec); rec.ctl.style.top=c.top; rec.ctl.style.right=c.right; if(rec.grip) positionGrip(rec); } } }

function open(id){ const r=PANELS_[id]; if(r) setOpen(r,true); }
function close(id){ const r=PANELS_[id]; if(r) setOpen(r,false); }
function toggle(id){ const r=PANELS_[id]; if(r) setOpen(r,!r.open); return r?r.open:null; }
function isOpen(id){ const r=PANELS_[id]; return r?r.open:null; }
function reflowAll(){ for(const e of Object.keys(EDGE_MEMBERS)) reflowEdge(e); }
addEventListener('resize', ()=>{ for(const id in PANELS_) applyVisual(PANELS_[id]); reflowAll(); });

const api={ register, open, close, toggle, isOpen, reflow:reflowAll, clearSize, resetLayout };
if(typeof window!=='undefined') window.PANELS=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
