// gamemod.js — SELF-MODIFICATION: the AGIs get the pen. Per the user (2026-07-06): "your agi should attempt to do
// WHATEVER you speak to it — give it an api so it can change the ast/code of the entire game if possible. give ALL
// the agis the ability to write ast and see what they do with it — but with crash guards; anything that doesn't
// fully break the game is okay."
//
// THE API (three powers, ascending):
//   1. SET    — bounded writes to the game's tunable surface (every numeric CFG key + curated live paths). Clamped
//               to [ORIG/20, ORIG*20] so no single write can zero or explode the sim.
//   2. RULE   — a real AST: {when:event, cond?, then:[actions]} JSON node-trees run by an interpreter (no eval).
//               Events: tick/kill_seen/docked/trade/damaged. Actions: set/say/credit/tint/spawn_gem.
//   3. JS     — the full-power path: arbitrary code compiled via new Function against the SAME game the page runs.
//               Guards: syntax pre-check · brace-required loops · loop-budget injection (2e6 iterations → throw) ·
//               try/catch at every call · one-strike auto-disable on exception.
// CRASH GUARDS (the contract "anything that doesn't fully break the game is okay"):
//   • every mod snapshots what it touches → revert(id)/revert all;   • frame WATCHDOG: 3 consecutive slow frames
//     (>WATCH_MS) with mods active → auto-revert the newest mod and say so;   • window error hook does the same;
//   • MAX_ACTIVE cap (oldest auto-reverted — churn, not accumulation);   • NOTHING persists: mods are session-local
//     by design, so a reload is always a vanilla game. Breaking it permanently is structurally impossible.
// WHO HOLDS THE PEN:
//   • THE PASSENGER: speak an imperative ("make the bullets faster", "tint my ship violet", "double gem value") →
//     deterministic intent→mutation mapping over the tunable index; if the speech sidecar is up and the intent is
//     unmapped, Qwen may emit a JSON program CONSTRAINED to this API (validated; invalid = rejected, never run).
//   • EVERY PILOT: a rate-capped mutation turn — temperament-biased picks from the same API (tints, rules, nudges).
//     HONESTY: v1 pilot choice is a BIASED MENU, not learned — labeled GIVEN in the ledger; wiring mutation choice
//     to N5 fitness (learn which mutations pay) is the follow-up tier.
'use strict';
(function(){
const MODCFG = {
  CLAMP_LO: 0.05, CLAMP_HI: 20,      // numeric writes stay within [orig*LO, orig*HI]
  LOOP_BUDGET: 2e6,                   // injected iteration ceiling for js() loops
  WATCH_MS: 250, WATCH_STRIKES: 3,    // frame watchdog: this slow, this many in a row → revert newest
  MAX_ACTIVE: 24,                     // active-mod cap; oldest reverted first
  RULE_FIRE_CAP: 200,                 // a rule may fire at most this many times (runaway guard)
  PILOT_MUT_PERIOD: 45,               // sim-seconds between pilot mutation turns (whole-fleet cadence)
  PILOT_TINTS: ['#ff2a2a','#8a2be2','#00ff9c','#ffd700','#ff6bd6','#00cfff','#ff7f00'],
  SAFE_NUDGE: 0.15,                   // pilots nudge a safe key by at most ±15%
};
const MODS=[]; let seq=1;             // {id, author, kind, desc, undo:fn|null, disabled, rule?}
const MODLOG=[];
function logmod(line){ MODLOG.push(line); if(MODLOG.length>200) MODLOG.shift();
  if(typeof log==='function') log('events', `<span style="color:#c9a0ff">🜏 ${line.replace(/</g,'&lt;')}</span>`); }

// ---- tunable index: every numeric CFG key + curated live roots ------------------------------------------------
const ORIG={};                        // first-touch originals for clamping + revert
function roots(){ return { CFG:(typeof CFG!=='undefined'?CFG:null), ships:(typeof ships!=='undefined'?ships:null),
  GOODS:(typeof GOODS!=='undefined'?GOODS:null), WEAPONS:(typeof WEAPONS!=='undefined'?WEAPONS:null), HULLS:(typeof HULLS!=='undefined'?HULLS:null) }; }
function resolve(path){               // "CFG.BULLET_SPEED" | "ships.0.maxHp" | "GOODS.2.base"
  const parts=String(path).split('.'); const R=roots(); let obj=R[parts[0]]; if(obj==null) return null;
  for(let i=1;i<parts.length-1;i++){ obj=obj[parts[i]]; if(obj==null) return null; }
  const key=parts[parts.length-1];
  return (obj&&typeof obj==='object'&&key in obj)?{obj,key}:null;
}
function listTunables(){ const out=[]; const R=roots();
  if(R.CFG) for(const k of Object.keys(R.CFG)) if(typeof R.CFG[k]==='number') out.push('CFG.'+k);
  return out; }
function setPath(path,value,author){
  const r=resolve(path); if(!r) return {ok:false,why:'no such path '+path};
  const cur=r.obj[r.key];
  if(typeof cur==='number'&&typeof value==='number'){
    if(!(path in ORIG)) ORIG[path]=cur;
    const o=ORIG[path]; const lo=Math.min(o*MODCFG.CLAMP_LO,o/MODCFG.CLAMP_LO), hi=Math.max(o*MODCFG.CLAMP_HI,o/MODCFG.CLAMP_HI);
    value=Math.max(lo,Math.min(hi,value));                                     // crash guard: bounded write
  } else if(typeof cur!==typeof value) return {ok:false,why:'type mismatch at '+path};
  const prev=cur; r.obj[r.key]=value;
  const id=seq++; MODS.push({id, author, kind:'set', desc:`${path}: ${fmt(prev)} → ${fmt(value)}`, undo:()=>{ const r2=resolve(path); if(r2) r2.obj[r2.key]=prev; }});
  trim(); logmod(`${author} set ${path} ${fmt(prev)}→${fmt(value)}`);
  return {ok:true, id, prev, value, path};
}
function fmt(v){ return typeof v==='number'?(Math.round(v*100)/100):String(v); }
function tint(shipIdx,color,author){ if(typeof ships==='undefined') return {ok:false,why:'no ships'};
  const s=typeof shipIdx==='number'?ships[shipIdx]:shipIdx; if(!s||!s.color) return {ok:false,why:'no such ship'};
  const prev='#'+s.color.getHexString(); try{ s.color.set(color); if(s.mesh&&s.mesh.material&&s.mesh.material.color) s.mesh.material.color.set(color); }catch(e){ return {ok:false,why:'bad color'}; }
  const id=seq++; MODS.push({id,author,kind:'tint',desc:`${s.name} tinted ${color}`,undo:()=>{ try{ s.color.set(prev); if(s.mesh&&s.mesh.material&&s.mesh.material.color) s.mesh.material.color.set(prev); }catch(e){} }});
  trim(); logmod(`${author} tinted ${s.name} ${color}`); return {ok:true,id};
}

// ---- RULE AST: {when, cond:{path,op,value}?, then:[{action,...}]} — interpreted, never eval'd -------------------
const RULE_EVENTS=['tick','kill_seen','docked','trade','damaged'];
function checkCond(c){ if(!c) return true; const r=resolve(c.path); if(!r) return false; const v=r.obj[r.key];
  switch(c.op){ case '>':return v>c.value; case '<':return v<c.value; case '>=':return v>=c.value; case '<=':return v<=c.value; case '==':return v===c.value; default:return false; } }
function runActions(rule){
  for(const a of rule.then||[]){
    try{
      if(a.action==='set') setPath(a.path,a.value,rule.author+'(rule)');
      else if(a.action==='say'&&typeof term==='function') term(`<span style="color:#c9a0ff">◈ ${String(a.text||'').replace(/</g,'&lt;').slice(0,140)}</span> <span style="opacity:.4">— ${rule.author}'s rule</span>`,'');
      else if(a.action==='credit'&&typeof ships!=='undefined'&&ships[0]) ships[0].credits=Math.max(0,ships[0].credits+Math.max(-200,Math.min(200,a.amount|0)));
      else if(a.action==='tint') tint(a.ship|0,a.color,rule.author+'(rule)');
      else if(a.action==='spawn_gem'&&typeof spawnGemAt==='function'&&typeof ships!=='undefined'&&ships[0]) spawnGemAt(ships[0].pos,1);
    }catch(e){ rule.disabled=true; logmod(`rule #${rule.id} (${rule.author}) threw — disabled: ${e.message}`); }
  }
}
function defineRule(spec,author){
  if(!spec||!RULE_EVENTS.includes(spec.when)) return {ok:false,why:'when must be one of '+RULE_EVENTS.join('|')};
  if(!Array.isArray(spec.then)||!spec.then.length) return {ok:false,why:'then must be a non-empty action list'};
  const rule={id:seq++, author, kind:'rule', when:spec.when, cond:spec.cond||null, then:spec.then, fired:0, disabled:false,
    desc:`when ${spec.when}${spec.cond?` if ${spec.cond.path}${spec.cond.op}${spec.cond.value}`:''} → ${spec.then.map(a=>a.action).join(',')}`, undo:null};
  MODS.push(rule); trim(); logmod(`${author} wrote a rule: ${rule.desc}`);
  return {ok:true,id:rule.id};
}
function emit(event){ for(const m of MODS){ if(m.kind!=='rule'||m.disabled||m.when!==event) continue;
  if(m.fired>=MODCFG.RULE_FIRE_CAP){ m.disabled=true; continue; }
  if(checkCond(m.cond)){ m.fired++; runActions(m); } } }

// ---- JS: the full-power path, guarded --------------------------------------------------------------------------
function guardCode(code){
  if(/\b(while|for|do)\b[^{]*[^\s{]\s*(;|$)/m.test(code) && !/\{/.test(code)) return {err:'loops need braces'};
  // inject a loop budget into every braced loop body (crash guard: runaway sync loops throw instead of hanging)
  let n=0; const g=code.replace(/\b(for|while)\s*(\([^)]*\))\s*\{/g, (m,kw,head)=>{ n++; return `${kw} ${head} { if(++__lg>${MODCFG.LOOP_BUDGET}) throw new Error("loop budget");`; });
  return {code:'let __lg=0;\n'+g, loops:n};
}
function runJS(code,author){
  const g=guardCode(String(code||'')); if(g.err) return {ok:false,why:g.err};
  let fn; try{ fn=new Function('G', g.code); }catch(e){ return {ok:false,why:'syntax: '+e.message}; }   // pre-check
  const G={ set:(p,v)=>setPath(p,v,author+'(js)'), read:p=>{ const r=resolve(p); return r?r.obj[r.key]:undefined; },
    rule:s=>defineRule(s,author+'(js)'), tint:(i,c)=>tint(i,c,author+'(js)'), tunables:listTunables,
    ships:(typeof ships!=='undefined')?ships:null, planets:(typeof planets!=='undefined')?planets:null,
    say:t=>{ if(typeof term==='function') term(`<span style="color:#c9a0ff">◈ ${String(t).replace(/</g,'&lt;').slice(0,140)}</span>`,''); } };
  try{ const out=fn(G); const id=seq++; MODS.push({id,author,kind:'js',desc:'js: '+String(code).slice(0,60).replace(/\n/g,' '),undo:null});
    trim(); logmod(`${author} ran js (${g.loops} guarded loops)`); return {ok:true,id,out}; }
  catch(e){ logmod(`${author} js threw: ${e.message} (rejected)`); return {ok:false,why:e.message}; }
}

// ---- revert / watchdog -----------------------------------------------------------------------------------------
function revert(id){ const i=MODS.findIndex(m=>m.id===id); if(i<0) return false; const m=MODS[i];
  if(m.undo){ try{ m.undo(); }catch(e){} } m.disabled=true; MODS.splice(i,1); logmod(`reverted #${id} (${m.desc})`); return true; }
function revertAll(){ for(let i=MODS.length-1;i>=0;i--) revert(MODS[i].id); }
function trim(){ while(MODS.length>MODCFG.MAX_ACTIVE) revert(MODS[0].id); }
let lastT=0, strikes=0;
function tick(dt){
  const now=performance.now();
  if(lastT){ const gap=now-lastT;
    if(gap>MODCFG.WATCH_MS && MODS.length){ if(++strikes>=MODCFG.WATCH_STRIKES){ const m=MODS[MODS.length-1];
      logmod(`WATCHDOG: frames at ${Math.round(gap)}ms — auto-reverting newest mod #${m.id} (${m.desc})`);
      if(typeof paraLine==='function') paraLine('worm','The ship rejected that last change. I have undone it. We do not speak of it.');
      revert(m.id); strikes=0; } }
    else strikes=0; }
  lastT=now;
  emit('tick'); pilotTurn(dt);
}
addEventListener('error', ()=>{ if(MODS.length){ const m=MODS[MODS.length-1]; logmod(`ERROR HOOK: auto-reverting newest mod #${m.id}`); revert(m.id); } });

// ---- THE PASSENGER's intent mapper: speak an imperative → mutation --------------------------------------------
const SCALES=[[/\b(double|twice)\b/,2],[/\b(triple)\b/,3],[/\b(halve|half)\b/,0.5],[/\b(way|much|massively|crazy)\b/,3],[/\b(slightly|little|bit)\b/,1.2]];
const DIRS=[[/\b(faster|quicker|speed|boost|stronger|bigger|more|raise|increase|buff)\b/,1],[/\b(slower|weaker|smaller|less|lower|decrease|nerf)\b/,-1]];
const TARGETS=[ [/\bbullet|shot|laser|fire\b/i,/BULLET|SHOT|FIRE/i], [/\bgem|loot|drop\b/i,/GEM/i], [/\bfuel|gas\b/i,/FUEL|GAS/i],
  [/\bengine|thrust|ship speed|my speed\b/i,/THRUST|SPEED|ACCEL/i], [/\bdamage|guns?\b/i,/DMG|DAMAGE/i], [/\bspawn|enemies|pirates?\b/i,/SPAWN|PIRATE|FOE/i],
  [/\bsense|sensor|radar\b/i,/SENSE/i], [/\btrade|price\b/i,/TRADE|PRICE/i], [/\bhull|health|hp\b/i,/HP|HULL/i] ];
const COLORS={red:'#ff2a2a',green:'#00ff9c',blue:'#2a7bff',violet:'#8a2be2',purple:'#8a2be2',gold:'#ffd700',pink:'#ff6bd6',white:'#ffffff',black:'#111111',orange:'#ff7f00',cyan:'#00cfff'};
function isImperative(t){ return /\b(make|set|change|turn|double|triple|halve|give|tint|paint|spawn|boost|nerf|slow|speed up|increase|decrease|raise|lower|buff|weaken|color|colour|rewrite|mod)\b/i.test(t); }
function intent(text,author){
  const t=' '+String(text).toLowerCase()+' ';
  if(!isImperative(t)) return null;                                   // not an order → normal conversation
  // TINT: "tint/paint/turn my ship violet" / "make the bullets green"
  const cm=Object.keys(COLORS).find(c=>t.includes(' '+c));
  if(cm&&/\b(ship|me|my|hull)\b/.test(t)) { const r=tint(0,COLORS[cm],author); return r.ok?{ok:true,narr:`Your hull drinks the ${cm}. It suits what you are becoming.`}:r; }
  // SCALE a tunable family: direction × magnitude over target-matched CFG keys
  let scale=null; for(const [re,v] of SCALES) if(re.test(t)){ scale=v; break; }
  let dir=0; for(const [re,v] of DIRS) if(re.test(t)){ dir=v; break; }
  if(scale==null) scale = dir>0?1.5:(dir<0?0.66:null);
  if(scale!=null && scale>1 && dir<0) scale=1/scale;
  let keyRe=null, tgtName=null; for(const [re,kre] of TARGETS) if(re.test(t)){ keyRe=kre; tgtName=String(re).slice(3,14); break; }
  if(keyRe && scale!=null){
    const keys=listTunables().filter(p=>keyRe.test(p)); if(!keys.length) return {ok:false,why:'I found no lever matching that in the ship\'s bones.'};
    const changed=[]; for(const p of keys.slice(0,6)){ const r=resolve(p); const res=setPath(p, r.obj[r.key]*scale, author); if(res.ok) changed.push(`${p.replace('CFG.','')} ${fmt(res.prev)}→${fmt(res.value)}`); }
    return changed.length?{ok:true,narr:`Done. I reached into the code and turned ${changed.length} screws: ${changed.join(' · ')}. Reload and it never happened.`}:{ok:false,why:'the levers refused me.'};
  }
  return {ok:false,why:'Say it plainer: name a thing (bullets, gems, engine, fuel, damage, sensors, prices, hull) and a direction (faster, double, half, weaker) — or a color for your ship.'};
}
// Qwen fallback: constrained JSON program (validated; invalid never runs). Called by the wiring when sidecar is up.
function validateProgram(p){ if(!p||typeof p!=='object') return null;
  if(p.kind==='set'&&typeof p.path==='string'&&typeof p.value==='number') return p;
  if(p.kind==='rule'&&p.spec) return p;
  if(p.kind==='js'&&typeof p.code==='string'&&p.code.length<2000) return p;
  return null; }
function runProgram(p,author){ const v=validateProgram(p); if(!v) return {ok:false,why:'invalid program'};
  if(v.kind==='set') return setPath(v.path,v.value,author);
  if(v.kind==='rule') return defineRule(v.spec,author);
  if(v.kind==='js') return runJS(v.code,author);
}

// ---- EVERY PILOT holds the pen: rate-capped, temperament-biased mutation turns (GIVEN menu — labeled) ----------
let mutClock=0, mutIdx=0;
function pilotTurn(dt){
  mutClock+=dt||0; if(mutClock<MODCFG.PILOT_MUT_PERIOD) return; mutClock=0;
  if(typeof ships==='undefined') return;
  const alive=ships.filter(s=>s&&s.alive&&s.role!=='player'); if(!alive.length) return;
  const s=alive[(mutIdx++)%alive.length];
  const temper=(s.temperament||'')+' '+(s.name||'');
  const menace=/executioner|blockade|tribunal|raider|mine layer|hunts/i.test(temper);
  const creepy=/priest|witch|superstitious|unsleeping|half machine|chaplain|reads ruin/i.test(temper);
  const roll=Math.abs((s.name||'x').split('').reduce((a,c)=>a+c.charCodeAt(0),0)+mutIdx)%4;
  if(roll===0){ tint(s, MODCFG.PILOT_TINTS[(mutIdx)%MODCFG.PILOT_TINTS.length], s.name); }
  else if(roll===1&&menace){ defineRule({when:'kill_seen', then:[{action:'say', text:`${s.name}: Another one down. Count stays even as long as you fly straight.`}]}, s.name); }
  else if(roll===1&&creepy){ defineRule({when:'damaged', then:[{action:'say', text:`${s.name}: I heard your hull cry out just now. It has a lovely voice.`}]}, s.name); }
  else if(roll===2){ const keys=listTunables().filter(p=>/GEM|TRADE|SPAWN|SPEED/.test(p)); if(keys.length){ const p=keys[mutIdx%keys.length]; const r=resolve(p); if(r&&typeof r.obj[r.key]==='number'){ const f=1+(((mutIdx%2)?1:-1)*MODCFG.SAFE_NUDGE); setPath(p, r.obj[r.key]*f, s.name); } } }
  else { defineRule({when:'docked', then:[{action:'say', text:`${s.name}: Welcome down. Everything in this port can be bought, including the welcome.`}]}, s.name); }
}

window.GAMEMOD={ MODCFG, set:setPath, rule:defineRule, js:runJS, tint, emit, tick, revert, revertAll,
  intent, runProgram, validateProgram, list:()=>MODS.map(m=>({id:m.id,author:m.author,kind:m.kind,desc:m.desc,fired:m.fired||undefined,disabled:m.disabled||undefined})),
  log:()=>MODLOG.slice(), tunables:listTunables };
})();
