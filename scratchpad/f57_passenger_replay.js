// f57_passenger_replay.js - settles genre cell F57 "an AI companion comments unprompted on the
// player's situation." The Passenger (passenger.js) advises UNPROMPTED by default (S.advice_on=true
// :89) and reacts to the player's situation via onEvent :138 (docked/damaged/kill_seen). Its
// distinctive twist is an ANGER MACHINE (noteAdvice :107-118): re-speaking the same urgent advice
// (the pilot hasn't acted) escalates the mood one tier every 2 repeats across 4 tiers and shocks the
// screen (PARASITE_SHOCK) scaled by the tier; a cleared condition drops it to calm with an 'obeyed'
// line. This replay slices the real moodTier/noteAdvice and drives that escalate/calm cycle.
// (passenger.js is a browser module - "window is not defined" on require - so the logic is sliced.)
const fs = require('fs');
const path = require('path');
const P = fs.readFileSync(path.join(__dirname, '..', 'passenger.js'), 'utf8');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = P.split(/\r?\n/);

// slice moodTier/pickLine/fill/voicePrefix (99-102) + noteAdvice (107-118)
const src = lines.slice(98, 102).join('\n') + '\n' + lines.slice(106, 119).join('\n');
if (!/function noteAdvice/.test(src) || !/function moodTier/.test(src)) { console.error('FAIL: passenger slice moved'); process.exit(2); }
const S = { mood: { level: 0, key: null, count: 0, ignored: 0 } };
const VOICE = {
  moods: [ { name: 'Calm', prefix: [''], ignored: ['{advice_short}'], shock: 0 },
           { name: 'Uneasy', prefix: ['tsk. '], ignored: ['{advice_short}, or we both die.'], shock: 0.25 },
           { name: 'Angry', prefix: ['listen: '], ignored: ['{advice_short}! ({ignored} times now)'], shock: 0.6 },
           { name: 'Furious', prefix: ['LISTEN: '], ignored: ['{advice_short}!! hull {hull_pct}%'], shock: 1.0 } ],
  obeyed: ['Good. We live another minute.'], answered: {} };
const save = () => {};
const M = new Function('S', 'VOICE', 'save', src + '\n;return { noteAdvice, moodTier };')(S, VOICE, save);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F57 passenger replay - real moodTier/noteAdvice sliced from passenger.js\n');

// UNPROMPTED (code read): advice on by default, reacts to game events
ok('advises UNPROMPTED by default (S.advice_on=true, "the worm advises by default")', /advice_on=true/.test(P) && /the worm advises by default/.test(P));
ok('reacts to the player\'s SITUATION via onEvent (docked/damaged/kill_seen)', /function onEvent/.test(P) && /PASSENGER\.onEvent\('(docked|damaged|kill_seen)'/.test(IDX));

// ANGER MACHINE: re-speaking the same ignored advice escalates the mood across tiers
const adv = { key: 'flee', urgency: 2, text: 'Break off and flee the pirate.' };
const tgt = { hull: 40, maxHull: 100 };
const levels = [];
for (let i = 0; i < 8; i++) { const r = M.noteAdvice(adv, tgt); levels.push(S.mood.level); }
console.log('  mood.level after each repeat of the same ignored advice: [' + levels.join(', ') + ']');
ok('ignoring the SAME advice escalates the mood 0 -> 1 -> 2 -> 3 (every 2 repeats)', levels[0] === 0 && Math.max(...levels) === 3 && levels[levels.length - 1] === 3);
ok('the mood CAPS at tier 3 (does not run away)', levels.every(l => l <= 3));
const angry = M.noteAdvice(adv, tgt);   // still furious
ok('at an angry tier noteAdvice returns a shock + text for the host to apply', angry && angry.level >= 1 && typeof angry.shock === 'number' && angry.shock > 0 && !!angry.text);

// CALM when obeyed: a cleared condition (null) drops to calm with an 'obeyed' line
const cleared = M.noteAdvice(null, tgt);
console.log('  after the condition clears: mood.level=' + S.mood.level + ', obeyed line=' + (cleared && cleared.obeyed ? '"' + cleared.text + '"' : 'none'));
ok('a cleared condition CALMS to level 0 with an "obeyed" line', S.mood.level === 0 && cleared && cleared.obeyed === true && !!cleared.text);

// a DIFFERENT advice key resets the repeat counter (not an instant escalation)
S.mood = { level: 0, key: null, count: 0, ignored: 0 };
M.noteAdvice({ key: 'refuel', urgency: 2, text: 'Refuel.' }, tgt);
ok('a new advice key starts fresh at calm (count reset, no instant anger)', S.mood.level === 0 && S.mood.key === 'refuel');

// the shock scales by the mood tier (code read)
ok('the screen shock (PARASITE_SHOCK) scales by the mood tier', /PARASITE_SHOCK/.test(IDX) && /scaled by the mood tier/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F57 yes: the Passenger advises UNPROMPTED, reacts to the player\'s situation, and escalates across 4 mood tiers when ignored (with a screen shock) then calms when obeyed'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
