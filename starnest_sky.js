// starnest_sky.js - a PROCEDURAL skybox, baked once (GRAPHICS PASS 2026-09-06).
//
// RJ: "fix the background and upgrade the graphics using the generation tools we have on disk for unity". The
// Starfighter2 Unity project on this machine (C:\Users\r_jay\OneDrive\code\Starfighter2\Assets\Junk\StarNestSkybox)
// ships the Star Nest skybox: Pablo Roman Andrioli's algorithm (https://www.shadertoy.com/view/XlfGRj, MIT), Unity
// port by Jonathan Cohen. The Unity shader's own readme warns it is "NOT intended for mobile" and "can have a HUGE
// performance hit" as a per-frame sky. So it is not run per frame here: the volumetric loop below is the same
// algorithm, rendered ONCE at load through a CubeCamera into a WebGLCubeRenderTarget, and that cube texture becomes
// scene.background. Seamless by construction (a cube map of a 3D field), no per-frame cost, no image files.
//
// Defaults are the Shadertoy original's constants (the Unity material scales the same numbers by 1000/100 for its
// inspector; the readme documents what each does). Every knob is in CFG so the look can be tuned in one place.
//
// Usage (after three.min.js, before the game script):
//   const sky = STARNEST.bake(renderer, T, { size: 1024, seed: 3, tint: [1, 1, 1] });   // -> THREE.CubeTexture
//   scene.background = sky;
(function () {
  'use strict';

  var CFG = {
    SIZE: 1024,          // pixels per cube face. 1024 = 6 MP once; 512 is fine on weak GPUs
    ITERATIONS: 17,      // inner fractal loop (Shadertoy: 17). More = more distant detail, brighter
    VOLSTEPS: 20,        // volumetric steps (Shadertoy: 20). The expensive one; dark matter needs >= 8
    FORMUPARAM: 0.53,
    STEPSIZE: 0.10,
    ZOOM: 0.80,
    TILE: 0.85,
    BRIGHTNESS: 0.0015,
    DARKMATTER: 0.30,
    DISTFADING: 0.73,
    SATURATION: 0.85,
    // where in the field the camera sits: different "from" points give different skies. Chosen by seed.
    FROM: [1.0, 0.5, 0.5],
    SEED_STEP: 0.37,     // how far a seed moves the origin per unit
    GAIN: 1.0            // final multiplier before writing the face (the game's tone mapping runs after)
  };

  var FRAG = [
    'precision highp float;',
    'varying vec3 vDir;',
    'uniform vec3 uFrom; uniform vec3 uTint; uniform float uGain;',
    'uniform int uIterations; uniform int uVolsteps;',
    'uniform float uFormuparam, uStepsize, uZoom, uTile, uBrightness, uDarkmatter, uDistfading, uSaturation;',
    'void main(){',
    '  vec3 dir = normalize(vDir) * uZoom;',
    '  vec3 from = uFrom;',
    '  float s = 0.1, fade = 1.0;',
    '  vec3 v = vec3(0.0);',
    '  for (int r = 0; r < 64; r++) {',
    '    if (r >= uVolsteps) break;',
    '    vec3 p = from + s * dir * 0.5;',
    '    p = abs(vec3(uTile) - mod(p, vec3(uTile * 2.0)));',
    '    float pa = 0.0, a = 0.0;',
    '    for (int i = 0; i < 64; i++) {',
    '      if (i >= uIterations) break;',
    '      p = abs(p) / dot(p, p) - uFormuparam;',
    '      a += abs(length(p) - pa);',
    '      pa = length(p);',
    '    }',
    '    float dm = max(0.0, uDarkmatter - a * a * 0.001);',
    '    a *= a * a;',
    '    if (r > 6) fade *= 1.0 - dm;',
    '    v += fade;',
    '    v += vec3(s, s * s, s * s * s * s) * a * uBrightness * fade;',
    '    fade *= uDistfading;',
    '    s += uStepsize;',
    '  }',
    '  float len = length(v);',
    '  v = mix(vec3(len), v, uSaturation);',
    '  gl_FragColor = vec4(v * 0.01 * uTint * uGain, 1.0);',
    '}'
  ].join('\n');

  var VERT = [
    'varying vec3 vDir;',
    'void main(){',
    '  vDir = (modelMatrix * vec4(position, 1.0)).xyz;',   // the sphere is at the origin: world position IS the ray direction
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  function bake(renderer, T, opts) {
    opts = opts || {};
    var size = opts.size || CFG.SIZE;
    var seed = (opts.seed == null) ? 0 : opts.seed;
    var from = new T.Vector3(CFG.FROM[0] + seed * CFG.SEED_STEP, CFG.FROM[1] + seed * CFG.SEED_STEP * 0.61, CFG.FROM[2] + seed * CFG.SEED_STEP * 1.13);
    var tint = opts.tint || [1, 1, 1];
    var mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, depthTest: false,
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uFrom: { value: from }, uTint: { value: new T.Vector3(tint[0], tint[1], tint[2]) }, uGain: { value: opts.gain != null ? opts.gain : CFG.GAIN },
        uIterations: { value: opts.iterations || CFG.ITERATIONS }, uVolsteps: { value: opts.volsteps || CFG.VOLSTEPS },
        uFormuparam: { value: CFG.FORMUPARAM }, uStepsize: { value: CFG.STEPSIZE }, uZoom: { value: CFG.ZOOM }, uTile: { value: CFG.TILE },
        uBrightness: { value: CFG.BRIGHTNESS }, uDarkmatter: { value: CFG.DARKMATTER }, uDistfading: { value: CFG.DISTFADING }, uSaturation: { value: CFG.SATURATION }
      }
    });
    var scene = new T.Scene();
    scene.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), mat));
    var rt = new T.WebGLCubeRenderTarget(size, { format: T.RGBAFormat, generateMipmaps: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    var cam = new T.CubeCamera(0.1, 100, rt);
    // the bake must not inherit the game's tone mapping twice: render raw, the game maps the background once on screen
    var tm = renderer.toneMapping; renderer.toneMapping = T.NoToneMapping;
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    cam.update(renderer, scene);
    renderer.toneMapping = tm;
    mat.dispose();
    var ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    if (typeof console !== 'undefined') console.log('[starnest] baked ' + size + 'x' + size + ' x6 in ' + ms.toFixed(0) + ' ms (seed ' + seed + ', ' + (opts.volsteps || CFG.VOLSTEPS) + ' steps x ' + (opts.iterations || CFG.ITERATIONS) + ' iterations)');
    rt.texture.encoding = T.LinearEncoding;
    return rt.texture;
  }

  if (typeof window !== 'undefined') window.STARNEST = { bake: bake, CFG: CFG };
  if (typeof module !== 'undefined' && module.exports) module.exports = { bake: bake, CFG: CFG };
})();
