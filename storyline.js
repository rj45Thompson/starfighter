// =================================================================================================
// storyline.js - F31: an AUTHORED MAIN STORY SPINE with ordered, scripted mission beats.
// The genre (Freelancer / Elite / EV Nova / X) ships a single authored campaign SPINE - a named arc
// whose beats run IN ORDER, each unlocking the next - which starfighter lacked: textquests.js offers
// independent branching side-quests procedurally on dock, and the "campaign" was only the systemic
// HEG_TIERS escalation. This is the missing spine: ONE named arc, "The Iron Synod War", four ordered
// beats (Oath -> Blooded -> Break the Front -> Armistice) that can be STARTED, ADVANCED beat by beat,
// and COMPLETED end to end, with a reward on the last beat.
//
// HOW BEATS ADVANCE (music.js discipline: poll window.HOST, zero gameplay hooks for the poll beats):
//   - 'oath'      dock at a friendly staging world      -> poll HOST.P.docked.name === staging
//   - 'blooded'   earn your commission (a rank up)       -> poll HOST.P.score >= RANKS[target].pts
//   - 'front'     WIN a war front against the Hegemon     -> STORYLINE.onWarWin(), called from warWin()
//                 (campaign++ fires on a LOSS too, so a poll can't tell win from loss - hence the hook)
//   - 'armistice' return home to Ranger Command          -> poll HOST.P.docked.name === 'Ranger Command'
//
// GROUNDING (0-fab law): the staging world named in the prose is a REAL planet read from HOST at start
// time (the friendliest one you can dock at), never an invented placeholder. Ranger Command is the
// player's own base. Persisted to its OWN localStorage key (SF_STORY_v1) so the arc survives a reload;
// the game save is never touched. Gated so it does NOT auto-start over the first-run guided opening
// (guide.js): it auto-starts only once the player has a save (SF_SAVE_v1), and `saga start` overrides.
//
// Exports exactly one global: window.STORYLINE
//   STORYLINE.start()     - begin the arc (grounds the ctx from HOST); true if it could, false if not yet
//   STORYLINE.tick()      - poll HOST and advance the current poll-driven beat (called on a 1.2s timer)
//   STORYLINE.view()      - the current {started,done,beat,beatTitle,brief,objective,progress,...} view
//   STORYLINE.onWarWin()  - advance the 'front' beat (called from index.html warWin() on a real victory)
//   STORYLINE.reset()     - clear all progress (for a fresh playthrough / the self-test)
// SYNTAX-CLEAN under node: every browser-only ref is guarded; `node storyline.js` runs a self-test that
// drives a fake HOST through all four beats to completion, checking order + reward + persistence, and
// exits 1 on any FAIL. Same self-test contract as textquests.js.
// =================================================================================================
'use strict';
(function () {
  var KEY = 'SF_STORY_v1', SAVE_KEY = 'SF_SAVE_v1';
  var REWARD_CREDITS = 750, REWARD_SCORE = 8;
  var HOME = 'Ranger Command';

  // checked FRESH on every call (never a load-time-captured reference) - the self-test stubs global.window
  // AFTER this module's IIFE has already run, so a one-time capture would forever miss the stub. Same
  // convention as textquests.js's H() and planetmenu.js's H().
  function H() { return (typeof window !== 'undefined' && window.HOST) ? window.HOST : null; }
  function P() { var h = H(); return h ? h.P : null; }
  function num(v, d) { v = Number(v); return isNaN(v) ? d : v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY)); return (j && typeof j === 'object') ? j : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }

  function rankIdx(h, p) { var s = num(p && p.score, 0), r = 0; if (h && h.RANKS) { for (var i = 0; i < h.RANKS.length; i++) if (s >= h.RANKS[i].pts) r = i; } return r; }

  // =================================================================================================
  // THE ARC - four ordered beats. Each has: brief(ctx) prose, obj(ctx) one-line objective, prog(ctx,H,P)
  // live progress, and advance(ctx,H,P)->bool polled from tick(). A beat may carry enter(ctx,H,P) to
  // capture a per-beat baseline the moment it becomes active (blooded's rank target). The 'front' beat's
  // advance reads ctx._eventDone, set only by onWarWin() - a real coalition VICTORY, never a loss.
  // =================================================================================================
  var BEATS = [
    { id: 'oath', title: 'The Oath',
      brief: function (c) { return 'The Iron Synod\'s front is advancing on the free worlds. The Coalition is calling every pilot to the line. Fly to <b>' + esc(c.staging) + '</b> and take the Warden\'s Oath.'; },
      obj: function (c) { return 'Dock at ' + c.staging + '.'; },
      prog: function (c, h, p) { return (p && p.docked && p.docked.name) ? ('docked at ' + p.docked.name) : 'in flight'; },
      advance: function (c, h, p) { return !!(p && p.docked && p.docked.name === c.staging); } },

    { id: 'blooded', title: 'Blooded',
      enter: function (c, h, p) {
        var idx = rankIdx(h, p);
        var last = (h && h.RANKS) ? h.RANKS.length - 1 : idx;
        c.rankTargetIdx = Math.min(idx + 1, last);
        var R = (h && h.RANKS && h.RANKS[c.rankTargetIdx]) ? h.RANKS[c.rankTargetIdx] : null;
        c.rankTargetName = R ? R.n : 'the next rank';
        c.rankTargetPts = R ? R.pts : 0;
      },
      brief: function (c) { return 'An oath is only words until it is tested. Take the fight to the Synod and earn your commission - rise to the rank of <b>' + esc(c.rankTargetName) + '</b>.'; },
      obj: function (c) { return 'Reach the rank of ' + c.rankTargetName + ' (' + c.rankTargetPts + ' score).'; },
      prog: function (c, h, p) { return 'score ' + num(p && p.score, 0) + ' / ' + num(c.rankTargetPts, 0); },
      advance: function (c, h, p) { return num(p && p.score, 0) >= num(c.rankTargetPts, 1e9); } },

    { id: 'front', title: 'Break the Front',
      brief: function (c) { return 'The Synod has massed for a decisive push. Stand with the Coalition and shatter their offensive - see a war front through to a <b>coalition victory</b>.'; },
      obj: function (c) { return 'Win a war front against the Iron Synod.'; },
      prog: function (c, h, p) { return c._eventDone ? 'the front is broken' : 'the front holds - the war goes on'; },
      advance: function (c, h, p) { return !!c._eventDone; } },

    { id: 'armistice', title: 'Armistice',
      brief: function (c) { return 'The Hegemon front is broken. Bring word home - return to <b>' + HOME + '</b> and stand down. The Coalition owes you.'; },
      obj: function (c) { return 'Return and dock at ' + HOME + '.'; },
      prog: function (c, h, p) { return (p && p.docked && p.docked.name) ? ('docked at ' + p.docked.name) : 'in flight'; },
      advance: function (c, h, p) { return !!(p && p.docked && p.docked.name === HOME); } },
  ];

  var state = null;   // { started:bool, beat:int (-1..N, N=done), done:bool, ctx:{staging, rankTarget*, _eventDone}, announced:int }

  // pick the friendliest dockable planet as the staging world (grounded, real entity read from HOST)
  function chooseStaging(h) {
    var ps = (h && h.planets) || []; if (!ps.length) return null;
    var best = null, bestRep = -1e30;
    for (var i = 0; i < ps.length; i++) { var p = ps[i]; if (!p || !p.name || p.name === HOME) continue; var rep = num(p.rep, 0); if (rep > bestRep) { bestRep = rep; best = p; } }
    return best ? best.name : (ps[0] && ps[0].name) || null;
  }

  function announce(beatIdx) {
    var h = H(); if (!h || typeof h.term !== 'function') return;
    var total = BEATS.length, msg;
    if (beatIdx >= total) { msg = '<b style="color:#ffd257">★ THE IRON SYNOD WAR</b> - complete. You held the line.'; }
    else { var b = BEATS[beatIdx]; msg = '<b style="color:#ffd257">★ THE IRON SYNOD WAR</b> · Beat ' + (beatIdx + 1) + '/' + total + ': <b>' + b.title + '</b> - ' + b.obj(state.ctx) + ' <span style="opacity:.6">(type: saga)</span>'; }
    try { h.term(msg, 'sys'); } catch (e) { }
  }

  function enterBeat(idx) {
    state.beat = idx;
    if (idx >= 0 && idx < BEATS.length && typeof BEATS[idx].enter === 'function') { try { BEATS[idx].enter(state.ctx, H(), P()); } catch (e) { } }
    state.announced = idx;
    save();
    announce(idx);
  }

  function start() {
    if (state && state.started) return true;
    var h = H(); if (!h) return false;
    var staging = chooseStaging(h); if (!staging) return false;   // galaxy not built yet - retry next tick
    state = { started: true, beat: -1, done: false, ctx: { staging: staging }, announced: -1 };
    enterBeat(0);
    return true;
  }

  function complete() {
    var h = H(), p = P();
    if (p) {
      p.credits = num(p.credits, 0) + REWARD_CREDITS;
      p.score = num(p.score, 0) + REWARD_SCORE;
      if (h && typeof h.checkRankUp === 'function') { try { h.checkRankUp(p); } catch (e) { } }
    }
    state.done = true; state.beat = BEATS.length; save();
    announce(BEATS.length);
    if (h && typeof h.term === 'function') { try { h.term('<b style="color:#ffd257">★</b> <i>The Iron Synod War</i> is over. The Coalition rewards you <b>' + REWARD_CREDITS + 'c</b> and a commendation (+' + REWARD_SCORE + ' score). Fly well, Ranger.', 'sys'); } catch (e) { } }
    try { if (typeof window !== 'undefined' && window.SOUND && window.SOUND.play) window.SOUND.play('levelup'); } catch (e) { }
  }

  function tick() {
    var h = H(); if (!h) return;
    if (!state) { var r = load(); if (r) state = r; }
    if (!state || !state.started) { if (hasSave()) start(); return; }   // auto-start gated behind a save (do not clash with guide.js)
    if (state.done) return;
    var p = P(); if (!p) return;
    var idx = state.beat; if (idx < 0 || idx >= BEATS.length) return;
    var adv = false; try { adv = !!BEATS[idx].advance(state.ctx, h, p); } catch (e) { adv = false; }
    if (adv) { var next = idx + 1; if (next >= BEATS.length) complete(); else enterBeat(next); }
  }

  function onWarWin() {   // called from index.html warWin() - a REAL coalition victory (never a loss)
    if (!state || !state.started || state.done) return;
    var idx = state.beat;
    if (idx >= 0 && idx < BEATS.length && BEATS[idx].id === 'front') { state.ctx._eventDone = true; save(); tick(); }
  }

  function view() {
    if (!state) { var r = load(); if (r) state = r; }
    var total = BEATS.length;
    if (!state || !state.started) return { started: false, done: false, title: 'The Iron Synod War', total: total };
    if (state.done) return { started: true, done: true, title: 'The Iron Synod War', total: total, beat: total };
    var idx = state.beat, b = BEATS[idx] || BEATS[0], h = H(), p = P();
    return {
      started: true, done: false, title: 'The Iron Synod War', total: total,
      beat: idx, beatNo: idx + 1, beatId: b.id, beatTitle: b.title,
      brief: b.brief(state.ctx), objective: b.obj(state.ctx),
      progress: (typeof b.prog === 'function' ? b.prog(state.ctx, h, p) : ''),
    };
  }

  function reset() { state = null; try { localStorage.removeItem(KEY); } catch (e) { } }

  var API = { start: start, tick: tick, view: view, onWarWin: onWarWin, reset: reset, _state: function () { return state; }, _BEATS: BEATS, KEY: KEY };
  if (typeof window !== 'undefined') window.STORYLINE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  // browser: boot + slow poll (music.js-style). The poll drives the location/rank beats; the 'front' beat
  // waits for onWarWin(). Under node (no window at load time) this whole block is skipped.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    var boot = function () { tick(); try { setInterval(tick, 1200); } catch (e) { } };
    if (document.readyState !== 'loading') boot(); else addEventListener('DOMContentLoaded', boot);
  }

  // ---- self-test (node): reset -> drive a fake HOST through all four beats to completion ----
  if (typeof require !== 'undefined' && require.main === module) {
    var PASS = 0, FAIL = 0;
    function check(name, cond) { if (cond) { PASS++; console.log('PASS - ' + name); } else { FAIL++; console.log('FAIL - ' + name); } }

    // a minimal localStorage so save()/load()/hasSave() are real (round-trip persistence is tested)
    var LS = {}; global.localStorage = { getItem: function (k) { return Object.prototype.hasOwnProperty.call(LS, k) ? LS[k] : null; }, setItem: function (k, v) { LS[k] = String(v); }, removeItem: function (k) { delete LS[k]; } };

    var terms = [];
    var fakeP = { score: 0, credits: 100, docked: null };
    var fakePlanets = [{ name: 'Ranger Command', rep: 0 }, { name: 'Kessari Reach', rep: 2 }, { name: 'Thorne Anchorage', rep: -1 }];
    var RANKS = [{ pts: 0, n: 'Recruit' }, { pts: 25, n: 'Ranger' }, { pts: 70, n: 'Veteran' }, { pts: 150, n: 'Ace' }, { pts: 300, n: 'Commander' }, { pts: 550, n: 'Legend' }];
    global.window = { HOST: { P: fakeP, planets: fakePlanets, RANKS: RANKS, term: function (h, c) { terms.push(h); }, checkRankUp: function () { } } };

    reset();

    // 1. gate: tick() must NOT auto-start without a save
    tick();
    check('tick() does NOT auto-start before a save exists', state === null || !state.started);

    // 2. with a save, tick() auto-starts and grounds the staging world to the friendliest REAL planet
    LS[SAVE_KEY] = '1';
    tick();
    check('tick() auto-starts once a save exists', !!(state && state.started));
    check('beat 0 is active (The Oath)', state && state.beat === 0 && BEATS[state.beat].id === 'oath');
    check('staging world grounded to the friendliest real planet (Kessari Reach, not Ranger Command)', state && state.ctx.staging === 'Kessari Reach');
    var v0 = view();
    check('view() reports beat 1/4 with an objective + progress', v0.beatNo === 1 && v0.total === 4 && /Kessari Reach/.test(v0.objective) && /in flight/.test(v0.progress));

    // 3. beat does not advance on the wrong dock, DOES advance on the right dock (ordered)
    fakeP.docked = { name: 'Thorne Anchorage' }; tick();
    check('docking the WRONG world does not advance', state.beat === 0);
    fakeP.docked = { name: 'Kessari Reach' }; tick();
    check('docking the staging world advances to beat 2 (Blooded)', state.beat === 1 && BEATS[state.beat].id === 'blooded');
    check('blooded enter() set a rank target above the current rank (Ranger @25)', state.ctx.rankTargetIdx === 1 && state.ctx.rankTargetPts === 25);
    fakeP.docked = null;

    // 4. rank beat: below target holds, at/above target advances
    fakeP.score = 10; tick();
    check('score below the rank target holds at beat 2', state.beat === 1);
    fakeP.score = 30; tick();
    check('reaching the rank target advances to beat 3 (Break the Front)', state.beat === 2 && BEATS[state.beat].id === 'front');

    // 5. the 'front' beat is NOT poll-advanceable - only a real war win moves it
    tick(); tick();
    check('the front beat does NOT advance on a poll (needs onWarWin)', state.beat === 2);
    onWarWin();
    check('onWarWin() advances the front beat to beat 4 (Armistice)', state.beat === 3 && BEATS[state.beat].id === 'armistice');

    // 6. armistice: only the home dock completes the arc, and the reward lands exactly once
    var creditsBefore = fakeP.credits, scoreBefore = fakeP.score;
    fakeP.docked = { name: 'Kessari Reach' }; tick();
    check('docking a NON-home world does not complete the arc', !state.done);
    fakeP.docked = { name: 'Ranger Command' }; tick();
    check('docking home completes the arc (done, beat past the last)', state.done === true && state.beat === BEATS.length);
    check('completion paid the reward exactly once (+750c, +8 score)', fakeP.credits === creditsBefore + REWARD_CREDITS && fakeP.score === scoreBefore + REWARD_SCORE);
    var beatsAnnounced = terms.filter(function (t) { return /Beat \d+\/4/.test(t); }).length;
    check('every one of the 4 beats announced itself as it became active', beatsAnnounced === 4);
    check('a completion message was posted', terms.some(function (t) { return /is over|held the line/.test(t); }));

    // 7. a further tick after completion is a safe no-op (no double reward, no crash)
    var cAfter = fakeP.credits; tick(); tick();
    check('ticks after completion do not re-pay or crash', fakeP.credits === cAfter && state.done);

    // 8. persistence round-trip: drop the in-memory state, view() must restore 'done' from localStorage
    state = null;
    var vr = view();
    check('progress persists (a fresh load restores done:true from localStorage)', vr.started === true && vr.done === true);

    console.log('---');
    console.log('TOTAL: ' + (PASS + FAIL) + '  PASS: ' + PASS + '  FAIL: ' + FAIL);
    if (FAIL > 0) { console.log('RESULT: FAIL'); process.exit(1); }
    else { console.log('RESULT: PASS'); process.exit(0); }
  }
})();
