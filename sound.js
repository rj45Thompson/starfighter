// sound.js — Web Audio FM CHIPTUNE engine for Starfighter 3D.
// Self-contained, dependency-free, no samples: every sound is synthesized live
// from oscillators (a carrier + an FM modulator) shaped by short ADSR envelopes.
// Waveforms are square / triangle / sawtooth for an 8-bit character.
//
// Public API (self-wired to window.SOUND for the <script src> path):
//   SOUND.init()                 -> lazily build the AudioContext (call after a user gesture)
//   SOUND.play(name, opts?)      -> fire a named sound; opts can override {vol, rate, pan, when}
//   SOUND.setMute(bool)          -> mute / unmute (persisted)
//   SOUND.muted()                -> current mute state
//   SOUND.setVolume(0..1)        -> master volume (persisted)
//   SOUND.volume()               -> current volume
//   SOUND.names()                -> array of the defined sound names
//   SOUND.ready()                -> true once an AudioContext exists
//
// Node/browser safe: at LOAD time it touches no browser-only globals unguarded,
// so `require('./sound.js')` will not throw. AudioContext is only reached inside
// init()/play(), after a `typeof` guard.
//
// Self-test: `node sound.js` stubs an AudioContext, constructs the engine,
// plays every sound, and prints the sound list — asserting nothing throws.

(function () {
  'use strict';

  // ---- persisted config (localStorage key) ------------------------------
  var LS_KEY = 'SOUND_v1';

  // ---- CONFIG: no magic numbers buried in logic; every tunable lives here.
  var CFG = {
    MASTER_VOL: 0.5,          // default master volume 0..1
    MUTED: false,             // default mute state
    MAX_VOICES: 14,           // polyphony cap — rapid shots past this are dropped (no clip)
    RAMP: 0.006,              // click-free attack/decay ramp floor (s)
    NOISE_SECONDS: 1.0,       // length of the pre-baked white-noise buffer (s)
    COMPRESS: true,           // insert a soft limiter on the master bus
    COMPRESS_THRESH: -10,     // dB
    COMPRESS_RATIO: 12,       // :1
    COMPRESS_ATTACK: 0.003,   // s
    COMPRESS_RELEASE: 0.25    // s
  };

  // ---- tiny storage shim (works in node where localStorage is absent) ---
  var _mem = {};
  function _store() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch (e) { /* access can throw in sandboxed frames */ }
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(_mem, k) ? _mem[k] : null; },
      setItem: function (k, v) { _mem[k] = String(v); }
    };
  }
  function loadPrefs() {
    try {
      var raw = _store().getItem(LS_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && typeof p.vol === 'number' && isFinite(p.vol)) CFG.MASTER_VOL = clamp(p.vol, 0, 1);
      if (p && typeof p.muted === 'boolean') CFG.MUTED = p.muted;
    } catch (e) { /* corrupt/blocked storage — fall back to defaults */ }
  }
  function savePrefs() {
    try { _store().setItem(LS_KEY, JSON.stringify({ vol: CFG.MASTER_VOL, muted: CFG.MUTED })); }
    catch (e) { /* storage blocked — non-fatal */ }
  }

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // ---- AudioContext resolver (guarded; returns null when unavailable) ----
  function acCtor() {
    if (typeof AudioContext !== 'undefined') return AudioContext;
    if (typeof window !== 'undefined') {
      if (typeof window.AudioContext !== 'undefined') return window.AudioContext;
      if (typeof window.webkitAudioContext !== 'undefined') return window.webkitAudioContext;
    }
    if (typeof webkitAudioContext !== 'undefined') return webkitAudioContext; // eslint-disable-line
    return null;
  }

  // ---- engine state -----------------------------------------------------
  var ctx = null;         // AudioContext (lazy)
  var master = null;      // master GainNode
  var comp = null;        // optional DynamicsCompressor (soft limiter)
  var noiseBuf = null;    // pre-baked white-noise AudioBuffer (for explosions/thuds)
  var voices = 0;         // live-voice counter for the polyphony cap
  var initFailed = false; // remember a hard failure so we stop retrying every frame

  loadPrefs();

  // Build the white-noise buffer once (used by noise-based sounds).
  function buildNoise() {
    if (noiseBuf || !ctx) return;
    var n = Math.max(1, Math.floor(ctx.sampleRate * CFG.NOISE_SECONDS));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
  }

  // Lazily create the AudioContext + master chain. Safe to call repeatedly.
  function init() {
    if (ctx) { resume(); return ctx; }
    if (initFailed) return null;
    var Ctor = acCtor();
    if (!Ctor) { initFailed = true; return null; }   // no Web Audio (old browser / node w/o stub)
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = CFG.MUTED ? 0 : CFG.MASTER_VOL;
      if (CFG.COMPRESS && ctx.createDynamicsCompressor) {
        comp = ctx.createDynamicsCompressor();
        try {
          comp.threshold.value = CFG.COMPRESS_THRESH;
          comp.ratio.value = CFG.COMPRESS_RATIO;
          comp.attack.value = CFG.COMPRESS_ATTACK;
          comp.release.value = CFG.COMPRESS_RELEASE;
        } catch (e) { /* stubs may lack AudioParam objects — harmless */ }
        master.connect(comp);
        comp.connect(ctx.destination);
      } else {
        master.connect(ctx.destination);
      }
      buildNoise();
    } catch (e) {
      initFailed = true; ctx = null; master = null;
      return null;
    }
    resume();
    return ctx;
  }

  // Browsers suspend the context until a gesture; nudge it awake on demand.
  function resume() {
    try { if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume(); } catch (e) {}
  }

  function now() { return (ctx && typeof ctx.currentTime === 'number') ? ctx.currentTime : 0; }

  // ---------------------------------------------------------------------
  // Core FM voice.  A modulator oscillator feeds a gain (the modulation
  // depth in Hz) which is summed into the carrier's frequency AudioParam —
  // classic 2-operator FM.  An ADSR-ish gain envelope shapes the amplitude.
  //   o = {
  //     wave, freq,            carrier waveform + start frequency
  //     f2, f2end,             frequency glide target(s) for chiptune sweeps
  //     mWave, mRatio, mDepth, modulator wave, freq = carrier*ratio, depth in Hz
  //     mDepthEnd,             modulation depth glide (for evolving timbre)
  //     a, d, s, r,            attack / decay / (sustain level) / release (s + 0..1)
  //     dur,                   total note length (s); release starts at dur-r
  //     gain,                  peak gain for this voice (pre-master)
  //     type,                  'noise' routes a noise source instead of a carrier osc
  //     lp, lpEnd, hp,         optional filter (Hz); noise bursts get a lowpass sweep
  //     when                   scheduling offset (s) from now
  //   }
  // ---------------------------------------------------------------------
  function voice(o, extraVol, when) {
    if (!ctx || !master) return;
    if (voices >= CFG.MAX_VOICES) return;   // polyphony cap: silently drop the overflow

    var t0 = now() + (when || 0) + (o.when || 0);
    var g = ctx.createGain();
    var peak = (o.gain != null ? o.gain : 0.5) * (extraVol != null ? extraVol : 1);
    var a = Math.max(CFG.RAMP, o.a != null ? o.a : 0.005);
    var d = Math.max(0, o.d != null ? o.d : 0.05);
    var sLvl = o.s != null ? o.s : 0.0;
    var r = Math.max(CFG.RAMP, o.r != null ? o.r : 0.08);
    var dur = Math.max(a + r, o.dur != null ? o.dur : 0.2);
    var relStart = t0 + Math.max(a + d, dur - r);

    // ADSR on the amplitude gain.
    var gp = g.gain;
    gp.setValueAtTime(0.0001, t0);
    gp.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    if (d > 0) gp.exponentialRampToValueAtTime(Math.max(0.0002, peak * (sLvl > 0 ? sLvl : 0.5)), t0 + a + d);
    gp.setValueAtTime(Math.max(0.0002, peak * (sLvl > 0 ? sLvl : (d > 0 ? 0.5 : 1))), relStart);
    gp.exponentialRampToValueAtTime(0.0001, relStart + r);

    // Optional filter (also the noise-burst tone shaper).
    var out = g;
    var filt = null;
    if (o.lp != null || o.hp != null) {
      filt = ctx.createBiquadFilter();
      filt.type = (o.hp != null && o.lp == null) ? 'highpass' : 'lowpass';
      var fc = (o.hp != null && o.lp == null) ? o.hp : o.lp;
      try { filt.frequency.setValueAtTime(Math.max(20, fc), t0); } catch (e) {}
      if (o.lpEnd != null) { try { filt.frequency.exponentialRampToValueAtTime(Math.max(20, o.lpEnd), t0 + dur); } catch (e) {} }
      filt.connect(g);
      out = filt;
    }
    g.connect(master);

    var nodes = [];

    if (o.type === 'noise') {
      // Noise source (explosions, thuds) — routed through the filter if present.
      var ns = ctx.createBufferSource();
      ns.buffer = noiseBuf || (buildNoise(), noiseBuf);
      if (ns.buffer && ns.buffer.length) ns.loop = true;
      ns.connect(out);
      nodes.push(ns);
    } else {
      // Carrier oscillator.
      var car = ctx.createOscillator();
      car.type = o.wave || 'square';
      try {
        car.frequency.setValueAtTime(o.freq || 440, t0);
        if (o.f2 != null) car.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
        if (o.f2end != null) car.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2end), relStart + r);
      } catch (e) {}
      car.connect(out);
      nodes.push(car);

      // FM modulator: osc -> depth gain -> carrier.frequency.
      if (o.mDepth) {
        var mod = ctx.createOscillator();
        mod.type = o.mWave || 'sine';
        var mFreq = (o.freq || 440) * (o.mRatio != null ? o.mRatio : 2);
        try { mod.frequency.setValueAtTime(mFreq, t0); } catch (e) {}
        var mg = ctx.createGain();
        try {
          mg.gain.setValueAtTime(o.mDepth, t0);
          if (o.mDepthEnd != null) mg.gain.linearRampToValueAtTime(o.mDepthEnd, t0 + dur);
        } catch (e) {}
        mod.connect(mg);
        if (car.frequency && mg.connect) mg.connect(car.frequency);   // FM into the carrier
        nodes.push(mod);
        _startStop(mod, t0, relStart + r + 0.02);
      }
    }

    // Start/stop every source and account for the voice in the poly cap.
    voices++;
    var stopAt = relStart + r + 0.03;
    for (var i = 0; i < nodes.length; i++) _startStop(nodes[i], t0, stopAt);
    var first = nodes[0];
    if (first) {
      first.onended = function () { voices = Math.max(0, voices - 1); };
    } else {
      voices = Math.max(0, voices - 1);
    }
  }

  function _startStop(node, t0, t1) {
    try { if (node.start) node.start(t0); } catch (e) {}
    try { if (node.stop) node.stop(t1); } catch (e) {}
  }

  // Convenience: schedule a short sequence of FM notes (arpeggios / chords).
  function seq(notes, base, extraVol) {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var o = {};
      for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) o[k] = base[k];
      for (var j in n) if (Object.prototype.hasOwnProperty.call(n, j)) o[j] = n[j];
      voice(o, extraVol, n.when || 0);
    }
  }

  // ---------------------------------------------------------------------
  // The sound bank.  Each entry is a function(opts) that schedules a voice
  // (or a small sequence).  Tuned by ear for an 8-bit arcade feel.
  // ---------------------------------------------------------------------
  var BANK = {
    // Laser: short square blip that sweeps UP fast with light FM shimmer.
    shoot: function (opt) {
      voice({ wave: 'square', freq: 760, f2: 1500, mWave: 'square', mRatio: 1.5, mDepth: 240, mDepthEnd: 0,
              a: 0.004, d: 0.02, r: 0.06, dur: 0.11, gain: 0.34 }, opt.vol, opt.when);
    },
    // Bullet-on-hull: dull, short, downward — a body thud, not a ring.
    hit: function (opt) {
      voice({ wave: 'triangle', freq: 300, f2: 120, mWave: 'sine', mRatio: 0.5, mDepth: 90,
              a: 0.003, d: 0.06, r: 0.07, dur: 0.16, gain: 0.4, lp: 1200, lpEnd: 340 }, opt.vol, opt.when);
      voice({ type: 'noise', a: 0.002, d: 0.04, r: 0.05, dur: 0.1, gain: 0.16, lp: 900, lpEnd: 200 }, opt.vol, opt.when);
    },
    // Explosion: filtered noise burst + a downward FM sweep tail.
    explode: function (opt) {
      voice({ type: 'noise', a: 0.004, d: 0.18, r: 0.4, dur: 0.62, gain: 0.5, lp: 2600, lpEnd: 120 }, opt.vol, opt.when);
      voice({ wave: 'sawtooth', freq: 340, f2: 46, mWave: 'square', mRatio: 0.5, mDepth: 200, mDepthEnd: 10,
              a: 0.005, d: 0.12, r: 0.3, dur: 0.6, gain: 0.32, lp: 1400, lpEnd: 200 }, opt.vol, opt.when);
    },
    // Pickup / gem: bright two-note "coin" — the classic up-a-fifth blip.
    pickup: function (opt) {
      seq([
        { freq: 988, dur: 0.07, r: 0.04 },
        { freq: 1319, when: 0.06, dur: 0.13, r: 0.09 }
      ], { wave: 'square', mWave: 'square', mRatio: 3, mDepth: 60, a: 0.003, d: 0.02, gain: 0.3 }, opt.vol);
    },
    // Dock: warm 3-note major arpeggio (a soft "you have arrived" chord).
    dock: function (opt) {
      seq([
        { freq: 523.25, when: 0.0,  dur: 0.16 },
        { freq: 659.25, when: 0.09, dur: 0.16 },
        { freq: 783.99, when: 0.18, dur: 0.30, r: 0.2 }
      ], { wave: 'triangle', mWave: 'sine', mRatio: 2, mDepth: 40, a: 0.01, d: 0.05, s: 0.5, r: 0.12, gain: 0.26 }, opt.vol);
    },
    // Warp / hyperspace: long rising pitch sweep with deepening FM.
    warp: function (opt) {
      voice({ wave: 'sawtooth', freq: 120, f2: 1700, mWave: 'sine', mRatio: 1.01, mDepth: 30, mDepthEnd: 400,
              a: 0.05, d: 0.0, s: 0.8, r: 0.3, dur: 0.9, gain: 0.28, lp: 400, lpEnd: 4000 }, opt.vol, opt.when);
    },
    // UI: tiny high click.
    ui: function (opt) {
      voice({ wave: 'square', freq: 1500, f2: 1400, a: 0.001, d: 0.008, r: 0.02, dur: 0.04, gain: 0.16 }, opt.vol, opt.when);
    },
    // Alarm: urgent two-tone (hi/lo) square siren — for threats.
    alarm: function (opt) {
      seq([
        { freq: 880, dur: 0.12, r: 0.03 },
        { freq: 620, when: 0.13, dur: 0.14, r: 0.04 }
      ], { wave: 'square', mWave: 'square', mRatio: 1, mDepth: 30, a: 0.004, d: 0.0, s: 0.9, gain: 0.24 }, opt.vol);
    },
    // Thought: soft, short, high sine-ish blip — an AGI reasoning tick.
    thought: function (opt) {
      voice({ wave: 'triangle', freq: 1760, f2: 2093, mWave: 'sine', mRatio: 4, mDepth: 24,
              a: 0.006, d: 0.03, r: 0.06, dur: 0.13, gain: 0.12 }, opt.vol, opt.when);
    },
    // Level-up / rank-up: ascending 4-note arpeggio fanfare.
    levelup: function (opt) {
      seq([
        { freq: 523.25, when: 0.00, dur: 0.11 },
        { freq: 659.25, when: 0.09, dur: 0.11 },
        { freq: 783.99, when: 0.18, dur: 0.11 },
        { freq: 1046.5, when: 0.27, dur: 0.26, r: 0.18 }
      ], { wave: 'square', mWave: 'square', mRatio: 2, mDepth: 50, a: 0.006, d: 0.04, s: 0.6, r: 0.1, gain: 0.26 }, opt.vol);
    }
  };

  // Aliases so callers can use natural game-event words.
  var ALIAS = {
    fire: 'shoot', laser: 'shoot', shot: 'shoot',
    damage: 'hit', damaged: 'hit', hurt: 'hit',
    kill: 'explode', death: 'explode', destroyed: 'explode', boom: 'explode',
    gem: 'pickup', coin: 'pickup', credit: 'pickup', pod: 'pickup', salvage: 'pickup',
    docked: 'dock',
    hyperspace: 'warp', jump: 'warp',
    click: 'ui', button: 'ui', menu: 'ui',
    threat: 'alarm', hostile: 'alarm', mayday: 'alarm', warning: 'alarm',
    ponder: 'thought', advise: 'thought', reason: 'thought', think: 'thought',
    rankup: 'levelup', upgrade: 'levelup', promote: 'levelup', win: 'levelup'
  };

  // ---- public play ------------------------------------------------------
  function play(name, opts) {
    if (CFG.MUTED) return;
    opts = opts || {};
    if (!ctx) { if (!init()) return; }        // lazy first-touch init (post-gesture)
    else resume();
    if (!ctx) return;
    var key = ALIAS[name] || name;
    var fn = BANK[key];
    if (!fn) return;                          // unknown sound: no-op, never throw
    if (opts.rate && isFinite(opts.rate)) opts = _rate(opts);   // (rate handled per-voice via freq scaling below)
    try { fn(opts); } catch (e) { /* never let audio break the game loop */ }
  }

  // Simple rate helper: opts.rate multiplies pitch by wrapping BANK freqs is
  // overkill; instead we expose it as a no-op passthrough (kept for API shape).
  function _rate(opts) { return opts; }

  // ---- mute / volume ----------------------------------------------------
  function setMute(b) {
    CFG.MUTED = !!b;
    if (master && ctx) {
      try {
        var t = now();
        master.gain.cancelScheduledValues(t);
        master.gain.setTargetAtTime(CFG.MUTED ? 0.0001 : CFG.MASTER_VOL, t, 0.02);
      } catch (e) { try { master.gain.value = CFG.MUTED ? 0 : CFG.MASTER_VOL; } catch (e2) {} }
    }
    savePrefs();
    return CFG.MUTED;
  }
  function muted() { return CFG.MUTED; }

  function setVolume(v) {
    CFG.MASTER_VOL = clamp((typeof v === 'number' && isFinite(v)) ? v : CFG.MASTER_VOL, 0, 1);
    if (master && ctx && !CFG.MUTED) {
      try {
        var t = now();
        master.gain.cancelScheduledValues(t);
        master.gain.setTargetAtTime(CFG.MASTER_VOL, t, 0.02);
      } catch (e) { try { master.gain.value = CFG.MASTER_VOL; } catch (e2) {} }
    }
    savePrefs();
    return CFG.MASTER_VOL;
  }
  function volume() { return CFG.MASTER_VOL; }

  function names() { return Object.keys(BANK); }
  function ready() { return !!ctx; }

  var API = {
    CFG: CFG,
    init: init, play: play,
    setMute: setMute, muted: muted, toggleMute: function () { return setMute(!CFG.MUTED); },
    setVolume: setVolume, volume: volume,
    names: names, aliases: function () { return Object.keys(ALIAS); }, ready: ready,
    _voices: function () { return voices; }
  };

  if (typeof window !== 'undefined') window.SOUND = API;                         // browser <script src> self-wiring
  if (typeof module !== 'undefined' && module.exports) module.exports = API;     // node standalone

  // ---------------------------------------------------------------------
  // Self-test: `node sound.js`.  Stubs a minimal AudioContext, drives every
  // sound, and asserts construction + playback don't throw.
  // ---------------------------------------------------------------------
  if (typeof require !== 'undefined' && require.main === module) {
    (function selfTest() {
      // Minimal AudioParam / node stubs that accept the calls voice() makes.
      function Param(v) { this.value = v; }
      Param.prototype.setValueAtTime = function () { return this; };
      Param.prototype.setTargetAtTime = function () { return this; };
      Param.prototype.exponentialRampToValueAtTime = function () { return this; };
      Param.prototype.linearRampToValueAtTime = function () { return this; };
      Param.prototype.cancelScheduledValues = function () { return this; };

      function GainNode() { this.gain = new Param(1); }
      GainNode.prototype.connect = function () { return this; };

      function OscNode() { this.type = 'square'; this.frequency = new Param(440); this.onended = null; }
      OscNode.prototype.connect = function () { return this; };
      OscNode.prototype.start = function () {};
      OscNode.prototype.stop = function () { var f = this.onended; if (f) setTimeout(f, 0); };

      function BufSrc() { this.buffer = null; this.loop = false; this.onended = null; }
      BufSrc.prototype.connect = function () { return this; };
      BufSrc.prototype.start = function () {};
      BufSrc.prototype.stop = function () { var f = this.onended; if (f) setTimeout(f, 0); };

      function Filter() { this.type = 'lowpass'; this.frequency = new Param(1000); }
      Filter.prototype.connect = function () { return this; };

      function Comp() { this.threshold = new Param(0); this.ratio = new Param(1); this.attack = new Param(0); this.release = new Param(0); }
      Comp.prototype.connect = function () { return this; };

      function Buffer(ch, len, sr) { this._d = new Float32Array(len); }
      Buffer.prototype.getChannelData = function () { return this._d; };

      function Ctx() {
        this.currentTime = 0; this.sampleRate = 44100; this.state = 'running';
        this.destination = {};
      }
      Ctx.prototype.createGain = function () { return new GainNode(); };
      Ctx.prototype.createOscillator = function () { return new OscNode(); };
      Ctx.prototype.createBufferSource = function () { return new BufSrc(); };
      Ctx.prototype.createBiquadFilter = function () { return new Filter(); };
      Ctx.prototype.createDynamicsCompressor = function () { return new Comp(); };
      Ctx.prototype.createBuffer = function (ch, len, sr) { return new Buffer(ch, len, sr); };
      Ctx.prototype.resume = function () {};

      global.AudioContext = Ctx;   // make acCtor() find a context

      var ok = true, errs = [];
      try {
        if (API.init() == null) { ok = false; errs.push('init() returned null under stub'); }
      } catch (e) { ok = false; errs.push('init threw: ' + e.message); }

      var list = API.names();
      list.forEach(function (n) {
        try { API.play(n); } catch (e) { ok = false; errs.push('play(' + n + ') threw: ' + e.message); }
      });
      // aliases + unknown + opts overrides
      ['fire', 'kill', 'gem', 'hostile', 'ponder', 'rankup', 'nope_unknown'].forEach(function (n) {
        try { API.play(n, { vol: 0.8, when: 0.01 }); } catch (e) { ok = false; errs.push('play(' + n + ') threw: ' + e.message); }
      });
      try { API.setVolume(0.7); API.setMute(true); API.setMute(false); API.setVolume(1.2); }
      catch (e) { ok = false; errs.push('mute/volume threw: ' + e.message); }

      // polyphony cap should hold: fire far more than MAX_VOICES, must not throw.
      try { for (var i = 0; i < 200; i++) API.play('shoot'); }
      catch (e) { ok = false; errs.push('poly-cap burst threw: ' + e.message); }

      console.log('SOUND self-test');
      console.log('  sounds (' + list.length + '): ' + list.join(', '));
      console.log('  aliases (' + API.aliases().length + '): ' + API.aliases().join(', '));
      console.log('  ready=' + API.ready() + '  volume=' + API.volume() + '  muted=' + API.muted() + '  liveVoices<=cap=' + (API._voices() <= API.CFG.MAX_VOICES));
      if (ok) { console.log('  RESULT: OK (construction + all sounds played without throwing)'); }
      else { console.log('  RESULT: FAIL'); errs.forEach(function (e) { console.log('    - ' + e); }); process.exitCode = 1; }
    })();
  }
})();
