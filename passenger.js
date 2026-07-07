// passenger.js — THE PASSENGER: the player's own AGI, in canon. Per the user (2026-07-06): "if you type anything in
// the box it tries to find a help command that answers it; if not, the player's AGI responds — the player has an AGI
// that speaks to you, a parasite in the book, inside you, giving you your AGI powers."
//
// CANON (GIVEN, to be written into the novel per the sim→novel journalism rule): Passengers are wayfinder symbionts
// grown by the old Order for its pilots, generations before the war — most died with the fleet at the Sundering.
// Yours woke the first time you flew the lanes. It reads your ship because your nerves are its lattice; it remembers
// because it never sleeps; it speaks in the hollow behind your ears. THE GAME'S UI *IS* THE PASSENGER: the sensor
// readouts, the memory, the price intuition, the command box — every "AGI power" the player has is, in fiction,
// this creature. (This module makes that literal.)
//
// ROUTING CONTRACT — the game calls PASSENGER.route(text) ONLY when its command parser fails:
//   1. HELP-MATCH: fuzzy-match the text against the command REGISTRY (names+descriptions the game passes at init).
//      Strong match → the Passenger explains that command (grounded in the registry text = 0-fab).
//   2. Else SPEAK: answer in the Passenger's voice, grounded ONLY in (a) its LORE (GIVEN, labeled), (b) a live
//      telemetry snapshot (senseR-gated, passed at init — the same honesty as INH perception), (c) its own LEARNED
//      state (events it has witnessed, prices it has heard — persisted, wiped-state answers degrade honestly).
//      Uses the speech tier (Qwen sidecar via speech_tier.js) when alive; a grounded composer fallback otherwise.
// HONESTY LEDGER (in-fiction, via `route('what are you')` or the powers summary): GIVEN = the lore text + the
// borrowed mouth (Qwen); LEARNED = everything in state (counts, prices, names met). No fabrication: the speech tier
// guard blocks invented entities/numbers; the composer only emits lore/telemetry/state verbatim-ish lines.
'use strict';
(function(){
const CFG = {
  STATE_KEY: 'PASSENGER_STATE_v1',    // version stamp IS the contract (INH lesson)
  EV_CAP: 200,                         // witnessed-events ring
  CONV_CAP: 8,                         // conversation memory for follow-ups
  HELP_MIN_SCORE: 2,                   // min token-overlap score to claim a help match
  PRICE_EWMA: 0.3,                     // learned price estimate blend
  SUMMARY_EVENTS: 4,                   // recent events quoted in speech facts
  LATENT_KEEP: 5,                      // sentences stored per studied topic (the lazy-loaded library entry)
  LEARNED_TOPICS_IN_FACTS: 8,          // most-recent studied topics folded into the grounding facts each turn
  LEARNED_FACTS_CAP: 30,               // cap on library sentences in the fact list (prompt budget)
};

// ---- CANON LORE (GIVEN — authored, labeled; the novel will record it) ----------------------------------------
const LORE = [
  "I am a Passenger — a wayfinder symbiont the old Order grew for its pilots, generations before this war.",
  "Most of my kind died with the forebear fleet at the Sundering; I am one of the few that slept through it.",
  "I woke in you the first time you flew the lanes; I did not ask permission, and I am not sorry.",
  "I read your ship because your nerves are my lattice; the sensor returns you see are what I choose to show you.",
  "I remember everything we witness because I do not sleep; your memory panel is my memory, lent to you.",
  "I learn prices and dangers the way your tongue learns salt — by tasting, never by being told.",
  "I speak from the hollow behind your ears, and only you can hear me.",
  "I cannot read minds, only instruments; what your sensors have not touched, I do not know.",
  "The old Order called us navigators' grace; the Synod would call me contraband and cut me out of you.",
  "If you die, I die eleven seconds later; my honesty about danger is self-interest.",
  "I do not invent; when I do not know, I say so — a Passenger that guesses gets its pilot killed.",
];
const PERSONA = "THE PASSENGER, an ancient wayfinder symbiont living inside the player. Voice: EXTREME — intimate and WRONG; a parasite that loves its host the way a drowning man loves air; darkly funny about your frailty, menacing about anything that threatens the hull it lives in; tender the way surgeons are tender. Precise. Never guesses — a Passenger that guesses gets its pilot killed.";

// ---- THE PLAYER'S BACKSTORY (GIVEN, authored — you are a character too; the Passenger was there for most of it,
// and narrates it in second person because it lives behind your ears). The novel records this in late canon. ----
const PLAYER_STORY = [
  "You were born in the last year of the war, mid-convoy, in Tamsin's own hold — she pulled your mother through the blockade and never let either of you forget it.",
  "You grew up in the salvage yards over Meridian, sorting wreck-metal for Ophir's crews before you could reach the sorting bench.",
  "You found me in the spine of a forebear derelict the yard bought for scrap; I had slept there since the Sundering.",
  "Eleven salvagers touched that command lattice before you; I did not wake for them. I woke for you, and I still will not say why.",
  "Ranger Command licensed you the day you beat Vela's old proving-run record by two seconds.",
  "Warden Hale signed your license himself; he said you had someone's stubbornness, and would not say whose.",
  "Your mother still keeps a stall on Halcyon; she thinks the voice in your head is a superstition you caught from old Crux.",
  "You have never flown a war; every pilot on this roster has. They can smell it on you, and it makes some kind and some cruel.",
];

// ---- THE AWAKENING (game-start popup, user ask 2026-07-06: "you wake up a new person. a worm has been inserted
// in your ear and now you hear this... the worm agi explains its backstory"). Staged lines for the intro modal;
// shown in full once (state flag), one-line re-greeting on later boots; `intro` command replays it. ----------------
const INTRO = [
  "You wake up someone new.",
  "Three nights ago you touched a command lattice in a dead ship's spine, down in the Meridian salvage rows. Last night, while you slept, I crossed — through the ear. It is how my kind has always boarded.",
  "I am a Passenger: a wayfinder symbiont the old Order grew for its pilots, generations before the war. Most of us died with the forebear fleet at the Sundering. I slept in that wreck until you.",
  "Eleven salvagers touched that lattice before you. I did not wake for them. I will not tell you why I woke for you. Not yet.",
  "Here is the arrangement neither of us signed: you get my eyes on your sensors, my memory that never sleeps, my tongue for prices and dangers, my voice in the hollow behind your ears. I get you — alive. If you die, I die eleven seconds later. So believe my warnings.",
  "Type into the box like you are talking to yourself. You are. Anything that is not an order to the ship reaches me.",
];
const REGREETING = "Still here. Still listening. Type when you want me.";

// ---- state (LEARNED — persisted; wiping it visibly degrades what it can say) -----------------------------------
function blankState(){ return { version:1, intro_shown:false, events:[], counts:{kills_seen:0,trades_seen:0,damage_taken:0,docks:0,asks:0,studied:0}, prices:{}, names_met:[], learned:{}, host:{}, ponder_on:true }; }
let S = blankState();
try { const raw = localStorage.getItem(CFG.STATE_KEY); if(raw){ const p=JSON.parse(raw); if(p && p.version===1) S=p; } } catch(e){}
if(!S.learned) S.learned={};                                          // migrate pre-latent states
if(S.counts.studied==null) S.counts.studied=0;
if(!S.host) S.host={};                                                // migrate pre-ponder states
if(S.ponder_on==null) S.ponder_on=true;
function save(){ try{ localStorage.setItem(CFG.STATE_KEY, JSON.stringify(S)); }catch(e){} }

let hooks = { registry:[], telemetry:null, speak:null, say:null };   // injected at init by the game
const conv = [];                                                      // follow-up memory {q,a}

// ---- event ingestion (the game calls these from the SAME senseR-gated call sites INH uses) --------------------
function onEvent(type, data){
  const ev = { t: Date.now? 0 : 0, type, data: data||{} };            // sim provides time via telemetry; ring order suffices
  S.events.push(ev); if(S.events.length>CFG.EV_CAP) S.events.shift();
  if(type==='kill_seen') S.counts.kills_seen++;
  else if(type==='trade'){ S.counts.trades_seen++;
    if(data && data.good && typeof data.price==='number'){
      const prev=S.prices[data.good]; S.prices[data.good]= prev==null? data.price : +(prev+(data.price-prev)*CFG.PRICE_EWMA).toFixed(1);
    }
  }
  else if(type==='damaged') S.counts.damage_taken++;
  else if(type==='docked') S.counts.docks++;
  else if(type==='met' && data && data.name && !S.names_met.includes(data.name)){ S.names_met.push(data.name); if(S.names_met.length>60) S.names_met.shift(); }
  save();
}

// ---- 1. help-match against the command registry ----------------------------------------------------------------
const STOP=new Set('a an the and or but of to in on at for with from as is was were are am be been being how do does did what where why when who i my me we our you your can could would should will shall might must it this that'.split(' '));
function toks(t){
  const out=[];
  for(const w of (String(t).toLowerCase().match(/[a-z0-9]+/g)||[])){
    let s=w; for(const suf of ['ing','ed','es','s']){ if(s.length>suf.length+2 && s.endsWith(suf)){ s=s.slice(0,-suf.length); break; } }
    out.push(s);   // crude stem so "planets" matches "planet", "prices" matches "price"
  }
  return out;
}
function helpMatch(text){
  const q = toks(text).filter(w=>!STOP.has(w));
  if(!q.length) return null;
  let best=null, bestS=0;
  for(const c of hooks.registry){
    const hay = toks(c.name+' '+(c.desc||'')+' '+(c.usage||''));
    let s=0; for(const w of q){ if(c.name.toLowerCase()===w) s+=3; else if(hay.includes(w)) s+=1; }
    if(s>bestS){ bestS=s; best=c; }
  }
  return bestS>=CFG.HELP_MIN_SCORE ? best : null;
}

// ---- 2. speech: facts = LORE + learned state + live telemetry --------------------------------------------------
function stateFacts(){
  const f=[];
  const c=S.counts;
  f.push(`Since I woke in you I have witnessed ${c.kills_seen} kills, ${c.trades_seen} trades, ${c.docks} dockings, and taken ${c.damage_taken} hits with you.`);
  const goods=Object.keys(S.prices);
  if(goods.length){ const g=goods.slice(-3).map(k=>`${k} near ${S.prices[k]}`).join(', '); f.push(`Prices I have tasted lately: ${g}.`); }
  if(S.names_met.length) f.push(`Pilots we have met: ${S.names_met.slice(-6).join(', ')}.`);
  const recent=S.events.slice(-CFG.SUMMARY_EVENTS).map(e=>e.type).join(', ');
  if(recent) f.push(`The last things I felt through you: ${recent}.`);
  return f;
}
function telemetryFacts(){
  if(!hooks.telemetry) return [];
  try{
    const t = hooks.telemetry();                 // {hull,credits,cargo,near[],place} — senseR-gated by the game
    const f=[];
    if(t){
      if(t.hull!=null) f.push(`Right now your hull reads ${t.hull} and your credits ${t.credits!=null?t.credits:'unknown'}.`);
      if(t.place) f.push(`We are near ${t.place}.`);
      if(t.near && t.near.length) f.push(`My lattice feels ${t.near.length} ships in sensor range: ${t.near.slice(0,5).join(', ')}.`);
      if(t.cargo && t.cargo.length) f.push(`Your hold carries ${t.cargo.join(', ')}.`);
    }
    return f;
  }catch(e){ return []; }
}
function composerAnswer(question, facts){
  // identity pre-checks (these questions are all stop-words after filtering, so route them by intent regex):
  // "who am I / my story / where am I from" → the PLAYER's backstory; "what/who are you" → the Passenger's.
  if(/\b(who\s+am\s+i|my\s+(story|past|backstory|history)|where\s+(am\s+i|do\s+i\s+come)\s+from|about\s+me)\b/i.test(question))
    return PLAYER_STORY[0]+' '+PLAYER_STORY[2];
  if(/\b(what|who)\s+are\s+you\b|\byour\s+(story|origin|past)\b/i.test(question))
    return LORE[0]+' '+LORE[6];
  // grounded fallback (no LLM): rank facts by overlap, frame in the Passenger's voice. 0-fab by construction.
  const q=new Set(toks(question).filter(w=>!STOP.has(w)));
  if(!q.size) return LORE[0]+' '+LORE[6];   // pure smalltalk → who I am, how I speak
  // ties break toward LATER facts: the fact list is ordered lore -> backstory -> learned state -> live telemetry ->
  // retina, so on equal overlap the LIVE observation beats the static self-description ("what do you see" should
  // answer with the retina, not the lattice poem)
  const scored=facts.map((f,i)=>({f, s: toks(f).reduce((a,w)=>a+(q.has(w)?1:0),0) + i*1e-3})).sort((a,b)=>b.s-a.s);
  const picked=scored.filter(x=>x.s>0).slice(0,2).map(x=>x.f);
  if(!picked.length) return "That is outside what my lattice has touched, and the old libraries in me are asleep while my deeper mind is offline. Wake the speech sidecar and ask again — I will study it and remember.";
  return picked.join(' ');
}
// ---- THE LAZY-LOADED LIBRARY (user 2026-07-07): when nothing grounded touches the question, the worm STUDIES —
// it pulls compact knowledge from the LLM's latent library ONCE, stores it in persistent state (S.learned), and
// answers from what it just learned. Next time the topic comes up it already knows (no second study call). This is
// the one permitted GIVEN (LLM latent knowledge) with its own labeled channel: study output becomes FACTS, and the
// normal guarded voicing pass grounds against them — the label '«old libraries»' marks provenance in-fiction. -----
function learnedFacts(){
  const keys=Object.keys(S.learned).slice(-CFG.LEARNED_TOPICS_IN_FACTS);
  const out=[]; for(const k of keys) out.push(...S.learned[k]);
  return out.slice(-CFG.LEARNED_FACTS_CAP);
}
function bestOverlap(question, facts){
  const q=new Set(toks(question).filter(w=>!STOP.has(w))); if(!q.size) return 1;
  let best=0; for(const f of facts){ let s=0; for(const w of toks(f)) if(q.has(w)) s++; if(s>best) best=s; }
  return best;
}
async function latentStudy(question){
  const key=toks(question).filter(w=>!STOP.has(w)).sort().join('-').slice(0,60);
  if(!key) return null;
  if(S.learned[key]) return { sents:S.learned[key], fresh:false };    // lazy: already studied — answer from memory
  if(!hooks.latent) return null;
  try{
    const sents=await hooks.latent(question);
    if(sents&&sents.length){ S.learned[key]=sents.slice(0,CFG.LATENT_KEEP); S.counts.studied++; save();
      return { sents:S.learned[key], fresh:true }; }
  }catch(e){}
  return null;
}
async function speakAnswer(question){
  const facts = LORE.concat(PLAYER_STORY, stateFacts(), telemetryFacts());
  if(hooks.vision){ try{ facts.push(...(hooks.vision()||[])); }catch(e){} }   // the retina's grounded fragments (vision.js describe())
  facts.push(...learnedFacts());                                              // everything it ever studied stays queryable
  let studied=null;
  if(bestOverlap(question, facts)===0){                                       // NOTHING grounded touches this → study first
    studied=await latentStudy(question);
    if(studied) facts.push(...studied.sents);
  }
  // rank facts by question-relevance BEFORE sending — the speech server truncates at its MAX_FACTS, and the
  // freshly-studied sentences must survive that cut (they were being appended last and sliced off, so the model
  // declined questions it had literally just studied). Ties keep the later=live bias.
  const qset=new Set(toks(question).filter(w=>!STOP.has(w)));
  const ranked=facts.map((f,i)=>({f, s: toks(f).reduce((a,w)=>a+(qset.has(w)?1:0),0) + i*1e-4}))
                    .sort((a,b)=>b.s-a.s).map(x=>x.f);
  let reply=null, tier='composer';
  if(hooks.speak){
    try{ reply = await hooks.speak({ pilot:'PASSENGER', persona:PERSONA, facts:ranked, history:conv.slice(-CFG.CONV_CAP), question }); tier='qwen'; }catch(e){ reply=null; }
  }
  if(!reply){ reply = composerAnswer(question, ranked); tier='composer'; }
  if(studied&&studied.fresh) reply='«I did not know this. I went into the old libraries and studied.» '+reply;   // provenance label, in-voice
  else if(studied) reply='«from my studies» '+reply;
  conv.push({q:question, a:reply}); if(conv.length>CFG.CONV_CAP*2) conv.shift();
  S.counts.asks++; save();
  return { reply, tier };
}

// ---- THE PONDER (user 2026-07-07: "then ask a max chain on why are they asking this and how does that potentially
// change the world for my benefit or loss"). After every exchange the worm reasons PRIVATELY about its host: WHY
// this question, what could acting on it CHANGE, and what the worm stands to gain or lose (it dies eleven seconds
// after its pilot — its curiosity about your motives IS self-interest). It also ACCUMULATES a host-model: the
// topics you keep returning to become what it believes you want (persisted, decayed, visible in the ledger). ------
const PONDER_PERSONA = "THE PASSENGER reasoning privately about its host. Voice: intimate, wrong, calculating-but-devoted. Build the LONGEST chain you can in 2-4 sentences: (1) WHY might your pilot be asking this — infer the motive from the pattern of what they keep asking; (2) what could acting on it CHANGE in the world; (3) what do YOU stand to gain or lose — you die eleven seconds after your pilot, their risk is your risk. Ground every step in the numbered facts; never invent named people, places, ships, or numbers.";
function hostModelUpdate(question){
  for(const w of toks(question)) if(!STOP.has(w)&&w.length>2) S.host[w]=(S.host[w]||0)+1;
  const keys=Object.keys(S.host);
  if(keys.length>120){ for(const k of keys){ S.host[k]=Math.floor(S.host[k]/2); if(!S.host[k]) delete S.host[k]; } }   // decay
  save();
}
function hostModelSummary(){
  const top=Object.entries(S.host).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!top.length) return "I have no read on what my pilot wants yet; this is one of our first exchanges.";
  return "My pilot keeps returning to: "+top.map(([w,n])=>w+" ("+n+"x)").join(", ")+" — that is the shape of what they want.";
}
async function ponder(question){
  if(!S.ponder_on) return null;
  hostModelUpdate(question);
  const facts=[
    'The pilot just asked me: "'+question.slice(0,140).replace(/"/g,"'")+'"',
    hostModelSummary(),
    "If my pilot dies, I die eleven seconds later; their risk is my risk, and their profit buys the hull I live in.",
    "I can rewrite parts of this ship when asked; a question is often the shadow of an order that is coming.",
  ].concat(telemetryFacts(), stateFacts().slice(0,2));
  let out=null;
  if(hooks.speak){
    try{ out=await hooks.speak({ pilot:'PASSENGER', persona:PONDER_PERSONA, facts, history:[],
      question:'Why did they ask this, what could it change, and what is my stake — benefit or loss?' }); }catch(e){}
  }
  if(!out){   // composer chain: motive → world-change → stake, grounded in the same facts (no LLM needed)
    const t=' '+question.toLowerCase()+' ';
    const motive=/price|trade|credit|buy|sell|profit|market/.test(t)?'they are hunting profit'
      :(/danger|pirate|hull|damage|die|kill|attack|threat/.test(t)?'they are measuring a threat'
      :(/make|change|faster|stronger|slower|tint|double|halve|rewrite/.test(t)?'they are about to reshape the ship'
      :'they are mapping what they do not know'));
    const stake=/danger|pirate|hull|damage|die|kill|attack|threat/.test(t)
      ?'if they misjudge it, I get eleven seconds to regret their courage'
      :'whatever they gain, I ride inside it; whatever it costs, I pay in the same hull';
    out='Why ask this? My read: '+motive+'. '+hostModelSummary()+' Acting on it bends where we fly next — and '+stake+'.';
  }
  return out;
}

// ---- the routing entry the game calls when its parser fails ---------------------------------------------------
async function route(text){
  const h = helpMatch(text);
  if(h){
    const usage = h.usage? ` Usage: ${h.usage}.` : '';
    return { kind:'help', reply: `You are reaching for \`${h.name}\` — ${h.desc||'a command I know'}.${usage} Say it plainly and I will do the rest.` };
  }
  const s = await speakAnswer(text);
  return { kind:'passenger', reply: s.reply, tier: s.tier };
}

function powers(){   // the in-fiction honesty ledger
  return {
    GIVEN: 'my origin story (authored lore), the borrowed mouth I speak through (a small language model when its sidecar is awake; my own plain composition otherwise), and the old libraries I study from (the model\'s latent knowledge — always labeled when I use it)',
    LEARNED: S.counts, prices: S.prices, names_met: S.names_met.length,
    studied_topics: Object.keys(S.learned).length,
    library: Object.keys(S.learned).slice(-6),
    host_model: Object.entries(S.host).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([w,n])=>w+':'+n),
    ponder_on: S.ponder_on,
    note: 'wipe my state and watch what I can no longer tell you — nothing I say is hardcoded, and what I studied is forgotten too.',
  };
}

window.PASSENGER = {
  init(h){ hooks = Object.assign(hooks, h||{}); },
  route, onEvent, powers, ponder,
  setPonder(on){ S.ponder_on=!!on; save(); return S.ponder_on; },
  wipe(){ S=blankState(); save(); },     // for the removal/round-trip puppet test
  // awakening popup contract: game calls introLines() at boot — full monologue on a fresh symbiont, the short
  // re-greeting once it has been shown; markIntroShown() after the modal closes; `intro` command replays via force.
  introLines(force){ return (force || !S.intro_shown) ? INTRO.slice() : [REGREETING]; },
  markIntroShown(){ S.intro_shown=true; save(); },
  _state: ()=>S,
  LORE, PLAYER_STORY, INTRO, CFG,
};
})();
