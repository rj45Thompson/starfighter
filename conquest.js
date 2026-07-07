// conquest.js -- capture-the-planet territory layer: flip worlds, defend them, 4X-style infrastructure.
//
// THE ASK (user, verbatim intent): "when you land and kill guys there doesn't seem to be much point.
// turn that planet to your side until the enemy sends ships to land and take it back - capture the flag.
// then you can land and add planetary defenses. make the menus explain how it works. planets have damage:
// when they die they produce fewer credits, trading is lost until infrastructure comes back (4X-style)."
//
// WHAT THIS MODULE OWNS
//   1) CAPTURE: onAwayVictory(planet) -- host calls it after a ground-battle win. The world flips to the
//      player (owner='player', hegemon off, rep floor), with a flag notify + levelup sting. Idempotent.
//   2) COUNTER-INVASION: tick(dt) runs a slow timer (~every SLOW_TICK_S of accumulated dt). Each
//      player-owned world rolls an ESCALATING chance that the Synod launches an invasion (alert notify
//      with ETA). When the ETA lapses: invasion strength (scales with HOST.campaign) vs defense level
//      (+NEAR_DEFENSE_BONUS if the player ship is within NEAR_RADIUS_U). Lose -> the world falls back to
//      the Synod (owner=null, hegemon=true, rep hostile). Win -> defenses hold (sometimes losing a level).
//   3) DEFENSES: addDefense(planet) buys one defense level (cost DEFENSE_COST_BASE*(level+1) credits,
//      max DEFENSE_MAX) on player-owned worlds. Returns {ok,msg}.
//   4) INFRASTRUCTURE: per-planet infra 0..1 (starts 1). damageInfra(p,amt) hurts it (invasions hurt it
//      either way); it regens slowly toward 1. infraMult(p) = INFRA_FLOOR + (1-INFRA_FLOOR)*infra is the
//      host's production/trade multiplier -- a dead world still trickles, never zero.
//   Per-planet state lives on planet._cq = { defense:0..5, invasion:{eta,strength}|null, infra:0..1 }.
//
// PUBLIC API (window.CONQUEST):
//   init()               -- once at boot (idempotent; module is safe even if never called)
//   tick(dt)             -- every frame; fast path is one add+compare, real work on the slow timer
//   onAwayVictory(p)     -- host hook: ground battle on p was WON by the player
//   addDefense(p)        -- buy one defense level -> {ok,msg}
//   describe(p)          -- short HTML status block for menus (owner / pips / infra / countdown / how-to)
//   damageInfra(p,amt)   -- 4X damage: bombardment, battles, events (clamped 0..1)
//   infraMult(p)         -- production multiplier 0.15..1 for the host economy
//   ownerOf(p)           -- 'player' | 'synod' | 'coalition'   (planetmenu.js compatibility)
//   defenseOf(p)         -- defense level 0..DEFENSE_MAX        (planetmenu.js compatibility)
//
// HOST WIRING (starfighter.html):
//   <script src="conquest.js"></script>          after the other module tags
//   CONQUEST.init()                              once at boot, after window.HOST exists
//   CONQUEST.tick(dt)                            in the frame loop
//   CONQUEST.onAwayVictory(planet)               where the AWAY ground battle resolves a player win
//   CONQUEST.infraMult(planet)                   multiply into credit production / trade stock ticks
//   (planetmenu.js already consumes describe/addDefense/ownerOf/defenseOf on its own)
//
// Reads window.HOST only; every access is defensive (missing fields degrade silently, nothing throws --
// even if window.HOST never appears). Plain JS, ASCII only, node --check clean. Runs its own 10-assertion
// smoke test under `node conquest.js`. Exports exactly one global: window.CONQUEST.
'use strict';
(function () {

// ---------------------------------------------------------------- CFG (every tunable named; no magic numbers in logic)
var CFG = {
  // cadence
  SLOW_TICK_S: 3,                // accumulated-dt period between conquest updates (the "slow timer")
  DT_MAX_S: 5,                   // clamp a single tick's dt (tab-switch spikes do not fast-forward the war)
  // capture
  CAPTURE_REP_MIN: 2,            // rep floor granted when a world is secured
  REP_FALLEN: -7,                // rep after the Synod retakes a world (hostile: no dock/fuel/repair)
  // defenses
  DEFENSE_COST_BASE: 400,        // credits; level N costs DEFENSE_COST_BASE * N
  DEFENSE_MAX: 5,                // defense levels cap (also the pip count in describe())
  DEFENSE_ATTRITION_CHANCE: 0.35,// chance a WON defense loses one level in the fighting
  NEAR_RADIUS_U: 800,            // player ship within this range of the planet helps the defense
  NEAR_DEFENSE_BONUS: 2,         // flat defense bonus while the player is near
  // counter-invasion
  INV_CHANCE_BASE: 0.02,         // launch chance per slow tick per owned world, at threat 0
  INV_CHANCE_RAMP: 0.012,        // extra launch chance per accumulated threat step (escalates over time)
  INV_CHANCE_MAX: 0.25,          // launch chance ceiling per slow tick
  INV_ETA_MIN_S: 20,             // minimum warning time before the landing resolves
  INV_ETA_RAND_S: 25,            // additional random warning time
  INV_STR_BASE: 1,               // invasion strength floor
  INV_STR_PER_CAMPAIGN: 0.75,    // strength added per HOST.campaign level (the war escalates)
  INV_STR_RAND: 1.5,             // random strength spread
  INVASION_INFRA_DMG: 0.25,      // infra damage when an invasion resolves (either outcome -- battles scar)
  // infrastructure (4X damage model)
  INFRA_REGEN: 0.01,             // infra regained per INFRA_REGEN_PERIOD_S, toward 1
  INFRA_REGEN_PERIOD_S: 2,       // seconds per regen step
  INFRA_FLOOR: 0.15,             // production multiplier floor -- a dead world still trickles
  INFRA_LOW: 0.5,                // below this: DAMAGED warning + one-shot "crippled" notify
  INFRA_OK: 0.9,                 // back above this: one-shot "restored" notify
  // menu colors (describe())
  COL_PLAYER: '#c9a0ff',         // YOURS - violet
  COL_SYNOD: '#ff8a8a',          // SYNOD - red
  COL_NEUTRAL: '#9aa7b3',        // coalition/neutral - grey
  // glyphs (kept as escapes so the file stays ASCII)
  PIP_FULL: '\u25a0',            // filled defense pip (black square)
  PIP_EMPTY: '\u25a1',           // empty defense pip (white square)
  DOT: '\u00b7'                  // separator dot in the how-it-works line
};

// ---------------------------------------------------------------- module state + tiny helpers
var G = (typeof window !== 'undefined' && window) ? window
      : (typeof globalThis !== 'undefined' ? globalThis : {});
var acc = 0;                     // accumulated dt toward the next slow tick

function host() {
  try {
    var g = (typeof window !== 'undefined' && window) ? window : G;
    return (g && g.HOST) ? g.HOST : null;
  } catch (e) { return null; }
}
function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function nameOf(p) { return (p && p.name) ? String(p.name) : 'the world'; }
function notify(html, kind) {
  try { var H = host(); if (H && typeof H.notify === 'function') H.notify(html, kind); } catch (e) {}
}
function sound(n) {
  try { var H = host(); if (H && typeof H.sound === 'function') H.sound(n); } catch (e) {}
}

// lazy per-planet conquest state -- planet._cq = {defense, invasion, infra} (+ internal threat/lowNoted)
function cq(p) {
  if (!p._cq) p._cq = { defense: 0, invasion: null, infra: 1, threat: 0, lowNoted: false };
  return p._cq;
}
function ownerKind(p) {
  if (!p) return 'coalition';
  if (p.owner === 'player') return 'player';
  if (p.hegemon) return 'synod';
  return 'coalition';
}
function playerNear(H, p) {
  try {
    var P = H.P;
    if (!P || !P.pos || !p || !p.pos || typeof p.pos.distanceTo !== 'function') return false;
    return p.pos.distanceTo(P.pos) <= CFG.NEAR_RADIUS_U;
  } catch (e) { return false; }
}

// ---------------------------------------------------------------- infrastructure (4X damage model)
function infraCross(p, c) {
  if (!c.lowNoted && c.infra < CFG.INFRA_LOW) {
    c.lowNoted = true;
    notify(nameOf(p) + ' infrastructure crippled - output falling', 'log');
  } else if (c.lowNoted && c.infra > CFG.INFRA_OK) {
    c.lowNoted = false;
    notify(nameOf(p) + ' infrastructure restored - output back to full', 'log');
  }
}
function hurtInfra(p, amt) {
  var c = cq(p);
  c.infra = clamp(c.infra - num(amt, 0), 0, 1);
  infraCross(p, c);
}
function regenInfra(p, c, elapsed) {
  if (c.infra >= 1) return;
  c.infra = clamp(c.infra + CFG.INFRA_REGEN * (elapsed / CFG.INFRA_REGEN_PERIOD_S), 0, 1);
  infraCross(p, c);
}

// ---------------------------------------------------------------- counter-invasion
function maybeLaunch(H, p, c) {
  var chance = CFG.INV_CHANCE_BASE + c.threat * CFG.INV_CHANCE_RAMP;
  if (chance > CFG.INV_CHANCE_MAX) chance = CFG.INV_CHANCE_MAX;
  c.threat += 1;                                          // the longer you hold it, the hotter it gets
  if (Math.random() >= chance) return;
  var eta = CFG.INV_ETA_MIN_S + Math.random() * CFG.INV_ETA_RAND_S;
  var strength = CFG.INV_STR_BASE
               + num(H.campaign, 1) * CFG.INV_STR_PER_CAMPAIGN
               + Math.random() * CFG.INV_STR_RAND;
  c.invasion = { eta: eta, strength: strength };
  notify('SYNOD INVASION FORCE en route to ' + nameOf(p) + ' - ETA ' + Math.round(eta)
       + 's. Defenses lvl ' + c.defense + ' will resist; reinforce or be there.', 'alert');
}
function progressInvasion(H, p, c, elapsed) {
  c.invasion.eta -= elapsed;
  if (c.invasion.eta > 0) return;
  var strength = num(c.invasion.strength, 0);
  c.invasion = null;
  c.threat = 0;
  var power = c.defense + (playerNear(H, p) ? CFG.NEAR_DEFENSE_BONUS : 0);
  hurtInfra(p, CFG.INVASION_INFRA_DMG);                   // the landing scars the world either way
  if (power >= strength) {
    var msg = nameOf(p) + ' HELD - defense grid repelled the Synod landing.';
    if (c.defense > 0 && Math.random() < CFG.DEFENSE_ATTRITION_CHANCE) {
      c.defense -= 1;
      msg += ' One defense battery was destroyed (' + c.defense + '/' + CFG.DEFENSE_MAX + ' left).';
    }
    notify(msg, 'flag');
  } else {
    p.owner = null;
    p.hegemon = true;
    p.rep = CFG.REP_FALLEN;
    c.defense = 0;
    notify(nameOf(p) + ' HAS FALLEN - Synod garrison holds it (no dock/fuel/repair). '
         + 'Land and win a ground battle to retake it.', 'alert');
  }
}
function slowTick(H, elapsed) {
  var pl = H.planets;
  if (!pl || typeof pl.length !== 'number') return;
  for (var i = 0; i < pl.length; i++) {
    var p = pl[i];
    if (!p) continue;
    if (p._cq) regenInfra(p, p._cq, elapsed);             // only worlds already touched by the war
    if (p.owner !== 'player') continue;
    var c = cq(p);
    if (c.invasion) progressInvasion(H, p, c, elapsed);
    else maybeLaunch(H, p, c);
  }
}

// ---------------------------------------------------------------- public API
var API = {
  CFG: CFG,

  init: function () { acc = 0; return true; },

  tick: function (dt) {
    try {
      var H = host();
      if (!H) return;
      var d = num(dt, 0);
      if (d <= 0) return;
      if (d > CFG.DT_MAX_S) d = CFG.DT_MAX_S;
      acc += d;
      if (acc < CFG.SLOW_TICK_S) return;                  // fast path ends here (<0.2ms)
      var elapsed = acc;
      acc = 0;
      slowTick(H, elapsed);
    } catch (e) {}
  },

  onAwayVictory: function (p) {
    try {
      var H = host();
      if (!H || !p) return;
      if (p.owner === 'player') { cq(p); return; }        // idempotent: already yours
      var c = cq(p);
      p.hegemon = false;
      p.rep = Math.max(num(p.rep, 0), CFG.CAPTURE_REP_MIN);
      p.owner = 'player';
      c.invasion = null;
      c.threat = 0;
      notify(nameOf(p) + ' SECURED - ground team cleared it. It fights for you now. '
           + 'Land again to add DEFENSES (defend cmd); expect a Synod counter-landing.', 'flag');
      sound('levelup');
    } catch (e) {}
  },

  addDefense: function (p) {
    try {
      var H = host();
      if (!H || !p) return { ok: false, msg: 'conquest system offline' };
      if (p.owner !== 'player') {
        return { ok: false, msg: 'not your world - capture it first (land + win the ground battle)' };
      }
      var c = cq(p);
      if (c.defense >= CFG.DEFENSE_MAX) {
        return { ok: false, msg: nameOf(p) + ' defense grid is at maximum (lvl ' + CFG.DEFENSE_MAX + ')' };
      }
      var cost = CFG.DEFENSE_COST_BASE * (c.defense + 1);
      var P = H.P;
      if (!P || typeof P.credits !== 'number') return { ok: false, msg: 'no credit line available' };
      if (P.credits < cost) {
        return { ok: false, msg: 'defense lvl ' + (c.defense + 1) + ' costs ' + cost
                              + ' cr - you have ' + Math.floor(P.credits) };
      }
      P.credits -= cost;
      c.defense += 1;
      var m = nameOf(p) + ' defense grid raised to lvl ' + c.defense + '/' + CFG.DEFENSE_MAX
            + ' (-' + cost + ' cr)'
            + (c.defense < CFG.DEFENSE_MAX
                ? '. Next battery: ' + (CFG.DEFENSE_COST_BASE * (c.defense + 1)) + ' cr.'
                : '. Grid at maximum.');
      notify(m, 'log');
      return { ok: true, msg: m };
    } catch (e) { return { ok: false, msg: 'conquest error' }; }
  },

  describe: function (p) {
    try {
      if (!p) return '';
      var c = p._cq || null;
      var def = c ? clamp(num(c.defense, 0), 0, CFG.DEFENSE_MAX) : 0;
      var infra = c ? clamp(num(c.infra, 1), 0, 1) : 1;
      var own = ownerKind(p);
      var col = own === 'player' ? CFG.COL_PLAYER : (own === 'synod' ? CFG.COL_SYNOD : CFG.COL_NEUTRAL);
      var ownTxt = own === 'player' ? 'YOURS' : (own === 'synod' ? 'SYNOD' : 'COALITION');
      var pips = '', i;
      for (i = 0; i < CFG.DEFENSE_MAX; i++) pips += (i < def ? CFG.PIP_FULL : CFG.PIP_EMPTY);
      var h = '<div style="font-size:12px;line-height:1.55">';
      h += '<div><b style="color:' + col + '">OWNER: ' + ownTxt + '</b>'
         + (own === 'synod' ? ' <span style="color:' + CFG.COL_SYNOD + '">(no dock/fuel/repair here)</span>' : '')
         + '</div>';
      h += '<div>DEFENSE <span style="letter-spacing:2px">' + pips + '</span> lvl '
         + def + '/' + CFG.DEFENSE_MAX + '</div>';
      h += '<div>INFRA ' + Math.round(infra * 100) + '%'
         + (infra < CFG.INFRA_LOW
             ? ' <b style="color:' + CFG.COL_SYNOD + '">DAMAGED - output crippled</b>'
             : '')
         + '</div>';
      if (c && c.invasion) {
        h += '<div><b style="color:' + CFG.COL_SYNOD + '">SYNOD INVASION INBOUND - '
           + Math.max(0, Math.ceil(num(c.invasion.eta, 0))) + 's (strength '
           + (Math.round(num(c.invasion.strength, 0) * 10) / 10) + ' vs defense ' + def + ')</b></div>';
      }
      h += '<div style="opacity:.72">land + win the ground battle -&gt; the world flips to you '
         + CFG.DOT + ' defenses fight off Synod counter-landings<br>'
         + 'battles + bombardment damage INFRA -&gt; production falls until it rebuilds</div>';
      h += '</div>';
      return h;
    } catch (e) { return ''; }
  },

  damageInfra: function (p, amt) {
    try { if (p) hurtInfra(p, amt); } catch (e) {}
  },

  infraMult: function (p) {
    try {
      var infra = (p && p._cq) ? clamp(num(p._cq.infra, 1), 0, 1) : 1;
      return CFG.INFRA_FLOOR + (1 - CFG.INFRA_FLOOR) * infra;
    } catch (e) { return 1; }
  },

  ownerOf: function (p) {
    try { return ownerKind(p); } catch (e) { return 'coalition'; }
  },

  defenseOf: function (p) {
    try { return (p && p._cq) ? clamp(num(p._cq.defense, 0), 0, CFG.DEFENSE_MAX) : 0; } catch (e) { return 0; }
  }
};

G.CONQUEST = API;

})();

// ---------------------------------------------------------------- smoke test (node conquest.js)
if (typeof module !== 'undefined' && require.main === module) {
  (function () {
    var g = (typeof globalThis !== 'undefined') ? globalThis : global;
    var CQ = g.CONQUEST;
    var results = [];
    function T(name, ok) {
      results.push(!!ok);
      console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    }

    // T1 -- every API is a safe no-op before window.HOST exists
    var t1 = true;
    try {
      var ghost = { name: 'Ghost', rep: 0, hegemon: true, pos: { distanceTo: function () { return 5; } } };
      CQ.init(); CQ.tick(0.016);
      CQ.onAwayVictory(ghost);
      var rG = CQ.addDefense(ghost);
      CQ.damageInfra(ghost, 0.2);
      t1 = ghost.owner !== 'player'
        && rG && rG.ok === false
        && CQ.infraMult(ghost) >= 0.15
        && typeof CQ.describe(ghost) === 'string';
    } catch (e) { t1 = false; }
    T('T1 no-HOST: all calls safe no-ops, nothing throws', t1);

    // ---- install a stub window.HOST + deterministic rng
    g.window = g;
    var flags = [], alerts = [], logs = [], sounds = [];
    var p1 = { name: 'Vekk', rep: 0, hegemon: true, system: 0, stock: {},
               type: { t: 'rock', makes: [], needs: [] },
               pos: { distanceTo: function () { return 99999; } } };   // player FAR: no defense bonus
    var p2 = { name: 'Oreleth', rep: 1, hegemon: true, system: 0, stock: {},
               type: { t: 'lush', makes: [], needs: [] },
               pos: { distanceTo: function () { return 100; } } };
    g.HOST = {
      planets: [p1, p2],
      P: { pos: {}, credits: 100 },
      T0: 0, campaign: 10, CFG: {},
      notify: function (html, kind) {
        if (kind === 'flag') flags.push(String(html));
        else if (kind === 'alert') alerts.push(String(html));
        else logs.push(String(html));
      },
      term: function () {},
      sound: function (n) { sounds.push(String(n)); }
    };
    var realRandom = Math.random;
    Math.random = function () { return 0; };    // launch chance always hits; eta/strength take their floors

    // T2/T3 -- capture + idempotency
    CQ.init();
    CQ.onAwayVictory(p1);
    T('T2 capture: owner/hegemon/rep flip + SECURED flag + levelup',
      p1.owner === 'player' && p1.hegemon === false && p1.rep === 2
      && sounds.indexOf('levelup') >= 0
      && flags.length === 1 && flags[0].indexOf('Vekk SECURED') === 0);
    CQ.onAwayVictory(p1);
    T('T3 onAwayVictory idempotent (no duplicate notify, state intact)',
      p1.owner === 'player' && flags.length === 1);

    // T4 -- one slow tick launches the counter-invasion (campaign 10 -> strength 8.5 vs defense 0)
    CQ.tick(3.0);
    var inv = p1._cq && p1._cq.invasion;
    T('T4 counter-invasion launches with alert + ETA',
      !!inv && typeof inv.eta === 'number' && typeof inv.strength === 'number'
      && alerts.length === 1
      && alerts[0].indexOf('SYNOD INVASION FORCE en route to Vekk') === 0
      && alerts[0].indexOf('ETA') > 0);

    // T5/T6 -- ETA lapses (20s floor, 7x3s ticks) and the undefended world falls
    for (var i = 0; i < 7; i++) CQ.tick(3.0);
    T('T5 invasion resolves: undefended world falls back to the Synod',
      p1.owner === null && p1.hegemon === true && p1._cq.invasion === null);
    T('T6 fall side-effects: rep -7 + HAS FALLEN alert + infra -0.25',
      p1.rep === -7
      && alerts.length === 2 && alerts[1].indexOf('Vekk HAS FALLEN') === 0
      && Math.abs(p1._cq.infra - 0.75) < 1e-9);

    // T7/T8 -- defense paywall + purchase + cost scaling (on a second, still-owned world)
    CQ.onAwayVictory(p2);
    g.HOST.P.credits = 100;
    var r1 = CQ.addDefense(p2);
    T('T7 addDefense paywall: 100 cr cannot buy a 400 cr battery',
      r1 && r1.ok === false && g.HOST.P.credits === 100 && p2._cq.defense === 0);
    g.HOST.P.credits = 1000;
    var r2 = CQ.addDefense(p2);
    var r3 = CQ.addDefense(p2);   // lvl 2 costs 800 > 600 remaining
    T('T8 addDefense buys lvl 1 (-400 cr), blocks lvl 2 (800 cr > 600)',
      r2 && r2.ok === true && p2._cq.defense === 1 && g.HOST.P.credits === 600
      && r3 && r3.ok === false && p2._cq.defense === 1 && g.HOST.P.credits === 600);

    // T9 -- fallen worlds reject defenses; describe() shows the SYNOD block
    var r4 = CQ.addDefense(p1);
    var d1 = CQ.describe(p1);
    T('T9 not-owned rejected + describe() shows SYNOD in red',
      r4 && r4.ok === false && typeof d1 === 'string'
      && d1.indexOf('SYNOD') >= 0 && d1.indexOf('#ff8a8a') >= 0);

    // T10 -- infra floor + player describe (violet owner, DAMAGED warning, pips, how-it-works)
    CQ.damageInfra(p2, 99);
    var d2 = CQ.describe(p2);
    T('T10 infraMult floor 0.15 + describe() pips/DAMAGED/how-it-works',
      p2._cq.infra === 0 && CQ.infraMult(p2) === 0.15
      && d2.indexOf('#c9a0ff') >= 0 && d2.indexOf('DAMAGED') >= 0
      && d2.indexOf('\u25a0') >= 0
      && d2.indexOf('land + win the ground battle') >= 0);

    Math.random = realRandom;
    var fails = 0;
    for (var k = 0; k < results.length; k++) if (!results[k]) fails++;
    console.log(fails === 0 ? 'ALL 10 PASS' : (fails + ' of ' + results.length + ' FAILED'));
    if (fails > 0 && typeof process !== 'undefined') process.exit(1);
  })();
}
