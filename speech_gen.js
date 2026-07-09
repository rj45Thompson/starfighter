// speech_gen.js - THE FLUENT SPEECH ENGINE (user 2026-07-09: "remove the agi hardcoding speech and make it as
// fluent as possible. creativity at max for the game").
//
// Replaces the ~40 hardcoded template lines (say(s,`Splashed ${name}!`) etc.) with GENERATED speech, composed
// fresh per utterance from three honest sources:
//   1. LIVE EVENT DATA - names, credits, distances, places are passed in from the real event and used verbatim
//      (0-fab: the engine never invents a fact; it only phrases the ones the game just produced).
//   2. THE PILOT'S OWN VOICE - a per-pilot voice model mined MECHANICALLY from their own novel segments
//      (novelSegOf: verbatim canon sentences): distinctive vocabulary + short verbatim clauses used as
//      occasional muttered flourishes. GIVEN-from-canon, labeled as such - this is presentation, not a
//      learning claim.
//   3. TEMPERAMENT - the backstory string keys a register (hot / soft / even) that selects exclamation and
//      tail banks, so a raider and a chaplain phrase the same kill differently.
// CREATIVITY AT MAX = variety by construction: every event has many frames x slot banks x optional exclaim x
// optional tail x optional canon-mutter, with an anti-repeat ring per pilot (recent lines are re-rolled).
// STYLE LAW: no em-dash character, ever - " - " only (enforced by a final scrub + self-test).
//
// PUBLIC API (window.SPEECHGEN): line(ship, event, data) -> string, or null when the event is unknown
// (callers keep their old literal as a soft-fail fallback, matching every other optional module here).
'use strict';
(function () {

var CFG = {
  RECENT_RING: 8,          // per-pilot anti-repeat memory
  REROLL_TRIES: 4,         // attempts to escape a recent duplicate
  P_EXCLAIM: 0.4,          // chance a line opens with a register exclaim
  P_TAIL: 0.35,            // chance a line closes with a register tail
  P_MUTTER: 0.16,          // chance an idle-ish line ends in a verbatim canon mutter
  MUTTER_MAX_WORDS: 9,     // canon-mutter clause clip
  VOICE_WORDS: 10,         // distinctive words mined per pilot (reserved for future frames)
};

function win() { return (typeof window !== 'undefined') ? window : null; }
function R() { return Math.random(); }   // cosmetic speech only - never game logic
function pick(arr) { return arr[(R() * arr.length) | 0]; }
function chance(p) { return R() < p; }

// ---- register (temperament class) ------------------------------------------------------------------------------
var HOT_RE = /raider|fearless|warlord|execution|hunts|breacher|boarding|blockade|mine layer|slow anger|killer/i;
var SOFT_RE = /medic|poet|chaplain|weary|grieving|archivist|sings|doubting|ledger|insurance|assessor|quartermaster/i;
function registerOf(s) {
  var t = (s && (s.backstory || '')) + '';
  if (HOT_RE.test(t)) return 'hot';
  if (SOFT_RE.test(t)) return 'soft';
  return 'even';
}

// ---- register banks --------------------------------------------------------------------------------------------
var EXCLAIM = {
  hot: ['Ha!', 'There!', 'Down you go.', 'Told you.', 'Next.', 'Come on then.', 'That\'s it!', 'Burn.'],
  soft: ['So.', 'Well.', 'Stars forgive us.', 'Quietly now.', 'There it is.', 'Hm.', 'As written.'],
  even: ['Right.', 'Okay.', 'Copy.', 'Confirmed.', 'Good.', 'Clean.', 'Steady.'],
};
var TAIL = {
  hot: ['the lane\'s mine', 'keep count', 'who\'s next', 'no chatter, just wreckage', 'tell the Synod', 'mark it and move'],
  soft: ['no joy in it', 'log it and breathe', 'someone knew that ship', 'the band goes quiet a moment', 'stars keep them', 'we go on'],
  even: ['logging it', 'moving on', 'lane clear', 'back to the sweep', 'eyes open', 'as briefed'],
};

// ---- per-pilot voice model (mined once, cached on the ship object) ---------------------------------------------
function voiceOf(s) {
  if (s && s._sgVoice) return s._sgVoice;
  var v = { mutters: [], words: [] };
  var w = win();
  var segs = (w && typeof w.novelSegOf === 'function' && s && s.name) ? w.novelSegOf(s.name) : null;
  if (segs && segs.length) {
    for (var i = 0; i < segs.length && v.mutters.length < 14; i++) {
      var txt = String(segs[i].text || '');
      // first clause of a canon sentence, clipped to a mutterable length - verbatim, their own words
      var clause = txt.split(/[.;:!?]/)[0].trim();
      var words = clause.split(/\s+/);
      if (words.length >= 3 && words.length <= CFG.MUTTER_MAX_WORDS && /^[A-Za-z"']/.test(clause)) v.mutters.push(clause);
    }
    var tf = {};
    for (var j = 0; j < segs.length; j++) (String(segs[j].text || '').toLowerCase().match(/[a-z]{5,}/g) || []).forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
    v.words = Object.keys(tf).sort(function (a, b) { return tf[b] - tf[a]; }).slice(0, CFG.VOICE_WORDS);
  }
  if (s) s._sgVoice = v;
  return v;
}

// ---- frames: many per event, slots filled from live data only --------------------------------------------------
// d = event data; g = register; each frame returns the core sentence (no exclaim/tail - those are appended).
var FRAMES = {
  kill: [
    function (d) { return d.target + ' is scrap' + (d.bounty ? ' - ' + d.bounty + 'c says so' : '') + '.'; },
    function (d) { return 'Splash one. ' + d.target + ' won\'t be back' + (d.bounty ? ', and the ' + d.bounty + 'c is mine' : '') + '.'; },
    function (d) { return 'That was ' + d.target + '. Was.'; },
    function (d) { return d.target + ' came apart clean' + (d.bounty ? ' - collecting ' + d.bounty + 'c' : '') + '.'; },
    function (d) { return 'Guns answered ' + d.target + '. Argument over.'; },
    function (d) { return 'One less: ' + d.target + (d.bounty ? '. Bounty ' + d.bounty + 'c, paid in full' : '') + '.'; },
    function (d) { return d.target + ' flew at me. ' + d.target + ' stopped flying.'; },
    function (d) { return 'Confirm the kill on ' + d.target + (d.bounty ? ' - ' + d.bounty + 'c on the ledger' : '') + '.'; },
  ],
  die: [
    function () { return 'Hull\'s gone - punching out!'; },
    function () { return 'She\'s breaking up... ejecting.'; },
    function () { return 'That\'s my ship in pieces. Out, out, out.'; },
    function () { return 'Losing her - canopy away!'; },
    function () { return 'Structure\'s failing. This is me leaving.'; },
    function () { return 'Fire everywhere - I\'m gone.'; },
  ],
  respawn: [
    function (d) { return d.friendly ? 'Back in a fresh hull - friendly stars overhead.' : 'New hull, same pilot. Back in.'; },
    function (d) { return 'Requisitioned a replacement. Flying again.'; },
    function (d) { return d.friendly ? 'Home lanes. Re-launching.' : 'Wherever this is, I\'m airborne again.'; },
    function () { return 'You don\'t stay down. Back on the stick.'; },
  ],
  engage: [
    function (d) { return 'Engaging ' + d.target + ' - ' + d.dist + 'u and closing.'; },
    function (d) { return d.target + ' at ' + d.dist + 'u. Guns hot.'; },
    function (d) { return 'Turning into ' + d.target + '. This gets loud in ' + d.dist + 'u.'; },
    function (d) { return 'Got ' + d.target + ' on the nose. Closing.'; },
    function (d) { return 'Range ' + d.dist + 'u to ' + d.target + ' - committing.'; },
  ],
  escort: [
    function (d) { return 'On ' + d.target + '\'s wing, holding formation.'; },
    function (d) { return 'Shadowing ' + d.target + '. Nothing touches them.'; },
    function (d) { return d.target + ' flies, I follow. That\'s the job.'; },
    function (d) { return 'Keeping station off ' + d.target + '\'s stern.'; },
  ],
  evade: [
    function (d) { return 'Hull at ' + d.hp + '% - breaking off!'; },
    function (d) { return d.hp + '% and dropping. Rolling out of the fight.'; },
    function (d) { return 'Too much fire - disengaging at ' + d.hp + '%.'; },
    function (d) { return 'She won\'t take more. Running.'; },
  ],
  mine: [
    function (d) { return 'Rock at ' + d.dist + 'u. Cutting lines.'; },
    function (d) { return 'Working the rock - ' + d.dist + 'u out.'; },
    function (d) { return 'Ore doesn\'t shoot back. ' + d.dist + 'u to the seam.'; },
  ],
  collect: [
    function (d) { return 'Salvage ahead, ' + d.credits + 'c worth. Scooping.'; },
    function (d) { return d.credits + 'c drifting free? Not for long.'; },
    function (d) { return 'Banking for the pickup - ' + d.credits + 'c.'; },
  ],
  hold: [
    function () { return 'Holding here. Throttle to zero.'; },
    function () { return 'Station kept. Watching the black.'; },
    function () { return 'Parked and listening.'; },
  ],
  scan: [
    function () { return 'Sweeping the lane. Quiet so far.'; },
    function () { return 'Nothing on the scope but dust.'; },
    function () { return 'Long watch. Keeping the throttle warm.'; },
    function () { return 'Sky\'s empty. I don\'t trust it.'; },
  ],
  scramble: [
    function (d) { return d.place + ' called - I answer. Intercepting.'; },
    function (d) { return 'Defense contract for ' + d.place + '. Somebody picked the wrong world.'; },
    function (d) { return 'Launching for ' + d.place + '. Hold the line down there.'; },
  ],
  wing_hire: [
    function (d) { return 'On your wing, ' + d.leader + '. Point me at something.'; },
    function (d) { return 'Contract\'s signed, ' + d.leader + '. Your fight is my fight.'; },
    function (d) { return 'You lead, ' + d.leader + ', I cover. Simple.'; },
  ],
  wing_quit: [
    function () { return 'No pay, no wing. I fly my own lane.'; },
    function () { return 'Ledger says we\'re done. Good hunting without me.'; },
    function () { return 'A contract\'s a contract - and this one just lapsed.'; },
  ],
  wing_dismiss: [
    function () { return 'Contract closed. Good hunting.'; },
    function () { return 'Wing\'s dissolved, clean books. See you on the band.'; },
    function () { return 'Off your wing, no hard feelings.'; },
  ],
  bc_help: [
    function (d) { return 'Taking fire' + (d.target ? ' from ' + d.target : '') + ' - converge on me!'; },
    function (d) { return 'I\'m in trouble here' + (d.target ? ', ' + d.target + ' on my tail' : '') + ' - anyone close, turn in!'; },
    function (d) { return 'Hull\'s opening up' + (d.target ? ' - ' + d.target + ' has me boxed' : '') + '. Assistance, now!'; },
  ],
  bc_threat: [
    function (d) { return 'Contact - marauder near ' + d.place + '.'; },
    function (d) { return 'Eyes up: hostile signature by ' + d.place + '.'; },
    function (d) { return d.place + ' lane has teeth tonight - hostile inbound.'; },
  ],
  bc_tally: [
    function (d) { return 'Engaging ' + d.target + ' - form on me!'; },
    function (d) { return 'Tally ' + d.target + '. Pack up, hit together!'; },
    function (d) { return d.target + ' is the mark - converge and finish it!'; },
  ],
  trade_buy: [
    function (d) { return 'Bought ' + d.qty + ' ' + d.good + ' at ' + d.place + ' - ' + d.price + 'c a unit.'; },
    function (d) { return d.place + ' sells cheap: ' + d.qty + ' ' + d.good + ' aboard.'; },
    function (d) { return 'Hold\'s heavier - ' + d.qty + ' ' + d.good + ' out of ' + d.place + '.'; },
  ],
  trade_sell: [
    function (d) { return 'Sold the ' + d.good + ' at ' + d.place + ' - +' + d.credits + 'c.'; },
    function (d) { return d.place + ' pays: ' + d.credits + 'c for the ' + d.good + '.'; },
    function (d) { return 'Cargo\'s theirs, ' + d.credits + 'c is mine. ' + d.place + ' does business.'; },
  ],
  refuel: [
    function (d) { return 'Topped off at ' + d.place + ' - +' + d.amt + ' gas.'; },
    function (d) { return d.place + ' fuel line\'s slow, but the tanks are full.'; },
  ],
  loot: [
    function (d) { return 'Looted ' + d.qty + ' ' + d.good + ' - worth ' + d.credits + 'c to the right buyer.'; },
    function (d) { return 'Wreck gave up ' + d.qty + ' ' + d.good + '. +' + d.credits + 'c.'; },
  ],
  scoop: [
    function (d) { return 'Scooped ' + d.qty + ' ' + d.good + ' of drifting salvage.'; },
    function (d) { return d.qty + ' ' + d.good + ', free-floating. Mine now.'; },
  ],
  upgrade: [
    function (d) { return d.what + ' to Lv' + d.lvl + ' - ' + d.credits + 'c left in the wallet.'; },
    function (d) { return 'Yard work done: ' + d.what + ' Lv' + d.lvl + '.'; },
    function (d) { return 'She hits harder now - ' + d.what + ' Lv' + d.lvl + '.'; },
  ],
};

// ---- assembly ---------------------------------------------------------------------------------------------------
function scrub(t) { return String(t).replace(/—|–/g, ' - ').replace(/\s+/g, ' ').trim(); }
function assemble(s, event, d) {
  var frames = FRAMES[event]; if (!frames) return null;
  var g = registerOf(s);
  var core = pick(frames)(d || {});
  var line = core;
  if (chance(CFG.P_EXCLAIM)) line = pick(EXCLAIM[g]) + ' ' + line;
  if (chance(CFG.P_TAIL)) line = line.replace(/\.$/, '') + ' - ' + pick(TAIL[g]) + '.';
  // canon mutter: only on low-stakes ambience (hold/scan/escort/mine), a verbatim clause of THEIR OWN novel text
  if ((event === 'hold' || event === 'scan' || event === 'escort' || event === 'mine') && chance(CFG.P_MUTTER)) {
    var v = voiceOf(s);
    if (v.mutters.length) line += ' …"' + pick(v.mutters) + '"';
  }
  return scrub(line);
}
function line(s, event, d) {
  var out = assemble(s, event, d); if (out == null) return null;
  if (s) {
    s._sgRecent = s._sgRecent || [];
    var tries = 0;
    while (s._sgRecent.indexOf(out) >= 0 && tries++ < CFG.REROLL_TRIES) out = assemble(s, event, d);
    s._sgRecent.push(out); if (s._sgRecent.length > CFG.RECENT_RING) s._sgRecent.shift();
  }
  return out;
}

var API = { line: line, registerOf: registerOf, voiceOf: voiceOf, CFG: CFG, _frames: Object.keys(FRAMES) };
if (typeof window !== 'undefined') window.SPEECHGEN = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- self-test (node) -------------------------------------------------------------------------------------------
if (typeof require !== 'undefined' && require.main === module) {
  var pass = 0, fail = 0;
  function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }
  global.window = { novelSegOf: function (name) {
    return name === 'VEGA' ? [{ text: 'The lanes remember every debt we owe them.' }, { text: 'Quiet hands fly the longest routes, she said once.' }] : null; } };
  var S = require('./speech_gen.js');
  var hot = { name: 'KAINE', backstory: 'a fearless raider who hunts the blockade lanes' };
  var soft = { name: 'VEGA', backstory: 'a weary poet and sometime medic of the long routes' };
  check('registers derive from backstory (hot/soft)', S.registerOf(hot) === 'hot' && S.registerOf(soft) === 'soft');
  // variety: 60 kill lines -> many distinct
  var seen = new Set(); for (var i = 0; i < 60; i++) seen.add(S.line(hot, 'kill', { target: 'MOROS', bounty: 36 }));
  console.log('  distinct kill lines in 60 draws: ' + seen.size);
  check('creativity: >=20 distinct lines from 60 draws of one event', seen.size >= 20);
  check('grounding: every kill line names the real target', [...seen].every(function (l) { return l.indexOf('MOROS') >= 0; }));
  // no em-dash anywhere across events
  var clean = true;
  S._frames.forEach(function (ev) { for (var k = 0; k < 30; k++) { var l = S.line(soft, ev, { target: 'X', bounty: 5, dist: 40, hp: 22, credits: 12, place: 'Cydon', leader: 'YOU', qty: 3, good: 'ore', price: 14, amt: 20, what: 'LASERS', lvl: 3, friendly: true }); if (l && /—|–/.test(l)) clean = false; } });
  check('style law: zero em-dashes across all events x 30 draws', clean);
  // anti-repeat ring: consecutive identical lines are rare
  var dup = 0, prev = null; for (var j2 = 0; j2 < 40; j2++) { var l2 = S.line(hot, 'die', {}); if (l2 === prev) dup++; prev = l2; }
  check('anti-repeat: consecutive duplicates rare (' + dup + '/40)', dup <= 4);
  // canon mutter appears sometimes on ambience, quoting VEGA's own novel text verbatim
  var muttered = false; for (var m = 0; m < 200; m++) { var lm = S.line(soft, 'scan', {}); if (lm.indexOf('lanes remember') >= 0 || lm.indexOf('Quiet hands') >= 0) { muttered = true; break; } }
  check('voice: canon mutter surfaces their OWN novel words on ambience', muttered);
  check('unknown events return null (callers fall back)', S.line(hot, 'no_such_event', {}) === null);
  console.log('---'); console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
  console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
  if (fail > 0) process.exit(1);
}
})();
