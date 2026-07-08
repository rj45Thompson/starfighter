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
  EQUIP_BAY_VISUAL_MAX: 8,      // HANGAR loadout equipment-bay grid box count - purely presentational
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
          {k:'hangar',   n:'HANGAR'},
          {k:'missions', n:'MISSIONS'},
          {k:'quests',   n:'QUESTS'},
          {k:'ground',   n:'GROUND'},
          {k:'log',      n:'NEWS'},
          {k:'depart',   n:'DEPART'} ],
  UP_KINDS: [ {k:'weapon', n:'WEAPON', d:'faster, harder-hitting guns'},
              {k:'engine', n:'ENGINE', d:'more thrust - close, chase, escape'},
              {k:'hull',   n:'HULL',   d:'more max hull (upgrade repairs to full)'} ],
  OWNER: { coalition:{ n:'COALITION SPACE',    c:'#7fd0b0' },
           synod:    { n:'IRON SYNOD CONTROL', c:'#ff8a8a' },
           player:   { n:'YOUR WORLD',         c:'#c9a0ff' },
           base:     { n:'RANGER COMMAND',     c:'#9fd8ff' } }
};
var COL = { HEAD:'#8fd0ff', GOOD:'#7fd0b0', BAD:'#ff8a8a', AMBER:'#ffd27a', VIOLET:'#c9a0ff',
            TEXT:'#cfe2f5', DIM:'#7d93ad', BORDER:'#24344a', BASE:'#9fd8ff',
            PANEL:'rgba(9,15,25,.92)', PANEL2:'rgba(13,21,34,.94)' };

/* ------------------------------------------------ STATE */
var S = { built:false, keysBound:false, open:false, planet:null, isBase:false,
          tab:'market', tHead:0, tBody:0, log:[], el:{},
          slotOpen:{ hull:false, weapon:false, equip:false, engine:false, gizmo:false,
            tank:false, radar:false, scanner:false, shieldgen:false, droid:false, hook:false,
            series:false, hardpoint:false } };   /* HANGAR loadout-slot expand/collapse (presentation only) */

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
    +   '<div class="pm-foot">[1-6] tabs &nbsp;-&nbsp; [Esc] close &nbsp;-&nbsp; every action routes through the ship terminal (watch it for results)</div>'
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
  if(e.key>='1' && e.key<='6'){ var i=e.key.charCodeAt(0)-49;
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
  closeMenu(); runCmd('launch');
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
    + '<button class="pm-x" data-act="close" title="close (Esc)">X</button>'; }

/* ------------------------------------------------ RENDER: LEFT SIDE (portrait + status + how-it-works) */
function portraitHtml(){
  var p=S.planet;
  var colNum = S.isBase ? 0x9fd8ff : ((p&&p.type&&typeof p.type.col==='number') ? p.type.col : 0x37506a);
  var hx=hex6(colNum), lite=shade(hx,0.55), mid=shade(hx,0.05), dark=shade(hx,-0.72), glow=shade(hx,0.15);
  var sz=CFG.PORTRAIT_PX;
  return '<div class="pm-disc" style="width:'+sz+'px;height:'+sz+'px;'
    + 'background:radial-gradient(circle at 32% 30%, '+lite+', '+mid+' 46%, '+dark+' 82%);'
    + 'box-shadow:0 0 26px '+glow+'66, inset -16px -14px 36px rgba(0,0,0,.55)"></div>'; }

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

function renderSide(){
  if(!S.el.side) return;
  var p=S.planet;
  var status = conquestLine(p) || statusFallback();
  S.el.side.innerHTML =
      portraitHtml()
    + '<div style="text-align:center;color:'+COL.DIM+';font-size:11px;letter-spacing:.14em;margin:-4px 0 12px 0">'
    +   esc(S.isBase?((p&&p.name)||'RANGER COMMAND'):((p&&p.name)||'?')).toUpperCase() + '</div>'
    + '<div class="pm-panel"><h4>STATUS</h4><div>'+status+'</div></div>'
    + '<div class="pm-panel"><h4>HOW IT WORKS</h4>'
    +   '<div style="margin-bottom:6px"><span style="color:'+COL.VIOLET+'">CAPTURE:</span> red banner = Synod-held. '
    +   'LAND there, win the turn-based ground battle, and the world flips to your side - then ADD DEFENSE so it holds.</div>'
    +   '<div><span style="color:'+COL.GOOD+'">TRADE:</span> buy what a world MAKES (high stock = cheap), '
    +   'haul it to a world that NEEDS it (low stock = dear), sell green prices - refit in the HANGAR.</div>'
    + '</div>'; }

/* ------------------------------------------------ RENDER: TABS */
function renderTabs(){
  if(!S.el.tabs) return;
  var h='', i;
  for(i=0;i<CFG.TABS.length;i++){ var t=CFG.TABS[i];
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

/* ------------------------------------------------ TAB: MARKET */
function marketHtml(){
  var p=S.planet, P=player(), G=goods();
  if(S.isBase) return '<div class="pm-note">No commodity exchange at Ranger Command - the base deals in hulls and contraband.'
    + '<br>Terminal: <b style="color:'+COL.AMBER+'">hull &lt;class&gt;</b> - <b style="color:'+COL.AMBER+'">blackmarket</b> - <b style="color:'+COL.AMBER+'">fence</b></div>';
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
  return head+table+foot+terraformHtml(p); }

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

/* -- HULLS: swap chassis, Ranger Command only -- */
function hullSectionHtml(P){
  var h=H(); var HULLS=h&&h.HULLS, ORDER=h&&h.HULL_ORDER;
  if(!HULLS || !Array.isArray(ORDER) || !ORDER.length) return '<div class="pm-note">(hull registry offline)</div>';
  var canRefit = atBase(P);
  var rows='', i;
  for(i=0;i<ORDER.length;i++){ var key=ORDER[i], hu=HULLS[key]; if(!hu) continue;
    var isCurrent = P && P.hullClass===key;
    var afford = num(P&&P.credits,0) >= num(hu.cost,0);
    var costCol = isCurrent ? COL.DIM : (afford ? COL.AMBER : COL.BAD);
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.VIOLET+'">'+esc(hu.n||key)+'</b>'+(isCurrent?' <span class="pm-tag mk">CURRENT</span>':'')
      + '<div class="pm-sub">hull '+num(hu.hp,0)+' - hold '+num(hu.hold,0)+' - speed x'+num(hu.speed,1)+'</div>'
      + '<div class="pm-sub">'+esc(hu.desc||'')+'</div></div>'
      + '<div style="color:'+costCol+'">'+(num(hu.cost,0)>0?fmtC(hu.cost):'free')+'</div>'
      + '<button class="pm-b pm-vio" data-act="cmd" data-cmd="hull '+key+'"'
      + ((!canRefit||isCurrent||!afford)?' disabled':'')+'>'+(isCurrent?'CURRENT':'EQUIP')+'</button></div>'; }
  var hint = canRefit
    ? '<div class="pm-note">Hull swaps take effect immediately - hold and hull points come from the new chassis.</div>'
    : '<div class="pm-note"><span style="color:'+COL.AMBER+'">Dock at Ranger Command to refit</span> - hull swaps are base-only. '
      + 'Current: <b style="color:'+COL.VIOLET+'">'+esc((P&&HULLS[P.hullClass]&&HULLS[P.hullClass].n)||'Fighter')+'</b>'
      + ' - hull '+Math.round(num(P&&P.maxHp,0))+' - hold '+Math.round(num(P&&P.holdCap,0))+'.</div>';
  return rows+hint; }

/* -- WEAPONS: buy at any dock, rank-gated -- */
function weaponSectionHtml(P){
  var h=H(); var WEAPONS=h&&h.WEAPONS, ORDER=h&&h.WEAPON_ORDER, RANKS=h&&h.RANKS;
  if(!WEAPONS || !Array.isArray(ORDER) || !ORDER.length) return '<div class="pm-note">(weapon registry offline)</div>';
  var rows='', i;
  for(i=0;i<ORDER.length;i++){ var key=ORDER[i], w=WEAPONS[key]; if(!w) continue;
    var isCurrent = P && (P.weaponType||'energy')===key;
    var afford = num(P&&P.credits,0) >= num(w.cost,0);
    var reqRank = (Array.isArray(RANKS) && RANKS[i] && RANKS[i].n) ? RANKS[i].n : '';
    var costCol = isCurrent ? COL.DIM : (afford ? COL.AMBER : COL.BAD);
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.HEAD+'">'+esc(w.n||key)+'</b>'+(isCurrent?' <span class="pm-tag mk">FITTED</span>':'')
      + '<div class="pm-sub">dmg '+num(w.dmg,0)+(w.homing?' - homing':'')+(w.splash?' - splash '+num(w.splash,0):'')
      +   ' - range '+Math.round(num(w.range,0)*100)+'%'+(reqRank?' - requires <b>'+esc(reqRank)+'</b> rank':'')+'</div></div>'
      + '<div style="color:'+costCol+'">'+(num(w.cost,0)>0?fmtC(w.cost):'free')+'</div>'
      + '<button class="pm-b" data-act="cmd" data-cmd="weapon '+key+'"'
      + ((isCurrent||!afford)?' disabled':'')+'>'+(isCurrent?'FITTED':'BUY')+'</button></div>'; }
  return rows; }

/* -- EQUIPMENT: buy at any dock, cumulative (never disabled for "already owned") -- */
function equipSectionHtml(P){
  var rows='', i;
  for(i=0;i<EQUIP_SHOP.length;i++){ var eq=EQUIP_SHOP[i];
    var owned = num(P && P.equip && P.equip[eq.k], 0);
    var afford = num(P&&P.credits,0) >= eq.cost;
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.GOOD+'">'+esc(eq.n)+'</b>'+(owned>0?' <span class="pm-sub">x'+owned+'</span>':'')
      + '<div class="pm-sub">'+esc(eq.desc)+'</div></div>'
      + '<div style="color:'+(afford?COL.AMBER:COL.BAD)+'">'+fmtC(eq.cost)+'</div>'
      + '<button class="pm-b pm-go" data-act="cmd" data-cmd="install '+eq.k+'"'+(afford?'':' disabled')+'>BUY</button></div>'; }
  return rows; }

/* -- ENGINE: single-slot fit, exactly like WEAPON above (real tradeoff between drive TYPES, distinct
   from the engine LEVEL upgrade in the UP_KINDS list) -- */
function engineSectionHtml(P){
  var h=H(); var ENGINES=h&&h.ENGINES, ORDER=h&&h.ENGINE_KEYS;
  if(!ENGINES || !Array.isArray(ORDER) || !ORDER.length) return '<div class="pm-note">(engine registry offline)</div>';
  var rows='', i;
  for(i=0;i<ORDER.length;i++){ var key=ORDER[i], en=ENGINES[key]; if(!en) continue;
    var isCurrent = P && (P.engineType||'standard')===key;
    var afford = num(P&&P.credits,0) >= num(en.cost,0);
    var costCol = isCurrent ? COL.DIM : (afford ? COL.AMBER : COL.BAD);
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.HEAD+'">'+esc(en.n||key)+'</b>'+(isCurrent?' <span class="pm-tag mk">FITTED</span>':'')
      + '<div class="pm-sub">'+esc(en.desc||'')+'</div></div>'
      + '<div style="color:'+costCol+'">'+(num(en.cost,0)>0?fmtC(en.cost):'free')+'</div>'
      + '<button class="pm-b" data-act="cmd" data-cmd="engine '+key+'"'
      + ((isCurrent||!afford)?' disabled':'')+'>'+(isCurrent?'FITTED':'BUY')+'</button></div>'; }
  return rows; }

/* -- STANDARD GEAR SLOTS (user 2026-07-08): Fuel Tank/Radar/Scanner/Shield Generator/Repair Droid/Cargo Hook -
   six more single-slot fits, all structurally identical to ENGINE above (list-or-fitted row, BUY button) - one
   generic renderer instead of six near-duplicate functions; each reads its table straight off HOST (H().FUEL_TANKS
   etc, exposed the same live way as HULLS/WEAPONS/ENGINES/GIZMOS) so this file never hardcodes a second copy. -- */
function simpleSlotSectionHtml(P, tableProp, keysProp, field, defKey, cmdVerb){
  var h=H(); var TABLE=h&&h[tableProp], KEYS=h&&h[keysProp];
  if(!TABLE || !Array.isArray(KEYS) || !KEYS.length) return '<div class="pm-note">(registry offline)</div>';
  var rows='', i;
  for(i=0;i<KEYS.length;i++){ var key=KEYS[i], it=TABLE[key]; if(!it) continue;
    var isCurrent = P && (P[field]||defKey)===key;
    var afford = num(P&&P.credits,0) >= num(it.cost,0);
    var costCol = isCurrent ? COL.DIM : (afford ? COL.AMBER : COL.BAD);
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.HEAD+'">'+esc(it.n||key)+'</b>'+(isCurrent?' <span class="pm-tag mk">FITTED</span>':'')
      + '<div class="pm-sub">'+esc(it.desc||'')+'</div></div>'
      + '<div style="color:'+costCol+'">'+(num(it.cost,0)>0?fmtC(it.cost):'free')+'</div>'
      + '<button class="pm-b" data-act="cmd" data-cmd="'+cmdVerb+' '+key+'"'
      + ((isCurrent||!afford)?' disabled':'')+'>'+(isCurrent?'FITTED':'BUY')+'</button></div>'; }
  return rows; }
var GEAR_SLOTS = [   // [slotKind, label, tableProp, keysProp, field, defKey, cmdVerb]
  ['tank',      'FUEL TANK',        'FUEL_TANKS',    'FUEL_TANK_KEYS',    'fuelTankType', 'standard', 'tank'],
  ['radar',     'RADAR',            'RADARS',        'RADAR_KEYS',        'radarType',    'basic',    'radar'],
  ['scanner',   'SCANNER',          'SCANNERS',      'SCANNER_KEYS',      'scannerType',  'none',     'scanner'],
  ['shieldgen', 'SHIELD GENERATOR', 'SHIELD_GENS',   'SHIELD_GEN_KEYS',   'shieldGenType','none',     'shieldgen'],
  ['droid',     'REPAIR DROID',     'REPAIR_DROIDS', 'REPAIR_DROID_KEYS', 'droidType',    'none',     'droid'],
  ['hook',      'CARGO HOOK',       'CARGO_HOOKS',   'CARGO_HOOK_KEYS',   'cargoHookType','none',     'hook'],
  ['series',    'HULL SERIES',      'HULL_SERIES',   'HULL_SERIES_KEYS',  'hullSeries',   'standard', 'series'] ];   // SR "Acrynic" specialization - same single-slot pattern, no new renderer needed

/* -- WEAPON HARDPOINTS: extra weapon slots BEYOND the primary (weaponSectionHtml above still fits that one) -
   a real n-slot bay, mount/unmount/sell, same shape as GIZMOS just against the WEAPONS table. -- */
function hardpointSectionHtml(P){
  var h=H(); var WEAPONS=h&&h.WEAPONS, ORDER=h&&h.WEAPON_ORDER, slots=(P&&P.weaponSlots)||[];
  if(!WEAPONS || !Array.isArray(ORDER) || !ORDER.length) return '<div class="pm-note">(weapon registry offline)</div>';
  var rows='', i;
  var mounted='';
  for(i=0;i<slots.length;i++){ var k=slots[i], w=k&&WEAPONS[k];
    mounted += '<div class="pm-row"><div class="pm-grow">'
      + (w ? ('<b style="color:'+COL.GOOD+'">'+esc(w.n)+'</b><div class="pm-sub">dmg '+num(w.dmg,0)+(w.homing?' - homing':'')+(w.splash?' - splash '+num(w.splash,0):'')+'</div>')
           : '<span class="pm-sub">hardpoint '+(i+1)+' - empty</span>')
      + '</div>'
      + (w ? ('<button class="pm-b pm-warn" data-act="cmd" data-cmd="hardpoint unmount '+(i+1)+'">UNMOUNT (+'
             + Math.round(w.cost*(h.HARDPOINT_SELL_FRAC||0.5)) + 'c)</button>') : '') + '</div>'; }
  rows += '<div class="pm-panel" style="margin-bottom:8px"><h4 style="margin-bottom:4px">MOUNTED</h4>'+mounted+'</div>';
  rows += '<h4 style="margin-bottom:4px">SHOP</h4>';
  var freeSlot = slots.indexOf(null) >= 0;
  for(i=0;i<ORDER.length;i++){ var key=ORDER[i], w2=WEAPONS[key]; if(!w2) continue;
    var already = typeof h.hasHardpoint==='function' ? h.hasHardpoint(P,key) : (slots.indexOf(key)>=0);
    var afford = num(P&&P.credits,0) >= num(w2.cost,0);
    var canBuy = freeSlot && afford;
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.HEAD+'">'+esc(w2.n)+'</b>'+(already?' <span class="pm-tag mk">MOUNTED</span>':'')
      + '<div class="pm-sub">dmg '+num(w2.dmg,0)+(w2.homing?' - homing':'')+(w2.splash?' - splash '+num(w2.splash,0):'')+'</div></div>'
      + '<div style="color:'+(afford?COL.AMBER:COL.BAD)+'">'+fmtC(w2.cost)+'</div>'
      + '<button class="pm-b pm-go" data-act="cmd" data-cmd="hardpoint mount '+key+'"'+(canBuy?'':' disabled')+'>BUY</button></div>'; }
  if(!freeSlot) rows += '<div class="pm-note">All weapon hardpoints full - unmount one above to buy something else.</div>';
  return rows; }
function gearSlotHeaderRow(P, def){
  var h=H(); var TABLE=h&&h[def[2]]; if(!TABLE) return '';
  var it=TABLE[(P&&P[def[4]])||def[5]]; if(!it) return '';
  return loadoutSlotHtml(def[0], def[1]+' (1 fitted)', '<b style="color:'+COL.HEAD+'">'+esc(it.n)+'</b>', esc(it.desc||''), S.slotOpen[def[0]]); }

/* -- GIZMOS: the REAL slot-based bay (mount/unmount/sell) - unlike EQUIPMENT above, a gizmo already
   mounted in every slot blocks buying another until you free one. -- */
function gizmoSectionHtml(P){
  var h=H(); var GIZMOS=h&&h.GIZMOS, KEYS=h&&h.GIZMO_KEYS, slots=(P&&P.gizmoSlots)||[];
  if(!GIZMOS || !Array.isArray(KEYS) || !KEYS.length) return '<div class="pm-note">(gizmo registry offline)</div>';
  var rows='', i;
  var mounted='';
  for(i=0;i<slots.length;i++){ var k=slots[i], g=k&&GIZMOS[k];
    mounted += '<div class="pm-row"><div class="pm-grow">'
      + (g ? ('<b style="color:'+COL.GOOD+'">'+esc(g.n)+'</b><div class="pm-sub">'+esc(g.desc)+'</div>')
           : '<span class="pm-sub">slot '+(i+1)+' - empty</span>')
      + '</div>'
      + (g ? ('<button class="pm-b pm-warn" data-act="cmd" data-cmd="gizmo unmount '+(i+1)+'">UNMOUNT (+'
             + Math.round(g.cost*(h.GIZMO_SELL_FRAC||0.5)) + 'c)</button>') : '') + '</div>'; }
  rows += '<div class="pm-panel" style="margin-bottom:8px"><h4 style="margin-bottom:4px">MOUNTED</h4>'+mounted+'</div>';
  rows += '<h4 style="margin-bottom:4px">SHOP</h4>';
  var freeSlot = slots.indexOf(null) >= 0;
  for(i=0;i<KEYS.length;i++){ var key=KEYS[i], gz=GIZMOS[key]; if(!gz) continue;
    var already = typeof h.hasGizmo==='function' ? h.hasGizmo(P,key) : (slots.indexOf(key)>=0);
    var afford = num(P&&P.credits,0) >= num(gz.cost,0);
    var canBuy = freeSlot && !already && afford;
    rows += '<div class="pm-row"><div class="pm-grow">'
      + '<b style="color:'+COL.HEAD+'">'+esc(gz.n)+'</b>'+(already?' <span class="pm-tag mk">MOUNTED</span>':'')
      + '<div class="pm-sub">'+esc(gz.desc)+'</div></div>'
      + '<div style="color:'+(afford?COL.AMBER:COL.BAD)+'">'+fmtC(gz.cost)+'</div>'
      + '<button class="pm-b pm-go" data-act="cmd" data-cmd="gizmo mount '+key+'"'+(canBuy?'':' disabled')+'>BUY</button></div>'; }
  if(!freeSlot) rows += '<div class="pm-note">All gizmo slots full - unmount one above to buy something else.</div>';
  return rows; }

/* -- LOADOUT: Star-Control-2/Space-Rangers style slot header over the buy sections above. HULL and
   WEAPON are genuinely single-slot in the host model (P.hullClass / P.weaponType are scalars), so
   those two render as real 1-slot fittings. Equipment is NOT slot-based in the host model (P.equip
   is a stacking count-bag, install() just increments it) - the bay below is a PRESENTATIONAL grid
   only: it fills however many boxes are actually owned and caps the visual grid at
   CFG.EQUIP_BAY_VISUAL_MAX purely so the row doesn't run unbounded, it does not mean the game
   enforces that many slots. */
function loadoutSlotHtml(kind, label, filledLabel, filledSub, isOpen){
  var arrow = isOpen ? '&#9660;' : '&#9654;';
  return '<button class="pm-row pm-slot" data-act="slot" data-slot="'+kind+'" style="width:100%;text-align:left;cursor:pointer;background:'
    + (isOpen?'rgba(143,208,255,.07)':'rgba(11,18,30,.85)') + ';border-color:'+(isOpen?COL.HEAD:COL.BORDER)+'">'
    + '<div class="pm-grow"><b style="color:'+COL.HEAD+';letter-spacing:.08em;font-size:11px">'+esc(label)+'</b>'
    + '<div style="margin-top:2px">'+filledLabel+'</div>'
    + (filledSub?('<div class="pm-sub">'+filledSub+'</div>'):'')
    + '</div><div style="color:'+COL.DIM+';font-size:13px">'+arrow+'</div></button>'; }

function equipBayHtml(P){
  var owned=[], i, total=0;
  for(i=0;i<EQUIP_SHOP.length;i++){ var eq=EQUIP_SHOP[i], n=num(P&&P.equip&&P.equip[eq.k],0);
    if(n>0){ owned.push(eq.n+' x'+n); total+=n; } }
  var boxes='', shown=Math.min(total, CFG.EQUIP_BAY_VISUAL_MAX);
  for(i=0;i<shown;i++) boxes += '<span class="pm-eqbox on" title="installed">&#9642;</span>';
  for(i=shown;i<CFG.EQUIP_BAY_VISUAL_MAX;i++) boxes += '<span class="pm-eqbox" title="empty"></span>';
  var overflow = total>CFG.EQUIP_BAY_VISUAL_MAX ? (' <span class="pm-sub">(+'+(total-CFG.EQUIP_BAY_VISUAL_MAX)+' more)</span>') : '';
  var listLine = owned.length ? esc(owned.join(', ')) : '<span class="pm-sub">bay empty - nothing installed</span>';
  return loadoutSlotHtml('equip', 'EQUIPMENT BAY',
    '<div style="letter-spacing:.12em">'+boxes+'</div>'+overflow,
    listLine + (owned.length?' <span class="pm-sub">- installed count, not a slot limit</span>':''),
    S.slotOpen.equip); }

function loadoutHeaderHtml(P){
  var h=H(); var HULLS=h&&h.HULLS, WEAPONS=h&&h.WEAPONS, ENGINES=h&&h.ENGINES, GIZMOS=h&&h.GIZMOS, MANU=h&&h.MANUFACTURERS;
  var hu = (HULLS && P) ? HULLS[P.hullClass||'fighter'] : null;
  var mu = (MANU && P) ? MANU[P.manufacturer||'human'] : null;
  var w  = (WEAPONS && P) ? WEAPONS[P.weaponType||'energy'] : null;
  var en = (ENGINES && P) ? ENGINES[P.engineType||'standard'] : null;
  var hullFilled = hu
    ? '<b style="color:'+COL.VIOLET+'">'+(mu?esc(mu.n)+' ':'')+esc(hu.n)+'</b>'
    : '<span class="pm-sub">(hull registry offline)</span>';
  var hullSub = hu ? ('hull '+Math.round(num(P&&P.maxHp,0))+' - hold '+Math.round(num(P&&P.holdCap,0))+' - speed x'+num(hu.speed,1)+' - role '+esc(hu.role||'')) : '';
  var wpnFilled = w
    ? '<b style="color:'+COL.HEAD+'">'+esc(w.n)+'</b>'
    : '<span class="pm-sub">(weapon registry offline)</span>';
  var wpnSub = w ? ('dmg '+num(w.dmg,0)+(w.homing?' - homing':'')+(w.splash?' - splash '+num(w.splash,0):'')) : '';
  var engFilled = en
    ? '<b style="color:'+COL.HEAD+'">'+esc(en.n)+'</b>'
    : '<span class="pm-sub">(engine registry offline)</span>';
  var engSub = en ? esc(en.desc||'') : '';
  var slots=(P&&P.gizmoSlots)||[], gzUsed=0, gzNames=[], i;
  for(i=0;i<slots.length;i++){ if(slots[i]){ gzUsed++; if(GIZMOS&&GIZMOS[slots[i]]) gzNames.push(GIZMOS[slots[i]].n); } }
  var gzFilled = '<b style="color:'+COL.GOOD+'">'+gzUsed+'/'+slots.length+' mounted</b>';
  var gzSub = gzNames.length ? esc(gzNames.join(', ')) : '<span class="pm-sub">bay empty</span>';
  var hpSlots=(P&&P.weaponSlots)||[], hpUsed=0, hpNames=[];
  for(i=0;i<hpSlots.length;i++){ if(hpSlots[i]){ hpUsed++; if(WEAPONS&&WEAPONS[hpSlots[i]]) hpNames.push(WEAPONS[hpSlots[i]].n); } }
  var hpFilled = '<b style="color:'+COL.GOOD+'">'+hpUsed+'/'+hpSlots.length+' mounted</b>';
  var hpSub = hpNames.length ? esc(hpNames.join(', ')) : '<span class="pm-sub">no extra hardpoints mounted</span>';
  return '<div class="pm-panel"><h4>SHIP LOADOUT</h4>'
    + loadoutSlotHtml('hull',   'HULL (1 fitted)',   hullFilled, hullSub, S.slotOpen.hull)
    + loadoutSlotHtml('weapon', 'WEAPON (1 fitted)', wpnFilled,  wpnSub,  S.slotOpen.weapon)
    + loadoutSlotHtml('hardpoint', 'WEAPON HARDPOINTS (' + hpSlots.length + ' extra)', hpFilled, hpSub, S.slotOpen.hardpoint)
    + loadoutSlotHtml('engine', 'ENGINE (1 fitted)', engFilled, engSub,  S.slotOpen.engine)
    + loadoutSlotHtml('gizmo',  'ELECTRONICS BAY (' + slots.length + ' slots)', gzFilled, gzSub, S.slotOpen.gizmo)
    + GEAR_SLOTS.map(function(def){ return gearSlotHeaderRow(P, def); }).join('')
    + equipBayHtml(P)
    + '<div class="pm-note" style="margin-top:2px">click a slot to open its buy list below - HULL, WEAPON, ENGINE and the seven single-slot fittings each hold exactly one, '
    +   'the ELECTRONICS BAY holds exactly ' + slots.length + ' gizmos and WEAPON HARDPOINTS ' + hpSlots.length + ' extra weapons (both mount/unmount/sell); '
    +   'the EQUIPMENT BAY grid below that is presentational (fills to how many you own), the game itself has no fixed equipment-slot count.</div>'
    + '</div>'; }

function hangarHtml(){
  var p=S.planet, P=player();
  if(!P) return '<div class="pm-note">(no ship telemetry)</div>';
  var h='';
  var hegemonHere = !S.isBase && p && p.hegemon;
  /* SHIP LAYOUT: opens the visual Engineering Bay (engbay.js) - a top-down click-to-mount schematic of the real
     per-hull weapon/gizmo mount points, same gizmo/hardpoint bays this tab already lists below just laid out
     spatially. Same data-act="cmd" dispatch every other button on this tab already uses - no new click-handler
     branch needed in the dispatcher. */
  h += '<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.HEAD+'">SHIP LAYOUT</b>'
    + '<div class="pm-sub">lay out weapons and gizmos on your hull\'s real mount points</div></div>'
    + '<button class="pm-b pm-go" data-act="cmd" data-cmd="engbay">OPEN ENGINEERING BAY</button></div>';
  /* repair */
  var missing=Math.max(0, num(P.maxHp,0)-num(P.hp,0));
  var rcost=Math.round(missing*(S.isBase?CFG.REPAIR_RATE_BASE:CFG.REPAIR_RATE_PLANET));
  h += '<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.HEAD+'">REPAIR</b>'
    + '<div class="pm-sub">hull '+Math.round(num(P.hp,0))+'/'+Math.round(num(P.maxHp,0))
    + (hegemonHere?' - <span style="color:'+COL.BAD+'">Synod control: repair refused here</span>':'')+'</div></div>'
    + '<div style="color:'+COL.AMBER+'">'+(missing>0?('~'+rcost+'c'):'full')+'</div>'
    + '<button class="pm-b pm-go" data-act="cmd" data-cmd="repair"'+((missing<1||hegemonHere)?' disabled':'')+'>FIX HULL</button></div>';
  /* refuel */
  var fneed=Math.max(0, num(P.fuelCap,0)-num(P.fuel,0));
  var gasP=price(p,'gas',true);
  var fcost=isFinite(gasP)?Math.round(Math.ceil(fneed)*gasP):NaN;
  h += '<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.HEAD+'">REFUEL</b>'
    + '<div class="pm-sub">fuel '+Math.round(num(P.fuel,0))+'/'+Math.round(num(P.fuelCap,0))
    + (S.isBase?' - <span style="color:'+COL.DIM+'">gas is a planetside commodity</span>':'')+'</div></div>'
    + '<div style="color:'+COL.AMBER+'">'+(fneed>=1?('~'+fmtC(fcost)):'full')+'</div>'
    + '<button class="pm-b pm-go" data-act="cmd" data-cmd="refuel"'+((fneed<1||S.isBase)?' disabled':'')+'>TOP OFF</button></div>';
  /* upgrades */
  var i;
  for(i=0;i<CFG.UP_KINDS.length;i++){ var u=CFG.UP_KINDS[i];
    var lvl=(P.lvl&&typeof P.lvl[u.k]==='number')?P.lvl[u.k]:1;
    var cost=upCostEst(P,u.k);
    var afford=isFinite(cost)&&num(P.credits,0)>=cost;
    h += '<div class="pm-row"><div class="pm-grow"><b style="color:'+COL.VIOLET+'">'+u.n+'</b> <span class="pm-sub">Lv'+lvl+'</span>'
      + '<div class="pm-sub">'+u.d+'</div></div>'
      + '<div style="color:'+COL.AMBER+'">'+fmtC(cost)+'</div>'
      + '<button class="pm-b pm-vio" data-act="cmd" data-cmd="upgrade '+u.k+'"'+((S.isBase||!afford)?' disabled':'')+'>UPGRADE</button></div>'; }
  h += '<div class="pm-note">'+(S.isBase
      ? 'Hull, weapons and equipment fit through the LOADOUT slots below. Upgrades are planetside; terraforming is on the MARKET tab.'
      : 'Weapons and equipment fit through the LOADOUT slots below.')
    + '</div>';
  h += blackmarketFenceHtml(p);
  // user 2026-07-08: "its not clear you can only upgrade hull at ranger command" - the old hint was a small note
  // buried below the hull rows themselves (only visible once you'd already clicked in expecting to buy). A
  // banner ABOVE the loadout header instead, visible the instant this tab opens, before you've gone looking.
  if(!S.isBase) h += '<div class="pm-note" style="border:1px solid '+COL.AMBER+'55;background:'+COL.AMBER+'14;padding:8px 10px;margin-bottom:8px">'
    + '<b style="color:'+COL.AMBER+'">⌂ HULL SWAPS ARE RANGER-COMMAND-ONLY</b> - this world can fit your WEAPON and EQUIPMENT, '
    + 'but changing HULL CLASS needs a dock at Ranger Command specifically (<b style="color:'+COL.AMBER+'">go base</b>).</div>';
  /* -- Star-Control-2/Space-Rangers-style loadout screen: slot header, then the (unchanged) buy
     lists for whichever slot is expanded. hullSectionHtml/weaponSectionHtml/equipSectionHtml and
     the HOST.runCmd('hull '+key) / ('weapon '+key) / ('install '+key) calls inside them are
     untouched - this only reframes how the player reaches them. -- */
  h += loadoutHeaderHtml(P);
  if(S.slotOpen.hull)   h += '<div class="pm-panel"><h4>HULL - CHOOSE REPLACEMENT</h4>'+hullSectionHtml(P)+'</div>';
  if(S.slotOpen.weapon) h += '<div class="pm-panel"><h4>WEAPON - CHOOSE REPLACEMENT</h4>'+weaponSectionHtml(P)+'</div>';
  if(S.slotOpen.engine) h += '<div class="pm-panel"><h4>ENGINE - CHOOSE DRIVE</h4>'+engineSectionHtml(P)+'</div>';
  GEAR_SLOTS.forEach(function(def){ if(S.slotOpen[def[0]]) h += '<div class="pm-panel"><h4>'+def[1]+' - CHOOSE FITTING</h4>'+simpleSlotSectionHtml(P,def[2],def[3],def[4],def[5],def[6])+'</div>'; });
  if(S.slotOpen.hardpoint) h += '<div class="pm-panel"><h4>WEAPON HARDPOINTS</h4>'+hardpointSectionHtml(P)+'</div>';
  if(S.slotOpen.gizmo)  h += '<div class="pm-panel"><h4>ELECTRONICS BAY</h4>'+gizmoSectionHtml(P)+'</div>';
  if(S.slotOpen.equip)  h += '<div class="pm-panel"><h4>EQUIPMENT - INSTALL MORE</h4>'+equipSectionHtml(P)+'</div>';
  return h; }

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
function missionsHtml(){
  var M=window.MISSIONS, board='(mission system offline)';
  if(M && typeof M.board==='function'){ try{ board=String(M.board()); }catch(e){ board='(mission board glitched)'; } }
  var h='<div class="pm-board">'+board+'</div>';
  var list=null;
  if(M){ try{ if(typeof M.list==='function') list=M.list(); else if(Array.isArray(M.missions)) list=M.missions; }catch(e){ list=null; } }
  if(M && typeof M.accept==='function'){
    if(Array.isArray(list) && list.length){
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
  else h += '<div class="pm-note">Coalition contracts still post on the terminal: <b style="color:'+COL.AMBER+'">contracts</b> - <b style="color:'+COL.AMBER+'">accept &lt;id&gt;</b>.</div>';
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
  var h='', i;
  for(i=0;i<S.log.length;i++){ var e=S.log[i];
    h+='<div class="pm-log"><span class="pm-tm">'+tstr(e.t)+'</span>'+e.h+'</div>'; }
  return h; }

/* ------------------------------------------------ TAB: DEPART */
function departHtml(){
  var nm=(S.planet&&S.planet.name)?S.planet.name:'the berth';
  return '<div class="pm-center">'
    + '<div style="color:'+COL.DIM+'">All accounts settled at '+esc(nm)+'?</div>'
    + '<button class="pm-b pm-big pm-go" data-act="depart">DEPART - RETURN TO SPACE</button>'
    + '<div class="pm-sub">closes this screen and signals launch - [Esc] just closes without launching</div>'
    + '</div>'; }

/* ------------------------------------------------ RENDER DISPATCH */
function renderBody(){
  if(!S.el.body) return;
  var h='';
  if(S.tab==='market') h=marketHtml();
  else if(S.tab==='hangar') h=hangarHtml();
  else if(S.tab==='missions') h=missionsHtml();
  else if(S.tab==='quests') h=questsHtml();
  else if(S.tab==='ground') h=groundHtml();
  else if(S.tab==='log') h=logHtml();
  else if(S.tab==='depart') h=departHtml();
  S.el.body.innerHTML=h; }

function renderAll(){ renderHead(); renderSide(); renderTabs(); renderBody(); }

/* ------------------------------------------------ PUBLIC API */
function init(){ ensureDom(); }

function openMenu(planet,opts){
  if(!ensureDom()) return;
  var P=player();
  S.planet = planet || (P && P.docked) || null;
  S.isBase = !!(opts && opts.isBase);
  S.tab = S.isBase ? 'hangar' : 'market';     /* the base has no commodity market */
  S.tHead=0; S.tBody=0;
  if(!S.open){ S.open=true; S.el.root.style.display='flex'; sfx('dock'); }
  renderAll(); }

function closeMenu(){
  if(!S.open) return;
  S.open=false;
  if(S.el.root) S.el.root.style.display='none';
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

window.PLANETMENU = { init:init, tick:tick, open:openMenu, close:closeMenu, isOpen:isOpen, pushEvent:pushEvent, getLog:getLog, setLog:setLog };
})();
