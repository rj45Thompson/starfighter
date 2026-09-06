// brain/brain.js - THE PASSENGER'S BRAIN (2026-09-06).
//
// RJ: "make sure the parasite talking is using the latest tech we have, not some toy just for this. It should attach to
// the millions of shards of data as well as the novel of the game ... the anchor demo english talking part ... is
// supposed to be his brain ... it's mostly AI hallucination, so rebuild it."
//
// This module runs the anchor2 reasoning engine (brain/engine/*, the same code as D:/code/anchor2, MIT) inside the game
// and gives it two tiers of facts:
//   GAME  - THE LANES THAT BURNED (novel_graph.json: 3,220 subject-verb-object triples over 25 chapters), the authored
//           pilot / faction / world bios (lore_bios.json), the Passenger's own canon (from passenger.js) and the LIVE game
//           (planets, systems, ships, missions, the player) refreshed every LIVE_REFRESH_S. All of it lives in the engine's
//           Overlay, so every lookup, every LINK / LOOKUP / RANK / CONCLUDE step is the engine's own, with a named source.
//   WORLD - the 7.7-million-entity / 35.9-million-fact Wikidata-lineage store anchor2 exports, read from CFG.WORLD_URL
//           (D:/code/anchor2/serve.py, a CORS static server) when it is reachable. When it is not, the brain SAYS so;
//           nothing is substituted.
// Every reply is a transcript. A question the tiers cannot settle is a REFUSE (or an ASK), never a composed guess; with
// the world tier up, askGrow derives, fetches from wikidata.org or asks back, and what it learns persists in localStorage.
//
// Exposes window.BRAIN = { ready, status(), ask(question, {grow}), chooseMission(candidates, telemetry), learnedCount() }.
import { Store } from "./engine/store.js";
import { Reasoner } from "./engine/reason.js";
import { Overlay, Learner } from "./engine/learn.js";
import { normKey } from "./engine/norm.js";
import * as L from "./engine/lexicon.js";

const CFG = {
  WORLD_URL: (typeof window !== "undefined" && window.CFG && window.CFG.BRAIN_WORLD_URL) || "http://127.0.0.1:8793/data/",   // 127.0.0.1: see CFG.BRAIN_WORLD_URL in index.html
  WORLD_PROBE_MS: 3500,      // how long the index fetch may take before the world tier is declared offline for this boot
  PID_BASE: 100000,          // game relations get ids above every Wikidata property id
  SRC_NOVEL: 256, SRC_LORE: 512, SRC_GAME: 1024,   // source bits of the game tier (declared in the game index's sources/families)
  QID_START: -1000,          // game entities are NEGATIVE ids: the engine treats those as overlay-only (no shard fetch)
  LIVE_REFRESH_S: 8,
  LEARNED_KEY: "SF_BRAIN_LEARNED_v1",
  NOVEL_URL: "novel_graph.json", LORE_URL: "lore_bios.json",
  MAX_LIVE_SHIPS: 60,
};

/* ---- an engine Store with NO shards: everything comes from the overlay ---------------------------------- */
class OverlayStore extends Store {
  constructor({ index, overlay, onEvent }) {
    super({ base: "memory/", loadGz: async () => { throw new Error("the game tier has no shards"); }, loadJson: async () => index, onEvent, overlay });
    this._index = index;
  }
  async init() { this.index = this._index; this.bloom = null; this.propTypes = null; return this.index; }
  async shard() { return {}; }
  async mightExist(text) { const k = normKey(text); return !!k && this.overlay.aliasesFor(k).length > 0; }
  async members() { return null; }
  async concept() { return null; }
}

/* ---- the game tier ---------------------------------------------------------------------------------------- */
function makeGameIndex() {
  const props = {};
  props[31] = { l: "instance of", a: ["is a", "is an", "type", "kind", "is"], inv: null, n: 0, d: null, ls: "game" };
  props[279] = { l: "subclass of", a: ["kind of", "sort of"], inv: null, n: 0, d: null, ls: "game" };
  const rel = new Map(); let next = CFG.PID_BASE;
  // fixedPid: a game relation that SHOULD answer the engine's own question shapes (WHERE walks the Wikidata location
  // ladder P131 / P276 / P17) is registered under that Wikidata id, so "where is Halcyon" walks planet -in system-> star
  const put = (name, aliases, fixedPid) => { const k = normKey(name); if (!k) return null; if (rel.has(k)) return rel.get(k); const id = fixedPid || next++; props[id] = { l: k, a: (aliases || []).map(normKey).filter(Boolean), inv: null, n: 0, d: null, ls: "game" }; rel.set(k, id); return id; };
  const index = {
    build: "starfighter game tier", nshard: 1,
    sources: { "256": "THE LANES THAT BURNED (the novel)", "512": "authored lore (lore_bios.json, passenger canon)", "1024": "the game, live" },
    families: { "256": "novel", "512": "lore", "1024": "game" },
    props, lit_props: {},
    curve: { method: "game tier: canon is true within the game by construction; no held-out measurement exists or is claimed", min_n: 1,
             k: { "1": { test: { measured: true, p: 1.0, n: 1, basis: "canon of this game (the novel, the authored lore, or the live game state) - true by construction, not a measured agreement" } },
                  "2": { test: { measured: true, p: 1.0, n: 1, basis: "two canon sources agree" } },
                  "3": { test: { measured: true, p: 1.0, n: 1, basis: "three canon sources agree" } } } },
    counts: {}, bloom: null,
  };
  return { index, props, put };
}

class GameTier {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.ov = new Overlay({ load: null, save: null });     // memory only; rebuilt from the data files every boot
    const gi = makeGameIndex(); this.index = gi.index; this.put = gi.put;
    this.qids = new Map(); this.next = CFG.QID_START; this.liveEntities = new Set();
    this.store = new OverlayStore({ index: this.index, overlay: this.ov, onEvent });
    this.reasoner = null; this.counts = { novel: 0, lore: 0, live: 0 };
  }
  E(label, desc, aliases) {
    const k = normKey(label); if (!k) return null;
    if (this.qids.has(k)) { const q = this.qids.get(k); const e = this.ov.entities[q]; if (desc && !e.d) e.d = desc; if (aliases) e.a = [...new Set([...(e.a || []), ...aliases])]; return q; }
    const qid = this.next--; this.qids.set(k, qid); this.ov.entities[qid] = { qid, l: String(label), d: desc || null, a: aliases || [] }; return qid;
  }
  F(s, pid, o, src, how) { if (s == null || pid == null || o == null) return null; return this.ov.add({ s, p: pid, o, src, sup: 1, how: how || null, olabel: this.ov.entities[o] ? this.ov.entities[o].l : null }); }
  async build(novel, lore, canon) {
    const pInst = 31, pBio = this.put("bio", ["story", "past", "history", "background", "backstory", "life"]);
    const pIn = this.put("in chapter", ["chapter", "appears in"]), pPov = this.put("point of view", ["pov", "narrator", "told by"]), pPlace = this.put("place", ["set in", "location", "where", "located in"], 276);
    const pFaction = this.put("faction", ["side", "allegiance", "belongs to"]);
    const tChar = this.E("character", "a person of the novel THE LANES THAT BURNED"), tChapter = this.E("chapter", "a chapter of the novel"), tWorld = this.E("world", "a world, station or place of the game"), tFaction = this.E("faction", "a faction of the war");
    if (novel) {
      for (const ch of novel.chapters || []) { const c = this.E(ch.id, `chapter ${ch.id.replace("ch-", "")} - ${ch.scene || ""}`.trim()); this.F(c, pInst, tChapter, CFG.SRC_NOVEL, "novel_graph.json");
        if (ch.pov) this.F(c, pPov, this.E(ch.pov), CFG.SRC_NOVEL, ch.id); if (ch.place) this.F(c, pPlace, this.E(ch.place), CFG.SRC_NOVEL, ch.id);
        for (const who of ch.present || []) this.F(this.E(who), pIn, c, CFG.SRC_NOVEL, ch.id); }
      for (const t of novel.triples || []) { const pid = this.put(t.r, [t.r + "s", t.r + "ed", t.r + "ing"]); if (!pid) continue;
        this.F(this.E(t.s), pid, this.E(t.o), CFG.SRC_NOVEL, `${t.chapter}${t.pov ? " (pov " + t.pov + ")" : ""}`); this.counts.novel++; }
      for (const [name, seg] of Object.entries(novel.segments || {})) { const q = this.E(name); this.F(q, pInst, tChar, CFG.SRC_NOVEL, "novel roster");
        // a character with no authored bio is described by the first sentence of their own segment of the novel
        const first = seg && seg.sentenceIdx && seg.sentenceIdx.length && novel.sentences ? novel.sentences[seg.sentenceIdx[0]] : null;
        if (first && first.text && !this.ov.entities[q].d) this.ov.entities[q].d = String(first.text).slice(0, 160) + (first.chapter ? ` (${first.chapter})` : ""); }
    }
    if (lore) {
      const addBio = (qid, lines, how) => { (lines || []).forEach((ln, i) => { if (i === 0 && !this.ov.entities[qid].d) this.ov.entities[qid].d = ln; this.F(qid, pBio, this.E(ln), CFG.SRC_LORE, how); this.counts.lore++; }); };
      for (const [name, rec] of Object.entries(lore.pilots || {})) { const q = this.E(name); this.F(q, pInst, tChar, CFG.SRC_LORE, "lore_bios.json pilots"); addBio(q, rec.bio, "lore_bios.json " + name); if (rec.faction) this.F(q, pFaction, this.E(rec.faction), CFG.SRC_LORE, "lore_bios.json " + name); }
      for (const [name, rec] of Object.entries(lore.factions || {})) { const q = this.E(name); this.F(q, pInst, tFaction, CFG.SRC_LORE, "lore_bios.json factions"); addBio(q, Array.isArray(rec) ? rec : rec.bio, "lore_bios.json " + name); }
      for (const [name, rec] of Object.entries(lore.worlds || {})) { const q = this.E(name); this.F(q, pInst, tWorld, CFG.SRC_LORE, "lore_bios.json worlds"); addBio(q, Array.isArray(rec) ? rec : rec.bio, "lore_bios.json " + name); }
    }
    if (canon) {   // the Passenger's own canon and the player's backstory, from passenger.js (authored, labelled GIVEN there)
      const me = this.E("Passenger", (canon.LORE || [])[0] || "a wayfinder symbiont", ["the passenger", "you", "yourself", "the worm", "parasite", "the parasite", "symbiont"]);
      this.F(me, pInst, this.E("symbiont", "a wayfinder symbiont grown by the old Order for its pilots"), CFG.SRC_LORE, "passenger canon");
      for (const ln of canon.LORE || []) this.F(me, pBio, this.E(ln), CFG.SRC_LORE, "passenger canon");
      const pilot = this.E("the pilot", (canon.PLAYER_STORY || [])[0] || "the player", ["me", "i", "myself", "my", "player", "the player", "my ship", "YOU"]);
      for (const ln of canon.PLAYER_STORY || []) this.F(pilot, pBio, this.E(ln), CFG.SRC_LORE, "player backstory (canon)");
    }
    await this.store.init();                 // sets store.index - the Planner reads its props table (the first build forgot this and died in the Planner)
    this.reasoner = new Reasoner(this.store);
  }
  /* live facts from the running game: replaced wholesale on each refresh, so nothing stale survives */
  refreshLive(H, extra) {
    if (!H) return;
    this.ov.facts = this.ov.facts.filter(f => !(f.src & CFG.SRC_GAME));
    const pInst = 31, pSys = this.put("in system", ["system", "star system", "located in", "in"], 131), pEcon = this.put("economy", ["economy type", "makes", "produces", "trade"]), pTeam = this.put("team", ["side"]), pRole = this.put("role", ["job"]);
    const pHull = this.put("hull class", ["hull", "ship class", "class"]), pStatus = this.put("status", ["state"]), pDist = this.put("distance", ["how far", "far", "range"]), pMission = this.put("mission", ["contract", "assignment", "current mission", "active mission"]), pTarget = this.put("target", ["objective", "goal"]), pReward = this.put("reward", ["pays", "payment", "worth"]);
    const tPlanet = this.E("planet", "a world of the game"), tSystem = this.E("star system", "a star system of the galaxy"), tShip = this.E("ship", "a ship in the game"), tPirate = this.E("Iron Synod", "the enemy faction", ["synod", "pirates", "pirate", "the enemy", "hegemon"]);
    const P = H.P || (H.ships && H.ships[0]); const you = this.E("the pilot");
    const how = "game state at " + Math.round(H.T0 || 0) + " s";
    const dist = (a, b) => (a && b && a.distanceTo) ? Math.round(a.distanceTo(b)) : null;
    for (const s of H.systems || []) { const q = this.E(s.name, s.peaceful ? "a peaceful mining system" : (s.lawless ? "the lawless pirate system" : "a star system")); this.F(q, pInst, tSystem, CFG.SRC_GAME, how); this.counts.live++; }
    for (const p of H.planets || []) { const q = this.E(p.name, `${p.type ? p.type.t : ""} world${p.system ? " in " + p.system.name : ""}`.trim()); this.F(q, pInst, tPlanet, CFG.SRC_GAME, how);
      if (p.system) this.F(q, pSys, this.E(p.system.name), CFG.SRC_GAME, how); if (p.type) this.F(q, pEcon, this.E(p.type.t), CFG.SRC_GAME, how);
      if (P && P.pos && p.pos) this.F(q, pDist, this.E(dist(P.pos, p.pos) + " units from you"), CFG.SRC_GAME, how); this.counts.live++; }
    let n = 0; for (const s of H.ships || []) { if (!s || !s.name || n++ > CFG.MAX_LIVE_SHIPS) continue; const q = this.E(s.name, `${s.role || "ship"} of the ${s.team === "pirate" ? "Iron Synod" : "coalition"}`);
      this.F(q, pInst, tShip, CFG.SRC_GAME, how); this.F(q, pTeam, s.team === "pirate" ? tPirate : this.E("coalition", "the Coalition Wardens"), CFG.SRC_GAME, how); if (s.role) this.F(q, pRole, this.E(s.role), CFG.SRC_GAME, how);
      if (s.hullClass) this.F(q, pHull, this.E(s.hullClass), CFG.SRC_GAME, how); this.F(q, pStatus, this.E(s.alive === false ? "destroyed" : "alive"), CFG.SRC_GAME, how);
      if (P && s !== P && P.pos && s.pos) this.F(q, pDist, this.E(dist(P.pos, s.pos) + " units from you"), CFG.SRC_GAME, how); }
    if (P) { this.F(you, pInst, tShip, CFG.SRC_GAME, how); if (P.hullClass) this.F(you, pHull, this.E(P.hullClass), CFG.SRC_GAME, how);
      this.F(you, this.put("credits", ["money", "wealth"]), this.E(Math.round(P.credits || 0) + " credits"), CFG.SRC_GAME, how);
      this.F(you, this.put("hull integrity", ["health", "hp", "damage"]), this.E(Math.round(P.hp) + " of " + Math.round(P.maxHp) + " hull"), CFG.SRC_GAME, how);
      if (P.docked && P.docked.name) this.F(you, this.put("docked at", ["docked", "landed"]), this.E(P.docked.name), CFG.SRC_GAME, how); }
    if (H.mining) {   // the mining drones (2026-09-06): what we are doing right now, so "what are we doing" / "how is the mining going" answer from the live state
      const m = H.mining, pDoing = this.put("doing", ["activity", "doing now", "up to", "what we are doing", "busy with"]), pTake = this.put("mined so far", ["take", "haul", "mined", "earned mining"]);
      const drones = this.E("the mining drones", `${m.bots} drones launched from the ship`, ["drones", "mining bots", "bots", "the bots", "helpers", "miners"]);
      this.F(you, pDoing, this.E(m.cutting > 0 ? "mining" : (m.fetching > 0 ? "collecting gems" : "flying")), CFG.SRC_GAME, how);
      this.F(drones, pInst, this.E("mining drone", "a helper that cuts seams into rocks and fetches gems"), CFG.SRC_GAME, how);
      this.F(drones, pStatus, this.E(m.cutting > 0 ? `cutting a size-${m.rockScale} rock ${m.rockDist} units out, seam ${Math.round((m.seam || 0) * 100)}%` : (m.fetching > 0 ? "fetching gems" : "station-keeping beside the ship")), CFG.SRC_GAME, how);
      const take = this.E(`${m.rocksMined} rocks, ${m.gemsFetched} gems, ${m.creditsMined} credits`);
      this.F(drones, pTake, take, CFG.SRC_GAME, how);
      this.F(drones, this.put("mine", ["mines", "mined", "mining"]), take, CFG.SRC_GAME, how);   // the novel's own verb, so "what have the drones mined" lands on the tally
      if (m.gemBarPct != null) {   // the Starblast loop (STARBLAST_REQ.md, 2026-09-06): the bar, the banked points, the tier-up
        const bar = this.E("the gem bar", "the upgrade bar the mined gems fill; a full bar banks one upgrade point", ["gem bar", "upgrade bar", "the bar", "gems bar"]);
        this.F(bar, pStatus, this.E(`${m.gemBarPct}% full, ${m.upgradePts} upgrade point${m.upgradePts === 1 ? "" : "s"} banked${m.tierReady ? ", tier-up ready" : (m.statsMaxed ? ", every stat maxed" : "")}`), CFG.SRC_GAME, how);
        this.F(you, this.put("upgrade points", ["points", "banked points", "points banked", "upgrade point"]), this.E(`${m.upgradePts} upgrade point${m.upgradePts === 1 ? "" : "s"} banked - keys 1 to 8 spend one on a stat`), CFG.SRC_GAME, how);
      }
    }
    if (extra && extra.mission) { const m = extra.mission; const q = this.E("the current mission", `${m.type}: ${m.title}`, ["mission", "our mission", "the mission", "current contract"]);
      this.F(you, pMission, q, CFG.SRC_GAME, how); this.F(q, pInst, this.E(m.type), CFG.SRC_GAME, how); if (m.targetName) this.F(q, pTarget, this.E(m.targetName), CFG.SRC_GAME, how);
      this.F(q, pReward, this.E(m.reward + " credits"), CFG.SRC_GAME, how); if (m.why) for (const w of m.why) this.F(q, this.put("chosen because", ["why", "reason", "because"]), this.E(w), CFG.SRC_GAME, how); }
  }
}

/* ---- the world tier: anchor2's static store over HTTP ------------------------------------------------------- */
async function loadJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); }
async function loadGz(url, bytes) {
  const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  if (typeof DecompressionStream === "undefined") throw new Error("this browser has no DecompressionStream; the shards are gzip and cannot be read here");
  const buf = await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return bytes ? new Uint8Array(buf) : new TextDecoder().decode(buf);
}
class WorldTier {
  constructor(onEvent) { this.onEvent = onEvent; this.ready = false; this.why = "not probed yet"; this.url = CFG.WORLD_URL;
    this.learned = new Overlay({ load: () => { try { return localStorage.getItem(CFG.LEARNED_KEY); } catch (e) { return null; } }, save: s => { try { localStorage.setItem(CFG.LEARNED_KEY, s); } catch (e) {} } });
    this.store = new Store({ base: this.url, loadGz, loadJson, onEvent, overlay: this.learned }); this.reasoner = null; this.learner = null; }
  async probe() {
    try { await Promise.race([this.store.init(), new Promise((_, rej) => setTimeout(() => rej(new Error("no answer in " + CFG.WORLD_PROBE_MS + " ms")), CFG.WORLD_PROBE_MS))]);
      this.reasoner = new Reasoner(this.store); this.learner = new Learner(this.store, this.learned, { fetchJson: loadJson }); this.ready = true; this.why = "index loaded from " + this.url; }
    catch (e) { this.ready = false; this.why = `${this.url} unreachable (${e && e.message ? e.message : e}) - run D:/code/anchor2/serve.py to attach the world tier`; }
    return this.ready;
  }
}

/* ---- the brain ---------------------------------------------------------------------------------------------- */
const BRAIN = {
  ready: false, game: null, world: null, events: [], lastLive: -1e9, buildError: null,
  async init(host) {
    const onEvent = ev => { BRAIN.events.push(ev); if (BRAIN.events.length > 200) BRAIN.events.shift(); };
    this.game = new GameTier(onEvent); this.world = new WorldTier(onEvent);
    const canon = (typeof window !== "undefined" && window.PASSENGER && PASSENGER.canon) ? PASSENGER.canon() : null;
    try {
      const [novel, lore] = await Promise.all([loadJson(CFG.NOVEL_URL).catch(e => { onEvent({ kind: "note", what: "novel_graph.json: " + e.message }); return null; }), loadJson(CFG.LORE_URL).catch(e => { onEvent({ kind: "note", what: "lore_bios.json: " + e.message }); return null; })]);
      await this.game.build(novel, lore, canon);
      this.refreshLive(host);
      this.ready = true;
    } catch (e) { this.buildError = String(e && e.stack || e); console.error("[brain] game tier failed to build:", e); }
    this.world.probe().then(ok => console.log("[brain] world tier " + (ok ? "ATTACHED: " : "offline: ") + this.world.why));
    console.log(`[brain] game tier: ${Object.keys(this.game.ov.entities).length} entities, ${this.game.ov.facts.length} facts (novel ${this.game.counts.novel}, lore ${this.game.counts.lore}, live ${this.game.counts.live})`);
    return this;
  },
  refreshLive(host, extra) { if (!this.game) return; this.game.refreshLive(host || (typeof window !== "undefined" ? window.HOST : null), extra); this.lastLive = Date.now(); },
  status() { return { ready: this.ready, buildError: this.buildError, game: this.game ? { entities: Object.keys(this.game.ov.entities).length, facts: this.game.ov.facts.length, counts: this.game.counts, relations: Object.keys(this.game.index.props).length } : null,
    world: this.world ? { ready: this.world.ready, url: this.world.url, why: this.world.why, learned: this.world.learned.size } : null }; },
  learnedCount() { return this.world ? this.world.learned.size : 0; },
  /* ask both tiers; the transcript carries which tier each step came from */
  async ask(question, opts) {
    opts = opts || {}; const steps = []; const t0 = Date.now();
    const run = async (tier, gen) => { for await (const ev of gen) { steps.push({ tier, ...ev }); if (ev.step === "CONCLUDE") return ev; } return null; };
    let conclude = null, tier = null;
    if (this.game && this.game.reasoner) { if (typeof window !== "undefined" && Date.now() - this.lastLive > CFG.LIVE_REFRESH_S * 1000) this.refreshLive(window.HOST); conclude = await run("game", this.game.reasoner.ask(question, {})); if (conclude) tier = "game"; }
    // a name the GAME tier knows is a thing of this cockpit: if the game tier linked it and only lacked the relation,
    // the world tier's namesake (an album, a town) must not become the answer - it is offered as a different reading
    // "knows the subject" = the game tier's own refusal names a linked entity that merely lacks the relation ("X has no
    // Y edge in this store"); a two-name PATH refusal or an absent subject does not count, so "capital of France" still
    // reaches the libraries even though the novel happens to use the word "capital"
    const gameRefuse = steps.filter(s => s.tier === "game" && s.step === "REFUSE").pop();
    const gameLinked = !!(gameRefuse && /has no .+ edge in this store/.test(gameRefuse.text || ""));
    if (!conclude && this.world && this.world.ready) {
      const gen = opts.grow && this.world.learner ? this.world.reasoner.askGrow(question, this.world.learner, {}) : this.world.reasoner.ask(question, {});
      const wc = await run("world", gen);
      if (wc && gameLinked) { steps.push({ tier: "world", step: "NOTE", text: `set aside: the old libraries answer for a namesake (${wc.text.slice(0, 120)}), but the name in this question is a thing of this game, and the game holds no such fact` }); }
      else if (wc) { conclude = wc; tier = steps.some(s => s.tier === "world" && (s.step === "FETCH" || s.step === "LEARN" || s.step === "DERIVE")) ? "learned" : "world"; }
    }
    if (!conclude && gameLinked && gameRefuse) steps.push({ tier: "game", step: "REFUSE", text: gameRefuse.text });
    const ask = steps.filter(s => s.step === "ASK").pop(), refuse = steps.filter(s => s.step === "REFUSE").pop();
    return { question, answered: !!conclude, tier, reply: conclude ? conclude.text : null, ask: ask ? ask : null, refuse: refuse ? refuse.text : null, worldOffline: !(this.world && this.world.ready), worldWhy: this.world ? this.world.why : null, steps, ms: Date.now() - t0 };
  },
  /* mission choice: every reason is a number read from the board or the telemetry; the chosen mission's reasons become facts */
  chooseMission(cands, t) {
    if (!cands || !cands.length) return null;
    const hull = t && t.maxHull ? t.hull / t.maxHull : 1, wpn = (t && t.weaponLvl) || 1;
    const scored = cands.map(c => {
      const why = [], against = [];
      const distK = 1 / (1 + (c.dist || 0) / 400); why.push(`${c.dist != null ? Math.round(c.dist) + " units out" : "distance unknown"}`);
      let danger = 1; if (c.danger) { danger = 1 / (1 + c.danger * (hull < 0.6 ? 1.6 : 0.6)); against.push(`${c.danger} Synod ship${c.danger === 1 ? "" : "s"} near the target`); } else why.push("no Synod seen near the target");
      let fit = 1; if (c.type === "BOUNTY" || c.type === "ASSAULT") { if (wpn < 2 || hull < 0.5) { fit = 0.35; against.push(`a ${c.type.toLowerCase()} with a Lv${wpn} gun and ${Math.round(hull * 100)}% hull`); } else why.push(`your Lv${wpn} gun and ${Math.round(hull * 100)}% hull can take a ${c.type.toLowerCase()}`); }
      if (c.type === "PATROL" || c.type === "SUPPLY" || c.type === "ESCORT") why.push(`${c.type.toLowerCase()} pays ${c.reward}c without a fight`); else why.push(`pays ${c.reward}c`);
      const score = (c.reward || 1) * distK * danger * fit;
      return { c, score, why, against };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    const summary = best.why.join(", ") + (best.against.length ? "; the risk: " + best.against.join(", ") : "") + ".";
    const others = scored.slice(1).map(s => ({ idx: s.c.idx, title: s.c.title, why: (s.against.length ? s.against.join(", ") : `it scores ${Math.round(s.score)} against ${Math.round(best.score)} for ${best.c.title}`) }));
    const choice = { idx: best.c.idx, title: best.c.title, type: best.c.type, reward: best.c.reward, targetName: best.c.targetName, why: best.why, against: best.against, summary, others, score: Math.round(best.score) };
    if (this.game) this.refreshLive(typeof window !== "undefined" ? window.HOST : null, { mission: choice });
    return choice;
  },
};

if (typeof window !== "undefined") {
  window.BRAIN = BRAIN;
  const start = () => BRAIN.init(window.HOST).then(() => { if (window.PASSENGER && PASSENGER.onBrain) PASSENGER.onBrain(BRAIN); });
  if (window.HOST) start(); else window.addEventListener("load", () => setTimeout(start, 50));
}
export { BRAIN, CFG };
