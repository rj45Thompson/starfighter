// f66_voice_replay.js - settles genre cell F66 "NPC dialogue is voiced" (anchor: genre_matrix seed
// "PARTLY: speech in and voice out paths present, audio itself unverified"). Verdict: PARTIAL, and this
// 2nd independent read CONFIRMS partial with a sharper reason than the seed: the voice is SYNTHETIC browser
// TTS (Web Speech speechSynthesis), DEFAULT OFF (opt-in), with NO recorded voice acting - so it is "voiced"
// but not authored VO, the textbook partial. Not a mis-grade (voice-out clearly exists -> not "no"; it is
// synthetic + opt-in + no recorded VO -> not "yes").
//   VOICE-OUT: chatter.js speakText (:186) -> new SpeechSynthesisUtterance -> SS.speak, per-pilot rate/pitch
//     from voiceParams (:169), serialized queue (QUEUE_MAX drop, one utterance at a time). voiceSay = pilots,
//     voiceWorm = the Passenger; the game calls them on kills/advice. DEFAULT_ON:false (opt-in `voices on`/🔊).
//   VOICE-IN: speech_input.js - browser SpeechRecognition (STT) so the player can TALK to the Passenger.
//   NO RECORDED VO: 0 voice/dialogue audio files - the audio assets are sound EFFECTS + music, not speech.
// voiceParams is pure + deterministic, so this SLICES it (+ hash32/clampR) from chatter.js and drives it.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CH = fs.readFileSync(path.join(ROOT, 'chatter.js'), 'utf8');
const chLines = CH.split(/\r?\n/);

// slice hash32(166) + clampR(167) + voiceParams(169-183); provide the REAL VOICE_CFG values + VP=null
const src = chLines.slice(165, 183).join('\n');
if (!/function voiceParams\(name,temper\)/.test(src) || !/function hash32\(str\)/.test(src)) { console.error('FAIL: chatter voiceParams slice moved'); process.exit(2); }
const VOICE_CFG = { DEFAULT_ON: false, QUEUE_MAX: 6, RATE_MIN: 0.72, RATE_MAX: 1.35, PITCH_MIN: 0.55, PITCH_MAX: 1.65, BASE_RATE: 1.0, BASE_PITCH: 1.0, WORDS_MID: 14, RATE_PER_WORD: 0.02, RATE_PER_DASH: -0.3, PITCH_PER_QRATE: 0.5, PITCH_JITTER: 0.3, WORM_NAME: 'PASSENGER', WORM_RATE: 0.78, WORM_PITCH: 0.5, VOLUME: 1.0 };
const M = new Function('VOICE_CFG', 'VP', src + '\n;return { voiceParams, hash32 };')(VOICE_CFG, null);

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };
const inRange = (v, lo, hi) => v >= lo && v <= hi;

console.log('F66 voice replay - real voiceParams sliced from chatter.js + TTS/STT/no-VO wiring\n');

// (1) the Passenger (WORM) has a fixed, distinctly low+slow voice
const worm = M.voiceParams('PASSENGER');
ok('the Passenger has a fixed low+slow voice (rate 0.78, pitch 0.5, src worm)', worm.rate === 0.78 && worm.pitch === 0.5 && worm.src === 'worm');

// (2) per-pilot voices are DETERMINISTIC and DISTINCT, clamped to the configured range
const names = ['Vega', 'Halcyon', 'Kestrel', 'Orion', 'Marrow', 'Dax'];
const params = names.map(n => M.voiceParams(n, ''));
console.log('  pilot voices: ' + names.map((n, i) => `${n}=${params[i].rate}/${params[i].pitch}`).join('  '));
ok('voiceParams is DETERMINISTIC (same name -> same voice)', JSON.stringify(M.voiceParams('Vega', '')) === JSON.stringify(M.voiceParams('Vega', '')));
ok('distinct pilots get DISTINCT voices (per-pilot, not one flat TTS voice)', new Set(params.map(p => p.rate + '/' + p.pitch)).size >= 5);
ok('every derived rate is within the hard clamp [0.72, 1.35]', params.every(p => inRange(p.rate, VOICE_CFG.RATE_MIN, VOICE_CFG.RATE_MAX)));
ok('every derived pitch is within the hard clamp [0.55, 1.65]', params.every(p => inRange(p.pitch, VOICE_CFG.PITCH_MIN, VOICE_CFG.PITCH_MAX)));
ok('the params come from the temperament hash (no voiceprint blob here)', params.every(p => p.src === 'temperament-hash'));

// (3) structural: the TTS voice-OUT path
ok('VOICE-OUT is browser TTS: speakText -> new SpeechSynthesisUtterance -> SS.speak', /function speakText\(name,text,params,force,cb\)/.test(CH) && /new SpeechSynthesisUtterance\(/.test(CH) && /SS\.speak\(u\)/.test(CH));
ok('DEFAULT OFF (opt-in): DEFAULT_ON:false + speakText returns false unless voicesOn/force', /DEFAULT_ON:false/.test(CH) && /if\(!voicesOn&&!force\)\{ if\(cb\) cb\(\); return false; \}/.test(CH));
ok('serialized queue: QUEUE_MAX drop + one utterance at a time (onend -> pump next)', /if\(SQ\.length>=VOICE_CFG\.QUEUE_MAX\)/.test(CH) && /u\.onend=fin/.test(CH) && /SERIALIZED/.test(CH));
ok('pilots (voiceSay) + the Passenger (voiceWorm) are the voiced speakers', /function voiceSay\(s,text\)/.test(CH) && /function voiceWorm\(html,cb\)/.test(CH));

// (4) structural: the game actually speaks NPC/Passenger lines, and there is a speech-IN path
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok('the game speaks lines aloud on events (e.g. the Passenger on a kill / advice)', /CHATTER\.voiceWorm\(/.test(IDX));
ok('VOICE-IN exists: speech_input.js uses browser SpeechRecognition (STT) to talk back', fs.existsSync(path.join(ROOT, 'speech_input.js')) && /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/.test(fs.readFileSync(path.join(ROOT, 'speech_input.js'), 'utf8')));

// (5) the "partial not yes" basis: NO recorded voice acting - it is synthetic TTS only
const files = ['index.html', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !new Set(['three.min.js', 'fflate.min.js', 'fbxloader.js']).has(f))];
const voFiles = [];
for (const f of files) { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = t.match(/['"][^'"]*\.(ogg|mp3|wav|m4a)['"]/gi) || []; m.forEach(x => { if (/voice|dialog|vo[_-]|speech|spoken|line[_-]\d/i.test(x)) voFiles.push(f + ':' + x); }); }
console.log('  recorded voice/dialogue audio files referenced: ' + (voFiles.length ? voFiles.join(', ') : 'none'));
ok('NO recorded voice-acting audio files (so "voiced" = synthetic TTS -> PARTIAL, not yes)', voFiles.length === 0);

console.log('\nRESULT: ' + (pass
  ? 'PASS - F66 PARTIAL: NPC/pilot/Passenger dialogue IS voiced via synthetic browser TTS (speechSynthesis, per-pilot deterministic rate/pitch, serialized, default-off opt-in) + a speech-IN path, but there is NO recorded voice acting - confirms the seed grade to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
