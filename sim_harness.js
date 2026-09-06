// sim_harness.js - measure the game without needing the browser to paint.
//
// Loaded ONLY when the page is opened with ?harness=1 (see the guarded <script> in index.html), so
// nothing here is in the shipped path. It exists because measuring a frame is otherwise unreliable:
// an automated or backgrounded browser tab reports innerWidth 0, resolves vw/vh to 0 and FREEZES
// document.timeline, so requestAnimationFrame never fires, CSS transitions stick at their first
// frame and every layout read is a lie. Rather than fight that, drive the game's own frame(now)
// with a synthetic clock and measure the work directly.
//
// Usage from a console or an automation hook:
//   SIM.census()                    -> one snapshot of the live world
//   SIM.run(3)                      -> drive 3 simulated seconds, report ms/frame and any errors
//   SIM.profile(['step','renderAll'], 3) -> same, plus per-function totals
//   SIM.rockReport(3)               -> what the asteroid field costs, the thing that was 7,781
//                                      writeRockInstance calls per frame before the draw budget
//
// ⚠ ms/frame for anything that RENDERS is only comparable within one run on one machine; a hidden
// tab can distort GPU work. The pure-JS half (step and below) is not affected by visibility, so
// prefer those numbers when comparing before/after.
(function (root) {
  'use strict';
  if (!root) return;

  function census() {
    var out = {};
    try {
      var P = (typeof ships !== 'undefined' && ships[0]) ? ships[0] : null;
      out.shipsTotal = (typeof ships !== 'undefined') ? ships.length : null;
      out.shipsAlive = (typeof ships !== 'undefined') ? ships.filter(function (s) { return s.alive; }).length : null;
      if (P) {
        out.hp = +P.hp.toFixed(1); out.maxHp = P.maxHp; out.credits = P.credits; out.fuel = +P.fuel.toFixed(1);
        out.posFinite = [P.pos.x, P.pos.y, P.pos.z].every(Number.isFinite);
        out.velFinite = [P.vel.x, P.vel.y, P.vel.z].every(Number.isFinite);
      }
      // a NaN that has escaped into a position is the failure that makes a world quietly unplayable,
      // so it is named here rather than left for someone to notice as "ships flew away"
      out.simPaused = (typeof SF_LOCK !== 'undefined') ? !!SF_LOCK.paused : false;   // if true, nothing in this census is advancing
      out.nanShips = (typeof ships !== 'undefined')
        ? ships.filter(function (s) { return s.pos && ![s.pos.x, s.pos.y, s.pos.z].every(Number.isFinite); }).map(function (s) { return s.name; })
        : [];
      if (typeof scene !== 'undefined') out.sceneChildren = scene.children.length;
      if (typeof renderer !== 'undefined' && renderer.info) {
        out.geometries = renderer.info.memory.geometries;
        out.textures = renderer.info.memory.textures;
        out.drawCalls = renderer.info.render.calls;
      }
      ['bullets', 'asteroids', 'gems', 'planets', 'systems', 'fx', 'parts', 'cargoPods'].forEach(function (n) {
        try { var v = root[n]; if (v && v.length != null) out[n] = v.length; } catch (e) { }
      });
    } catch (e) { out.censusError = String(e && e.message || e); }
    return out;
  }

  // Drive `frame` directly. The loop re-arms itself with requestAnimationFrame, which does nothing
  // in a hidden tab, so rAF is stubbed to a no-op for the duration and restored in a finally.
  function run(seconds, opts) {
    opts = opts || {};
    if (typeof frame !== 'function') return { error: 'no global frame() - is the game loaded?' };
    // THE SILENT ZERO (measured 2026-09-06): frame() returns on its FIRST line when the singleton
    // lock has handed the sim to another tab. Every call still "succeeds", no error is raised, and
    // the run reports a happy ms/frame for a game that did not advance a single step - which is how
    // a real verification of a UI change came back as "the feature does not work". If the sim is
    // paused, say so instead of returning a number that means nothing.
    if (typeof SF_LOCK !== 'undefined' && SF_LOCK.paused) {
      return {
        error: 'SIM PAUSED - another tab holds the singleton lock, so frame() returns immediately and every number here would be meaningless.',
        fix: 'click the veil in this tab, or run: SF_LOCK.myClaim = Date.now() + 1000; SF_LOCK.ch.postMessage({t:"claim", id:SF_LOCK.myClaim}); sfPause(false);',
        paused: true
      };
    }
    var realRAF = root.requestAnimationFrame;
    root.requestAnimationFrame = function () { return 0; };
    var counts = {}, first = [], t = performance.now(), STEP = 1000 / 60;
    var frames = Math.max(1, Math.round((seconds || 1) * 60)), t0 = performance.now();
    try {
      for (var i = 0; i < frames; i++) {
        t += STEP;
        try { frame(t); }
        catch (e) {
          var k = String(e && e.message || e);
          if (!counts[k]) { counts[k] = 0; if (first.length < 15) first.push('frame ' + i + ': ' + k); }
          counts[k]++;
        }
      }
    } finally { root.requestAnimationFrame = realRAF; }
    var wall = performance.now() - t0;
    return {
      frames: frames, wallMs: Math.round(wall), msPerFrame: +(wall / frames).toFixed(2),
      uniqueErrors: Object.keys(counts).length, errorCounts: counts, firstErrors: first
    };
  }

  // Wrap named globals, run, unwrap. Restores in a finally so a throw mid-run cannot leave the game
  // permanently wrapped - an earlier hand-rolled version of this did exactly that.
  function profile(names, seconds) {
    var stats = {}, restore = [];
    names.forEach(function (n) {
      var f = root[n];
      if (typeof f !== 'function') return;
      stats[n] = { ms: 0, calls: 0 };
      restore.push([n, f]);
      root[n] = function () {
        var a = performance.now();
        try { return f.apply(this, arguments); }
        finally { stats[n].ms += performance.now() - a; stats[n].calls++; }
      };
    });
    var r;
    try { r = run(seconds); }
    finally { restore.forEach(function (p) { root[p[0]] = p[1]; }); }
    if (!r || !r.frames) return r;   // run() refused (paused sim, no frame()) - pass the reason up rather than dividing by an undefined frame count and reporting NaN
    r.hot = Object.keys(stats).map(function (k) {
      return {
        fn: k, ms: +stats[k].ms.toFixed(1), calls: stats[k].calls,
        callsPerFrame: +(stats[k].calls / r.frames).toFixed(1),
        msPerFrame: +(stats[k].ms / r.frames).toFixed(2)
      };
    }).filter(function (x) { return x.calls > 0; }).sort(function (a, b) { return b.ms - a.ms; });
    // wrapping a function called ~7,800 times a frame costs real time itself, so say so rather than
    // letting the inflated total be read as the function's true cost
    r.note = 'ms for very-high-call-count functions includes this wrapper\'s own overhead; compare RANKING and callsPerFrame, and use the unwrapped run() msPerFrame for absolute cost.';
    return r;
  }

  // The specific thing the rock draw budget changed: how many instance matrices get rewritten.
  function rockReport(seconds) {
    var r = profile(['writeRockInstance', 'flushRockPools', 'rebuildAstGrid', 'step', 'renderAll'], seconds || 3);
    var w = r.hot.filter(function (x) { return x.fn === 'writeRockInstance'; })[0];
    return {
      asteroids: (typeof asteroids !== 'undefined') ? asteroids.length : null,
      writeCallsPerFrame: w ? w.callsPerFrame : null,
      ofPossible: (typeof asteroids !== 'undefined') ? asteroids.length : null,
      msPerFrame: r.msPerFrame, uniqueErrors: r.uniqueErrors, hot: r.hot
    };
  }

  root.SIM = { census: census, run: run, profile: profile, rockReport: rockReport };
  try { console.log('[SIM] harness ready - SIM.census() / SIM.run(3) / SIM.rockReport(3)'); } catch (e) { }
})(typeof window !== 'undefined' ? window : null);
