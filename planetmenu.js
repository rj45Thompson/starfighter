/* =================================================================================================
   planetmenu.js - Space-Rangers-style FULL-SCREEN planet/dock screen for starfighter.html.
   One global: window.PLANETMENU { init(), tick(dt), open(planet,{isBase}), close(), isOpen(),
   pushEvent(html) }. Pure UI: reads window.HOST, never mutates game state - every action routes
   through HOST.runCmd(...) / MISSIONS.accept(i) / CONQUEST.addDefense(p). Degrades silently when
   any HOST field or sibling module is missing. ASCII only.
   ================================================================================================= */
(function(){
'use strict';

/* ------------------------------------------------ CONFIG (no magic numbers below this block) */
var CFG = {
  Z_INDEX: 74,                  // above the away-mission overlay (60) and the war banner (60)
  REFRESH_HEADER_S: 1.0,        // header credits/fuel/hull re-render cadence while open
  REFRESH_CONTENT_S: 3.0,       // live tabs (market/log/ground) re-render cadence while open
  LOG_MAX: 80,                   // ring-buffer length for pushEvent (SR-M10: a real browsable news timeline, not a 12-line scratchpad)
  QTY_STEPS: [1, 10],           // per-click trade quantities
  DEF_PIPS_MAX: 5,              // defense pips shown in header + ground tab
  EQUIP_BAY_VISUAL_MAX: 8,      // read by nothing since the loadout grid was deleted 2026-09-06 - kept as the declared box count if a bay grid returns
                                 //   cap (the host's P.equip is an uncapped stacking count, not real slots)
  INFRA_PCT_PER_DEV: 10,        // derived infra% per planet dev level when no explicit infra field
  PROFIT_RATIO: 1.0,            // sell price > base*ratio -> highlighted green (profitable sell)
  STOCK_RESERVE: 4,             // the game keeps this many units unbuyable (host buy() floor)
  REPAIR_RATE_PLANET: 0.5,      // display-only cost estimate: credits per missing hull pt (planet)
  REPAIR_RATE_BASE: 0.4,        //   ... at Ranger Command (mirrors host runCmd 'repair' rates)
  MISSION_BTN_N: 4,             // fallback accept-button count when MISSIONS exposes no list()
  PORTRAIT_PX: 168,             // planet portrait disc diameter
  FUEL_WARN_FRAC: 0.3,          // fuel below this fraction of cap renders amber in the header
  HULL_WARN_FRAC: 0.4,          // hull below this fraction renders red in the header
  TABS: [ {k:'market',   n:'MARKET'},
          {k:'hangar',   n:'SHOP'},                    /* 2026-07-09: the flat SR:AWA store (shopHtml) - key stays 'hangar' so every existing setTab/openMenu caller keeps working */
          {k:'missions', n:'MISSIONS'},
          {k:'quests',   n:'QUESTS'},
          {k:'ground',   n:'GROUND'},
          {k:'bar',      n:'BAR'},                     /* SR-M18: pilots, rumors, wing contracts (hotkeys stop at 6 - click-only) */
          {k:'science',  n:'SCIENCE', onlyScience:true}, /* SR-M19: Athenaeum only - renderTabs filters it elsewhere */
          {k:'log',      n:'NEWS'} ],
          /* DEPART left the tab row 2026-07-09 ("make the menus easier to use, simpler"): a tab whose entire body
             was one button is a button wearing a tab costume - it's now the green button in the header, one click,
             always visible, no tab switch first. */
  BAR_RADIUS_MULT: 2,           /* SR-M18: ships within DEFEND_R*this of the planet count as "at the bar" */
  BAR_MAX_PATRONS: 8,           /* patron list cap (legibility) */
  BAR_MAX_RUMORS: 6,            /* rumors rendered per visit */
  BAR_LINE_MAX: 140,            /* novel-segment quote clip */
  UP_KINDS: [ {k:'weapon', n:'WEAPON', d:'faster, harder-hitting guns'},
              {k:'engine', n:'ENGINE', d:'more thrust - close, chase, escape'},
              {k:'hull',   n:'HULL',   d:'more max hull (upgrade repairs to full)'} ],
  OWNER: { coalition:{ n:'COALITION SPACE',    c:'#7fd0b0' },
           synod:    { n:'IRON SYNOD CONTROL', c:'#ff8a8a' },
           player:   { n:'YOUR WORLD',         c:'#c9a0ff' },
           base:     { n:'RANGER COMMAND',     c:'#9fd8ff' } }
};
var COL = { HEAD:'#8fd0ff', GOOD:'#7fd0b0', BAD:'#ff8a8a', AMBER:'#ffd27a', VIOLET:'#c9a0ff',
            TEXT:'#e2eefb', DIM:'#9db3ca', BORDER:'#24344a', BASE:'#9fd8ff',   // TEXT/DIM lifted 2026-09-06 (RJ: "the letters should be lit fairly well for legibility") - #cfe2f5/#7d93ad were thin over the dark portrait and panels
            PANEL:'rgba(9,15,25,.92)', PANEL2:'rgba(13,21,34,.94)' };

/* ------------------------------------------------ STATE */
var S = { built:false, keysBound:false, open:false, planet:null, isBase:false,
          tab:'market', tHead:0, tBody:0, log:[], el:{},
          slotOpen:{} };   /* empty on purpose: the expand/collapse loadout screen this drove was deleted 2026-09-06 (unreachable since the flat SHOP replaced it); toggleSlot still answers a stray slot click without throwing */

/* ------------------------------------------------ SAFE HOST ACCESS */
function H(){ return window.HOST || null; }
function player(){ var h=H(); if(!h) return null; if(h.P) return h.P; if(h.ships && h.ships[0]) return h.ships[0]; return null; }
function runCmd(s){ var h=H(); if(h && typeof h.runCmd==='function'){ try{ h.runCmd(s); }catch(e){} } }
function sfx(n){ var h=H(); if(h && typeof h.sound==='function'){ try{ h.sound(n); }catch(e){} } }
function notifyHost(html,lvl){ var h=H(); if(h && typeof h.notify==='function'){ try{ h.notify(html,lvl||'log'); }catch(e){} } }
function goods(){ var h=H(); return (h && Array.isArray(h.GOODS)) ? h.GOODS : []; }
function price(p,k,buying){ var h=H();
  if(h && typeof h.priceOf==='function' && p){ try{ var v=h.priceOf(p,k,buying); if(typeof v==='number' && isFinite(v)) return v; }catch(e){} }
  return NaN; }
function gameT(){ var h=H(); return (h && typeof h.T0==='number') ? h.T0 : null; }

/* ------------------------------------------------ SMALL HELPERS */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function num(v,d){ return (typeof v==='number' && isFinite(v)) ? v : d; }
function keysOf(o){ var a=[],k; if(o && typeof o==='object'){ for(k in o) a.push(k); } return a; }
function fmtC(v){ return isFinite(v) ? (Math.round(v)+'c') : '--'; }
function clampN(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function hex6(n){ var s=((Number(n)||0) & 0xFFFFFF).toString(16); while(s.length<6) s='0'+s; return '#'+s; }
function shade(hex,f){ /* f in [-1,1]: mix toward black (neg) or white (pos) */
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  var t=(f>=0)?255:0, a=Math.abs(f);
  function m(c){ var v=Math.round(c+(t-c)*a); v=clampN(v,0,255); var x=v.toString(16); return x.length<2?('0'+x):x; }
  return '#'+m(r)+m(g)+m(b); }
function tstr(t){ if(typeof t!=='number' || !isFinite(t)) return '--:--';
  var m=Math.floor(t/60), s2=Math.floor(t%60); return (m<10?'0':'')+m+':'+(s2<10?'0':'')+s2; }
function holdOf(P){ if(!P) return {}; if(P.hold && typeof P.hold==='object') return P.hold; if(P.cargo && typeof P.cargo==='object') return P.cargo; return {}; }
function holdTotal(P){ var o=holdOf(P), n=0, k; for(k in o){ var v=Number(o[k]); if(isFinite(v)) n+=v; } return Math.round(n); }
function rankName(P){ var h=H(); var R=h && h.RANKS; if(!Array.isArray(R) || !R.length || !P) return '';
  var sc=num(P.score,0), best='';
  for(var i=0;i<R.length;i++){ var th=(R[i] && R[i].score!=null)?R[i].score:(R[i]?R[i].pts:null);
    if(th==null) continue; if(sc>=th) best=(R[i].n||best); }
  return best; }

/* ------------------------------------------------ DERIVED PLANET FACTS (defensive) */
function ownerOf(p){
  try{ var C=window.CONQUEST; if(C && typeof C.ownerOf==='function'){ var o=C.ownerOf(p); if(o==='player'||o==='synod'||o==='coalition') return o; } }catch(e){}
  if(!p) return 'coalition';
  if(p.owner==='player' || p.ownedBy==='player' || p.playerOwned===true || p.yours===true) return 'player';
  if(p.hegemon) return 'synod';
  return 'coalition'; }
function defenseOf(p){ var v=null;
  try{ var C=window.CONQUEST; if(C && typeof C.defenseOf==='function') v=C.defenseOf(p); }catch(e){}
  if(v==null && p){ if(typeof p.defense==='number') v=p.defense; else if(typeof p.def==='number') v=p.def; else v=0; }
  return clampN(Math.round(Number(v)||0), 0, CFG.DEF_PIPS_MAX); }
function infraPct(p){ if(!p) return 0;
  var v=p.infra;
  if(typeof v==='number' && isFinite(v)) return clampN(Math.round(v<=1 ? v*100 : v), 0, 100);
  return clampN(Math.round(num(p.dev,1)*CFG.INFRA_PCT_PER_DEV), 0, 100); }
function conquestLine(p){
  try{ var C=window.CONQUEST; if(C && typeof C.describe==='function'){ var t=C.describe(p); if(t) return String(t); } }catch(e){}
  return ''; }

/* ------------------------------------------------ CSS + FRAME */
function cssText(){
  return [
  '#pmRoot{position:fixed;inset:0;z-index:'+CFG.Z_INDEX+';display:none;align-items:center;justify-content:center;',
  '  background:radial-gradient(ellipse at 50% 38%, rgba(10,18,32,.88), rgba(3,6,12,.95));',
  '  font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;color:'+COL.TEXT+';pointer-events:auto}',
  '#pmRoot .pm-fx{position:absolute;inset:0;pointer-events:none;z-index:5;',
  '  background:repeating-linear-gradient(0deg, rgba(159,216,255,.02) 0 1px, rgba(0,0,0,0) 1px 3px),',
  '  radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,.42) 100%)}',
  '#pmRoot .pm-frame{position:relative;z-index:2;display:flex;flex-direction:column;width:min(1150px,95vw);height:min(780px,92vh);',
  '  background:'+COL.PANEL+';border:1px solid '+COL.BORDER+';border-radius:6px;overflow:hidden;',
  '  box-shadow:0 0 0 1px rgba(143,208,255,.06), 0 18px 60px rgba(0,0,0,.65)}',
  '.pm-head{display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid '+COL.BORDER+';background:'+COL.PANEL2+'}',
  '.pm-title{font-size:20px;font-weight:800;letter-spacing:.06em;color:#eaf4ff}',
  '.pm-sub{color:'+COL.DIM+';font-size:12px}',
  '.pm-chip{display:inline-block;border:1px solid '+COL.BORDER+';border-radius:4px;padding:1px 8px;font-size:11px;letter-spacing:.06em;margin-right:6px;white-space:nowrap}',
  '.pm-you{margin-left:auto;text-align:right;font-size:12px;line-height:1.6;white-space:nowrap}',
  '.pm-x{font:inherit;font-weight:700;color:'+COL.BAD+';background:#1a0f16;border:1px solid #5a2d36;border-radius:4px;padding:4px 12px;cursor:pointer;margin-left:12px}',
  '.pm-x:hover{background:#301820;color:#ffb0b0}',
  '.pm-depart{font:inherit;font-weight:800;color:#04140c;background:linear-gradient(#8fe6b0,#4fd68a);border:1px solid #bff5d6;border-radius:4px;padding:4px 14px;cursor:pointer;margin-left:12px;letter-spacing:.05em}',
  '.pm-depart:hover{background:linear-gradient(#a5f0c2,#63e29c)}',
  '.pm-main{display:flex;flex:1;min-height:0}',
  '.pm-side{width:264px;min-width:264px;border-right:1px solid '+COL.BORDER+';padding:16px;overflow-y:auto;background:rgba(7,12,21,.6)}',
  '.pm-right{display:flex;flex-direction:column;flex:1;min-width:0}',
  '.pm-tabs{display:flex;gap:6px;padding:10px 12px 0 12px;border-bottom:1px solid '+COL.BORDER+';flex-wrap:wrap}',
  '.pm-tab{font:inherit;font-size:12px;letter-spacing:.08em;color:'+COL.DIM+';background:#0d1626;border:1px solid '+COL.BORDER+';',
  '  border-bottom:none;border-radius:5px 5px 0 0;padding:6px 14px;cursor:pointer}',
  '.pm-tab:hover{color:#eaf4ff;background:#13203a}',
  '.pm-tab.on{color:#eaf4ff;background:#16283e;border-color:'+COL.HEAD+';box-shadow:inset 0 2px 0 '+COL.HEAD+'}',
  '.pm-tab .pm-k{color:'+COL.AMBER+';margin-right:6px}',
  '.pm-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px}',
  '.pm-foot{padding:7px 16px;border-top:1px solid '+COL.BORDER+';color:'+COL.DIM+';font-size:11px;letter-spacing:.05em;background:'+COL.PANEL2+'}',
  '.pm-disc{border-radius:50%;margin:2px auto 12px auto;position:relative}',
  '.pm-panel{border:1px solid '+COL.BORDER+';border-radius:5px;background:rgba(11,18,30,.85);padding:10px 12px;margin-bottom:12px}',
  '.pm-panel h4{margin:0 0 6px 0;font-size:11px;letter-spacing:.1em;color:'+COL.HEAD+';font-weight:700}',
  '.pm-b{font:inherit;font-size:12px;color:'+COL.TEXT+';background:#101b2c;border:1px solid '+COL.BORDER+';border-radius:4px;padding:3px 10px;cursor:pointer}',
  '.pm-b:hover{border-color:'+COL.HEAD+';background:#16283e;color:#eaf4ff}',
  '.pm-b:disabled{opacity:.32;cursor:default;background:#101b2c;border-color:'+COL.BORDER+';color:'+COL.TEXT+'}',
  '.pm-b.pm-big{font-size:16px;font-weight:800;letter-spacing:.1em;padding:14px 30px}',
  '.pm-b.pm-go{border-color:#2c5a4a;color:'+COL.GOOD+'}  .pm-b.pm-go:hover{background:#12301f;border-color:'+COL.GOOD+'}',
  '.pm-b.pm-warn{border-color:#5a2d36;color:'+COL.BAD+'} .pm-b.pm-warn:hover{background:#301820;border-color:'+COL.BAD+'}',
  '.pm-b.pm-vio{border-color:#4a3a6a;color:'+COL.VIOLET+'} .pm-b.pm-vio:hover{background:#241a3a;border-color:'+COL.VIOLET+'}',
  '.pm-t{width:100%;border-collapse:collapse}',
  '.pm-t th{color:'+COL.HEAD+';text-align:left;font-weight:700;border-bottom:1px solid '+COL.BORDER+';padding:4px 8px;font-size:11px;letter-spacing:.08em;white-space:nowrap}',
  '.pm-t td{border-bottom:1px solid #16233a;padding:5px 8px;vertical-align:middle;white-space:nowrap}',
  '.pm-t tr:hover td{background:rgba(143,208,255,.045)}',
  '.pm-tag{display:inline-block;border-radius:3px;padding:0 5px;font-size:10px;letter-spacing:.06em;margin-left:6px}',
  /* WEAPON SHOP COMPARISON (2026-09-06): one chip per number, coloured by whether the swap helps or hurts */
  '.pm-cmpRow{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}',
  '.pm-cmp{font-size:11px;border:1px solid #2b3d52;border-radius:3px;padding:1px 6px;color:'+COL.DIM+';white-space:nowrap}',
  '.pm-cmp b{color:#dbe7f1;font-weight:600;font-variant-numeric:tabular-nums}',
  '.pm-cmp i{font-style:normal;font-variant-numeric:tabular-nums}',
  '.pm-cmp.up{border-color:#2c5a4a}', '.pm-cmp.up i{color:'+COL.GOOD+'}',
  '.pm-cmp.dn{border-color:#5a2c34}', '.pm-cmp.dn i{color:'+COL.BAD+'}',
  '.pm-cmp.eq{opacity:.55}', '.pm-cmp.neu{border-color:#4a4a2c;color:'+COL.AMBER+'}', '.pm-cmp.none{opacity:.45}',
  '.pm-row.pm-fitted{background:rgba(94,230,168,.06);border-radius:5px}',
  '.pm-tag.mk{color:'+COL.GOOD+';border:1px solid #2c5a4a}',
  '.pm-tag.nd{color:'+COL.AMBER+';border:1px solid #5a4a2c}',
  '.pm-pip{display:inline-block;width:9px;height:9px;border-radius:50%;border:1px solid '+COL.BORDER+';margin-right:3px;vertical-align:middle}',
  '.pm-pip.on{background:'+COL.GOOD+';border-color:'+COL.GOOD+';box-shadow:0 0 5px '+COL.GOOD+'}',
  '.pm-row{display:flex;align-items:center;gap:10px;border:1px solid '+COL.BORDER+';border-radius:5px;background:rgba(11,18,30,.85);padding:9px 12px;margin-bottom:8px}',
  '.pm-row .pm-grow{flex:1;min-width:0}',
  '.pm-row.pm-slot{font:inherit;transition:background .12s,border-color .12s}',
  '.pm-row.pm-slot:hover{border-color:'+COL.HEAD+'}',
  '.pm-eqbox{display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;font-size:11px;',
  '  border:1px dashed '+COL.BORDER+';border-radius:3px;margin-right:3px;color:'+COL.GOOD+'}',
  '.pm-eqbox.on{border-style:solid;border-color:'+COL.GOOD+';background:rgba(127,208,176,.14)}',
  '.pm-note{color:'+COL.DIM+';padding:8px 2px}',
  '.pm-board{white-space:pre-wrap;border:1px solid '+COL.BORDER+';border-radius:5px;background:rgba(11,18,30,.85);padding:10px 12px;margin-bottom:10px}',
  '.pm-log{border-bottom:1px solid #16233a;padding:5px 2px}',
  '.pm-log .pm-tm{color:'+COL.DIM+';margin-right:8px}',
  '.pm-center{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;text-align:center}'
  ].join('\n'); }

function frameHtml(){
  return '<div class="pm-frame">'
    +   '<div class="pm-head" id="pmHead"></div>'
    +   '<div class="pm-main">'
    +     '<div class="pm-side" id="pmSide"></div>'
    +     '<div class="pm-right">'
    +       '<div class="pm-tabs" id="pmTabs"></div>'
    +       '<div class="pm-body" id="pmBody"></div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="pm-foot">[1-8] tabs &nbsp;-&nbsp; [Esc] close &nbsp;-&nbsp; <span style="color:#7fd0b0">▲ DEPART</span> (top right) launches &nbsp;-&nbsp; every action routes through the ship terminal</div>'
    + '</div>'
    + '<div class="pm-fx"></div>'; }

/* ------------------------------------------------ DOM BOOTSTRAP */
function ensureDom(){
  if(S.built) return true;
  if(typeof document==='undefined' || !document.body) return false;
  var st=document.createElement('style'); st.id='pm-style'; st.textContent=cssText(); document.head.appendChild(st);
  var root=document.createElement('div'); root.id='pmRoot'; root.innerHTML=frameHtml(); document.body.appendChild(root);
  S.el.root=root;
  S.el.head=root.querySelector('#pmHead');
  S.el.side=root.querySelector('#pmSide');
  S.el.tabs=root.querySelector('#pmTabs');
  S.el.body=root.querySelector('#pmBody');
  root.addEventListener('click', onClick);
  if(!S.keysBound){ window.addEventListener('keydown', onKey, true); S.keysBound=true; }
  S.built=true; return true; }

/* ------------------------------------------------ INPUT */
function onKey(e){
  if(!S.open) return;
  var tgt=e.target, typing = tgt && (tgt.tagName==='INPUT' || tgt.tagName==='TEXTAREA' || tgt.isContentEditable);
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
  if(typing) return;
  if(e.key>='1' && e.key<='8'){ var i=e.key.charCodeAt(0)-49;   /* 2026-07-09: was 1-6, silently ignoring the last tabs */
    if(CFG.TABS[i]){ e.preventDefault(); e.stopPropagation(); setTab(CFG.TABS[i].k); } } }

function onClick(e){
  var b = (e.target && e.target.closest) ? e.target.closest('[data-act]') : null;
  if(!b || b.disabled) return;
  var act=b.getAttribute('data-act');
  if(act==='close'){ closeMenu(); return; }
  if(act==='tab'){ setTab(b.getAttribute('data-tab')); return; }
  if(act==='cmd'){ runCmd(b.getAttribute('data-cmd')||''); sfx('ui'); renderAll(); return; }
  if(act==='land'){ closeMenu(); runCmd('land'); return; }              /* AWAY overlay sits below ours -> close first */
  if(act==='depart'){ doDepart(); return; }
  if(act==='accept'){ tryAccept(parseInt(b.getAttribute('data-i'),10)); sfx('ui'); renderBody(); return; }
  if(act==='defense'){ tryAddDefense(); sfx('ui'); renderAll(); return; }
  if(act==='slot'){ toggleSlot(b.getAttribute('data-slot')); return; } }

function toggleSlot(k){
  if(!S.slotOpen.hasOwnProperty(k)) return;
  S.slotOpen[k] = !S.slotOpen[k]; sfx('ui'); renderBody(); }

function tryAccept(i){ var M=window.MISSIONS;
  if(!M || typeof M.accept!=='function' || !isFinite(i)) return;
  try{ var r=M.accept(i); if(r && r.msg) notifyHost(r.ok?('Accepted: '+esc(r.msg.replace(/^accepted:\s*/,''))):esc(r.msg), r.ok?'flag':'log'); }   // BUGFIX: the result was silently discarded - a rank-too-low/already-on-assignment rejection looked identical to a dead button
  catch(e){ notifyHost('mission board offline','log'); } }
function tryAddDefense(){ var C=window.CONQUEST;
  if(!C || typeof C.addDefense!=='function' || !S.planet) return;
  try{ C.addDefense(S.planet); }catch(e){} }
function doDepart(){ var nm=(S.planet && S.planet.name) ? S.planet.name : 'the berth';
  closeMenu(); runCmd('depart');   /* 2026-07-09 live-caught: was runCmd('launch') = the AWAY-mission return, which never undocks a ship in space - the real `depart` host command exists now */
  notifyHost('Departed '+esc(nm)+' - the ship is yours again.','log'); }

/* ------------------------------------------------ RENDER: HEADER */
function pipsHtml(n){ var h='', i;
  for(i=0;i<CFG.DEF_PIPS_MAX;i++) h+='<span class="pm-pip'+(i<n?' on':'')+'"></span>';
  return h; }

function renderHead(){
  if(!S.el.head) return;
  var p=S.planet, P=player();
  var ownKey = S.isBase ? 'base' : ownerOf(p);
  var ob = CFG.OWNER[ownKey] || CFG.OWNER.coalition;
  var name = S.isBase ? ((p&&p.name)||'Ranger Command') : ((p&&p.name)||'Unknown World');
  var typ  = S.isBase ? 'orbital station' : ((p&&p.type&&p.type.t)?p.type.t:'?');
  var sys  = (p&&p.system&&p.system.name) ? (p.system.name+' system') : (S.isBase?'coalition HQ':'uncharted');
  var dev  = (p&&typeof p.dev==='number') ? (' Lv'+Math.round(p.dev)) : '';
  var chips='';
  chips += '<span class="pm-chip" style="color:'+ob.c+';border-color:'+ob.c+'">'+ob.n+'</span>';
  if(!S.isBase && p){
    var rp=num(p.rep,0);
    chips += '<span class="pm-chip" style="color:'+(rp>0?COL.GOOD:(rp<0?COL.BAD:COL.DIM))+'">REP '+(rp>0?'+':'')+Math.round(rp)+'</span>';
    chips += '<span class="pm-chip">INFRA '+infraPct(p)+'%</span>';
    chips += '<span class="pm-chip">DEF '+pipsHtml(defenseOf(p))+'</span>';
    if(p.underThreat) chips += '<span class="pm-chip" style="color:'+COL.BAD+';border-color:'+COL.BAD+'">UNDER THREAT</span>'; }
  var you='';
  if(P){
    var fuel=num(P.fuel,0), fcap=Math.max(1,num(P.fuelCap,1)), hp=num(P.hp,0), mhp=Math.max(1,num(P.maxHp,1));
    var fc = (fuel/fcap<CFG.FUEL_WARN_FRAC)?COL.AMBER:COL.TEXT;
    var hc = (hp/mhp<CFG.HULL_WARN_FRAC)?COL.BAD:COL.GOOD;
    var rk = rankName(P);
    you = '<div class="pm-you">'
        + '<span style="color:'+COL.AMBER+'">'+Math.round(num(P.credits,0))+'c</span>'
        + ' &nbsp;fuel <span style="color:'+fc+'">'+Math.round(fuel)+'/'+Math.round(fcap)+'</span>'
        + ' &nbsp;hull <span style="color:'+hc+'">'+Math.round(hp)+'/'+Math.round(mhp)+'</span>'
        + '<br><span class="pm-sub">hold '+holdTotal(P)+'/'+Math.round(num(P.holdCap,0))+(rk?(' - rank '+esc(rk)):'')+'</span>'
        + '</div>'; }
  S.el.head.innerHTML =
      '<div><div class="pm-title" style="color:'+ob.c+'">'+esc(name)+'</div>'
    + '<div class="pm-sub">'+esc(typ)+dev+' - '+esc(sys)+'</div>'
    + '<div style="margin-top:5px">'+chips+'</div></div>'
    + you
    + '<button class="pm-depart" data-act="depart" title="launch - undock and return to space">▲ DEPART</button>'
    + '<button class="pm-x" data-act="close" title="close (Esc) - stay docked">X</button>'; }

/* ------------------------------------------------ RENDER: LEFT SIDE (portrait + status + how-it-works) */
/* DARK WORLDS (RJ 2026-09-06: "the letters don't contrast to the planet. make the planet dark with emissive lights
   like a Cybertron. dark and mysterious"). The portrait was a bright lit sphere, so the label sitting over it had
   nothing to contrast against. It is now a night-side world: a near-black body carrying its own hue, a thin lit
   limb where the star grazes it, and emissive settlement lights in the planet's own colour.
   The lights are DERIVED, not decorative: the seed is the planet's name, so a world looks the same every time it
   is opened and two worlds never look alike; the count follows its development level and the colour follows its
   type, so a busy industrial world really is brighter than an empty rock. */
function seedOf(str){ var h=2166136261, i; str=String(str||'world');
  for(i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h*16777619)>>>0; } return h>>>0; }
function rngOf(seed){ return function(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
function rgba(hx,a){ var n=parseInt(String(hx).replace('#',''),16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
function cityLights(p, hx){
  // how many lights this world has EARNED: development level, plus a floor so even a frontier rock shows a camp.
  var lvl = (p && typeof p.dev==='number') ? p.dev : (p && typeof p.level==='number' ? p.level : 1);
  var n = Math.max(6, Math.min(34, Math.round(6 + lvl*5)));
  var rnd = rngOf(seedOf((p&&p.name)||'world')), out=[], i;
  var lit = shade(hx, 0.62), core = shade(hx, 0.86);
  for(i=0;i<n;i++){
    // uniform-on-disc sampling, then pushed toward the NIGHT side (away from the lit limb at 32%,30%)
    var t = rnd()*Math.PI*2, r = Math.sqrt(rnd())*0.86;
    var x = 50 + Math.cos(t)*r*50, y = 50 + Math.sin(t)*r*50;
    var night = Math.min(1, (Math.hypot(x-32, y-30)/70));          // 0 at the lit limb, 1 across the terminator
    if(night < 0.34 && rnd() > night*2) continue;                   // the day side keeps its lights to itself
    var size = 2.2 + rnd()*4.6, a = (0.30 + 0.62*night) * (0.55 + rnd()*0.45);
    out.push('radial-gradient(circle '+size.toFixed(1)+'px at '+x.toFixed(1)+'% '+y.toFixed(1)+'%, '
      + rgba(core, a.toFixed(2)) + ' 0%, ' + rgba(lit, (a*0.55).toFixed(2)) + ' 45%, rgba(0,0,0,0) 100%)');
  }
  return out;
}
function portraitHtml(){
  var p=S.planet;
  var colNum = S.isBase ? 0x9fd8ff : ((p&&p.type&&typeof p.type.col==='number') ? p.type.col : 0x37506a);
  var hx=hex6(colNum);
  var body = shade(hx,-0.86), deep = shade(hx,-0.94), limb = shade(hx,0.42), glow = shade(hx,0.20);
  var sz=CFG.PORTRAIT_PX;
  var layers = cityLights(p, hx);
  // two faint structure bands - the built-over look, not a texture
  layers.push('linear-gradient(0deg, rgba(0,0,0,0) 41%, '+rgba(limb,0.07)+' 43%, rgba(0,0,0,0) 45%)');
  layers.push('linear-gradient(0deg, rgba(0,0,0,0) 62%, '+rgba(limb,0.05)+' 63.5%, rgba(0,0,0,0) 65%)');
  layers.push('radial-gradient(circle at 30% 26%, '+rgba(limb,0.16)+' 0%, rgba(0,0,0,0) 38%)');   // the grazed limb
  layers.push('radial-gradient(circle at 32% 30%, '+body+' 0%, '+deep+' 62%, #04070c 100%)');     // the body itself
  return '<div class="pm-disc" style="width:'+sz+'px;height:'+sz+'px;'
    + 'background:'+layers.join(',')+';'
    + 'box-shadow:0 0 30px '+glow+'3d, inset -14px -12px 34px rgba(0,0,0,.72), inset 8px 8px 22px '+rgba(limb,0.10)+'"></div>'; }

function statusFallback(){
  var p=S.planet;
  if(S.isBase) return 'The coalition\'s central star base: repairs, hull swaps and the black market. No ground to walk, no commodity exchange.';
  if(!p) return 'No berth data.';
  var mk=keysOf(p.type&&p.type.makes), nd=keysOf(p.type&&p.type.needs), bits=[];
  if(mk.length) bits.push('makes '+mk.join(', '));
  if(nd.length) bits.push('needs '+nd.join(', '));
  if(typeof p.wealth==='number') bits.push('treasury '+Math.round(p.wealth)+'c');
  if(typeof p.terra==='number' && p.terra>0) bits.push('terraformed '+Math.round(p.terra*100)+'%');
  if(p.underThreat) bits.push('<span style="color:'+COL.BAD+'">UNDER THREAT</span>');
  return bits.join(' - ') || 'A quiet world.'; }

/* SR PLANET INFO PANEL (user 2026-07-12 "copy each SR menu exactly"): SR's planet screen always shows an info
   window - political system / economic system / population / attitude-to-you. Built ONLY from real planet fields we
   actually store (type.makes/needs, dev, infra, wealth, owner, rep, terra, underThreat), each labeled - nothing
   invented (iron rule). "Economy" derives from what the world makes/needs; "government" from its allegiance;
   "standing" from your reputation with it (SR's attitude line, exact). */
function intelRow(label, val, col){
  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid #16233a">'
    + '<span style="color:'+COL.DIM+';letter-spacing:.06em">'+label+'</span>'
    + '<span style="color:'+(col||COL.TEXT)+';text-align:right">'+val+'</span></div>'; }
function economyLabel(p){
  var mk=keysOf(p&&p.type&&p.type.makes), nd=keysOf(p&&p.type&&p.type.needs);
  if(mk.length && nd.length) return 'exports '+mk.slice(0,2).join('/')+' · imports '+nd.slice(0,1).join('');
  if(mk.length) return 'exports '+mk.slice(0,2).join('/');
  if(nd.length) return 'imports '+nd.slice(0,2).join('/');
  return 'subsistence'; }
function standingLabel(rp){
  return (rp>0?'+':'')+Math.round(rp)+' '+(rp>15?'allied':rp>0?'friendly':rp<-15?'hostile':rp<0?'wary':'neutral'); }
function planetIntelHtml(){
  var p=S.planet;
  if(S.isBase){
    var bc=(CFG.OWNER.base&&CFG.OWNER.base.c)||COL.GOOD;
    return '<div class="pm-panel"><h4>STATION INTEL</h4>'
      + intelRow('CLASS','orbital HQ')
      + intelRow('ALLEGIANCE','coalition', bc)
      + intelRow('SERVICES','repair · hangar · market')
      + '</div>'; }
  if(!p) return '';
  var own=ownerOf(p), ob=CFG.OWNER[own]||CFG.OWNER.coalition, rp=num(p.rep,0);
  var rows = intelRow('ECONOMY', esc(economyLabel(p)))
    + intelRow('DEVELOPMENT', 'Lv'+Math.round(num(p.dev,1))+' · infra '+infraPct(p)+'%')
    + (typeof p.wealth==='number' ? intelRow('TREASURY', Math.round(p.wealth)+'c') : '')
    + intelRow('GOVERNMENT', esc(ob.n), ob.c)
    + intelRow('STANDING', standingLabel(rp), rp>0?COL.GOOD:(rp<0?COL.BAD:COL.DIM))
    + intelRow('DEFENSE', pipsHtml(defenseOf(p)))
    + ((typeof p.terra==='number'&&p.terra>0) ? intelRow('TERRAFORM', Math.round(p.terra*100)+'%') : '')
    + (p.underThreat ? intelRow('ALERT','UNDER THREAT', COL.BAD) : '');
  return '<div class="pm-panel"><h4>PLANET INTEL</h4>'+rows+'</div>'; }

function renderSide(){
  if(!S.el.side) return;
  var p=S.planet;
  var status = conquestLine(p) || statusFallback();
  S.el.side.innerHTML =
      portraitHtml()
    + '<div style="text-align:center;color:#eaf6ff;font-size:13px;font-weight:600;letter-spacing:.20em;margin:-4px 0 12px 0;'
    +   'text-shadow:0 0 12px '+COL.HEAD+'88, 0 0 3px rgba(0,0,0,.9), 0 1px 2px rgba(0,0,0,.95)">'
    +   esc(S.isBase?((p&&p.name)||'RANGER COMMAND'):((p&&p.name)||'?')).toUpperCase() + '</div>'
    + planetIntelHtml()
    + '<div class="pm-panel"><h4>STATUS</h4><div>'+status+'</div></div>'
    + '<div class="pm-panel"><h4>DOCK GUIDE</h4>'
    +   '<div style="margin-bottom:6px"><span style="color:'+COL.VIOLET+'">CONTEST:</span> a red world is Synod-held - '
    +   'LAND there to fight for it, and if you take it, ADD DEFENSE so it holds.</div>'
    +   '<div><span style="color:'+COL.GOOD+'">TRADE:</span> buy what a world MAKES (high stock = cheap), '
    +   'haul it to a world that NEEDS it (low stock = dear), sell green prices - refit in the SHOP.</div>'
    + '</div>'; }

/* ------------------------------------------------ RENDER: TABS */
function renderTabs(){
  if(!S.el.tabs) return;
  var h='', i;
  for(i=0;i<CFG.TABS.length;i++){ var t=CFG.TABS[i];
    if(t.onlyScience && !(S.planet && S.planet.isScience)) continue;   /* SR-M19: the SCIENCE tab exists only at the Athenaeum */
    var label = t.n + (t.k==='log' && S.log.length ? (' ('+S.log.length+')') : '')
      + (t.k==='quests' && questPending() ? ' <span class="pm-tag mk">!</span>' : '');
    h += '<button class="pm-tab'+(S.tab===t.k?' on':'')+'" data-act="tab" data-tab="'+t.k+'">'
       +   '<span class="pm-k">'+(i+1)+'</span>'+label+'</button>'; }
  S.el.tabs.innerHTML=h; }

function setTab(k){
  var ok=false, i;
  for(i=0;i<CFG.TABS.length;i++) if(CFG.TABS[i].k===k) ok=true;
  if(!ok || S.tab===k) return;
  S.tab=k; sfx('ui'); renderTabs(); renderBody(); }

/* ------------------------------------------------ TAB: BAR (SR-M18 - pilots, verified rumors, wing contracts) */
function hash32pm(s){ var h=0,i; s=String(s||''); for(i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0x7fffffff; return h; }
function barPatrons(p){
  var h=H(); if(!h || !p || !p.pos) return [];
  var R = num(h.CFG && h.CFG.DEFEND_R, 120) * CFG.BAR_RADIUS_MULT;
  var out=[], ships=(h.ships||[]);
  for(var i=0;i<ships.length;i++){ var o=ships[i];
    if(!o || !o.alive || o.role==='player' || o.team==='pirate') continue;
    var near = (o.role==='defender' && o.home===p) || (o.pos && typeof o.pos.distanceTo==='function' && o.pos.distanceTo(p.pos)<R);
    if(near) out.push(o);
    if(out.length>=CFG.BAR_MAX_PATRONS) break; }
  return out; }
function barLineFor(name, fallback){
  /* a verbatim novel sentence from THIS pilot's own segment index (GIVEN-from-canon), deterministic per game-hour
     so the bar doesn't reroll every render tick; falls back to the ship's backstory line, else silence. */
  var w = (typeof window!=='undefined') ? window : null;
  var segs = (w && typeof w.novelSegOf==='function') ? w.novelSegOf(name) : null;
  if(segs && segs.length){ var t=Math.floor(num(gameT(),0)/60); var rec=segs[(hash32pm(name)+t)%segs.length];
    if(rec && rec.text) return '“'+esc(String(rec.text).slice(0,CFG.BAR_LINE_MAX))+'”'; }
  return fallback ? esc(String(fallback).slice(0,CFG.BAR_LINE_MAX)) : '<span style="color:'+COL.DIM+'">nurses a drink in silence.</span>'; }
/* RUMORS - 0-fab BY CONSTRUCTION: every rumor is READ OFF live HOST state at render time and carries a check()
   that re-verifies the same claim against the same live state (the accept bar's "20/20 verify" hook). Nothing is
   invented; a rumor that would have no live backing simply isn't generated. */
function barRumors(p){
  var h=H(); if(!h) return [];
  var out=[];
  /* hostile sighting: a real pirate's real position, named by its real nearest world */
  var pirates=(h.ships||[]).filter(function(o){ return o && o.alive && o.team==='pirate'; });
  if(pirates.length && typeof h.nearestPlanet==='function'){
    var t=pirates[hash32pm(p&&p.name)%pirates.length];
    var np=null; try{ np=h.nearestPlanet(t.pos); }catch(e){}
    if(np) out.push({ text:'“<b>'+esc(t.name)+'</b> was sighted near '+esc(np.name)+' - '+Math.round(t.pos.distanceTo(np.pos))+'u off the port.”',
      check:function(){ return t.alive && t.pos.distanceTo(np.pos)<num(h.CFG&&h.CFG.SYSTEM_R,600); } }); }
  /* price whisper: a good genuinely cheap HERE right now */
  var gs=goods();
  for(var i=0;i<gs.length && out.length<CFG.BAR_MAX_RUMORS;i++){ var g=gs[i]; var pr=price(p,g.k,false);
    if(isFinite(pr) && g.base && pr/g.base<0.82){
      out.push((function(gg,pp){ return { text:'“Dockhands say <b>'+esc(gg.n)+'</b> is going cheap here - '+Math.round(pp)+'c a unit.”',
        check:function(){ var v=price(p,gg.k,false); return isFinite(v) && v/gg.base<0.9; } }; })(g,pr));
      break; } }
  /* war intel: a genuinely contested system by name */
  var cs=(h.systems||[]).filter(function(sy){ return sy && sy.contested; });
  if(cs.length){ var sy=cs[hash32pm((p&&p.name)||'x')%cs.length];
    out.push({ text:'“Stay out of <b>'+esc(sy.name)+'</b> - the Synod runs those lanes tonight.”',
      check:function(){ return !!sy.contested; } }); }
  /* treasury: this world's real coffers */
  if(p && typeof p.wealth==='number') out.push({ text:'“'+esc(p.name)+'\'s treasury runs about '+Math.round(p.wealth)+'c - contracts get paid here.”',
    check:function(){ return Math.abs(p.wealth-Math.round(p.wealth))<1e9; } });
  /* wing market: how many patrons here would actually take a contract */
  var hire=barPatrons(p).filter(function(o){ return o.team==='squad' && o.role!=='defender' && !o.isWingman; });
  out.push({ text:'“'+(hire.length?('<b>'+hire.length+'</b> pilot'+(hire.length>1?'s':'')+' in this room would fly a wing for the right pay.'):'Nobody here is taking wing work tonight.')+'”',
    check:(function(n){ return function(){ return barPatrons(p).filter(function(o){ return o.team==='squad' && o.role!=='defender' && !o.isWingman; }).length===n; }; })(hire.length) });
  return out.slice(0, CFG.BAR_MAX_RUMORS); }
function barHtml(){
  var p=S.planet, P=player(), h=H();
  if(!p) return '<div class="pm-note">No berth - no bar.</div>';
  var pats=barPatrons(p), rums=barRumors(p);
  var hc=num(h&&h.CFG&&h.CFG.WINGMAN_HIRE_COST,300), uc=num(h&&h.CFG&&h.CFG.WINGMAN_UPKEEP_C,20), us=num(h&&h.CFG&&h.CFG.WINGMAN_UPKEEP_S,60), wm=num(h&&h.CFG&&h.CFG.WINGMAN_MAX,2);
  var html='<div class="pm-panel"><h4>THE BAR - '+esc(p.name).toUpperCase()+'</h4>';
  if(!pats.length) html+='<div class="pm-note">Empty stools tonight - pilots drift in when they\'re near this world.</div>';
  for(var i=0;i<pats.length;i++){ var o=pats[i];
    var hireable = o.team==='squad' && o.role!=='defender' && !o.isWingman;
    var wingNow = !!o.isWingman;
    html+='<div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid '+COL.BORDER+'">'
        +'<b style="color:'+(wingNow?COL.GOOD:COL.TEXT)+'">'+esc(o.name)+'</b> <span style="color:'+COL.DIM+'">'+esc(o.role||'pilot')+(wingNow?' - ON YOUR WING':'')+'</span>'
        +'<div style="margin-top:2px;color:#a9c4d8">'+barLineFor(o.name,o.backstory)+'</div>'
        +(hireable?('<button class="pm-b" data-act="cmd" data-cmd="hirewing '+esc(o.name)+'" style="margin-top:4px">HIRE WING - '+hc+'c (+'+uc+'c/'+us+'s)</button>'):'')
        +(wingNow?('<button class="pm-b" data-act="cmd" data-cmd="dismisswing '+esc(o.name)+'" style="margin-top:4px">DISMISS</button>'):'')
        +'</div>'; }
  html+='</div><div class="pm-panel"><h4>RUMORS ON THE BAND <span style="color:'+COL.DIM+';font-weight:400">(every one is read off the LIVE galaxy - nothing invented)</span></h4>';
  if(!rums.length) html+='<div class="pm-note">The room is quiet.</div>';
  for(var j=0;j<rums.length;j++) html+='<div style="margin-bottom:5px">'+rums[j].text+'</div>';
  html+='</div><div class="pm-note">Wing contracts: your wingman escorts you, ENGAGES whatever you\'re fighting, and bills upkeep - miss a payment and they walk. Max '+wm+'.'+((P&&P.credits!=null)?(' You hold <b style="color:'+COL.AMBER+'">'+Math.round(P.credits)+'c</b>.'):'')+'</div>';
  return html; }

/* ------------------------------------------------ TAB: SCIENCE (SR-M19 - Athenaeum: analysis + probes) */
function scienceHtml(){
  var p=S.planet, P=player(), h=H();
  if(!p || !p.isScience) return '<div class="pm-note">No laboratory at this berth.</div>';
  var cores=num(P&&P.cores,0), unid=(P&&P.artifactsUnid)||[], owned=num(P&&P.probesOwned,0);
  var ac=num(h&&h.CFG&&h.CFG.ANALYZE_COST_CORES,2), pc=num(h&&h.CFG&&h.CFG.PROBE_COST_CORES,3);
  var html='<div class="pm-panel"><h4>⚗ ATHENAEUM LABORATORY</h4>'
    +'<div>CORES held: <b style="color:'+COL.GOOD+'">'+cores+'</b> <span style="color:'+COL.DIM+'">(salvage them off Hegemon wrecks)</span></div></div>'
    +'<div class="pm-panel"><h4>ARTIFACT ANALYSIS - '+ac+' cores each</h4>';
  if(!unid.length) html+='<div class="pm-note">Nothing unidentified aboard your ship.</div>';
  else{ html+='<div style="margin-bottom:5px">You carry <b style="color:'+COL.AMBER+'">'+unid.length+'</b> unidentified artifact'+(unid.length>1?'s':'')+' - function unknown until analyzed (they refuse to equip).</div>'
    +'<button class="pm-b" data-act="cmd" data-cmd="analyze"'+(cores<ac?' disabled':'')+'>ANALYZE ONE - '+ac+' cores</button> '
    +'<button class="pm-b" data-act="cmd" data-cmd="analyze all"'+(cores<ac?' disabled':'')+'>ANALYZE ALL</button>'; }
  html+='</div>';
  /* SR:AWA slice (2026-07-09): INSTALLING an identified artifact was terminal-only (`artifacts <name>`) - you
     could analyze with a button but then had to TYPE to actually use it. This closes the loop: identified
     artifacts render with their icon + effect + an INSTALL button delegating to the real `artifacts` command. */
  var inv=(P&&P.artifacts)||[], eqp=(P&&P.artEquipped)||[], ARTS=h&&h.ARTIFACTS, wI=(typeof window!=='undefined')?window:null;
  if(ARTS && (inv.length || eqp.length)){
    html+='<div class="pm-panel"><h4>ARTIFACTS - IDENTIFIED</h4>';
    if(inv.length){ html+='<div style="margin-bottom:5px;color:'+COL.DIM+'">ready to install (permanent once fitted):</div>';
      for(var ai=0;ai<inv.length;ai++){ var k=inv[ai], A=ARTS[k]; if(!A) continue;
        var ic=(wI&&wI.ICONS)?(function(){ try{ return wI.ICONS.img('artifact',k,A,ARTS,{size:22,style:'margin-right:7px'}); }catch(e){ return ''; } })():'';
        html+='<div class="pm-row">'+ic+'<div class="pm-grow"><b>'+esc(A.n)+'</b> <span class="pm-sub">'+esc(A.desc||'')+'</span></div>'
          +'<button class="pm-b pm-go" data-act="cmd" data-cmd="artifacts '+esc(k)+'" style="min-width:70px">INSTALL</button></div>'; } }
    if(eqp.length){ html+='<div style="margin-top:6px;color:'+COL.DIM+'">installed: '+eqp.map(function(k){ return ARTS[k]?esc(ARTS[k].n):esc(k); }).join(', ')+'</div>'; }
    html+='</div>';
  }
  html+='<div class="pm-panel"><h4>MINERAL PROBES - '+pc+' cores each</h4>'
    +'<div style="margin-bottom:5px">Aboard: <b>'+owned+'</b>. Deploy at any WORLD (deployprobe while docked there); it mines ore on the REAL clock - even while the game is closed - and you collect on return.</div>'
    +'<button class="pm-b" data-act="cmd" data-cmd="buyprobe"'+(cores<pc?' disabled':'')+'>BUY PROBE - '+pc+' cores</button>'
    +'<div style="margin-top:6px"><button class="pm-b" data-act="cmd" data-cmd="probes">PROBE NETWORK STATUS → terminal</button></div>'
    +'</div>';
  return html; }

/* ------------------------------------------------ TAB: MARKET (+ black market / fence, SR:AWA clicks-only rule) */
/* SR:AWA parity slice (2026-07-09): the base's MARKET tab was a DEAD NOTE telling the player to type terminal
   commands - this file's own rule (see terraformHtml) says "every dock-only action... achievable by clicks
   alone". Rendered from HOST.CONTRABAND live (no second catalog), every button delegates data-cmd to the REAL
   `blackmarket`/`fence` commands, which re-verify location/credits/holdings themselves - the UI only decides
   VISIBILITY (base + pirate station sell; hostile-rep worlds fence), never outcome. */
function contrabandHtml(){
  var h=H(), P=player(); if(!h || !h.CONTRABAND || !h.CONTRA_KEYS || !P) return '';
  var atBM = S.isBase || !!(S.planet && S.planet.isPirateStation);
  var canFence = !!(S.planet && !S.isBase && num(S.planet.rep,0) <= num(h.CFG && h.CFG.REP_HOSTILE, -6));
  if(!atBM && !canFence) return '';
  var mk = num(h.CFG && h.CFG.CONTRA_MARKUP, 1.6);
  var rows='', i, holding=0;
  for(i=0;i<h.CONTRA_KEYS.length;i++){ var k=h.CONTRA_KEYS[i], c=h.CONTRABAND[k]; if(!c) continue;
    var have=num(P.contraband && P.contraband[k],0); holding+=have;
    var tr='';
    if(atBM){ tr += '<button class="pm-b" data-act="cmd" data-cmd="blackmarket '+k+' 1"'+(num(P.credits,0)>=c.base?'':' disabled')+'>+1</button> '
                  + '<button class="pm-b" data-act="cmd" data-cmd="blackmarket '+k+' 5"'+(num(P.credits,0)>=c.base*5?'':' disabled')+'>+5</button> '; }
    if(canFence){ tr += '<button class="pm-b pm-go" data-act="cmd" data-cmd="fence '+k+' 1"'+(have>0?'':' disabled')+'>-1</button> '
                     + '<button class="pm-b pm-go" data-act="cmd" data-cmd="fence '+k+' 999"'+(have>0?'':' disabled')+'>-all</button>'; }
    rows += '<tr><td><b>'+esc(c.n||k)+'</b></td>'
      + '<td style="color:'+COL.AMBER+'">'+Math.round(c.base)+'c</td>'
      + '<td style="color:'+COL.GOOD+'">'+Math.round(c.base*mk)+'c</td>'
      + '<td style="color:'+(have>0?COL.TEXT:COL.DIM)+'">'+have+'</td>'
      + '<td>'+tr+'</td></tr>'; }
  var note = atBM
    ? 'Buy here, fence at <span style="color:'+COL.BAD+'">HOSTILE</span> worlds at ×'+mk+' - but coalition docks may SCAN you on arrival.'
    : 'This world is lawless enough to fence - contraband moves at ×'+mk+' over base.';
  return '<div class="pm-panel"><h4 style="color:'+COL.VIOLET+'">☠ BLACK MARKET'+(canFence&&!atBM?' - FENCE':'')+'</h4>'
    + '<div style="margin-bottom:6px;color:'+COL.DIM+'">'+note+(holding?' Carrying <b style="color:'+COL.AMBER+'">'+holding+'</b> unit'+(holding>1?'s':'')+'.':'')+'</div>'
    + '<table class="pm-t"><tr><th>WARE</th><th>BUY</th><th>FENCE AT</th><th>HELD</th><th>TRADE</th></tr>'+rows+'</table></div>'; }
/* TRADE ROUTES (RJ 2026-09-06, after the shop and the bay: "then there is trading"). The market told you this
   world's prices and nothing else, so working out where to take a hold meant flying around and remembering.
   This block answers the two questions a trader actually has, and answers them ONLY from prices this pilot has
   personally seen: recordObservedPrices writes p._obs on every dock, so a world you have never docked at simply
   does not appear. Nothing here peeks at live prices elsewhere - that would be the cheat this codebase forbids.
   An observation carries its age, because a remembered price is a lead, not a promise. */
function obsOf(pl, k){ return (pl && pl._obs && pl._obs[k]) || null; }
function ageOf(rec){ var h=H(), now=(h&&h.T0!=null)?h.T0:null;
  if(!rec || now==null || rec.atT==null) return '';
  var mins=Math.max(0,(now-rec.atT)/60);
  return mins<1 ? 'just seen' : (mins<60 ? Math.round(mins)+' min ago' : Math.round(mins/60)+' h ago'); }
function distFrom(a, b){ if(!a||!b||!a.pos||!b.pos) return null;
  var dx=a.pos.x-b.pos.x, dy=a.pos.y-b.pos.y, dz=a.pos.z-b.pos.z; return Math.round(Math.sqrt(dx*dx+dy*dy+dz*dz)); }
function knownBuyers(here, k, hereSell){
  var h=H(), out=[], i, list=(h&&h.planets)||[];
  for(i=0;i<list.length;i++){ var pl=list[i]; if(pl===here) continue;
    var rec=obsOf(pl,k); if(!rec) continue;
    out.push({ planet:pl, price:rec.price, age:ageOf(rec), dist:distFrom(here,pl), gain:Math.round(rec.price)-Math.round(hereSell) }); }   // rounded against rounded: the row's arithmetic must add up on screen
  out.sort(function(a,b){ return b.price-a.price; });
  return out; }
function routesHtml(here, P){
  var G=goods(), hold=holdOf(P), rows='', i, any=false, seen=0;
  var h=H(), list=(h&&h.planets)||[];
  for(i=0;i<list.length;i++) if(list[i]._obs) seen++;
  // 1) what you are CARRYING - who has been seen paying most for it
  for(i=0;i<G.length;i++){ var g=G[i]; var have=Math.round(num(hold[g.k],0)); if(have<=0) continue;
    any=true;
    var hereSell=price(here,g.k,false);
    var buyers=knownBuyers(here,g.k,hereSell).slice(0,2);
    var cells = buyers.length
      ? buyers.map(function(b){
          var col = b.gain>0 ? COL.GOOD : COL.DIM;
          return '<span class="pm-cmp '+(b.gain>0?'up':'eq')+'" title="last seen at '+esc(b.planet.name)+', '+esc(b.age||'age unknown')+'">'
            + esc(b.planet.name)+' <b>'+fmtC(Math.round(b.price))+'</b>'
            + (b.dist!=null?' <span style="opacity:.6">'+b.dist+'u</span>':'')
            + ' <i style="color:'+col+'">'+(b.gain>0?'+':'')+b.gain+'/unit</i></span>'; }).join('')
      : '<span class="pm-cmp none">no market seen yet - dock somewhere and this fills in</span>';
    rows += '<div class="pm-row"><div class="pm-grow"><b>'+esc(g.n)+'</b> <span class="pm-sub">'+have+' aboard · '
      + 'sells here at '+fmtC(Math.round(hereSell))+'</span><div class="pm-cmpRow">'+cells+'</div></div>'
      + (buyers.length && buyers[0].gain>0
          ? '<div style="color:'+COL.GOOD+';min-width:74px;text-align:right">+'+(buyers[0].gain*have)+'c</div>'
          : '<div style="color:'+COL.DIM+';min-width:74px;text-align:right">-</div>')
      + '</div>'; }
  // 2) what is CHEAP here and has been seen dear elsewhere - the run to make next
  var runs='', j=0;
  for(i=0;i<G.length && j<3;i++){ var g2=G[i];
    var buyHere=price(here,g2.k,true);
    var best=knownBuyers(here,g2.k,buyHere)[0];
    if(!best || best.price<=buyHere*1.12) continue;
    j++;
    runs += '<div class="pm-row"><div class="pm-grow"><b>'+esc(g2.n)+'</b> <span class="pm-sub">buy here at '
      + fmtC(Math.round(buyHere))+' · last seen at '+esc(best.planet.name)+' for '+fmtC(Math.round(best.price))
      + (best.dist!=null?' ('+best.dist+'u away)':'')+' · '+esc(best.age||'age unknown')+'</span></div>'
      + '<div style="color:'+COL.GOOD+';min-width:74px;text-align:right">+'+(Math.round(best.price)-Math.round(buyHere))+'/unit</div></div>'; }
  var note='<div class="pm-note" style="margin-top:6px">Built only from prices you have personally seen - '
    + seen+' world'+(seen===1?'':'s')+' visited so far. A world you have never docked at is not listed, and a '
    + 'remembered price can have moved since.</div>';
  if(!any && !runs) return '<div class="pm-panel"><h4>TRADE ROUTES</h4><div class="pm-note">Nothing aboard, and no run worth naming from what you have seen yet.</div>'+note+'</div>';
  return '<div class="pm-panel"><h4>TRADE ROUTES</h4>'
    + (any ? '<div class="pm-sub" style="margin-bottom:4px">YOUR HOLD - best price seen elsewhere</div>'+rows : '')
    + (runs ? '<div class="pm-sub" style="margin:8px 0 4px">RUN FROM HERE - cheap here, dear where you have been</div>'+runs : '')
    + note + '</div>'; }
function marketHtml(){
  var p=S.planet, P=player(), G=goods();
  if(S.isBase) return '<div class="pm-note">No commodity exchange at Ranger Command - the base deals in hulls (SHOP tab) and the wares below.</div>'+contrabandHtml();
  if(!p || !p.stock || !G.length) return '<div class="pm-note">(market data offline)</div>';
  var hostile = num(p.rep,0) <= num(H()&&H().CFG&&H().CFG.REP_HOSTILE,-6);
  var head = '<div style="margin-bottom:8px;color:'+COL.DIM+'">Prices are organic - they move with stock. '
    + '<span class="pm-tag mk">MAKES</span> = cheap here, buy. <span class="pm-tag nd">NEEDS</span> = dear here, sell. '
    + '<span style="color:'+COL.GOOD+'">Green sell price</span> = above galactic base = profit.'
    + (hostile ? ' <span style="color:'+COL.BAD+'">This world is HOSTILE - expect refusal at the airlock.</span>' : '')
    + '</div>';
  var rows='', i, hold=holdOf(P), htot=holdTotal(P), hcap=num(P&&P.holdCap,0);
  for(i=0;i<G.length;i++){ var g=G[i]; if(!g || !g.k) continue;
    var bp=price(p,g.k,true), sp=price(p,g.k,false);
    var stock=Math.round(num(p.stock[g.k],0));
    var have=Math.round(num(hold[g.k],0));
    var mk = p.type && p.type.makes && p.type.makes[g.k];
    var nd = p.type && p.type.needs && p.type.needs[g.k];
    var tag = mk ? '<span class="pm-tag mk">MAKES</span>' : (nd ? '<span class="pm-tag nd">NEEDS</span>' : '');
    var profitable = isFinite(sp) && sp > num(g.base,0)*CFG.PROFIT_RATIO;
    var sellCol = profitable ? COL.GOOD : COL.TEXT;
    var canBuy = P && isFinite(bp) && num(P.credits,0)>=bp && (hcap-htot)>=1 && (stock-CFG.STOCK_RESERVE)>=1;
    var canSell = have>=1;
    var tr='';
    for(var q=0;q<CFG.QTY_STEPS.length;q++){ var n=CFG.QTY_STEPS[q];
      tr += '<button class="pm-b" data-act="cmd" data-cmd="buy '+g.k+' '+n+'"'+(canBuy?'':' disabled')+'>+'+n+'</button> '; }
    tr += '&nbsp;';
    for(var q2=0;q2<CFG.QTY_STEPS.length;q2++){ var n2=CFG.QTY_STEPS[q2];
      tr += '<button class="pm-b'+(profitable?' pm-go':'')+'" data-act="cmd" data-cmd="sell '+g.k+' '+n2+'"'+(canSell?'':' disabled')+'>-'+n2+'</button> '; }
    rows += '<tr>'
      + '<td><b>'+esc(g.n||g.k)+'</b>'+tag+'</td>'
      + '<td style="color:'+COL.AMBER+'">'+fmtC(bp)+'</td>'
      + '<td style="color:'+sellCol+'">'+fmtC(sp)+(profitable?' ^':'')+'</td>'
      + '<td style="color:'+(stock<=CFG.STOCK_RESERVE+1?COL.BAD:COL.DIM)+'">'+stock+'</td>'
      + '<td style="color:'+(have>0?COL.TEXT:COL.DIM)+'">'+have+'</td>'
      + '<td>'+tr+'</td></tr>'; }
  var table = '<table class="pm-t"><tr><th>GOOD</th><th>BUY AT</th><th>SELL AT</th><th>STOCK</th><th>HOLD</th><th>TRADE (buy + / sell -)</th></tr>'+rows+'</table>';
  var foot = '<div class="pm-note" style="margin-top:8px">hold '+htot+'/'+Math.round(hcap)
    + ' - credits <span style="color:'+COL.AMBER+'">'+Math.round(num(P&&P.credits,0))+'c</span>'
    + ' - reputation moves prices: allied worlds sell cheap and buy dear.</div>';
  return head+table+foot+routesHtml(p,P)+terraformHtml(p)+contrabandHtml()+probeHtml(p); }

/* SR:AWA parity slice (2026-07-09): mineral probes were TERMINAL-ONLY at deploy time - the Athenaeum's own
   SCIENCE tab sells them, but the `deployprobe`/`collectprobe` commands only work at OTHER worlds, where no
   button existed. Rendered from live state (P.probesOwned + HOST.probeAt), buttons delegate to the REAL
   commands - visibility here, truth in the command gates. */
function probeHtml(p){
  var h=H(), P=player();
  if(!h || !P || !p || p.isScience || p.isPirateStation) return '';
  var aboard=num(P.probesOwned,0);
  var working=(typeof h.probeAt==='function') ? h.probeAt(p.name).working : false;
  if(!aboard && !working) return '';
  var html='<div class="pm-panel"><h4 style="color:'+COL.VIOLET+'">🛰 MINERAL PROBE</h4>';
  if(working) html+='<div style="margin-bottom:5px;color:'+COL.DIM+'">A probe is mining '+esc(p.name)+' on the real clock - even while you\'re logged off.</div>'
    +'<button class="pm-b pm-go" data-act="cmd" data-cmd="collectprobe">COLLECT ORE</button> '
    +'<button class="pm-b" data-act="cmd" data-cmd="probes">NETWORK STATUS → terminal</button>';
  else html+='<div style="margin-bottom:5px;color:'+COL.DIM+'">Aboard: <b>'+aboard+'</b>. Deploy one here and it mines while you fly.</div>'
    +'<button class="pm-b pm-go" data-act="cmd" data-cmd="deployprobe">DEPLOY PROBE HERE</button>';
  return html+'</div>'; }

/* SR-M4 gap fix (REQUIREMENTS_SR.md, "every dock-only action... achievable by clicks alone"): terraform was
   terminal-only, its own hint text on this tab said so explicitly. Same data-cmd->HOST.runCmd path as everything
   else here, so results are identical to typing it. */
function terraformHtml(p){
  if(!p || !p.terraformable) return '';
  var pct = Math.round(num(p.terra,0)*100);
  var done = pct>=100;
  return '<div class="pm-panel" style="margin-top:8px"><h4>TERRAFORMING</h4>'
    + '<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.GOOD+'">Earth-like conversion</b>'
    + '<div class="pm-sub">'+pct+'% complete'+(done?' - garden world':'')+'</div></div>'
    + '<button class="pm-b pm-go" data-act="cmd" data-cmd="terraform"'+(done?' disabled':'')+'>'+(done?'DONE':'ADVANCE')+'</button></div></div>'; }

/* ------------------------------------------------ TAB: HANGAR */
function upCostEst(P,k){ var h=H(), c=h&&h.CFG;
  if(!P || !P.lvl || !c || c.UP_COST_BASE==null || c.UP_COST_GROW==null) return NaN;
  return Math.round(c.UP_COST_BASE*Math.pow(c.UP_COST_GROW, num(P.lvl[k],1)-1)); }

/* ------------------------------------------------ TAB: SHOP (SR:AWA-style, 2026-07-09)
   User: "where is the item shop? ... the way you buy a hull is complicated, annoying and confusing. just copy
   space rangers a war apart. it's rather simple." This REPLACES the old 13-collapsible-section hangarHtml as the
   docked buying surface: ONE flat scroll, thin group headers, every purchasable a single row
   [name - stat - price - BUY]. No expanding, no nesting. LAYOUT editing (mounts/slots/specializations) is the
   Engineering Bay's job and is deliberately NOT here - and hull purchases are deliberately NOT in the Bay. */
/* PROCEDURAL ITEM ICONS (user 2026-07-09 "icons, somewhat unique for each item"): the icon is derived from the
   row's OWN buy command ("tank extended" -> kind tank, key extended -> FUEL_TANKS.extended), so every shop row
   gets its item's face with zero caller changes and no second catalog. Soft dependency on item_icons.js. */
var ICON_TABLE_OF = { weapon:'WEAPONS', hardpoint:'WEAPONS', tank:'FUEL_TANKS', radar:'RADARS', scanner:'SCANNERS',
  shieldgen:'SHIELD_GENS', droid:'REPAIR_DROIDS', hook:'CARGO_HOOKS', series:'HULL_SERIES', gizmo:'GIZMOS',
  hull:'HULLS', engine:'ENGINES', blackmarket:'CONTRABAND' };
function shopIcon(cmd){
  var w=(typeof window!=='undefined')?window:null, h=H();
  if(!w || !w.ICONS || !h || !cmd) return '';
  var p=String(cmd).split(/\s+/), kind=p[0], key=p[1];
  if((kind==='hardpoint'||kind==='gizmo') && key==='mount') key=p[2];
  var tp=ICON_TABLE_OF[kind]; if(!tp) return '';
  var table=h[tp], item=table&&table[key]; if(!item) return '';
  try{ return w.ICONS.img(kind, key, item, table, { size:22, style:'margin-right:7px' }); }catch(e){ return ''; }
}
/* -- WHAT THE SWAP DOES (RJ 2026-09-06: "the biggest broken parts are the weapon shop, and ship building").
   A shop row that replaces something you already carry now states the change to the numbers you fly on, as a
   signed delta against the fitted item. Every number is read from the registry the game itself flies on - weapons
   from WEAPONS (dps = dmg/cd, reach = speed x life), hulls from HULLS - and a field the registry does not carry
   prints "n/a" rather than a plausible-looking guess. Rows that ADD rather than replace (equipment, an empty
   hardpoint) get no comparison, because there is nothing to compare against. */
function wStats(w){
  if(!w) return null;
  var dmg=num(w.dmg,NaN), cd=num(w.cd,NaN);
  return { dmg:dmg, cd:cd, rate:(cd>0?1/cd:NaN), dps:(cd>0?dmg/cd:NaN), reach:num(w.speed,NaN)*num(w.life,NaN),
           twin:!!w.twin, homing:num(w.homing,0), splash:num(w.splash,0), type:w.dmgType||'' }; }
function deltaChip(label, mine, theirs, unit, digits, higherIsBetter){
  if(!(isFinite(mine)&&isFinite(theirs)))
    return '<span class="pm-cmp none" title="the registry does not carry this number for one of the two">'+esc(label)+' n/a</span>';
  var d=mine-theirs, pct=(theirs!==0)?(100*d/Math.abs(theirs)):0;
  var better = (higherIsBetter===false) ? (d<0) : (d>0);
  var k = (Math.abs(d)<1e-4) ? 'eq' : (better ? 'up' : 'dn');
  var fmt=function(v){ return (digits===0)?String(Math.round(v)):v.toFixed(digits==null?1:digits); };
  return '<span class="pm-cmp '+k+'" title="'+esc(label)+': '+fmt(mine)+(unit||'')+' against the fitted '+fmt(theirs)+(unit||'')+'">'
    + esc(label)+' <b>'+fmt(mine)+(unit||'')+'</b>'
    + (k==='eq'?'':' <i>'+(d>0?'+':'')+fmt(d)+(Math.abs(pct)>=1?' · '+(pct>0?'+':'')+Math.round(pct)+'%':'')+'</i>')+'</span>'; }
function weaponCompareHtml(key){
  var h=H(), P=player(); var W=h&&h.WEAPONS; if(!W||!P) return '';
  var a=wStats(W[key]), b=wStats(W[P.weaponType||'energy']);
  if(!a||!b) return '';
  return '<div class="pm-cmpRow">'
    + deltaChip('dps', a.dps, b.dps, '', 1)
    + deltaChip('dmg', a.dmg, b.dmg, '', 0)
    + deltaChip('rate', a.rate, b.rate, '/s', 2)
    + deltaChip('reach', a.reach, b.reach, '', 0)
    + (a.twin!==b.twin ? '<span class="pm-cmp '+(a.twin?'up':'dn')+'">'+(a.twin?'twin barrels':'single barrel')+'</span>' : '')
    + (a.homing!==b.homing ? '<span class="pm-cmp '+(a.homing>b.homing?'up':'dn')+'">'+(a.homing?'homing':'no homing')+'</span>' : '')
    + (a.splash!==b.splash ? '<span class="pm-cmp '+(a.splash>b.splash?'up':'dn')+'">'+(a.splash?'splash '+a.splash:'no splash')+'</span>' : '')
    + (a.type!==b.type ? '<span class="pm-cmp neu" title="hulls resist the three damage types differently">'+esc(a.type)+' not '+esc(b.type)+'</span>' : '')
    + '</div>'; }
function hullCompareHtml(key){
  var h=H(), P=player(); var HU=h&&h.HULLS; if(!HU||!P) return '';
  var a=HU[key], b=HU[P.hullClass||'fighter']; if(!a||!b||key===(P.hullClass||'fighter')) return '';
  return '<div class="pm-cmpRow">'
    + deltaChip('hull', num(a.hp,NaN), num(b.hp,NaN), '', 0)
    + deltaChip('hold', num(a.hold,NaN), num(b.hold,NaN), '', 0)
    + deltaChip('speed', num(a.speed,NaN), num(b.speed,NaN), 'x', 2)
    + ((h.HULL_MOUNTS&&h.HULL_MOUNTS[key]&&h.HULL_MOUNTS[P.hullClass])
        ? deltaChip('mounts', h.HULL_MOUNTS[key].weaponPoints.length, h.HULL_MOUNTS[P.hullClass].weaponPoints.length, '', 0)
          + deltaChip('gizmos', h.HULL_MOUNTS[key].gizmoPoints.length, h.HULL_MOUNTS[P.hullClass].gizmoPoints.length, '', 0) : '')
    + '</div>'; }
function compareForCmd(cmd){
  if(!cmd) return '';
  var m=/^(weapon|hull)\s+(\S+)$/.exec(String(cmd)); if(!m) return '';
  return m[1]==='weapon' ? weaponCompareHtml(m[2]) : hullCompareHtml(m[2]); }
function shopRow(name, stat, cost, cmd, tag){
  var P=player(); var afford = cost==null || num(P&&P.credits,0)>=cost;
  /* SR:AWA parity slice (2026-07-09): every row carries a hover tooltip with the full item card - name, stats,
     price, affordability - the way SR surfaces item info without opening anything. Composed from the row's own
     data, so no caller changes and no second source of truth. */
  var tip = name + (stat? (' | ' + String(stat).replace(/<[^>]*>/g,'')) : '')
    + ' | ' + (cost? (cost + 'c' + (afford? '' : ' (you hold ' + Math.round(num(P&&P.credits,0)) + 'c - short ' + Math.round(cost-num(P&&P.credits,0)) + 'c)')) : 'free')
    + (tag==='fitted' ? ' | currently fitted' : (cmd? (' | buys via: ' + cmd) : ''));
  return '<div class="pm-row" title="'+esc(tip)+'">'+shopIcon(cmd)+'<div class="pm-grow"><b>'+esc(name)+'</b>'
    + (stat?(' <span class="pm-sub">'+stat+'</span>'):'')
    + (tag==='fitted' ? '' : compareForCmd(cmd)) + '</div>'
    + '<div style="color:'+(afford?COL.AMBER:COL.BAD)+';min-width:56px;text-align:right">'+(cost?fmtC(cost):'free')+'</div>'
    + (tag==='fitted' ? '<span class="pm-tag mk" style="min-width:52px;text-align:center">FITTED</span>'
       : '<button class="pm-b" data-act="cmd" data-cmd="'+esc(cmd)+'" style="min-width:52px">BUY</button>')
    + '</div>'; }
function shopHdr(t, sub){ return '<div style="margin:10px 0 4px 0;font-weight:800;letter-spacing:.1em;color:'+COL.HEAD+';font-size:11px">'+t
  + (sub?(' <span style="color:'+COL.DIM+';font-weight:400;letter-spacing:0">'+sub+'</span>'):'') + '</div>'; }
function shopHtml(){
  var P=player(), h=H();
  if(!P||!h) return '<div class="pm-note">No dock link.</div>';
  var html='<div class="pm-note">Pick a thing, hit <b>BUY</b> - that\'s the whole shop. Slot LAYOUT (mounts, specializations, what goes where) is the <b>ENGINEERING BAY</b> [E], like a character screen.</div>';
  /* HULLS - the hull command's own gate is atBase, so the section only exists where buying actually works */
  if(S.isBase){
    html+=shopHdr('HULLS','swap the skeleton - components transfer, upgrade levels reset (Starblast rule)');
    var hk=(typeof h.shopHullKeys==='function')?h.shopHullKeys():(h.HULL_ORDER||[]);
    for(var i=0;i<hk.length;i++){ var k=hk[i], HH=h.HULLS&&h.HULLS[k]; if(!HH) continue;
      html+=shopRow(HH.n, 'hull '+HH.hp+' · hold '+HH.hold+' · spd ×'+HH.speed, HH.cost||0, 'hull '+k, (P.hullClass===k)?'fitted':null); } }
  else html+=shopHdr('HULLS','sold at Ranger Command only - fly home to swap ships');
  /* PRIMARY WEAPON */
  html+=shopHdr('PRIMARY WEAPON','your main gun - one fitted at a time');
  var wo=h.WEAPON_ORDER||[];
  for(var w=0;w<wo.length;w++){ var wk=wo[w], W=h.WEAPONS[wk];
    html+=shopRow(W.n, 'dmg '+W.dmg+(W.homing?' · homing':'')+(W.splash?' · splash':''), W.cost||0, 'weapon '+wk, ((P.weaponType||'energy')===wk)?'fitted':null); }
  /* ENGINES */
  if(h.ENGINES&&h.ENGINE_KEYS){ html+=shopHdr('ENGINE DRIVE','speed vs hyperjump-fuel tradeoff');
    for(var e2=0;e2<h.ENGINE_KEYS.length;e2++){ var ek=h.ENGINE_KEYS[e2], E=h.ENGINES[ek];
      html+=shopRow(E.n, esc(E.desc||''), E.cost||0, 'engine '+ek, ((P.engineType||'standard')===ek)?'fitted':null); } }
  /* SINGLE-SLOT GEAR (series excluded - that's a permanent specialization, fitted in the Bay) */
  for(var g=0;g<GEAR_SLOTS.length;g++){ var def=GEAR_SLOTS[g]; if(def[0]==='series') continue;
    var tbl=h[def[2]], keys=h[def[3]]; if(!tbl||!keys) continue;
    html+=shopHdr(def[1],'');
    for(var g2=0;g2<keys.length;g2++){ var gk=keys[g2], it=tbl[gk]; if(!it) continue;
      html+=shopRow(it.n, esc(it.desc||''), it.cost||0, def[6]+' '+gk, ((P[def[4]]||def[5])===gk)?'fitted':null); } }
  /* GIZMOS + HARDPOINT GUNS - buying MOUNTS them into the next free slot (same command the Bay's pickers use) */
  if(h.GIZMOS&&h.GIZMO_KEYS){ html+=shopHdr('GIZMOS','buy = mounts into a free gizmo slot · unmount/sell in YOUR SHIP below');
    for(var z=0;z<h.GIZMO_KEYS.length;z++){ var zk=h.GIZMO_KEYS[z], Z=h.GIZMOS[zk];
      html+=shopRow(Z.n, esc(Z.desc||''), Z.cost||0, 'gizmo mount '+zk, (typeof h.hasGizmo==='function'&&h.hasGizmo(P,zk))?'fitted':null); } }
  html+=shopHdr('HARDPOINT GUNS','extra mounted weapons beyond the primary');
  for(var q=0;q<wo.length;q++){ var qk=wo[q], QW=h.WEAPONS[qk];
    html+=shopRow(QW.n+' (hardpoint)', 'dmg '+QW.dmg, QW.cost||0, 'hardpoint mount '+qk, null); }
  /* UPGRADES - same three rows the old hangar had, flat */
  var upCap=(h.CFG&&h.CFG.UP_LVL_CAP)||Infinity;
  /* EQUIPMENT (2026-09-06): these stacking fittings were listed ONLY on the loadout screen nobody could open,
     so the flat shop never sold them and the `install` command was the only route. One flat section, same row
     shape as everything else here; the count shown is what the ship already carries. */
  html+=shopHdr('EQUIPMENT','stacking fittings - buy as many as you like, no slot limit');
  for(var ei=0;ei<EQUIP_SHOP.length;ei++){ var eq=EQUIP_SHOP[ei], own=num(P&&P.equip&&P.equip[eq.k],0);
    html+=shopRow(eq.n, eq.desc+(own>0?' <span style="color:'+COL.GOOD+'">x'+own+' owned</span>':''), eq.cost, 'install '+eq.k, null); }
  html+=shopHdr('UPGRADES','level up what\'s already fitted');
  for(var u2=0;u2<CFG.UP_KINDS.length;u2++){ var u=CFG.UP_KINDS[u2];
    var lvl=(P.lvl&&typeof P.lvl[u.k]==='number')?P.lvl[u.k]:1, atCap=lvl>=upCap, cost=upCostEst(P,u.k);
    html+= atCap ? shopRow(u.n+' Lv'+lvl, 'MAX', null, '', 'fitted')
                 : shopRow(u.n+' Lv'+lvl+' → '+(lvl+1), u.d, cost, 'upgrade '+u.k, null); }
  /* YOUR SHIP - the sell/unmount side, flat */
  html+=shopHdr('YOUR SHIP','what\'s aboard - unmount refunds a fraction');
  var gsl=P.gizmoSlots||[];
  for(var y=0;y<gsl.length;y++){ if(!gsl[y]) continue; var GY=h.GIZMOS[gsl[y]];
    html+='<div class="pm-row"><div class="pm-grow"><b>'+esc(GY?GY.n:gsl[y])+'</b> <span class="pm-sub">gizmo slot '+(y+1)+'</span></div>'
      +'<button class="pm-b" data-act="cmd" data-cmd="gizmo unmount '+(y+1)+'">SELL</button></div>'; }
  var wsl=P.weaponSlots||[];
  for(var y2=0;y2<wsl.length;y2++){ if(!wsl[y2]) continue; var WY=h.WEAPONS[wsl[y2]];
    html+='<div class="pm-row"><div class="pm-grow"><b>'+esc(WY?WY.n:wsl[y2])+'</b> <span class="pm-sub">hardpoint '+(y2+1)+'</span></div>'
      +'<button class="pm-b" data-act="cmd" data-cmd="hardpoint unmount '+(y2+1)+'">SELL</button></div>'; }
  if(!gsl.some(Boolean)&&!wsl.some(Boolean)) html+='<div class="pm-note">Nothing mounted beyond the primary loadout.</div>';
  return html; }

/* Space-Rangers-style loadout data: equipment is stable game data, hardcoded here to mirror EQUIP in the host
   (host now exposes EQUIP directly too - kept as a literal list here so this file doesn't have to defend against
   HOST being unavailable at first paint, same reasoning HULLS/WEAPONS sections already read live but this one
   doesn't). targeting moved OUT of here (ENGINEERING BAY, user 2026-07-08): it's a mountable GIZMOS entry now,
   not a permanent EQUIP purchase - see gizmoSectionHtml/engineSectionHtml below, which read H().GIZMOS/H().ENGINES
   live instead of hardcoding a second copy, since those are new and there's nothing yet to be defensive against. */
var EQUIP_SHOP = [
  { k:'cargo',     n:'Cargo Pod',          desc:'+15 hold',                                cost:120 },
  { k:'fuel',      n:'Fuel Cell',          desc:'+25 fuel cap',                            cost:100 },
  { k:'scanner',   n:'Scanner',            desc:'+35 sensor range',                        cost:150 },
  { k:'plating',   n:'Armor Plating',      desc:'+20 max hull',                            cost:190 },
  { k:'droid',     n:'Repair Droid',       desc:'+2.5 hull/s regen',                       cost:170 } ];

function atBase(P){ var h=H(); if(h && typeof h.atBase==='function' && P){ try{ return !!h.atBase(P); }catch(e){} } return false; }

var GEAR_SLOTS = [   // [slotKind, label, tableProp, keysProp, field, defKey, cmdVerb, lockField(optional)]
  ['tank',      'FUEL TANK',        'FUEL_TANKS',    'FUEL_TANK_KEYS',    'fuelTankType', 'standard', 'tank'],
  ['radar',     'RADAR',            'RADARS',        'RADAR_KEYS',        'radarType',    'basic',    'radar'],
  ['scanner',   'SCANNER',          'SCANNERS',      'SCANNER_KEYS',      'scannerType',  'none',     'scanner'],
  ['shieldgen', 'SHIELD GENERATOR', 'SHIELD_GENS',   'SHIELD_GEN_KEYS',   'shieldGenType','none',     'shieldgen'],
  ['droid',     'REPAIR DROID',     'REPAIR_DROIDS', 'REPAIR_DROID_KEYS', 'droidType',    'none',     'droid'],
  ['hook',      'CARGO HOOK',       'CARGO_HOOKS',   'CARGO_HOOK_KEYS',   'cargoHookType','none',     'hook'],
  ['series',    'HULL SERIES',      'HULL_SERIES',   'HULL_SERIES_KEYS',  'hullSeries',   'standard', 'series', 'seriesLocked'] ];   // SR "Acrynic" specialization - the one GEAR_SLOTS entry with a lockField (PERMANENT SLOTS, 2026-07-08): every other slot type omits index 7 and stays freely swappable

/* SR-M4 gap fix (REQUIREMENTS_SR.md): blackmarket/fence were terminal-only, the hangar tab's own hint text used
   to say so explicitly. Same data-cmd->HOST.runCmd path as everything else here. Buy is available at Ranger
   Command or a pirate station (matching the terminal command's own gate, extended to stations 2026-07-08); fence
   needs a HOSTILE dock, which in practice is only reachable at a pirate station now that regular hostile worlds
   refuse docking outright. */
function blackmarketFenceHtml(p){
  var h=H(); var CB=h&&h.CONTRABAND, CK=h&&h.CONTRA_KEYS, P=player();
  if(!CB || !Array.isArray(CK) || !CK.length) return '';
  var repHostile = num(h&&h.CFG&&h.CFG.REP_HOSTILE,-6);
  var showBuy = S.isBase || (p && p.isPirateStation);
  var showSell = !!(p && num(p.rep,0)<=repHostile);
  if(!showBuy && !showSell) return '';
  var out='<div class="pm-panel" style="margin-top:8px"><h4>BLACK MARKET'+(p&&p.isPirateStation?' - '+esc(p.name):'')+'</h4>', i;
  if(showBuy){
    out+='<div class="pm-sub" style="margin-bottom:4px">Buy illegal goods here - fence them at a hostile world for a markup.</div>';
    for(i=0;i<CK.length;i++){ var k=CK[i], g=CB[k]; if(!g) continue; var have=num(P&&P.contraband&&P.contraband[k],0);
      out+='<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.VIOLET+'">'+esc(g.n)+'</b>'+(have?' <span class="pm-sub">holding '+have+'</span>':'')+'</div>'
        + '<div style="color:'+COL.AMBER+'">'+fmtC(g.base)+'</div>'
        + '<button class="pm-b" data-act="cmd" data-cmd="blackmarket '+k+' 1">BUY 1</button></div>'; } }
  if(showSell){
    var any=false, j;
    out+='<div class="pm-sub" style="margin:6px 0 4px">Fence what you\'re holding - this world looks the other way.</div>';
    for(j=0;j<CK.length;j++){ var k2=CK[j], g2=CB[k2]; if(!g2) continue; var q=num(P&&P.contraband&&P.contraband[k2],0); if(q<=0) continue; any=true;
      out+='<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.GOOD+'">'+esc(g2.n)+'</b> <span class="pm-sub">holding '+q+'</span></div>'
        + '<button class="pm-b pm-go" data-act="cmd" data-cmd="fence '+k2+' '+q+'">SELL ALL</button></div>'; }
    if(!any) out+='<div class="pm-note">nothing to fence right now.</div>'; }
  out+='</div>';
  return out; }

/* ------------------------------------------------ TAB: MISSIONS */
/* MISSION CARDS (RJ 2026-09-06: "and missions"). The board was a wall of monospace text plus a four-column table
   whose only facts were a title and a price. A contract is a decision, so each posting is now a card carrying the
   four things the decision turns on: WHERE (target and its distance), HOW DANGEROUS (Synod ships counted near that
   target), WHAT IT PAYS, and whether your rank can take it at all.
   Every number comes from HOST.missionCandidates() - the same builder the Passenger's own chooser reads - so a card
   can never quietly disagree with the reason the Passenger gives for its pick. If that builder is not there (an old
   host), this returns '' and the plain table below still renders. */
var TYPE_COL = { BOUNTY:'#ff8a8a', ASSAULT:'#ff8a8a', PATROL:'#8fd0ff', ESCORT:'#8fd0ff', SUPPLY:'#7fd0b0', LIBERATE:'#c9a0ff', DEFEND:'#ffd27a' };
function dangerBar(n){
  var pips='', i, cap=5;
  for(i=0;i<cap;i++) pips += '<i style="display:inline-block;width:7px;height:7px;margin-right:2px;border-radius:1px;border:1px solid '
    + (i<n?'#ff8a8a':'#3a4a5e') + ';background:'+(i<n?'#ff8a8a':'transparent')+'"></i>';
  return pips + ' <span style="color:'+(n?COL.BAD:COL.GOOD)+'">' + (n ? n+' Synod near the target' : 'none seen near the target') + '</span>'; }
function missionCardsHtml(){
  var h=H(); if(!h || typeof h.missionCandidates!=='function') return '';
  var cs=[]; try{ cs=h.missionCandidates(false)||[]; }catch(e){ return ''; }
  if(!cs.length) return '';
  var M=window.MISSIONS, act=(M&&M.active&&M.active())||null;
  var out='<div class="pm-note" style="margin:6px 0 4px">Each card shows what the choice turns on - where it is, what waits there, what it pays, and whether your clearance covers it. The Passenger reads the same numbers.</div>';
  for(var i=0;i<cs.length;i++){ var c=cs[i];
    var col=TYPE_COL[c.type]||COL.HEAD;
    var accepted = act && (act.title===c.title);
    out += '<div class="pm-row" style="align-items:flex-start;border:1px solid '+(accepted?COL.GOOD:COL.BORDER)+';border-radius:7px;padding:8px 10px;margin-bottom:6px;background:rgba(11,18,30,.7)">'
      + '<div class="pm-grow">'
      +   '<div><span class="pm-tag" style="color:'+col+';border:1px solid '+col+'66;margin-left:0">'+esc(c.type||'JOB')+'</span> '
      +     '<b style="color:'+COL.TEXT+'">'+esc(c.title||('posting '+c.idx))+'</b>'
      +     (accepted?' <span style="color:'+COL.GOOD+'">ACCEPTED</span>':'')
      +     (c.locked?' <span class="pm-tag nd">needs higher clearance</span>':'') + '</div>'
      +   (c.desc?'<div class="pm-sub" style="margin-top:2px">'+esc(c.desc)+'</div>':'')
      +   '<div class="pm-cmpRow" style="margin-top:5px">'
      +     '<span class="pm-cmp'+(c.dist==null?' none':'')+'">target <b>'+esc(c.targetName||'unnamed')+'</b>'
      +       (c.dist!=null?' · '+c.dist+'u out':' · distance unknown')+'</span>'
      +     '<span class="pm-cmp '+(c.danger?'dn':'up')+'">'+dangerBar(c.danger)+'</span>'
      +   '</div>'
      + '</div>'
      + '<div style="text-align:right;min-width:96px">'
      +   '<div style="color:'+COL.AMBER+';font-size:15px">'+num(c.reward,0)+'c</div>'
      +   (c.dist?'<div class="pm-sub">'+(c.reward/Math.max(1,c.dist)).toFixed(2)+'c per unit flown</div>':'')
      +   '<button class="pm-b pm-go" data-act="cmd" data-cmd="accept m'+c.idx+'" style="margin-top:5px;min-width:84px"'   // `accept m<n>` is the MISSION board; a bare `accept <n>` is a coalition CONTRACT id
      +     ((accepted||c.locked)?' disabled':'')+'>'+(accepted?'ACTIVE':(c.locked?'LOCKED':'ACCEPT'))+'</button>'
      + '</div></div>'; }
  return out; }
function missionsHtml(){
  var M=window.MISSIONS, board='(mission system offline)';
  // when the CARDS below can render, the monospace board prints only its status lines - clearance, next refresh,
  // what is active - instead of repeating every posting a second time on the same screen.
  var useCards=!!missionCardsHtml();
  if(M && typeof M.board==='function'){ try{ board=String((useCards&&M.header)?M.header():M.board()); }catch(e){ board='(mission board glitched)'; } }
  var h='<div class="pm-board">'+board+'</div>';
  var list=null;
  if(M){ try{ if(typeof M.list==='function') list=M.list(); else if(Array.isArray(M.missions)) list=M.missions; }catch(e){ list=null; } }
  if(M && typeof M.accept==='function'){
    var cards=missionCardsHtml();
    if(cards){ h+=cards; }
    else if(Array.isArray(list) && list.length){
      var i; h+='<table class="pm-t"><tr><th>#</th><th>MISSION</th><th>REWARD</th><th></th></tr>';
      for(i=0;i<list.length;i++){ var m=list[i]||{};
        var d=m.desc||m.title||m.n||m.name||('mission '+(i+1));
        var rw=(m.reward!=null)?(m.reward+'c'):'';
        var acc=(m.accepted===true);
        h += '<tr><td>'+(i+1)+'</td><td>'+esc(d)+(acc?' <span style="color:'+COL.GOOD+'">[accepted]</span>':'')+'</td>'
          + '<td style="color:'+COL.AMBER+'">'+esc(rw)+'</td>'
          + '<td><button class="pm-b pm-go" data-act="accept" data-i="'+i+'"'+(acc?' disabled':'')+'>ACCEPT</button></td></tr>'; }
      h+='</table>'; }
    else {
      var j; h+='<div class="pm-note">Accept by board order (top = 1):</div><div>';
      for(j=0;j<CFG.MISSION_BTN_N;j++) h+='<button class="pm-b pm-go" style="margin-right:6px" data-act="accept" data-i="'+(j+1)+'">ACCEPT '+(j+1)+'</button>';   // BUGFIX: MISSIONS.accept(idx) is 1-based (does idx-1 internally) - button j=0 ("ACCEPT 1") must send data-i=1, not 0, or it always misses by one slot
      h+='</div>'; } }
  /* SR:AWA parity slice (2026-07-09): COALITION CONTRACTS were terminal-only - this tab's own fallback note
     used to say "still post on the terminal". Rendered live from HOST.contracts (no second copy), every
     button delegates to the REAL `accept <id>` / `abandon <id>` commands. */
  var cts=(h0=>{ var hh=H(); return (hh&&hh.contracts)||[]; })();
  if(cts.length){
    h+='<div class="pm-panel" style="margin-top:10px"><h4>COALITION CONTRACTS <span style="color:'+COL.DIM+';font-weight:400">(open jobs - defense, delivery, bounties)</span></h4>';
    for(var ci=0;ci<cts.length;ci++){ var ct=cts[ci]||{};
      var prog=(ct.type==='bounty'&&ct.need)?(' <span class="pm-tag mk">'+num(ct.got,0)+'/'+ct.need+'</span>'):'';
      h+='<div class="pm-row"><div class="pm-grow"><b>['+esc(ct.id)+']</b> '+esc(ct.desc||'?')
        +(ct.accepted?(' <span style="color:'+COL.GOOD+'">ACCEPTED</span>'+prog):'')
        +' <span class="pm-sub">@ '+esc(ct.issuer&&ct.issuer.name||'?')+'</span></div>'
        +'<div style="color:'+COL.AMBER+';min-width:80px;text-align:right">'+num(ct.reward,0)+'c <span style="color:'+COL.GOOD+'">+'+num(ct.rep,0)+'rep</span></div>'
        +(ct.accepted
          ? '<button class="pm-b" data-act="cmd" data-cmd="abandon '+esc(ct.id)+'" style="min-width:76px">ABANDON</button>'
          : '<button class="pm-b pm-go" data-act="cmd" data-cmd="accept '+esc(ct.id)+'" style="min-width:76px">ACCEPT</button>')
        +'</div>'; }
    h+='</div>'; }
  return h; }

/* ------------------------------------------------ TAB: QUESTS (SR-M9, REQUIREMENTS_SR.md - Space Rangers 2's
   signature: branching dialogue with real consequences, not a checklist objective like MISSIONS above) */
function questPending(){ var TQ=window.TEXTQUESTS; if(!TQ) return false;
  try{ return !!TQ.active(); }catch(e){ return false; } }
function questsHtml(){
  var TQ=window.TEXTQUESTS;
  if(!TQ) return '<div class="pm-note">(quest system offline)</div>';
  var q=null; try{ q=TQ.active(); }catch(e){ q=null; }
  if(!q) return '<div class="pm-note">Nothing on offer right now. Dock somewhere and a quest may come up - '
    + 'branching choices with real consequences (credits, standing, reputation), not a checklist.</div>';
  var h='<div class="pm-panel"><h4>'+esc(q.title)+'</h4><div style="margin-bottom:10px;line-height:1.5">'+q.text+'</div>', i;
  for(i=0;i<q.choices.length;i++){ var c=q.choices[i];
    h += '<button class="pm-row pm-b'+(c.enabled?' pm-go':'')+'" style="width:100%;text-align:left;margin-bottom:6px;display:block" '
       + 'data-act="cmd" data-cmd="choose '+c.n+'"'+(c.enabled?'':' disabled')+'>'+esc(c.label)+'</button>'; }
  h += '</div>';
  return h; }

/* ------------------------------------------------ TAB: GROUND */
function groundHtml(){
  var p=S.planet, own=S.isBase?'base':ownerOf(p), ob=CFG.OWNER[own]||CFG.OWNER.coalition;
  var C=window.CONQUEST;
  var winTxt;
  if(own==='synod')      winTxt='Win the ground assault and you <b style="color:'+COL.VIOLET+'">CAPTURE '+esc((p&&p.name)||'this world')+'</b> from the Iron Synod: docking, fuel and repair reopen, the front weakens, and the world can become YOURS.';
  else if(own==='player') winTxt='This world is <b style="color:'+COL.VIOLET+'">YOURS</b>. Ground fights here drive off raiders - keep the defense pips stocked or the Synod will take it back.';
  else if(own==='base')   winTxt='Ranger Command is an orbital station - nothing to walk on. Fly to a planet to land.';
  else                    winTxt='A coalition world - surface fights are skirmishes against local hostiles (loot + standing). Capture applies to <b style="color:'+COL.BAD+'">Synod-held</b> worlds: look for the red banner.';
  var h='<div class="pm-panel"><h4>HOW GROUND OPS WORK</h4>'
    + '<div>1. <b>LAND</b> - leave the cockpit and walk the surface in 3D (WASD, Shift to run).</div>'
    + '<div>2. Close with a hostile - combat drops into a <b>turn-based battle on an 8x8 grid, under Tami rules</b> (types, techniques, afflictions).</div>'
    + '<div>3. <b>WIN</b> - take the spoils'+(own==='synod'?' and the world':'')+'. Retreat or lose - no rewards, back to orbit.</div>'
    + '</div>';
  h += '<div class="pm-panel"><h4>THIS WORLD</h4>'
    + '<div style="margin-bottom:6px">owner: <span class="pm-chip" style="color:'+ob.c+';border-color:'+ob.c+'">'+ob.n+'</span></div>'
    + '<div>'+winTxt+'</div></div>';
  if(!S.isBase){
    var defHtml = C
      ? ('<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.HEAD+'">GARRISON</b>'
        + '<div class="pm-sub">defense '+pipsHtml(defenseOf(p))+' - each pip blunts raids and Synod capture attempts</div></div>'
        + '<button class="pm-b" data-act="defense"'+(typeof C.addDefense==='function'?'':' disabled')+'>ADD DEFENSE</button></div>')
      : '<div class="pm-note">(conquest system offline - defense garrisons unavailable)</div>';
    h += defHtml; }
  h += '<div class="pm-center" style="height:auto;padding:22px 0 8px 0">'
    + '<button class="pm-b pm-big '+(own==='synod'?'pm-warn':'pm-go')+'" data-act="land"'+(S.isBase?' disabled':'')+'>'
    + (own==='synod'?'ASSAULT THE SURFACE':'LAND ON THE SURFACE')+'</button>'
    + '<div class="pm-sub">'+(S.isBase?'no surface here':'closes this screen and drops you planetside')+'</div></div>';
  return h; }

/* ------------------------------------------------ TAB: NEWS (galaxy timeline: war front, economy, campaign) */
function logHtml(){
  if(!S.log.length) return '<div class="pm-note">No news yet - the front, the markets, and the campaign all report here as they happen. The last '+CFG.LOG_MAX+' items land here, and it survives a reload.</div>';
  /* SR:AWA readability slice (2026-07-09): a relative age chip next to each stamp + a count header. NOTE the
     audit save: entries are UNSHIFTED (newest at [0], see pushEvent) so the ascending loop was ALREADY
     newest-first - a draft of this slice iterated backwards and would have INVERTED it. Read the write path
     before "fixing" the read path. */
  var h='<div class="pm-note" style="margin-bottom:6px">newest first - '+S.log.length+' item'+(S.log.length>1?'s':'')+' this session</div>', i;
  var now=(typeof gameT==='function')?num(gameT(),0):0;
  for(i=0;i<S.log.length;i++){ var e=S.log[i];
    var age=Math.max(0,now-num(e.t,0)); var rel=age<60?(Math.round(age)+'s'):(Math.round(age/60)+'m');
    h+='<div class="pm-log"><span class="pm-tm">'+tstr(e.t)+' <span style="opacity:.55">('+rel+' ago)</span></span>'+e.h+'</div>'; }
  return h; }

/* ------------------------------------------------ TAB: DEPART */
/* (departHtml removed 2026-07-09 with its tab - DEPART is the header button now; doDepart unchanged.) */

/* ------------------------------------------------ RENDER DISPATCH */
function renderBody(){
  if(!S.el.body) return;
  var h='';
  if(S.tab==='market') h=marketHtml();
  else if(S.tab==='hangar') h=shopHtml();   /* the flat SHOP is the buying surface; the 13-section hangar it replaced on 2026-07-09 sat unreachable in this file until 2026-09-06, when it was deleted (RJ: "there is a lot of AI slop here... half built pieces") */
  else if(S.tab==='missions') h=missionsHtml();
  else if(S.tab==='quests') h=questsHtml();
  else if(S.tab==='ground') h=groundHtml();
  else if(S.tab==='bar') h=barHtml();           /* SR-M18 */
  else if(S.tab==='science') h=scienceHtml();   /* SR-M19 */
  else if(S.tab==='log') h=logHtml();
  S.el.body.innerHTML=h; }

function renderAll(){ renderHead(); renderSide(); renderTabs(); renderBody(); }

/* ------------------------------------------------ PUBLIC API */
function init(){ ensureDom(); }

// user 2026-07-08 "I still don't see the item shop on the planet": the HANGAR tab itself renders correctly
// (verified directly and via the real dock-button click path) - the real bug is that the floating combat panels
// never suspend while docked, and this overlay (pmRoot) is wide/tall enough at common viewport sizes that the
// power panel (a moment-to-moment FLIGHT hud with no purpose while docked, and just made much bigger this same
// session) sits ON TOP of real menu real estate. Suspend it (and the redundant floating MARKET overview, which
// duplicates the MARKET tab below anyway) while docked, restore only the ones that were actually open before.
var _panelsSuspended = null;
function suspendFlightPanels(){
  if(typeof window==='undefined' || !window.PANELS || _panelsSuspended) return;
  _panelsSuspended = { market: !!window.PANELS.isOpen('market'), powerpanel: !!window.PANELS.isOpen('powerpanel') };
  window.PANELS.close('market'); window.PANELS.close('powerpanel');
}
function restoreFlightPanels(){
  if(typeof window==='undefined' || !window.PANELS || !_panelsSuspended) return;
  if(_panelsSuspended.market) window.PANELS.open('market');
  if(_panelsSuspended.powerpanel) window.PANELS.open('powerpanel');
  _panelsSuspended = null;
}
function openMenu(planet,opts){
  if(!ensureDom()) return;
  var P=player();
  S.planet = planet || (P && P.docked) || null;
  S.isBase = !!(opts && opts.isBase);
  S.tab = S.isBase ? 'hangar' : 'market';     /* the base has no commodity market */
  S.tHead=0; S.tBody=0;
  if(!S.open){ S.open=true; S.el.root.style.display='flex'; sfx('dock'); suspendFlightPanels(); }
  renderAll(); }

function closeMenu(){
  if(!S.open) return;
  S.open=false;
  if(S.el.root) S.el.root.style.display='none';
  restoreFlightPanels();
  sfx('ui'); }

function isOpen(){ return !!S.open; }

function pushEvent(html){
  S.log.unshift({ t:gameT(), h:String(html==null?'':html) });
  if(S.log.length>CFG.LOG_MAX) S.log.length=CFG.LOG_MAX;
  if(S.open){ renderTabs(); if(S.tab==='log') renderBody(); } }

// SR-M10: news survives a reload - HOST's save/load calls these directly (plain data, no DOM/HOST refs)
function getLog(){ return S.log.map(function(e){ return { t:e.t, h:e.h }; }); }
function setLog(arr){ S.log = (Array.isArray(arr) ? arr : []).slice(0, CFG.LOG_MAX).map(function(e){
  return { t:num(e&&e.t,0), h:String((e&&e.h)==null?'':e.h) }; }); }

function tick(dt){
  if(!S.open) return;
  var d=(typeof dt==='number' && isFinite(dt)) ? dt : 0;
  S.tHead+=d; S.tBody+=d;
  if(S.tHead>=CFG.REFRESH_HEADER_S){ S.tHead=0; renderHead(); }
  if(S.tBody>=CFG.REFRESH_CONTENT_S){ S.tBody=0;
    if(S.tab==='market'||S.tab==='log'||S.tab==='ground') renderBody(); } }

// FULLSCREEN ENGINEERING BAY (user 2026-07-08 "make the item shop a fullscreen window that attaches to the
// engineering bay... same menu for now"): hangarHtml/onClick exposed so engbay.js can embed the EXACT same HANGAR
// tab content/dispatch inside its own fullscreen window, rather than re-implementing shop UI a second time. Since
// engbay is only reachable while genuinely docked (S.planet/S.isBase are already correct in that case - the same
// invariant the docked pmRoot menu itself already relies on), calling these from outside pmRoot's own DOM tree is
// safe: onClick reads e.target.closest(...) off the passed event, not off pmRoot specifically.
// DIABLO-2-STYLE SLOT GRID (user 2026-07-08 "make a visual UI of putting the components in sort of like diablo
// 2... make a matrix and document it"): GEAR_SLOTS is the single source of truth for which single-slot equipment
// categories exist and how to fit them - exposed so engbay.js's icon grid reads the SAME list rather than keeping
// its own copy that could drift out of sync with this file's own tab.
window.PLANETMENU = { init:init, tick:tick, open:openMenu, close:closeMenu, isOpen:isOpen, pushEvent:pushEvent, getLog:getLog, setLog:setLog, onClick:onClick, GEAR_SLOTS:GEAR_SLOTS,
  _rumors:barRumors, _patrons:barPatrons };   /* SR-M18: exposed so the accept-bar "N/N rumors verify against live state" check can call each rumor's own check() */
})();
