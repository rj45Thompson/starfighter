/* ============================================================================
 * hullmodels.js  --  distinct PROCEDURAL three.js models per HULL CLASS
 *                    + a canvas scan badge (shield / hull / weapon tier).
 *
 * Starblast-style escalating silhouettes, built from primitives (NO external
 * assets, NO .fbx/.prefab import -- we cannot load the Unity meshes here, so
 * every hull is synthesized). Attaches to window.HULLMODELS.
 *
 *   window.HULLMODELS = {
 *     build(hullClassKey, T, opts?) -> T.Group   // tintable, planar-UV metal
 *     classes()                     -> string[]  // known hull-class keys
 *     scanBadge(T, ship)            -> T.Sprite   // shield/hull/weapon overlay
 *   }
 *
 * INTEGRATION CONTRACT (matches starfighter.html fighterMesh):
 *   - The returned Group faces -Z (nose) with the engine glow at +Z.
 *   - grp.userData.eng is ALWAYS a T.Sprite -- the game writes
 *     s.mesh.userData.eng.material.opacity / .scale every physics frame.
 *     If this is missing the game throws; so build() guarantees it.
 *   - The first paintable child mesh is grp.children[0] and carries
 *     userData.tintable=true, so the game's hull-swap tint code
 *     (s.mesh.children[0].material.color.set(...)) still works.
 *
 * Dependency-free. Uses the THREE constructor passed in as `T` (never imports
 * three). Browser-only refs (document / OffscreenCanvas) are guarded so
 *   node -e "require('./hullmodels.js')"
 * loads clean without a DOM or THREE present.
 * ==========================================================================*/
(function () {
  'use strict';

  // ------------------------------------------------------------------ config
  // Every tunable is a named constant (no magic numbers buried in logic).
  var CFG = {
    // shared silhouette scale so all hulls read at a consistent in-world size
    UNIT: 1.55,
    // default tint when opts gives neither hue nor color
    DEFAULT_HUE: 0.58,
    DEFAULT_SAT: 0.72,
    DEFAULT_LIGHT: 0.56,
    // shared material feel (brushed metal, flat-shaded facets)
    METAL: 0.62,
    ROUGH: 0.5,
    EMISSIVE_MUL: 0.14,
    // procedural hull texture (planar-mapped brushed panels)
    TEX_SIZE: 128,
    // engine-glow sprite base scale (game multiplies this every frame)
    ENG_SCALE: 1.7,
    // cockpit accent
    COCKPIT_COL: 0xbfefff,
    COCKPIT_EMIT: 0x66ccff,
    // scan badge canvas
    BADGE_W: 256,
    BADGE_H: 96,
    BADGE_WORLD: 9,        // sprite world size (height); width scales by aspect
    BADGE_LIFT: 3.2,       // how far above the ship the badge floats (world u)
    SHIELD_COL: '#49d6ff',
    HULL_HI: '#57e08a',    // hull bar full  (green)
    HULL_LO: '#ff5a5a',    // hull bar empty (red)
    BAR_BG: 'rgba(255,255,255,0.14)'
  };

  // Known hull classes. The game's real keys today are scout/fighter/
  // freighter/cruiser (HULL_ORDER); interceptor + dreadnought are provided so
  // the orchestrator can map richer tiers. Unknown keys fall back to 'fighter'.
  // wt = weapon tier shown on the scan badge (escalating firepower read).
  var CLASSES = {
    scout:      { tier: 0, wt: 1, label: 'SCOUT' },
    fighter:    { tier: 1, wt: 2, label: 'FIGHTER' },
    interceptor:{ tier: 2, wt: 3, label: 'INTERCEPTOR' },
    freighter:  { tier: 2, wt: 2, label: 'FREIGHTER' },
    cruiser:    { tier: 3, wt: 4, label: 'CRUISER' },
    dreadnought:{ tier: 4, wt: 5, label: 'DREADNOUGHT' }
  };
  var DEFAULT_KEY = 'fighter';

  // --------------------------------------------------------------- utilities
  function hasDoc() {
    return typeof document !== 'undefined' && document && typeof document.createElement === 'function';
  }
  // 2D canvas that works in a browser (and is a graceful no-op elsewhere).
  function makeCanvas(w, h) {
    if (hasDoc()) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    }
    if (typeof OffscreenCanvas !== 'undefined') {
      try { return new OffscreenCanvas(w, h); } catch (e) {}
    }
    return null;
  }

  // Resolve a THREE.Color from opts (hue OR explicit color OR default).
  function resolveColor(T, opts) {
    opts = opts || {};
    if (opts.color != null) {
      // accept a THREE.Color, a hex number, or a css string
      if (opts.color && typeof opts.color.clone === 'function') return opts.color.clone();
      try { return new T.Color(opts.color); } catch (e) {}
    }
    var hue = (opts.hue != null) ? opts.hue : CFG.DEFAULT_HUE;
    var sat = (opts.sat != null) ? opts.sat : CFG.DEFAULT_SAT;
    var lit = (opts.light != null) ? opts.light : CFG.DEFAULT_LIGHT;
    return new T.Color().setHSL(hue, sat, lit);
  }

  // ---------------------------------------------- shared procedural textures
  // Lazily built ONCE per THREE instance and cached on the constructor so we
  // never rebuild canvases or leak them across ships.
  function metalTexture(T) {
    if (!T) return null;
    if (T.__hullMetalTex) return T.__hullMetalTex;
    var S = CFG.TEX_SIZE;
    var cv = makeCanvas(S, S);
    if (!cv) return null;
    var g = cv.getContext('2d');
    if (!g) return null;
    // base plate
    g.fillStyle = '#8b929c'; g.fillRect(0, 0, S, S);
    // horizontal brushed streaks
    for (var i = 0; i < 260; i++) {
      var y = Math.random() * S;
      var shade = 118 + ((Math.random() * 60) | 0);
      g.strokeStyle = 'rgba(' + shade + ',' + shade + ',' + (shade + 6) + ',0.28)';
      g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (Math.random() * 2 - 1)); g.stroke();
    }
    // faint panel grid so flat facets read as armor plating
    g.strokeStyle = 'rgba(30,34,40,0.5)'; g.lineWidth = 1;
    var step = S / 4;
    for (var k = 1; k < 4; k++) {
      g.beginPath(); g.moveTo(k * step, 0); g.lineTo(k * step, S); g.stroke();
      g.beginPath(); g.moveTo(0, k * step); g.lineTo(S, k * step); g.stroke();
    }
    // a few rivets
    g.fillStyle = 'rgba(40,44,52,0.6)';
    for (var r = 0; r < 40; r++) {
      g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1.1, 0, Math.PI * 2); g.fill();
    }
    var tex = new T.CanvasTexture(cv);
    if (T.RepeatWrapping) { tex.wrapS = tex.wrapT = T.RepeatWrapping; }
    tex.anisotropy = 2;
    T.__hullMetalTex = tex;
    return tex;
  }

  // Soft radial glow sprite texture (engine plume). Cached per THREE instance.
  function glowTexture(T) {
    if (!T) return null;
    if (T.__hullGlowTex) return T.__hullGlowTex;
    var S = 64;
    var cv = makeCanvas(S, S);
    if (!cv) { return (T.__hullGlowTex = null); }
    var g = cv.getContext('2d');
    if (!g) return null;
    var grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0.0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.65)');
    grd.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    var tex = new T.CanvasTexture(cv);
    T.__hullGlowTex = tex;
    return tex;
  }

  // ------------------------------------------------------ material + helpers
  function hullMaterial(T, col) {
    var map = metalTexture(T);
    var m = new T.MeshStandardMaterial({
      color: col,
      emissive: col.clone().multiplyScalar(CFG.EMISSIVE_MUL),
      roughness: CFG.ROUGH,
      metalness: CFG.METAL,
      flatShading: true,
      side: T.DoubleSide
    });
    if (map) m.map = map;
    return m;
  }

  // Build a mesh from raw vertex/index arrays with PLANAR (top-down xz) UVs,
  // exactly like fighterMesh does, so the brushed-metal texture maps cleanly.
  function planarMesh(T, verts, faces, col, uvScale) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    g.setIndex(faces);
    g.computeVertexNormals();
    var uv = [], sc = uvScale || 1;
    for (var k = 0; k < verts.length; k += 3) {
      uv.push(0.5 + verts[k] / sc, 0.5 + verts[k + 2] / sc);
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return new T.Mesh(g, hullMaterial(T, col));
  }

  // A tinted primitive that also carries the brushed-metal map + shared feel.
  function part(T, geo, col) {
    return new T.Mesh(geo, hullMaterial(T, col));
  }

  // Cockpit bubble accent (same look as fighterMesh's cockpit).
  function cockpit(T, r) {
    return new T.Mesh(
      new T.SphereGeometry(r, 12, 10),
      new T.MeshStandardMaterial({
        color: CFG.COCKPIT_COL, emissive: CFG.COCKPIT_EMIT,
        emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.3
      })
    );
  }

  // Engine glow sprite -- MUST be assigned to grp.userData.eng by every model.
  function engineSprite(T, col, scale) {
    var map = glowTexture(T);
    var mat = new T.SpriteMaterial({
      color: col.clone().offsetHSL(0, 0.15, 0.06),
      blending: T.AdditiveBlending, transparent: true, depthWrite: false
    });
    if (map) mat.map = map;
    var sp = new T.Sprite(mat);
    var s = scale || CFG.ENG_SCALE;
    sp.scale.set(s, s, 1);
    return sp;
  }

  // Finalize: tag the first mesh child as the tintable body, attach the engine
  // sprite at +Z (game reads grp.userData.eng each frame), stamp metadata.
  function finalize(T, grp, col, key, engZ, engScale) {
    // guarantee a paintable first child (game does children[0].material.color)
    var first = null;
    for (var i = 0; i < grp.children.length; i++) {
      if (grp.children[i].isMesh) { first = grp.children[i]; break; }
    }
    if (first) first.userData.tintable = true;

    var eng = engineSprite(T, col, engScale);
    eng.position.set(0, 0, engZ);
    grp.add(eng);
    grp.userData.eng = eng;            // <-- non-negotiable contract
    grp.userData.hullClass = key;
    grp.userData.baseColor = col.clone();
    return grp;
  }

  // ======================================================================
  //  PER-CLASS SILHOUETTES  (all face -Z, engine plume trails at +Z)
  // ======================================================================

  // SCOUT -- tiny needle: fast, fragile, minimal. A slim dart with fins.
  function buildScout(T, col) {
    var S = CFG.UNIT * 0.82, uv = 4 * S * 1.25;
    var v = [ 0,0,-2.9,  0,0.32,0,  0,-0.28,0.1,  -0.95,0,0.9,  0.95,0,0.9,  0,0,1.3 ];
    var f = [ 0,1,3, 0,4,1, 3,1,5, 5,1,4, 0,3,2, 0,2,4, 3,5,2, 2,5,4 ];
    var v2 = v.map(function (x) { return x * S; });
    var grp = new T.Group();
    grp.add(planarMesh(T, v2, f, col, uv));
    var ck = cockpit(T, 0.28 * S); ck.position.set(0, 0.16, -0.9 * S); grp.add(ck);
    return finalize(T, grp, col, 'scout', 1.35 * S, CFG.ENG_SCALE * 0.85);
  }

  // FIGHTER -- small dart (the classic all-rounder; mirrors fighterMesh).
  function buildFighter(T, col) {
    var S = CFG.UNIT, uv = 4 * S * 1.25;
    var v = [ 0,0,-2.6,  0,0.55,0,  0,-0.5,0.2,  -2,0,1,  2,0,1,  0,0,1.5,  0,1.05,1.2 ];
    var f = [ 0,1,3, 0,4,1, 3,1,5, 5,1,4, 0,3,2, 0,2,4, 3,5,2, 2,5,4, 1,6,5 ];
    var v2 = v.map(function (x) { return x * S; });
    var grp = new T.Group();
    grp.add(planarMesh(T, v2, f, col, uv));
    var ck = cockpit(T, 0.4); ck.position.set(0, 0.28, -0.9 * S); grp.add(ck);
    return finalize(T, grp, col, 'fighter', 2.0 * S, CFG.ENG_SCALE);
  }

  // INTERCEPTOR -- swept twin-prong: two forward nacelles, aggressive rake.
  function buildInterceptor(T, col) {
    var S = CFG.UNIT * 1.05, uv = 4 * S * 1.4;
    var grp = new T.Group();
    // central spine (thin blade)
    var v = [ 0,0,-3.0,  0,0.42,-0.4,  0,-0.3,0.2,  -0.5,0,1.6,  0.5,0,1.6,  0,0,1.9 ];
    var f = [ 0,1,3, 0,4,1, 3,1,5, 5,1,4, 0,3,2, 0,2,4, 3,5,2, 2,5,4 ];
    grp.add(planarMesh(T, v.map(function (x){ return x*S; }), f, col, uv));
    // two forward prongs (swept nacelles) using boxes rotated inward
    var pronG = new T.BoxGeometry(0.34 * S, 0.34 * S, 3.0 * S);
    for (var side = -1; side <= 1; side += 2) {
      var p = part(T, pronG, col);
      p.position.set(side * 1.15 * S, 0, -0.35 * S);
      p.rotation.y = -side * 0.16;      // toe the prongs inward toward the nose
      grp.add(p);
      // prong tip cannon accent
      var tip = part(T, new T.ConeGeometry(0.16 * S, 0.6 * S, 8), col);
      tip.position.set(side * 1.28 * S, 0, -1.95 * S);
      tip.rotation.x = -Math.PI / 2;
      grp.add(tip);
    }
    var ck = cockpit(T, 0.34 * S); ck.position.set(0, 0.24 * S, -0.7 * S); grp.add(ck);
    return finalize(T, grp, col, 'interceptor', 2.1 * S, CFG.ENG_SCALE * 1.05);
  }

  // FREIGHTER -- fat boxy hull + external cargo pods. Lumbering hauler.
  function buildFreighter(T, col) {
    var S = CFG.UNIT * 1.1;
    var grp = new T.Group();
    // main box hull (the paintable body)
    var hull = part(T, new T.BoxGeometry(2.1 * S, 1.25 * S, 4.2 * S), col);
    grp.add(hull);
    // blunt nose wedge
    var nose = part(T, new T.ConeGeometry(1.0 * S, 1.4 * S, 4), col);
    nose.position.set(0, 0, -2.7 * S);
    nose.rotation.x = -Math.PI / 2; nose.rotation.y = Math.PI / 4;
    grp.add(nose);
    // four cargo pods clamped to the flanks (cylinders)
    var podG = new T.CylinderGeometry(0.5 * S, 0.5 * S, 2.4 * S, 10);
    var podCol = col.clone().offsetHSL(0, -0.15, -0.06);
    var pods = [[-1.4, 0.35], [1.4, 0.35], [-1.4, -0.5], [1.4, -0.5]];
    for (var i = 0; i < pods.length; i++) {
      var pod = part(T, podG, podCol);
      pod.rotation.x = Math.PI / 2;                 // lie the cylinder fore-aft
      pod.position.set(pods[i][0] * S, pods[i][1] * S, 0.4 * S);
      grp.add(pod);
    }
    // bridge blister up top toward the front
    var ck = cockpit(T, 0.5 * S); ck.position.set(0, 0.8 * S, -1.5 * S); grp.add(ck);
    // twin engine block at the stern (single glow still trails at +Z)
    var eblk = part(T, new T.BoxGeometry(1.7 * S, 0.8 * S, 0.7 * S), podCol);
    eblk.position.set(0, 0, 2.4 * S); grp.add(eblk);
    return finalize(T, grp, col, 'freighter', 2.9 * S, CFG.ENG_SCALE * 1.35);
  }

  // CRUISER -- long armored spine + swept wings. Heavy warship.
  function buildCruiser(T, col) {
    var S = CFG.UNIT * 1.15;
    var grp = new T.Group();
    // long central spine (armored body)
    var spine = part(T, new T.BoxGeometry(1.15 * S, 1.0 * S, 6.0 * S), col);
    grp.add(spine);
    // armored prow (hexagonal cone)
    var prow = part(T, new T.ConeGeometry(0.85 * S, 2.2 * S, 6), col);
    prow.position.set(0, 0, -3.7 * S); prow.rotation.x = -Math.PI / 2;
    grp.add(prow);
    // swept delta wings (thin boxes angled back)
    var wingCol = col.clone().offsetHSL(0, -0.1, -0.05);
    var wingG = new T.BoxGeometry(3.4 * S, 0.18 * S, 2.2 * S);
    for (var side = -1; side <= 1; side += 2) {
      var w = part(T, wingG, wingCol);
      w.position.set(side * 2.0 * S, -0.1 * S, 1.1 * S);
      w.rotation.y = side * 0.3;              // sweep the wings backward
      grp.add(w);
      // wing-root gun turret
      var turret = part(T, new T.CylinderGeometry(0.28 * S, 0.34 * S, 0.5 * S, 8), wingCol);
      turret.position.set(side * 1.2 * S, 0.55 * S, -0.6 * S);
      grp.add(turret);
      var barrel = part(T, new T.CylinderGeometry(0.08 * S, 0.08 * S, 1.1 * S, 6), wingCol);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 1.2 * S, 0.55 * S, -1.2 * S);
      grp.add(barrel);
    }
    // conning tower
    var tower = part(T, new T.BoxGeometry(0.7 * S, 0.9 * S, 1.4 * S), wingCol);
    tower.position.set(0, 0.85 * S, 0.2 * S); grp.add(tower);
    var ck = cockpit(T, 0.36 * S); ck.position.set(0, 1.15 * S, -0.4 * S); grp.add(ck);
    // stern engine bank
    var eblk = part(T, new T.BoxGeometry(1.5 * S, 0.9 * S, 0.9 * S), wingCol);
    eblk.position.set(0, 0, 3.3 * S); grp.add(eblk);
    return finalize(T, grp, col, 'cruiser', 3.9 * S, CFG.ENG_SCALE * 1.55);
  }

  // DREADNOUGHT -- heavy multi-hull: a broad command deck flanked by two
  // outrigger hulls bridged by struts. The apex predator silhouette.
  function buildDreadnought(T, col) {
    var S = CFG.UNIT * 1.25;
    var grp = new T.Group();
    var darkCol = col.clone().offsetHSL(0, -0.12, -0.07);
    // central command hull (the paintable body)
    var core = part(T, new T.BoxGeometry(1.7 * S, 1.35 * S, 7.0 * S), col);
    grp.add(core);
    // heavy armored prow
    var prow = part(T, new T.ConeGeometry(1.15 * S, 2.6 * S, 6), col);
    prow.position.set(0, 0, -4.4 * S); prow.rotation.x = -Math.PI / 2;
    grp.add(prow);
    // two outrigger hulls
    var outG = new T.BoxGeometry(0.9 * S, 0.9 * S, 5.2 * S);
    var strutG = new T.BoxGeometry(2.6 * S, 0.3 * S, 0.5 * S);
    for (var side = -1; side <= 1; side += 2) {
      var out = part(T, outG, darkCol);
      out.position.set(side * 2.7 * S, -0.1 * S, 0.4 * S);
      grp.add(out);
      // outrigger nose
      var on = part(T, new T.ConeGeometry(0.55 * S, 1.4 * S, 5), darkCol);
      on.position.set(side * 2.7 * S, -0.1 * S, -2.7 * S); on.rotation.x = -Math.PI / 2;
      grp.add(on);
      // two connecting struts (fore + aft)
      var s1 = part(T, strutG, darkCol); s1.position.set(side * 1.35 * S, 0, -1.4 * S); grp.add(s1);
      var s2 = part(T, strutG, darkCol); s2.position.set(side * 1.35 * S, 0, 1.8 * S); grp.add(s2);
      // spinal main gun on each outrigger
      var barrel = part(T, new T.CylinderGeometry(0.13 * S, 0.13 * S, 2.0 * S, 8), darkCol);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 2.7 * S, 0.55 * S, -2.2 * S);
      grp.add(barrel);
    }
    // dorsal battery turrets down the spine
    for (var z = -1.5; z <= 2.5; z += 2.0) {
      var t = part(T, new T.CylinderGeometry(0.34 * S, 0.4 * S, 0.5 * S, 8), darkCol);
      t.position.set(0, 0.9 * S, z * S); grp.add(t);
    }
    // command tower + bridge
    var tower = part(T, new T.BoxGeometry(1.0 * S, 1.3 * S, 1.8 * S), darkCol);
    tower.position.set(0, 1.15 * S, -0.4 * S); grp.add(tower);
    var ck = cockpit(T, 0.4 * S); ck.position.set(0, 1.7 * S, -0.9 * S); grp.add(ck);
    // stern engine bank
    var eblk = part(T, new T.BoxGeometry(1.9 * S, 1.1 * S, 1.0 * S), darkCol);
    eblk.position.set(0, 0, 3.8 * S); grp.add(eblk);
    return finalize(T, grp, col, 'dreadnought', 4.5 * S, CFG.ENG_SCALE * 1.9);
  }

  var BUILDERS = {
    scout: buildScout,
    fighter: buildFighter,
    interceptor: buildInterceptor,
    freighter: buildFreighter,
    cruiser: buildCruiser,
    dreadnought: buildDreadnought
  };

  // ---------------------------------------------------------------- build()
  // hullClassKey -> T.Group. Unknown keys fall back to DEFAULT_KEY (fighter).
  function build(hullClassKey, T, opts) {
    if (!T) throw new Error('HULLMODELS.build: THREE constructor (T) is required');
    var key = (hullClassKey && BUILDERS[hullClassKey]) ? hullClassKey : DEFAULT_KEY;
    var col = resolveColor(T, opts);
    var grp = BUILDERS[key](T, col);
    // optional uniform scale hook (e.g. tier bumps) without touching thruster contract
    if (opts && opts.scale != null) grp.scale.setScalar(opts.scale);
    return grp;
  }

  function classes() { return Object.keys(BUILDERS); }

  // ------------------------------------------------------------- scanBadge()
  // A billboard sprite the player/parasite pins over a ship on SCAN, showing
  // the hull-class name, weapon tier pips, and two mini bars: SHIELD + HULL.
  //
  // Ships in starfighter.html have hp/maxHp but NO real shield field, so we
  // read shield defensively from several likely names and fall back to a
  // derived value (equip.shield) or 0. Nothing here assumes a field exists.
  function readStats(ship) {
    ship = ship || {};
    var hp = num(ship.hp, 0);
    var maxHp = num(ship.maxHp, Math.max(hp, 1));
    // shield: try common field names, then an equip-derived pool, else 0.
    var sh = firstNum([ship.shield, ship.shields, ship.sh, ship.shieldHp, ship.shp]);
    var maxSh = firstNum([ship.maxShield, ship.shieldMax, ship.maxShields, ship.shMax, ship.shpMax]);
    if (maxSh == null) {
      // derive a plausible shield capacity from a shield equipment level if present
      var lvl = (ship.equip && num(ship.equip.shield, 0)) || 0;
      maxSh = lvl > 0 ? lvl * 25 : 0;
    }
    if (sh == null) sh = maxSh;         // assume full if only capacity is known
    var cls = ship.hullClass || DEFAULT_KEY;
    var meta = CLASSES[cls] || CLASSES[DEFAULT_KEY];
    // weapon tier: explicit ship field wins, else the class default.
    var wt = firstNum([ship.weaponTier, ship.wt, (ship.lvl && ship.lvl.weapon)]);
    if (wt == null) wt = meta.wt;
    var label = (ship.hullClassLabel || meta.label || String(cls)).toUpperCase();
    var name = ship.name ? String(ship.name) : '';
    return {
      hp: clampNum(hp, 0, maxHp), maxHp: Math.max(1, maxHp),
      sh: clampNum(sh, 0, Math.max(maxSh, sh)), maxSh: Math.max(0, maxSh),
      wt: Math.max(0, Math.round(wt)), label: label, name: name
    };
  }

  function drawBadge(g, W, H, st) {
    g.clearRect(0, 0, W, H);
    // rounded backing panel
    roundRect(g, 2, 2, W - 4, H - 4, 12);
    g.fillStyle = 'rgba(8,14,22,0.82)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(120,200,255,0.55)'; g.stroke();

    var pad = 14;
    // header: hull class + optional pilot name
    g.textBaseline = 'alphabetic';
    g.font = 'bold 26px system-ui, Arial, sans-serif';
    g.fillStyle = '#cfeaff';
    g.fillText(st.label, pad, 32);
    if (st.name) {
      g.font = '16px system-ui, Arial, sans-serif';
      g.fillStyle = 'rgba(180,205,225,0.8)';
      g.textAlign = 'right';
      g.fillText(st.name, W - pad, 30);
      g.textAlign = 'left';
    }
    // weapon tier pips (top-right under name area)
    var pipY = 44, pipR = 5, pipGap = 15, pips = Math.min(6, st.wt);
    g.font = 'bold 13px system-ui, Arial, sans-serif';
    g.fillStyle = 'rgba(255,210,120,0.9)';
    g.textAlign = 'right';
    g.fillText('WPN', W - pad - (pips * pipGap) - 8, pipY + 4);
    g.textAlign = 'left';
    for (var i = 0; i < 6; i++) {
      var px = W - pad - (6 - i) * pipGap + pipGap / 2;
      g.beginPath(); g.arc(px, pipY, pipR, 0, Math.PI * 2);
      g.fillStyle = i < pips ? '#ffcf52' : 'rgba(255,255,255,0.16)';
      g.fill();
    }

    // two mini bars: SHIELD then HULL
    var barX = pad, barW = W - pad * 2, barH = 12;
    bar(g, barX, 52, barW, barH, safeFrac(st.sh, st.maxSh), CFG.SHIELD_COL, 'SH', st.maxSh > 0);
    var hf = safeFrac(st.hp, st.maxHp);
    var hullCol = lerpHex(CFG.HULL_LO, CFG.HULL_HI, hf);
    bar(g, barX, 72, barW, barH, hf, hullCol, 'HP', true);
  }

  function bar(g, x, y, w, h, frac, col, tag, active) {
    // track
    roundRect(g, x, y, w, h, h / 2); g.fillStyle = CFG.BAR_BG; g.fill();
    // fill
    var fw = Math.max(0, Math.min(1, frac)) * (w - 2);
    if (active && fw > 1) {
      roundRect(g, x + 1, y + 1, fw, h - 2, (h - 2) / 2);
      g.fillStyle = col; g.fill();
    }
    // tag + value
    g.font = 'bold 11px system-ui, Arial, sans-serif';
    g.fillStyle = active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.4)';
    g.textAlign = 'left';
    g.fillText(tag, x + 4, y + h - 2);
  }

  // Build the sprite. If no canvas is available (no DOM), returns a bare
  // Sprite with a plain material so callers never crash.
  function scanBadge(T, ship) {
    if (!T) throw new Error('HULLMODELS.scanBadge: THREE constructor (T) is required');
    var W = CFG.BADGE_W, H = CFG.BADGE_H;
    var st = readStats(ship);
    var cv = makeCanvas(W, H);
    var mat;
    if (cv && cv.getContext) {
      var g = cv.getContext('2d');
      drawBadge(g, W, H, st);
      var tex = new T.CanvasTexture(cv);
      if (T.LinearFilter) { tex.minFilter = T.LinearFilter; tex.magFilter = T.LinearFilter; }
      tex.needsUpdate = true;
      mat = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    } else {
      mat = new T.SpriteMaterial({ color: 0x88ccff, transparent: true, opacity: 0.9 });
    }
    var sp = new T.Sprite(mat);
    var wh = CFG.BADGE_WORLD;                 // height in world units
    sp.scale.set(wh * (W / H), wh, 1);
    sp.position.set(0, CFG.BADGE_LIFT, 0);    // float above the ship's origin
    sp.renderOrder = 999;                     // draw on top of the hull
    sp.userData.isScanBadge = true;
    sp.userData.shipRef = ship || null;
    // convenience: allow the game to refresh the badge in place after damage.
    sp.userData.refresh = function (freshShip) {
      var s2 = readStats(freshShip || ship);
      if (cv && cv.getContext) {
        drawBadge(cv.getContext('2d'), W, H, s2);
        if (sp.material.map) sp.material.map.needsUpdate = true;
      }
    };
    return sp;
  }

  // --------------------------------------------------------- small helpers
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function firstNum(arr) {
    for (var i = 0; i < arr.length; i++) {
      if (typeof arr[i] === 'number' && isFinite(arr[i])) return arr[i];
    }
    return null;
  }
  function clampNum(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function safeFrac(v, max) { return max > 0 ? clampNum(v / max, 0, 1) : 0; }
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function lerpHex(a, b, t) {
    t = clampNum(t, 0, 1);
    var A = hexToRgb(a), B = hexToRgb(b);
    var r = Math.round(A.r + (B.r - A.r) * t);
    var gg = Math.round(A.g + (B.g - A.g) * t);
    var bb = Math.round(A.b + (B.b - A.b) * t);
    return 'rgb(' + r + ',' + gg + ',' + bb + ')';
  }

  // --------------------------------------------------------------- exports
  var API = { build: build, classes: classes, scanBadge: scanBadge };

  if (typeof window !== 'undefined') {
    window.HULLMODELS = API;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }

  // ----------------------------------------------------------- self-test
  // Runs only when executed directly (node hullmodels.js). Guarded so a bare
  //   require('./hullmodels.js')
  // never throws in the absence of THREE / a DOM.
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    try {
      console.log('HULLMODELS self-test');
      console.log('  classes():', classes().join(', '));
      console.log('  API keys :', Object.keys(API).join(', '));
      console.log('  default fallback key:', DEFAULT_KEY);
      // Confirm the contract shape without needing real THREE: build() and
      // scanBadge() require a T; we assert they demand it rather than crash.
      var threw = false;
      try { build('fighter', null); } catch (e) { threw = true; }
      console.log('  build() guards missing THREE:', threw ? 'OK' : 'FAIL');
      threw = false;
      try { scanBadge(null, {}); } catch (e) { threw = true; }
      console.log('  scanBadge() guards missing THREE:', threw ? 'OK' : 'FAIL');
      console.log('  hull classes exposed:', classes().length);
    } catch (err) {
      console.error('self-test error:', err && err.message);
    }
  }
})();
