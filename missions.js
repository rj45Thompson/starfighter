// =================================================================================================
// missions.js - RANGER COMMAND mission board (Space Rangers flavored) for starfighter.html.
// Rangers fight for planets and systems: Ranger Command posts contracts gated by your ranger rank.
//
// Exports exactly one global: window.MISSIONS
//   MISSIONS.init()                      - call once after boot (safe to skip; module stays inert)
//   MISSIONS.tick(dt)                    - call every frame (cheap; heavy checks ~1/s)
//   MISSIONS.board()                     - HTML string for the terminal / planet menu
//   MISSIONS.accept(idx)                 - idx is the 1-based number shown on the board -> {ok,msg}
//   MISSIONS.abandon()                   - drop the active contract -> {ok,msg}
//   MISSIONS.active()                    - the active mission object (read-only) or null
//   MISSIONS.onKill(victim,killer)       - host calls on any ship kill (BOUNTY)
//   MISSIONS.onAwayVictory(planet)       - host calls after a ground-battle win (LIBERATE)
//   MISSIONS.onStrongholdDown()          - host calls when the Hegemon stronghold dies (ASSAULT)
//   MISSIONS.onDock(planet)              - host calls when the PLAYER docks (SUPPLY/PATROL assist)
// All hooks are idempotent and defensive: missing HOST fields degrade silently, never throw.
// Uses ONLY live window.HOST data (real planet/pirate/trader names); targets that die or planets
// that flip before completion auto-resolve the contract gracefully (no penalty).
// =================================================================================================
'use strict';
(function () {
  var W = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});

  // ------------------------------------------------------------------ CFG (all tunables live here)
  var CFG = {
    BOARD_N: 4,                  // max postings on the board
    REFRESH_S: 120,              // board regenerates every this many game-seconds (HOST.T0)
    HEAVY_TICK_S: 1.0,           // heavy mission checks run on this cadence inside tick(dt)
    MAX_DT_S: 2.0,               // dt clamp (tab-hidden frame jumps)
    MISSION_BASE_REWARD: 90,     // credits = MISSION_BASE_REWARD * (1+rank) * type-mult
    SCORE_BASE: 3,               // score  = SCORE_BASE * (1+rank)
    REP_BASE: 0.8,               // rep    = REP_BASE * (1+rank) at the relevant planet
    // per-type reward multipliers
    MULT_PATROL: 1.0, MULT_ESCORT: 1.2, MULT_BOUNTY: 1.35,
    MULT_LIBERATE: 1.5, MULT_SUPPLY: 1.7, MULT_ASSAULT: 1.6,
    // per-type rank gates (index into HOST.RANKS)
    RANK_PATROL: 0, RANK_ESCORT: 1, RANK_BOUNTY: 1,
    RANK_LIBERATE: 2, RANK_SUPPLY: 2, RANK_ASSAULT: 3,
    // PATROL
    PATROL_MIN_PLANETS: 2,       // prefer systems with at least this many worlds
    PATROL_MAX_PLANETS: 3,       // survey at most this many worlds per patrol
    PATROL_VISIT_PAD_U: 12,      // visited when dist < planet.radius + DOCK_R + this pad
    // ESCORT
    ESCORT_RADIUS_U: 400,        // stay within this range of the trader
    ESCORT_DOCKS_NEEDED: 2,      // dockings to credit before the contract completes
    // SUPPLY
    SUPPLY_N_MIN: 8, SUPPLY_N_MAX: 16,   // units to deliver (cumulative across trips)
    SUPPLY_CHEAP_BASE_MAX: 30,   // prefer goods with base price at or under this (affordable runs)
    // resolution / notification pacing
    VOID_GRACE_S: 5,             // target missing this long without a hook -> auto-resolve
    NOTICE_CD_S: 20,             // min seconds between repeat advisory notices (too-far / empty-hold)
    MIN_UNLOCKED_ON_BOARD: 2,    // try to keep at least this many at-your-rank postings
    // fallbacks when HOST.CFG lacks a key
    FALLBACK_DOCK_R: 44,
    // UI palette (game style)
    COL_HEAD: '#8fd0ff', COL_GOOD: '#7fd0b0', COL_ERR: '#ff8a8a', COL_AMBER: '#ffd27a',
    COL_VIOLET: '#c9a0ff', COL_DIM: '#55677e', COL_TEXT: '#cfe0f0',
    PANEL_BG: 'rgba(9,15,25,.92)', PANEL_BORDER: '1px solid #24344a'
  };

  // ------------------------------------------------------------------ tiny defensive helpers
  function H() { return (W && W.HOST) ? W.HOST : null; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { return (typeof v === 'string' && v.length) ? v : (d || ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a.length ? a[ri(0, a.length - 1)] : null; }
  function shuffle(a) { var c = a.slice(); for (var i = c.length - 1; i > 0; i--) { var j = ri(0, i), t = c[i]; c[i] = c[j]; c[j] = t; } return c; }
  function hcfg(k, d) { var h = H(); var c = (h && h.CFG) ? h.CFG : null; return (c && typeof c[k] === 'number') ? c[k] : d; }
  function player() { var h = H(); if (!h) return null; if (h.P) return h.P; var ss = arr(h.ships); return ss.length ? ss[0] : null; }
  function now() { var h = H(); return (h && typeof h.T0 === 'number' && isFinite(h.T0)) ? h.T0 : innerClock; }
  function dist(a, b) {
    if (!a || !b) return Infinity;
    if (typeof a.distanceTo === 'function') { try { return a.distanceTo(b); } catch (e) { } }
    var dx = num(a.x, 0) - num(b.x, 0), dy = num(a.y, 0) - num(b.y, 0), dz = num(a.z, 0) - num(b.z, 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function holdOf(s) { if (!s) return null; if (s.hold && typeof s.hold === 'object') return s.hold; if (s.cargo && typeof s.cargo === 'object') return s.cargo; return null; }
  function notify(html, lvl) { var h = H(); if (h && typeof h.notify === 'function') { try { h.notify(html, lvl || 'log'); } catch (e) { } } }
  function sound(n) { var h = H(); if (h && typeof h.sound === 'function') { try { h.sound(n); } catch (e) { } } }
  function planetByName(n) {
    var h = H(); if (!h || !n) return null;
    if (typeof h.planetByName === 'function') { try { var p = h.planetByName(n); if (p) return p; } catch (e) { } }
    var ps = arr(h.planets); for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].name === n) return ps[i];
    return null;
  }
  function planetLive(p) { var h = H(); return !!(h && p && arr(h.planets).indexOf(p) >= 0); }
  function shipLive(s) { var h = H(); return !!(h && s && s.alive !== false && arr(h.ships).indexOf(s) >= 0); }
  function isPlayer(s) { var p = player(); return !!(s && (s === p || s.role === 'player')); }
  function sysName(p) { return (p && p.system && str(p.system.name)) ? p.system.name : ''; }
  function goodByKey(k) { var h = H(); var gs = h ? arr(h.GOODS) : []; for (var i = 0; i < gs.length; i++) if (gs[i] && gs[i].k === k) return gs[i]; return null; }

  // ranks: contract says HOST.RANKS = [{n,score}...]; the game source uses {n,pts}. Read both.
  function ranks() { var h = H(); return h ? arr(h.RANKS) : []; }
  function rankScoreOf(r) { if (!r) return 0; if (typeof r.score === 'number') return r.score; if (typeof r.pts === 'number') return r.pts; return 0; }
  function rankName(i) { var rs = ranks(); if (!rs.length) return 'rank ' + i; var j = Math.max(0, Math.min(i, rs.length - 1)); return str(rs[j] && rs[j].n, 'rank ' + i); }
  function playerRankIdx() {
    var p = player(), sc = p ? num(p.score, 0) : 0, rs = ranks(), idx = 0;
    for (var i = 0; i < rs.length; i++) if (sc >= rankScoreOf(rs[i])) idx = i;
    return idx;
  }

  // ------------------------------------------------------------------ module state
  var inited = false;
  var innerClock = 0;            // fallback clock when HOST.T0 is missing
  var heavyAcc = 0;
  var board = [];                // posted (not yet accepted) missions
  var nextRefreshT = null;       // game-time of the next board refresh
  var activeM = null;            // the single active mission or null
  var seq = 1;

  function mkMission(type, rank, mult, title, desc, tgt) {
    var base = hcfg('MISSION_BASE_REWARD', CFG.MISSION_BASE_REWARD);
    var h = H(), p = player();
    var ldrLvl = (h && p && typeof h.skillLvl === 'function') ? num(h.skillLvl(p, 'leadership'), 0) : 0;
    var ldrMult = 1 + hcfg('SKILL_LEADERSHIP_REWARD', 0.05) * ldrLvl;   // SR-M17: leadership negotiates better contract terms
    return {
      id: seq++, type: type, rank: rank, title: title, desc: desc, tgt: tgt || {},
      reward: Math.round(base * (1 + rank) * mult * ldrMult),
      score: Math.round(CFG.SCORE_BASE * (1 + rank)),
      rep: CFG.REP_BASE * (1 + rank),
      prog: '', st: { done: false }
    };
  }

  // ------------------------------------------------------------------ generators (live HOST data only)
  function genPatrol(usedSys) {
    var h = H(); if (!h) return null;
    var sys = arr(h.systems).filter(function (s) { return s && arr(s.planets).length > 0 && !usedSys[str(s.name)]; });
    if (!sys.length) return null;
    var rich = sys.filter(function (s) { return arr(s.planets).length >= CFG.PATROL_MIN_PLANETS; });
    var hot = (rich.length ? rich : sys).filter(function (s) {
      return s.contested || arr(s.planets).some(function (p) { return p && p.underThreat; });
    });
    var s = pick(hot.length ? hot : (rich.length ? rich : sys)); if (!s) return null;
    usedSys[str(s.name)] = 1;
    var names = shuffle(arr(s.planets).filter(function (p) { return p && p.name; }).map(function (p) { return p.name; }))
      .slice(0, CFG.PATROL_MAX_PLANETS);
    if (!names.length) return null;
    return mkMission('PATROL', CFG.RANK_PATROL, CFG.MULT_PATROL,
      'PATROL: ' + str(s.name, 'frontier') + ' sweep',
      'Survey ' + names.length + ' world' + (names.length > 1 ? 's' : '') + ' of the ' + esc(str(s.name, '?')) +
      ' system (' + names.map(esc).join(', ') + ') - fly within dock range of each.',
      { systemName: str(s.name), planetNames: names, planetName: names[0] });
  }

  function genEscort(usedShip) {
    var h = H(); if (!h) return null;
    var p = player();
    var tr = arr(h.ships).filter(function (s) {
      return s && s !== p && s.alive !== false && s.team === 'squad' && s.role === 'trader' && !usedShip[str(s.name)];
    });
    if (!tr.length) tr = arr(h.ships).filter(function (s) {   // fallback: any squad AI wingman
      return s && s !== p && s.alive !== false && s.team === 'squad' && s.role !== 'player' && s.role !== 'defender' && !usedShip[str(s.name)];
    });
    var t = pick(tr); if (!t) return null;
    usedShip[str(t.name)] = 1;
    return mkMission('ESCORT', CFG.RANK_ESCORT, CFG.MULT_ESCORT,
      'ESCORT: cover ' + esc(str(t.name, 'the trader')),
      'The Free Traders asked for a Ranger escort. Stay within ' + CFG.ESCORT_RADIUS_U + 'u of ' +
      esc(str(t.name, '?')) + ' until it completes ' + CFG.ESCORT_DOCKS_NEEDED + ' dockings.',
      { shipRef: t, shipName: str(t.name) });
  }

  function genBounty(usedShip) {
    var h = H(); if (!h) return null;
    var pi = arr(h.ships).filter(function (s) { return s && s.alive !== false && s.team === 'pirate' && !usedShip[str(s.name)]; });
    var t = pick(pi); if (!t) return null;
    usedShip[str(t.name)] = 1;
    var near = null; if (typeof h.nearestPlanet === 'function' && t.pos) { try { near = h.nearestPlanet(t.pos); } catch (e) { } }
    var where = near ? (' - last seen near ' + esc(str(near.name, '?')) + (sysName(near) ? ' (' + esc(sysName(near)) + ')' : '')) : '';
    var tier = (typeof t.tier === 'number') ? (' [tier ' + (t.tier + 1) + ']') : '';
    return mkMission('BOUNTY', CFG.RANK_BOUNTY, CFG.MULT_BOUNTY,
      'BOUNTY: eliminate ' + esc(str(t.name, 'the marauder')),
      'Iron Synod raider ' + esc(str(t.name, '?')) + tier + ' is preying on free shipping' + where + '. Destroy it yourself - the kill must be yours.',
      { shipRef: t, shipName: str(t.name) });
  }

  function genLiberate(usedPlanet) {
    var h = H(); if (!h) return null;
    var ps = arr(h.planets).filter(function (p) { return p && p.hegemon && p.name && !usedPlanet[p.name]; });
    var p = pick(ps); if (!p) return null;
    usedPlanet[p.name] = 1;
    return mkMission('LIBERATE', CFG.RANK_LIBERATE, CFG.MULT_LIBERATE,
      'LIBERATE: ground assault on ' + esc(p.name),
      esc(p.name) + (sysName(p) ? ' (' + esc(sysName(p)) + ')' : '') +
      ' is under Iron Synod occupation. Fly there, land, and win the ground battle to free it.',
      { planetName: p.name });
  }

  function genSupply(usedPlanet) {
    var h = H(); if (!h) return null;
    var ps = arr(h.planets).filter(function (p) { return p && !p.hegemon && p.name && !usedPlanet[p.name]; });
    var hurting = ps.filter(function (p) { return p.underThreat || (p.system && p.system.contested); });
    var p = pick(hurting.length ? hurting : ps); if (!p) return null;
    usedPlanet[p.name] = 1;
    var goods = arr(h.GOODS).filter(function (g) { return g && g.k; });
    if (!goods.length) return null;
    var needKeys = (p.type && p.type.needs) ? Object.keys(p.type.needs) : [];
    var needGoods = goods.filter(function (g) { return needKeys.indexOf(g.k) >= 0; });
    var cheapNeeds = needGoods.filter(function (g) { return num(g.base, 0) <= CFG.SUPPLY_CHEAP_BASE_MAX; });
    var cheapAny = goods.filter(function (g) { return num(g.base, 0) <= CFG.SUPPLY_CHEAP_BASE_MAX; });
    var g = pick(cheapNeeds.length ? cheapNeeds : (needGoods.length ? needGoods : (cheapAny.length ? cheapAny : goods)));
    if (!g) return null;
    var n = ri(CFG.SUPPLY_N_MIN, CFG.SUPPLY_N_MAX);
    return mkMission('SUPPLY', CFG.RANK_SUPPLY, CFG.MULT_SUPPLY,
      'SUPPLY: relief run to ' + esc(p.name),
      'Deliver ' + n + ' units of ' + esc(str(g.n, g.k)) + ' to ' + esc(p.name) +
      (sysName(p) ? ' (' + esc(sysName(p)) + ')' : '') + ' - dock with the goods aboard (surrendered on delivery; multiple trips OK).',
      { planetName: p.name, goodKey: g.k, goodName: str(g.n, g.k), units: n });
  }

  function genAssault() {
    var h = H(); if (!h) return null;
    var hot = arr(h.systems).filter(function (s) { return s && s.contested; }).map(function (s) { return str(s.name, '?'); });
    var front = hot.length ? (' Front lines: ' + hot.map(esc).join(', ') + '.') : '';
    return mkMission('ASSAULT', CFG.RANK_ASSAULT, CFG.MULT_ASSAULT,
      'ASSAULT: break the Hegemon Stronghold',
      'Standing order for senior Rangers: when the Iron Synod raises a Stronghold, assault and destroy it.' + front + ' It is heavily armoured - bring the squad.',
      {});
  }

  function genBoard() {
    var usedShip = {}, usedPlanet = {}, usedSys = {};
    var cand = [];
    var passes = [
      [genPatrol, usedSys], [genEscort, usedShip], [genBounty, usedShip],
      [genLiberate, usedPlanet], [genSupply, usedPlanet], [genAssault, null],
      // second pass: extra variety if live data is thin
      [genBounty, usedShip], [genSupply, usedPlanet], [genPatrol, usedSys], [genEscort, usedShip]
    ];
    for (var i = 0; i < passes.length; i++) {
      if (cand.length >= CFG.BOARD_N * 2) break;
      var m = null; try { m = passes[i][0](passes[i][1] || {}); } catch (e) { m = null; }
      if (m) cand.push(m);
    }
    var pr = playerRankIdx();
    var unlocked = shuffle(cand.filter(function (m) { return m.rank <= pr; }));
    var locked = shuffle(cand.filter(function (m) { return m.rank > pr; }));
    var res = unlocked.slice(0, CFG.MIN_UNLOCKED_ON_BOARD);
    var rest = shuffle(unlocked.slice(CFG.MIN_UNLOCKED_ON_BOARD).concat(locked));
    while (res.length < CFG.BOARD_N && rest.length) res.push(rest.shift());
    res.sort(function (a, b) { return a.rank - b.rank; });
    return res;
  }

  function ensureBoard() {
    var t = now();
    if (nextRefreshT === null || t >= nextRefreshT || t < nextRefreshT - CFG.REFRESH_S * 2) {
      nextRefreshT = t + CFG.REFRESH_S;
      try { board = genBoard(); } catch (e) { board = []; }
    }
  }

  // ------------------------------------------------------------------ accept / abandon / resolve
  function validateFresh(m) {
    if (m.type === 'ESCORT' || m.type === 'BOUNTY') {
      if (!shipLive(m.tgt.shipRef)) return { ok: false, msg: 'contract void - ' + esc(m.tgt.shipName || 'the target') + ' is gone; posting pulled' };
    } else if (m.type === 'LIBERATE') {
      var p = planetByName(m.tgt.planetName);
      if (!p) return { ok: false, msg: 'contract void - ' + esc(m.tgt.planetName || 'the planet') + ' is gone; posting pulled' };
      if (!p.hegemon) return { ok: false, msg: 'contract void - ' + esc(p.name) + ' is already free; posting pulled' };
    } else if (m.type === 'SUPPLY') {
      var q = planetByName(m.tgt.planetName);
      if (!q) return { ok: false, msg: 'contract void - ' + esc(m.tgt.planetName || 'the planet') + ' is gone; posting pulled' };
      if (q.hegemon) return { ok: false, msg: 'contract void - ' + esc(q.name) + ' fell to the Synod; posting pulled' };
    } else if (m.type === 'PATROL') {
      var any = arr(m.tgt.planetNames).some(function (n) { return !!planetByName(n); });
      if (!any) return { ok: false, msg: 'contract void - the ' + esc(m.tgt.systemName || '?') + ' system is gone; posting pulled' };
    }
    return { ok: true, msg: '' };
  }

  function initState(m) {
    var t = now();
    m.st = { done: false, acceptedT: t, noticeT: {}, missingT: null };
    if (m.type === 'PATROL') { m.st.visited = {}; m.prog = 'surveyed 0/' + arr(m.tgt.planetNames).length; }
    else if (m.type === 'ESCORT') { m.st.docks = 0; m.st.wasDocked = !!(m.tgt.shipRef && m.tgt.shipRef.docked); m.prog = 'docks 0/' + CFG.ESCORT_DOCKS_NEEDED; }
    else if (m.type === 'BOUNTY') { m.prog = 'target at large'; }
    else if (m.type === 'LIBERATE') { m.prog = 'awaiting ground victory'; }
    else if (m.type === 'SUPPLY') { m.st.delivered = 0; m.prog = 'delivered 0/' + m.tgt.units; }
    else if (m.type === 'ASSAULT') { m.prog = 'stronghold not yet broken'; }
  }

  function accept(idx) {
    try {
      var i = (idx | 0) - 1;
      if (!board.length) return { ok: false, msg: 'no postings up - check the mission board' };
      if (i < 0 || i >= board.length) return { ok: false, msg: 'no such posting (1-' + board.length + ')' };
      if (activeM) return { ok: false, msg: 'already on assignment (' + activeM.title + ') - abandon it first' };
      var m = board[i];
      var pr = playerRankIdx();
      if (m.rank > pr) return { ok: false, msg: 'requires ' + rankName(m.rank) + ' rank (you are ' + rankName(pr) + ')' };
      var v = validateFresh(m);
      if (!v.ok) { board.splice(i, 1); return { ok: false, msg: v.msg }; }
      board.splice(i, 1);
      activeM = m; initState(m);
      notify('<b>RANGER COMMAND</b>: contract accepted - [' + esc(m.type) + '] ' + m.desc +
        ' Reward: ' + m.reward + 'c, +' + m.score + ' score.', 'flag');
      return { ok: true, msg: 'accepted: ' + m.title };
    } catch (e) { return { ok: false, msg: 'mission board offline' }; }
  }

  function abandon() {
    try {
      if (!activeM) return { ok: false, msg: 'no active contract' };
      var t = activeM.title; activeM.st.done = true; activeM = null;
      notify('<b>RANGER COMMAND</b>: contract abandoned - ' + esc(t) + '. The board will have more work.', 'flag');
      return { ok: true, msg: 'abandoned: ' + t };
    } catch (e) { return { ok: false, msg: 'mission board offline' }; }
  }

  function complete(m) {
    if (!m || m !== activeM || m.st.done) return;
    m.st.done = true; activeM = null;
    var h = H(), p = player(), repAt = null;
    if (p) {
      p.credits = num(p.credits, 0) + m.reward;
      p.score = num(p.score, 0) + m.score;
      p.missionsCompleted = num(p.missionsCompleted, 0) + 1;   // SR-M20: campaign-end score formula names "quests" as a component
      if (h && typeof h.checkRankUp === 'function') { try { h.checkRankUp(p); } catch (e) { } }
    }
    if (m.tgt.planetName) repAt = planetByName(m.tgt.planetName);
    if (!repAt && h && typeof h.nearestPlanet === 'function' && p && p.pos) { try { repAt = h.nearestPlanet(p.pos); } catch (e) { } }
    if (repAt && h && typeof h.repAdd === 'function') { try { h.repAdd(repAt, m.rep); } catch (e) { } }
    notify('<b>RANGER COMMAND</b>: contract COMPLETE - ' + m.title + ' | +' + m.reward + 'c, +' + m.score +
      ' score' + (repAt ? ', +standing at ' + esc(str(repAt.name, '?')) : '') + '. Good hunting, Ranger.', 'flag');
    sound('levelup');
  }

  function voidM(m, reason) {
    if (!m || m !== activeM || m.st.done) return;
    m.st.done = true; activeM = null;
    notify('<b>RANGER COMMAND</b>: contract closed - ' + reason + ' No penalty; new postings inbound.', 'flag');
  }

  function canNotice(m, key) {
    var t = now();
    if (m.st.noticeT[key] != null && t - m.st.noticeT[key] < CFG.NOTICE_CD_S) return false;
    m.st.noticeT[key] = t; return true;
  }

  // ------------------------------------------------------------------ progress checks
  function checkPatrol(m) {
    var p = player(); if (!p || !p.pos) return;
    var names = arr(m.tgt.planetNames), total = names.length, seen = 0, i;
    var dockR = hcfg('DOCK_R', CFG.FALLBACK_DOCK_R);
    for (i = 0; i < names.length; i++) {
      var n = names[i];
      if (m.st.visited[n]) { seen++; continue; }
      var pl = planetByName(n);
      if (!pl) { m.st.visited[n] = 1; seen++; continue; }   // world lost -> counts as resolved, mission stays winnable
      var r = num(pl.radius, 0) + dockR + CFG.PATROL_VISIT_PAD_U;
      if (dist(p.pos, pl.pos) <= r) {
        m.st.visited[n] = 1; seen++;
        m.prog = 'surveyed ' + seen + '/' + total;
        if (seen < total) notify('Patrol: ' + esc(n) + ' surveyed (' + seen + '/' + total + ').', 'log');
      }
    }
    if (seen >= total) complete(m);
  }

  function escortFrame(m) {           // cheap per-frame: dock-transition edge detect on a cached ref
    var tr = m.tgt.shipRef; if (!tr || tr.alive === false) return;
    var d = tr.docked || null;
    if (d && !m.st.wasDocked) {
      m.st.wasDocked = true;
      var p = player();
      var within = (p && p.pos && tr.pos) ? (dist(p.pos, tr.pos) <= CFG.ESCORT_RADIUS_U) : false;
      if (within) {
        m.st.docks++;
        m.prog = 'docks ' + m.st.docks + '/' + CFG.ESCORT_DOCKS_NEEDED;
        notify('Escort: ' + esc(str(tr.name, '?')) + ' docked safely at ' + esc(str(d.name, 'port')) +
          ' (' + m.st.docks + '/' + CFG.ESCORT_DOCKS_NEEDED + ').', 'log');
        if (m.st.docks >= CFG.ESCORT_DOCKS_NEEDED) complete(m);
      } else if (canNotice(m, 'far_dock')) {
        notify('Escort: ' + esc(str(tr.name, '?')) + ' docked but you were beyond ' + CFG.ESCORT_RADIUS_U + 'u - not credited.', 'log');
      }
    } else if (!d) m.st.wasDocked = false;
  }

  function checkEscort(m) {           // heavy: liveness + too-far advisory
    var tr = m.tgt.shipRef;
    if (!shipLive(tr)) {
      if (m.st.missingT == null) m.st.missingT = now();
      if (now() - m.st.missingT >= CFG.VOID_GRACE_S) voidM(m, 'trader ' + esc(str(m.tgt.shipName, '?')) + ' was lost.');
      return;
    }
    m.st.missingT = null;
    var p = player();
    if (p && p.pos && tr.pos && !tr.docked && dist(p.pos, tr.pos) > CFG.ESCORT_RADIUS_U && canNotice(m, 'far')) {
      notify('Escort: ' + esc(str(tr.name, '?')) + ' is ' + Math.round(dist(p.pos, tr.pos)) + 'u away - stay within ' + CFG.ESCORT_RADIUS_U + 'u.', 'log');
    }
  }

  function checkBounty(m) {
    var tr = m.tgt.shipRef;
    if (!shipLive(tr)) {                        // died without our onKill credit (or despawned)
      if (m.st.missingT == null) m.st.missingT = now();
      if (now() - m.st.missingT >= CFG.VOID_GRACE_S) voidM(m, 'bounty target ' + esc(str(m.tgt.shipName, '?')) + ' was destroyed by another pilot.');
    } else m.st.missingT = null;
  }

  function checkLiberate(m) {
    var p = planetByName(m.tgt.planetName);
    if (!p) { voidM(m, esc(str(m.tgt.planetName, 'the planet')) + ' no longer exists.'); return; }
    if (!p.hegemon) {                           // flipped without our away-victory hook
      if (m.st.missingT == null) m.st.missingT = now();
      if (now() - m.st.missingT >= CFG.VOID_GRACE_S) voidM(m, esc(p.name) + ' was liberated by other means.');
    } else m.st.missingT = null;
  }

  function deliverSupply(m, planet) {
    if (!m || m.type !== 'SUPPLY' || m.st.done || !planet || planet.name !== m.tgt.planetName) return;
    var p = player(), hold = holdOf(p); if (!p || !hold) return;
    var gk = m.tgt.goodKey, have = num(hold[gk], 0);
    var need = m.tgt.units - m.st.delivered;
    var take = Math.min(have, need);
    if (take > 0) {
      hold[gk] = have - take; if (hold[gk] <= 0) delete hold[gk];
      if (planet.stock && typeof planet.stock === 'object') planet.stock[gk] = num(planet.stock[gk], 0) + take;
      m.st.delivered += take;
      m.prog = 'delivered ' + m.st.delivered + '/' + m.tgt.units;
      if (m.st.delivered >= m.tgt.units) { complete(m); return; }
      notify('Supply: ' + take + ' ' + esc(m.tgt.goodName) + ' offloaded at ' + esc(planet.name) +
        ' (' + m.st.delivered + '/' + m.tgt.units + ').', 'log');
    } else if (canNotice(m, 'empty')) {
      notify('Supply: docked at ' + esc(planet.name) + ' with no ' + esc(m.tgt.goodName) + ' aboard - ' +
        (m.tgt.units - m.st.delivered) + ' still needed.', 'log');
    }
  }

  function checkSupply(m) {
    var p = planetByName(m.tgt.planetName);
    if (!p) { voidM(m, esc(str(m.tgt.planetName, 'the planet')) + ' no longer exists.'); return; }
    if (p.hegemon) { voidM(m, esc(p.name) + ' fell to the Synod - the relief run is off.'); return; }
    var pl = player();
    if (pl && pl.docked === p) deliverSupply(m, p);   // poll too, in case onDock is not wired
  }

  function heavy() {
    ensureBoard();
    var m = activeM; if (!m || m.st.done) return;
    if (m.type === 'PATROL') checkPatrol(m);
    else if (m.type === 'ESCORT') checkEscort(m);
    else if (m.type === 'BOUNTY') checkBounty(m);
    else if (m.type === 'LIBERATE') checkLiberate(m);
    else if (m.type === 'SUPPLY') checkSupply(m);
    // ASSAULT resolves only via onStrongholdDown()
  }

  // ------------------------------------------------------------------ board HTML
  function rowHtml(m, i, pr) {
    var locked = m.rank > pr;
    var col = locked ? CFG.COL_DIM : CFG.COL_TEXT;
    var tag = '<span style="color:' + (locked ? CFG.COL_DIM : CFG.COL_AMBER) + '">[RANK ' + m.rank + ' - ' + esc(rankName(m.rank)) + ']</span>';
    var pay = '<span style="color:' + (locked ? CFG.COL_DIM : CFG.COL_GOOD) + '">+' + m.reward + 'c +' + m.score + ' score +rep</span>';
    var lockNote = locked ? ' <span style="color:' + CFG.COL_ERR + '">- requires ' + esc(rankName(m.rank)) + '</span>' : '';
    return '<div style="color:' + col + ';margin:3px 0">[' + (i + 1) + '] ' + tag + ' <b>' + m.title + '</b>' + lockNote +
      '<br><span style="opacity:.85;margin-left:14px">' + m.desc + '</span> ' + pay + '</div>';
  }

  function boardHtml() {
    try {
      var h = H();
      if (!h) return '<div style="color:' + CFG.COL_ERR + '">RANGER COMMAND uplink offline.</div>';
      ensureBoard();
      var pr = playerRankIdx();
      var left = Math.max(0, Math.round(nextRefreshT - now()));
      var out = '<div style="background:' + CFG.PANEL_BG + ';border:' + CFG.PANEL_BORDER + ';border-radius:5px;padding:8px 10px;font-family:ui-monospace,monospace">';
      out += '<div style="color:' + CFG.COL_HEAD + ';font-weight:700">RANGER COMMAND - MISSION BOARD</div>';
      out += '<div style="color:' + CFG.COL_DIM + ';margin:2px 0 6px 0">clearance: <b style="color:' + CFG.COL_AMBER + '">' +
        esc(rankName(pr)) + '</b> (rank ' + pr + ') | new postings in ' + left + 's | rangers fight for planets and systems</div>';
      if (activeM) {
        out += '<div style="color:' + CFG.COL_VIOLET + ';margin:2px 0 6px 0">ACTIVE: <b>' + activeM.title + '</b> - ' +
          esc(str(activeM.prog, 'underway')) + ' <span style="color:' + CFG.COL_DIM + '">(abandon to drop)</span></div>';
      }
      if (!board.length) out += '<div style="color:' + CFG.COL_DIM + '">No postings right now - check back after the next refresh.</div>';
      for (var i = 0; i < board.length; i++) out += rowHtml(board[i], i, pr);
      out += '<div style="color:' + CFG.COL_DIM + ';margin-top:6px">accept &lt;n&gt; to take a contract - one active at a time</div>';
      out += '</div>';
      return out;
    } catch (e) { return '<div style="color:' + CFG.COL_ERR + '">RANGER COMMAND board glitched - try again.</div>'; }
  }

  // ------------------------------------------------------------------ host-wired hooks (idempotent)
  function onKill(victim, killer) {
    try {
      var m = activeM; if (!m || m.type !== 'BOUNTY' || m.st.done || !victim) return;
      var isTarget = (victim === m.tgt.shipRef) ||
        (victim.team === 'pirate' && str(victim.name) !== '' && victim.name === m.tgt.shipName);
      if (!isTarget) return;
      if (killer && isPlayer(killer)) complete(m);
      else voidM(m, 'bounty target ' + esc(str(m.tgt.shipName, '?')) + ' was destroyed by another pilot.');
    } catch (e) { }
  }

  function onAwayVictory(planet) {
    try {
      var m = activeM; if (!m || m.type !== 'LIBERATE' || m.st.done) return;
      var nm = (typeof planet === 'string') ? planet : (planet && planet.name);
      if (nm && nm === m.tgt.planetName) complete(m);
    } catch (e) { }
  }

  function onStrongholdDown() {
    try {
      var m = activeM; if (!m || m.type !== 'ASSAULT' || m.st.done) return;
      complete(m);
    } catch (e) { }
  }

  function onDock(planet) {
    try {
      var m = activeM; if (!m || m.st.done || !planet) return;
      if (m.type === 'SUPPLY') deliverSupply(m, planet);
      else if (m.type === 'PATROL') checkPatrol(m);       // docking definitely counts as a visit
    } catch (e) { }
  }

  // ------------------------------------------------------------------ lifecycle
  function init() {
    try {
      if (inited) return;
      inited = true;
      ensureBoard();
      notify('RANGER COMMAND uplink online - ' + board.length + ' contract' + (board.length === 1 ? '' : 's') + ' posted.', 'log');
    } catch (e) { }
  }

  function tick(dt) {
    try {
      if (!inited || !H()) return;
      var d = num(dt, 0); if (d < 0 || d > CFG.MAX_DT_S) d = 0;
      innerClock += d; heavyAcc += d;
      var m = activeM;
      if (m && !m.st.done && m.type === 'ESCORT') escortFrame(m);   // cheap edge-detect, cached ref
      if (heavyAcc >= CFG.HEAVY_TICK_S) { heavyAcc = 0; heavy(); }
    } catch (e) { }
  }

  // ------------------------------------------------------------------ export
  W.MISSIONS = {
    CFG: CFG,
    init: init,
    tick: tick,
    board: boardHtml,
    accept: accept,
    abandon: abandon,
    active: function () { return activeM; },
    onKill: onKill,
    onAwayVictory: onAwayVictory,
    onStrongholdDown: onStrongholdDown,
    onDock: onDock
  };
})();
