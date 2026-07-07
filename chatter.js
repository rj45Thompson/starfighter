// chatter.js - N4 AUDIBLE CHATTER (NOVEL_SOCIETY pillar N4): the radio band comes alive + the pilots get VOICES.
// Two subsystems, one module (lane B owns this file; loaded as a plain <script src> global AFTER gamemod.js, BEFORE
// the main game script - every game symbol below (ships/say/loreIndex/loreSpeak/novelSegOf/...) is referenced only
// at CALL time from tick()/onEvent()/command handlers, long after the main script has parsed. Same load-order
// contract as speech_tier.js / inhabitant.js).
//
// 1. CHATTER - ambient + event radio lines. Pilots that carry a NOVEL SEGMENT occasionally speak IN CHARACTER:
//    retrieval over their OWN segment picks the fact (the same loreIndex/loreQVec/loreCos machinery the ask path
//    uses - the knowledge law survives verbatim: a pilot's chatter can only draw on ITS OWN segment docs), the
//    speech tier voices it (loreSpeak → lorePersona's EXTREME register + grounding post-check), and when the
//    sidecar is down the composer fallback emits the retrieved sentence VERBATIM (0-fab by construction).
//    Event lines (kill_seen / docked / damaged) are grounded in the LIVE event (an authored template carrying the
//    real names/numbers - same honesty class as the existing ACK/replyChatter canned lines + loreLiveDocs live
//    facts) plus a segment sentence when one matches. Lines land in the RADIO tab via say(); the worm's
//    parasiteRoute replies stay PARASITE (this module never routes passenger text).
//    SERIALIZED QUEUE + RATE CAP: at most ONE line per CHATTER_PERIOD_S sim-seconds, MAX_QUEUE pending events
//    (oldest dropped), one speech-tier call in flight at a time - no spam; ambient fills every idle slot
//    round-robin over eligible pilots - no starvation.
// 2. VOICES - browser speechSynthesis, DEFAULT OFF (the user opts in with `voices on`). Per-pilot rate/pitch
//    seeded from the BAKED voiceprint stats (voiceprints.json - `node voiceprint_vec.js > voiceprints.json`;
//    fetched soft-fail like NOVELDATA) where a character is modeled, else a deterministic temperament hash.
//    THE WORM (the Passenger) gets a distinct LOW/SLOW voice; its paraLine replies speak too when voices are on.
//    One utterance at a time (queue serialized); `voices off` cancels mid-word and clears the queue.
// HONESTY LEDGER: GIVEN = the event/ambient line templates + voiceprint→rate/pitch mapping constants (authored,
// labeled); everything SPOKEN as content is the pilot's own segment/corpus (canon) or live game state. No new
// facts are minted here; the loreSpeak grounding guard applies unchanged on the LLM tier.
'use strict';
(function(){
// ---- CONFIG (every tunable named - no magic numbers in logic) --------------------------------------------------
const CHATTER_CFG={
  CHATTER_PERIOD_S:14,     // RATE CAP: at most one radio line per this many sim-seconds (N4 "no spam")
  MAX_QUEUE:4,             // pending event jobs beyond this DROP OLDEST (freshest events win; never a backlog dump)
  START_DELAY_S:8,         // sim-seconds after boot before the band opens (lets NOVELDATA/roster fetches land)
  EVENT_COOLDOWN_S:20,     // per-event-TYPE cooldown - a bullet-storm can't flood the queue with 'damaged' jobs
  AMBIENT_SEG_FACTS:2,     // segment sentences retrieved per ambient line
  EVENT_SEG_FACTS:1,       // segment sentences accompanying an event line
  LINE_MAX_CHARS:200,      // radio line hard cap (keeps bubbles + utterances sane)
};
const VOICE_CFG={
  DEFAULT_ON:false,        // DEFAULT OFF - the user opts in with `voices on` (mission contract)
  QUEUE_MAX:6,             // pending utterances beyond this are dropped (the ear can only take so much)
  UTTER_TIMEOUT_MS:14000,  // belt: engines that never fire onend/onerror must not deadlock the queue
  RATE_MIN:0.72, RATE_MAX:1.35, PITCH_MIN:0.55, PITCH_MAX:1.65,   // hard clamps on any derived voice
  BASE_RATE:1.0, BASE_PITCH:1.0,
  WORDS_MID:14,            // voiceprint avg_words_per_line pivot: longer-winded characters read slightly faster
  RATE_PER_WORD:0.02,      // rate delta per word of avg line length away from WORDS_MID
  RATE_PER_DASH:-0.3,      // dash-habit (pauses mid-line) slows the voice
  PITCH_PER_QRATE:0.5,     // question-rate lifts pitch (askers sit higher)
  PITCH_JITTER:0.3,        // deterministic per-name jitter band so modeled voices don't collapse together
  WORM_NAME:'PASSENGER', WORM_RATE:0.78, WORM_PITCH:0.5,   // the symbiont: distinctly LOW and SLOW
  VOLUME:1.0,
};

// ---- module state ----------------------------------------------------------------------------------------------
let clock=0, boot=0, busy=false, rr=0, nEmit=0, last=null;
const Q=[];                       // pending chatter jobs {kind,s,query,eventFacts,liveFact,question}
const SAID={};                    // per-pilot chatter said-set (doc ids) - separate from the ask path's st.said
const lastEvT={};                 // per-event-type sim-clock of last accepted job (EVENT_COOLDOWN_S)
let simT=0;                       // our own sim clock (fed by tick dt - headless pump drives it)

// VOICEPRINTS: baked stylometry stats (voiceprint_vec.js output saved to voiceprints.json). Soft-fail like
// NOVELDATA: absent file → every pilot uses the temperament hash; nothing else changes.
let VP=null;
try{ fetch('./voiceprints.json').then(r=>r.ok?r.json():null).then(j=>{ VP=(j&&(j.voiceprints||null))||null;
  if(VP) console.log(`VOICEPRINTS loaded: ${Object.keys(VP).length} modeled characters (voiceprint_vec bake) - speech rate/pitch seeded from novel-dialogue stats; unmodeled pilots hash their temperament`); }).catch(()=>{}); }catch(e){}

// ---- eligibility + retrieval (REUSES the ask-path machinery - nothing re-implemented) ---------------------------
function segOf(name){ return (typeof novelSegOf==='function')?novelSegOf(name):null; }
function eligible(){ if(typeof ships==='undefined'||!Array.isArray(ships)) return [];
  return ships.filter(s=>s&&s.alive&&s.role!=='player'&&(segOf(s.name)||[]).length); }
function nearestTo(list,pos){ if(!list.length) return null; if(!pos) return list[0];
  let best=null,bd=Infinity; for(const s of list){ const d=s.pos.distanceTo(pos); if(d<bd){ bd=d; best=s; } } return best; }
// retrieval over the pilot's OWN segment: score its novel docs against a state/event query (loreQVec/loreCos - the ask path's exact scorer); zero-overlap falls back to unsaid-rotation in ord order (variety, no starvation).
function pickSegDocs(s,queryText,n){
  if(typeof loreIndex!=='function') return null;
  const idx=loreIndex(s); if(!idx) return null;
  const said=SAID[s.name]||(SAID[s.name]=new Set());
  let seg=idx.docs.filter(d=>d.src==='novel'&&!said.has(d.id));
  if(!seg.length){ said.clear(); seg=idx.docs.filter(d=>d.src==='novel'); }   // segment exhausted → recycle
  if(!seg.length) return {idx,picks:[]};
  const qv=loreQVec(loreToks(String(queryText||'')),[],idx);
  const scored=seg.map(d=>({d,sc:loreCos(qv,d,idx)})).sort((a,b)=>(b.sc-a.sc)||(a.d.ord-b.d.ord));
  return {idx,picks:scored.slice(0,Math.max(1,n|0)).map(x=>x.d)};
}
// live-state line (same honesty class as loreLiveDocs): a FACT fed to the voicer, derived from real ship state.
function liveLine(s){ const b=s.brain||{};
  const np=(typeof nearestPlanet==='function')?nearestPlanet(s.pos):null;
  return `Right now I am ${b.mode?('on '+String(b.mode).toLowerCase()):'flying the lanes'}`
    +((b.target&&b.target.name)?(' tracking '+b.target.name):'')
    +(np?(' near '+np.name):'')
    +`, hull ${Math.round(s.hp)} of ${Math.round(s.maxHp)}.`; }
function stateQuery(s){ const b=s.brain||{}; const bits=[];
  if(b.mode) bits.push(String(b.mode).toLowerCase());
  if(b.target&&b.target.name) bits.push(b.target.name);
  const np=(typeof nearestPlanet==='function')?nearestPlanet(s.pos):null; if(np) bits.push(np.name);
  if(s.hp<s.maxHp*0.5) bits.push('hull hit burn');
  return bits.join(' '); }

// ---- the serialized queue --------------------------------------------------------------------------------------
function makeAmbient(){ const el=eligible(); if(!el.length) return null;
  const s=el[(rr++)%el.length];
  return { kind:'ambient', s, query:stateQuery(s), liveFact:liveLine(s), eventFacts:[],
    question:'Say one short line of open-band radio chatter that fits who you are and what you are doing right now.' }; }
function onEvent(type,data){ data=data||{};
  const el=eligible(); if(!el.length) return;
  if(lastEvT[type]!=null && (simT-lastEvT[type])<CHATTER_CFG.EVENT_COOLDOWN_S) return;   // per-type cooldown
  const player=(typeof ships!=='undefined')?ships[0]:null;
  let s=null, fact='', query='';
  if(type==='kill_seen'){
    const v=data.victim, k=data.killer; if(!v) return;
    const wit=el.filter(x=>x!==v&&x!==k);                       // prefer a WITNESS (the killer already has its splash line)
    s=nearestTo(wit.length?wit:el, v.pos);
    if(!s) return;
    fact=`${v.name} just went down${k?(' - '+(k===s?'my guns':k.name+"'s guns")):''}. The whole band heard it.`;
    query='kill guns down burn dead '+v.name+(k?(' '+k.name):'');
  } else if(type==='docked'){
    s=nearestTo(el, player&&player.pos);
    if(!s) return;
    fact=`So YOU dock at ${data.place||'port'}. Every port has eyes.`;
    query='dock port trade market '+(data.place||'');
  } else if(type==='damaged'){
    s=nearestTo(el, player&&player.pos);
    if(!s) return;
    fact=`YOU just took a hit${data.hull!=null?(' - hull reading '+data.hull):''}. The band saw the flash.`;
    query='hit hull damage burn wound';
  } else return;
  lastEvT[type]=simT;
  if(Q.length>=CHATTER_CFG.MAX_QUEUE) Q.shift();                // DROP OLDEST - freshest events win, no backlog dump
  Q.push({ kind:'event:'+type, s, query, eventFacts:[fact], liveFact:null,
    question:`React on the open radio band, in one short line, to this: ${fact}` });
}
async function runJob(job){ busy=true;
  try{
    const s=job.s; if(!s||!s.alive) return;
    const picked=pickSegDocs(s, job.query, job.kind==='ambient'?CHATTER_CFG.AMBIENT_SEG_FACTS:CHATTER_CFG.EVENT_SEG_FACTS);
    const segTexts=picked?picked.picks.map(d=>d.text):[];
    const facts=(job.eventFacts||[]).concat(job.liveFact?[job.liveFact]:[]).concat(segTexts);
    if(!facts.length) return;
    let line=null, tier='composer';
    // TOP tier: the ask path's exact voicer - lorePersona EXTREME register + grounding post-check inside loreSpeak.
    if(picked && typeof TAMI_SPEAK!=='undefined' && TAMI_SPEAK.alive && typeof loreSpeak==='function'){
      try{ const st=(typeof loreState==='function')?loreState(s):{history:[]};
        line=await loreSpeak(s, job.question, facts, st, picked.idx); if(line) tier='qwen'; }catch(e){ line=null; }
    }
    if(!line){ // composer fallback: VERBATIM - the retrieved segment sentence (ambient) / the live event line (event)
      line=(job.kind==='ambient') ? (segTexts[0]||'') : ((job.eventFacts&&job.eventFacts[0])||segTexts[0]||'');
    }
    line=String(line||'').replace(/</g,'&lt;').slice(0,CHATTER_CFG.LINE_MAX_CHARS);
    if(!line) return;
    if(picked&&picked.picks.length) picked.picks.forEach(d=>SAID[s.name].add(d.id));
    if(typeof say==='function') say(s,line);                    // → RADIO tab (+ 3D bubble + voiceSay hook)
    nEmit++; last={pilot:s.name,kind:job.kind,tier,line};
  } finally { busy=false; }
}
function tick(dt){ if(!(dt>0)) return; simT+=dt;
  if(boot<CHATTER_CFG.START_DELAY_S){ boot+=dt; return; }
  clock+=dt;
  if(busy||clock<CHATTER_CFG.CHATTER_PERIOD_S) return;
  const job=Q.shift()||makeAmbient();
  if(!job){ clock=CHATTER_CFG.CHATTER_PERIOD_S; return; }       // nobody eligible yet - retry next tick, cap the clock
  clock=0; runJob(job);
}

// ---- VOICES: speechSynthesis, serialized, per-pilot params ------------------------------------------------------
let voicesOn=VOICE_CFG.DEFAULT_ON, uttering=false; const SQ=[];
function hash32(str){ let h=2166136261>>>0; const t=String(str); for(let i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function clampR(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
// per-pilot voice params: voiceprint stats where modeled (BAKED blob) → deterministic mapping; else temperament hash.
function voiceParams(name,temper){
  if(name===VOICE_CFG.WORM_NAME) return {rate:VOICE_CFG.WORM_RATE,pitch:VOICE_CFG.WORM_PITCH,src:'worm'};
  const vp=VP&&VP[name];
  if(vp&&typeof vp.avg_words_per_line==='number'){
    const rate=clampR(VOICE_CFG.BASE_RATE+(vp.avg_words_per_line-VOICE_CFG.WORDS_MID)*VOICE_CFG.RATE_PER_WORD
      +(vp.dash_rate||0)*VOICE_CFG.RATE_PER_DASH, VOICE_CFG.RATE_MIN, VOICE_CFG.RATE_MAX);
    const pitch=clampR(VOICE_CFG.BASE_PITCH+(vp.question_rate||0)*VOICE_CFG.PITCH_PER_QRATE
      +(((hash32(name)%101)/100)-0.5)*VOICE_CFG.PITCH_JITTER, VOICE_CFG.PITCH_MIN, VOICE_CFG.PITCH_MAX);
    return {rate:+rate.toFixed(2),pitch:+pitch.toFixed(2),src:'voiceprint'};
  }
  const h=hash32(name+'|'+(temper||''));
  return { rate:+(VOICE_CFG.RATE_MIN+((h%1000)/999)*(VOICE_CFG.RATE_MAX-VOICE_CFG.RATE_MIN)).toFixed(2),
    pitch:+(VOICE_CFG.PITCH_MIN+(((h>>>10)%1000)/999)*(VOICE_CFG.PITCH_MAX-VOICE_CFG.PITCH_MIN)).toFixed(2),
    src:'temperament-hash' };
}
function speakText(name,text,params,force){
  if(!voicesOn&&!force) return false;                                  // DEFAULT OFF: zero speechSynthesis traffic until opted in
  const SS=window.speechSynthesis; if(!SS||typeof SpeechSynthesisUtterance==='undefined') return false;
  const plain=String(text||'').replace(/<[^>]*>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/\s+/g,' ').trim().slice(0,CHATTER_CFG.LINE_MAX_CHARS);
  if(!plain) return false;
  if(SQ.length>=VOICE_CFG.QUEUE_MAX) return false;                     // ear saturated - drop, never backlog
  SQ.push({name,plain,params:params||voiceParams(name,'')}); pump(); return true;
}
function pump(){ if(uttering||!SQ.length) return;
  const SS=window.speechSynthesis; if(!SS) { SQ.length=0; return; }
  const job=SQ.shift();
  let u; try{ u=new SpeechSynthesisUtterance(job.plain); }catch(e){ return; }
  u.rate=job.params.rate; u.pitch=job.params.pitch; u.volume=VOICE_CFG.VOLUME;
  try{ const vs=SS.getVoices?SS.getVoices():[];
    if(vs&&vs.length){ const en=vs.filter(v=>/^en/i.test(v.lang||'')); const pool=en.length?en:vs;
      u.voice=pool[hash32(job.name)%pool.length]; } }catch(e){}
  uttering=true; let done=false;
  const fin=()=>{ if(done) return; done=true; uttering=false; pump(); };   // SERIALIZED: next only when this one ends
  u.onend=fin; u.onerror=fin; setTimeout(fin,VOICE_CFG.UTTER_TIMEOUT_MS);  // engines that drop events must not deadlock
  try{ SS.speak(u); }catch(e){ fin(); }
}
function setVoices(v){ voicesOn=!!v;
  if(!voicesOn){ SQ.length=0; uttering=false; try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){} } }
// hooks the game calls (one line each in starfighter.html):
function voiceSay(s,text){ if(!voicesOn||!s) return; speakText(s.name,text,voiceParams(s.name,s.backstory||'')); }
function voiceWorm(html){ if(!voicesOn) return; speakText(VOICE_CFG.WORM_NAME,html,voiceParams(VOICE_CFG.WORM_NAME)); }
// `voice test <pilot>` - an explicit user action counts as opt-in for that single utterance (force), even when off.
function voiceTest(shipOrName){
  let name=null, temper='', text='';
  if(shipOrName&&typeof shipOrName==='object'){ name=shipOrName.name; temper=shipOrName.backstory||'';
    const seg=segOf(name); text=(seg&&seg[0]&&seg[0].text)||temper||(name+' on the band. Voice check.'); }
  else if(shipOrName) name=String(shipOrName).toUpperCase();
  if(!name||/^(WORM|PASSENGER|PARASITE)$/.test(name)){ name=VOICE_CFG.WORM_NAME;
    text=(window.PASSENGER&&PASSENGER.LORE&&PASSENGER.LORE[0])||'I am here. I am always here.'; }
  if(!text){ const seg=segOf(name); text=(seg&&seg[0]&&seg[0].text)||(name+' on the band. Voice check.'); }
  const p=voiceParams(name,temper);
  const spoke=speakText(name,text,p,true);
  return {name,params:p,text,spoke};
}
function status(){ return { voicesOn, voiceprints:!!VP, voiceprintNames:VP?Object.keys(VP):[],
  queue:Q.length, speechQueue:SQ.length, uttering, emitted:nEmit, last,
  period_s:CHATTER_CFG.CHATTER_PERIOD_S, max_queue:CHATTER_CFG.MAX_QUEUE, eligible:eligible().length }; }

window.CHATTER={ CHATTER_CFG, VOICE_CFG, tick, onEvent, setVoices, voicesOn:()=>voicesOn,
  voiceSay, voiceWorm, voiceTest, voiceParams, status, _queue:()=>Q.map(j=>({kind:j.kind,pilot:j.s&&j.s.name})) };
})();
