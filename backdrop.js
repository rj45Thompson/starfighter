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
//   FAR    (5000)    galaxies and distant clusters. At follow 1.00 they do not move AT ALL - they ride the
//                    camera exactly, so they are a second painted sky over the cube map rather than a
//                    parallax layer. That is deliberate: they set the scale the other two are read against.
//   MID    (3600)    nebula sheets, large and faint, each on its own arc and roll. These are what you notice
//                    moving when you fly - the layer that does most of the work.
//   NEAR   (1400)    thin dust veils and a scatter of foreground stars. They slide visibly, which is what tells
//                    you the mid layer is far rather than small.
//
// Each piece is a SPHERICAL PATCH - a slice of an inverted sphere at the layer's radius - textured and additive
// with depthWrite off, so it never cuts a ship, on renderOrder -5 so it draws behind everything in front of it.
// It began as a flat quad ("cut up objs with textures"), and that version is still here under CFG.GEOM:'card';
// see GEOM for why the curved one replaced it as the default.
//
// One global: window.BACKDROP. BACKDROP.build(opts) once the renderer and scene exist; BACKDROP.tick(dt) each
// frame to drift them. Nothing here reads game state.
(function () {
  'use strict';

  var CFG = {
    ENABLED: true,

    // GEOMETRY. 'shell' = each piece is a spherical patch at the layer's radius; 'card' = the flat quad this
    // started as, kept so the two can be compared. A card has to be AIMED, and lookAt aims it at the layer
    // group's origin - but the group LAGS the camera, and that lag is the whole point of it. So the further you
    // fly the further you stand from the one point every card is facing: at ARENA_R 2100 the near layer's origin
    // ends up ~500 units away from you against a 1400-unit radius, and its cards skew, foreshorten, and the
    // edge-on ones thin to nothing. A patch has no facing to get wrong. Every vertex of it is at the layer
    // radius from the group origin, so it reads correctly from anywhere inside it, and it costs ~560 triangles
    // instead of 2 - which, 27 times over, is 15k triangles for the entire sky.
    GEOM: 'shell',

    // Angular width `ang` is in RADIANS, not world units: how much sky the piece covers. That is what you
    // actually see, and stating it directly means a layer's apparent size no longer moves when its distance is
    // retuned for the budget below. (The old world-unit sizes divided by their old distances give these.)
    //
    // DISTANCES ARE BUDGETED AGAINST THE CAMERA'S FAR PLANE, which is 6000 - index.html:738 chaseCam and
    // index.html:748 mainTopCam, and nothing reassigns it. They were not budgeted before. FAR sat at
    // 12000-20000 and the outer star shell at 9000, so the GPU clipped all 7 far cards and all 2200 outer stars
    // in projection, before rasterising: `depthTest:false` and `frustumCulled:false` do not save them, because
    // the far plane clips the vertex, it does not lose a depth comparison. The 5000-9000 MID cards were worse
    // than absent - each was SLICED, cut along the straight line where the far plane crossed it.
    //
    // Pulling them inside costs nothing, because a layer that rides the camera has no true distance; what you
    // see is the angular slide, and that is
    //
    //     parallax  ~  (1 - follow) / dist
    //
    // so a layer brought closer keeps its old look exactly if (1 - follow) shrinks by the same factor. Each
    // layer below is the old one carried through that rule, then checked against the worst case the arena can
    // produce, dist + ARENA_R * (1 - follow) with ARENA_R 2100:
    //                                                                          worst case | old parallax -> new
    FAR:  { count: 7,  dist: 5000, ang: [0.16, 0.33], opacity: 0.34, follow: 1.00 },  //  5000 |  0      ->  0
    MID:  { count: 11, dist: 3600, ang: [0.31, 0.66], opacity: 0.20, follow: 0.93 },  //  3747 |  2.00e-5 -> 1.94e-5
    NEAR: { count: 9,  dist: 1400, ang: [0.31, 0.71], opacity: 0.10, follow: 0.76 },  //  1904 |  1.69e-4 -> 1.71e-4
    EDGE_FADE: 0.35,        // fraction of the patch, each side, spent ramping its colour to nothing - see feather()
    DRIFT: 0.004,           // radians/sec each layer turns, so a parked ship is not a still image
    // `px` is the sprite's diameter in SCREEN pixels, not world units. three.js sizes an attenuated point as
    // size * (drawingBufferHeight/2) / distance, so a world size that looks right at 9000 is a dinner plate at
    // 1900 - which is exactly the bug this replaced: 4200 stars at world size 26-46 drew as 10-20px squares.
    // The world size is now SOLVED per shell from its distance, so all three read as stars.
    // `follow` was derived here (1 - j*0.13); it is written out now because it is no longer independent of
    // `dist` - the two together are the parallax, by the rule in the layer block above. Shell positions jitter
    // to dist*1.15, which is in the worst case below too.
    STAR_SHELLS: [                                                      //  worst case | old parallax -> new
      { n: 2200, dist: 4800, px: 6,  opacity: 0.85, follow: 1.00 },     //  5520 |  0       ->  0
      { n: 1400, dist: 3000, px: 8,  opacity: 0.65, follow: 0.91 },     //  3639 |  3.10e-5 -> 3.00e-5
      { n: 600,  dist: 1600, px: 11, opacity: 0.40, follow: 0.78 }      //  2302 |  1.37e-4 -> 1.37e-4
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

  // A patch ends on a hard rectangle in ANGLE, and a curved hard edge shows more than a flat one does - the eye
  // follows the arc to its end. These materials are ADDITIVE, so fading the vertex colour to black is fading to
  // nothing; no alpha channel is involved, which is just as well because r128's MeshBasicMaterial takes RGB
  // vertex colours only. The ramp runs over the outer EDGE_FADE of the patch in both u and v and multiplies the
  // material's own tint, so a piece dissolves into the sky instead of ending on a line.
  function feather(g, TT) {
    var uv = g.attributes.uv, n = uv.count, col = new Float32Array(n * 3), f = CFG.EDGE_FADE;
    for (var i = 0; i < n; i++) {
      var a = Math.min(1, Math.min(uv.getX(i), 1 - uv.getX(i)) / f) * Math.min(1, Math.min(uv.getY(i), 1 - uv.getY(i)) / f);
      a = a * a * (3 - 2 * a);               // smoothstep: a linear ramp leaves a visible shoulder where it tops out
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = a;
    }
    g.setAttribute('color', new TT.BufferAttribute(col, 3));
  }

  // one piece of a layer: a spherical patch at the layer's radius, swung onto a random direction and rolled so
  // no two read as the same sheet. Note what is NOT here - the patch is not positioned at a distance and not
  // aimed at anything. Its geometry already carries the radius, so the mesh sits at the group origin, and there
  // is no facing to go stale as the group lags behind the camera.
  function patch(layer, texPath) {
    var TT = three();
    var aw = rnd(layer.ang[0], layer.ang[1]);          // angular width, radians
    var ah = aw * rnd(0.6, 1.0);                       // and height - the old card's 0.6-1.0 aspect, kept
    var g = new TT.SphereGeometry(layer.dist, 20, 14,
      -aw / 2, aw,                                     // phi:   centred on the patch's own axis
      Math.PI / 2 - ah / 2, ah);                       // theta: centred on the equator
    feather(g, TT);
    var m = new TT.Mesh(g, new TT.MeshBasicMaterial({ map: tex(texPath), transparent: true, opacity: layer.opacity,
      blending: TT.AdditiveBlending, depthWrite: false, depthTest: false, side: TT.BackSide, vertexColors: true,
      color: new TT.Color().setHSL(rnd(0.55, 0.75), rnd(0.15, 0.5), rnd(0.45, 0.7)) }));
    // three.js puts phi=0 on the equator at -X, so -X is where the patch was built; swing that onto a direction.
    var dir = new TT.Vector3(rnd(-1, 1), rnd(-0.55, 0.55), rnd(-1, 1)).normalize();
    m.quaternion.setFromUnitVectors(new TT.Vector3(-1, 0, 0), dir);
    m.rotateOnWorldAxis(dir, rnd(0, Math.PI * 2));     // roll about the direction it faces
    m.renderOrder = -5;
    m.frustumCulled = false;
    m.visible = false;                       // shown by tex()'s onLoad, never before
    (waiting[texPath] = waiting[texPath] || []).push(m);
    return m;
  }

  // the flat-quad original, behind CFG.GEOM:'card'. Its size comes from the same angular width the patch uses,
  // so flipping GEOM changes the SHAPE of a layer piece and nothing else about the layer.
  function card(layer, texPath) {
    var TT = three();
    var aw = rnd(layer.ang[0], layer.ang[1]), size = 2 * layer.dist * Math.tan(aw / 2);
    var m = new TT.Mesh(
      new TT.PlaneGeometry(size, size * rnd(0.6, 1.0)),
      new TT.MeshBasicMaterial({ map: tex(texPath), transparent: true, opacity: layer.opacity,
        blending: TT.AdditiveBlending, depthWrite: false, depthTest: false, side: TT.DoubleSide,
        color: new TT.Color().setHSL(rnd(0.55, 0.75), rnd(0.15, 0.5), rnd(0.45, 0.7)) }));
    // a random direction, then face the middle: a card edge-on is an invisible card
    var dir = new TT.Vector3(rnd(-1, 1), rnd(-0.55, 0.55), rnd(-1, 1)).normalize();
    m.position.copy(dir).multiplyScalar(layer.dist);
    m.lookAt(0, 0, 0);
    m.rotateZ(rnd(0, Math.PI * 2));
    m.renderOrder = -5;
    m.frustumCulled = false;
    m.visible = false;
    (waiting[texPath] = waiting[texPath] || []).push(m);
    return m;
  }

  function piece(layer, texPath) { return CFG.GEOM === 'card' ? card(layer, texPath) : patch(layer, texPath); }

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
    var layers = [CFG.FAR, CFG.MID, CFG.NEAR];
    for (var li = 0; li < layers.length; li++) {
      var lg = new T.Group();
      lg.userData.follow = layers[li].follow;
      for (var k = 0; k < layers[li].count; k++) {
        var m = piece(layers[li], CFG.TEX[(li + k) % CFG.TEX.length]);
        lg.add(m); cards.push(m);
      }
      group.add(lg); layerGroups.push(lg);
    }
    for (var j = 0; j < CFG.STAR_SHELLS.length; j++) {
      var sg = new T.Group();
      sg.userData.follow = CFG.STAR_SHELLS[j].follow;   // the nearest shell lags most, and is what you see move
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

  // The drift used to be `group.rotation.y += ...` on the PARENT, and a parent's rotation turns its children's
  // POSITIONS as well as their contents. Those positions are the follow offsets, written below in world terms -
  // so every offset was being swung around the origin by an angle that grows without bound (DRIFT 0.004 rad/s is
  // a quarter turn in six and a half minutes). Six minutes in, the layer meant to sit exactly on the camera sat
  // 2100 units off it instead, far enough to push it back through the far plane. Turning each layer about its
  // OWN origin is the same sky turning - each layer about its own anchor - and it leaves the offsets alone.
  var drift = 0;
  function tick(dt, camPos) {
    if (!built) return;
    refit();
    drift += CFG.DRIFT * dt;
    for (var i = 0; i < layerGroups.length; i++) {
      if (camPos) {
        var f = layerGroups[i].userData.follow;
        layerGroups[i].position.set(camPos.x * f, camPos.y * f, camPos.z * f);
      }
      layerGroups[i].rotation.y = drift;
    }
  }

  window.BACKDROP = { CFG: CFG, build: build, tick: tick, refit: refit,
    built: function () { return built; },
    count: function () { return { cards: cards.length, layers: layerGroups.length, projPx: projPx,
      starSizes: shellsOut.map(function (s) { return +s.pts.material.size.toFixed(1); }) }; } };
})();
