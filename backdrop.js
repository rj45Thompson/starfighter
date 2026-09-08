// backdrop.js - DEPTH behind the game. A skybox alone cannot have any.
//
// RJ 2026-09-07: "work on the backdrop to make it super awesome. right now it seems flat. make the skybox have
// depth and make the starsystems on top probably cut up objs with textures."
//
// He is describing a real limitation, not a taste. `scene.background` is sampled by direction ONLY - it is
// infinitely far away by construction, so no amount of flying changes what you see. Every star sits at the same
// non-distance and the eye reads the whole sky as a painted wall. Nothing drawn INTO that cube can fix it.
//
// Depth comes from parallax, and parallax needs things at actual distances. This builds three shells of them:
//
//   FAR    (12-20k)  galaxies and distant clusters. Barely move. They set the scale of everything else.
//   MID    (5-9k)    nebula sheets, large and faint, each on its own plane and rotation. These are what you
//                    notice moving when you fly - the layer that does most of the work.
//   NEAR   (1.5-3k)  thin dust veils and a scatter of foreground stars. They slide visibly, which is what tells
//                    you the mid layer is far rather than small.
//
// Every card is a textured quad ("cut up objs with textures" - a billboard, not geometry, because a nebula has no
// silhouette to model and 200 quads cost less than one lit mesh). They are additive with depthWrite off, so they
// never cut a ship, and they sit on renderOrder -5 so they draw behind everything the game puts in front.
//
// One global: window.BACKDROP. BACKDROP.build(opts) once the renderer and scene exist; BACKDROP.tick(dt) each
// frame to drift them. Nothing here reads game state.
(function () {
  'use strict';

  var CFG = {
    ENABLED: true,
    FAR:  { count: 7,  dist: [12000, 20000], size: [2600, 5200], opacity: 0.34 },
    MID:  { count: 11, dist: [5000, 9000],   size: [2200, 4600], opacity: 0.20 },
    NEAR: { count: 9,  dist: [1500, 3000],   size: [700, 1600],  opacity: 0.10 },
    DRIFT: 0.004,           // radians/sec the whole field turns, so a parked ship is not a still image
    // `px` is the sprite's diameter in SCREEN pixels, not world units. three.js sizes an attenuated point as
    // size * (drawingBufferHeight/2) / distance, so a world size that looks right at 9000 is a dinner plate at
    // 1900 - which is exactly the bug this replaced: 4200 stars at world size 26-46 drew as 10-20px squares.
    // The world size is now SOLVED per shell from its distance, so all three read as stars.
    STAR_SHELLS: [
      { n: 2200, dist: 9000,  px: 6,  opacity: 0.85 },
      { n: 1400, dist: 4200,  px: 8,  opacity: 0.65 },   // closer stars: these are the ones that parallax
      { n: 600,  dist: 1900,  px: 11, opacity: 0.40 }
    ],
    TEX: ['assets/gen/nebula_a.jpg', 'assets/gen/nebula_b.jpg', 'assets/gen/galaxy_a.jpg', 'assets/gen/galaxy_b.jpg']
  };

  var T = null, group = null, cards = [], stars = [], built = false, texCache = {};

  function three() { return window.T || window.THREE; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // A card stays INVISIBLE until its texture is in. Before that, a MeshBasicMaterial with an empty map renders
  // its flat `color` - and 27 tinted quads scattered across the sky is exactly what that looks like. It was
  // visible in the first screenshot as grey squares.
  var waiting = {};
  function tex(path) {
    if (texCache[path]) return texCache[path];
    var t = new (three().TextureLoader)().load(path, function () {
      (waiting[path] || []).forEach(function (m) { m.visible = true; });
      waiting[path] = null;
    }, undefined, function () {
      if (typeof console !== 'undefined') console.warn('backdrop: missing', path, '- that card will not draw');
    });
    t.encoding = three().sRGBEncoding;
    texCache[path] = t;
    return t;
  }

  // one card: a quad at a distance, facing the origin, rolled at random so no two read as the same sheet
  function card(layer, texPath) {
    var TT = three();
    var d = rnd(layer.dist[0], layer.dist[1]);
    var size = rnd(layer.size[0], layer.size[1]);
    var m = new TT.Mesh(
      new TT.PlaneGeometry(size, size * rnd(0.6, 1.0)),
      new TT.MeshBasicMaterial({ map: tex(texPath), transparent: true, opacity: layer.opacity,
        blending: TT.AdditiveBlending, depthWrite: false, depthTest: false, side: TT.DoubleSide,
        color: new TT.Color().setHSL(rnd(0.55, 0.75), rnd(0.15, 0.5), rnd(0.45, 0.7)) }));
    // a random direction, then face the middle: a card edge-on is an invisible card
    var dir = new TT.Vector3(rnd(-1, 1), rnd(-0.55, 0.55), rnd(-1, 1)).normalize();
    m.position.copy(dir).multiplyScalar(d);
    m.lookAt(0, 0, 0);
    m.rotateZ(rnd(0, Math.PI * 2));
    m.renderOrder = -5;
    m.frustumCulled = false;
    m.visible = false;                       // shown by tex()'s onLoad, never before
    (waiting[texPath] = waiting[texPath] || []).push(m);
    return m;
  }

  // A point sprite with NO map is a SOLID SQUARE - WebGL fills the whole gl_PointSize quad and there is nothing
  // to shape it. That is not a subtle artifact: it is what put grey squares across the entire sky in the first
  // build. Every Points material here gets this dot, a radial falloff with a tight core, so a star is round and
  // its edge dissolves instead of ending on a straight line. Built once, shared by all three shells.
  var dotTex = null;
  function dot() {
    if (dotTex) return dotTex;
    var TT = three(), S = 64, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var g = cv.getContext('2d'), grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    // core, halo, nothing. The steep middle stop is what keeps a bright pinpoint instead of a soft blob.
    grad.addColorStop(0.00, 'rgba(255,255,255,1)');
    grad.addColorStop(0.14, 'rgba(255,255,255,0.92)');
    grad.addColorStop(0.32, 'rgba(255,255,255,0.30)');
    grad.addColorStop(0.62, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    dotTex = new TT.CanvasTexture(cv);
    return dotTex;
  }

  // three.js gives an attenuated point `gl_PointSize = size * (drawingBufferHeight/2) / -viewZ`, in DEVICE
  // pixels, with no fov term. So CSS pixels = size * (cssHeight/2) / dist, and the world size we want is that
  // solved backwards. Measured from the live renderer when one is passed; 400 is a 800px-tall fallback.
  // ...but the canvas is not laid out yet when build() runs at page load. Reading clientHeight there returned
  // 150 and every star came out 6x too big - the same class of mistake as the squares. So the height is READ
  // EVERY FRAME (it is a cached DOM number, not a layout flush) and the world sizes are re-solved whenever it
  // actually changes, which also makes the field survive a window resize.
  var projPx = 400, rend = null, shellsOut = [];
  function livePx() {
    var h = 0;
    if (rend && rend.domElement) h = rend.domElement.clientHeight || 0;
    if (h < 200 && typeof window !== 'undefined') h = window.innerHeight || 0;   // pre-layout, or a hidden pane
    return h >= 200 ? h / 2 : 400;
  }
  function solveSize(px, dist) { return px * dist / projPx; }
  function refit() {
    var want = livePx();
    if (Math.abs(want - projPx) < 1) return false;
    projPx = want;
    for (var i = 0; i < shellsOut.length; i++)
      shellsOut[i].pts.material.size = solveSize(shellsOut[i].px, shellsOut[i].dist);
    return true;
  }

  // A star shell is ONE Points object, not a thousand sprites. Three shells at three distances is what turns a
  // starfield into a volume: fly, and the near shell slides across the far one.
  function starShell(shell) {
    var TT = three();
    var pos = new Float32Array(shell.n * 3), col = new Float32Array(shell.n * 3);
    var c = new TT.Color();
    for (var i = 0; i < shell.n; i++) {
      var v = new TT.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1));
      if (v.lengthSq() < 1e-6) v.set(1, 0, 0);
      v.normalize().multiplyScalar(shell.dist * rnd(0.85, 1.15));
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      // real starfields are not white: most stars are warm, a few are hot blue
      c.setHSL(Math.random() < 0.75 ? rnd(0.05, 0.12) : rnd(0.55, 0.62), rnd(0.1, 0.6), rnd(0.6, 1.0));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.BufferAttribute(pos, 3));
    g.setAttribute('color', new TT.BufferAttribute(col, 3));
    var m = new TT.Points(g, new TT.PointsMaterial({ size: solveSize(shell.px, shell.dist), sizeAttenuation: true,
      map: dot(), alphaTest: 0, vertexColors: true, transparent: true, opacity: shell.opacity, depthWrite: false,
      blending: TT.AdditiveBlending }));
    m.renderOrder = -6;
    m.frustumCulled = false;
    return m;
  }

  // Each layer is its OWN group, because parallax is a per-layer lag and a group has one position. Far rides the
  // camera almost exactly (it may as well be the sky); near rides it least, so it slides across the far layer as
  // you fly. That difference IS the depth - without it these are decals on the same wall.
  var layerGroups = [];

  var scn = null;
  function build(opts) {
    opts = opts || {};
    T = three();
    // the game declares its scene with `const scene`, which is NOT window.scene - the first version guarded on
    // window.scene and silently built nothing at all. The caller passes it in; the global is only a fallback.
    scn = opts.scene || (typeof window !== 'undefined' ? window.scene : null);
    if (!T || !scn || built || !CFG.ENABLED) return null;
    rend = opts.renderer || null;
    projPx = livePx();          // a first guess; refit() in tick() corrects it once the canvas has real height
    group = new T.Group(); group.name = 'backdrop';
    var layers = [
      { cfg: CFG.FAR,  follow: 1.00 },
      { cfg: CFG.MID,  follow: 0.86 },
      { cfg: CFG.NEAR, follow: 0.62 }
    ];
    for (var li = 0; li < layers.length; li++) {
      var lg = new T.Group();
      lg.userData.follow = layers[li].follow;
      for (var k = 0; k < layers[li].cfg.count; k++) {
        var m = card(layers[li].cfg, CFG.TEX[(li + k) % CFG.TEX.length]);
        lg.add(m); cards.push(m);
      }
      group.add(lg); layerGroups.push(lg);
    }
    for (var j = 0; j < CFG.STAR_SHELLS.length; j++) {
      var sg = new T.Group();
      sg.userData.follow = 1 - j * 0.13;      // the nearest shell lags most, and is what you see move
      var pts = starShell(CFG.STAR_SHELLS[j]);
      shellsOut.push({ pts: pts, px: CFG.STAR_SHELLS[j].px, dist: CFG.STAR_SHELLS[j].dist });
      sg.add(pts);
      group.add(sg); layerGroups.push(sg); stars.push(sg);
    }
    scn.add(group);
    built = true;
    return { cards: cards.length, layers: layerGroups.length, projPx: projPx,
             starSizes: CFG.STAR_SHELLS.map(function (s) { return +solveSize(s.px, s.dist).toFixed(1); }),
             stars: CFG.STAR_SHELLS.reduce(function (a, s) { return a + s.n; }, 0) };
  }

  function tick(dt, camPos) {
    if (!built) return;
    refit();
    if (camPos) {
      for (var i = 0; i < layerGroups.length; i++) {
        var f = layerGroups[i].userData.follow;
        layerGroups[i].position.set(camPos.x * f, camPos.y * f, camPos.z * f);
      }
    }
    group.rotation.y += CFG.DRIFT * dt;
  }

  window.BACKDROP = { CFG: CFG, build: build, tick: tick, refit: refit,
    built: function () { return built; },
    count: function () { return { cards: cards.length, layers: layerGroups.length, projPx: projPx,
      starSizes: shellsOut.map(function (s) { return +s.pts.material.size.toFixed(1); }) }; } };
})();
