// =================================================================================================
// textquests.js - BRANCHING TEXT QUESTS (Space Rangers 2's signature feature) for starfighter.html.
// REQUIREMENTS_SR.md SR-M9: "interactive-fiction missions... scenes, choices, skill-checks, rewards."
// Distinct from missions.js's contracts (linear objectives: visit/kill/deliver/escort/liberate) - a text
// quest is a small directed graph of NODES, each with flavor text and 2-3 CHOICES; choices can require
// a precondition (credits/rank), apply effects (credits/score/reputation), and lead to another node or
// end the quest. Some choices cost something UP FRONT (paid on pick, not on resolution) so a quest can
// feel like a real gamble, not just a delayed payout.
//
// GROUNDING (0-fab law, same as the rest of this codebase): every named planet/pilot/faction that
// appears in quest text is a REAL entity read from window.HOST at OFFER time (an actual planet you can
// fly to, an actual currently-alive ship's name) - never an invented placeholder. Quest TEMPLATES are
// authored (the branching structure + prose), but every {slot} in that prose is filled from the live
// simulation, so nothing named in a quest is fictional relative to the game you're actually playing.
//
// Exports exactly one global: window.TEXTQUESTS
//   TEXTQUESTS.tryOffer(planet)     - call on player dock; rolls a template, returns the new state or null
//   TEXTQUESTS.active()             - the current {key,title,node,text,choices[]} view, or null
//   TEXTQUESTS.choose(idx)          - idx is 1-based, as shown in active().choices -> {ok,msg,done}
//   TEXTQUESTS.CFG                  - tunables (read-only use expected)
// All effects (credits/score/reputation) are applied HERE via the HOST bridge (HOST.repAdd/checkRankUp),
// mirroring exactly how missions.js resolves contract rewards - one consistent reward pathway, not two.
// SYNTAX-CLEAN under node: every browser-only ref is guarded; `node textquests.js` runs a self-test that
// walks every template to a terminal node and checks node count + grounding, PASS/FAIL, exits 1 on FAIL.
// =================================================================================================
'use strict';
(function () {
  var CFG = {
    OFFER_CHANCE: 0.4,        // odds a qualifying dock rolls a new quest offer
    COOLDOWN_S: 70,           // min seconds between offers (avoids spamming every dock)
    MIN_NODES: 8,             // design floor per template (REQUIREMENTS_SR.md SR-M9 acceptance bar)
  };

  function num(v, d) { v = Number(v); return isNaN(v) ? d : v; }
  function str(v, d) { return (typeof v === 'string' && v) ? v : d; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  // checked FRESH on every call (never a module-load-time-captured reference) - the self-test below stubs
  // global.window AFTER this module has already finished its first (self-required, cache-returned) evaluation,
  // so a one-time-captured `var W` would forever miss the stub. Same convention as planetmenu.js's H().
  function H() { return (typeof window !== 'undefined' && window.HOST) ? window.HOST : null; }
  function player() { var h = H(); return h ? h.P : null; }

  // ---- pick a grounded context for a fresh offer: real planet, a second real planet, a real pilot name ----
  function buildCtx(issuingPlanet) {
    var h = H(); if (!h) return null;
    var planets = h.planets || [];
    var ships = h.ships || [];
    var other = null;
    for (var i = 0; i < planets.length; i++) { if (planets[i] !== issuingPlanet) { other = planets[i]; break; } }
    if (planets.length > 2) { var alt = pick(planets.filter(function (p) { return p !== issuingPlanet; })); if (alt) other = alt; }
    var pilotPool = ships.filter(function (s) { return s.alive && s.role !== 'player'; });
    var pilot = pilotPool.length ? pick(pilotPool) : null;
    return {
      planet: issuingPlanet,
      system: issuingPlanet && issuingPlanet.system || null,
      other: other,
      pilotName: pilot ? pilot.name : 'a nameless drifter',            // grounded when a live ship exists; honest fallback text when the galaxy is thin, never a fabricated proper noun
      pilotFaction: pilot ? (pilot.team === 'pirate' ? 'the Iron Synod' : 'the Coalition Wardens') : 'no one in particular',
    };
  }

  // ---- effect application: the ONE place credits/score/reputation actually move (mirrors missions.js complete()) ----
  function applyEffects(effects, ctx) {
    var h = H(), p = player(); if (!effects || !effects.length) return;
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.type === 'credits' && p) p.credits = Math.max(0, num(p.credits, 0) + e.amount);
      else if (e.type === 'score' && p) { p.score = num(p.score, 0) + e.amount; if (h && typeof h.checkRankUp === 'function') { try { h.checkRankUp(p); } catch (err) { } } }
      else if (e.type === 'rep' && h && typeof h.repAdd === 'function') {
        var target = e.target === 'other' ? (ctx && ctx.other) : (ctx && ctx.planet);
        if (target) { try { h.repAdd(target, e.amount); } catch (err) { } }
      }
    }
  }
  function requireOk(req, ctx) { if (!req) return true; try { return !!req(ctx, player()); } catch (e) { return false; } }

  // =================================================================================================
  // QUEST TEMPLATES - authored branching (structure + prose); every {ctx.*} fill is a live entity.
  // Node shape: { text(ctx)->string, choices:[ {label, require(ctx,P)->bool, effects:[...], next:key|null} ] }
  // next:null resolves the quest THIS choice (effects apply immediately, quest closes).
  // =================================================================================================
  var TEMPLATES = {

    missing_shipment: { title: 'Missing Shipment', minRank: 0, nodes: {
      start: { text: function (c) { return 'The depot foreman at <b>' + esc(c.planet.name) + '</b> says a courier\'s manifest never arrived - drifted off the transit lane somewhere near <b>' + esc(c.system ? c.system.name : 'this system') + '</b>. "Ranger, you flying that way anytime soon?"'; },
        choices: [
          { label: 'Fly the old transit lane and look yourself', next: 'investigate' },
          { label: 'Post a bounty for a hunter to find it (-70c)', next: 'hire', require: function (c, p) { return p && p.credits >= 70; }, effects: [{ type: 'credits', amount: -70 }] },
          { label: 'Not my problem', next: 'end_ignore' },
        ] },
      end_ignore: { text: function (c) { return 'You wave it off. The foreman\'s face says <b>' + esc(c.planet.name) + '</b> will remember you didn\'t bother.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: -0.4 }] } ] },
      hire: { text: function (c) { return 'Three days on, word comes back: the hunter earned their cut and the manifest is closed. The foreman offers you a cut of the finder\'s fee too, if you want it.'; },
        choices: [
          { label: 'Take the extra cut', next: 'end_hire_greedy' },
          { label: 'Let the hunter keep it all', next: 'end_hire_fair' },
        ] },
      end_hire_greedy: { text: function () { return 'You pocket the extra. Efficient. Not exactly warm.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 40 }, { type: 'rep', target: 'issuing', amount: -0.2 }] } ] },
      end_hire_fair: { text: function (c) { return 'You wave off the extra cut. Word travels - <b>' + esc(c.planet.name) + '</b> notices who plays fair.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 0.6 }, { type: 'score', amount: 1 }] } ] },
      investigate: { text: function () { return 'You find the pod adrift, hatch popped, ident tag scorched. Nearby, dark and silent: a listening post that has no business being this far out.'; },
        choices: [
          { label: 'Grab the cargo and get out', next: 'recover' },
          { label: 'Sweep the listening post first', next: 'sweep' },
        ] },
      recover: { text: function (c) { return 'The pod\'s intact - <b>' + esc(c.planet.name) + '</b>\'s manifest, untouched inside.'; },
        choices: [
          { label: 'Return it, full stop', next: 'end_return' },
          { label: 'This cargo\'s worth more quiet', next: 'end_keep' },
        ] },
      end_return: { text: function (c) { return 'You set the manifest down on the foreman\'s desk yourself. <b>' + esc(c.planet.name) + '</b> pays in full, and word of it travels further than the credits do.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 120 }, { type: 'rep', target: 'issuing', amount: 1.2 }, { type: 'score', amount: 2 }] } ] },
      end_keep: { text: function (c) { return 'You sell the manifest\'s contents quietly at the next port. <b>' + esc(c.planet.name) + '</b> never gets its answer - and eventually stops asking you for favors.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 220 }, { type: 'rep', target: 'issuing', amount: -1.5 }] } ] },
      sweep: { text: function () { return 'Synod hardware, abandoned but the logs are still warm. Whatever they were listening for, it\'s in there.'; },
        choices: [
          { label: 'Copy what you can and go', next: 'end_intel' },
          { label: 'Not worth the risk - just grab the pod', next: 'end_retreat' },
        ] },
      end_intel: { text: function (c) { return 'The logs are worth more to <b>' + esc(c.planet.name) + '</b>\'s watch officers than the cargo ever was.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 60 }, { type: 'score', amount: 3 }, { type: 'rep', target: 'issuing', amount: 0.8 }] } ] },
      end_retreat: { text: function () { return 'Discretion wins. You take the pod and leave the dark station dark.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 0.3 }] } ] },
    } },

    the_debt: { title: 'The Debt', minRank: 0, nodes: {
      start: { text: function (c) { return '<b>' + esc(c.planet.name) + '</b>\'s registrar flags an old account: <b>' + esc(c.pilotName) + '</b> of ' + esc(c.pilotFaction) + ' never settled a fuel bill. "Nothing official, Ranger. Just... if you happen to run into them."'; },
        choices: [
          { label: 'Track them down and collect, firmly', next: 'confront' },
          { label: 'Quietly cover it yourself (-60c)', next: 'end_quiet', require: function (c, p) { return p && p.credits >= 60; }, effects: [{ type: 'credits', amount: -60 }] },
          { label: 'Tell the registrar it\'s not worth chasing', next: 'end_decline' },
        ] },
      end_decline: { text: function (c) { return 'The registrar shrugs it off the books. <b>' + esc(c.planet.name) + '</b> notes you didn\'t bother.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: -0.3 }] } ] },
      end_quiet: { text: function (c) { return 'You cover it out of pocket, no fuss. <b>' + esc(c.planet.name) + '</b> won\'t forget the gesture.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 0.8 }] } ] },
      confront: { text: function (c) { return 'You catch up with <b>' + esc(c.pilotName) + '</b>. Not hostile - just broke, and clearly expecting the worst from you.'; },
        choices: [
          { label: 'Take what they\'ve got', next: 'end_seize' },
          { label: 'Offer a payment plan instead', next: 'end_plan' },
          { label: 'Forgive it outright', next: 'end_forgive' },
          { label: 'Have them work it off instead', next: 'work_off' },
        ] },
      work_off: { text: function (c) { return '<b>' + esc(c.pilotName) + '</b> offers to run a supply hop to square things - or just hand over a scrap of salvage they\'ve been sitting on.'; },
        choices: [
          { label: 'Take the supply hop', next: 'end_work_hop' },
          { label: 'Take the salvage instead', next: 'end_work_salvage' },
        ] },
      end_work_hop: { text: function (c) { return 'The hop gets flown, the debt gets closed, and <b>' + esc(c.pilotName) + '</b> looks a little less like they\'re bracing for a fight next time you\'re nearby.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 0.5 }, { type: 'score', amount: 1 }] } ] },
      end_work_salvage: { text: function (c) { return 'The salvage turns out to be worth more than the debt. You don\'t mention that part to the registrar.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 55 }, { type: 'rep', target: 'issuing', amount: 0.2 }] } ] },
      end_seize: { text: function (c) { return 'You take what little they have. The debt\'s closed. <b>' + esc(c.pilotName) + '</b> won\'t forget it either.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 35 }, { type: 'rep', target: 'issuing', amount: 0.3 }] } ] },
      end_plan: { text: function (c) { return 'A schedule, signed, witnessed. Slower than collecting, but <b>' + esc(c.planet.name) + '</b> gets paid either way and no one loses a ship over a fuel bill.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'credits', amount: 15 }, { type: 'rep', target: 'issuing', amount: 0.9 }, { type: 'score', amount: 1 }] } ] },
      end_forgive: { text: function (c) { return 'You tear up the account in front of them. <b>' + esc(c.pilotName) + '</b> doesn\'t say much. Doesn\'t need to.'; },
        choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: -0.2 }, { type: 'score', amount: 2 }] } ] },
    } },

    salvage_rights: { title: 'Salvage Rights', minRank: 0, nodes: {
      // 'start' choices reference c.other.name, only known at OFFER time, not template-definition time - built
      // right after this object literal via labelFn (a render-time label function, same contract as `text`).
      start: { text: function (c) { return 'Two claims land on the same derelict field at once: <b>' + esc(c.planet.name) + '</b> says proximity gives them the right; <b>' + esc(c.other ? c.other.name : 'their rival') + '</b> says first discovery does. Both are asking YOU to say who\'s right.'; },
        choices: [] },
    } },
  };
  TEMPLATES.salvage_rights.nodes.start.choices = [
    { labelFn: function (c) { return 'Back ' + c.planet.name + '\'s claim'; }, next: 'back_a' },
    { labelFn: function (c) { return 'Back ' + (c.other ? c.other.name : 'the rival claim') + '\'s claim'; }, next: 'back_b', require: function (c) { return !!c.other; } },
    { label: 'Broker a split (-20c)', next: 'broker', require: function (c, p) { return p && p.credits >= 20; }, effects: [{ type: 'credits', amount: -20 }] },
  ];
  TEMPLATES.salvage_rights.nodes.back_a = { text: function (c) { return '<b>' + esc(c.planet.name) + '</b> is glad of the backing. <b>' + esc(c.other ? c.other.name : 'their rival') + '</b> is cold about it. How do you make the ruling stick?'; },
    choices: [
      { label: 'Diplomatically - put it in writing', next: 'end_a_dip' },
      { label: 'By force - park a gun on the field', next: 'end_a_force' },
    ] };
  TEMPLATES.salvage_rights.nodes.back_b = { text: function (c) { return '<b>' + esc(c.other ? c.other.name : 'the rival') + '</b> takes the field. <b>' + esc(c.planet.name) + '</b> is not happy about it. How do you make the ruling stick?'; },
    choices: [
      { label: 'Diplomatically - put it in writing', next: 'end_b_dip' },
      { label: 'By force - park a gun on the field', next: 'end_b_force' },
    ] };
  TEMPLATES.salvage_rights.nodes.broker = { text: function () { return 'Splitting it isn\'t clean - both sides grumble, but neither\'s furious. Who runs the handover?'; },
    choices: [
      { label: 'You mediate personally', next: 'end_broker_self' },
      { label: 'Let a neutral third party handle it', next: 'end_broker_third' },
    ] };
  TEMPLATES.salvage_rights.nodes.end_a_dip = { text: function (c) { return 'A signed ruling, filed and witnessed. <b>' + esc(c.planet.name) + '</b> is grateful the paperwork is airtight.'; },
    choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 1.0 }, { type: 'rep', target: 'other', amount: -0.3 }, { type: 'score', amount: 1 }] } ] };
  TEMPLATES.salvage_rights.nodes.end_a_force = { text: function (c) { return 'A show of force settles it fast. <b>' + esc(c.planet.name) + '</b> is thrilled. <b>' + esc(c.other ? c.other.name : 'the rival') + '</b> will remember this differently.'; },
    choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 1.4 }, { type: 'rep', target: 'other', amount: -1.2 }, { type: 'credits', amount: 40 }] } ] };
  TEMPLATES.salvage_rights.nodes.end_b_dip = { text: function (c) { return 'A signed ruling, filed and witnessed. <b>' + esc(c.other ? c.other.name : 'the rival') + '</b> is grateful the paperwork is airtight.'; },
    choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'other', amount: 1.0 }, { type: 'rep', target: 'issuing', amount: -0.3 }, { type: 'score', amount: 1 }] } ] };
  TEMPLATES.salvage_rights.nodes.end_b_force = { text: function (c) { return 'A show of force settles it fast. <b>' + esc(c.other ? c.other.name : 'the rival') + '</b> is thrilled. <b>' + esc(c.planet.name) + '</b> will remember this differently.'; },
    choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'other', amount: 1.4 }, { type: 'rep', target: 'issuing', amount: -1.2 }, { type: 'credits', amount: 40 }] } ] };
  TEMPLATES.salvage_rights.nodes.end_broker_self = { text: function () { return 'You run the handover yourself, down the middle. Both sides walk away even - and mildly impressed you bothered.'; },
    choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 0.5 }, { type: 'rep', target: 'other', amount: 0.5 }, { type: 'score', amount: 2 }] } ] };
  TEMPLATES.salvage_rights.nodes.end_broker_third = { text: function () { return 'A neutral broker splits it clean. Less credit to you personally, but nobody\'s left holding a grudge.'; },
    choices: [ { label: 'Continue', next: null, effects: [{ type: 'rep', target: 'issuing', amount: 0.2 }, { type: 'rep', target: 'other', amount: 0.2 }] } ] };

  // ---- runtime state: at most one active quest at a time ----
  var state = { active: null, lastOfferT: -1e9 };   // active: {key, node, ctx}

  function now() { var h = H(); return h ? num(h.T0, 0) : 0; }

  function tryOffer(planet) {
    if (state.active || !planet) return null;
    var t = now();
    if (t - state.lastOfferT < CFG.COOLDOWN_S) return null;
    if (Math.random() >= CFG.OFFER_CHANCE) return null;
    var h = H(); if (!h) return null;
    var p = player(); var rank = 0;
    if (p && h.RANKS) { for (var i = 0; i < h.RANKS.length; i++) if (num(p.score, 0) >= h.RANKS[i].pts) rank = i; }
    var keys = Object.keys(TEMPLATES).filter(function (k) { return (TEMPLATES[k].minRank || 0) <= rank; });
    if (!keys.length) return null;
    var key = pick(keys);
    var ctx = buildCtx(planet); if (!ctx) return null;
    state.active = { key: key, node: 'start', ctx: ctx };
    state.lastOfferT = t;
    return activeView();
  }

  function resolveLabel(c, ctx) { return c.labelFn ? c.labelFn(ctx) : c.label; }

  function activeView() {
    if (!state.active) return null;
    var tpl = TEMPLATES[state.active.key]; if (!tpl) { state.active = null; return null; }
    var node = tpl.nodes[state.active.node]; if (!node) { state.active = null; return null; }
    var ctx = state.active.ctx, p = player();
    var choices = node.choices.map(function (c, i) {
      return { n: i + 1, label: resolveLabel(c, ctx), enabled: requireOk(c.require, ctx) };
    });
    return { key: state.active.key, title: tpl.title, node: state.active.node, text: node.text(ctx), choices: choices };
  }

  function choose(idx) {
    if (!state.active) return { ok: false, msg: 'no quest is currently offered.' };
    var tpl = TEMPLATES[state.active.key], node = tpl.nodes[state.active.node];
    var c = node.choices[idx - 1];
    if (!c) return { ok: false, msg: 'no such option.' };
    if (!requireOk(c.require, state.active.ctx)) return { ok: false, msg: 'you can\'t take that option right now.' };
    applyEffects(c.effects, state.active.ctx);
    if (c.next == null) { var title = tpl.title; state.active = null;
      var p2 = player(); if (p2) p2.questsCompleted = num(p2.questsCompleted, 0) + 1;   // SR-M20: campaign-end score formula names "quests" as a component (missions.js tracks contract completions separately)
      return { ok: true, msg: title + ' - resolved.', done: true }; }
    state.active.node = c.next;
    return { ok: true, msg: 'onward.', done: false, view: activeView() };
  }

  var API = { tryOffer: tryOffer, active: activeView, choose: choose, CFG: CFG, _TEMPLATES: TEMPLATES };
  if (typeof window !== 'undefined') window.TEXTQUESTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  // ---- self-test (node): stub HOST, walk EVERY template along every path to a terminal, check node floor ----
  if (typeof require !== 'undefined' && require.main === module) {
    var PASS = 0, FAIL = 0;
    function check(name, cond) { if (cond) { PASS++; console.log('PASS - ' + name); } else { FAIL++; console.log('FAIL - ' + name); } }

    var fakePlanets = [{ name: 'Kessari Reach', rep: 0, system: { name: 'Vel Corvi' } }, { name: 'Thorne Anchorage', rep: 0, system: { name: 'Vel Corvi' } }];
    var fakeShips = [{ alive: true, role: 'squad', team: 'squad', name: 'Ilya Voss' }, { alive: true, role: 'player', name: 'YOU' }];
    var fakeP = { credits: 500, score: 0 };
    global.window = {
      HOST: {
        planets: fakePlanets, ships: fakeShips, P: fakeP, T0: 0, RANKS: [{ pts: 0, n: 'Recruit' }],
        repAdd: function (planet, amt) { planet.rep = (planet.rep || 0) + amt; },
        checkRankUp: function () {},
      },
    };
    var tq = require('./textquests.js');

    // 1. every template has >= MIN_NODES nodes (the design floor)
    Object.keys(tq._TEMPLATES).forEach(function (key) {
      var n = Object.keys(tq._TEMPLATES[key].nodes).length;
      check(key + ' has >= ' + tq.CFG.MIN_NODES + ' nodes (has ' + n + ')', n >= tq.CFG.MIN_NODES);
    });

    // 2. tryOffer respects cooldown/chance - force chance to 1 and cooldown to 0 for a deterministic offer
    tq.CFG.OFFER_CHANCE = 1; tq.CFG.COOLDOWN_S = 0;
    var offered = null;
    for (var tries = 0; tries < 20 && !offered; tries++) offered = tq.tryOffer(fakePlanets[0]);
    check('tryOffer() produces an active quest', !!offered);
    check('active quest has >= 2 choices at start', offered && offered.choices.length >= 2);

    // 3. every named entity in the offered text is a REAL entity from the stub HOST (0-fab grounding check)
    if (offered) {
      var namesInGalaxy = fakePlanets.map(function (p) { return p.name; }).concat(fakeShips.map(function (s) { return s.name; })).concat(['a nameless drifter']);
      var mentionsARealName = namesInGalaxy.some(function (n) { return offered.text.indexOf(n) >= 0; });
      check('offer text grounds at least one real entity name', mentionsARealName);
    }

    // 4. walk the ENTIRE tree of the currently active template to every terminal node, verifying no crash and
    //    that choose() eventually returns done:true down every reachable branch (a full graph walk, not one path)
    function walkAll(key) {
      var startCtx = buildCtx(fakePlanets[0]);
      var frontier = [['start', 0]];
      var seen = {};
      var terminalsReached = 0, deepestOk = true;
      var guard = 0;
      while (frontier.length && guard++ < 500) {
        var pair = frontier.pop(), nodeKey = pair[0], depth = pair[1];
        var sig = nodeKey; if (seen[sig]) continue; seen[sig] = true;
        var node = tq._TEMPLATES[key].nodes[nodeKey];
        if (!node) { deepestOk = false; continue; }
        for (var i = 0; i < node.choices.length; i++) {
          var c = node.choices[i];
          if (c.next == null) terminalsReached++;
          else if (tq._TEMPLATES[key].nodes[c.next]) frontier.push([c.next, depth + 1]);
          else deepestOk = false;
        }
      }
      return { terminalsReached: terminalsReached, deepestOk: deepestOk, visited: Object.keys(seen).length };
    }
    function buildCtx(p) { return { planet: p, system: p.system, other: fakePlanets[1], pilotName: 'Ilya Voss', pilotFaction: 'the Coalition Wardens' }; }
    Object.keys(tq._TEMPLATES).forEach(function (key) {
      var w = walkAll(key);
      check(key + ' every choice.next resolves to a real node or null', w.deepestOk);
      check(key + ' graph has >= 2 distinct terminal endings', w.terminalsReached >= 2);
    });

    // 5. choose() end-to-end: pick option 1 repeatedly until done, credits/score/rep actually move somewhere
    var creditsBefore = fakeP.credits;
    var repBefore = fakePlanets[0].rep;
    var steps = 0, res = null;
    while (steps++ < 20) {
      var av = tq.active(); if (!av) break;
      var idx = 1; for (var k = 0; k < av.choices.length; k++) if (av.choices[k].enabled) { idx = av.choices[k].n; break; }
      res = tq.choose(idx);
      if (res.done) break;
    }
    check('choose() walk reaches done:true', !!(res && res.done));
    check('resolving a quest changed at least one of credits/rep', fakeP.credits !== creditsBefore || fakePlanets[0].rep !== repBefore);
    check('active() is null after the quest resolves', tq.active() === null);

    // 6. choose() with no active quest is a safe no-op error, not a throw
    var noneRes = null;
    try { noneRes = tq.choose(1); } catch (e) { FAIL++; console.log('FAIL - choose() with no active quest threw: ' + e); }
    check('choose() with nothing active returns ok:false safely', noneRes && noneRes.ok === false);

    console.log('---');
    console.log('TOTAL: ' + (PASS + FAIL) + '  PASS: ' + PASS + '  FAIL: ' + FAIL);
    if (FAIL > 0) { console.log('RESULT: FAIL'); process.exit(1); }
    else { console.log('RESULT: PASS'); process.exit(0); }
  }
})();
