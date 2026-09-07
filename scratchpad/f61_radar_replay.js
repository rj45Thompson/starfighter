// f61_radar_replay.js - settles genre cell F61 "a radar or scanner shows nearby objects around the
// ship" (anchor: genre_matrix seed "top-down inset showing rocks, gems, ships and drones"). Verdict: YES.
// This is a 2nd independent read that CONFIRMS the seed via the MECHANISM (the seed described the look).
// index.html renders a top-down radar inset with Three.js, which cannot be rasterised headlessly, so this
// asserts the wiring the render is built from (same approach as f59_zeroinstall_replay.js):
//   TOP-DOWN RADAR INSET: topCam is an overhead OrthographicCamera with the BLIP layer (1) enabled
//     (index.html:692-693); it is drawn each frame into the VIEW.top viewport in the screen corner
//     (renderView(VIEW.top, scene, topCam) :6441), gated by HUD_WIN.top so the WINDOWS menu can hide it.
//     Because topCam also sees layer 0, the inset shows the real rock/gem/planet meshes PLUS the blips.
//   BLIPS FOR NEARBY OBJECTS: topBlip() (:5291) makes a layer-1 sprite; base, the player/other-ship
//     markers, encounters, the stronghold and the mining drones each carry one.
//   RANGE-LIMITED (not omniscient): objects register within CFG.SENSE_R, and RADAR_ROCK_CAP caps rock
//     blips so a dense belt cannot starve the ship/gem blips.
//   FITTABLE SENSOR GEAR: radar is a gear slot (radarType basic/long-range/deep-scan; fitRadar adjusts
//     senseR by the tier bonus) and a separate SCANNER reveals enemy health/cargo gated by its power.
//   INTERACTIVE: topClick() unprojects a click on the inset through topCam to target the object under it.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F61 radar replay - index.html top-down radar/scanner wiring\n');

// TOP-DOWN RADAR INSET
ok('topCam is an overhead camera with the BLIP layer (1) enabled', /const topCam=new T\.OrthographicCamera/.test(IDX) && /topCam\.lookAt\(0,0,0\)/.test(IDX) && /topCam\.layers\.enable\(1\)/.test(IDX));
ok('it is rendered into an on-screen inset viewport (renderView(VIEW.top, scene, topCam))', /renderView\(VIEW\.top,scene,topCam\)/.test(IDX) && /VIEW\.top\s*=\{x:W-insW-10/.test(IDX));
ok('the inset can be shown/hidden via the WINDOWS menu (HUD_WIN.top gate)', /if\(HUD_WIN\.top\)\s*renderView\(VIEW\.top/.test(IDX));

// BLIPS FOR NEARBY OBJECTS
ok('topBlip() builds a layer-targeted radar sprite', /function topBlip\(col,size,layer\)\{[^]*T\.Sprite/.test(IDX));
const blipCalls = (IDX.match(/topBlip\(/g) || []).length;
console.log('  topBlip() call sites (object classes with a radar blip): ' + blipCalls);
ok('several object classes carry a radar blip (base, ships, encounters, stronghold, drones) - >=5 call sites', blipCalls >= 5);
ok('the mining DRONES get a blip "on the top-down radar too"', /const blip=topBlip\([^)]*\);\s*\/\/ on the top-down radar too/.test(IDX));
ok('the stronghold and encounters get a blip', /stronghold=\{[^]*blip:topBlip\(/.test(IDX) && /kind, pos, mesh:m, label:lab, blip:topBlip\(/.test(IDX));

// RANGE-LIMITED
ok('radar registers objects within CFG.SENSE_R (a real sensor range, not omniscient)', /distanceTo\(a\.pos\)<CFG\.SENSE_R/.test(IDX) && /SENSE_R:\s*\d/.test(IDX));
ok('RADAR_ROCK_CAP caps rock blips so a dense belt cannot hide ships/gems', /if\(_rb>=CFG\.RADAR_ROCK_CAP\) break/.test(IDX) && /RADAR_ROCK_CAP:\s*\d/.test(IDX));

// FITTABLE SENSOR GEAR
ok('radar is a fittable gear slot with tiers (fitRadar swaps RADARS, adjusting senseR)', /radarType:'basic'/.test(IDX) && /function fitRadar\(s,key\)/.test(IDX) && /s\.senseR=\(s\.senseR\|\|CFG\.SENSE_R\)-\(old\.bonus\|\|0\)\+\(neu\.bonus\|\|0\)/.test(IDX));
ok('a separate SCANNER reveals enemy health/cargo gated by its power', /function scannerOf\(s\)/.test(IDX) && /SCAN_HEALTH_R_BASE/.test(IDX));

// INTERACTIVE
ok('clicking a blip on the inset targets it (topClick unprojects through topCam)', /function topClick\(mx,my\)/.test(IDX) && /function topWorldAt\(mx,my\)/.test(IDX) && /unproject\(topCam\)/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F61 yes: a top-down radar inset (topCam, layer-1 blips, VIEW.top) shows nearby rocks/gems/ships/drones within SENSE_R, capped by RADAR_ROCK_CAP; radar + scanner are fittable sensor gear; clicking a blip targets it - confirms the seed to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
