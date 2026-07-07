// deliberate.js - THE DELIBERATION ENGINE: generalized reflective chain reasoning for EVERYTHING the AGI does.
// Per the user (2026-07-07): "for whatever it is currently working on it's going to do chain reasoning to think - how does this affect me, why am I doing this, what should I do. How/What/Why/When on each step of a decision,
// which breaks into large chains we fully explore. Time doesn't matter. We need a system to determine what is
// important - use GEOMETRY. This must be for ALL the AGI does and it must be GENERALIZED (not the space game)."
//
// The engine is DOMAIN-AGNOSTIC: it reasons over a typed graph - the ONE substrate everything here already speaks
// (novel graph, mind-games graph, a plan graph, a math graph - all the same {nodes, edges{s,r,o}} shape). Given a
// DECISION (state node + goal node), it expands the decision along the four reflective axes, each a concrete graph
// operation, and each answer spawns sub-questions → the large chain:
//   WHAT - the OPTIONS: action-edges out of the current state (each option recurses into its own sub-decision).
//   HOW - the MECHANISM: the shortest verified action-path state→goal (the concrete plan).
//   WHY - the JUSTIFICATION: the serves/enables chain from the goal up to a root value ("why reach it").
//   WHEN - the ORDERING: dependency (requires/before) order over the plan's waypoints.
// GEOMETRY DECIDES IMPORTANCE (the user's axis/angle idea, made exact + verifiable): a branch's importance =
//   w_pull * goalPull   (how much it shortens the graph-distance to the goal - the "angle toward the goal")
// + w_cent * centrality (how many state→goal shortest paths run through it - structural betweenness)
// + w_nov  * novelty    (graph-distance from the already-explored frontier - don't re-walk known ground).
// Branches expand in importance order until the frontier is empty or MAX_NODES (large - depth is cheap, per the
// user's "time doesn't matter"). 0-FABRICATION: every answer is a real edge/path; a chain is VALID only if every
// leaf grounds in the graph, so the engine reasons over THIS world, not a memorized one (shuffle the graph and the
// same chain goes invalid - the bench proves it). window.DELIBERATE + node module.exports.
'use strict';
(function(){
const CFG = {
  W_PULL: 3.0,        // importance weight: distance-to-goal reduction (the geometric goal-pull)
  W_CENT: 1.5,        // importance weight: betweenness (on-route-ness)
  W_NOV: 0.8,         // importance weight: novelty vs the explored frontier
  MAX_NODES: 4000,    // exploration ceiling (large - full exploration is the point; this is a runaway backstop)
  BEAM: 8,            // branches expanded per frontier layer (priority by importance)
  MAX_DEPTH: 12,      // recursion depth cap for sub-decisions (deep chains, bounded)
};
// relation roles (a domain maps its own relations onto these four - the ONLY thing a domain must declare):
const DEFAULT_ROLES = { action:['action','moves','goes','leads'], serves:['serves','enables','for','because'],
  requires:['requires','before','needs','after'] };

// ---- graph helpers (exact geometry) --------------------------------------------------------------------------
function buildIndex(graph, roles){
  roles = roles || DEFAULT_ROLES;
  const isRole = (r, k) => (roles[k]||[]).includes(r);
  const actionOut={}, servesOut={}, requiresEdge=[];
  for(const e of graph.edges){
    if(isRole(e.r,'action')){ (actionOut[e.s]=actionOut[e.s]||[]).push(e); }
    if(isRole(e.r,'serves')){ (servesOut[e.s]=servesOut[e.s]||[]).push(e); }
    if(isRole(e.r,'requires')){ requiresEdge.push(e); }
  }
  return { actionOut, servesOut, requiresEdge, roles, isRole };
}
function bfsDist(idx, from){                       // action-edge BFS distances from `from`
  const dist={[from]:0}; let ring=[from];
  while(ring.length){ const nx=[]; for(const u of ring) for(const e of (idx.actionOut[u]||[])) if(dist[e.o]===undefined){ dist[e.o]=dist[u]+1; nx.push(e.o); } ring=nx; }
  return dist;
}
function shortestPath(idx, from, to){              // one shortest action-path from→to (edge list), or null
  const prev={[from]:null}; let ring=[from];
  while(ring.length){ const nx=[]; for(const u of ring){ if(u===to){ const path=[]; let c=to; while(prev[c]){ path.push(prev[c]); c=prev[c].s; } return path.reverse(); }
    for(const e of (idx.actionOut[u]||[])) if(prev[e.o]===undefined){ prev[e.o]=e; nx.push(e.o); } } ring=nx; }
  if(prev[to]!==undefined){ const path=[]; let c=to; while(prev[c]){ path.push(prev[c]); c=prev[c].s; } return path.reverse(); }
  return null;
}
function betweenness(idx, from, goal){             // fraction of from→goal shortest paths through each node (approx via layered counts)
  const dist=bfsDist(idx, from); if(dist[goal]===undefined) return {};
  // count shortest paths to each node (sigma), then paths from node to goal via reverse layering on the DAG of shortest edges
  const sigma={[from]:1}; const order=Object.keys(dist).sort((a,b)=>dist[a]-dist[b]);
  for(const u of order) for(const e of (idx.actionOut[u]||[])) if(dist[e.o]===dist[u]+1) sigma[e.o]=(sigma[e.o]||0)+ (sigma[u]||0);
  // sigma[goal] total; a node's centrality ~ sigma[node]*pathsNodeToGoal / sigma[goal]. pathsNodeToGoal via reverse.
  const toGoal={[goal]:1};
  for(let i=order.length-1;i>=0;i--){ const u=order[i]; let s=(u===goal)?1:0; for(const e of (idx.actionOut[u]||[])) if(dist[e.o]===dist[u]+1) s+=(toGoal[e.o]||0); toGoal[u]=s; }
  const total=sigma[goal]||1; const cent={};
  for(const u of order) cent[u]= dist[u]<=dist[goal]? (sigma[u]||0)*(toGoal[u]||0)/total : 0;
  return cent;
}

// ---- the four reflective axes (each a graph operation grounded in real edges) ---------------------------------
function axisWHAT(idx, state){ return (idx.actionOut[state]||[]).map(e=>({option:e.o, via:e.r, edge:e})); }
function axisHOW(idx, state, goal){ const p=shortestPath(idx, state, goal); return p? {plan:p, hops:p.length}:null; }
function axisWHY(idx, goal, depth){                 // walk serves/enables from goal to a root value
  const chain=[]; let cur=goal, guard=0;
  while(guard++ < (depth||8)){ const outs=idx.servesOut[cur]; if(!outs||!outs.length) break; const e=outs[0]; chain.push({from:cur, serves:e.o, via:e.r}); cur=e.o; }
  return chain;
}
function axisWHEN(idx, waypoints){                  // order waypoints by requires/before edges (topo over the induced subgraph)
  const set=new Set(waypoints); const indeg={}, radj={};
  for(const w of waypoints){ indeg[w]=0; radj[w]=[]; }
  for(const e of idx.requiresEdge) if(set.has(e.s)&&set.has(e.o)){ indeg[e.o]=(indeg[e.o]||0)+1; radj[e.s].push(e.o); }
  const q=waypoints.filter(w=>!indeg[w]); const order=[];
  while(q.length){ const u=q.shift(); order.push(u); for(const v of radj[u]) if(--indeg[v]===0) q.push(v); }
  return order.length===waypoints.length? order : waypoints;   // fall back to given order if cyclic
}

// ---- VERIFY (0-fabrication): every edge referenced by the chain exists in the graph ---------------------------
function edgeExists(graph, e){ return graph.edges.some(x=>x.s===e.s&&x.r===e.r&&x.o===e.o); }
function verifyChain(graph, chain){
  for(const step of chain.steps){
    if(step.axis==='HOW'&&step.plan) for(const e of step.plan) if(!edgeExists(graph,e)) return false;
    if(step.axis==='WHAT'&&step.options) for(const o of step.options) if(!edgeExists(graph,o.edge)) return false;
    if(step.axis==='WHY'&&step.chain) for(const c of step.chain) if(!edgeExists(graph,{s:c.from,r:c.via,o:c.serves})) return false;
  }
  return true;
}

// ---- THE ENGINE: expand a decision into the full How/What/Why/When chain, geometry-ordered -------------------
function deliberate(graph, decision, opts){
  opts = opts||{}; const idx=buildIndex(graph, opts.roles);
  const cfg = Object.assign({}, CFG, opts.cfg||{});
  const order = opts.order || 'geometry';         // 'geometry' | 'uniform' (ablation: strip the geometric guidance)
  const state=decision.state, goal=decision.goal;
  const dist=bfsDist(idx, state), cent=betweenness(idx, state, goal);
  const explored=new Set(); const exploredEdges=[];
  let rng = (function(s){ let a=(s>>>0)||1; return ()=>{ a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296; }; })((opts.seed||7));
  const steps=[]; let nodesUsed=0;
  // importance of expanding option-node `n`: geometric goal-pull + centrality + novelty. In the UNIFORM ablation
  // this signal is discarded (random order) - the control that proves the GEOMETRY, not the search, does the work.
  function importance(n){
    const pull = (dist[state]!==undefined && dist[n]!==undefined) ? (dist[goal]!==undefined ? (dist[goal]-dist[n]) : 0) : 0;
    const nov = explored.has(n)? 0 : 1;
    return cfg.W_PULL*pull + cfg.W_CENT*(cent[n]||0) + cfg.W_NOV*nov;
  }
  // recursive sub-decision expansion (the LARGE chain): at each state, answer all four axes, then recurse into the
  // highest-importance options toward the goal.
  function expand(cur, depth){
    if(nodesUsed++ > cfg.MAX_NODES || depth > cfg.MAX_DEPTH) return;
    explored.add(cur);
    const what=axisWHAT(idx, cur);
    const how=axisHOW(idx, cur, goal);
    const why=axisWHY(idx, goal);
    const when=how? axisWHEN(idx, [cur, ...how.plan.map(e=>e.o)]) : [cur];
    steps.push({ at:cur, depth,
      WHAT:{axis:'WHAT', question:`what can I do from ${cur}?`, options:what},
      HOW:{axis:'HOW', question:`how do I reach ${goal}?`, plan:how?how.plan:null, hops:how?how.hops:Infinity},
      WHY:{axis:'WHY', question:`why reach ${goal}?`, chain:why},
      WHEN:{axis:'WHEN', question:`in what order?`, order:when} });
    if(cur===goal) return;
    // choose which options to explore fully. GEOMETRY: rank by importance. UNIFORM (ablation): random order - the
    // engine still explores, but blind to the goal-pull/centrality signal, so at a bounded budget it wanders.
    let picks=what.slice();
    if(order==='geometry') picks=what.map(o=>({o, imp:importance(o.option)})).sort((a,b)=>b.imp-a.imp).map(x=>x.o);
    else { for(let i=picks.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [picks[i],picks[j]]=[picks[j],picks[i]]; } }
    for(const o of picks.slice(0, cfg.BEAM)){ if(!explored.has(o.option)){ exploredEdges.push(o.edge); expand(o.option, depth+1); } }
  }
  expand(state, 0);
  // the DECISION comes ONLY from what was actually EXPLORED (you may reason only over ground you walked): shortest
  // action-path to the goal within the explored subgraph. Not explored far enough → ABSTAIN. This is what makes the
  // geometry load-bearing - geometry spends the budget toward the goal and reaches a justified recommendation;
  // uniform spends it on distractors and abstains at the same budget.
  const exIdx={ actionOut:{}, servesOut:idx.servesOut, requiresEdge:idx.requiresEdge, roles:idx.roles, isRole:idx.isRole };
  for(const e of exploredEdges) if(explored.has(e.s)&&explored.has(e.o)) (exIdx.actionOut[e.s]=exIdx.actionOut[e.s]||[]).push(e);
  const treePath = explored.has(goal)? shortestPath(exIdx, state, goal) : null;
  const firstAction = treePath && treePath.length? treePath[0] : null;
  const flat=[]; for(const s of steps){ flat.push(s.HOW, s.WHAT, s.WHY); }
  // CONVERGENCE - the four axes MEET (user 2026-07-07: "how/what/why/when chains should all meet up and the geometry
  // comes to a conclusion"). Each axis either ENDORSES a confident next step toward a justified goal, or it DISSENTS
  // - and the dissenting axis NAMES the gap: HOW→unreachable, WHY→unjustified, WHAT→no options, WHEN→order conflict.
  // A 4/4 meeting is a confident conclusion; anything less is a KNOWLEDGE GAP the agent should go fill (see seek()).
  const whenOrder = treePath? axisWHEN(idx, [state, ...treePath.map(e=>e.o)]) : [state];
  const conv = {
    WHAT: (idx.actionOut[state]||[]).length>0,               // are there options at all?
    HOW:  !!treePath,                                          // is the goal reachable through explored ground?
    WHY:  axisWHY(idx, goal).length>0,                         // does the goal have a justification?
    WHEN: whenOrder.length>0 && whenOrder[0]===state,          // is a consistent order rooted at the state?
  };
  const dissent=Object.keys(conv).filter(k=>!conv[k]);
  const agreement=4-dissent.length;
  const gapType = dissent.includes('HOW')?'reach' : dissent.includes('WHY')?'justify' : dissent.includes('WHAT')?'options' : dissent.includes('WHEN')?'order' : null;
  const chain={ decision, order, steps:flat, nodes_explored:explored.size, tree_nodes:steps.length,
    recommended: firstAction? {action:firstAction.o, via:firstAction.r, first_edge:firstAction} : null,
    reached_goal_in_tree: !!treePath, justified: conv.WHY,
    convergence:{ axes:conv, agreement, converged:agreement===4, dissent, gap:gapType },
    conclusion: (agreement===4 && firstAction)? {take:firstAction.o, via:firstAction.r, because:'all four axes meet - reachable, justified, ordered, and an available option'}
              : { abstain:true, gap:gapType, need: gapDescription(gapType, decision) } };
  chain.grounded = verifyChain(graph, chain);
  return chain;
}

// ---- transcript renderer (visible input→output the user asked for) -------------------------------------------
function transcript(graph, decision, opts){
  const c=deliberate(graph, decision, opts);
  const L=[];
  L.push(`DECISION: from "${decision.state}" - should I pursue "${decision.goal}"?  (${decision.question||''})`);
  const root=c.steps[0]; // first HOW/WHAT/WHY of the start state
  const start=c.steps.filter(s=>true);
  // render the start-state tetrad + the recommended action + the deepest justified branch
  const s0=deliberate(graph, decision, opts); // reuse
  const idx=buildIndex(graph, opts&&opts.roles);
  const what=axisWHAT(idx, decision.state), how=axisHOW(idx, decision.state, decision.goal), why=axisWHY(idx, decision.goal);
  L.push(`  WHAT can I do?  → ${what.map(o=>o.option).join(', ')||'(no options)'}`);
  L.push(`  HOW to reach it? → ${how? how.plan.map(e=>e.s+'→'+e.o).join('  ') : '(unreachable)'}`);
  L.push(`  WHY reach it?    → ${why.length? why.map(w=>w.from+' serves '+w.serves).join('  ') : '(no justification found)'}`);
  L.push(`  WHEN / order?    → ${how? axisWHEN(idx,[decision.state,...how.plan.map(e=>e.o)]).join(' before ') : '(n/a)'}`);
  L.push(`  → chain explored ${c.nodes_explored} nodes across ${c.tree_nodes} sub-decisions; grounded=${c.grounded}, justified=${c.justified}`);
  L.push(`  → RECOMMEND: ${c.recommended? ('take '+c.recommended.via+' to '+c.recommended.action) : 'ABSTAIN (unreachable/unjustified)'}`);
  return { text:L.join('\n'), chain:c };
}

function gapDescription(gap, decision){
  switch(gap){
    case 'reach':   return `I don't know a route from ${decision.state} to ${decision.goal}. Find the missing steps between them.`;
    case 'justify': return `I don't know WHY ${decision.goal} matters. Find what it serves.`;
    case 'options': return `I don't know what I can do from ${decision.state}. Find my available actions.`;
    case 'order':   return `I can't order the steps to ${decision.goal}. Find their dependencies.`;
    default: return null;
  }
}

// ---- SEEK: aggressive knowledge acquisition on ABSTAIN (user 2026-07-07: "it should be finding things it doesn't
// know and pulling those out; if we abstain we seek knowledge for it AGGRESSIVELY"). The agent holds a PARTIAL known
// graph and can query a WORLD (the ground truth it hasn't fully revealed). On a gap it does NOT stop - it forms a
// TARGETED query from the dissenting axis and reveals exactly the world-edges that could close it, then re-deliberates,
// escalating each round until it converges or the seek budget is spent. 0-FABRICATION: revealed edges are COPIED from
// the world (real, verified) - never invented; and if the world itself has no answer, seek exhausts its budget and
// STILL abstains honestly (it never hallucinates a conclusion just to avoid saying "I don't know yet").
function seek(known, decision, world, opts){
  opts=opts||{}; const cfg=Object.assign({}, CFG, opts.cfg||{});
  const rounds=opts.rounds||6, perRound=opts.perRound||8, targeted=opts.targeted!==false;
  const K={ edges: known.edges.slice() };                    // working copy of what we KNOW
  const known_edge=e=>K.edges.some(x=>x.s===e.s&&x.r===e.r&&x.o===e.o);
  const worldRng=(function(s){let a=(s>>>0)||1;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})(opts.seed||3);
  const trace=[]; let revealed=0;
  for(let r=0; r<=rounds; r++){
    const chain=deliberate(K, decision, {order:'geometry', cfg, seed:opts.seed});
    trace.push({ round:r, agreement:chain.convergence.agreement, gap:chain.convergence.gap, revealed_so_far:revealed });
    if(chain.convergence.converged){ return { converged:true, chain, revealed, rounds:r, trace, verified_zero_fab:true }; }
    // NOT converged → SEEK the specific gap. Reveal targeted world-edges the gap needs.
    const gap=chain.convergence.gap; let toReveal=[];
    const wIdx=buildIndex(world, opts.roles);
    if(gap==='justify'){                                       // pull the goal's serves-chain from the world
      let cur=decision.goal, guard=0; while(guard++<12){ const outs=wIdx.servesOut[cur]; if(!outs||!outs.length) break; for(const e of outs) if(!known_edge(e)) toReveal.push(e); cur=outs[0].o; }
    } else if(gap==='reach' || gap==='order'){                 // pull the WORLD route from the STATE toward the goal
      // BFS in the world from the STATE (not the whole known region - a goal-side fragment wouldshort-circuit the BFS and
      // leave the middle unrevealed, stalling forever). Reveal the route's missing edges FRONT-TO-BACK so the known
      // frontier extends contiguously toward the goal each round (this is also what makes escalation real).
      const prev={[decision.state]:'root'}; let ring=[decision.state]; let hit=null; const seen=new Set(ring);
      while(ring.length && !hit){ const nx=[]; for(const u of ring){ for(const e of (wIdx.actionOut[u]||[])){ if(!seen.has(e.o)){ seen.add(e.o); prev[e.o]=e; nx.push(e.o); if(e.o===decision.goal){ hit=e.o; break; } } } if(hit)break; } ring=nx; }
      if(hit){ const rev=[]; let c=hit; while(prev[c] && prev[c]!=='root'){ rev.push(prev[c]); c=prev[c].s; } rev.reverse();  // state→goal order
        for(const e of rev) if(!known_edge(e)) toReveal.push(e); }                                                          // front-to-back missing edges
    } else if(gap==='options'){                               // pull the state's actions from the world
      for(const e of (wIdx.actionOut[decision.state]||[])) if(!known_edge(e)) toReveal.push(e);
    }
    if(!targeted){                                            // ABLATION: reveal RANDOM world edges instead of targeted ones
      toReveal=[]; const pool=world.edges.filter(e=>!known_edge(e)); for(let i=0;i<perRound && pool.length;i++) toReveal.push(pool[Math.floor(worldRng()*pool.length)]);
    }
    toReveal=toReveal.slice(0, perRound);
    if(!toReveal.length) continue;                            // nothing left to pull for this gap this round
    for(const e of toReveal){ if(!known_edge(e) && world.edges.some(x=>x.s===e.s&&x.r===e.r&&x.o===e.o)){ K.edges.push(e); revealed++; } }  // 0-fab: only edges that EXIST in the world
  }
  const final=deliberate(K, decision, {order:'geometry', cfg, seed:opts.seed});
  return { converged:final.convergence.converged, chain:final, revealed, rounds:rounds+1, trace,
    verified_zero_fab: K.edges.every(e=>world.edges.some(x=>x.s===e.s&&x.r===e.r&&x.o===e.o)),
    abstained: !final.convergence.converged };
}

const api={ CFG, deliberate, transcript, buildIndex, shortestPath, betweenness, verifyChain, gapDescription, seek };
if(typeof window!=='undefined') window.DELIBERATE=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
