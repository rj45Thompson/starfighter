// ground_determinism.js - re-runnable guard for task C7: "two builds of the same world
// produce identical terrain colour, measured."  ->  node tools/ground_determinism.js
//
// It does NOT reimplement ground.js. It SLICES the real deterministic core (ground.js
// lines 52-96: hashSeed, rngOf, vnoise, SHAPE, buildHeight) straight out of the file and
// evals those exact bytes, then drives the terrain-colour loop that mirrors ground.js:102-114
// with a faithful minimal three.js Color. Same planet name -> byte-identical colours proves
// determinism; a different name -> different colours proves the colour is seed-driven (off
// hashSeed(planet.name)), not a constant that would be "identical" trivially. Exits non-zero
// if the property ever regresses (e.g. an unseeded Math.random creeping back into terrain).
const fs = require('fs');
const path = require('path');

const GROUND = path.join(__dirname, '..', 'ground.js');   // tools/ -> repo root
const src = fs.readFileSync(GROUND, 'utf8').split(/\r?\n/);

// pull the real core out of the file (1-indexed lines 52..96); fail loudly if it moved
const coreText = src.slice(51, 96).join('\n');
if (!/function hashSeed/.test(coreText) || !/function buildHeight/.test(coreText)) {
  console.error('FAIL: core slice (lines 52-96) did not capture hashSeed/buildHeight - the');
  console.error('       deterministic block moved; update the slice bounds in this guard.');
  process.exit(2);
}
// belt and braces: there must be no LIVE Math.random( in the whole file (only the comment)
const liveRandom = src
  .map((l, i) => [i + 1, l])
  .filter(([, l]) => /Math\.random\s*\(/.test(l) && !/^\s*\/\//.test(l) && !/was Math\.random/.test(l));
if (liveRandom.length) {
  console.error('FAIL: live Math.random( in ground.js - terrain determinism is at risk:');
  liveRandom.forEach(([n, l]) => console.error(`  ${n}: ${l.trim()}`));
  process.exit(1);
}

const CFG = { SIZE: 240, SEG: 160, PAD_R: 9, TOWN_R: 46 };   // from ground.js CFG
const S = { seed: 0, height: null };
const core = new Function('S', 'CFG',
  coreText + '\n;return { hashSeed:hashSeed, rngOf:rngOf, vnoise:vnoise, buildHeight:buildHeight, SHAPE:SHAPE };'
)(S, CFG);

// faithful minimal three.js Color (exact semantics of the ops ground.js:102-114 uses)
function Color(hex) {
  if (typeof hex === 'number') { this.r = ((hex >> 16) & 255) / 255; this.g = ((hex >> 8) & 255) / 255; this.b = (hex & 255) / 255; }
  else { this.r = this.g = this.b = 0; }
}
Color.prototype.clone = function () { const c = new Color(); c.r = this.r; c.g = this.g; c.b = this.b; return c; };
Color.prototype.copy = function (o) { this.r = o.r; this.g = o.g; this.b = o.b; return this; };
Color.prototype.multiplyScalar = function (s) { this.r *= s; this.g *= s; this.b *= s; return this; };
Color.prototype.lerp = function (o, t) { this.r += (o.r - this.r) * t; this.g += (o.g - this.g) * t; this.b += (o.b - this.b) * t; return this; };

// terrain-colour build, mirroring ground.js:98-115 (PlaneGeometry grid + colour loop)
function buildColours(planet) {
  S.seed = core.hashSeed((planet && planet.name) || 'surface');   // ground.js:242
  S.height = core.buildHeight(planet);                            // ground.js:243
  const seg = CFG.SEG, half = CFG.SIZE / 2, step = CFG.SIZE / seg;
  const colors = new Float32Array((seg + 1) * (seg + 1) * 3);
  const base = new Color((planet && planet.type && planet.type.col) || 0x37506a);
  const rock = base.clone().multiplyScalar(0.22);
  const soil = base.clone().multiplyScalar(0.42);
  const high = base.clone().lerp(new Color(0xffffff), 0.22).multiplyScalar(0.5);
  const c = new Color();
  let i = 0;
  for (let gy = 0; gy <= seg; gy++) {
    for (let gx = 0; gx <= seg; gx++) {
      const x = -half + gx * step, z = -half + gy * step;
      const y = S.height(x, z);
      const t = Math.max(0, Math.min(1, (y + 2) / 16));
      let sp = Math.sin(i * 12.9898 + S.seed * 0.017) * 43758.5453; sp -= Math.floor(sp);
      c.copy(soil).lerp(high, t).lerp(rock, sp * 0.18);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      i++;
    }
  }
  return colors;
}

const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
const diffs = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

const worlds = [
  { name: 'Ferrous Prime', type: { t: 'Mining', col: 0x8a5a3c } },
  { name: 'Verdant Reach', type: { t: 'Agri', col: 0x4a7a3a } },
  { name: 'Argent Hub', type: { t: 'Hi-Tech', col: 0x5a7a9a } },
];

let pass = true;
console.log('C7 ground determinism - real ground.js core (lines 52-96), colour mirrors :102-114\n');
for (const w of worlds) {
  const a = buildColours(w), b = buildColours(w);
  const ok = same(a, b);
  console.log(`  ${w.name.padEnd(15)} type=${String(w.type.t).padEnd(8)} verts=${a.length / 3}  build1==build2: ${ok ? 'IDENTICAL' : 'DIFFERS(' + diffs(a, b) + ')'}`);
  if (!ok) pass = false;
}
const cA = buildColours(worlds[0]), cB = buildColours(worlds[1]);
const distinct = !same(cA, cB);
console.log(`\n  control: '${worlds[0].name}' vs '${worlds[1].name}' differ: ${distinct ? 'YES (' + diffs(cA, cB) + ')' : 'NO - colour NOT seed-driven!'}`);
if (!distinct) pass = false;
const nameMatters = !same(buildColours({ name: 'Ferrous Prime', type: { t: 'Mining', col: 0x8a5a3c } }),
                          buildColours({ name: 'Iron Crag', type: { t: 'Mining', col: 0x8a5a3c } }));
console.log(`  control: same type, name 'Ferrous Prime' vs 'Iron Crag' differ: ${nameMatters ? 'YES' : 'NO - name/seed ignored!'}`);
if (!nameMatters) pass = false;

console.log('\nRESULT: ' + (pass ? 'PASS - same world builds identical terrain colour; different worlds differ' : 'FAIL'));
process.exit(pass ? 0 : 1);
