// cybertron.js - MACHINE WORLDS: seven generated looks, on a properly texture-mapped, displaced sphere.
//
// RJ 2026-09-06, in order: "make the planet dark with emissive lights like a Cybertron" -> "generate a Cybertron
// model with our unity modeling tools, let me see the best three options" -> "give me better graphics more options"
// -> "make it AAA quality" -> "I want a high quality round mesh properly texture mapped".
//
// That last one is the design. The first pass at a "mesh option" moved vertices by hand and coloured them per
// vertex, which threw the texture away and rendered as a faceted blob whose bumps did not agree with its own
// picture. This build does it the way it is done properly:
//
//   ONE UV SPACE.  assets/gen_cybertron.py emits six maps in the same equirectangular layout: albedo, emissive,
//                  normal, roughness, ambient occlusion, and HEIGHT. Because the height map shares the albedo's
//                  UVs, displacing the sphere by it puts the plates exactly where the plates are drawn and cuts
//                  the trenches exactly where the trenches are drawn.
//   ROUND MESH.    a high-segment sphere (CFG.SEG) with three.js's own UVs, displaced through displacementMap -
//                  the geometry stays a sphere, the relief is real, and no vertex is moved by hand.
//   FULL PBR.      roughness and AO maps are what stop a textured ball reading as a toy: polished plate tops,
//                  rough weathered patches, self-shadowed trenches.
//   ATMOSPHERE.    a back-face rim shell for the ionised haze, and a slowly turning smog layer over the cities.
//
// One global: window.CYBERTRON. `CYBERTRON.apply('iron')` swaps a world, `CYBERTRON.looks()` lists them,
// `CYBERTRON.compare()` measures them all. Nothing changes by default.
(function () {
  'use strict';

  var LOOKS = ['iron', 'circuit', 'rust', 'warlord', 'glacier', 'verdant', 'imperial'];
  var CFGX = {
    DIR: 'assets/planets/',
    PREFIX: 'machine_',
    SEG: 256,                 // sphere segments: the "round" in "high quality round mesh"
    DISPLACE: 0.055,          // displacement as a fraction of the planet's radius
    EMIS_GAIN: 0.95,
    SKIN_DARK: 0.55,
    ROUGH_BASE: 0.85, METAL: 0.62,
    AO_INTENSITY: 1.0,
    NORMAL_SCALE: 1.15,
    ATMO_SCALE: 1.055, ATMO_OPACITY: 0.30,
    SMOG_SCALE: 1.012, SMOG_OPACITY: 0.16, SMOG_SPIN: 0.004,
    LOOKS: LOOKS
  };

  var saved = {}, geoCache = {}, texCache = {}, pending = {}, extras = {}, spinners = [];

  function three() { return window.T || window.THREE; }
  function planets() { return (window.HOST && HOST.planets) || []; }
  function mapPath(look, suffix) { return CFGX.DIR + CFGX.PREFIX + look + (suffix || '') + '.jpg'; }
  function pathsFor(look) {
    return ['', '_e', '_n', '_r', '_ao', '_h', '_smog'].map(function (sfx) { return mapPath(look, sfx); });
  }

  // Loading is a promise. A map that has not arrived must never be treated as present: an earlier version measured
  // every option as the same glowing white ball because an emissive was set white while its map was still in flight.
  function tex(path, srgb) {
    if (texCache[path]) return texCache[path];
    var TT = three();
    var t = new TT.TextureLoader().load(path,
      function () { pending[path] = 'ok'; },
      undefined,
      function () { pending[path] = 'failed';
        if (window.HOST && HOST.term) HOST.term('&#9670; cybertron: ' + path + ' did not load - that map is missing, not silently skipped', 'err'); });
    t.wrapS = TT.RepeatWrapping;
    if (srgb) t.encoding = TT.sRGBEncoding;
    texCache[path] = t;
    pending[path] = 'loading';
    return t;
  }
  function ready(paths, timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() {
        var left = paths.filter(function (p) { return pending[p] === 'loading'; });
        if (!left.length || Date.now() - t0 > (timeoutMs || 12000)) {
          resolve({ loaded: paths.filter(function (p) { return pending[p] === 'ok'; }),
                    failed: paths.filter(function (p) { return pending[p] === 'failed'; }),
                    pending: left });
          return;
        }
        setTimeout(poll, 60);
      })();
    });
  }

  function remember(p) {
    if (saved[p.name]) return;
    var m = p.mesh.material;
    saved[p.name] = { map: m.map, emissiveMap: m.emissiveMap, normalMap: m.normalMap, roughnessMap: m.roughnessMap,
      aoMap: m.aoMap, displacementMap: m.displacementMap, displacementScale: m.displacementScale,
      color: m.color.clone(), emissive: m.emissive.clone(), ei: m.emissiveIntensity,
      rough: m.roughness, metal: m.metalness, geo: p.mesh.geometry,
      normalScale: m.normalScale ? m.normalScale.clone() : null };
  }
  function clearExtras(p) {
    var e = extras[p.name]; if (!e) return;
    e.forEach(function (o) { if (o.parent) o.parent.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    delete extras[p.name];
    spinners = spinners.filter(function (s) { return s.planet !== p.name; });
  }
  function restore(p) {
    var s = saved[p.name]; if (!s) return;
    var m = p.mesh.material;
    m.map = s.map; m.emissiveMap = s.emissiveMap; m.normalMap = s.normalMap; m.roughnessMap = s.roughnessMap;
    m.aoMap = s.aoMap; m.displacementMap = s.displacementMap; m.displacementScale = s.displacementScale || 0;
    m.color.copy(s.color); m.emissive.copy(s.emissive); m.emissiveIntensity = s.ei;
    m.roughness = s.rough; m.metalness = s.metal;
    if (s.normalScale && m.normalScale) m.normalScale.copy(s.normalScale);
    if (p.mesh.geometry !== s.geo) { p.mesh.geometry.dispose(); p.mesh.geometry = s.geo; }
    clearExtras(p);
    m.needsUpdate = true;
  }

  // A sphere with enough segments that DISPLACEMENT has something to move, and with the uv2 channel aoMap needs.
  function roundGeometry(radius) {
    var key = radius.toFixed(2) + '|' + CFGX.SEG;
    if (geoCache[key]) return geoCache[key];
    var TT = three();
    var g = new TT.SphereGeometry(radius, CFGX.SEG, CFGX.SEG / 2);
    g.setAttribute('uv2', new TT.BufferAttribute(g.attributes.uv.array, 2));   // aoMap reads uv2, not uv
    geoCache[key] = g;
    return g;
  }

  // THE RIM. A back-face sphere with a FLAT opacity is not an atmosphere - it lays an even veil over the whole
  // disc, which is exactly what washed the plating out and put pale patches across the world (tested by hiding
  // the shells: the patches went with them). A real limb needs the glow to fall off with the viewing angle, so
  // this is a fresnel: bright where the surface turns away from the eye, nothing at all face-on.
  function atmosphere(p, colour) {
    var TT = three();
    var c = new TT.Color(colour);
    var m = new TT.ShaderMaterial({
      uniforms: { uColour: { value: new TT.Vector3(c.r, c.g, c.b) },
                  uPower: { value: CFGX.ATMO_POWER }, uGain: { value: CFGX.ATMO_GAIN } },
      vertexShader:
        'varying vec3 vN; varying vec3 vV;' +
        'void main(){ vN = normalize(normalMatrix * normal);' +
        ' vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz);' +
        ' gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'uniform vec3 uColour; uniform float uPower; uniform float uGain;' +
        'varying vec3 vN; varying vec3 vV;' +
        'void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);' +
        ' gl_FragColor = vec4(uColour * f * uGain, f); }',
      transparent: true, blending: TT.AdditiveBlending, depthWrite: false, side: TT.BackSide
    });
    return new TT.Mesh(new TT.SphereGeometry(p.radius * CFGX.ATMO_SCALE, 64, 32), m);
  }
  function smogShell(p, look) {
    var TT = three();
    var g = new TT.SphereGeometry(p.radius * CFGX.SMOG_SCALE, 96, 48);
    var t = tex(mapPath(look, '_smog'), false);
    // haze ADDS, it never replaces. A Phong map+alphaMap pair painted an opaque grey cap over one hemisphere,
    // because a JPEG's darkest pixels are not zero and the material's own colour showed through wherever the map
    // was dim. Additive blending with the map as the only source cannot do that.
    var m = new TT.MeshBasicMaterial({ map: t, transparent: true, opacity: CFGX.SMOG_OPACITY,
      blending: TT.AdditiveBlending, depthWrite: false, color: 0x8fa8c4 });
    return new TT.Mesh(g, m);
  }

  function apply(look, only) {
    var TT = three(); if (!TT) return { ok: false, msg: 'three.js is not on the page yet' };
    var list = planets().filter(function (p) { return !only || p.name === only; });
    if (!list.length) return { ok: false, msg: 'no planet to apply to' };
    if (look !== 'off' && LOOKS.indexOf(look) < 0) return { ok: false, msg: 'no look called ' + look + ' - try: ' + LOOKS.join(', ') };
    var i;
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      remember(p); restore(p);
      if (look === 'off') continue;
      var m = p.mesh.material;
      p.mesh.geometry = roundGeometry(p.radius);
      m.map = tex(mapPath(look), true);
      m.emissiveMap = tex(mapPath(look, '_e'), true);
      m.normalMap = tex(mapPath(look, '_n'), false);
      m.roughnessMap = tex(mapPath(look, '_r'), false);
      m.aoMap = tex(mapPath(look, '_ao'), false);
      m.displacementMap = tex(mapPath(look, '_h'), false);
      m.displacementScale = p.radius * CFGX.DISPLACE;
      m.displacementBias = -p.radius * CFGX.DISPLACE * 0.5;   // the map's mid-grey is the true surface
      m.vertexColors = false;
      m.color.setRGB(CFGX.SKIN_DARK, CFGX.SKIN_DARK, CFGX.SKIN_DARK);
      m.emissive.setRGB(1, 1, 1);
      m.emissiveIntensity = pending[mapPath(look, '_e')] === 'ok' ? CFGX.EMIS_GAIN : 0;   // no map yet -> no glow
      m.roughness = CFGX.ROUGH_BASE; m.metalness = CFGX.METAL;
      m.aoMapIntensity = CFGX.AO_INTENSITY;
      if (m.normalScale) m.normalScale.set(CFGX.NORMAL_SCALE, CFGX.NORMAL_SCALE);
      m.needsUpdate = true;
      var tint = (p.type && p.type.col != null) ? p.type.col : 0x6fb7ff;
      var atmo = atmosphere(p, tint), smog = smogShell(p, look);
      p.mesh.add(atmo); p.mesh.add(smog);
      extras[p.name] = [atmo, smog];
      spinners.push({ planet: p.name, mesh: smog });
      // once the emissive really arrives, turn it on - otherwise a fast first apply leaves the world unlit
      (function (mat, path) {
        ready([path]).then(function (r) { if (r.loaded.length) { mat.emissiveIntensity = CFGX.EMIS_GAIN; mat.needsUpdate = true; } });
      })(m, mapPath(look, '_e'));
    }
    return { ok: true, applied: look, planets: list.length, maps: pathsFor(look).length };
  }

  // the smog layer turns slowly under its own steam; one shared ticker, started once
  (function tick() {
    for (var i = 0; i < spinners.length; i++) spinners[i].mesh.rotation.y += CFGX.SMOG_SPIN;
    requestAnimationFrame(tick);
  })();

  function measure(planetName) {
    var TT = three();
    var p = planets().filter(function (x) { return x.name === planetName; })[0] || planets()[0];
    if (!p) return null;
    var RT = new TT.WebGLRenderTarget(256, 256);
    function disc(dir) {
      var cam = new TT.PerspectiveCamera(40, 1, 0.5, 40000);
      cam.position.copy(p.pos).add(dir.clone().multiplyScalar(p.radius * 2.6));
      cam.lookAt(p.pos); cam.updateMatrixWorld();
      var prev = renderer.getRenderTarget();
      renderer.setRenderTarget(RT); renderer.clear(); renderer.render(scene, cam);
      var b = new Uint8Array(256 * 256 * 4);
      renderer.readRenderTargetPixels(RT, 0, 0, 256, 256, b);
      renderer.setRenderTarget(prev);
      var d = cam.position.distanceTo(p.pos), rpx = (Math.asin(p.radius / d) / (20 * Math.PI / 180)) * 128;
      var cnt = 0, sum = 0, mx = 0, lit = 0;
      for (var y = 0; y < 256; y++) for (var x = 0; x < 256; x++) {
        var dx = x - 128, dy = y - 128; if (dx * dx + dy * dy > rpx * rpx * 0.85) continue;
        var ix = (y * 256 + x) * 4, val = (b[ix] + b[ix + 1] + b[ix + 2]) / 3;
        cnt++; sum += val; if (val > mx) mx = val; if (val > 140) lit++;
      }
      return { mean: +(sum / cnt).toFixed(1), max: Math.round(mx), litPixels: lit };
    }
    var sun = new TT.Vector3(80, 120, 40).normalize();
    var out = { planet: p.name, day: disc(sun), night: disc(sun.clone().negate()),
      vertices: p.mesh.geometry.attributes.position.count,
      displaced: !!p.mesh.material.displacementMap, shells: (extras[p.name] || []).length };
    RT.dispose();
    return out;
  }
  function compare(planetName, list) {
    var out = {}, order = ['off'].concat(list || LOOKS);
    return order.reduce(function (chain, k) {
      return chain.then(function () {
        apply(k, planetName);
        return ready(k === 'off' ? [] : pathsFor(k)).then(function (r) {
          out[k] = measure(planetName);
          out[k].maps = r.loaded.length + '/' + (r.loaded.length + r.failed.length + r.pending.length);
          return null;
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  window.CYBERTRON = { CFG: CFGX, apply: apply, measure: measure, compare: compare, ready: ready,
    pathsFor: pathsFor, looks: function () { return LOOKS.slice(); } };
})();
