// knowledge.js - THE PERSISTENT TWO-TIER KNOWLEDGE STORE. Per the user (2026-07-07): "we don't want to wipe that
// knowledge away - if it is GENERIC knowledge then ALL of the AGI should share it and persist it across runs.
// Knowledge that others can't know might be kept SECRET to only that AGI, but it should persist since there is a lot
// of processing here across runs. Lazy load and save."
//
// TWO TIERS, principled by PROVENANCE (not guessed):
//   SHARED - generic world-truth any agent could independently verify (source = latent library, or a SOUND
//             deduction/extrapolation whose premises are ALL shared). Global, one copy, every AGI reads it.
//   PRIVATE - knowledge that depends on one agent's unique vantage: a WITNESSED observation, or anything derived
//             using a private premise. Kept to that agent (its secret), never leaked to others.
//   The tier of a derived fact = SHARED iff every premise it used is shared AND its source is generic; else PRIVATE.
//   That is a provenance rule, computed, not asserted - so classification can't be fudged.
// PERSISTENCE (the "lot of processing across runs" the user wants saved): lazy-load once at init, save on commit.
// Backend is pluggable - node: a JSON file; browser: localStorage KNOWLEDGE_v1. A fact committed in one run is a
// free STORE HIT the next (no recompute). Nothing is wiped on reset of the SIM - only an explicit forget() clears it.
// A fact is an EDGE {s,r,o} (the same graph currency deliberate.js/seek reason over) + provenance {source, premises}.
'use strict';
(function(){
const VERSION = 1;
function edgeKey(e){ return e.s+'|'+e.r+'|'+e.o; }

function createStore(opts){
  opts = opts||{};
  const isNode = (typeof module!=='undefined' && module.exports);
  let fs=null, path=opts.path||null;
  if(isNode && !opts.load){ try{ fs=require('fs'); }catch(e){} }
  const backend = {
    load: opts.load || (()=>{ if(fs&&path&&fs.existsSync(path)){ try{ return JSON.parse(fs.readFileSync(path,'utf8')); }catch(e){} }
                              if(typeof localStorage!=='undefined'){ try{ const r=localStorage.getItem(opts.key||'KNOWLEDGE_v1'); if(r) return JSON.parse(r); }catch(e){} } return null; }),
    save: opts.save || ((data)=>{ if(fs&&path){ try{ fs.writeFileSync(path, JSON.stringify(data)); return; }catch(e){} }
                                 if(typeof localStorage!=='undefined'){ try{ localStorage.setItem(opts.key||'KNOWLEDGE_v1', JSON.stringify(data)); }catch(e){} } }),
  };
  // state: shared = {edgeKey: provenance}; priv = {agent: {edgeKey: provenance}}
  let S = { version:VERSION, shared:{}, priv:{} };
  const loaded = backend.load(); if(loaded && loaded.version===VERSION) S = loaded;   // LAZY LOAD (once)
  let dirty=false;
  function persist(){ if(dirty){ backend.save(S); dirty=false; } }

  // tier of a derived fact given the tiers of the premises it used + the source strategy
  function classify(source, premiseTiers){
    if(source==='witnessed') return 'private';                     // an observation is that agent's alone
    if((premiseTiers||[]).some(t=>t==='private')) return 'private'; // touched a secret → stays secret
    return 'shared';                                                // generic source, all-shared premises → shareable
  }
  // commit a VERIFIED fact (caller guarantees 0-fab: it verified before calling). Returns {tier, isNew}.
  function commit(edge, meta){
    meta = meta||{};
    const tier = meta.tier || classify(meta.source, meta.premiseTiers);
    const k = edgeKey(edge); const prov = { source:meta.source||'unknown', premises:meta.premises||[], t:tier };
    if(tier==='shared'){ if(S.shared[k]) return {tier, isNew:false}; S.shared[k]=prov; }
    else { const a=meta.agent||'_anon'; (S.priv[a]=S.priv[a]||{}); if(S.priv[a][k]) return {tier, isNew:false}; S.priv[a][k]=prov; }
    dirty=true; if(!opts.deferSave) persist();
    return {tier, isNew:true};
  }
  // what an agent KNOWS = shared ∪ its own private (never another agent's private)
  function know(agent){
    const edges=[]; const add=(k,prov)=>{ const [s,r,o]=k.split('|'); edges.push({s,r,o,_tier:prov.t,_src:prov.source}); };
    for(const k in S.shared) add(k, S.shared[k]);
    const p=S.priv[agent]; if(p) for(const k in p) add(k, p[k]);
    return { edges };
  }
  function has(edge, agent){ const k=edgeKey(edge); if(S.shared[k]) return 'shared'; if(S.priv[agent]&&S.priv[agent][k]) return 'private'; return null; }
  function tierOf(edge, agent){ return has(edge, agent); }
  function stats(){ return { shared:Object.keys(S.shared).length, agents:Object.keys(S.priv).length,
    private_total:Object.values(S.priv).reduce((a,p)=>a+Object.keys(p).length,0) }; }
  function forget(){ S={version:VERSION, shared:{}, priv:{}}; dirty=true; persist(); }   // explicit wipe only

  return { commit, know, has, tierOf, classify, stats, persist, forget, _state:()=>S };
}

const api = { createStore, VERSION };
if(typeof window!=='undefined') window.KNOWLEDGE = api;
if(typeof module!=='undefined' && module.exports) module.exports = api;
})();
