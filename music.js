/* music.js - situational score for Star Fighter.  window.MUSIC
 *
 * WHY THIS EXISTS
 * F67 in the genre matrix: "music changes with the situation, for example combat versus travel."
 * Seven of the seven surveyed games that were scored on it have it; this game had NO music at all -
 * a grep for music|soundtrack|bgm across every .js and .html minus the three vendored libraries
 * returned zero hits (TASKS.md, F67, proven ABSENT rather than assumed).  It is the single largest
 * production-quality gap by anchor count, and the one a player notices in the first ten seconds.
 *
 * HOW IT WORKS - vertical remixing, which is how score in this genre is actually built
 * There is no linear track that gets swapped on a cue.  Five layers play continuously in the same
 * key and tempo, and the SITUATION only changes how loud each one is.  A transition is therefore a
 * cross-fade of gains, never a restart, so travel becomes combat without a seam:
 *
 *     pad     a slow detuned chord bed          - present in every situation, the harmonic floor
 *     sub     a low pulse on the beat           - arrives with tension, drives combat
 *     arp     a plucked sixteenth figure        - the "something is happening" layer
 *     perc    filtered-noise hits               - combat and boss only
 *     shimmer a high airy drone                 - calm and docked; the absence of threat
 *
 * NOTHING IS DOWNLOADED.  Every voice is an oscillator or shaped noise built at runtime, so the
 * score costs zero bytes of asset, cannot 404, and needs no CSP allowance.  That is a deliberate
 * trade: a sampled orchestral score would sound better and would cost megabytes this page does not
 * spend.
 *
 * SCHEDULING.  A setInterval callback cannot place notes accurately - it is subject to timer jitter
 * and is throttled to once a second in a background tab.  So this uses the standard Web Audio
 * lookahead: a 25 ms timer that schedules every note falling inside the next 120 ms directly on the
 * AudioContext clock, which is sample-accurate.  Timer jitter then only affects WHEN notes are
 * queued, never when they sound.
 *
 * IT SHARES THE GAME'S AUDIO CONTEXT.  SOUND.init() returns the one AudioContext; a second context
 * would be a second hardware voice with its own latency and its own suspend state.  Music hangs off
 * its own gain so the mix can be balanced against effects, and it honours SOUND's mute.
 */
(function () {
  'use strict';

  var CFG = {
    VOL: 0.34,              // music sits under the effects on purpose
    FADE: 1.6,              // seconds to cross-fade between situations
    LOOKAHEAD_MS: 25,       // how often the scheduler wakes
    SCHEDULE_AHEAD: 0.12,   // seconds of notes queued in advance
    HOSTILE_NEAR: 260,      // world units: a hostile inside this is combat
    HOSTILE_SEEN: 900,      // ... and inside this is tension
    POLL_MS: 900,           // how often the situation is re-read from the game
    LS_KEY: 'sf.music.v1'
  };

  // ---- the situations, and what each layer does in them ------------------------------------
  // gains are 0..1 targets; bpm sets the pulse; scale is the chord set the phrase walks.
  var SITUATIONS = {
    calm:    { bpm: 70,  gains: { pad: 0.55, sub: 0.00, arp: 0.00, perc: 0.00, shimmer: 0.30 } },
    docked:  { bpm: 62,  gains: { pad: 0.42, sub: 0.10, arp: 0.14, perc: 0.00, shimmer: 0.38 } },
    tension: { bpm: 96,  gains: { pad: 0.50, sub: 0.34, arp: 0.26, perc: 0.10, shimmer: 0.06 } },
    combat:  { bpm: 132, gains: { pad: 0.44, sub: 0.52, arp: 0.46, perc: 0.44, shimmer: 0.00 } },
    boss:    { bpm: 144, gains: { pad: 0.50, sub: 0.62, arp: 0.52, perc: 0.58, shimmer: 0.00 } }
  };

  // A minor with a flat-6: dark enough for the Synod, open enough not to nag over a long session.
  var ROOT = 55;                                    // A1, in Hz terms below
  var SCALE = [0, 2, 3, 5, 7, 8, 10];               // natural minor degrees, semitones
  var PROG = [0, 5, 3, 6];                          // i - VI - iv - VII, one chord per bar

  var ctx = null, bus = null, layers = null;
  var started = false, situation = 'calm', wanted = 'calm';
  var bpm = SITUATIONS.calm.bpm, nextNote = 0, step = 0, bar = 0;
  var timer = null, poller = null, muted = false, vol = CFG.VOL;
  var lastHp = null, hurtUntil = 0;

  function hz(semi) { return ROOT * Math.pow(2, semi / 12); }
  function now() { return ctx ? ctx.currentTime : 0; }

  // ---- graph ------------------------------------------------------------------------------
  function noiseBuffer() {
    var n = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function makeLayer(name) {
    var g = ctx.createGain();
    g.gain.value = 0;
    g.connect(bus);
    return { name: name, gain: g, target: 0 };
  }

  function build() {
    bus = ctx.createGain();
    bus.gain.value = muted ? 0 : vol;
    bus.connect(ctx.destination);
    layers = {
      pad: makeLayer('pad'), sub: makeLayer('sub'), arp: makeLayer('arp'),
      perc: makeLayer('perc'), shimmer: makeLayer('shimmer')
    };

    // PAD - three detuned saws through a slow lowpass. Held, re-tuned per bar, never retriggered,
    // so a chord change is a glide rather than an attack.
    layers.pad.osc = [];
    layers.pad.filter = ctx.createBiquadFilter();
    layers.pad.filter.type = 'lowpass';
    layers.pad.filter.frequency.value = 900;
    layers.pad.filter.Q.value = 0.7;
    layers.pad.filter.connect(layers.pad.gain);
    for (var i = 0; i < 3; i++) {
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(SCALE[0]) * 2;
      o.detune.value = (i - 1) * 9;                 // ±9 cents: wide enough to beat, not to sound broken
      var og = ctx.createGain(); og.gain.value = 0.22;
      o.connect(og); og.connect(layers.pad.filter);
      o.start();
      layers.pad.osc.push(o);
    }

    // SHIMMER - a high sine pair with a slow tremolo, the sound of nothing being wrong.
    layers.shimmer.osc = [];
    var trem = ctx.createGain(); trem.gain.value = 1; trem.connect(layers.shimmer.gain);
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.14;
    var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.4;
    lfo.connect(lfoAmt); lfoAmt.connect(trem.gain); lfo.start();
    for (var k = 0; k < 2; k++) {
      var s = ctx.createOscillator();
      s.type = 'sine';
      s.frequency.value = hz(SCALE[4] + 24) * (k ? 1.005 : 1);
      var sg = ctx.createGain(); sg.gain.value = 0.16;
      s.connect(sg); sg.connect(trem); s.start();
      layers.shimmer.osc.push(s);
    }

    layers.perc.noise = noiseBuffer();
  }

  // ---- voices ------------------------------------------------------------------------------
  function pluck(when, freq, dur, dest, type, peak) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak || 0.3, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest);
    o.start(when); o.stop(when + dur + 0.02);
  }

  function subNote(when, freq, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, when);
    o.frequency.exponentialRampToValueAtTime(freq * 0.985, when + dur);   // a slight fall: weight
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.5, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(layers.sub.gain);
    o.start(when); o.stop(when + dur + 0.02);
  }

  function hit(when, bright, dur, peak) {
    var s = ctx.createBufferSource(); s.buffer = layers.perc.noise;
    var f = ctx.createBiquadFilter();
    f.type = bright ? 'highpass' : 'bandpass';
    f.frequency.value = bright ? 4200 : 220;
    f.Q.value = bright ? 0.7 : 2.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f); f.connect(g); g.connect(layers.perc.gain);
    s.start(when); s.stop(when + dur + 0.02);
  }

  // ---- the phrase --------------------------------------------------------------------------
  function chordRoot() { return SCALE[PROG[bar % PROG.length] % SCALE.length] + (PROG[bar % PROG.length] >= 7 ? 12 : 0); }

  function scheduleStep(when) {
    var beat = 60 / bpm, sixteenth = beat / 4;
    var root = chordRoot();

    // pad follows the bar, glided
    if (step % 16 === 0) {
      bar++;
      var r = chordRoot();
      for (var i = 0; i < layers.pad.osc.length; i++) {
        var o = layers.pad.osc[i];
        o.frequency.setTargetAtTime(hz(r + 12) * (i === 2 ? 1.5 : 1), when, 0.35);
      }
    }

    // sub on beats 1 and 3, plus an offbeat push once the fight is on
    if (step % 8 === 0) subNote(when, hz(root - 12), beat * 0.9);
    else if (step % 8 === 6 && (situation === 'combat' || situation === 'boss')) subNote(when, hz(root - 12), sixteenth * 1.6);

    // arp walks the chord: root, third, fifth, octave, with a passing degree on the last sixteenth
    if (step % 2 === 0) {
      var idx = (step / 2) % 4;
      var deg = [0, 2, 4, 7][idx];
      pluck(when, hz(root + SCALE[deg % SCALE.length] + (deg >= 7 ? 12 : 0) + 24), sixteenth * 1.8, layers.arp.gain, 'square', 0.22);
    }

    // percussion: kick on the beat, hat on every offbeat, a snare answer on 3
    if (step % 4 === 0) hit(when, false, 0.16, 0.55);
    if (step % 2 === 1) hit(when, true, 0.035, 0.16);
    if (step % 16 === 8) hit(when, true, 0.10, 0.30);

    step = (step + 1) % 16;
  }

  function tick() {
    if (!ctx) return;
    var beat = 60 / bpm, sixteenth = beat / 4;
    while (nextNote < now() + CFG.SCHEDULE_AHEAD) {
      if (nextNote < now()) nextNote = now() + 0.02;   // woke late (background tab): do not spray
      scheduleStep(nextNote);
      nextNote += sixteenth;
    }
  }

  // ---- situation ---------------------------------------------------------------------------
  function applySituation(name, immediate) {
    var s = SITUATIONS[name] || SITUATIONS.calm;
    situation = name;
    bpm = s.bpm;
    if (!layers) return;
    var t = now(), fade = immediate ? 0.03 : CFG.FADE;
    for (var k in layers) {
      if (!Object.prototype.hasOwnProperty.call(layers, k)) continue;
      var target = s.gains[k] || 0;
      layers[k].target = target;
      try { layers[k].gain.gain.setTargetAtTime(target, t, fade / 3); }
      catch (e) { layers[k].gain.gain.value = target; }
    }
  }

  /* Read the game, not a flag someone has to remember to set.  Every field is probed rather than
     assumed, and anything missing falls back to calm - a score that throws is worse than no score.
     Signals, in the order they win:
       docked    P.docked is set by the dock path in index.html
       boss      a hostile at least twice the player's max hull is inside HOSTILE_SEEN
       combat    a hostile inside HOSTILE_NEAR, or the player lost hull in the last 6 s
       tension   a hostile inside HOSTILE_SEEN
   */
  function detect() {
    try {
      var H = window.HOST; if (!H) return 'calm';
      var P = typeof H.P === 'function' ? H.P() : H.P;
      if (!P) return 'calm';
      if (P.docked) { lastHp = P.hp; return 'docked'; }

      if (typeof P.hp === 'number') {
        if (lastHp !== null && P.hp < lastHp - 0.5) hurtUntil = Date.now() + 6000;
        lastHp = P.hp;
      }

      var ships = (typeof H.ships === 'function' ? H.ships() : H.ships) || [];
      var near = Infinity, big = false;
      for (var i = 0; i < ships.length; i++) {
        var s = ships[i];
        if (!s || s === P || s.alive === false) continue;
        if (s.role === 'player' || s.team === 'squad') continue;   // coalition: not a threat
        if (!s.pos || !P.pos || typeof s.pos.distanceTo !== 'function') continue;
        var d = s.pos.distanceTo(P.pos);
        if (d < near) near = d;
        if (d < CFG.HOSTILE_SEEN && typeof s.maxHp === 'number' && typeof P.maxHp === 'number'
            && s.maxHp >= P.maxHp * 2) big = true;
      }
      if (big) return 'boss';
      if (near < CFG.HOSTILE_NEAR || Date.now() < hurtUntil) return 'combat';
      if (near < CFG.HOSTILE_SEEN) return 'tension';
    } catch (e) { /* a score must never take the game down */ }
    return 'calm';
  }

  /* MANUAL OVERRIDE.  Found by driving it rather than by reading it: MUSIC.set('combat') used to
     raise the combat layers and then have them pulled straight back down, because poll() runs every
     900 ms, sees detect() saying 'calm', and overwrites whatever was just asked for.  The situation
     never changed and the API was useless for testing the very thing it exists to test.  A manual
     set now latches until MUSIC.auto() hands control back to the detector. */
  var manual = false;

  function poll() {
    if (manual) return;
    var s = detect();
    if (s !== wanted) { wanted = s; applySituation(s, false); }
  }

  // ---- lifecycle ---------------------------------------------------------------------------
  function start() {
    if (started) return true;
    var c = (window.SOUND && typeof SOUND.init === 'function') ? SOUND.init() : null;
    if (!c) {
      // no shared context (no Web Audio, or SOUND failed): try our own before giving up
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      try { c = new Ctor(); } catch (e) { return false; }
    }
    ctx = c;
    try { if (ctx.state === 'suspended' && ctx.resume) ctx.resume(); } catch (e) { /* gesture will */ }
    try { build(); } catch (e) { ctx = null; return false; }
    started = true;
    nextNote = now() + 0.08;
    applySituation(wanted, true);
    timer = setInterval(tick, CFG.LOOKAHEAD_MS);
    poller = setInterval(poll, CFG.POLL_MS);
    return true;
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (poller) { clearInterval(poller); poller = null; }
    started = false;
  }

  function setVolume(v) {
    vol = Math.max(0, Math.min(1, +v || 0));
    if (bus) try { bus.gain.setTargetAtTime(muted ? 0 : vol, now(), 0.05); } catch (e) { bus.gain.value = muted ? 0 : vol; }
    save();
    return vol;
  }
  function setMute(b) {
    muted = !!b;
    if (bus) try { bus.gain.setTargetAtTime(muted ? 0 : vol, now(), 0.05); } catch (e) { bus.gain.value = muted ? 0 : vol; }
    save();
    return muted;
  }
  function save() { try { localStorage.setItem(CFG.LS_KEY, JSON.stringify({ vol: vol, muted: muted })); } catch (e) { /* private mode */ } }
  function load() {
    try {
      var p = JSON.parse(localStorage.getItem(CFG.LS_KEY) || 'null');
      if (p && typeof p.vol === 'number') vol = p.vol;
      if (p && typeof p.muted === 'boolean') muted = p.muted;
    } catch (e) { /* fine */ }
  }
  load();

  // Browsers refuse audio before a gesture, so the score starts on the first one and then the
  // listeners remove themselves.  This is also why start() is idempotent.
  function arm() {
    var go = function () {
      start();
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('keydown', go, true);
    };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }
  if (typeof window !== 'undefined' && window.addEventListener) arm();

  var API = {
    CFG: CFG,
    start: start, stop: stop,
    set: function (name) { if (!SITUATIONS[name]) return false; manual = true; wanted = name; applySituation(name, false); return true; },
    auto: function () { manual = false; poll(); return true; },
    isManual: function () { return manual; },
    situation: function () { return situation; },
    situations: function () { return Object.keys(SITUATIONS); },
    detect: detect,
    setVolume: setVolume, volume: function () { return vol; },
    setMute: setMute, muted: function () { return muted; },
    toggleMute: function () { return setMute(!muted); },
    started: function () { return started; },
    // the observable: what is actually playing, and how loud each layer is right now
    debug: function () {
      var out = { started: started, situation: situation, bpm: bpm, vol: vol, muted: muted,
                  manual: manual, ctx: ctx ? ctx.state : null, layers: {} };
      if (layers) for (var k in layers) if (Object.prototype.hasOwnProperty.call(layers, k))
        out.layers[k] = { now: +layers[k].gain.gain.value.toFixed(3), target: layers[k].target };
      return out;
    }
  };

  if (typeof window !== 'undefined') window.MUSIC = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
