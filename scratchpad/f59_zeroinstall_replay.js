// f59_zeroinstall_replay.js - settles genre cell F59 "the game is playable within a minute with
// no installation." Structural facts read from index.html + the repo:
//   NO INSTALL: index.html is a self-contained browser page - every <script src> is a LOCAL .js
//     (no external CDN/scheme), there is NO bundler/build manifest (no package.json/webpack/vite/
//     rollup at the game root), and the modules use only browser APIs. Open the file, it runs.
//   PLAYABLE WITHIN A MINUTE: the frame loop starts at top level on load (requestAnimationFrame
//     (frame) :7778) and START_IN_BELT spawns the player straight into flight (:6578) - no login /
//     download / paywall gate before play.
//   OFFLINE-TOLERANT: the only network fetches (brain world tier, dataset facts) soft-fail, so no
//     download is REQUIRED to play.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F59 zero-install replay - index.html script/boot structure\n');

// NO INSTALL: every <script src> is a local .js, no external scheme/CDN
const srcs = [...IDX.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
const external = srcs.filter(s => /^(https?:)?\/\//i.test(s));
console.log(`  ${srcs.length} <script src> tags; external/CDN: ${external.length ? external.join(', ') : 'none'}`);
ok('every script is a LOCAL file (no external CDN/scheme)', srcs.length > 0 && external.length === 0);
ok('all script srcs are plain .js (no build artifact / bundler chunk)', srcs.every(s => /\.js(\?|$)/.test(s)));
const manifests = ['package.json', 'webpack.config.js', 'vite.config.js', 'rollup.config.js'].filter(f => fs.existsSync(path.join(REPO, f)));
ok('no bundler/build manifest at the game root (runs unbuilt): ' + (manifests.join(', ') || 'none'), manifests.length === 0);

// PLAYABLE WITHIN A MINUTE: frame loop starts on load + player spawns into flight, no gate
ok('the frame loop starts at top level on load (requestAnimationFrame(frame))', /\n\s*requestAnimationFrame\(frame\);\s*(\n|$)/.test(IDX));
ok('START_IN_BELT spawns the player straight into flight on boot', /START_IN_BELT:\s*true/.test(IDX) && /CFG\.START_IN_BELT && ships\[0\]/.test(IDX));
const gate = /\b(log ?in|sign ?in|sign ?up|create an account|paywall|purchase to play|buy to play|enter (a )?(licence|license|serial) key)\b/i.test(IDX);
ok('no login / signup / paywall / license gate before play', !gate);

// OFFLINE-TOLERANT: the network fetches soft-fail (no download required to play)
ok('the brain world tier is offline-tolerant ("Offline = the Passenger says so; nothing substituted")', /Offline = the Passenger says so/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F59 yes: a self-contained browser page (local scripts, no build/install), boots straight into flight on load with no gate - playable within a minute'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
