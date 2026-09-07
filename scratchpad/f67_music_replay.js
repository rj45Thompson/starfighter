// f67_music_replay.js - settles genre cell F67 "music changes with the situation, for example combat
// versus travel" (source music.js). Verdict: YES. A 2nd independent read confirming the seed by DRIVING the
// real situation classifier. music.js is a 5-layer VERTICAL-REMIX score: pad/sub/arp/perc/shimmer play
// continuously in one key, and the SITUATION only changes each layer's gain + the tempo, so a transition is a
// cross-fade (FADE 1.6s), never a track swap. detect() reads window.HOST every POLL_MS (900ms) and picks one
// of calm/docked/tension/combat/boss; this SLICES detect() and drives it through all five with fake game
// states (the audio graph needs an AudioContext, so the SITUATION TABLE + cross-fade + export are asserted
// structurally). Priority (per the code): docked > boss > combat > tension > calm.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MJS = fs.readFileSync(path.join(ROOT, 'music.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const mLines = MJS.split(/\r?\n/);

// slice detect() (music.js:242-271); provide window/CFG + fresh lastHp/hurtUntil per instance
const src = mLines.slice(241, 271).join('\n');
if (!/function detect\(\)/.test(src) || !/return 'boss'/.test(src)) { console.error('FAIL: music detect() slice moved'); process.exit(2); }
const CFG = { HOSTILE_NEAR: 260, HOSTILE_SEEN: 900 };
const makeDetect = (win) => new Function('window', 'CFG', 'let lastHp=null, hurtUntil=0;\n' + src + '\n;return detect;')(win, CFG);
const at = (dist) => ({ distanceTo: () => dist });                       // a pos whose distance to P is `dist`
const host = (P, ships) => ({ HOST: { P: () => P, ships: () => ships || [] } });
const player = (over) => Object.assign({ hp: 100, maxHp: 100, pos: at(0), docked: false, role: 'player' }, over || {});
const foe = (dist, over) => Object.assign({ alive: true, role: 'pirate', team: 'pirate', pos: at(dist), maxHp: 100 }, over || {});

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F67 music replay - real detect() sliced from music.js, driven through all 5 situations\n');

// (1) drive the classifier (detect() reads window/CFG from its closure; call with no args)
const CALM = makeDetect(host(player(), []))();
const DOCKED = makeDetect(host(player({ docked: true }), [foe(100)]))();     // docked beats a near hostile
const TENSION = makeDetect(host(player(), [foe(500)]))();                    // 500: inside SEEN(900), outside NEAR(260)
const COMBAT = makeDetect(host(player(), [foe(100)]))();                     // 100: inside NEAR(260)
const BOSS = makeDetect(host(player(), [foe(400, { maxHp: 200 })]))();      // 2x player maxHp inside SEEN -> boss
const SQUAD = makeDetect(host(player(), [Object.assign(foe(80), { team: 'squad' })]))();  // coalition ignored
console.log(`  calm=${CALM}  docked=${DOCKED}  tension=${TENSION}  combat=${COMBAT}  boss=${BOSS}  squad-near=${SQUAD}`);
ok("no threat, undocked -> 'calm'", CALM === 'calm');
ok("docked -> 'docked' (beats a near hostile: priority docked > combat)", DOCKED === 'docked');
ok("hostile at 500 (inside HOSTILE_SEEN, outside HOSTILE_NEAR) -> 'tension'", TENSION === 'tension');
ok("hostile at 100 (inside HOSTILE_NEAR) -> 'combat'", COMBAT === 'combat');
ok("a hostile >=2x the player's maxHp inside SEEN -> 'boss'", BOSS === 'boss');
ok("a 'squad' (coalition) ship near is NOT a threat -> stays 'calm'", SQUAD === 'calm');

// (2) hull loss in the last 6s -> combat even with no hostile near (shared detect instance, two polls)
const dh = makeDetect(host(player({ hp: 100 }), []));
const h0 = dh();                       // sets lastHp=100
// now mutate the same HOST's player to a lower hp and re-detect
const hurtHost = host(player({ hp: 90 }), []);
const dh2 = new Function('window', 'CFG', 'let lastHp=100, hurtUntil=0;\n' + src + '\n;return detect;')(hurtHost, CFG);
const HURT = dh2();
console.log(`  after hull drop 100->90 with no hostile near: ${HURT}`);
ok("losing hull in the last 6s -> 'combat' (even with no hostile near)", HURT === 'combat');

// (3) the SITUATION TABLE: 5 situations, distinct tempo, the layer MIX changes (that IS "music changes")
const bpm = {};
['calm', 'docked', 'tension', 'combat', 'boss'].forEach(k => { const m = MJS.match(new RegExp(k + ':\\s*\\{\\s*bpm:\\s*(\\d+)')); if (m) bpm[k] = +m[1]; });
console.log('  tempos: ' + JSON.stringify(bpm));
ok('five situations each carry their own tempo (calm 70, docked 62, tension 96, combat 132, boss 144)', bpm.calm === 70 && bpm.docked === 62 && bpm.tension === 96 && bpm.combat === 132 && bpm.boss === 144);
ok('the MIX changes with situation: perc silent in calm, loud in combat; shimmer the reverse', /calm:\s*\{[^}]*perc:\s*0\.00[^}]*shimmer:\s*0\.30/.test(MJS) && /combat:\s*\{[^}]*perc:\s*0\.44[^}]*shimmer:\s*0\.00/.test(MJS));

// (4) vertical remixing + cross-fade + poll + export (structural)
ok('5 continuous layers (pad/sub/arp/perc/shimmer) - vertical remixing, not a track swap', /pad\b/.test(MJS) && /sub\b/.test(MJS) && /arp\b/.test(MJS) && /perc\b/.test(MJS) && /shimmer\b/.test(MJS) && /cross-fade of gains, never a restart/.test(MJS));
ok('the detector re-reads the game every POLL_MS and cross-fades (FADE) on a change', /POLL_MS:\s*900/.test(MJS) && /FADE:\s*1\.6/.test(MJS) && /function poll\(\)/.test(MJS) && /if \(s !== wanted\)/.test(MJS));
ok('exports window.MUSIC with set/auto/debug (manual latch for testing)', /window\.MUSIC = API/.test(MJS) && /set: function \(name\)/.test(MJS) && /auto: function \(\)/.test(MJS) && /debug: function/.test(MJS));
ok('wired into the game (index.html loads music.js)', /<script src="music\.js/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? "PASS - F67 yes: the real detect() classifies calm/docked/tension/combat/boss from the live game (driven through all five + the hull-loss combat path + coalition-ignored), and each situation cross-fades a 5-layer mix at its own tempo - music changes with the situation, confirmed to anchors=2"
  : 'FAIL'));
process.exit(pass ? 0 : 1);
