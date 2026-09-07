// genre_selfcheck.js - re-derive the grep-PROVEN "no" genre grades from the game's own source, so a
// settled "no, proven" cell fails a pass the moment the capability it denies actually lands - instead of
// standing as a stale, confident wrong grade nobody re-checks.
//
// Why this exists: three genre_matrix.json cells were each settled ours="no" by a ZERO-HIT grep over the
// game's own source (index.html + every root *.js minus the 3 vendored libs), and the settlement's proof is
// a one-time manual grep recorded in prose. upgrade_pass.py TRUSTS the recorded ours.v - it reads the grade
// as input and never re-derives it - so if someone adds gamepad handling, a music bed, or a colourblind mode
// next month, the matrix keeps reporting "no", the anchor-ranked backlog misranks, and nothing complains.
// This turns each of those three claims back into a re-checkable observable, the way cmd_shadow.js and
// cfg_dupes.js do for their own regression classes.
//
// The cells it guards:
//   F68  the game supports a gamepad           -> no  (grep getGamepads|gamepadconnected|... = 0)   [2026-09-06]
//   F69  colourblind or other accessibility    -> no  (grep colou?rblind|deuteran|...|prefers-* = 0) [2026-09-06]
//   F29  capture an enemy ship and keep it      -> no  (grep commandeer|hijack|capture-a-ship|board-enemy|... = 0) [2026-09-07]
//   F40  real-time multiplayer (many humans)     -> no  (grep WebSocket|RTCPeer|socket.io|multiplayer|... = 0)     [2026-09-07]
//   F44  in-system fast-travel layer             -> no  (grep supercruise|fast-travel|cruise mode|time-accel|... = 0) [2026-09-07]
//   F48  permadeath (death ends the run)         -> no  (grep permadeath|ironman|hardcore|permanent death|... = 0)   [2026-09-07]
//   F56  co-op / PvP with other humans           -> no  (grep PvP|player-vs-player|multiplayer|matchmak|... = 0)     [2026-09-07]
//   F60  pick a difficulty or start scenario      -> no  (grep choose/select difficulty|scenario picker|hard mode|... = 0) [2026-09-07]
//
// F67 (adaptive music) WAS guarded here and has been RETIRED from the list, which is this guard
// working rather than failing: music.js was built on 2026-09-06, the grep that defined the cell went
// from 0 hits to 11, and the guard refused to pass until the grade was re-settled. Once ours.v is
// "yes" the cell is no longer a grep-proven "no" and there is nothing here left to protect - the
// thing that protects it now is MUSIC.debug() reporting live layer gains per situation.
// A hit does not by itself prove the capability now works - it proves the "no, proven by grep" basis is gone,
// so the cell must be re-settled against the source. That is exactly when a grade silently goes wrong.
//
//   node tools/genre_selfcheck.js              # exit 1 if any proven-"no" cell now has source hits
//   node tools/genre_selfcheck.js --self-test  # prove the check works by planting a pattern that DOES hit
//
// Deliberately a TEXT scan, like cmd_shadow.js and cfg_dupes.js: no JS parser, because index.html is a
// 7,400-line inline script and the grep patterns here are the very ones the settlements were argued from.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VENDORED = new Set(['three.min.js', 'fflate.min.js', 'fbxloader.js']);

// id -> the grep that DEFINES the settlement. Kept identical to the grep quoted in each TASKS.md line so the
// guard argues from the same evidence the human did; the expected grade for every entry is "no".
const GUARDS = [
  { id: 'F68', label: 'gamepad', re: /getGamepads|gamepadconnected|gamepaddisconnected|navigator\.getGamepads|new Gamepad/i },
  { id: 'F69', label: 'colourblind / accessibility options', re: /colou?rblind|deuteran|protan|tritan|daltoniz|high-contrast|prefers-reduced-motion|prefers-contrast/i },
  // F29 (2026-09-07): capture an ENEMY SHIP and keep it. Tight patterns only, so it never trips on WORLD-capture
  // (conquest.js "capture the planet", WARSCORE_PER_CAPTURE), on "aboard your ship", "mouse captured" (pointer lock),
  // or "captured BEFORE generateHullRoster". Any hit means a board/commandeer/tow-a-ship mechanic has landed.
  { id: 'F29', label: 'capture an enemy ship', re: /commandeer|hijack|capture[\sa-z]{0,10}(ship|vessel|craft|hull)|board(ing|ed)?\s+(an?\s+)?(enemy|hostile|pirate|ship|vessel)|tow\s+(the\s+)?(enemy\s+)?(ship|vessel|hull)|tractor\s+(the\s+)?(ship|vessel)|prize\s+(ship|crew|vessel|hull)|captured?\s+(enemy\s+)?(ship|vessel|craft)/i },
  // F40 (2026-09-07): the world is shared in REAL TIME with many other human players (multiplayer). Tight networking
  // transports only, so it never trips on the BroadcastChannel('SF_SINGLETON') SINGLETON LOCK (same-machine tab
  // coordination that FREEZES older tabs - the OPPOSITE of shared play, "No server, no races" index.html:6761) or on
  // GAMEMOD.emit (gamemod.js, a local mod event bus). Any hit means a real-time-multiplayer transport (WebSocket /
  // WebRTC / socket.io / peer) has landed. Verified 0 hits across the 48 scanned files at settlement.
  { id: 'F40', label: 'real-time multiplayer', re: /new WebSocket|WebSocket\s*\(|RTCPeerConnection|RTCDataChannel|createDataChannel|socket\.io|\bio\.connect\b|\bmultiplayer\b|matchmak(e|ing)|\bnetcode\b|peer(js|-to-peer)|\bMMO\b|co-?op (session|multiplayer)|other human players?/i },
  // F44 (2026-09-07): an in-system FAST-TRAVEL LAYER distinct from combat flight (Elite-style supercruise). Tight
  // patterns only, so it never trips on the THROTTLE's "cruise SPEED / cruise level" (a speed control, not a travel
  // layer, index.html:231-232/:405), the "Cruiser" HULL, or conquest.js's "does not fast-forward the war" :52. In-
  // system travel is real-space flight (go/goto autopilot at normal speed; hyperspace is BETWEEN systems, F42/F43).
  // Any hit means a supercruise / cruise-mode / time-accel / instant-travel layer has landed.
  { id: 'F44', label: 'in-system fast-travel layer', re: /supercruise|super-cruise|\bfast.?travel\b|cruise (mode|layer|drive|state|lane)|time.?(accel|warp|dilation)|instant(aneous)? (travel|transit|arrival|jump)|jump.?to.?point|warp.?to.?(planet|point|world)|autotravel|frame.?shift/i },
  // F48 (2026-09-07): player death ends the run PERMANENTLY (permadeath). Graded "no" - death is non-terminal:
  // killByShip sets s.respawn=RESPAWN_DELAY (index.html:2822), step revives at s.respawn<=0 (:2669), the player
  // respawns as a stock Scout (:2839). Tight patterns only, so it never trips on the GENERATION reset ("game over /
  // generations" starmap.js - a soft territory-loss reset that KEEPS the minds' knowledge, not a death end) or the
  // AGI "no single lifetime" culture text (:4726). Any hit means a permadeath / ironman / hardcore mode has landed.
  { id: 'F48', label: 'permadeath (death ends the run)', re: /permadeath|perma-death|iron ?man|hard ?core|permanent(ly)? (dead|death)|death is permanent|\bno[ -]?respawn\b|run ends (on|at|with) death|final death|one life to live/i },
  // F56 (2026-09-07): cooperate or FIGHT with other HUMAN players (co-op / PvP). A corollary of F40 (no
  // real-time multiplayer transport exists) - human co-op/PvP is impossible without a network. Tight patterns
  // for the player-facing LABELS a co-op/PvP mode would use, so it never trips on the AI-squad "co-op" or on the
  // "human player only" death-wipe comment (index.html:2830, which means the SINGLE human player, not others).
  // Any hit means a PvP/co-op-multiplayer mode has landed (which F40's networking guard would also catch).
  { id: 'F56', label: 'co-op / PvP with other humans', re: /\bPvP\b|player.?vs.?player|versus (another |a )?player|\bco-?op mode\b|\bmultiplayer\b|matchmak(e|ing)|human.?vs.?human|\bother human players?\b|invite (a )?friend|join (a )?(friend|multiplayer|lobby)/i },
  // F60 (2026-09-07): the player picks a DIFFICULTY or a STARTING SCENARIO before playing (Elite's ship/start,
  // X's game-start scenarios - 5 of 7 surveyed games do). Graded "no" - there is ONE fixed start: START_IN_BELT
  // (index.html:395) drops every boot AND every generation-reset into the same Ceres Belt (:6578, :6753);
  // difficulty is DEV-TUNED constants (ESC_RATE/HEG_TIERS, the "DIFFICULTY PASS 4/5" balance comments), never a
  // player choice; the `newgame`/`restart` command (:4592) is a confirm-gated reset to that SAME start, offering
  // no options. Tight PICKER patterns only, so it never trips on those balance comments, the AI auto-curriculum
  // "difficulty in the ZONE" (:4729), the empire/engbay mid-game pickers, or the choice-less `newgame`. Any hit
  // means a difficulty / scenario / game-mode picker has landed. Verified 0 hits across the 48 scanned files.
  { id: 'F60', label: 'difficulty / start-scenario picker', re: /(choose|select|pick|set)\s+(a\s+|your\s+|the\s+)?(difficulty|game.?mode|starting scenario|start scenario|scenario)\b|difficulty\s*(select|picker|slider|setting|option|level|menu|screen|chooser)|scenario\s*(select|picker|menu|screen|chooser|choice|list|preset)|\b(easy|normal|hard|casual|iron ?man|hard ?core)\s+(mode|difficulty)\b|game.?mode\s*(select|picker|menu|option)|choose your (difficulty|scenario|start)/i },
];

function gameFiles() {
  const js = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !VENDORED.has(f));
  return ['index.html', ...js].filter(f => fs.existsSync(path.join(ROOT, f)));
}

function hitsFor(re) {
  const out = [];
  for (const f of gameFiles()) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/);
    lines.forEach((ln, i) => { if (re.test(ln)) out.push(`${f}:${i + 1}: ${ln.trim().slice(0, 100)}`); });
  }
  return out;
}

function loadGrades() {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'genre', 'genre_matrix.json'), 'utf8'));
  const g = {};
  for (const feat of m.features) g[feat.id] = feat.ours && feat.ours.v;
  return g;
}

// A grep-proven "no" cell is consistent iff its grade is "no" AND the grep finds nothing. Any hit, or any
// grade other than "no", means the grep basis no longer holds and the cell must be re-settled.
function check(guards, grades) {
  const problems = [];
  for (const g of guards) {
    const grade = grades[g.id];
    const hits = hitsFor(g.re);
    if (grade === undefined) { problems.push({ ...g, grade, hits: [], note: 'no such feature id in genre_matrix.json' }); continue; }
    if (grade === 'no') {
      if (hits.length > 0) problems.push({ ...g, grade, hits });
    } else {
      problems.push({ ...g, grade, hits, note: 'settled "no, proven by grep"; a non-"no" grade needs re-checking against the source' });
    }
  }
  return problems;
}

function main() {
  if (process.argv.includes('--self-test')) {
    // Plant a guard whose pattern DEFINITELY hits every source file, and assert its cell is "no". A working
    // checker must flag the contradiction; if it does not, this checker proves nothing.
    const planted = [{ id: 'F68', label: 'PLANTED always-hits', re: /function|const |CFG/ }];
    const problems = check(planted, { F68: 'no' });
    const caught = problems.length === 1 && problems[0].hits.length > 0;
    console.log(caught
      ? `self-test PASS - the guard flagged a planted "no" cell that has ${problems[0].hits.length} source hits`
      : 'self-test FAIL - a planted contradiction went unnoticed, this checker proves nothing');
    process.exit(caught ? 0 : 1);
  }

  const problems = check(GUARDS, loadGrades());
  if (problems.length === 0) {
    console.log(`genre_selfcheck: ${GUARDS.length} grep-proven "no" cells still hold (F68 gamepad, F69 accessibility, F29 ship capture, F40 real-time multiplayer, F44 in-system fast-travel, F48 permadeath, F56 co-op/PvP, F60 difficulty/scenario picker) - 0 source hits each.`);
    process.exit(0);
  }
  console.log('genre_selfcheck: FAIL - a grep-proven "no" grade no longer matches the source:');
  for (const p of problems) {
    console.log(`  ${p.id} (${p.label}): recorded ours="${p.grade}"${p.note ? ' - ' + p.note : ''}; ${p.hits.length} hit(s)` + (p.hits.length ? ':' : ''));
    for (const h of p.hits.slice(0, 6)) console.log(`     ${h}`);
    if (p.hits.length > 6) console.log(`     ... and ${p.hits.length - 6} more`);
    console.log(`  -> re-settle genre_matrix.json ${p.id} against the source, then re-run py -3.13 tools/upgrade_pass.py.`);
  }
  process.exit(1);
}

main();
