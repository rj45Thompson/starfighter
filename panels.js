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
  STORE_KEY:'SF_PANELS_v4',   // v3->v4 (2026-09-08): the all-windows-open default I shipped for Android also
                              // applied to RJ's touch-capable DESKTOP and got SAVED there, so a stale v3 would
                              // keep eight windows open forever and hide the new minimized start. Bumping is
                              // the only way to clear a saved state that a bug wrote.   // bumped v2->v3 (2026-09-05 layout review: market now defaultOpen:false and the roster/terminal sizes changed; a v2 save would keep the old open market and the old panel sizes forever). Earlier: v1->v2 (user 2026-07-07 "i don't see the xwing bars"): powerpanel's defaultOpen flipped false->true, but anyone who'd already loaded the earlier build has a saved open:false for it that would otherwise outrank the new default forever - same fix as the PASSENGER_STATE_v1->v2 bump for the intro story
  AUTO_HIDE_MS:1600,           // unpinned: delay after mouseleave before sliding away
  SLIDE_MS:320,                // slide transition duration
  GAP:8,                       // px between stacked panels on the same edge
  OP_MIN:0.25, OP_MAX:1.0, OP_STEP:0.01, TEXT_OP_FLOOR:0.72,   // 0.16-0.97 -> 0.25-1.0 (user 2026-09-06 "the market allows too much transparency and not enough opaque"): every registered window shares this range; the POWER panel's own slider uses the same numbers   // 0.38 -> 0.72 (2026-09-06): the slider now really drives the BOX alpha (the forced-transparent CSS rule is gone), so the text no longer needs to fade with it to make a panel feel see-through; at the new 0.4 default the terminal text had dropped to 56%   // TEXT_OP_FLOOR: the text fades with the same slider but never past this, so a panel dragged to minimum still has a way back
  CHROME_RESERVE:24,   // user report "the terminal pinned box seems to overlap the parasite tab": the ctl cluster/tab float AT the panel's own top corner, which collided with the panel's OWN header content (market's title, the ticker's PARASITE/TERMINAL/... row) - reserving this much top padding on every registered panel gives the chrome a real strip instead of sitting on top of the content
  TAB_W:118, TAB_H:20,         // edge pull-tab footprint
  /* PHONE STACK (RJ 2026-09-07: "optimize UI for android"). Opening all eight windows on a 375px phone put
     them on top of each other: measured overlap ratio 1.02 - the panels covered MORE than their own combined
     area - with khud 460px wide at left -97 and sbhud off the right edge. Free-floating windows are a
     mouse-and-big-screen idea; on a phone the same eight become one scrolling column. */
  /* A COARSE POINTER IS NOT A PHONE. RJ 2026-09-08: "starfighter windows aren't resizeable or closeable
     anymore ... upgrade window resize doesn't work either." His desktop is touch-capable, so
     matchMedia('(pointer:coarse)') and 'ontouchstart' in window are BOTH true on it - the phone column
     switched itself on over a full-size screen and hid the drag handles, resize grips and close buttons that
     go with it. Touch-capable says how you can point at it; it says nothing about how much room there is.
     The phone layout needs both. */
  PHONE_MAX_W:900,
  STACK_TOP:44, STACK_BOTTOM:92,   // clear of the top button row and the chat/fire controls at the foot
  STACK_ITEM_VH:34,                // each panel's share of the screen before it scrolls internally
  STACK_PAD:8, STACK_Z:40,
  Z:6,                         // header/tab layer (panels themselves already sit at the game's own z-index)
  RESIZE_GRIP:26,              // resize-handle footprint (bumped 16->18->26 across "still I can't resize" reports 2026-07-08/09/10 - now a bold, unmistakable corner handle, not a faint 18px hint)
  RESIZE_MIN_W:220, RESIZE_MIN_H:120,
  RESIZE_EDGE:9,               // thickness of the edge-resize strips (user 2026-07-10 'thicker border + resize cursor on hover, all windows') - bumped to 16 on touch in positionGrip()
  DRAG_THRESHOLD:6,            // px of mouse/touch movement before a tab-press counts as a REDOCK DRAG rather than a plain open/close click
  EDGE_OFFSET:14, TOP_RESERVE:38,   // TOP_RESERVE: the always-visible shell bar owns the top strip - top-docked panels start below it
               // fixed distance from the screen edge a redocked panel sits at (matches the ~10-14px the hand-authored panel CSS already used)
  EDGE_HL_THICK:10,            // drag-feedback strip thickness along the candidate edge (6->10 2026-07-09: "docking is still weak" - the old strip was easy to miss entirely)
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
    // TITLE BAR (user 2026-07-09 "the docking is still weak... can't resize and dock the window"): the floating
    // button cluster is now a real full-width window header - title on the left IS the move handle (drag it
    // anywhere; the panel follows the cursor live and snap-docks to the nearest edge on release), buttons on the
    // right. One coherent bar instead of chrome fragments = how every OS window already works.
    '.pnl-ctl{ position:fixed; display:flex; gap:5px; align-items:center; z-index:'+(CFG.Z+1)+'; pointer-events:auto;'+
      ' background:#0c1623cc; border:1px solid '+COL.border+'; border-radius:6px; padding:2px 4px; }'+
    '.pnl-title{ flex:1 1 auto; font:700 9.5px/1 ui-monospace,monospace; letter-spacing:.07em; color:'+COL.dim+';'+
      ' cursor:grab; user-select:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:3px 4px; }'+
    '.pnl-title:hover{ color:'+COL.txt+'; }'+
    '.pnl-title:active{ cursor:grabbing; }'+
    '.pnl-btn{ font:700 10px/1 ui-monospace,monospace; color:'+COL.dim+'; background:#0c1623dd; border:1px solid '+COL.border+'; border-radius:5px; width:20px; height:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex:0 0 auto; }'+
    '.pnl-btn:hover{ color:'+COL.txt+'; border-color:#3a567a; }'+
    '.pnl-btn.on{ color:'+COL.cyan+'; border-color:'+COL.cyan+'; }'+
    '.pnl-op{ width:46px; height:12px; cursor:pointer; accent-color:'+COL.cyan+'; }'+
    '.pnl-tab{ position:fixed; z-index:'+(CFG.Z+1)+'; font:700 9.5px/1 ui-monospace,monospace; letter-spacing:.06em; color:'+COL.dim+';'+
      ' background:#0c1623ee; border:1px solid '+COL.border+'; border-radius:6px; padding:4px 9px; cursor:pointer; pointer-events:auto; white-space:nowrap; user-select:none; transition:color .15s,border-color .15s; }'+
    '.pnl-tab:hover{ color:'+COL.txt+'; border-color:#3a567a; }'+
    '.pnl-tab .pnl-pinned{ color:'+COL.cyan+'; }'+
    '.pnl-grip{ position:fixed; z-index:'+(CFG.Z+1)+'; width:'+CFG.RESIZE_GRIP+'px; height:'+CFG.RESIZE_GRIP+'px; cursor:nwse-resize; pointer-events:auto;'+
      ' background-color:'+COL.cyan+'2e;'+   // bold always-on tint (2026-07-10): the grip must be obviously grabbable, not a faint hint
      ' border:1px solid '+COL.cyan+'88; box-shadow:0 0 8px '+COL.cyan+'55;'+   // a lit corner so the eye lands on it
      ' background-image:repeating-linear-gradient(135deg,'+COL.cyan+'cc 0,'+COL.cyan+'cc 2px,transparent 2px,transparent 5px); background-position:bottom right; background-size:16px 16px; background-repeat:no-repeat; border-radius:6px; }'+
    '.pnl-grip:hover{ background-color:'+COL.cyan+'55; box-shadow:0 0 12px '+COL.cyan+'99; }'+
    // EDGE-RESIZE STRIPS (user 2026-07-10 'make the border thicker + show the resize cursor on hover, ALL windows'):
    // a thin grabbable strip along each of the panel's two FREE edges (the ones facing open space), plus the lit
    // corner above. Subtle always-on tint so the border reads as grabbable; brighter on hover; cursor per-instance.
    '.pnl-edge{ position:fixed; z-index:'+(CFG.Z+1)+'; pointer-events:auto; background-color:'+COL.cyan+'22; transition:background-color .12s,box-shadow .12s; }'+
    '.pnl-edge:hover{ background-color:'+COL.cyan+'66; box-shadow:0 0 10px '+COL.cyan+'77; }'+
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
  if(rec.edge==='top'){ s.top=(2+CFG.TOP_RESERVE)+'px'; s.left=(r.left+r.width/2)+'px'; s.transform='translateX(-50%)'; }   // TOP_RESERVE: clear of the shell.js top bar (2026-09-06)
  else if(rec.edge==='bottom'){ s.bottom='2px'; s.left=(r.left+r.width/2)+'px'; s.transform='translateX(-50%)'; }
  else if(rec.edge==='left'){ s.left='2px'; s.top=Math.max(4,r.top)+'px'; }
  else { s.right='2px'; s.top=Math.max(4,r.top)+'px'; }
  return s;
}
function ctlPosition(rec){
  // TITLE BAR: spans the panel's full width inside the CHROME_RESERVE strip (only meaningful while open).
  const r=rec.el.getBoundingClientRect();
  return { top:(r.top+3)+'px', left:(r.left+5)+'px', width:Math.max(80, r.width-10)+'px' };
}

function textOpacityFor(v){   // user 2026-07-07: "we want the text to be semi-transparent as well based on that slider" - tracks the same slider, with a soft floor (TEXT_OP_FLOOR) so a panel dragged to minimum never becomes fully unreadable/stuck.
  const frac=(clamp01(v)-CFG.OP_MIN)/(CFG.OP_MAX-CFG.OP_MIN||1);
  return CFG.TEXT_OP_FLOOR+frac*(1-CFG.TEXT_OP_FLOOR); }
function applyVisual(rec){
  rec.el.style.transition='transform '+CFG.SLIDE_MS+'ms ease, opacity .18s ease';
  rec.el.style.transform = rec.open ? openTransform(rec.centerX) : closedTransform(rec.edge, rec.centerX);
  /* A VIEWPORT WINDOW IS A FRAME, NOT A SURFACE. RJ 2026-09-08: "check again all windows have the same code
     it should be reusable." Two windows could not use it - #chaseWin and #rearWin, which are transparent
     frames with the 3D scissor-rendered into their rect behind them and a click-through body so aim and fire
     pass through. This class painted a background over that and captured the pointer, so both carried their
     own hand-written drag and resize instead. `transparent` is the missing mode: same chrome, same pin, same
     grips, no fill. */
  if(!rec.transparent){
    rec.el.style.backgroundColor = rgba(rec.rgb, rec.opacity);
    rec.el.style.opacity = textOpacityFor(rec.opacity);   // fades the panel's OWN text/content - the header controls (.pnl-ctl/.pnl-tab) live outside `el` so they stay fully legible
  }
  const chev = rec.edge==='top'?(rec.open?'▴':'▾') : rec.edge==='bottom'?(rec.open?'▾':'▴') : rec.edge==='left'?(rec.open?'◂':'▸') : (rec.open?'▸':'◂');
  /* RJ 2026-09-08: "put the pin icon on the side contracted windows for expand rather than the words
     pinned." The tab is only ever seen while the window is COLLAPSED now, so "pinned" was both wrong (it is
     not) and useless (it named a state instead of offering an action). It shows the pin you press to bring
     the window back. */
  rec.tab.innerHTML = '<span class="pnl-pinned">📌</span> '+rec.title+' '+chev;
  rec.pinBtn.classList.toggle('on', rec.pinned);
  rec.pinBtn.textContent = rec.pinned ? '📌' : '📍';   // filled pin (pinned) vs outline-ish (unpinned) - both render fine, distinct glyphs
  const t=tabPosition(rec); rec.tab.style.top=t.top||''; rec.tab.style.bottom=t.bottom||''; rec.tab.style.left=t.left||''; rec.tab.style.right=t.right||''; rec.tab.style.transform=t.transform||'';
  /* THE TAB IS THE WAY BACK IN, so it only exists while the window is away. RJ 2026-09-08: "the pinned text
     overlaps the window." It did, by construction: tabPosition pins a left-edge tab at left:2px, and an OPEN
     left-docked panel starts at the same place, so "MISSIONS - pinned" was printed across the panel it
     belonged to. Nothing is lost by hiding it - an open window already has its title bar, and the pin is how
     you close it. */
  rec.tab.style.display = rec.open ? 'none' : '';
  rec.ctl.style.display = rec.open ? 'flex' : 'none';
  if(rec.open){ const c=ctlPosition(rec); rec.ctl.style.top=c.top; rec.ctl.style.left=c.left; rec.ctl.style.right=''; rec.ctl.style.width=c.width; }
  if(rec.grip){ const _d=rec.open?'block':'none'; rec.grip.style.display=_d; if(rec.gripE) rec.gripE.style.display=_d; if(rec.gripS) rec.gripS.style.display=_d; if(rec.open) positionGrip(rec); }
}
// WHICH CORNER IS FREE? (2026-07-09 "still I can't resize"): the old grip lived at bottom-right and always grew
// with +dx/+dy - for a panel ANCHORED at the screen's right or bottom edge that direction is pinned against the
// screen, so those panels could only ever SHRINK. The anchor decides everything: the grip sits on the free
// corner, and drag deltas grow AWAY from the anchored sides.
function anchorOf(rec){
  const el=rec.el, r=el.getBoundingClientRect();
  const right = el.style.right!=='' && el.style.left==='' ? true
    : el.style.left!=='' && el.style.right==='' ? false
    : (window.innerWidth - r.right) < r.left;                       // no explicit style -> nearer screen edge wins
  const bottom = el.style.bottom!=='' && el.style.top==='' ? true
    : el.style.top!=='' && el.style.bottom==='' ? false
    : (window.innerHeight - r.bottom) < r.top;
  return { right, bottom };
}
function positionGrip(rec){   // corner grip + the two FREE-edge resize strips (only meaningful while open)
  const r=rec.el.getBoundingClientRect();
  const gw=rec.grip.offsetWidth||CFG.RESIZE_GRIP, gh=rec.grip.offsetHeight||CFG.RESIZE_GRIP;
  const a=rec._resizeAnch || anchorOf(rec);   // FROZEN anchor during an active resize so a handle can't flip corners mid-drag (the old 'reversed/odd' feel)
  const T=(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches)?16:CFG.RESIZE_EDGE;   // fatter strips on touch
  /* THE GRIP SITS ON THE EDGES THAT CAN ACTUALLY MOVE, which is not always the bottom.
     RJ asked for "always the bottom corner", I did exactly that, and he immediately hit the consequence:
     "sometimes the window resize seems to grow in opposition to the drag movement." A panel docked to the
     BOTTOM of the screen has its bottom edge pinned, so it can only grow UPWARD - put the handle on that
     pinned edge and dragging down has to shrink it, which is the inversion he saw on the shop window.
     So the corner goes back to where the two FREE edges meet, and the drag direction matches the growth
     again. The close-button collision that sent me to the bottom in the first place is handled properly
     below, by the title bar yielding that corner. */
  rec.grip.style.top =(a.bottom ? r.top : r.bottom-gh)+'px';
  rec.grip.style.left=(a.right ? r.left : r.right-gw)+'px';
  rec.grip.style.cursor = (a.right !== a.bottom) ? 'nesw-resize' : 'nwse-resize';
  // VERTICAL free edge (resizes WIDTH): left edge if right-anchored, else right edge; leaves the corner clear
  if(rec.gripE){ rec.gripE.style.left=(a.right ? r.left : r.right-T)+'px'; rec.gripE.style.width=T+'px';
    rec.gripE.style.top=(a.bottom ? r.top+gh : r.top)+'px'; rec.gripE.style.height=Math.max(0,r.height-gh)+'px'; }
  // HORIZONTAL free edge (resizes HEIGHT): top edge if bottom-anchored, else bottom edge; leaves the corner clear
  if(rec.gripS){ rec.gripS.style.top=(a.bottom ? r.top : r.bottom-T)+'px'; rec.gripS.style.height=T+'px';
    rec.gripS.style.left=(a.right ? r.left+gw : r.left)+'px'; rec.gripS.style.width=Math.max(0,r.width-gw)+'px'; }
  /* THE TITLE BAR YIELDS THE CORNER THE GRIP IS USING. RJ 2026-09-08: "the drag button and the close button
     the windows seem to overlap." Measured: CLOSE sat on top of that same panel's GRIP by 16x18px on three
     panels, so a click within two pixels of the corner either closed the window or started resizing it.
     They collide by construction - ctlPosition always puts the bar across the panel's TOP, and the corner
     grip moves to the TOP edge whenever the panel is bottom-anchored. Neither is wrong, so the bar simply
     pads itself out of the corner the grip currently occupies, on whichever side that is. */
  /* The title bar yields whichever corner the grip is holding. Measured before this existed: the CLOSE
     button sat on top of its own panel's grip by 16x18px on three panels, so a click within two pixels of
     the corner either closed the window or started resizing it. They only meet when the panel is
     bottom-anchored, because that is when the free corner is at the top - the same edge the bar lives on. */
  if(rec.ctl){
    const pad = a.bottom ? (gw + 6) : 0;
    rec.ctl.style.paddingLeft  = (a.right ? pad : 0) + 'px';
    rec.ctl.style.paddingRight = (a.right ? 0 : pad) + 'px';
  }
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
  // A PHONE has no hover, so auto-hide-on-idle would close panels out from under the user with no warning.
  // This used to test IS_TOUCH, which is also true on a touch-capable DESKTOP - so on RJ's machine auto-hide
  // never armed at all and the pin button did nothing whatsoever, which is exactly what he reported. Same
  // distinction as the phone column: how you point is not how much room you have.
  if(isPhone()) return;
  rec.hideT=setTimeout(()=>{
    if(rec.pinned) return;
    if(rec.keepOpenWhile && rec.keepOpenWhile()) { armAutoHide(rec); return; }   // e.g. the chat input still has focus
    if(rec.hovering) return;                                                     // still under the mouse - recheck won't fire til leave
    setOpen(rec, false);
  }, CFG.AUTO_HIDE_MS);
}

function setOpen(rec, open){
  /* OPENING PINS. RJ 2026-09-08: "when you click on the missions unpinned tab it opens the window UNPINNED,
     so you don't need a close - the pin IS close." That is the whole model, and it is simpler than what was
     here: a tab or a menu entry opens a window and it STAYS open; the pin closes it. Opening something
     unpinned meant it slid away again on its own a moment later, which reads as the window refusing to open.
     Auto-hide is not gone - a panel you unpin without closing still arms it - but nothing arrives unpinned. */
  rec.open=open; if(open) rec.pinned=true;
  applyVisual(rec); persist(rec); reflowEdge(rec.edge);
  if(rec.onOpenChange) try{ rec.onOpenChange(open); }catch(e){}
}
function setPinned(rec, pinned){
  rec.pinned=pinned; applyVisual(rec); persist(rec);
  clearTimeout(rec.hideT);
  /* UNPIN SLIDES IT AWAY NOW. RJ 2026-09-08: "some windows have a pin icon that doesn't do anything ... make
     them all have it and they collapse expand the slide out?" Unpinning used to only ARM the idle timer, and
     that timer then bails while the pointer is still over the panel - which it always is, one pixel after you
     have clicked the panel's own pin. So the button appeared inert even on a machine where auto-hide worked.
     Unpin now collapses to the edge tab immediately and pin brings it back, so the control does something you
     can see on the click that you made. The idle timer still exists for panels left unpinned and hovered away
     from; this only removes the wait on the deliberate press. */
  if(!rec.open) return;
  if(pinned) return;
  rec.hovering = false;
  if(rec.keepOpenWhile && rec.keepOpenWhile()){ armAutoHide(rec); return; }   // e.g. the chat still has focus
  setOpen(rec, false);
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

// DRAG-TO-REDOCK (user 2026-07-09 "make sure they dock in spots that make sense and you can move the dock
// around to each side of the screen top left bottom and make them sizable"): grab a panel's existing TAB (already
// the one always-findable handle, per this file's own opening docblock) and drag near a screen edge to re-anchor
// the panel there. A plain click (movement stays under DRAG_THRESHOLD) still toggles open/closed exactly as
// before - only a real drag engages redocking, so nothing about the existing click-to-open behavior changes for
// anyone not dragging.
function nearestEdge(x,y){
  const w=window.innerWidth, h=window.innerHeight;
  const d={ top:y, bottom:h-y, left:x, right:w-x };
  let best='top', bd=Infinity; for(const k in d){ if(d[k]<bd){ bd=d[k]; best=k; } } return best;
}
function showEdgeHighlight(edge){
  let hl=document.getElementById('pnl-edge-hl');
  if(!hl){ hl=document.createElement('div'); hl.id='pnl-edge-hl';
    hl.style.position='fixed'; hl.style.zIndex=(CFG.Z+2); hl.style.background=COL.cyan+'55'; hl.style.pointerEvents='none';
    document.body.appendChild(hl); }
  hl.style.top=''; hl.style.bottom=''; hl.style.left=''; hl.style.right=''; hl.style.width=''; hl.style.height='';
  const T=CFG.EDGE_HL_THICK;
  if(edge==='top'){ hl.style.top='0'; hl.style.left='0'; hl.style.right='0'; hl.style.height=T+'px'; }
  else if(edge==='bottom'){ hl.style.bottom='0'; hl.style.left='0'; hl.style.right='0'; hl.style.height=T+'px'; }
  else if(edge==='left'){ hl.style.left='0'; hl.style.top='0'; hl.style.bottom='0'; hl.style.width=T+'px'; }
  else { hl.style.right='0'; hl.style.top='0'; hl.style.bottom='0'; hl.style.width=T+'px'; }
  hl.style.display='block';
}
function hideEdgeHighlight(){ const hl=document.getElementById('pnl-edge-hl'); if(hl) hl.style.display='none'; }
// sets the panel's actual on-screen anchor for its (possibly new) edge. Written with inline !important and the
// two irrelevant sides forced to `auto` (2026-07-09 live-caught: #market's narrow-viewport stylesheet says
// `left:50% !important` - a plain inline `right` LOST to it on reload and the panel snapped back to center;
// only inline-!important on all four sides deterministically beats any stylesheet positioning).
function setSide(el, side, val){ el.style.setProperty(side, val==null?'auto':val, 'important'); }
function applyDockPosition(rec, edge, pos){
  const el=rec.el;
  setSide(el,'top',null); setSide(el,'bottom',null); setSide(el,'left',null); setSide(el,'right',null);
  if(edge==='top'){ setSide(el,'top',(CFG.EDGE_OFFSET+CFG.TOP_RESERVE)+'px'); setSide(el,'left',pos+'px'); }   // TOP_RESERVE keeps a redocked panel clear of the shell.js top bar (2026-09-06)
  else if(edge==='bottom'){ setSide(el,'bottom',CFG.EDGE_OFFSET+'px'); setSide(el,'left',pos+'px'); }
  else if(edge==='left'){ setSide(el,'left',CFG.EDGE_OFFSET+'px'); setSide(el,'top',pos+'px'); }
  else { setSide(el,'right',CFG.EDGE_OFFSET+'px'); setSide(el,'top',pos+'px'); }
}
// CENTERED PANELS AND RESIZE (RJ 2026-09-06 "resize window doesn't work right for market").
// #market is the only panel registered with centerX, which means it carries `transform:translateX(-50%)` on top
// of its left. Setting an explicit width on a box translated by -50% of its OWN width grows it symmetrically
// about its centre: measured on the live game, a 200px drag of the corner grip moved the right edge +100 and the
// left edge -100. So the grip crawls away from the cursor at half speed (it ends the drag 100px behind the
// pointer) and the panel simultaneously spreads leftward underneath whatever is beside it. Nothing about the
// resize maths was wrong - `width` really did grow by the full 200 - the centring was eating half of it.
// Freezing the centre into a real `left` before the first delta lands makes the anchored edge stay put and the
// free edge track the cursor 1:1. The panel does not move when this runs: `left` absorbs exactly the translate
// being removed. It records the same manualDock/pos/edge that a drag-to-redock writes, so the frozen centre
// survives a reload through register()'s existing restore path (which also forces centerX:false for a manual
// dock), rather than snapping back to centre and reintroducing the bug on the next load.
function freezeCenterX(rec){
  if(!rec.centerX) return;
  const el=rec.el, r=el.getBoundingClientRect();
  // clamped exactly like redock's own placement: the frozen left is PERSISTED, so a panel caught mid-slide or
  // sized before its content exists must not write an off-screen dock that then survives every future reload.
  const left=Math.round(Math.max(CFG.GAP, Math.min(window.innerWidth-r.width-CFG.GAP, r.left)));
  rec.centerX=false;
  const keep=el.style.transition; el.style.transition='none';   // before and after are the same pixels, but don't let the 320ms transform transition animate the swap
  setSide(el,'left',left+'px'); setSide(el,'right',null);
  el.style.transform = rec.open ? openTransform(false) : closedTransform(rec.edge,false);
  void el.offsetWidth;                                          // commit the swap before the transition comes back
  el.style.transition=keep;
  store[rec.id]=store[rec.id]||{}; store[rec.id].edge=rec.edge; store[rec.id].pos=left; store[rec.id].manualDock=true; save();
}
function redock(rec, edge, x, y, panelLeft, panelTop){
  const oldEdge=rec.edge;
  if(oldEdge!==edge){
    const arr=EDGE_MEMBERS[oldEdge]; const i=arr?arr.indexOf(rec):-1; if(i>=0) arr.splice(i,1);
    (EDGE_MEMBERS[edge]=EDGE_MEMBERS[edge]||[]).push(rec); rec.edge=edge;
  }
  rec.centerX=false;   // manual placement is inherently incompatible with auto-centering (only market ever used centerX, and only for its old "always top-center" default)
  const w=rec.el.offsetWidth||CFG.RESIZE_MIN_W, h=rec.el.offsetHeight||CFG.RESIZE_MIN_H;
  const horiz=(edge==='top'||edge==='bottom');
  // live move-drag passes the panel's actual dragged corner so the panel lands exactly where you left it (only
  // snapped flush to the chosen edge); a bare tab-drag still centers on the cursor as before.
  const want = horiz ? (panelLeft!=null?panelLeft:x-w/2) : (panelTop!=null?panelTop:y-h/2);
  const pos=horiz ? Math.max(CFG.GAP, Math.min(window.innerWidth-w-CFG.GAP, want))
                  : Math.max(CFG.GAP, Math.min(window.innerHeight-h-CFG.GAP, want));
  applyDockPosition(rec, edge, pos);
  store[rec.id]=store[rec.id]||{}; store[rec.id].edge=edge; store[rec.id].pos=Math.round(pos); store[rec.id].manualDock=true; save();
  applyVisual(rec); reflowEdge(oldEdge); reflowEdge(edge);
}

// LIVE MOVE-DRAG (2026-07-09 "the docking is still weak"): shared by the title bar AND the edge tab. The panel
// itself follows the cursor while you drag (not just a thin stripe at the destination), the candidate edge
// lights up, and release snap-docks it there. A sub-threshold press stays a plain click for the handle's own
// click behavior (tab toggle), unchanged.
function makeMoveDrag(rec, handle, isTab){
  let dragging=false, moved=false, sx=0, sy=0, gdx=0, gdy=0;
  const onMove=(ev)=>{ if(!dragging) return;
    const x=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX, y=(ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY;
    if(!moved){ if(Math.hypot(x-sx,y-sy)<CFG.DRAG_THRESHOLD) return;
      moved=true;
      if(!rec.open) setOpen(rec, true);                             // dragging a closed panel's tab pulls the real panel out to carry along
      const r=rec.el.getBoundingClientRect(); gdx=sx-r.left; gdy=sy-r.top;
      if(isTab){ gdx=Math.min(gdx, r.width/2); gdy=Math.min(gdy, 12); }   // tab sits outside the panel - carry it near the grab point instead of by a far-off corner
      rec.el.style.transition='none'; rec.centerX=false;
    }
    rec.el.style.transform='none';
    setSide(rec.el,'top',(y-gdy)+'px'); setSide(rec.el,'left',(x-gdx)+'px'); setSide(rec.el,'bottom',null); setSide(rec.el,'right',null);
    const t=tabPosition(rec); rec.tab.style.top=t.top||''; rec.tab.style.bottom=t.bottom||''; rec.tab.style.left=t.left||''; rec.tab.style.right=t.right||''; rec.tab.style.transform=t.transform||'';
    const c=ctlPosition(rec); rec.ctl.style.top=c.top; rec.ctl.style.left=c.left; rec.ctl.style.width=c.width;
    if(rec.grip) positionGrip(rec);
    showEdgeHighlight(nearestEdge(x,y));
    if(ev.preventDefault) try{ ev.preventDefault(); }catch(e){} };
  const endDrag=(ev)=>{ if(!dragging) return; dragging=false;
    document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',endDrag);
    document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',endDrag);
    hideEdgeHighlight();
    if(moved){ const x=(ev.changedTouches&&ev.changedTouches[0])?ev.changedTouches[0].clientX:ev.clientX,
      y=(ev.changedTouches&&ev.changedTouches[0])?ev.changedTouches[0].clientY:ev.clientY;
      const r=rec.el.getBoundingClientRect();
      redock(rec, nearestEdge(x,y), x, y, r.left, r.top); } };
  const startDrag=(ev)=>{
    if(ev.target && ev.target.closest && ev.target.closest('.pnl-btn,.pnl-op')) return;   // buttons/slider keep their own behavior
    dragging=true; moved=false;
    sx=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX; sy=(ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY;
    document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',endDrag);
    document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',endDrag); };
  handle.addEventListener('mousedown',startDrag); handle.addEventListener('touchstart',startDrag,{passive:true});
  return { didMove:()=>moved };
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
  /* RJ 2026-09-07: "for android start with all windows open except health bar." That REVERSES the rule the
     paragraph above describes - it was deliberately hiding every panel on a phone to avoid clutter, and RJ has
     now asked for the opposite, so a phone gets the same starting layout as a desktop. The one exception, the
     health/power dock, is not a PANELS panel at all: it is HUD_WIN.power, defaulted off for touch in index.html.
     Unchanged: this is still only the FIRST-EVER default. The moment a player opens, closes or pins anything,
     saved.open/saved.pinned win, so nobody's existing layout moves. */
  // On touch, ALL of them open - RJ asked for every window up, and six panels ship with an explicit
  // defaultOpen:false (roster, missionlog, market, shop, empire, khud) that a plain `!==false` would still
  // honour, leaving only two open. Desktop keeps each panel's own default.
  /* RJ 2026-09-08: "start with all windows minimized but the windows menu and the health bar." So every
     registered panel now starts CLOSED, on every device - not "closed on a phone", not "whatever each panel
     asked for". A first run is the game plus two things: the always-present WINDOWS menu, and the health bar
     (the power dock, which is HUD_WIN.power over in index.html and is defaulted ON to match).

     Panels stay PINNED by default, so opening one from its tab keeps it open instead of sliding away again. */
  // ...except a VIEWPORT FRAME, which is part of the view rather than something covering it. Minimising the
  // 3D window by default does not de-clutter the screen, it switches the 3D off, which is not what
  // "start with all windows minimized" meant.
  const touchDefaultOpen = opts.transparent ? (opts.defaultOpen!==false) : false;
  const touchDefaultPinned = opts.defaultPinned!==false;
  // DRAG-TO-REDOCK: once a panel has been manually dragged to an edge at least once (store[id].manualDock), that
  // choice outranks opts.edge/opts.centerX forever - same "your own action beats the shipped default" convention
  // the resize grip already established for w/h.
  const rec={ id, el, edge:(saved.manualDock&&saved.edge)||opts.edge||'top', centerX: saved.manualDock?false:!!opts.centerX, rgb:opts.rgb||[9,17,27], title:opts.title||id,
    open: saved.open!=null?saved.open:touchDefaultOpen, pinned: saved.pinned!=null?saved.pinned:touchDefaultPinned,
    opacity: clamp01(saved.opacity!=null?saved.opacity:(opts.defaultOpacity!=null?opts.defaultOpacity:0.88)),
    onOpenChange:opts.onOpenChange||null, keepOpenWhile:opts.keepOpenWhile||null, hovering:false, hideT:null };

  if(!opts.transparent) el.style.pointerEvents='auto';   // opts, not rec: rec.transparent is assigned further down
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
  rec.transparent=!!opts.transparent;   // viewport frames: no fill, no opacity fade, body stays click-through
  rec.resizable=opts.resizable!==false;   // 2026-07-09: resizable is the DEFAULT now - a window you can't resize is the exception, not the rule
  if(rec.resizable && saved.w!=null && saved.h!=null) applyStoredSize(el, saved.w, saved.h);   // a size you set yourself sticks across reloads - the whole point of the feature
  if(saved.manualDock && saved.pos!=null) applyDockPosition(rec, rec.edge, saved.pos);   // a dock spot you dragged yourself sticks across reloads, same convention
  const ctl=document.createElement('div'); ctl.className='pnl-ctl'; body.appendChild(ctl);           // fixed + body-level: immune to el's own scroll/slide
  const titleSpan=document.createElement('div'); titleSpan.className='pnl-title'; titleSpan.textContent='⠿ '+rec.title;
  titleSpan.title='drag to move - release near an edge to dock there';
  const pinBtn=document.createElement('button'); pinBtn.className='pnl-btn'; pinBtn.title='pin (stay open) / unpin (auto-hide when idle)';
  const op=document.createElement('input'); op.type='range'; op.className='pnl-op'; op.min=CFG.OP_MIN; op.max=CFG.OP_MAX; op.step=CFG.OP_STEP; op.title='transparency';
  /* NO CLOSE BUTTON. RJ 2026-09-08: "remove the close icon since that is the same as clicking pin." It is -
     since opening pins and unpinning collapses, the pin IS the close, and two controls doing one thing on a
     22px title bar is how you get the corner collisions this bar has already had. The pin's tooltip carries
     the hotkey the close button used to advertise. */
  pinBtn.title = 'pin (stay open) / unpin (collapse to the edge tab)'
               + (opts.hotkeyLabel ? (' · key ' + opts.hotkeyLabel) : '');
  ctl.appendChild(titleSpan); ctl.appendChild(pinBtn);
  if(!rec.transparent) ctl.appendChild(op);   // nothing to fade on a frame that draws no background
  rec.ctl=ctl; rec.pinBtn=pinBtn; rec.opInput=op; op.value=rec.opacity;

  const tab=document.createElement('div'); tab.className='pnl-tab'; body.appendChild(tab);
  rec.tab=tab;

  let grip=null;
  if(rec.resizable){
    // THREE resize handles per panel (user 2026-07-10 'thicker border + resize cursor on hover, ALL windows'):
    // the lit CORNER grip (both axes) + a thin strip on each of the two FREE edges (the edges facing open space,
    // computed from anchorOf). Every panel that registers as resizable gets all three via this same path.
    grip=document.createElement('div'); grip.className='pnl-grip'; grip.title='drag corner to resize'; body.appendChild(grip);
    rec.grip=grip;
    const gripE=document.createElement('div'); gripE.className='pnl-edge'; gripE.style.cursor='ew-resize'; gripE.title='drag to resize width'; body.appendChild(gripE); rec.gripE=gripE;
    const gripS=document.createElement('div'); gripS.className='pnl-edge'; gripS.style.cursor='ns-resize'; gripS.title='drag to resize height'; body.appendChild(gripS); rec.gripS=gripS;
    // DIRECTION-AWARE + PER-AXIS: deltas grow AWAY from the anchored side (a right-docked panel grows leftward, a
    // bottom-docked one upward). axis 'x'=width only, 'y'=height only, 'xy'=corner. The anchor is FROZEN at
    // drag-start (rec._resizeAnch) so a handle can't jump corners mid-drag - that anchor-recompute-every-frame was
    // the 'reversed/odd' feel the user reported.
    const makeResize=(handle,axis)=>{
      let dragging=false, startX=0, startY=0, startW=0, startH=0, anch={right:false,bottom:false};
      const onMove=(ev)=>{ if(!dragging) return;
        const x=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX, y=(ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY;
        const dw=(axis==='y')?0:(anch.right ? (startX-x) : (x-startX)), dh=(axis==='x')?0:(anch.bottom ? (startY-y) : (y-startY));
        const w=Math.max(CFG.RESIZE_MIN_W, startW+dw), h=Math.max(CFG.RESIZE_MIN_H, startH+dh);
        applyStoredSize(el, w, h); positionGrip(rec);
        const c=ctlPosition(rec); ctl.style.top=c.top; ctl.style.left=c.left; ctl.style.width=c.width;   // the title bar tracks the live rect
        if(ev.preventDefault) try{ ev.preventDefault(); }catch(e){} };
      const endDrag=()=>{ if(!dragging) return; dragging=false; rec._resizeAnch=null;
        const r=el.getBoundingClientRect(); store[id]=store[id]||{}; store[id].w=Math.round(r.width); store[id].h=Math.round(r.height); save();
        applyVisual(rec);
        document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',endDrag);
        document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',endDrag); };
      const startDrag=(ev)=>{ dragging=true;
        freezeCenterX(rec);                         // a centered panel would otherwise grow BOTH ways at half speed - see freezeCenterX
        const r=el.getBoundingClientRect(); startW=r.width; startH=r.height;
        anch=anchorOf(rec); rec._resizeAnch=anch;   // freeze for the whole drag
        startX=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX; startY=(ev.touches&&ev.touches[0])?ev.touches[0].clientY:ev.clientY;
        document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',endDrag);
        document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',endDrag);
        if(ev.preventDefault) try{ ev.preventDefault(); }catch(e){} };
      handle.addEventListener('mousedown',startDrag); handle.addEventListener('touchstart',startDrag,{passive:false});
    };
    makeResize(grip,'xy'); makeResize(gripE,'x'); makeResize(gripS,'y');
  }

  pinBtn.onclick=(e)=>{ e.stopPropagation(); setPinned(rec, !rec.pinned); };
  op.addEventListener('input', ()=>setOpacity(rec, parseFloat(op.value)));
  // LIVE MOVE-DRAG on BOTH handles: the tab (always findable, even closed) and the title bar (the natural
  // "grab the window" target). A sub-threshold tab press stays the plain open/close click.
  const tabDrag=makeMoveDrag(rec, tab, true);
  makeMoveDrag(rec, ctl, false);
  tab.addEventListener('click',(ev)=>{ if(tabDrag.didMove()){ ev.stopPropagation(); return; } setOpen(rec, !rec.open); });
  const stayAwake=()=>{ rec.hovering=true; clearTimeout(rec.hideT); };
  const mayDoze=()=>{ rec.hovering=false; if(rec.open&&!rec.pinned) armAutoHide(rec); };
  el.addEventListener('mouseenter',stayAwake); el.addEventListener('mouseleave',mayDoze);
  tab.addEventListener('mouseenter',stayAwake); tab.addEventListener('mouseleave',mayDoze);
  ctl.addEventListener('mouseenter',stayAwake); ctl.addEventListener('mouseleave',mayDoze);   // the controls float outside `el` now - count hovering them too
  [grip,rec.gripE,rec.gripS].forEach(h=>{ if(h){ h.addEventListener('mouseenter',stayAwake); h.addEventListener('mouseleave',mayDoze); } });

  PANELS_[id]=rec; (EDGE_MEMBERS[rec.edge]=EDGE_MEMBERS[rec.edge]||[]).push(rec);
  applyVisual(rec); reflowEdge(rec.edge);
  // RESTORE WITHOUT THE ARRIVAL SLIDE (2026-07-09): a manually-docked panel used to TRANSITION 320ms from its
  // stylesheet position to the saved dock on every load (and in a throttled/backgrounded tab that transition can
  // freeze at t=0, stranding the panel at the wrong spot indefinitely - live-caught). Restored panels appear in
  // place; the slide animation stays for interactive open/close only.
  if(saved.manualDock){ el.style.transition='none'; setTimeout(()=>{ el.style.transition='transform '+CFG.SLIDE_MS+'ms ease, opacity .18s ease'; }, 60); }
  if(rec.onOpenChange) try{ rec.onOpenChange(rec.open); }catch(e){}   // sync callers (e.g. marketOn) to a state RESTORED from a prior session, not just the default
  if(rec.open && !rec.pinned) armAutoHide(rec);
  if(!retickT) retickT=setInterval(retickTabs, 450);            // follows size changes from OUTSIDE our API (e.g. the ticker's own .big toggle)
  return rec;
}
/* The phone layout. Panels are re-parented into one scrolling column and laid out by normal flow instead of
   the inline left/top the desktop code writes - which is safe here precisely because touch already disables
   dragging and resizing (see the IS_TOUCH guard in the drag handler), so nothing else owns their position.
   The desktop chrome that goes with those gestures - drag handle, resize grips, edge pull-tab - is hidden on
   touch rather than left floating over a column it can no longer control. */
let stackEl=null, stackHidden=false, stackOn=false;
function isPhone(){ return IS_TOUCH && typeof window!=='undefined' && window.innerWidth <= CFG.PHONE_MAX_W; }
const STACK_OVERRIDES=['position','left','right','top','bottom','width','max-width','transform','margin',
                       'max-height','overflow'];
function mobileStack(){
  if(!isPhone()){ if(stackOn) unstack(); return; }
  stackOn = true;
  if(!stackEl){
    stackEl=document.createElement('div'); stackEl.id='panelStack';
    /* Panel CONTENT is desktop-shaped too, not just the boxes: measured inside the column, roster ran 4582px
       past its own width and market 608px, because both are wide tables laid out for a monitor. Scoped to the
       stack so the desktop layout is untouched. Tables are made to FIT rather than left to scroll sideways - a
       horizontal swipe inside a vertically scrolling column is a fight, not a feature. */
    const css=document.createElement('style');
    css.textContent='#panelStack{font-size:12px}'
      +'#panelStack table{width:100%!important;table-layout:fixed;border-collapse:collapse}'
      +'#panelStack td,#panelStack th{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0}'
      +'#panelStack button{min-height:34px}'
      // The roster is a 32-child flex ROW running 4581px wide: no single child is too big, the row just runs
      // on. It is NOT a direct child of the stack either - the registered panel is #rosterWrap and the row
      // lives inside it, which is why a `>` selector missed it. A descendant selector only affects elements
      // that are flex containers in the first place, so this is narrower than it looks.
      +'#panelStack *{flex-wrap:wrap!important}'
      +'#panelStack > * > *{max-width:100%}'
      // Not panels, but the same phone problem and the same touch-only sheet: the nav bar is 773px wide and
      // CENTRED, so on a 375px screen it runs from -199 to 574 and loses its first two items off the left;
      // the mute button sits at left 375, entirely off the right edge. Measured, both.
      +'#shellBar{left:0!important;right:0!important;width:auto!important;transform:none!important;'
        +'max-width:100vw;overflow-x:auto;white-space:nowrap;justify-content:flex-start;font-size:12px}'
      +'#voiceBtn{left:auto!important;right:8px!important}';
    document.head.appendChild(css);
    const st=stackEl.style;
    st.position='fixed'; st.left='0'; st.right='0';
    st.top=CFG.STACK_TOP+'px'; st.bottom=CFG.STACK_BOTTOM+'px';
    st.overflowY='auto'; st.webkitOverflowScrolling='touch';
    st.zIndex=CFG.STACK_Z; st.pointerEvents='auto';
    document.body.appendChild(stackEl);
    const btn=document.createElement('button');
    btn.id='stackToggle'; btn.type='button'; btn.textContent='▤';
    btn.title='Show or hide the window column';
    const bs=btn.style;
    bs.position='fixed'; bs.left='8px'; bs.bottom='8px'; bs.width='48px'; bs.height='48px';
    bs.zIndex=(CFG.STACK_Z+1); bs.font='18px system-ui,sans-serif'; bs.borderRadius='24px';
    bs.background='rgba(9,17,27,.86)'; bs.color='#9fd8ff'; bs.border='1px solid rgba(120,200,255,.35)';
    btn.addEventListener('click', function(){ stackHidden=!stackHidden; mobileStack(); });
    document.body.appendChild(btn);
  }
  { const b=document.getElementById('stackToggle'); if(b) b.style.display='';
  }
  let any=false;
  for(const id in PANELS_){
    const rec=PANELS_[id], el=rec.el;
    if(rec.open && !stackHidden){
      if(el.parentNode!==stackEl) stackEl.appendChild(el);
      el.style.setProperty('position','static','important');
      el.style.setProperty('left','auto','important');
      el.style.setProperty('right','auto','important');
      el.style.setProperty('top','auto','important');
      el.style.setProperty('bottom','auto','important');
      el.style.setProperty('width','auto','important');
      el.style.setProperty('max-width','none','important');
      el.style.setProperty('transform','none','important');
      el.style.setProperty('margin','0 '+CFG.STACK_PAD+'px '+CFG.STACK_PAD+'px','important');
      el.style.setProperty('max-height',CFG.STACK_ITEM_VH+'vh','important');
      el.style.setProperty('overflow','auto','important');
      any=true;
    } else if(el.parentNode===stackEl){
      document.body.appendChild(el);
      STACK_OVERRIDES.forEach(function(k){ el.style.removeProperty(k); });
    }
    // the desktop affordances have no meaning in a scrolling column - but they are only HIDDEN, and
    // unstack() puts them back, so widening the window returns a full desktop panel set
    [rec.tab, rec.ctl, rec.grip, rec.gripE, rec.gripS].forEach(function(n){ if(n) n.style.display='none'; });
  }
  stackEl.style.display = any ? 'block' : 'none';
}

/* Undo the phone layout: panels go back to the body, their forced styles are dropped, and every piece of
   desktop chrome is shown again. Without this the first narrow moment in a session would take the resize
   grips away for good. */
function unstack(){
  stackOn = false;
  for(const id in PANELS_){
    const rec=PANELS_[id], el=rec.el;
    if(stackEl && el.parentNode===stackEl) document.body.appendChild(el);
    STACK_OVERRIDES.forEach(function(k){ el.style.removeProperty(k); });
    [rec.tab, rec.ctl, rec.grip, rec.gripE, rec.gripS].forEach(function(n){ if(n) n.style.display=''; });
    applyVisual(rec);
  }
  if(stackEl) stackEl.style.display='none';
  const b=document.getElementById('stackToggle'); if(b) b.style.display='none';
  reflowAll();
}

let retickT=null;
function retickTabs(){ if(isPhone() || stackOn){ mobileStack(); return; }   // the phone has no floating chrome to retick
  for(const id in PANELS_){ const rec=PANELS_[id]; const t=tabPosition(rec);
  rec.tab.style.top=t.top||''; rec.tab.style.bottom=t.bottom||''; rec.tab.style.left=t.left||''; rec.tab.style.right=t.right||''; rec.tab.style.transform=t.transform||'';
  if(rec.open){ const c=ctlPosition(rec); rec.ctl.style.top=c.top; rec.ctl.style.left=c.left; rec.ctl.style.width=c.width; if(rec.grip) positionGrip(rec); } } }

function open(id){ const r=PANELS_[id]; if(r){ setOpen(r,true); mobileStack(); } }
function close(id){ const r=PANELS_[id]; if(r){ setOpen(r,false); mobileStack(); } }
function toggle(id){ const r=PANELS_[id]; if(r){ setOpen(r,!r.open); mobileStack(); } return r?r.open:null; }
function isOpen(id){ const r=PANELS_[id]; return r?r.open:null; }
function reflowAll(){ for(const e of Object.keys(EDGE_MEMBERS)) reflowEdge(e); }
addEventListener('resize', ()=>{ for(const id in PANELS_) applyVisual(PANELS_[id]); reflowAll(); });

function list(){ return Object.keys(PANELS_).map(id=>({ id, title:PANELS_[id].title, open:!!PANELS_[id].open, pinned:!!PANELS_[id].pinned })); }   // 2026-09-06: the WINDOWS menu reads every registered panel from here, so it can never drift from what is registered
const api={ register, open, close, toggle, isOpen, list, reflow:reflowAll, clearSize, resetLayout, CFG,
  isManual:(id)=>!!(store[id]&&store[id].manualDock) };   // 2026-07-09: lets legacy layout code ask "does the player own this panel's position?" before writing to it (the market re-center line was silently stomping manual docks on every viewport pass)
if(typeof window!=='undefined') window.PANELS=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
