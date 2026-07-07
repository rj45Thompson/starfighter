// speech_tier.js - the SPEECH sidecar client (TAMI_SPEAK) + the LLM voicing/grounding layer for `ask`.
// EXTRACTED VERBATIM from starfighter.html (contention module-split, SCORECARD_SPEC §"Contention reduction"):
// this is a self-contained subsystem loaded as a plain <script src> global BEFORE the main game script. It defines
// window globals (no bundler); every symbol behaves EXACTLY as it did inline - same CONFIG constants, same contract.
// Load order: three.min.js → speech_tier.js → inhabitant.js → the main game script. (The NOVELDATA loader/roster was
// NOT split out - it is coupled to the lore-engine caches LORE_IDX/LORE_VOCAB that stay in the main script, and its
// boot-time novelShipHook/novelSeedDispos + async novelCachesReset create a TDZ ordering hazard a plain-globals split
// can't cleanly satisfy without relocating lore-engine state. Two modules already remove the two biggest AGI subsystems.)
//   • CSOFF (also read by TAMI_CS + the WASM loader in the main script) lives here so it exists at their parse time.
//   • SPEAK_CFG / TAMI_SPEAK are used only from function bodies in the main script (call-time), so defining them here
//     (before that script) satisfies every reference.
//   • lorePersona / speakGroundOk / loreSpeak are function declarations; they read main-script globals
//     (LOREDATA, NOVEL_ROSTER, PILOTS, loreToks/loreStem, LORE_* stop-sets, idx.*) only when CALLED - after full parse.
'use strict';

// ?csoff=1 skips the sidecar probes (deterministic tier testing) - mirrors the pre-split top-level const.
var CSOFF = /[?&]csoff=1(&|$)/.test(location.search);

// TAMI_SPEAK - the SPEECH sidecar (TOP speech tier for `ask`). speech_sidecar (parallel lane) serves a LOCAL
// Qwen2.5-1.5B-Instruct on http://localhost:7876. CONTRACT: GET /health -> {ok,model,device,loaded};
// POST /speak {pilot,persona,facts,history,question} -> {reply,ms}. Retrieval still SELECTS the facts - the LLM only
// VOICES them in character; a grounding post-check (speakGroundOk) discards any reply naming an entity outside
// facts ∪ the pilot's corpus, so the no-fabrication guarantee survives the paraphrase. Soft-fail like TAMI_CS:
// sidecar absent (public site) -> the verbatim composer answers exactly as before. `?csoff=1` skips this probe too.
var SPEAK_CFG={ TIMEOUT_MS:8000, MAX_FACTS:8, MAX_HISTORY:4,   // named tunables (contract limits) - no magic numbers below. TIMEOUT_MS 6000→8000 (speech-verifier wave-0 backlog: guard-retry latency 4.7–7s exceeded the old 6s timeout on ~2/7 turns)
  REPROBE_MS:20000 };   // LATE-SIDECAR FIX (NOVEL_SOCIETY backlog, puppet audit tick-1): while the sidecar is DOWN, re-probe /health on this cadence so a sidecar started AFTER page load is picked up automatically (composer→LLM without a reload). Named constant, no magic number.
var TAMI_SPEAK=(()=>{ const BASE='http://localhost:7876'; let alive=false, info=null; let probed;
  if(CSOFF){ probed=Promise.resolve(); console.log('TAMI_SPEAK probe SKIPPED (?csoff=1) - pilot speech stays on the retrieval composer'); }
  else probed=fetch(BASE+'/health').then(r=>r.ok?r.json():null).then(j=>{ alive=!!(j&&j.ok); info=j||null;
    if(alive) console.log(`TAMI_SPEAK sidecar connected - pilot speech runs ${j.model||'a local LLM'} on ${j.device||'?'}${j.loaded?'':' (model lazy-loads on the first line)'}`); }).catch(()=>{});
  const health=async()=>{ if(CSOFF) return null; try{ const r=await fetch(BASE+'/health'); const j=r.ok?await r.json():null; const was=alive; alive=!!(j&&j.ok); info=j||null;
      if(alive&&!was) console.log('TAMI_SPEAK sidecar connected (late) - pilot speech now runs the local LLM'); return alive?j:null; }catch(e){ alive=false; return null; } };
  // LATE-SIDECAR re-probe timer: only polls WHILE down (once alive, it stops - no ongoing network spam) and never
  // under ?csoff=1 (composer-tier testing stays deterministic). This is the timer arm of the backlog fix; loreSpeak
  // also drives an every-Nth-ask re-probe via ensureFresh() so a late sidecar is caught on the next question too.
  if(!CSOFF){ const iv=setInterval(()=>{ if(alive){ clearInterval(iv); return; } health(); }, SPEAK_CFG.REPROBE_MS); }
  let sinceProbe=0;   // ask-driven re-probe counter (the "every Nth ask" arm)
  return { get alive(){return alive;}, get info(){return info;}, probed,
    // live re-probe (mirror of TAMI_CS.health): the speech sidecar may (re)start after page load
    health,
    // ensureFresh(): call from the ask path - if the sidecar is DOWN, re-probe every Nth call so a late sidecar is
    // adopted on the next question (belt-and-suspenders with the timer). Cheap: no network while already alive.
    ensureFresh:async(everyN)=>{ if(CSOFF||alive) return alive; const n=everyN||3; if((sinceProbe++ % n)===0){ await health(); } return alive; },
    speak:async(payload)=>{ const ac=new AbortController(), to=setTimeout(()=>ac.abort(),SPEAK_CFG.TIMEOUT_MS);
      try{ const r=await fetch(BASE+'/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ac.signal});
        if(!r.ok) throw new Error('HTTP '+r.status); return await r.json(); }
      finally{ clearTimeout(to); } },
    // LATENT LIBRARY channel (labeled GIVEN): extract compact general knowledge about a topic - the Passenger's
    // lazy-load study call. Own generous timeout: extraction generates more tokens than a reply AND may pay the
    // model's cold load (~45s); studying is rare (once per topic, ever) so the wait is worth it.
    latent:async(topic)=>{ const LATENT_TIMEOUT_MS=60000; const ac=new AbortController(), to=setTimeout(()=>ac.abort(),LATENT_TIMEOUT_MS);
      try{ const r=await fetch(BASE+'/speak',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'latent',question:topic,pilot:'LIBRARY',persona:'',facts:[],history:[]}),signal:ac.signal});
        if(!r.ok) throw new Error('HTTP '+r.status); const j=await r.json(); return j.sentences||null; }
      catch(e){ return null; }
      finally{ clearTimeout(to); } } }; })();

// ---- LLM SPEECH TIER (TAMI_SPEAK) - voices the retrieval-selected facts; NEVER a source of facts itself ----
// persona: one line derived from the pilot's FIRST bio sentence (contract field), plus name + faction address.
function lorePersona(s){ const P=(((LOREDATA||{}).pilots)||{})[s.name]||{}, ch=NOVEL_ROSTER&&NOVEL_ROSTER.byName[s.name];
  const first=(P.bio&&P.bio[0])||(s.backstory?s.backstory+'.':'A starfighter pilot.');   // roster ships carry temperament as backstory (novelShipHook)
  const fac=(ch&&ch.faction==='traders')?'Free Trader':(s.team==='pirate'?'Iron Synod':'Coalition Warden');
  return `${s.name}, ${fac} pilot. ${first} ${loreExtremity(s,ch)}`; }
// EXTREME register (user 2026-07-06: "characters should be extreme - funny, creepy, menacing"): a voice DIRECTIVE
// derived from the character's own canon temperament. It shapes TONE only - the grounding guard is unchanged, so
// the theatrics can never invent facts, only style them.
function loreExtremity(s,ch){ const t=((ch&&ch.temperament)||s.backstory||'').toLowerCase();
  if(/executioner|blockade|tribunal|raider|mine layer|counts the tithed|unforgiven/.test(t))
    return 'Voice: MENACING and extreme - velvet threat, patient as a closing airlock; you enjoy letting silence do the last word.';
  if(/priest|witch|superstitious|unsleeping|half machine|chaplain|reads ruin|no records/.test(t))
    return 'Voice: CREEPY and extreme - you speak like an omen, tender about terrible things; you notice what should not be noticeable.';
  if(/card cheat|poet|cocky|sardonic|racer|salvage broker|counts everything|news-runner/.test(t))
    return 'Voice: DARKLY FUNNY and extreme - fast, wicked, one eyebrow permanently raised; jokes with teeth in them.';
  return 'Voice: EXTREME and theatrical - heightened, unforgettable, never bland; every line costs somebody something.'; }
// GROUNDING POST-CHECK: every Capitalized token in the LLM reply must already exist in the supplied facts ∪ the
// pilot's indexed corpus (bio + own factions + worlds, which carries all PILOTS/faction/world names via idx.ents).
// A new named entity = fabrication -> the reply is DISCARDED and the verbatim composer takes the turn.
const SPEAK_CAP_RE=/\b[A-Z][a-z]{2,}\b/g;   // the same named-entity shape loreEntities extracts
function speakGroundOk(reply,facts,idx){
  const allow=new Set(idx.ents);                                        // pilot/faction/world names + every corpus capital (stemmed)
  for(const d of idx.docs) for(const t of d.tf.keys()) allow.add(t);    // the pilot's whole indexed corpus vocabulary
  for(const f of facts){ loreToks(String(f)).forEach(t=>allow.add(t));  // live-graph facts aren't in idx.docs - allow their words too
    (String(f).match(SPEAK_CAP_RE)||[]).forEach(w=>allow.add(loreStem(w.toLowerCase()))); }
  for(const w of (String(reply).match(SPEAK_CAP_RE)||[])){ const lw=w.toLowerCase();
    if(LORE_ENT_STOP.has(w)||LORE_STOP.has(lw)) continue;               // sentence-initial ordinary words are not entities
    if(!allow.has(loreStem(lw))) return {ok:false,tok:w}; }
  return {ok:true,tok:null}; }
// POST the selected facts + dialogue history to the speech sidecar. Returns the in-character reply string, or null
// (sidecar down / empty facts / timeout / bad shape / grounding trip) -> the caller falls back to the verbatim
// composer FOR THAT TURN. Facts are NOT marked said here - the caller commits only once a line actually lands.
async function loreSpeak(s,question,facts,st,idx){
  if(!TAMI_SPEAK.alive||!facts||!facts.length) return null;
  try{
    const j=await TAMI_SPEAK.speak({ pilot:s.name, persona:lorePersona(s), facts:facts.slice(0,SPEAK_CFG.MAX_FACTS),
      history:(st.history||[]).slice(-SPEAK_CFG.MAX_HISTORY), question:String(question||'') });
    const reply=(j&&typeof j.reply==='string')?j.reply.trim():'';
    if(!reply) return null;
    const g=speakGroundOk(reply,facts,idx);
    if(!g.ok){ console.warn(`speech grounding tripped - LLM reply names "${g.tok}" outside facts ∪ corpus; using the verbatim composer`); return null; }
    return reply;
  }catch(e){ console.warn('TAMI_SPEAK '+(((e&&e.name)==='AbortError')?`timeout (${SPEAK_CFG.TIMEOUT_MS}ms)`:'error: '+((e&&e.message)||e))+' - verbatim composer takes this turn'); return null; }
}
