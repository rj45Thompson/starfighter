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
function blankState(){ return { version:1, intro_shown:false, events:[], counts:{kills_seen:0,trades_seen:0,damage_taken:0,docks:0,asks:0}, prices:{}, names_met:[] }; }
let S = blankState();
try { const raw = localStorage.getItem(CFG.STATE_KEY); if(raw){ const p=JSON.parse(raw); if(p && p.version===1) S=p; } } catch(e){}
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
  const scored=facts.map(f=>({f, s: toks(f).reduce((a,w)=>a+(q.has(w)?1:0),0)})).sort((a,b)=>b.s-a.s);
  const picked=scored.filter(x=>x.s>0).slice(0,2).map(x=>x.f);
  if(!picked.length) return "That is outside what my lattice has touched. Ask me about your ship, our lanes, the prices I have tasted, what I am — or who you are.";
  return picked.join(' ');
}
async function speakAnswer(question){
  const facts = LORE.concat(PLAYER_STORY, stateFacts(), telemetryFacts());
  let reply=null, tier='composer';
  if(hooks.speak){
    try{ reply = await hooks.speak({ pilot:'PASSENGER', persona:PERSONA, facts, history:conv.slice(-CFG.CONV_CAP), question }); tier='qwen'; }catch(e){ reply=null; }
  }
  if(!reply){ reply = composerAnswer(question, facts); tier='composer'; }
  conv.push({q:question, a:reply}); if(conv.length>CFG.CONV_CAP*2) conv.shift();
  S.counts.asks++; save();
  return { reply, tier };
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
    GIVEN: 'my origin story (authored lore), and the borrowed mouth I speak through (a small language model when its sidecar is awake; my own plain composition otherwise)',
    LEARNED: S.counts, prices: S.prices, names_met: S.names_met.length,
    note: 'wipe my state and watch what I can no longer tell you — nothing I say is hardcoded.',
  };
}

window.PASSENGER = {
  init(h){ hooks = Object.assign(hooks, h||{}); },
  route, onEvent, powers,
  wipe(){ S=blankState(); save(); },     // for the removal/round-trip puppet test
  // awakening popup contract: game calls introLines() at boot — full monologue on a fresh symbiont, the short
  // re-greeting once it has been shown; markIntroShown() after the modal closes; `intro` command replays via force.
  introLines(force){ return (force || !S.intro_shown) ? INTRO.slice() : [REGREETING]; },
  markIntroShown(){ S.intro_shown=true; save(); },
  _state: ()=>S,
  LORE, PLAYER_STORY, INTRO, CFG,
};
})();
