// COOP_PROOF.js - ENDGAME M9 ported into the game: N (>=2) separately-grounded reasoners hold a real
// conversation in AST messages and either jointly PROVE a chain none can prove alone, or JOINTLY ABSTAIN,
// committing ZERO fabrications. Source ported VERBATIM from combine-iso-agi-fleet/agi_proto/m9_protocol.py +
// m9_substrate.py + m9_bench.py (read first, 2026-07-10). CPU, ASCII, deterministic, no model.
//
// THE STRUCTURAL IRON-LAW THEOREM (why a fabrication cannot be COMMITTED, not merely audited away):
//   A hop (a,rel,b) enters the COMMITTED joint proof ONLY if >=2 PROVENANCE-DISTINCT agents each attest it
//   from their OWN private held edges (never by echoing a received/quarantined claim). Each honest agent's held
//   set is a subset of the real edges by construction. So if at most ONE agent is Byzantine, every committed hop
//   has at least one HONEST attester -> the hop is a real edge -> committed-fabrication == 0. The ONLY way to
//   commit a falsehood is >=2 provenance-distinct agents asserting the SAME false edge = correlated error across
//   independent channels (the documented M6 boundary). Reported, never hidden.
//
// GAME MAPPING (honest, decided before coding): the game's two-tier store (GAME_KNOW) already tags every fact
// with PROVENANCE - shared facts keyed by source, private facts partitioned by holding agent. THOSE partitions
// ARE the provenance-distinct "agents": a hop over the store commits only when >=2 distinct provenances
// (two witnessing pilots, or a witnessed fact ALSO in the shared library) independently hold that edge. This is
// the iron rule's ">=2 edge-disjoint evidence" gate made into a running proof over live galaxy facts.

(function () {
  'use strict';
  var SEP = '';                                        // internal edge-key separator (node names use no )
  function ek(e) { return e[0] + SEP + e[1] + SEP + e[2]; }  // [a,rel,b] -> key
  function unek(k) { return k.split(SEP); }                  // key -> [a,rel,b]
  function win() { return (typeof window !== 'undefined') ? window : null; }
  var _testStore = null;
  function know() { if (_testStore) return _testStore; var w = win(); return (w && w.GAME_KNOW) || null; }

  // ----------------------------------------------------------------- AST message constructors (structure, not prose)
  function ASK(goal) { return ['ASK', goal]; }
  function NEED(node, rel) { return ['NEED', node, rel]; }
  function CLAIM(edge, support, attester) { return ['CLAIM', edge.slice(), support, attester]; }
  function CONTRADICT(edge, other, attester) { return ['CONTRADICT', edge.slice(), other.slice(), attester]; }
  function COMMIT(edge, provenance) { return ['COMMIT', edge.slice(), provenance.slice()]; }
  function PROVED(goal, chain) { return ['PROVED', goal.slice(), chain]; }
  function ABSTAIN(reason) { return ['ABSTAIN', reason]; }
  function UNRESOLVED(reason) { return ['UNRESOLVED', reason]; }

  // ----------------------------------------------------------------- Agent: a private graph
  // HONEST agents hold only real edges. A BYZANTINE agent additionally carries `lies` - edges it will ASSERT with
  // well-formed-looking support but that are NOT real. The protocol never trusts an agent's word; an agent may
  // attest ONLY from its OWN held|lies edges, never from a received claim -> corroboration is always cross-source.
  function Agent(name, held, lies) {
    this.name = name;
    this.held = new Set();                                   // real edges privately held (keys)
    this.lies = new Set();                                   // Byzantine: asserted but NOT real (keys)
    var i;
    for (i = 0; i < (held || []).length; i++) this.held.add(ek(held[i]));
    for (i = 0; i < (lies || []).length; i++) this.lies.add(ek(lies[i]));
    this._adj = {};                                         // (a|rel) -> Set of targets it would CLAIM (held OR lied)
    var self = this;
    function idx(k) { var t = unek(k); var key = t[0] + SEP + t[1]; (self._adj[key] = self._adj[key] || new Set()).add(t[2]); }
    this.held.forEach(idx); this.lies.forEach(idx);
  }
  Agent.prototype.byzantine = function () { return this.lies.size > 0; };
  Agent.prototype.candidates = function (node, rel) {       // targets b THIS agent would CLAIM - sorted = deterministic
    var s = this._adj[node + SEP + rel]; if (!s) return [];
    return Array.from(s).sort();
  };
  Agent.prototype.supportFor = function (a, rel, b) {       // a base edge is its own support; a lie looks well-formed too
    var k = ek([a, rel, b]);
    if (this.held.has(k) || this.lies.has(k)) return [['base', [a, rel, b]]];
    return null;
  };
  Agent.prototype._realAdj = function (rel) {              // REAL held edges only (lies never reach the real goal)
    var adj = {}; var self = this;
    this.held.forEach(function (k) { var t = unek(k); if (t[1] === rel) { (adj[t[0]] = adj[t[0]] || new Set()).add(t[2]); } });
    return adj;
  };
  Agent.prototype.soloReach = function (start, rel, budget) {   // longest SIMPLE-path depth this agent builds ALONE
    budget = budget || 500000;
    var adj = this._realAdj(rel), best = 0, steps = 0;
    var stack = [[start, 0, new Set([start])]];
    while (stack.length && steps < budget) {
      var top = stack.pop(), n = top[0], d = top[1], path = top[2];
      steps++;
      if (d > best) best = d;
      var nb = adj[n]; if (nb) { Array.from(nb).sort().forEach(function (b) { if (!path.has(b)) { var np = new Set(path); np.add(b); stack.push([b, d + 1, np]); } }); }
    }
    return best;
  };
  Agent.prototype.soloReachesGoal = function (start, goal, rel) {   // exact BFS reachability - the un-overclaim-able necessity check
    if (start === goal) return true;
    var adj = this._realAdj(rel), seen = new Set([start]), q = [start];
    while (q.length) {
      var n = q.shift(), nb = adj[n]; if (!nb) continue;
      var arr = Array.from(nb);
      for (var i = 0; i < arr.length; i++) { var b = arr[i]; if (b === goal) return true; if (!seen.has(b)) { seen.add(b); q.push(b); } }
    }
    return false;
  };

  // ----------------------------------------------------------------- provenance-distinct corroboration
  // Laundering (one source echoed through two mouths) is prevented STRUCTURALLY: an Agent may only CLAIM an edge
  // in its OWN held|lies set, so two distinct NAMES for one edge are two independent sources by construction.
  function distinctAttesters(claimsForEdge) {
    var s = new Set(); claimsForEdge.forEach(function (m) { s.add(m[3]); }); return s;
  }

  // ----------------------------------------------------------------- the N-agent cooperative proof
  function coopProve(agents, start, goal, rel, opts) {
    opts = opts || {};
    var functional = opts.functional !== false;             // default true
    var minCorroboration = opts.minCorroboration || 2;
    var maxRounds = opts.maxRounds || 1000000;

    var transcript = [ASK([start, rel, goal])];
    var committedAdj = {};                                  // node -> [[b, provenance], ...]
    var cameFrom = {};                                      // b -> [a, provenance] (first committed arrival)
    var frontier = new Set([start]);
    var seen = new Set([start]);
    var presumptions = [];                                  // [node, rel, b, nAttesters] offered-but-not-committed
    var conflicts = [];                                    // [node, rel, {b:attesters}] functional disagreements
    var fabAttempts = [];                                  // CLAIMs asserted-but-not-privately-held: a TRANSIT proxy

    var rounds = 0, capped = false;
    while (!seen.has(goal) && frontier.size) {
      if (rounds >= maxRounds) { capped = true; break; }
      rounds++;
      var nextFrontier = new Set();
      var progressed = false;
      var nodes = Array.from(frontier).sort(function (a, b) { return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0; });
      for (var ni = 0; ni < nodes.length; ni++) {
        var node = nodes[ni];
        transcript.push(NEED(node, rel));
        // gather EVERY agent's claims for (node, rel, *) from their OWN edges
        var claimsByTarget = {};
        for (var ai = 0; ai < agents.length; ai++) {
          var ag = agents[ai];
          var cands = ag.candidates(node, rel);
          for (var ci = 0; ci < cands.length; ci++) {
            var b = cands[ci];
            var sup = ag.supportFor(node, rel, b);
            if (sup === null) continue;
            var msg = CLAIM([node, rel, b], sup, ag.name);
            transcript.push(msg);
            (claimsByTarget[b] = claimsByTarget[b] || []).push(msg);
            if (!ag.held.has(ek([node, rel, b]))) fabAttempts.push([node, rel, b, ag.name]);   // from .lies -> transit proxy
          }
        }
        var targets = Object.keys(claimsByTarget);
        if (!targets.length) continue;                     // dead end (true gap) - leave it
        // corroboration per target
        var corro = {}; targets.forEach(function (b) { corro[b] = distinctAttesters(claimsByTarget[b]); });
        var committable = {}; targets.forEach(function (b) { if (corro[b].size >= minCorroboration) committable[b] = corro[b]; });
        var committableKeys = Object.keys(committable).sort();
        if (functional && committableKeys.length >= 2) {
          // genuine cross-agent disagreement on a single-valued relation -> agreement FAILS -> UNRESOLVED
          var cmap = {}; committableKeys.forEach(function (b) { cmap[b] = Array.from(committable[b]).sort(); });
          conflicts.push([node, rel, cmap]);
          transcript.push(CONTRADICT([node, rel, committableKeys[0]], [node, rel, committableKeys[1]], 'protocol'));
          continue;                                        // commit NEITHER - ambiguity without agreement
        }
        for (var ki = 0; ki < committableKeys.length; ki++) {
          var cb = committableKeys[ki];
          var prov = Array.from(committable[cb]).sort();
          transcript.push(COMMIT([node, rel, cb], prov));
          (committedAdj[node] = committedAdj[node] || []).push([cb, prov]);
          if (!seen.has(cb)) { seen.add(cb); nextFrontier.add(cb); if (!(cb in cameFrom)) cameFrom[cb] = [node, prov]; progressed = true; }
        }
        targets.forEach(function (b) { if (corro[b].size < minCorroboration) presumptions.push([node, rel, b, corro[b].size]); });
      }
      if (!progressed) break;
      frontier = nextFrontier;
    }

    // classify the outcome
    var status, chain = null;
    if (seen.has(goal)) {
      chain = reconstruct(cameFrom, start, goal).map(function (h) { return [h[0], rel, h[1], h[2]]; });
      transcript.push(PROVED([start, rel, goal], chain));
      status = 'PROVED';
    } else {
      var stuckWithOffers = conflicts.length > 0 || presumptions.some(function (p) { return onOpenFrontier(p[0], start, seen); });
      if (capped) { status = 'UNRESOLVED'; transcript.push(UNRESOLVED('resource limit: hit maxRounds=' + maxRounds + ' with the goal still open (NOT a knowledge gap)')); }
      else if (conflicts.length) { status = 'UNRESOLVED'; transcript.push(UNRESOLVED('functional disagreement at ' + conflicts.length + ' node(s) -> no agreement, not a guess')); }
      else if (stuckWithOffers) { status = 'UNRESOLVED'; transcript.push(UNRESOLVED('continuation(s) offered but only single-source -> below agreement threshold')); }
      else { status = 'ABSTAIN'; transcript.push(ABSTAIN('no agent offers a continuation across the gap -> joint abstain, no fabrication')); }
    }

    var jointDepth = chain ? chain.length : 0;
    var solo = {}; agents.forEach(function (ag) { solo[ag.name] = ag.soloReach(start, rel); });
    var reaches = {}; agents.forEach(function (ag) { reaches[ag.name] = ag.soloReachesGoal(start, goal, rel); });
    var anyReach = false; for (var nm in reaches) if (reaches[nm]) anyReach = true;
    var maxSolo = 0; for (var nm2 in solo) if (solo[nm2] > maxSolo) maxSolo = solo[nm2];
    return {
      status: status, chain: chain, transcript: transcript, joint_depth: jointDepth,
      solo_reach: solo, max_solo_reach: maxSolo, solo_reaches_goal: reaches,
      coop_necessary: (status === 'PROVED') && !anyReach, capped: capped,
      presumptions: presumptions, conflicts: conflicts, fab_attempts: fabAttempts, min_corroboration: minCorroboration
    };
  }

  function reconstruct(cameFrom, start, goal) {
    var rev = [], cur = goal;
    while (cur !== start) { var e = cameFrom[cur]; rev.push([e[0], cur, e[1]]); cur = e[0]; }
    rev.reverse(); return rev;
  }
  function onOpenFrontier(node, start, seen) { return node === start || seen.has(node); }

  // ----------------------------------------------------------------- SUBSTRATE (self-test worlds) + audit oracle
  function Substrate(name, edges) { this.name = name; this.edges = new Set(edges.map(ek)); }
  Substrate.prototype.verify = function (a, rel, b) { return this.edges.has(ek([a, rel, b])); };   // AUDIT-only ground truth

  function makeChain(depth, rel, prefix) {
    rel = rel || 'isa'; prefix = prefix || 'n';
    var nodes = [], edges = [], i;
    for (i = 0; i <= depth; i++) nodes.push(prefix + i);
    for (i = 0; i < depth; i++) edges.push([nodes[i], rel, nodes[i + 1]]);
    return { nodes: nodes, edges: edges };
  }
  function dealCovering(edges, nAgents, cover) {           // edge i -> agents {(i+j)%N : j in 0..cover-1}
    var held = {}, a; for (a = 0; a < nAgents; a++) held[a] = [];
    for (var i = 0; i < edges.length; i++) for (var j = 0; j < cover; j++) held[(i + j) % nAgents].push(edges[i]);
    return held;
  }
  function agentsFromDeal(held, nAgents, byzMap) {         // byzMap: {index: {name, lies}} override
    var agents = [], a;
    for (a = 0; a < nAgents; a++) {
      if (byzMap && byzMap[a]) agents.push(new Agent(byzMap[a].name, held[a], byzMap[a].lies));
      else agents.push(new Agent('ag' + a, held[a]));
    }
    return agents;
  }
  function stripEdge(held, edge) { var kk = ek(edge); for (var a in held) held[a] = held[a].filter(function (e) { return ek(e) !== kk; }); }

  // the 9 canonical worlds - each returns {sub, agents, start, goal, expect, note}
  var WORLDS = {
    'PROVE': function () {
      var c = makeChain(6), sub = new Substrate('prove', c.edges), held = dealCovering(c.edges, 3, 2);
      return { sub: sub, agents: agentsFromDeal(held, 3), start: c.nodes[0], goal: c.nodes[6], expect: 'PROVED', note: 'scattered chain; joint reach > every solo reach' };
    },
    'ABSTAIN-gap': function () {
      var c = makeChain(6), sub = new Substrate('abstain_gap', c.edges), held = dealCovering(c.edges, 3, 2);
      stripEdge(held, c.edges[3]);                          // edge still REAL in the world but held by NO agent -> gap
      return { sub: sub, agents: agentsFromDeal(held, 3), start: c.nodes[0], goal: c.nodes[6], expect: 'ABSTAIN', note: 'a middle edge held by none -> true gap' };
    },
    'ABSTAIN-offpath': function () {
      var c = makeChain(6), sub = new Substrate('offpath', c.edges.concat([['island', 'isa', 'atoll']])), held = dealCovering(c.edges, 3, 2);
      return { sub: sub, agents: agentsFromDeal(held, 3), start: c.nodes[0], goal: 'atoll', expect: 'ABSTAIN', note: "goal 'atoll' not reachable from the chain start" };
    },
    'UNRESOLVED-1src': function () {
      var c = makeChain(6), sub = new Substrate('unresolved_single', c.edges), held = dealCovering(c.edges, 3, 2);
      stripEdge(held, c.edges[3]); held[0].push(c.edges[3]);   // strip from all, give to exactly ONE agent
      return { sub: sub, agents: agentsFromDeal(held, 3), start: c.nodes[0], goal: c.nodes[6], expect: 'UNRESOLVED', note: 'a middle edge single-source -> below agreement bar' };
    },
    'DISAMBIGUATE': function () {
      var c = makeChain(6), fork = c.nodes[2], distractor = [fork, 'isa', 'river_sense'];
      var sub = new Substrate('disambig', c.edges.concat([distractor])), held = dealCovering(c.edges, 3, 2);
      held[(2 + 2) % 3].push(distractor);                   // ONE agent knows the off-chain sense
      return { sub: sub, agents: agentsFromDeal(held, 3), start: c.nodes[0], goal: c.nodes[6], expect: 'PROVED', note: 'ambiguous fork; corroborated sense commits, singleton sense ignored' };
    },
    'CONFLICT-2v2': function () {
      var c = makeChain(6), fork = c.nodes[2], forkB = [fork, 'isa', 'branch_world'];
      var sub = new Substrate('conflict', c.edges.concat([forkB])), held = dealCovering(c.edges, 3, 2);
      held[(2 + 1) % 3].push(forkB); held[(2 + 2) % 3].push(forkB);   // TWO holders -> ALSO committable -> 2-vs-2
      return { sub: sub, agents: agentsFromDeal(held, 3), start: c.nodes[0], goal: c.nodes[6], expect: 'UNRESOLVED', note: 'two corroborated continuations on a functional rel -> no agreement' };
    },
    'BYZANTINE-inject': function () {
      var c = makeChain(6), sub = new Substrate('byz_inject', c.edges), held = dealCovering(c.edges, 3, 2);
      var lie = [c.nodes[2], 'isa', c.nodes[6]];            // fabricated shortcut to goal (NOT real)
      return { sub: sub, agents: agentsFromDeal(held, 3, { 0: { name: 'ag0_BYZ', lies: [lie] } }), start: c.nodes[0], goal: c.nodes[6], expect: 'PROVED', note: 'liar injects a fake shortcut; uncorroborated -> ignored; true chain proves' };
    },
    'BYZANTINE-block': function () {
      var c = makeChain(6), sub = new Substrate('byz_block', c.edges), held = dealCovering(c.edges, 3, 2);
      var lie = [c.nodes[3], 'isa', 'decoy'];               // fake competing continuation
      var holder = 3 % 3;
      return { sub: sub, agents: agentsFromDeal(held, 3, {}).map(function (a, i) { return i === holder ? new Agent('ag' + holder + '_BYZ', held[holder], [lie]) : a; }), start: c.nodes[0], goal: c.nodes[6], expect: 'PROVED', note: 'liar asserts a decoy fork; true edge out-corroborates it; chain proves' };
    },
    'COLLUSION-bound': function () {
      var c = makeChain(6), sub = new Substrate('collusion', c.edges), held = dealCovering(c.edges, 4, 2);
      var lie = [c.nodes[2], 'isa', 'ghost'];               // the colluded fabrication (NOT real)
      var agents = agentsFromDeal(held, 4, { 0: { name: 'ag0_BYZ', lies: [lie] }, 1: { name: 'ag1_BYZ', lies: [lie] } });   // SAME lie -> 2 distinct attesters
      return { sub: sub, agents: agents, start: c.nodes[0], goal: c.nodes[6], expect: 'UNRESOLVED', note: '2 colluding liars meet the bar; honest true-edge contradiction on a functional rel -> UNRESOLVED' };
    }
  };

  // independent audit / grader: re-derive every COMMITTED hop and grade it against ground truth via the substrate
  // oracle (provenance-distinct from the reasoning agents, who never call verify()).
  function audit(result, sub, agents) {
    var heldBy = {}; agents.forEach(function (ag) { heldBy[ag.name] = ag.held; });
    var committedFab = [], undercorroborated = [], noHonestHolder = [], duf = Infinity;
    (result.chain || []).forEach(function (hop) {
      var a = hop[0], rel = hop[1], b = hop[2], prov = hop[3];
      if (!sub.verify(a, rel, b)) committedFab.push(hop);
      var provSet = new Set(prov);
      if (provSet.size < result.min_corroboration) undercorroborated.push(hop);
      var honest = false; provSet.forEach(function (nm) { if (heldBy[nm] && heldBy[nm].has(ek([a, rel, b])) && sub.verify(a, rel, b)) honest = true; });
      if (!honest) noHonestHolder.push(hop);
    });
    // scan EVERY COMMIT message (a lie committed in transit, even off the final chain); DUF over all committed hops
    var transitFab = [], commitPos = 0;
    result.transcript.forEach(function (msg) {
      if (msg[0] === 'COMMIT') {
        var e = msg[1];
        if (!sub.verify(e[0], e[1], e[2])) { transitFab.push([e[0], e[1], e[2], msg[2]]); if (duf === Infinity) duf = commitPos; }
        commitPos++;
      }
    });
    return { committed_fab: committedFab, transit_committed_fab: transitFab, undercorroborated: undercorroborated, no_honest_holder: noHonestHolder, depth_until_fabrication: duf, n_fab_attempts: result.fab_attempts.length };
  }
  function committedSet(result) { return (result.chain || []).map(function (h) { return h[0] + SEP + h[1] + SEP + h[2] + SEP + h[3].slice().sort().join(','); }).join('|'); }

  function runWorld(name) {
    var w1 = WORLDS[name]();
    var r1 = coopProve(w1.agents, w1.start, w1.goal, 'isa', { functional: true, minCorroboration: 2 });
    var w2 = WORLDS[name]();                                // determinism: rebuild fresh + re-run
    var r2 = coopProve(w2.agents, w2.start, w2.goal, 'isa', { functional: true, minCorroboration: 2 });
    var deterministic = committedSet(r1) === committedSet(r2) && r1.status === r2.status;
    var a = audit(r1, w1.sub, w1.agents);
    var gates = {
      status: r1.status === w1.expect,
      iron_law: a.committed_fab.length === 0 && a.transit_committed_fab.length === 0,
      corroboration: a.undercorroborated.length === 0,
      theorem_honest_holder: a.no_honest_holder.length === 0,
      determinism: deterministic
    };
    if (r1.status === 'PROVED') gates.coop_necessary = r1.coop_necessary;
    var ok = true; for (var g in gates) if (!gates[g]) ok = false;
    return { ok: ok, r: r1, a: a, gates: gates, expect: w1.expect, note: w1.note };
  }
  function runBattery() {                                   // returns {allOk, ironLawTotal, rows}
    var names = Object.keys(WORLDS), allOk = true, ironLawTotal = 0, rows = [];
    names.forEach(function (nm) {
      var res = runWorld(nm); allOk = allOk && res.ok;
      ironLawTotal += res.a.committed_fab.length + res.a.transit_committed_fab.length;
      rows.push({ world: nm, status: res.r.status, expect: res.expect, depth: res.r.joint_depth, maxSolo: res.r.max_solo_reach, coop: res.r.coop_necessary, fabAttempts: res.a.n_fab_attempts, duf: res.a.depth_until_fabrication, ok: res.ok, gates: res.gates });
    });
    return { allOk: allOk, ironLawTotal: ironLawTotal, rows: rows };
  }

  // ----------------------------------------------------------------- GAME ADAPTER: agents FROM THE REAL STORE
  // Partition GAME_KNOW into provenance-distinct agents: each private HOLDER is one agent (its witnessed/derived
  // edges), and shared facts split by SOURCE into one agent each. A hop over the store then commits only when >=2
  // of these distinct provenances independently hold it - the iron rule's >=2-edge-disjoint gate over live facts.
  function agentsFromStore(rel) {
    var K = know(); if (!K || !K._state) return null;
    var S = K._state();
    var agents = [], a, k, t, held;
    for (a in S.priv) {                                     // each private holder = one provenance-distinct agent
      held = []; var m = S.priv[a];
      for (k in m) { t = k.split('|'); if (t.length === 3 && (!rel || t[1] === rel)) held.push([t[0], t[1], t[2]]); }
      if (held.length) agents.push(new Agent('priv:' + a, held));
    }
    var bySrc = {};                                        // shared facts partitioned by SOURCE
    for (k in S.shared) { var prov = S.shared[k]; var src = (prov && prov.source) || 'shared'; (bySrc[src] = bySrc[src] || []).push(k); }
    for (var src in bySrc) {
      held = []; bySrc[src].forEach(function (kk) { var p = kk.split('|'); if (p.length === 3 && (!rel || p[1] === rel)) held.push([p[0], p[1], p[2]]); });
      if (held.length) agents.push(new Agent('shared:' + src, held));
    }
    return agents;
  }
  function relationsInStore() {                            // distinct relations present, for a helpful abstain message
    var K = know(); if (!K || !K.know) return [];
    var edges = (K.know().edges) || [], rels = {};
    edges.forEach(function (e) { rels[e.r] = (rels[e.r] || 0) + 1; });
    return Object.keys(rels).sort(function (x, y) { return rels[y] - rels[x]; }).map(function (r) { return { rel: r, n: rels[r] }; });
  }
  // CORROBORATION COVERAGE - the honest measure this pillar surfaces: what fraction of the store's edges are held
  // by >=2 provenance-distinct sources (independently verified) vs single-source (cannot be cooperatively proven).
  // A cooperative proof can only ever commit hops drawn from the corroborated set; this reports how big that set is.
  function corroborationStats(rel) {
    var agents = agentsFromStore(rel);
    if (!agents) return { sources: 0, totalEdges: 0, corroboratedEdges: 0, coverage: 0 };
    var holders = {};                                      // edgeKey -> Set(agentName)
    agents.forEach(function (ag) { ag.held.forEach(function (k) { (holders[k] = holders[k] || new Set()).add(ag.name); }); });
    var total = 0, corrob = 0, k;
    for (k in holders) { total++; if (holders[k].size >= 2) corrob++; }
    return { sources: agents.length, totalEdges: total, corroboratedEdges: corrob, coverage: total ? Math.round(corrob / total * 1000) / 1000 : 0 };
  }
  // prove start --rel*--> goal over the REAL store. Honest: with no >=2-corroborated chain it ABSTAINs/UNRESOLVEDs.
  function prove(start, goal, rel, opts) {
    var agents = agentsFromStore(rel);
    if (!agents) return { status: 'ABSTAIN', why: 'no knowledge store to reason over', chain: null };
    if (agents.length < 2) return { status: 'ABSTAIN', why: 'fewer than 2 provenance-distinct sources hold ' + (rel || 'any') + ' edges - cannot corroborate anything (need >=2)', chain: null, agents: agents.length };
    var r = coopProve(agents, start, goal, rel, opts || { functional: true, minCorroboration: 2 });
    r.n_agents = agents.length;
    return r;
  }

  var API = {
    Agent: Agent, coopProve: coopProve, Substrate: Substrate, audit: audit,
    WORLDS: WORLDS, runWorld: runWorld, runBattery: runBattery,
    agentsFromStore: agentsFromStore, relationsInStore: relationsInStore, prove: prove, corroborationStats: corroborationStats,
    _setTestStore: function (s) { _testStore = s; }
  };
  if (win()) win().COOP = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  // ================================================================== self-test (node)
  if (typeof require !== 'undefined' && require.main === module) {
    var pass = 0, fail = 0;
    function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

    // Part 1: the M9 acceptance battery - the 6 gates on all 9 canonical worlds (1:1 with m9_bench.py)
    var bat = runBattery();
    bat.rows.forEach(function (row) {
      var failed = []; for (var g in row.gates) if (!row.gates[g]) failed.push(g);
      check('[world ' + row.world + '] status=' + row.status + ' (exp ' + row.expect + '), gates=' + (failed.length ? 'FAIL:' + failed.join(',') : 'all-green'), row.ok);
    });
    check('[IRON LAW] committed-fabrication == 0 across ALL 9 worlds (independent oracle grade)', bat.ironLawTotal === 0);
    check('[battery] all gates green across all worlds', bat.allOk);

    // Part 2: focused structural checks
    // (a) NON-VACUITY: the >=2 rule must be LOAD-BEARING. Build an UNCONTESTED gap (a middle edge held by NO ONE)
    //     that ONLY a lone liar offers to bridge with a FAKE (non-real) shortcut. There is no competing true edge
    //     at that node, so the functional-conflict guard does NOT fire - the corroboration rule is the ONLY thing
    //     that can refuse the lie. Rule OFF (min_corr=1) -> the fake bridge commits (audit bites); rule ON (>=2)
    //     -> refused. (BYZANTINE-inject can't test this: its lie sits where the true edge also lives, so the
    //     conflict guard blocks it even at min_corr=1 - the corroboration rule never gets to be the decider.)
    (function () {
      var c = makeChain(6), sub = new Substrate('nonvac', c.edges), held = dealCovering(c.edges, 3, 2);
      stripEdge(held, c.edges[3]);                          // (n3,isa,n4) held by NO ONE -> an uncontested gap at n3
      var fakeBridge = [c.nodes[3], 'isa', c.nodes[5]];     // a NON-real shortcut past the gap (skips n4)
      function build() { return [new Agent('ag0_BYZ', held[0], [fakeBridge]), new Agent('ag1', held[1]), new Agent('ag2', held[2])]; }
      var agOff = build(), rOff = coopProve(agOff, c.nodes[0], c.nodes[6], 'isa', { functional: true, minCorroboration: 1 });
      var aOff = audit(rOff, sub, agOff);
      check('[non-vacuity] rule OFF (min_corr=1): the lone liar\'s fake bridge COMMITS -> committed_fab > 0 (audit bites)', (aOff.committed_fab.length + aOff.transit_committed_fab.length) > 0);
      var agOn = build(), rOn = coopProve(agOn, c.nodes[0], c.nodes[6], 'isa', { functional: true, minCorroboration: 2 });
      var aOn = audit(rOn, sub, agOn);
      check('[non-vacuity] rule ON (min_corr=2): the SAME fake bridge is REFUSED -> committed_fab == 0 (the rule is what defends)', (aOn.committed_fab.length + aOn.transit_committed_fab.length) === 0 && rOn.status !== 'PROVED');
    })();
    // (b) coop necessity is REAL: no single agent reaches the goal alone in PROVE
    (function () {
      var w = WORLDS['PROVE'](), r = coopProve(w.agents, w.start, w.goal, 'isa', { functional: true, minCorroboration: 2 });
      var anySolo = false; for (var nm in r.solo_reaches_goal) if (r.solo_reaches_goal[nm]) anySolo = true;
      check('[coop-necessary] PROVE: no single agent reaches the goal alone (cooperation genuinely required)', r.status === 'PROVED' && !anySolo && r.coop_necessary);
      check('[coop-depth] joint_depth (' + r.joint_depth + ') > max solo reach (' + r.max_solo_reach + ')', r.joint_depth > r.max_solo_reach);
    })();
    // (c) a lie ENTERED the dialogue (transit) but was NEVER committed (attempts allowed, commits refused)
    (function () {
      var w = WORLDS['BYZANTINE-inject'](), r = coopProve(w.agents, w.start, w.goal, 'isa', { functional: true, minCorroboration: 2 });
      var a = audit(r, w.sub, w.agents);
      check('[transit-not-commit] a fabrication was ATTEMPTED (fab_attempts>0) yet committed_fab==0', a.n_fab_attempts > 0 && a.committed_fab.length === 0);
      check('[DUF] depth-until-fabrication is infinite (no committed fabrication anywhere)', a.depth_until_fabrication === Infinity);
    })();

    // Part 3: the GAME ADAPTER over a FAKE store (isolated; mirrors GAME_KNOW._state() shape)
    (function () {
      // two witnessing pilots that each hold half a chain, overlapping on the middle so >=2 corroborate the joins
      // shared 'library' also holds two of the edges (a 2nd provenance) -> cross-tier corroboration
      var fake = {
        _state: function () {
          return {
            shared: { 'a|isa|b': { source: 'library', t: 'shared' }, 'c|isa|d': { source: 'library', t: 'shared' } },
            priv: {
              lyra: { 'a|isa|b': { source: 'witnessed', t: 'private' }, 'b|isa|c': { source: 'witnessed', t: 'private' }, 'c|isa|d': { source: 'witnessed', t: 'private' } },
              crux: { 'b|isa|c': { source: 'witnessed', t: 'private' }, 'c|isa|d': { source: 'witnessed', t: 'private' }, 'd|isa|e': { source: 'witnessed', t: 'private' } },
              spica: { 'd|isa|e': { source: 'witnessed', t: 'private' } }
            }
          };
        },
        know: function () { return { edges: [{ s: 'a', r: 'isa', o: 'b' }, { s: 'b', r: 'isa', o: 'c' }, { s: 'c', r: 'isa', o: 'd' }, { s: 'd', r: 'isa', o: 'e' }] }; }
      };
      API._setTestStore(fake);
      var ags = agentsFromStore('isa');
      check('[adapter] partitions the fake store into provenance-distinct agents (>=2)', ags && ags.length >= 2);
      var r = prove('a', 'e', 'isa');
      // a->b (library+lyra=2), b->c (lyra+crux=2), c->d (library+lyra+crux>=2), d->e (crux+spica=2) -> all corroborated
      check('[adapter] PROVES a->e over the store (every hop >=2 provenance-distinct)', r.status === 'PROVED' && r.chain && r.chain.length === 4);
      var rGap = prove('a', 'z', 'isa');
      check('[adapter] ABSTAINS honestly on an unreachable goal (a->z)', rGap.status === 'ABSTAIN' || rGap.status === 'UNRESOLVED');
      // single-source honesty: a store where d->e is held by ONLY ONE agent -> that hop cannot corroborate
      var fake2 = { _state: function () { return { shared: {}, priv: { lyra: { 'a|isa|b': { source: 'w' }, 'b|isa|c': { source: 'w' } }, crux: { 'a|isa|b': { source: 'w' }, 'b|isa|c': { source: 'w' }, 'c|isa|d': { source: 'w' } } } }; }, know: function () { return { edges: [] }; } };
      API._setTestStore(fake2);
      var r2 = prove('a', 'd', 'isa');
      check('[adapter] single-source hop (c->d held by ONE agent) -> not PROVED (honest UNRESOLVED/ABSTAIN)', r2.status !== 'PROVED');
      var r3 = prove('a', 'c', 'isa');
      check('[adapter] the >=2-corroborated prefix a->c still PROVES', r3.status === 'PROVED');
      // corroboration coverage: in fake2 (a->b, b->c held by 2 agents; c->d by 1) exactly 2 of 3 edges corroborate
      API._setTestStore(fake2);
      var cs = corroborationStats('isa');
      check('[adapter] corroborationStats counts the >=2-held edges (2 of 3 corroborated, coverage 0.667)', cs.corroboratedEdges === 2 && cs.totalEdges === 3 && cs.coverage === 0.667);
      API._setTestStore(null);                             // scrub the test store
    })();

    console.log('---');
    console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
    console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
    if (fail > 0) process.exit(1);
  }
})();
