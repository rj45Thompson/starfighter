/* learn.js - the growth loop. An abstain is not the end of a question; it is a transaction:
 *
 *   REFUSE (a specific missing fact)  ->  DERIVE it from what the store already holds (declared rules)
 *                                     ->  FETCH it live from wikidata.org (public API, no key)
 *                                     ->  ASK the reader the exact who / what / when / where question
 *   every fact learned by any of the three lands in the OVERLAY with its provenance, the store reads
 *   the overlay on every lookup from then on, and the question is asked again.
 *
 * Nothing learned is ever presented as more than it is: derived facts carry the chain and the
 * product of its measured hop probabilities; fetched facts say "wikidata.org, fetched <time>";
 * taught facts say "taught by the reader, unverified" until a second family agrees.
 */
import { normKey, fnv1a } from "./norm.js";
import * as L from "./lexicon.js";

const fnvLike = s => fnv1a(normKey(s) || s) || 1;   // stable private id for a reader-created thing

export const CFG = {
  MAX_ROUNDS: 3,          // growth rounds per question before the engine stops and says so
  DERIVE_DEPTH: 6,        // hops a derivation rule may walk
  FETCH_CLAIMS: 150,      // statements read per fetched entity (a bound, stated; the wanted property is read first)
  FETCH_SEARCH: 6,        // readings taken from a live name search
  LABEL_OBJECTS: 40,      // objects of a fetched item whose labels are looked up (wanted property first)
  WD_API: "https://www.wikidata.org/w/api.php",
};

/* ---- the overlay: learned facts, with provenance ------------------------------------------ */
export class Overlay {
  constructor({ load, save }) {
    this.load = load; this.save = save;       // () -> string | null ; (string) -> void
    this.facts = [];                          // {s,p,o,src,sup,label?,olabel?,how,at,chain?,p?,value?,iso?}
    this.entities = {};                       // qid -> {l, d, a:[]}
    const raw = load && load();
    if (raw) for (const ln of raw.split("\n")) { if (!ln.trim()) continue; const j = JSON.parse(ln); if (j.entity) this.entities[j.entity.qid] = j.entity; else this.facts.push(j); }
  }
  persist() { if (this.save) this.save([...Object.values(this.entities).map(e => JSON.stringify({ entity: e })), ...this.facts.map(f => JSON.stringify(f))].join("\n")); }
  addEntity(e) { this.entities[e.qid] = { ...(this.entities[e.qid] || {}), ...e }; this.persist(); }
  add(f) {
    const dup = this.facts.find(x => x.s === f.s && x.p === f.p && (x.o === f.o) && (x.value === f.value));
    if (dup) { dup.src |= f.src; dup.sup = (dup.sup || 1) + 1; this.persist(); return dup; }
    f.at = f.at || new Date().toISOString();
    this.facts.push(f); this.persist(); return f;
  }
  outOf(qid) { return this.facts.filter(f => f.s === qid && f.o != null); }
  inOf(qid) { return this.facts.filter(f => f.o === qid); }
  litsOf(qid) { return this.facts.filter(f => f.s === qid && f.o == null); }
  aliasesFor(key) {
    const out = [];
    for (const e of Object.values(this.entities)) {
      const forms = [e.l, ...(e.a || [])].filter(Boolean);
      if (forms.some(x => normKey(x) === key)) out.push({ qid: e.qid, deg: this.outOf(e.qid).length + this.inOf(e.qid).length, kind: normKey(e.l) === key ? 0 : 2, desc: e.d || null, learned: true });
    }
    return out;
  }
  get size() { return this.facts.length; }
  dump() { return [...Object.values(this.entities).map(e => JSON.stringify({ entity: e })), ...this.facts.map(f => JSON.stringify(f))].join("\n"); }
}

/* ---- the question the engine asks back, by property ---------------------------------------- */
export function questionFor(store, entityLabel, entityDesc, pid) {
  const pl = store.propLabel(pid);
  const who = L.ASK_WHO.has(pid), when = L.ASK_WHEN.has(pid), where = L.ASK_WHERE.has(pid);
  const subj = `${entityLabel}${entityDesc ? ` (${entityDesc})` : ""}`;
  if (when) return `When: what is the ${pl} of ${subj}?`;
  if (where) return `Where: what is the ${pl} of ${subj}?`;
  if (who) return `Who: who is the ${pl} of ${subj}?`;
  return `What: what is the ${pl} of ${subj}?`;
}

export class Learner {
  constructor(store, overlay, { fetchJson } = {}) {
    this.store = store; this.overlay = overlay;
    // Wikimedia asks clients to identify themselves; node can send a User-Agent (browsers send
    // their own). One retry after a 429, waiting what the server asks or 3 s.
    this.fetchJson = fetchJson || (async (url) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetch(url, { headers: { "User-Agent": "anchor2/0.1 (research demo; https://github.com/rj45Thompson) node", "Accept": "application/json" } });
        if (r.status === 429 && attempt === 0) { const wait = Number(r.headers.get("retry-after")) || 3; await new Promise(res => setTimeout(res, wait * 1000)); continue; }
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json();
      }
    });
  }

  /* ---- 1. DERIVE: declared rules over the store ------------------------------------------ */
  async *derive(qid, pid) {
    const rules = L.DERIVE_RULES.filter(r => r.target === pid);
    if (!rules.length) { yield { step: "NOTE", text: `no derivation rule for ${this.store.propLabel(pid)} (rules are listed under hand-written)` }; return null; }
    for (const rule of rules) {
      yield { step: "DERIVE", text: `rule: ${rule.why}` };
      // walk `via` relations from qid until a node carries `target`; product of hop confidences
      const start = await this.store.entity(qid);
      if (!start) return null;
      let frontier = [{ rec: start, chain: [] }]; const seen = new Set([qid]);
      for (let d = 0; d < CFG.DERIVE_DEPTH && frontier.length; d++) {
        const next = [];
        for (const f of frontier) {
          for (const e of f.rec.out) {
            if (!rule.via.includes(e[0]) || seen.has(e[1])) continue;
            seen.add(e[1]);
            const nrec = await this.store.entity(e[1]); if (!nrec) continue;
            const chain = [...f.chain, { from: f.rec.qid, fromLabel: f.rec.label, pid: e[0], to: e[1], label: e[4] || nrec.label, src: e[2] }];
            const hit = nrec.out.filter(x => x.length && x[0] === rule.target);
            if (hit.length) {
              const last = hit.sort((a, b) => b[3] - a[3])[0];
              const full = [...chain, { from: nrec.qid, fromLabel: nrec.label, pid: rule.target, to: last[1], label: last[4], src: last[2] }];
              const p = full.reduce((acc, h) => { const c = this.store.confOf(h.src); return acc * (c.p != null ? c.p : (c.wikidata ? 1 : 0.5)); }, 1);
              const fact = this.overlay.add({ s: qid, p: rule.target, o: last[1], olabel: last[4], src: L.SRC_DERIVED, sup: 1, how: "derived", p_est: p,
                                              chain: full.map(h => `${h.fromLabel || "Q" + h.from} -${this.store.propLabel(h.pid)}-> ${h.label || "Q" + h.to}`) });
              yield { step: "DERIVE", text: `${start.label} -${this.store.propLabel(rule.target)}-> ${last[4] || "Q" + last[1]}  DERIVED via ${fact.chain.join("  ;  ")}  (product of hop probabilities ${(p * 100).toFixed(1)}%, Wikidata-only hops counted as 1 - an assumption, stated)`, fact };
              return fact;
            }
            next.push({ rec: nrec, chain });
          }
        }
        frontier = next;
        yield { step: "CHECK", text: `derivation depth ${d + 1}: ${next.length} node${next.length === 1 ? "" : "s"} reached, none carries ${this.store.propLabel(rule.target)} yet` };
      }
      yield { step: "BACKTRACK", text: `rule exhausted within ${CFG.DERIVE_DEPTH} hops - nothing derivable` };
    }
    return null;
  }

  /* ---- 2. FETCH: wikidata.org live ---------------------------------------------------------- */
  async wd(params) {
    const u = CFG.WD_API + "?format=json&origin=*&" + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return this.fetchJson(u);
  }

  async *fetchEntity(qid, opts = {}) {
    const t = Date.now();
    if (Number(qid) < 0) { yield { step: "NOTE", text: `Q${qid} is a reader-created thing (negative id) - it has no wikidata.org record to fetch` }; return null; }
    const prior = this.overlay.entities[qid];
    if (prior && prior.fetchedAt && !opts.force) {
      yield { step: "NOTE", text: `Q${qid} was already fetched from wikidata.org at ${prior.fetchedAt} (${prior.fetchedStatements} statements) - not fetching again; what it lacks, it lacks there too` };
      return { qid, label: prior.l, desc: prior.d, edges: this.overlay.outOf(qid).map(f => ({ pid: f.p, o: f.o })), lits: this.overlay.litsOf(qid).map(f => ({ pid: f.p })) , cached: true };
    }
    let j;
    try { j = await this.wd({ action: "wbgetentities", ids: "Q" + qid, props: "labels|descriptions|aliases|claims", languages: "en" }); }
    catch (err) { yield { step: "FETCH", text: `wikidata.org unreachable: ${err.message}` }; return null; }
    const ent = j.entities && j.entities["Q" + qid];
    if (!ent || ent.missing !== undefined) { yield { step: "FETCH", text: `wikidata.org has no item Q${qid}` }; return null; }
    const label = ent.labels && ent.labels.en && ent.labels.en.value;
    const desc = ent.descriptions && ent.descriptions.en && ent.descriptions.en.value;
    const aliases = (ent.aliases && ent.aliases.en || []).map(a => a.value);
    this.overlay.addEntity({ qid, l: label, d: desc, a: aliases, fetchedAt: new Date().toISOString(), fetchedStatements: Object.values(ent.claims || {}).reduce((a, x) => a + x.length, 0) });
    // claims -> item edges and time / quantity literals. The property the question needs (opts.want)
    // is read FIRST, so the statement bound can never hide the one fact the engine came for.
    const claims = ent.claims || {}; const objs = new Set(); const edges = []; const lits = [];
    let n = 0, total = 0;
    const order = Object.entries(claims).sort((a, b) => (Number(b[0].slice(1)) === opts.want ? 1 : 0) - (Number(a[0].slice(1)) === opts.want ? 1 : 0));
    for (const [pidS, arr] of order) {
      const pid = Number(pidS.slice(1));
      for (const c of arr) {
        total++;
        if (n >= CFG.FETCH_CLAIMS) continue;
        const dv = c.mainsnak && c.mainsnak.datavalue; if (!dv) continue;
        // the "point in time" qualifier (P585) dates a value: a population is a population AS OF a year
        const q585 = c.qualifiers && c.qualifiers.P585 && c.qualifiers.P585[0] && c.qualifiers.P585[0].datavalue;
        const asof = q585 && q585.value && q585.value.time ? q585.value.time.replace(/^\+/, "").replace(/T.*$/, "").replace(/-00-00$/, "").replace(/-00$/, "") : null;
        const isoOf = t => t.replace(/^\+/, "").replace(/T.*$/, "").replace(/-00-00$/, "").replace(/-00$/, "");
        if (dv.type === "wikibase-entityid" && dv.value.id && dv.value.id[0] === "Q") { edges.push({ pid, o: Number(dv.value.id.slice(1)) }); objs.add(Number(dv.value.id.slice(1))); n++; }
        else if (dv.type === "time") { lits.push({ pid, iso: isoOf(dv.value.time), value: dv.value.time, asof }); n++; }
        else if (dv.type === "quantity") { lits.push({ pid, iso: null, value: String(dv.value.amount).replace(/^\+/, ""), asof }); n++; }
      }
    }
    // labels for the objects: the wanted property's objects plus the first LABEL_OBJECTS others,
    // batched 50 per call (the API's limit). The rest keep their Q-id until they are looked at;
    // a store that fetches every label of every fetched item gets rate-limited, and rightly so.
    const olabel = {};
    const wantedObjs = edges.filter(e => e.pid === opts.want).map(e => e.o);
    const ids = [...new Set([...wantedObjs, ...objs])].slice(0, CFG.LABEL_OBJECTS);
    if (objs.size > ids.length) yield { step: "NOTE", text: `${objs.size - ids.length} of the fetched objects keep their Q-id for now (label lookups bounded at ${CFG.LABEL_OBJECTS})` };
    for (let i = 0; i < ids.length; i += 50) {
      try {
        const jj = await this.wd({ action: "wbgetentities", ids: ids.slice(i, i + 50).map(q => "Q" + q).join("|"), props: "labels|descriptions", languages: "en" });
        for (const [k, v] of Object.entries(jj.entities || {})) {
          const q = Number(k.slice(1)); olabel[q] = v.labels && v.labels.en && v.labels.en.value;
          this.overlay.addEntity({ qid: q, l: olabel[q], d: v.descriptions && v.descriptions.en && v.descriptions.en.value });
        }
      } catch (err) { yield { step: "FETCH", text: `object labels: ${err.message}` }; }
    }
    for (const e of edges) this.overlay.add({ s: qid, p: e.pid, o: e.o, olabel: olabel[e.o] || null, src: L.SRC_LIVE, sup: 1, how: "fetched" });
    for (const v of lits) this.overlay.add({ s: qid, p: v.pid, o: null, value: v.value, iso: v.iso, asof: v.asof || null, src: L.SRC_LIVE, sup: 1, how: "fetched" });
    yield { step: "FETCH", text: `wikidata.org Q${qid} "${label}" (${desc || "no description"}): ${edges.length} item facts + ${lits.length} dated or measured values read of ${total} statements${total > n ? ` (${CFG.FETCH_CLAIMS} statement bound${opts.want ? `, ${this.store.propLabel(opts.want)} read first` : ""})` : ""}, ${Date.now() - t} ms - all added to the overlay with source wikidata.org`, fetched: { qid, label, desc, edges: edges.length, lits: lits.length } };
    return { qid, label, desc, edges, lits };
  }

  async *fetchByName(text) {
    let j;
    try { j = await this.wd({ action: "wbsearchentities", search: text, language: "en", limit: CFG.FETCH_SEARCH, type: "item" }); }
    catch (err) { yield { step: "FETCH", text: `wikidata.org search unreachable: ${err.message}` }; return []; }
    const hits = (j.search || []).map(h => ({ qid: Number(h.id.slice(1)), label: h.label, desc: h.description || null }));
    yield { step: "FETCH", text: `wikidata.org search "${text}": ${hits.length} item${hits.length === 1 ? "" : "s"}` + (hits.length ? " - " + hits.map(h => `${h.label} (${h.desc || "no description"})`).join("; ") : " - the name is unknown there too"), hits };
    return hits;
  }

  /* ---- 3. ASK the reader: the exact question ---------------------------------------------- */
  askBack(entityLabel, entityDesc, pid, qid) {
    return { step: "ASK", text: questionFor(this.store, entityLabel, entityDesc, pid) + "  (answer in the box below; the fact is kept with you as its source)", teach: { pid, entityLabel, qid } };
  }

  /* the reader answered in words: link the answer, add the fact, report what was learned */
  async *teach(qid, entityLabel, pid, answerText) {
    // a number or a date is a literal answer (population, date of birth): kept as a value
    const numeric = /^[0-9][0-9,. ]*$/.test(answerText.trim());
    const dateish = /^\d{1,4}(-\d{2}){0,2}$|^\d{1,2} [A-Za-z]+ \d{1,4}( BC| BCE)?$/.test(answerText.trim());
    if (numeric || dateish) {
      const f = this.overlay.add({ s: qid, p: pid, o: null, value: answerText.trim(), iso: dateish ? answerText.trim() : null, src: L.SRC_READER, sup: 1, how: "taught" });
      yield { step: "LEARN", text: `${entityLabel} ${this.store.propLabel(pid)} = ${answerText.trim()}  taught by the reader - unverified until another family agrees`, fact: f };
      return f;
    }
    const cands = await this.store.candidates(answerText);
    if (!cands.length) {
      yield { step: "NOTE", text: `"${answerText}" names nothing in the store or the overlay - looking it up live first` };
      const hits = yield* this.fetchByName(answerText);
      if (hits.length) { for (const h of hits.slice(0, 1)) { yield* this.fetchEntity(h.qid); } return yield* this.teach(qid, entityLabel, pid, answerText); }
      // unknown everywhere: the reader's word stands, as a reader-created thing with a private id
      const nq = -Math.abs(fnvLike(answerText));
      this.overlay.addEntity({ qid: nq, l: answerText.trim(), d: "reader-created; no public record", a: [] });
      const f = this.overlay.add({ s: qid, p: pid, o: nq, olabel: answerText.trim(), src: L.SRC_READER, sup: 1, how: "taught" });
      yield { step: "LEARN", text: `${entityLabel} -${this.store.propLabel(pid)}-> ${answerText.trim()}  taught by the reader; "${answerText.trim()}" is not on wikidata.org either, so it is recorded as a reader-created thing (private id ${nq}) - unverified`, fact: f };
      return f;
    }
    if (cands.length > 1) { yield { step: "ASK", text: `"${answerText}" has ${cands.length} readings - which one?`, options: cands.map(c => ({ qid: c.qid, label: c.label || answerText, desc: c.desc, deg: c.deg })), teachPick: { qid, pid, answerText } }; return null; }
    const o = cands[0];
    const f = this.overlay.add({ s: qid, p: pid, o: o.qid, olabel: o.label || answerText, src: L.SRC_READER, sup: 1, how: "taught" });
    yield { step: "LEARN", text: `${entityLabel} -${this.store.propLabel(pid)}-> ${f.olabel}  taught by the reader - unverified until another family agrees`, fact: f };
    return f;
  }
}
