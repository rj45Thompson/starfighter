// ground.js - the SURFACE, walked in first person (USE_CASES UC-403).
//
// RJ 2026-09-06: "landing on the surface the tactics game is not done and the level you walk around is very bad
// just a toy" / "maybe you can copy a FPS repo for some three.js first person view which is for when you land".
// Nothing is copied: this is a first-person controller and a generated world written against the three.js already
// in the page, because a dropped-in repo would bring its own loop, its own input and its own assets to fight with.
//
// What replaces the toy (a flat plane, a grid helper, random boxes, cylinder figures):
//   TERRAIN   a real heightfield - seeded per planet NAME, shaped per planet TYPE (mining ridges, agri rolling,
//             refinery flats, hi-tech terraces, luxury dunes), vertex-coloured by height and slope, walked with
//             true ground-height sampling so you climb what you can see.
//   SKY       the dark world the orbital view now shows: near-black ground haze, stars overhead, the settlement
//             picked out by its own lights.
//   TOWN      a settlement whose SIZE is the planet's development level: domes, habs, a mast, crates, all placed
//             ON the terrain and all solid.
//   PEOPLE    colonists on a friendly world, Synod troopers on a held one. Troopers hunt; colonists talk.
//   CONTROL   pointer-lock mouse look, WASD, sprint, jump with gravity, head bob, and collision against both the
//             terrain and every building.
//
// One global: window.GROUND. It owns a scene and a camera and nothing else - the caller renders it and drives it,
// so it drops into the existing away-mission overlay without a second render loop or a second input system.
(function () {
  'use strict';
  var T = null;   // three, resolved at build time from the page

  var CFG = {
    SIZE: 240,            // metres across
    SEG: 160,             // heightfield resolution
    EYE: 1.7,             // eye height above ground
    WALK: 6.2, RUN: 11.5, ACCEL: 34, FRICTION: 11,
    GRAVITY: 22, JUMP: 7.4,
    LOOK: 0.0022, PITCH_LIMIT: 1.45,
    BOB_HZ: 8.4, BOB_AMP: 0.055,
    RADIUS: 0.55,         // the walker's collision radius
    STEP_UP: 0.9,         // how tall a step can be climbed rather than blocked
    FOG: [42, 190],
    TOWN_R: 46,           // settlement radius around the pad
    PAD_R: 9,             // the landing deck's own level ground
    PROPS: 90,
    FOE_SPEED: 3.4, FOE_ENGAGE_R: 3.2, FOE_AGGRO_R: 44,
    TALK_R: 3.4,
    STARS: 900
  };

  var S = {
    scene: null, cam: null, yaw: 0, pitch: 0, vel: null, onGround: false, bob: 0,
    height: null, solids: [], foes: [], folk: [], pad: null, planet: null, seed: 0,
    keys: null, locked: false, t: 0, prompt: '', built: false
  };

  // ---- deterministic noise: the same world every time you land on the same planet ---------------------------
  function hashSeed(str) { var h = 2166136261, i; str = String(str || 'world');
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h >>> 0; }
  function rngOf(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function vnoise(seed) {
    // value noise on a 256 lattice, smoothed - enough shape for terrain without a library
    var p = new Float32Array(256 * 256), rnd = rngOf(seed), i;
    for (i = 0; i < p.length; i++) p[i] = rnd();
    function at(x, y) { return p[((y & 255) << 8) + (x & 255)]; }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
  }

  // per world-type terrain character: [amplitude, frequency, ridged, extra octaves]
  var SHAPE = {
    'Mining':   { amp: 16, freq: 0.055, ridge: 0.75, oct: 5, rock: 0.85 },
    'Refinery': { amp: 6,  freq: 0.035, ridge: 0.15, oct: 4, rock: 0.7 },
    'Agri':     { amp: 9,  freq: 0.028, ridge: 0.0,  oct: 4, rock: 0.15 },
    'Hi-Tech':  { amp: 11, freq: 0.04,  ridge: 0.35, oct: 5, rock: 0.5 },
    'Luxury':   { amp: 12, freq: 0.022, ridge: 0.0,  oct: 3, rock: 0.25 },
    'default':  { amp: 10, freq: 0.04,  ridge: 0.3,  oct: 4, rock: 0.6 }
  };

  function buildHeight(planet) {
    var sh = SHAPE[(planet && planet.type && planet.type.t) || ''] || SHAPE['default'];
    var n = vnoise(S.seed);
    return function (x, z) {
      var h = 0, a = 1, f = sh.freq, i, total = 0;
      for (i = 0; i < sh.oct; i++) {
        var v = n(x * f + 100, z * f + 100);
        if (sh.ridge > 0) v = 1 - Math.abs(v * 2 - 1) * sh.ridge - (1 - sh.ridge) * (1 - v);
        h += v * a; total += a; a *= 0.5; f *= 2.03;
      }
      h = (h / total) * sh.amp;
      // the landing site is flattened so the pad and the town sit on something walkable, and the pad itself sits on
      // ground that is genuinely level - otherwise the deck is cut into a slope and the ship appears half-buried
      var d = Math.hypot(x, z);
      if (d < CFG.PAD_R) return 0;
      var flat = Math.max(0, 1 - (d - CFG.PAD_R) / (CFG.TOWN_R * 0.55));
      return h * (1 - flat * 0.92);
    };
  }

  function terrainMesh(planet) {
    var g = new T.PlaneGeometry(CFG.SIZE, CFG.SIZE, CFG.SEG, CFG.SEG);
    g.rotateX(-Math.PI / 2);
    var pos = g.attributes.position, colors = new Float32Array(pos.count * 3);
    var base = new T.Color((planet && planet.type && planet.type.col) || 0x37506a);
    var rock = base.clone().multiplyScalar(0.22), soil = base.clone().multiplyScalar(0.42), high = base.clone().lerp(new T.Color(0xffffff), 0.22).multiplyScalar(0.5);
    var i, c = new T.Color();
    for (i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), y = S.height(x, z);
      pos.setY(i, y);
      var t = Math.max(0, Math.min(1, (y + 2) / 16));
      // was Math.random(): the single unseeded call in a builder that is otherwise driven by rngOf(S.seed),
      // so the same world speckled differently every time you landed on it. Hashed from the vertex index
      // instead - same world, same speckle, and no extra state to thread through.
      var sp = Math.sin(i * 12.9898 + S.seed * 0.017) * 43758.5453; sp -= Math.floor(sp);
      c.copy(soil).lerp(high, t).lerp(rock, sp * 0.18);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0.03 }));
  }

  function starDome(tint) {
    var g = new T.BufferGeometry(), n = CFG.STARS, pts = new Float32Array(n * 3), rnd = rngOf(S.seed ^ 0x5eed), i;
    for (i = 0; i < n; i++) {
      var th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 0.85 + 0.02), r = 400;
      pts[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      pts[i * 3 + 1] = Math.cos(ph) * r;
      pts[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    }
    g.setAttribute('position', new T.BufferAttribute(pts, 3));
    return new T.Points(g, new T.PointsMaterial({ color: 0xdfe9ff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
  }

  // a building is a box on the terrain plus its collision footprint
  function addBuilding(x, z, w, h, d, col, rot) {
    var y = S.height(x, z);
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color: col, roughness: 0.75, metalness: 0.22 }));
    m.position.set(x, y + h / 2, z); m.rotation.y = rot || 0; S.scene.add(m);
    // lit windows: a dark world reads by its lights
    var lit = new T.Mesh(new T.BoxGeometry(w * 1.002, h * 0.16, d * 1.002),
      new T.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.55 }));
    lit.position.set(x, y + h * 0.62, z); lit.rotation.y = rot || 0; S.scene.add(lit);
    S.solids.push({ x: x, z: z, hw: w / 2 + CFG.RADIUS, hd: d / 2 + CFG.RADIUS, top: y + h, rot: rot || 0 });
    return m;
  }
  function addDome(x, z, r, col) {
    var y = S.height(x, z);
    var m = new T.Mesh(new T.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.3 }));
    m.position.set(x, y, z); S.scene.add(m);
    var ring = new T.Mesh(new T.TorusGeometry(r * 1.02, 0.08, 6, 30), new T.MeshBasicMaterial({ color: 0x8ff5ff, transparent: true, opacity: 0.5 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y + 0.35, z); S.scene.add(ring);
    S.solids.push({ x: x, z: z, hw: r + CFG.RADIUS, hd: r + CFG.RADIUS, top: y + r, round: r + CFG.RADIUS });
    return m;
  }

  function person(colour, tall) {
    var g = new T.Group();
    // three r128 has no CapsuleGeometry - test the CONSTRUCTOR, never `new X ? ...`, which constructs undefined
    var shape = (typeof T.CapsuleGeometry === 'function') ? new T.CapsuleGeometry(0.32, tall - 0.9, 4, 10)
                                                          : new T.CylinderGeometry(0.32, 0.32, tall - 0.3, 10);
    var body = new T.Mesh(shape,
      new T.MeshStandardMaterial({ color: colour, roughness: 0.6, emissive: new T.Color(colour).multiplyScalar(0.18) }));
    body.position.y = tall * 0.55; g.add(body);
    var head = new T.Mesh(new T.SphereGeometry(0.24, 12, 10), new T.MeshStandardMaterial({ color: 0xf0e4d8, roughness: 0.5 }));
    head.position.y = tall * 0.98; g.add(head);
    var lamp = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), new T.MeshBasicMaterial({ color: 0xffd479 }));
    lamp.position.set(0.18, tall * 0.9, 0.22); g.add(lamp);
    return g;
  }

  function buildTown(planet, hostile) {
    var rnd = rngOf(S.seed ^ 0xb17d), dev = (planet && planet.dev) || 1;
    var count = Math.max(5, Math.min(22, 4 + dev * 4));
    var col = new T.Color((planet && planet.type && planet.type.col) || 0x7fa0c0).multiplyScalar(0.5);
    var i;
    for (i = 0; i < count; i++) {
      var a = rnd() * Math.PI * 2, r = 10 + rnd() * (CFG.TOWN_R - 12);
      var x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 9) continue;                       // keep the pad clear
      if (rnd() < 0.34) addDome(x, z, 2.6 + rnd() * 3.4, col.clone().offsetHSL(rnd() * 0.06 - 0.03, 0.05, rnd() * 0.1));
      else addBuilding(x, z, 4 + rnd() * 7, 3 + rnd() * 9, 4 + rnd() * 7, col.clone().offsetHSL(rnd() * 0.06 - 0.03, 0.04, rnd() * 0.12), rnd() * Math.PI);
    }
    // a comms mast, so the settlement has a landmark you can navigate by
    var mx = Math.cos(1.1) * 30, mz = Math.sin(1.1) * 30, my = S.height(mx, mz);
    var mast = new T.Mesh(new T.CylinderGeometry(0.2, 0.5, 26, 8), new T.MeshStandardMaterial({ color: 0x8a97a8, roughness: 0.6, metalness: 0.5 }));
    mast.position.set(mx, my + 13, mz); S.scene.add(mast);
    var beacon = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), new T.MeshBasicMaterial({ color: 0xff6a6a })); beacon.position.set(mx, my + 26, mz); S.scene.add(beacon);
    S.beacon = beacon;
    S.solids.push({ x: mx, z: mz, hw: 0.9, hd: 0.9, top: my + 26 });
    // scattered rocks and crates
    for (i = 0; i < CFG.PROPS; i++) {
      var px = (rnd() * 2 - 1) * (CFG.SIZE * 0.42), pz = (rnd() * 2 - 1) * (CFG.SIZE * 0.42);
      if (Math.hypot(px, pz) < 8) continue;
      var py = S.height(px, pz), sc = 0.5 + rnd() * 2.2;
      var rockM = new T.Mesh(new T.IcosahedronGeometry(sc, 0),
        new T.MeshStandardMaterial({ color: new T.Color(0x8b8578).offsetHSL(0, 0, rnd() * 0.12 - 0.06), roughness: 1, flatShading: true }));
      rockM.position.set(px, py + sc * 0.45, pz); rockM.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); S.scene.add(rockM);
      if (sc > 1.5) S.solids.push({ x: px, z: pz, hw: sc * 0.8 + CFG.RADIUS, hd: sc * 0.8 + CFG.RADIUS, top: py + sc });
    }
    // the people
    var folkN = hostile ? 0 : Math.max(2, Math.min(9, dev * 2));
    for (i = 0; i < folkN; i++) {
      var fa = rnd() * Math.PI * 2, fr = 8 + rnd() * 26, fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr;
      var gp = person(0x9fd8ff, 1.75); gp.position.set(fx, S.height(fx, fz), fz); S.scene.add(gp);
      S.folk.push({ x: fx, z: fz, mesh: gp, phase: rnd() * 6.28, name: 'colonist' });
    }
    var foesN = hostile ? Math.max(3, Math.min(10, 2 + dev * 2)) : 0;
    for (i = 0; i < foesN; i++) {
      var ea = rnd() * Math.PI * 2, er = 26 + rnd() * 48, ex = Math.cos(ea) * er, ez = Math.sin(ea) * er;
      var ge = person(0xff5a6e, 1.9); ge.position.set(ex, S.height(ex, ez), ez); S.scene.add(ge);
      var ring = new T.Mesh(new T.RingGeometry(1.6, 2.1, 22), new T.MeshBasicMaterial({ color: 0xff5a6e, transparent: true, opacity: 0.4, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ge.add(ring);
      S.foes.push({ x: ex, z: ez, mesh: ge, ring: ring, alive: true });
    }
  }

  function buildPad() {
    var y = S.height(0, 0);
    var pad = new T.Group();
    var deck = new T.Mesh(new T.CylinderGeometry(7, 7.4, 0.5, 26), new T.MeshStandardMaterial({ color: 0x2b3a4c, roughness: 0.7, metalness: 0.35 }));
    deck.position.y = y + 0.25; pad.add(deck);
    var glow = new T.Mesh(new T.RingGeometry(6.2, 7.1, 40), new T.MeshBasicMaterial({ color: 0x8ff5ff, transparent: true, opacity: 0.6, side: T.DoubleSide }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = y + 0.53; pad.add(glow);
    var hull = new T.Mesh(new T.ConeGeometry(1.5, 6, 10), new T.MeshStandardMaterial({ color: 0xc9d6e4, roughness: 0.45, metalness: 0.6, emissive: 0x0a1622, emissiveIntensity: 0.6 }));
    hull.position.set(0, y + 3.9, 0); pad.add(hull);   // nose UP - it is a lander standing on its legs
    var band = new T.Mesh(new T.TorusGeometry(1.35, 0.12, 6, 20), new T.MeshBasicMaterial({ color: 0x8ff5ff, transparent: true, opacity: 0.75 }));
    band.rotation.x = Math.PI / 2; band.position.set(0, y + 2.4, 0); pad.add(band);
    for (var i = 0; i < 3; i++) {
      var leg = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 2.4, 6), new T.MeshStandardMaterial({ color: 0x8a97a8, metalness: 0.6, roughness: 0.4 }));
      var a = i / 3 * Math.PI * 2;
      leg.position.set(Math.cos(a) * 1.5, y + 1.1, Math.sin(a) * 1.5); leg.rotation.z = Math.cos(a) * 0.22; leg.rotation.x = -Math.sin(a) * 0.22; pad.add(leg);
    }
    S.scene.add(pad); S.pad = { g: pad, glow: glow, y: y };
    S.solids.push({ x: 0, z: 0, hw: 1.9 + CFG.RADIUS, hd: 1.9 + CFG.RADIUS, top: y + 6, round: 1.9 + CFG.RADIUS });   // the lander itself is solid; the deck is not, you walk on it
  }

  // ---- build ------------------------------------------------------------------------------------------------
  function build(planet, opts) {
    T = (opts && opts.THREE) || window.T || window.THREE;
    if (!T) return null;
    S.planet = planet || null;
    S.seed = hashSeed((planet && planet.name) || 'surface');
    S.height = buildHeight(planet);
    S.solids = []; S.foes = []; S.folk = [];
    var hostile = !!(planet && (planet.hegemon || (planet.rep != null && planet.rep <= ((opts && opts.hostileRep) || -6))));

    var sc = new T.Scene(); S.scene = sc;
    var tint = new T.Color((planet && planet.type && planet.type.col) || 0x37506a).multiplyScalar(0.10);
    sc.background = tint.clone(); sc.fog = new T.Fog(tint.getHex(), CFG.FOG[0], CFG.FOG[1]);
    sc.add(new T.HemisphereLight(0x4a5f7a, 0x05070b, 0.55));
    var moon = new T.DirectionalLight(0xbcd0ff, 0.5); moon.position.set(-40, 60, -20); sc.add(moon);
    var warm = new T.PointLight(0xffd479, 1.6, 90, 2); warm.position.set(0, S.height(0, 0) + 8, 0); sc.add(warm);
    sc.add(starDome());
    sc.add(terrainMesh(planet));
    buildPad();
    buildTown(planet, hostile);

    var cam = new T.PerspectiveCamera(72, 16 / 9, 0.1, 900); S.cam = cam;
    S.yaw = 0; S.pitch = -0.05; S.vel = new T.Vector3();   // yaw 0 looks toward -Z: the pad, the ship and the town beyond it
    cam.position.set(0, S.height(0, 13) + CFG.EYE, 13);
    S.keys = new Set(); S.t = 0; S.onGround = true; S.built = true;
    return { scene: sc, camera: cam, hostile: hostile, foes: S.foes.length, folk: S.folk.length, solids: S.solids.length };
  }

  // ---- movement ----------------------------------------------------------------------------------------------
  function blocked(x, z, y) {
    for (var i = 0; i < S.solids.length; i++) {
      var s = S.solids[i];
      if (s.round != null) { if (Math.hypot(x - s.x, z - s.z) < s.round && y < s.top - CFG.STEP_UP) return true; continue; }
      var dx = x - s.x, dz = z - s.z;
      if (s.rot) { var c = Math.cos(-s.rot), si = Math.sin(-s.rot); var rx = dx * c - dz * si, rz = dx * si + dz * c; dx = rx; dz = rz; }
      if (Math.abs(dx) < s.hw && Math.abs(dz) < s.hd && y < s.top - CFG.STEP_UP) return true;
    }
    return false;
  }
  function look(dx, dy) {
    S.yaw -= dx * CFG.LOOK; S.pitch -= dy * CFG.LOOK;
    S.pitch = Math.max(-CFG.PITCH_LIMIT, Math.min(CFG.PITCH_LIMIT, S.pitch));
  }
  function key(code, down) { if (!S.keys) return; if (down) S.keys.add(code); else S.keys.delete(code); }

  function update(dt) {
    if (!S.built) return null;
    dt = Math.min(0.05, dt || 0.016);
    S.t += dt;
    var k = S.keys, cam = S.cam;
    var fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw), rx = -fz, rz = fx;
    var ix = 0, iz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) iz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    var len = Math.hypot(ix, iz) || 1;
    var speed = (k.has('ShiftLeft') || k.has('ShiftRight')) ? CFG.RUN : CFG.WALK;
    var wishX = (fx * iz + rx * ix) / len, wishZ = (fz * iz + rz * ix) / len;
    var moving = (ix || iz);
    S.vel.x += (wishX * speed - S.vel.x) * Math.min(1, CFG.ACCEL * dt / speed);
    S.vel.z += (wishZ * speed - S.vel.z) * Math.min(1, CFG.ACCEL * dt / speed);
    if (!moving) { var f = Math.max(0, 1 - CFG.FRICTION * dt); S.vel.x *= f; S.vel.z *= f; }

    // (the height sample that used to sit here was a dead store: it was overwritten below after the move, and
    //  every read of it costs a 4-5 octave noise evaluation per frame)
    if (S.onGround && k.has('Space')) { S.vel.y = CFG.JUMP; S.onGround = false; }
    S.vel.y -= CFG.GRAVITY * dt;

    var nx = cam.position.x + S.vel.x * dt, nz = cam.position.z + S.vel.z * dt;
    var footY = cam.position.y - CFG.EYE;
    if (!blocked(nx, cam.position.z, footY)) cam.position.x = nx; else S.vel.x = 0;
    if (!blocked(cam.position.x, nz, footY)) cam.position.z = nz; else S.vel.z = 0;
    var lim = CFG.SIZE * 0.46;
    cam.position.x = Math.max(-lim, Math.min(lim, cam.position.x));
    cam.position.z = Math.max(-lim, Math.min(lim, cam.position.z));

    cam.position.y += S.vel.y * dt;
    var gy = S.height(cam.position.x, cam.position.z);
    if (cam.position.y <= gy + CFG.EYE) { cam.position.y = gy + CFG.EYE; S.vel.y = 0; S.onGround = true; }
    else S.onGround = false;

    // head bob only while actually moving on the ground
    var sp = Math.hypot(S.vel.x, S.vel.z);
    S.bob += dt * CFG.BOB_HZ * (sp / CFG.WALK);
    var bob = (S.onGround && sp > 0.6) ? Math.sin(S.bob) * CFG.BOB_AMP * (sp / CFG.WALK) : 0;
    cam.rotation.set(S.pitch, S.yaw, 0, 'YXZ');
    cam.position.y += bob;

    // people
    var i, engaged = null, near = null;
    for (i = 0; i < S.folk.length; i++) {
      var p = S.folk[i];
      p.mesh.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
      p.mesh.position.y = S.height(p.x, p.z) + Math.sin(S.t * 1.4 + p.phase) * 0.03;
      if (Math.hypot(cam.position.x - p.x, cam.position.z - p.z) < CFG.TALK_R) near = p;
    }
    for (i = 0; i < S.foes.length; i++) {
      var f = S.foes[i]; if (!f.alive) continue;
      var dx = cam.position.x - f.x, dz = cam.position.z - f.z, d = Math.hypot(dx, dz);
      if (d < CFG.FOE_AGGRO_R && d > CFG.FOE_ENGAGE_R) {
        var st = Math.min(CFG.FOE_SPEED * dt, d - CFG.FOE_ENGAGE_R * 0.9);
        var tx = f.x + dx / d * st, tz = f.z + dz / d * st;
        if (!blocked(tx, f.z, S.height(tx, f.z))) f.x = tx;
        if (!blocked(f.x, tz, S.height(f.x, tz))) f.z = tz;
      }
      f.mesh.position.set(f.x, S.height(f.x, f.z), f.z);
      f.mesh.rotation.y = Math.atan2(dx, dz);
      if (f.ring) f.ring.material.opacity = 0.3 + 0.25 * Math.sin(S.t * 3);
      if (d <= CFG.FOE_ENGAGE_R) engaged = f;
    }
    if (S.beacon) S.beacon.material.color.setHSL(0, 0.8, 0.4 + 0.25 * Math.sin(S.t * 2.2));
    if (S.pad && S.pad.glow) S.pad.glow.material.opacity = 0.45 + 0.3 * Math.sin(S.t * 2.5);

    var onPad = Math.hypot(cam.position.x, cam.position.z) < 7.4 && Math.abs(cam.position.y - CFG.EYE - S.pad.y) < 2.5;
    return { engaged: engaged, nearFolk: near, onPad: onPad, foesLeft: S.foes.filter(function (x) { return x.alive; }).length,
      pos: { x: +cam.position.x.toFixed(1), y: +cam.position.y.toFixed(1), z: +cam.position.z.toFixed(1) }, onGround: S.onGround, speed: +sp.toFixed(2) };
  }

  function dispose() {
    if (S.scene) { S.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); }); else o.material.dispose(); } }); }
    S.scene = null; S.cam = null; S.built = false; S.solids = []; S.foes = []; S.folk = [];
  }

  window.GROUND = {
    CFG: CFG, build: build, update: update, key: key, look: look, dispose: dispose,
    scene: function () { return S.scene; }, camera: function () { return S.cam; },
    heightAt: function (x, z) { return S.height ? S.height(x, z) : 0; },
    state: function () { return { built: S.built, foes: S.foes.length, folk: S.folk.length, solids: S.solids.length, pos: S.cam ? S.cam.position.clone() : null, yaw: S.yaw, pitch: S.pitch, onGround: S.onGround }; },
    teleport: function (x, z) { if (S.cam) { S.cam.position.set(x, S.height(x, z) + CFG.EYE, z); S.vel.set(0, 0, 0); } }
  };
})();
