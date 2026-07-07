// acquire.js — THE MULTI-STRATEGY ACQUISITION CASCADE. Per the user (2026-07-07): "in the how/what/why part if it
// abstains it should ALSO continue to try to (a) load it from latent knowledge (b) extrapolate with geometry, modal
// logic, X/Y/Z — whatever works to make the chain, such that it is constantly growing."
//
// On a deliberation GAP, the cascade tries strategies IN ORDER until one yields VERIFIED knowledge that closes it:
//   STORE    — is it already known? (a free hit from the persistent store — no recompute across runs)
//   LATENT   — pull it from the latent library (generic knowledge → SHARED tier)
//   MODAL    — sound deduction: (goal isa TYPE) + (TYPE serves V)  ⊢  (goal serves V)  [premise-tiered]
//   GEOMETRIC— extrapolate by structure: a node whose known neighborhood matches a solved one likely shares its edges
//   REVEAL   — go look at the world directly (a WITNESSED observation → PRIVATE tier)
// EVERY proposal is a CANDIDATE that must be VERIFIED before it commits (0-fabrication — the whole project's law:
// propose freely, verify against the world, commit or abstain; a strategy that lies produces nothing). Verified
// facts are written to the persistent two-tier store (knowledge.js), tier-classified by provenance, and folded into
// the working graph — so the graph, and the mind, are CONSTANTLY GROWING and never recomputed. window.ACQUIRE + node.
'use strict';
(function(){
const D = (typeof require!=='undefined') ? require('./deliberate.js') : window.DELIBERATE;
const CFG = { ROUNDS: 8 };

const has = (g,e)=>g.edges.some(x=>x.s===e.s&&x.r===e.r&&x.o===e.o);

// ---- the strategies: each PROPOSES candidate edges {edge, source, premises} for a named gap ------------------
function proposeLatent(gap, K, decision, world, ctx){
  // the latent oracle knows GENERIC world-truth (in the bench: world edges tagged generic). For a justify gap it
  // offers the goal's serves-chain; for options it offers the state's actions. All get verified downstream.
  const out=[]; const oracle=ctx.latent; if(!oracle) return out;
  if(gap==='justify'){ let cur=decision.goal, guard=0; while(guard++<8){ const e=(oracle.edges||[]).find(x=>x.s===cur&&x.r==='serves'); if(!e) break; out.push({edge:e, source:'latent', premises:[]}); cur=e.o; } }
  if(gap==='options'){ for(const e of (oracle.edges||[])) if(e.s===decision.state && e.r==='action') out.push({edge:e, source:'latent', premises:[]}); }
  return out;
}
function proposeModal(gap, K, decision, world, ctx){
  // SOUND DEDUCTION over what's KNOWN: if K says (goal isa TYPE) and (TYPE serves V), derive (goal serves V).
  if(gap!=='justify') return [];
  const isa=K.edges.filter(e=>e.s===decision.goal && e.r==='isa');
  const out=[];
  for(const t of isa){ for(const rule of K.edges.filter(e=>e.s===t.o && e.r==='serves')){
    out.push({ edge:{s:decision.goal, r:'serves', o:rule.o}, source:'modal', premises:[t, rule] }); } }
  return out;
}
function proposeGeometric(gap, K, decision, world, ctx){
  // EXTRAPOLATE by structure: find a node M (fully solved, reaches goal) structurally analogous to the state, and
  // propose the state inherits M's first action toward the goal. A proposal — verified against the world downstream.
  if(gap!=='reach') return [];
  const idx=D.buildIndex(K); const out=[];
  // any known node that reaches the goal in K: propose an action edge from state to that node's predecessor-of-goal
  for(const m of new Set(K.edges.map(e=>e.s))){ if(m===decision.state) continue;
    const p=D.shortestPath(idx, m, decision.goal); if(p&&p.length){ out.push({edge:{s:decision.state, r:'action', o:m}, source:'geometric', premises:[]}); } }
  return out.slice(0,6);
}
function proposeReveal(gap, K, decision, world, ctx){
  // GO LOOK: reveal from the world directly. A witnessed observation — PRIVATE knowledge.
  const wIdx=D.buildIndex(world); const out=[];
  if(gap==='reach'||gap==='order'){
    const prev={[decision.state]:'root'}; let ring=[decision.state], hit=null; const seen=new Set(ring);
    while(ring.length&&!hit){ const nx=[]; for(const u of ring){ for(const e of (wIdx.actionOut[u]||[])){ if(!seen.has(e.o)){ seen.add(e.o); prev[e.o]=e; nx.push(e.o); if(e.o===decision.goal){hit=e.o;break;} } } if(hit)break; } ring=nx; }
    if(hit){ const rev=[]; let c=hit; while(prev[c]&&prev[c]!=='root'){ rev.push(prev[c]); c=prev[c].s; } rev.reverse(); for(const e of rev) out.push({edge:e, source:'witnessed', premises:[]}); }
  } else if(gap==='justify'){ let cur=decision.goal,guard=0; while(guard++<8){ const e=(world.edges).find(x=>x.s===cur&&x.r==='serves'); if(!e)break; out.push({edge:e, source:'witnessed', premises:[]}); cur=e.o; } }
  else if(gap==='options'){ for(const e of (wIdx.actionOut[decision.state]||[])) out.push({edge:e, source:'witnessed', premises:[]}); }
  return out;
}
const STRATEGIES = { latent:proposeLatent, modal:proposeModal, geometric:proposeGeometric, reveal:proposeReveal };
const DEFAULT_ORDER = ['latent','modal','geometric','reveal'];

// verify a candidate against the world (0-fab arbiter). MODAL deductions are ALSO checked — a sound deduction over
// true premises yields a true fact, which the world confirms; anything else is rejected.
function verify(edge, world){ return has(world, edge); }

function acquire(agent, decision, world, store, opts){
  opts=opts||{}; const order=opts.strategies||DEFAULT_ORDER; const rounds=opts.rounds||CFG.ROUNDS;
  const ctx={ latent: opts.latent||null };
  const trace=[]; let committed=0, derivations=0;
  for(let r=0;r<=rounds;r++){
    const K=store.know(agent);                                   // STORE = what I already know (persisted, no recompute)
    if(opts.seed) for(const e of opts.seed.edges) if(!has(K,e)) K.edges.push(e);
    const chain=D.deliberate(K, decision, {order:'geometry'});
    trace.push({ round:r, agreement:chain.convergence.agreement, gap:chain.convergence.gap, committed });
    if(chain.convergence.converged) return { converged:true, chain, committed, derivations, trace, store_stats:store.stats() };
    const gap=chain.convergence.gap; let did=false;
    for(const name of order){
      const cands=STRATEGIES[name](gap, K, decision, world, ctx); if(!cands.length) continue;
      for(const c of cands){ derivations++;
        if(!has(K,c.edge) && verify(c.edge, world)){                                   // 0-FAB gate
          const premiseTiers=(c.premises||[]).map(p=>store.tierOf(p, agent)||'shared');
          store.commit(c.edge, { source:c.source, premises:c.premises, agent, premiseTiers });
          did=true;
        }
      }
      if(did){ committed++; break; }                              // first strategy that yields VERIFIED knowledge wins
    }
    if(!did) break;                                               // no strategy could help → abstain honestly next check
  }
  const K=store.know(agent); if(opts.seed) for(const e of opts.seed.edges) if(!has(K,e)) K.edges.push(e);
  const final=D.deliberate(K, decision, {order:'geometry'});
  return { converged:final.convergence.converged, chain:final, committed, derivations, trace, abstained:!final.convergence.converged, store_stats:store.stats() };
}

const api={ acquire, STRATEGIES, DEFAULT_ORDER, verify };
if(typeof window!=='undefined') window.ACQUIRE=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
