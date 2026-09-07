// synod.js - the Iron Synod LEARNS between campaigns (USE_CASES UC-305, the last Egosoft row).
//
// Every generation the enemy keeps a tally of how it died and how it killed, and at the reset it REFITS: armour
// tuned against whatever the pilot actually shoots them with, and a weapon mix shifted toward whichever of their
// own guns traded best. Nothing here is hidden - `synod` prints the doctrine, what changed and why, and the
// adaptation is capped so it bends the fight without making it unwinnable.
//
// Honesty rules this file holds to:
//   - the tally counts REAL events (a bullet that reached a pirate hull, a pirate kill on the player), never an
//     estimate, and the counters are visible;
//   - if a generation produced no data (nobody shot anybody), the doctrine does NOT drift - it says so instead;
//   - the doctrine persists across reloads in its own localStorage key, like the minds' knowledge does, because
//     "the galaxy is reborn, what was learned is not".
(function () {
  'use strict';
  var CFG = {
    KEY: 'SF_SYNOD_DOCTRINE_v1',
    RES_STEP: 0.07,        // how much resistance shifts per generation, per damage type
    RES_MIN: 0.72,         // a Synod hull never takes less than 72% of a damage type
    RES_MAX: 1.25,         // nor more than 125% - the pilot's counter-play must stay worth something
    MIN_SAMPLE: 12,        // hits needed before a generation's evidence moves anything at all
    TYPES: ['energy', 'frag', 'missile'],
    GUNS: ['energy', 'ballistic', 'missile']   // what their own ships can be armed with (WEAPON_ORDER keys)
  };

  var D = null;   // the doctrine: res per damage type, gun weights, history

  function fresh() {
    return { gen: 1, res: { energy: 1, frag: 1, missile: 1 }, gun: { energy: 1, ballistic: 1, missile: 1 },
      tally: blankTally(), history: [] };
  }
  function blankTally() { return { hitsTakenBy: { energy: 0, frag: 0, missile: 0 }, killsByGun: {}, lossesByGun: {}, playerKills: 0, losses: 0 }; }

  function load() {
    if (D) return D;
    try { var raw = localStorage.getItem(CFG.KEY); D = raw ? JSON.parse(raw) : fresh(); }
    catch (e) { D = fresh(); }
    if (!D.res || !D.gun || !D.tally) D = fresh();
    if (!D.tally.hitsTakenBy) D.tally = blankTally();
    return D;
  }
  // An empty catch here made a full or blocked localStorage invisible: the Synod would announce "THE IRON
  // SYNOD REFITS" having persisted nothing, and the next load quietly started the war over.
  function save() { try { localStorage.setItem(CFG.KEY, JSON.stringify(D)); D._saveFailed = false; return true; }
    catch (e) { if (!D._saveFailed && window.HOST && HOST.term) HOST.term('&#9670; the Synod could not save its campaign (' + ((e && e.name) || 'storage error') + ') - this generation will not carry over', 'err');
      D._saveFailed = true; return false; } }
  function say(t, c) { if (window.HOST && HOST.term) HOST.term(t, c || 'sys'); }

  // ---- what the game reports into the tally ---------------------------------------------------------------
  // a player bullet reached a Synod hull
  function noteHitOnSynod(dmgType) { var d = load(); if (!dmgType) return; d.tally.hitsTakenBy[dmgType] = (d.tally.hitsTakenBy[dmgType] || 0) + 1; }
  // a Synod ship died; gun is what IT was carrying
  function noteSynodLoss(gun) { var d = load(); d.tally.losses++; if (gun) d.tally.lossesByGun[gun] = (d.tally.lossesByGun[gun] || 0) + 1; }
  // a Synod ship killed the player; gun is what it was carrying
  function noteSynodKill(gun) { var d = load(); d.tally.playerKills++; if (gun) d.tally.killsByGun[gun] = (d.tally.killsByGun[gun] || 0) + 1; }

  // ---- what the game asks of the doctrine ------------------------------------------------------------------
  function resFor(dmgType) { var d = load(); var v = d.res[dmgType]; return (typeof v === 'number' && isFinite(v)) ? v : 1; }
  // a weighted pick over their own guns - the mix, not a single choice, so a wing is still varied
  function gunFor(rnd) {
    var d = load(), keys = CFG.GUNS, total = 0, i;
    for (i = 0; i < keys.length; i++) total += Math.max(0.05, d.gun[keys[i]] || 1);
    var r = (typeof rnd === 'function' ? rnd() : Math.random()) * total;
    for (i = 0; i < keys.length; i++) { r -= Math.max(0.05, d.gun[keys[i]] || 1); if (r <= 0) return keys[i]; }
    return keys[0];
  }

  // ---- the refit, at a generation boundary ------------------------------------------------------------------
  function adapt() {
    var d = load(), t = d.tally, i, k;
    var hits = CFG.TYPES.reduce(function (a, x) { return a + (t.hitsTakenBy[x] || 0); }, 0);
    var notes = [];
    if (hits < CFG.MIN_SAMPLE) {
      notes.push('too little was fired at them this generation (' + hits + ' hits, ' + CFG.MIN_SAMPLE + ' needed) - the doctrine does not move on noise');
    } else {
      // armour: resist what actually hurt them, in proportion, and relax against what did not
      var worst = null;
      for (i = 0; i < CFG.TYPES.length; i++) { k = CFG.TYPES[i]; if (!worst || (t.hitsTakenBy[k] || 0) > (t.hitsTakenBy[worst] || 0)) worst = k; }
      for (i = 0; i < CFG.TYPES.length; i++) {
        k = CFG.TYPES[i];
        var share = (t.hitsTakenBy[k] || 0) / hits;
        var move = (k === worst ? -CFG.RES_STEP : (share < 0.15 ? CFG.RES_STEP * 0.5 : 0));
        d.res[k] = Math.max(CFG.RES_MIN, Math.min(CFG.RES_MAX, (d.res[k] || 1) + move));
      }
      notes.push('armour tuned against ' + worst + ' (' + Math.round(100 * (t.hitsTakenBy[worst] || 0) / hits) + '% of what hit them), now ' +
        CFG.TYPES.map(function (x) { return x + ' x' + d.res[x].toFixed(2); }).join(', '));
      // guns: the one that traded best gains weight, the worst loses it
      var best = null, worstGun = null;
      for (i = 0; i < CFG.GUNS.length; i++) {
        k = CFG.GUNS[i];
        var kills = t.killsByGun[k] || 0, losses = t.lossesByGun[k] || 0;
        var ratio = (kills + 0.5) / (losses + 1);
        if (!best || ratio > best.r) best = { k: k, r: ratio };
        if (!worstGun || ratio < worstGun.r) worstGun = { k: k, r: ratio };
      }
      if (best && worstGun && best.k !== worstGun.k) {
        d.gun[best.k] = Math.min(4, (d.gun[best.k] || 1) + 0.5);
        d.gun[worstGun.k] = Math.max(0.25, (d.gun[worstGun.k] || 1) - 0.35);
        notes.push('more ' + best.k + ', fewer ' + worstGun.k + ' (they traded ' + best.r.toFixed(2) + ' against ' + worstGun.r.toFixed(2) + ')');
      } else notes.push('no gun out-traded another clearly enough to change the mix');
    }
    d.history.unshift({ gen: d.gen, hits: hits, playerKills: t.playerKills, losses: t.losses, notes: notes.slice() });
    while (d.history.length > 12) d.history.pop();
    d.gen++; d.tally = blankTally(); save();
    say('&#9670; <b style="color:#ff8a8a">THE IRON SYNOD REFITS</b> for campaign ' + d.gen + ': ' + notes.join('; ') + '.');
    return { gen: d.gen, notes: notes };
  }

  function status() {
    var d = load();
    return { gen: d.gen, res: { energy: d.res.energy, frag: d.res.frag, missile: d.res.missile },
      gun: { energy: d.gun.energy, ballistic: d.gun.ballistic, missile: d.gun.missile },
      tally: JSON.parse(JSON.stringify(d.tally)), history: d.history.slice(0, 6) };
  }
  function reset() { D = fresh(); save(); return status(); }

  window.SYNOD = { CFG: CFG, load: load, status: status, adapt: adapt, reset: reset,
    noteHitOnSynod: noteHitOnSynod, noteSynodLoss: noteSynodLoss, noteSynodKill: noteSynodKill,
    resFor: resFor, gunFor: gunFor };
  load();
})();
