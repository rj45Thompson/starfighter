// speech_input.js - THE EAR: browser SpeechRecognition (STT) so the player can TALK to the Passenger, not just type.
// Mirrors the soft-fail contract of speech_tier.js/chatter.js: no engine in this browser (Firefox/Safari lack it) ->
// SPEECH_IN.supported is false, the mic button/`talk` command say so, and typing still works exactly as before.
// Self-contained plain-global module, loaded as a <script src> like its siblings - no bundler, no build step.
'use strict';
(function(){
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const CFG = { LANG:'en-US' };
let rec=null, listening=false, wantContinuous=false, gotFinal=false;

function chatEl(){ return document.getElementById('chat'); }
function micEl(){ return document.getElementById('micBtn'); }
function paintMic(){ const b=micEl(); if(!b) return; b.classList.toggle('live',listening); b.textContent=listening?'🎙':'🎤'; }

function ensureRec(){
  if(rec||!SR) return rec;
  rec=new SR(); rec.lang=CFG.LANG; rec.continuous=false; rec.interimResults=true; rec.maxAlternatives=1;
  rec.onstart=()=>{ gotFinal=false; listening=true; paintMic(); };
  rec.onresult=(e)=>{ let interim='', final='';
    for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i];
      if(r.isFinal) final+=r[0].transcript; else interim+=r[0].transcript; }
    const c=chatEl(); if(c) c.value=(final||interim).trim();
    if(final.trim()){ gotFinal=true; const said=final.trim(); if(c) c.value='';
      if(window.runCmd) window.runCmd(said); } };                         // same path as pressing Enter - type OR talk, one door in
  rec.onerror=(e)=>{ listening=false; paintMic();                          // 'no-speech'/'aborted' are routine (silence, user stopped it) - not worth a console warning
    if(e.error!=='no-speech'&&e.error!=='aborted') console.warn('SPEECH_IN error: '+e.error); };
  rec.onend=()=>{ listening=false; paintMic();
    if(wantContinuous&&!gotFinal){ try{ rec.start(); }catch(e){} } };       // silence timeout while hands-free -> just listen again, no reply to wait for
  return rec;
}
function start(){ if(!SR||listening) return !!SR; ensureRec(); try{ rec.start(); return true; }catch(e){ return false; } }
function stop(){ wantContinuous=false; if(rec){ try{ rec.stop(); }catch(e){} } }
// TALK MODE (hands-free): call from the `talk on|off` command. wormDone() is the other half - the game calls it
// after the Passenger's spoken reply finishes (CHATTER.voiceWorm's callback), so the mic only re-arms once our own
// voice has stopped - otherwise the speaker would talk into the mic and answer itself.
function setContinuous(v){ wantContinuous=!!v; if(wantContinuous&&!listening) start(); else if(!wantContinuous) stop(); }
function wormDone(){ if(wantContinuous&&!listening) start(); }

window.SPEECH_IN = { get supported(){ return !!SR; }, get listening(){ return listening; }, get continuous(){ return wantContinuous; },
  start, stop, toggle:()=>listening?(stop(),false):start(), setContinuous, wormDone };
})();
