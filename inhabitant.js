// inhabitant.js — THE INHABITANT (INH module) extracted VERBATIM from starfighter.html.
// Contention module-split (SCORECARD_SPEC §"Contention reduction"): a self-contained subsystem loaded as a plain
// <script src> global BEFORE the main game script. Behavior is IDENTICAL to the inline version — same CONFIG
// constants (INH_CFG / SENSE_WHITELIST), same INH_STATE_v1 contract, same I1-I3/I8 machinery.
// Load-order safety: the INH IIFE body is ALL function declarations + closure-var initializers — it reads game
// globals (ships/GOODS/priceOf/CFG/systems/planets/asteroids/T0/nearestPlanet) ONLY from inside those functions,
// which run at call time (INH.tick inside step(), INH.awaken() at boot) — long after the whole page has parsed.
// So defining INH here (before the main script) is correct; the game's INH.* call sites resolve the global at call time.
'use strict';
// ===== THE INHABITANT (INHABITANT_PILLARS.md — I1 + I2 + I8 skeleton) — ONE pilot in the live game that is a real agent =====
// I1 BLACK-BOX PERCEPTION: every observation record is built ONLY through SENSE_WHITELIST (the literal field list below).
// sense() reads exactly four sensor-legal channels: (1) OWN instruments, (2) contacts within its senseR (name/dist/rough
// bearing/team/type — never another ship's hull, cargo or brain), (3) the docked market board (only while inside DOCK_R),
// (4) radio lines actually broadcast within COMM_R of it. No other game-state path feeds INH — auditable: grep this module
// for reads, and INH.senseAudit() verifies every field of the last observation is whitelist-only.
// I2 PERSISTENT MEMORY (contract INH_STATE_v1): episodes (ring EP_CAP) + observation-traced triples (TRIPLE_CAP) + counters,
// persisted to localStorage every SAVE_EVERY sim-s + on exit; INH.export()/INH.import(json) round-trip for tests.
// STARTS EMPTY — no baked knowledge; every entry traces to an observation or a game event involving the Inhabitant.
// I8 AUTONOMY-CADENCE SKELETON: INH.tick runs on its OWN INH_TICK clock inside step() — sensing, episode + triple growth
// are self-initiated, never prodded. Goal attribution is labeled 'GIVEN-role:<mode>' (real drives land in I4).
// I3 LEARNED WORLD MODEL (state v2 adds `model`): price beliefs (EWMA + confidence), danger fields (region of impact),
// route quality (profit traced through its OWN buy/sell episodes) and a predict-then-score calibration ring. LAWS:
// the model starts EMPTY; every entry traces to the Inhabitant's OWN episodes/observations; confidence DECAYS per
// sim-minute (stale beliefs fade); predictions are recorded BEFORE the observation that scores them (no hindsight —
// enforced by a strict min-age guard + predT<t in every calibration record).
// NOTE for the BENCH LANE (inh_memory_test.js): the localStorage KEY stays 'INH_STATE_v1' — the key is a NAME; the
// payload's `version` field is the contract. v2 = v1 + `model`; a v1 payload ({version:1,...}) upgrades in place on
// import/load (empty model added, version bumped to 2, no v1 data lost).
const INH_CFG={ INH_TICK:0.5, SAVE_EVERY:15, EP_CAP:400, TRIPLE_CAP:600, CRED_SAMPLES:20, CONTACT_CAP:24,
  BEARING_STEP_DEG:15, DMG_EP_CD:2, PRICE_OBS_CD:10, CONF_START:0.3, CONF_STEP:0.15, RADIO_BUF_CAP:8, TEXT_CLIP:90,
  LS_KEY:'INH_STATE_v1',
  // ---- I3 world-model tunables (named CONFIG — no magic numbers in the learning logic) ----
  PRICE_EWMA:0.3,        // belief <- belief + a*(obs - belief): how fast a price belief tracks fresh observations
  CONF_GAIN:0.25,        // conf <- conf + (1-conf)*CONF_GAIN per sample (asymptotic toward 1; first sample = CONF_GAIN)
  CONF_DECAY:0.02,       // price-belief confidence lost per sim-MINUTE with no fresh observation (stale beliefs fade)
  DANGER_BUMP:1,         // danger score added per damaged-episode at the region of impact
  DANGER_AMT_W:0.05,     // extra danger per hull point actually lost (big hits teach more)
  DANGER_DECAY:0.1,      // danger score lost per sim-minute (regions cool off; <=0 entries pruned)
  DANGER_SECTOR_U:105,   // coarse sector edge (u) — regionKey = sysIdx:floor(x/U),floor(z/U) (half CFG.SYSTEM_R)
  MODEL_SWEEP_S:5,       // in-place decay sweep cadence: decayed conf/danger are WRITTEN into state, not just derived
  CAL_CAP:100,           // calibration ring: last N {t,predT,planet,good,pred,actual} prediction scores
  PRED_TTL_S:180 };      // a forecast older than this never scores (an aborted approach is not a fresh prediction)
const SENSE_WHITELIST=['hull','fuel','pos','vel','credits','mode','system',   // own-ship instruments (star chart is GIVEN)
  'name','dist','bearing','team','type',                                      // sensor contacts — what a sensor would show
  'planet','good','price',                                                    // the market board, readable only while docked
  'from','text'];                                                             // radio lines actually broadcast within range
const INH=(()=>{
  let ship=null, ST=null, loadedPrev=false, priorAge=0;
  let acc=0, saveAcc=0, lastObs=null, sawSet=new Set(), prevSystem=null;
  let dmgAcc=0, dmgSrc=null, dmgEpT=-1e9, priceObsT=-1e9, lastDockName=null, radioBuf=[];
  let sweepAcc=0, pendPred={}, lastPredTarget=null;   // I3: decay-sweep clock + pending forecasts (closure-only — never persisted, so hindsight can't be replayed in)
  const r1=x=>Math.round(x*10)/10;
  function freshModel(){ return { prices:{}, danger:{}, routes:{}, calibration:[] }; }   // I3 LAW: the model starts EMPTY — every entry must trace to its OWN observations/episodes
  function freshState(name){ return { version:2, pilot:name, born:r1(T0), episodes:[], triples:[], counters:{ ticks:0, credits_seen:[], damage_taken:0 }, model:freshModel() }; }
  function pickWL(rec){ const out={}; for(const k of SENSE_WHITELIST) if(Object.prototype.hasOwnProperty.call(rec,k)) out[k]=rec[k]; return out; }
  function bearingOf(from,to){ const deg=Math.atan2(to.z-from.z,to.x-from.x)*180/Math.PI; return Math.round(deg/INH_CFG.BEARING_STEP_DEG)*INH_CFG.BEARING_STEP_DEG; }   // ROUGH heading only (quantized)
  function systemOf(pos){ let best=null,bd=1e9; for(const sy of systems){ const d=pos.distanceTo(sy.center); if(d<bd){bd=d;best=sy;} } return best?best.name:null; }
  function senseMarket(p){ return GOODS.map(g=>pickWL({ planet:p.name, good:g.k, price:Math.round(priceOf(p,g.k)) })); }
  function sense(){ if(!ship||!ship.alive) return null; const me=ship, sr=me.senseR||CFG.SENSE_R;
    const own=pickWL({ hull:r1(me.hp), fuel:r1(me.fuel), pos:[r1(me.pos.x),r1(me.pos.y),r1(me.pos.z)], vel:[r1(me.vel.x),r1(me.vel.y),r1(me.vel.z)], credits:Math.round(me.credits), mode:me.mode, system:systemOf(me.pos) });
    const contacts=[];
    for(const o of ships){ if(o===me||!o.alive) continue; const d=me.pos.distanceTo(o.pos); if(d<sr) contacts.push(pickWL({ name:o.name, dist:Math.round(d), bearing:bearingOf(me.pos,o.pos), team:o.team, type:'ship' })); }
    for(const p of planets){ const d=me.pos.distanceTo(p.pos); if(d<sr) contacts.push(pickWL({ name:p.name, dist:Math.round(d), bearing:bearingOf(me.pos,p.pos), type:'planet' })); }
    for(const a of asteroids){ const d=me.pos.distanceTo(a.pos); if(d<sr) contacts.push(pickWL({ name:'asteroid', dist:Math.round(d), bearing:bearingOf(me.pos,a.pos), type:'asteroid' })); }
    contacts.sort((x,y)=>x.dist-y.dist); if(contacts.length>INH_CFG.CONTACT_CAP) contacts.length=INH_CFG.CONTACT_CAP;
    const np=nearestPlanet(me.pos), docked=!!(np&&me.pos.distanceTo(np.pos)<=CFG.DOCK_R);
    return { t:r1(T0), own, contacts, market:docked?senseMarket(np):null, radio:radioBuf.length?radioBuf.splice(0):null }; }
  function pushEp(kind,data,goal){ if(!ST) return; ST.episodes.push({ t:r1(T0), kind, data:data||{}, goal:goal||('GIVEN-role:'+(ship?ship.mode:'?')) });
    if(ST.episodes.length>INH_CFG.EP_CAP) ST.episodes.splice(0,ST.episodes.length-INH_CFG.EP_CAP); }   // ring: oldest dropped
  function trimTriples(){ if(ST.triples.length>INH_CFG.TRIPLE_CAP) ST.triples.splice(0,ST.triples.length-INH_CFG.TRIPLE_CAP); }
  function upsert(s,r,o,src){ const ex=ST.triples.find(t=>t.s===s&&t.r===r&&t.o===o);
    if(ex){ ex.conf=Math.min(1,+(ex.conf+INH_CFG.CONF_STEP).toFixed(2)); ex.t=r1(T0); return ex; }   // repeat observation → conf grows
    const tr={ s, r, o, conf:INH_CFG.CONF_START, src:src||'episode', t:r1(T0) }; ST.triples.push(tr); trimTriples(); return tr; }
  function upsertPrice(planet,good,price){ const o=good+'@'+price, ex=ST.triples.find(t=>t.s===planet&&t.r==='sells'&&String(t.o).indexOf(good+'@')===0);
    if(ex){ if(ex.o===o) ex.conf=Math.min(1,+(ex.conf+INH_CFG.CONF_STEP).toFixed(2)); else { ex.o=o; ex.conf=INH_CFG.CONF_START; } ex.t=r1(T0); return; }   // price moved → re-learn from scratch
    ST.triples.push({ s:planet, r:'sells', o, conf:INH_CFG.CONF_START, src:'episode', t:r1(T0) }); trimTriples(); }
  // ---- I3 LEARNED WORLD MODEL — every writer below is fed ONLY by the Inhabitant's own senses/episodes ----
  function sysIdxOf(pos){ let bi=-1,bd=1e9; for(let i=0;i<systems.length;i++){ const d=pos.distanceTo(systems[i].center); if(d<bd){bd=d;bi=i;} } return bi; }
  function regionKeyOf(pos){ return sysIdxOf(pos)+':'+Math.floor(pos.x/INH_CFG.DANGER_SECTOR_U)+','+Math.floor(pos.z/INH_CFG.DANGER_SECTOR_U); }   // system index + coarse sector hash
  function decayModel(dtMin){ const M=ST.model;   // stale beliefs FADE — decayed values are WRITTEN into state (export-visible, not read-time cosmetics)
    for(const p in M.prices) for(const g in M.prices[p]){ const e=M.prices[p][g]; e.conf=Math.max(0,+(e.conf-INH_CFG.CONF_DECAY*dtMin).toFixed(4)); }
    for(const k in M.danger){ const d=M.danger[k]; d.score=Math.max(0,+(d.score-INH_CFG.DANGER_DECAY*dtMin).toFixed(4)); if(d.score<=0) delete M.danger[k]; } }
  function learnPrice(planet,good,price){ const M=ST.model.prices, P=M[planet]||(M[planet]={}), e=P[good];   // its OWN docked-market reading
    if(!e){ P[good]={ belief:price, conf:INH_CFG.CONF_GAIN, lastT:r1(T0), samples:1 }; return; }
    e.belief=+(e.belief+INH_CFG.PRICE_EWMA*(price-e.belief)).toFixed(2);
    e.conf=Math.min(1,+(e.conf+(1-e.conf)*INH_CFG.CONF_GAIN).toFixed(4)); e.lastT=r1(T0); e.samples++; }
  function makePreds(){ const tp=ship.tradePlan, p=(tp&&tp.planet)?tp.planet.name:null;   // its OWN autopilot intent (its mind, not a world read)
    if(!p){ lastPredTarget=null; return; } if(p===lastPredTarget) return; lastPredTarget=p;
    const P=ST.model.prices[p]; if(!P) return; const preds={};
    for(const g in P) if(P[g].conf>0) preds[g]=P[g].belief;             // forecast only goods it holds live beliefs on
    if(Object.keys(preds).length) pendPred[p]={ tRaw:T0, t:r1(T0), preds }; }   // written NOW, at approach START — before any observation of that board
  function scorePreds(planet,good,actual){ const pp=pendPred[planet]; if(!pp) return;
    if(T0-pp.tRaw>INH_CFG.PRED_TTL_S){ delete pendPred[planet]; return; }        // expired forecast (aborted approach) never scores
    if(T0-pp.tRaw<INH_CFG.INH_TICK) return;                                      // NO HINDSIGHT: a forecast scores no earlier than the next tick (predT<t strict)
    if(!Object.prototype.hasOwnProperty.call(pp.preds,good)) return;
    const cal=ST.model.calibration; cal.push({ t:r1(T0), predT:pp.t, planet, good, pred:pp.preds[good], actual });
    if(cal.length>INH_CFG.CAL_CAP) cal.splice(0,cal.length-INH_CFG.CAL_CAP);     // ring CAL_CAP
    delete pp.preds[good]; if(!Object.keys(pp.preds).length) delete pendPred[planet]; }
  function learnRoute(sellPlanet,good,revenue){   // route quality = profit vs the buy it REMEMBERS — traced through its OWN episode ring, not game internals
    for(let i=ST.episodes.length-1;i>=0;i--){ const e=ST.episodes[i]; if(e.kind!=='traded'||e.data.good!==good) continue;
      if(e.data.dir==='sell') return;                                            // a newer sell already consumed that buy — no double-count
      if(e.data.dir==='buy'){ const profit=Math.round(revenue-e.data.amt*e.data.price);   // cost = its own board reading at buy time × units bought
        const key=e.data.planet+'->'+sellPlanet, R=ST.model.routes, rt=R[key]||(R[key]={avg:0,samples:0,lastT:0});
        rt.avg=+(((rt.avg*rt.samples)+profit)/(rt.samples+1)).toFixed(1); rt.samples++; rt.lastT=r1(T0); return; } } }
  function doTick(){ ST.counters.ticks++; if(!ship||!ship.alive) return;
    const obs=sense(); lastObs=obs;
    ST.counters.credits_seen.push(obs.own.credits); if(ST.counters.credits_seen.length>INH_CFG.CRED_SAMPLES) ST.counters.credits_seen.splice(0,ST.counters.credits_seen.length-INH_CFG.CRED_SAMPLES);
    for(const c of obs.contacts){ if(c.type==='ship'&&!sawSet.has(c.name)){ sawSet.add(c.name); pushEp('saw',{ name:c.name, team:c.team, dist:c.dist }); } }   // first contact per ship per session
    if(obs.own.system){ if(prevSystem&&obs.own.system!==prevSystem) pushEp('moved_system',{ from:prevSystem, to:obs.own.system }); prevSystem=obs.own.system; }
    if(obs.market&&T0-priceObsT>=INH_CFG.PRICE_OBS_CD){ for(const m of obs.market){ scorePreds(m.planet,m.good,m.price); upsertPrice(m.planet,m.good,m.price); learnPrice(m.planet,m.good,m.price); } priceObsT=T0; }   // I3: pending forecast scores FIRST, then the belief updates
    makePreds(); }   // I3 predict-then-score: runs AFTER this tick's observations — a new approach forecasts for the NEXT board reading
  function tick(dt){ if(!ship||!ST) return; acc+=dt; saveAcc+=dt; sweepAcc+=dt;
    while(acc>=INH_CFG.INH_TICK){ acc-=INH_CFG.INH_TICK; doTick(); }
    if(sweepAcc>=INH_CFG.MODEL_SWEEP_S){ decayModel(sweepAcc/60); sweepAcc=0; }   // I3: stale beliefs fade with sim time
    if(saveAcc>=INH_CFG.SAVE_EVERY){ saveAcc=0; save(); } }
  // ---- game events involving the Inhabitant (each call site passes only what that event legitimately exposes to it) ----
  function onDamaged(srcName,amount,fatal){ if(!ST) return; const amt=Math.max(0,amount||0);
    ST.counters.damage_taken=Math.round((ST.counters.damage_taken+amt)*10)/10;
    if(srcName) upsert(srcName,'damaged',ST.pilot,'episode');   // learned fact: WHO/what hurts me
    if(ship&&ship.pos){ const k=regionKeyOf(ship.pos), D=ST.model.danger, d=D[k]||(D[k]={score:0,lastT:0});   // I3: danger learned at the region of IMPACT — its own hull, its own position
      d.score=+(d.score+INH_CFG.DANGER_BUMP+amt*INH_CFG.DANGER_AMT_W).toFixed(3); d.lastT=r1(T0); }
    dmgAcc+=amt; if(srcName) dmgSrc=srcName;
    if(fatal||T0-dmgEpT>=INH_CFG.DMG_EP_CD){ pushEp('damaged',{ src:dmgSrc||'unknown', amount:Math.round(dmgAcc*10)/10, fatal:!!fatal }); dmgEpT=T0; dmgAcc=0; dmgSrc=null; } }
  function onKill(victim){ if(!ST||!victim) return; pushEp('destroyed_foe',{ name:victim.name, team:victim.team }); }
  function onDocked(p){ if(!ST||!p) return; pushEp('docked',{ planet:p.name }); upsert(ST.pilot,'docked_at',p.name,'episode');   // docking history
    if(lastDockName!==p.name||T0-priceObsT>=INH_CFG.PRICE_OBS_CD){ for(const m of senseMarket(p)){ scorePreds(m.planet,m.good,m.price); upsertPrice(m.planet,m.good,m.price); learnPrice(m.planet,m.good,m.price); } priceObsT=T0; }   // I3: score-then-learn on its own board reading
    lastDockName=p.name; }
  function onTraded(dir,p,good,amt){ if(!ST||!p) return; const price=Math.round(priceOf(p,good));
    if(dir==='sell') learnRoute(p.name,good,amt);   // I3: for a sell, amt IS the revenue (see doTrade call site) — profit traced through its own remembered buy episode BEFORE this sell is recorded
    pushEp('traded',{ dir, planet:p.name, good, amt, price });
    scorePreds(p.name,good,price); upsertPrice(p.name,good,price); learnPrice(p.name,good,price); }   // price observation at its OWN trade (forecast scores first)
  function onRefueled(pName,gas){ if(!ST) return; pushEp('refueled',{ planet:pName, gas }); }
  function onRadio(sender,msg,kind,data){ if(!ST||!ship||!ship.alive||!sender||sender===ship) return;
    if(sender.pos.distanceTo(ship.pos)>CFG.COMM_R) return;   // out of radio range → it never heard this
    const rec=pickWL({ from:sender.name, text:String(msg).slice(0,INH_CFG.TEXT_CLIP) });
    radioBuf.push(rec); if(radioBuf.length>INH_CFG.RADIO_BUF_CAP) radioBuf.shift();
    pushEp('heard',{ from:rec.from, text:rec.text });
    if(kind==='help'&&data&&data.name) upsert(data.name,'attacked',sender.name,'radio'); }   // radio-sourced fact, labeled src:'radio'
  // ---- persistence (contract INH_STATE_v1 — JSON-serializable round-trip) ----
  function exportState(){ return JSON.stringify(ST); }
  function importState(j){ const o=(typeof j==='string')?JSON.parse(j):j;
    if(!o||(o.version!==1&&o.version!==2)||!Array.isArray(o.episodes)||!Array.isArray(o.triples)||!o.counters) throw new Error('INH.import: not a v1/v2 INH_STATE');
    const m=(o.version===2&&o.model&&typeof o.model==='object')?o.model:freshModel();   // I3 MIGRATION: a v1 payload ({version:1,...}) upgrades IN PLACE — empty model added, all v1 data kept; the model must be re-learned from life, never baked
    ST={ version:2, pilot:String(o.pilot||(ship?ship.name:'?')), born:+o.born||0, episodes:o.episodes, triples:o.triples,
      counters:{ ticks:+o.counters.ticks||0, credits_seen:Array.isArray(o.counters.credits_seen)?o.counters.credits_seen:[], damage_taken:+o.counters.damage_taken||0 },
      model:{ prices:(m.prices&&typeof m.prices==='object')?m.prices:{}, danger:(m.danger&&typeof m.danger==='object')?m.danger:{},
        routes:(m.routes&&typeof m.routes==='object')?m.routes:{}, calibration:Array.isArray(m.calibration)?m.calibration:[] } };
    loadedPrev=false; priorAge=0;   // I9 round-trip FIX: an explicit import is THIS session's state, not a prior-session claim (awaken()'s load path sets these)
    pendPred={}; lastPredTarget=null; sweepAcc=0;   // I3: an imported mind carries no in-flight forecasts
    return true; }
  function save(){ if(!ST) return false; try{ localStorage.setItem(INH_CFG.LS_KEY, exportState()); return true; }catch(e){ return false; } }
  function load(){ try{ const j=localStorage.getItem(INH_CFG.LS_KEY); if(!j) return false; importState(j); return true; }catch(e){ return false; } }
  function wipe(){ ST=freshState(ship?ship.name:'?'); sawSet=new Set(); prevSystem=null; lastObs=null; dmgAcc=0; dmgSrc=null; dmgEpT=-1e9; priceObsT=-1e9; lastDockName=null; radioBuf=[];
    loadedPrev=false; priorAge=0;   // I9 round-trip FIX (puppet audit wave 1): a wiped mind must not report a prior life
    pendPred={}; lastPredTarget=null; sweepAcc=0;   // I3: wipe kills the model AND any in-flight forecasts
    try{ localStorage.removeItem(INH_CFG.LS_KEY); }catch(e){} }   // ablation/removal hook for the I2 puppet audit
  function awaken(){ ship=null; for(const s of ships){ if(s.alive&&s.team==='squad'&&s.role!=='player'){ ship=s; break; } }   // deterministic: FIRST alive non-player squad ship at boot
    if(!ship){ console.warn('INHABITANT: no eligible squad pilot at boot'); return null; }
    ship.inhabitant=true;
    if(load()&&ST.pilot===ship.name){ loadedPrev=true; priorAge=+(ST.counters.ticks*INH_CFG.INH_TICK).toFixed(1); }
    else { ST=freshState(ship.name); loadedPrev=false; priorAge=0; }
    console.log('INHABITANT: '+ship.name+' is awake'+(loadedPrev?(' — memory restored: prior age '+priorAge+'s · '+ST.episodes.length+' episodes · '+ST.triples.length+' triples'):' — fresh mind (no prior state)'));
    return ship; }
  function senseNow(){ const o=sense(); if(o) lastObs=o; return o; }   // manual sense (tests / hidden-tab pumping)
  function senseAudit(){ const bad=[]; const chk=(rec,path)=>{ if(rec==null||typeof rec!=='object') return;
      if(Array.isArray(rec)){ rec.forEach((x,i)=>chk(x,path+'['+i+']')); return; }
      for(const k in rec){ if(SENSE_WHITELIST.indexOf(k)<0) bad.push(path+'.'+k); else chk(rec[k],path+'.'+k); } };
    if(lastObs){ chk(lastObs.own,'own'); chk(lastObs.contacts,'contacts'); chk(lastObs.market,'market'); chk(lastObs.radio,'radio'); }
    return { whitelist:SENSE_WHITELIST.slice(), violations:bad, ok:bad.length===0 }; }
  function age(){ return ST?+(ST.counters.ticks*INH_CFG.INH_TICK).toFixed(1):0; }   // sim seconds, accumulates across sessions
  addEventListener('pagehide',()=>save()); addEventListener('beforeunload',()=>save());   // persist on exit
  return { awaken, tick, save, load, wipe, senseNow, senseAudit, age,
    onDamaged, onKill, onDocked, onTraded, onRefueled, onRadio,
    export:exportState, import:importState,
    get ship(){ return ship; }, get state(){ return ST; }, get lastObs(){ return lastObs; },
    loadedFromPrevious:()=>loadedPrev, priorAge:()=>priorAge };
})();
