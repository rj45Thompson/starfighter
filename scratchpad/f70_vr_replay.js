// f70_vr_replay.js - settles genre cell F70 "the game supports VR headsets". Verdict: NO. A grep-proven
// absence backed by the flat-canvas renderer facts, so the observable is a re-runnable scan (mirrors the F70
// guard just added to tools/genre_selfcheck.js), not a driven-game replay:
//   (1) the WebXR / VR API surface has 0 hits across the 48 scanned files (deliberately NOT a bare \bVR\b,
//       which false-positives on the `vr` verdict variable in tom_test.js).
//   (2) the renderer is a FLAT browser three.js canvas: a normal WebGLRenderer, renderer.xr is never touched,
//       there is no setAnimationLoop (the loop a WebXR session requires) - the frame loop is a plain top-level
//       requestAnimationFrame(frame) (see f59), which does not run inside an immersive XR session.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const VENDORED = new Set(['three.min.js', 'fflate.min.js', 'fbxloader.js']);
const files = ['index.html', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !VENDORED.has(f))]
  .filter(f => fs.existsSync(path.join(ROOT, f)));

// the SAME regex baked into tools/genre_selfcheck.js's F70 guard
const XR = /webxr|navigator\.xr\b|renderer\.xr\b|\.xr\.(enabled|setSession|getSession|isPresenting|setReferenceSpaceType)|\bVRButton\b|\bXRButton\b|VRDisplay|getVRDisplays|requestSession|isSessionSupported|immersive-vr|\bWebVR\b|XRSession|XRWebGLLayer|XRReferenceSpace|XRControllerModel|stereoscopic|\boculus\b|openxr|cardboard vr/i;

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F70 VR replay - is there any VR/WebXR support?\n');

// (1) NO VR/WebXR API anywhere
const hits = [];
for (const f of files) fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).forEach((ln, i) => { if (XR.test(ln)) hits.push(`${f}:${i + 1}`); });
console.log(`  VR/WebXR-API hits across ${files.length} scanned files: ${hits.length ? hits.join(', ') : 'none'}`);
ok('no WebXR / VR API in any source file (0 hits)', hits.length === 0);

// (2) the renderer is a flat, non-VR three.js canvas
ok('a normal three.js WebGLRenderer (a flat canvas), not an XR renderer', /new T\.WebGLRenderer\(/.test(IDX));
ok('renderer.xr is NEVER enabled/used (no VR session on the renderer)', !/renderer\.xr\b/.test(IDX) && !/\.xr\.enabled/.test(IDX));
ok('no setAnimationLoop (the loop a WebXR session requires) - the boot is a plain requestAnimationFrame(frame)', !/setAnimationLoop/.test(IDX) && /requestAnimationFrame\(frame\)/.test(IDX));
ok('no VRButton / XRButton entry point (nothing offers "enter VR")', !/VRButton|XRButton|enter ?VR/i.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F70 no: zero WebXR/VR API across the source, and the renderer is a flat browser three.js canvas (WebGLRenderer, no renderer.xr, no setAnimationLoop, plain requestAnimationFrame boot) - no VR headset support'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
