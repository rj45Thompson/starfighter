/* reason.js - runs a plan against the store and narrates what it does, as an async generator of
 * events. Every event is emitted by the code that did the step. The page renders the events; the
 * node harness prints them. Event: { step, text, ...data }.
 *
 * steps: RESTATE LINK PLAN LOOKUP CHECK BACKTRACK CONCLUDE REFUSE ASK NOTE COUNT
 */
import { Planner } from "./plan.js";
import { normKey } from "./norm.js";
import { edgeConfidence, chainConfidence, sourceNames } from "./confidence.js";
import { CFG as LCFG } from "./learn.js";
import * as L from "./lexicon.js";

const CFG = {
  LINK_TRY: 8,        // candidate readings of a mention whose records are fetched to test viability
  BRANCH: 4,          // viable readings followed in parallel before asking back
  OBJ_PER_HOP: 6,     // objects per hop kept as branches (best-supported first)
  RIVALS_SHOWN: 5,
  DEFINE_EDGES: 10,
  COUNT_READ: 400,    // members whose records are opened when a filter must be tested
  COUNT_EXPAND: 80,   // direct members whose own members are gathered for a depth-2 count (taxa, subclasses)
  ISA_DEPTH: 8,       // taxonomies are deep: grizzly -> brown bear -> Ursus -> Ursidae -> ... -> Mammalia
  PATH_FANOUT: 40,
  PATH_READINGS: 2,   // readings of the first name tried for a connection
  WHERE_EDGES: 3,     // edges shown per rung of the location ladder
  KIND_DEPTH: 3,      // subclass-of steps climbed when checking "is this a <country>"
  NAME_SCAN: 60,      // members whose name/description is scanned for an untestable filter's words
};

const lab = (store, qid, fallback) => fallback || ("Q" + qid);

export class Reasoner {
  constructor(store) { this.store = store; this.planner = new Planner(store.index); }

  /* ask, and when the store cannot answer, GROW: derive the missing fact from recorded facts,
   * fetch it live from wikidata.org, or ask the reader the exact question - then ask again.
   * Bounded (LCFG.MAX_ROUNDS) and every round is narrated. The reader's answer arrives through
   * learner.teach() from the page; this generator ends at the ASK and the page re-asks. */
  async *askGrow(question, learner, opts) {
    let rounds = 0;
    while (true) {
      let refuse = null, plan = null;
      for await (const ev of this.ask(question, opts)) {
        yield ev;
        if (ev.step === "RESTATE") plan = ev.plan;
        if (ev.step === "REFUSE") refuse = ev;
      }
      if (!refuse || !learner) return;
      if (rounds >= LCFG.MAX_ROUNDS) { yield { step: "NOTE", text: `stopped growing after ${rounds} rounds (a bound) - the question stays unanswered` }; return; }
      rounds++;
      let learned = 0;
      if (refuse.missing) {
        const { qid, pid, label, desc } = refuse.missing;
        yield { step: "GROW", text: `round ${rounds}: the missing fact is ${label || "Q" + qid} -${this.store.propLabel(pid)}-> ?  - trying to derive it, then to fetch it, then asking` };
        const f = yield* learner.derive(qid, pid);
        if (f) learned++;
        if (!learned) {
          const r = yield* learner.fetchEntity(qid, { want: pid });
          if (r && (r.edges.some(e => e.pid === pid) || r.lits.some(v => v.pid === pid))) learned++;
          else if (r) yield { step: "NOTE", text: `wikidata.org records no ${this.store.propLabel(pid)} for ${label || "Q" + qid} either` };
        }
        if (!learned) { yield learner.askBack(label || "Q" + qid, desc, pid, qid); return; }
      } else if (refuse.reason === "subject absent" && plan && plan.entity) {
        yield { step: "GROW", text: `round ${rounds}: "${plan.entity}" is not in the store - searching wikidata.org for it` };
        const hits = yield* learner.fetchByName(plan.entity);
        for (const h of hits.slice(0, LCFG.FETCH_SEARCH)) { const r = yield* learner.fetchEntity(h.qid); if (r) learned++; }
        if (!learned) { yield { step: "ASK", text: `What is "${plan.entity}"? Nothing in the store or on wikidata.org carries that name. If it is a real thing, tell me what it is (a place, a person, ...) and one fact about it.`, teachEntity: { text: plan.entity } }; return; }
      } else {
        return;   // a refusal with no specific missing fact (untestable filter, pronoun...) is final
      }
      yield { step: "GROW", text: `learned ${learned} fact${learned === 1 ? "" : "s"} (overlay now holds ${learner.overlay.size}) - asking again` };
    }
  }

  /* opts.force: { normalisedMention: qid } - a reading the reader picked by clicking; the LINK
   * step then uses that entity only and says so. */
  async *ask(question, opts) {
    this.opts = opts || {};
    const plan = this.planner.plan(question);
    plan.raw = question; this.lastDead = null;
    // a name with a joining word inside it ("Statue of Christopher Columbus"): the longest joined
    // form the store knows wins over the fragment the planner kept
    if (plan.entityAlts && plan.entityAlts.length) {
      for (const alt of plan.entityAlts) {
        if ((await this.store.candidates(alt)).length) {
          const words = new Set(alt.split(" "));
          const samePlain = alt.replace(/[,;:"()]/g, " ").replace(/(\w)'s\b/g, "$1").replace(/\s+/g, " ").trim() === plan.entity;
          plan.notes = [...(plan.notes || []), samePlain
            ? `subject read as "${alt}" - the recorded name keeps its punctuation, which the question's words had lost`
            : `subject read as "${alt}" - the joined form is a recorded name; "${plan.entity}" alone was a fragment of it`];
          plan.unplaced = (plan.unplaced || []).filter(w => !w.split(" ").every(x => words.has(x)));
          plan.restate = plan.restate ? plan.restate.replace(`"${plan.entity}"`, `"${alt}"`) : plan.restate;
          plan.entity = alt;
          break;
        }
      }
    }
    yield { step: "RESTATE", text: `"${question}" -> ${plan.restate || plan.shape}`, plan };
    for (const n of plan.notes || []) yield { step: "NOTE", text: n };
    if (plan.unplaced && plan.unplaced.length) yield { step: "NOTE", text: `could not place: ${plan.unplaced.map(w => `"${w}"`).join(", ")} - these words are not in the plan`, unplaced: plan.unplaced };
    switch (plan.shape) {
      case "EMPTY": yield { step: "REFUSE", text: "no subject could be read from that question", reason: "no subject" }; return;
      case "COUNT": yield* this.count(plan); return;
      case "DEFINE": yield* this.define(plan); return;
      case "ISA": yield* this.isa(plan); return;
      case "PATH": yield* this.path(plan); return;
      case "EXISTS": yield* this.exists(plan); return;
      case "WHEN": yield* this.when(plan); return;
      case "WHERE": yield* this.where(plan); return;
      default: yield* this.chain(plan); return;
    }
  }

  /* ---- linking: a mention -> viable readings, with descriptions ------------------------------ */
  async *link(text, need) {
    // need: { pid } the first hop the reading must carry, or null
    let cands = await this.store.candidates(text);
    const forced = this.opts && this.opts.force && this.opts.force[normKey(text)];
    if (forced) {
      const pick = cands.filter(c => c.qid === Number(forced));
      yield { step: "NOTE", text: `reading of "${text}" fixed by the reader: Q${forced}` + (pick.length ? "" : " (not among the indexed readings of that name - used anyway, as asked)") };
      cands = pick.length ? pick : [{ qid: Number(forced), deg: 0, kind: 0, desc: null }];
    }
    if (!cands.length) {
      const exists = await this.store.mightExist(text);
      yield { step: "LINK", text: `"${text}": no entity carries that name` + (exists ? " (filter says maybe; the alias index says no)" : " - PROVEN absent by the Bloom filter (zero false negatives)"), cands: [] };
      return [];
    }
    const tried = cands.slice(0, CFG.LINK_TRY);
    const recs = [];
    for (const c of tried) {
      const r = await this.store.entity(c.qid);
      if (!r) continue;
      let viable = true, why = "";
      if (need && (need.hop != null || need.pid)) {
        const hop = need.hop != null ? need.hop : need.pid; const pid = this.hopPid(hop);
        const has = this.hopEdges(r, hop).length > 0 || r.lits.some(v => v[0] === pid);
        viable = has; why = has ? `has ${this.store.propLabel(pid)}${typeof hop === "object" && hop.inv ? " (backwards)" : ""}` : `no ${this.store.propLabel(pid)} edge`;
      }
      recs.push({ ...c, rec: r, viable, why });
    }
    const viable = recs.filter(x => x.viable);
    yield { step: "LINK", text: `"${text}": ${cands.length} reading${cands.length === 1 ? "" : "s"}` +
            (cands.length > tried.length ? ` (opened the ${tried.length} best-connected, ${cands.length - tried.length} not opened - a bound)` : "") +
            (need ? `; ${viable.length} carr${viable.length === 1 ? "ies" : "y"} the relation the plan needs` : ""),
            cands: recs.map(x => ({ qid: x.qid, label: x.rec.label, desc: x.rec.desc, deg: x.deg, viable: x.viable, why: x.why })),
            total: cands.length };
    return viable.length ? viable : recs;
  }

  inverseUsable(pid) { return L.SYMMETRIC.has(pid); }   // only a symmetric relation reads the same backwards

  /* Is this record the kind of thing the question named ("country")? Its instance-of classes, and
   * their subclass-of ancestors up to KIND_DEPTH, against the classes that name carries
   * ("sovereign state" is a subclass of "country", so Canada is a country). */
  async isKind(rec, hintText) {
    const hintKey = normKey(hintText);
    const hintCands = await this.store.candidates(hintText);
    const hintQids = new Set(hintCands.slice(0, 5).map(c => c.qid));
    const types = rec.out.filter(x => x[0] === 31).map(x => ({ qid: x[1], label: x[4] || "Q" + x[1] }));
    const labels = types.map(t => t.label);
    let frontier = types.map(t => ({ qid: t.qid, path: [t.label] })); const seen = new Set(frontier.map(f => f.qid));
    for (let d = 0; d <= CFG.KIND_DEPTH && frontier.length; d++) {
      for (const f of frontier) {
        const last = normKey(f.path[f.path.length - 1]) || "";
        if (hintQids.has(f.qid) || last === hintKey || last.endsWith(" " + hintKey)) return { ok: true, types: labels, via: f.path.length > 1 ? f.path.join(" -subclass of-> ") : null };
      }
      if (d === CFG.KIND_DEPTH) break;
      const next = [];
      for (const f of frontier) {
        const r = await this.store.entity(f.qid); if (!r) continue;
        for (const e of r.out) if (e[0] === 279 && !seen.has(e[1])) { seen.add(e[1]); next.push({ qid: e[1], path: [...f.path, e[4] || "Q" + e[1]] }); }
      }
      frontier = next;
    }
    // the kind named by a relation: being the object of many `country` facts makes a country
    const rel = L.KIND_BY_RELATION[hintKey];
    if (rel) {
      const n = (rec.inTotal && rec.inTotal[String(rel)]) || rec.inn.filter(e => e[0] === rel).length;
      if (n > 0) return { ok: true, types: labels, via: `it is the ${this.store.propLabel(rel)} of ${n.toLocaleString()} recorded thing${n === 1 ? "" : "s"}` };
    }
    return { ok: false, types: labels, via: null };
  }

  /* edges of one hop from a record: out-edges with pid; for a SYMMETRIC relation only, in-edges
   * stand in when there is no out-edge (and the transcript says "read backwards"). A hop given as
   * {pid, inv:true} ("the country whose capital is Ottawa") reads the declared inverse property's
   * out-edges if Wikidata declares one, else the in-edges of pid - the transcript says which. */
  hopPid(h) { return typeof h === "object" ? h.pid : h; }
  hopEdges(rec, h) {
    const pid = this.hopPid(h);
    if (typeof h === "object" && h.inv) {
      const p = this.store.prop(pid); const inv = p && p.inv;
      const viaInv = inv ? rec.out.filter(e => e[0] === inv).map(e => ({ pid: inv, from: rec.qid, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "out" })) : [];
      if (viaInv.length) return viaInv;
      return rec.inn.filter(e => e[0] === pid).map(e => ({ pid, from: rec.qid, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "in" }));
    }
    // a hop with alternatives ({pid, alts}) or a relation in ALT_HOPS: the first that has edges
    // answers, and the edge carries the pid that actually matched (the transcript prints it)
    const alts = (typeof h === "object" && h.alts) || L.ALT_HOPS[pid] || [];
    for (const p of [pid, ...alts]) {
      const out = rec.out.filter(e => e[0] === p).map(e => ({ pid: p, from: rec.qid, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "out" }));
      if (out.length) return out;
    }
    if (!L.SYMMETRIC.has(pid)) return [];
    return rec.inn.filter(e => e[0] === pid).map(e => ({ pid, from: rec.qid, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "in" }));
  }

  fmtEdge(e) {
    const c = edgeConfidence(e.src, this.store.index);
    const srcs = sourceNames(e.src, this.store.index).join(", ");
    const pl = this.store.propLabel(e.pid);
    const arrow = e.dir === "out" ? `-${pl}->` : e.dir === "lit" ? `${pl} =` : `<-${pl}- (read backwards)`;
    const target = e.dir === "lit" ? e.label : lab(this.store, e.to, e.label);
    return { text: `${lab(this.store, e.from, e.fromLabel)} ${arrow} ${target}  [${srcs}] ${c.wikidata ? "Wikidata" : ""}${c.k ? ` +${c.k} independent` : ""}${c.p != null ? ` -> ${(c.p * 100).toFixed(1)}%` : ""}`, conf: c, srcs };
  }

  /* ---- LOOKUP / CHAIN ------------------------------------------------------------------------ */
  async *chain(plan) {
    const readings = yield* this.link(plan.entity, { hop: plan.hops[0] });
    if (!readings.length) { yield { step: "REFUSE", text: `no entity named "${plan.entity}" in this store`, reason: "subject absent" }; return; }
    const viable = readings.filter(r => r.viable);
    if (!viable.length) {
      const r0 = readings[0];
      yield { step: "REFUSE", text: `${r0.rec.label || "Q" + r0.qid} (${r0.rec.desc || "no description"}) has no ${this.store.propLabel(this.hopPid(plan.hops[0]))} edge in this store - the missing fact is exactly that edge` +
              (readings.length > 1 ? `; none of the ${readings.length} readings opened has it either` : ""), reason: "missing edge", missing: { qid: r0.qid, pid: this.hopPid(plan.hops[0]), label: r0.rec.label, desc: r0.rec.desc } };
      return;
    }
    const branches = viable.slice(0, CFG.BRANCH);
    if (viable.length > CFG.BRANCH) yield { step: "NOTE", text: `${viable.length} readings carry the relation; following the ${CFG.BRANCH} best-connected (a bound)` };
    const results = [];   // {reading, hops:[edge...], conf}
    for (const b of branches) {
      yield { step: "PLAN", text: `reading ${b.rec.label || "Q" + b.qid} (${b.rec.desc || "no description"}): ` + plan.hops.map((p, i) => `hop ${i + 1} ${this.store.propLabel(this.hopPid(p))}${typeof p === "object" && p.inv ? " (backwards)" : ""}`).join(", ") };
      yield* this.walk(b.rec, plan.hops, [], results, b, plan);
    }
    if (!results.length) {
      // the last hop that failed on the best reading is the specific missing fact
      const dead = this.lastDead;
      yield { step: "REFUSE", text: "every route died before the last hop; the dead ends are listed above" + (dead ? ` - the nearest missing fact is ${dead.label} -${this.store.propLabel(dead.pid)}-> ?` : ""), reason: "no complete chain", missing: dead || undefined };
      return;
    }
    // rank: complete chains by composed confidence (measured ones first), then by total support
    for (const r of results) { r.cc = chainConfidence(r.hops); r.sup = r.hops.reduce((a, h) => a + h.sup, 0); r.kmin = Math.min(...r.hops.map(h => h.conf.k)); }
    // dated literal values keep their most-recent-first order; everything else ranks by confidence
    results.sort((a, b) => { const la = a.hops[a.hops.length - 1], lb = b.hops[b.hops.length - 1];
      if (la.dir === "lit" && lb.dir === "lit" && (la.asof || lb.asof)) return String(lb.asof || "").localeCompare(String(la.asof || ""));
      // chains the curve can vouch for on EVERY hop rank first (fewest unscored, then fewest
      // unverified hops); only then the product - a chain with a hop the curve cannot score must
      // not outrank a fully scored one merely because that hop contributed a factor of 1
      return (a.cc.unscored - b.cc.unscored) || (a.cc.unknown - b.cc.unknown) || (b.cc.p ?? -1) - (a.cc.p ?? -1) || b.cc.wd - a.cc.wd || b.kmin - a.kmin || b.sup - a.sup; });
    const endKey = r => { const h = r.hops[r.hops.length - 1]; return h.dir === "lit" ? "lit:" + h.label : h.to; };
    const endLabel = r => { const h = r.hops[r.hops.length - 1]; return h.label || "Q" + h.to; };
    const distinctAnswers = new Set(results.map(endKey));
    // RANK: every distinct answer with its best probability, not one answer as the truth
    const bestByAnswer = new Map();
    for (const r of results) { const k = endKey(r); if (!bestByAnswer.has(k)) bestByAnswer.set(k, r); }
    const ranked = [...bestByAnswer.values()];
    yield { step: "RANK", text: `${results.length} complete chain${results.length === 1 ? "" : "s"}, ${ranked.length} distinct answer${ranked.length === 1 ? "" : "s"}: ` +
            ranked.slice(0, CFG.RIVALS_SHOWN + 1).map(r => `${endLabel(r)} ${r.cc.p != null ? (r.cc.p * 100).toFixed(1) + "%" + (r.cc.unscored ? ` over ${r.cc.scored} of ${r.hops.length} hops (${r.cc.unscored} on Wikidata alone)` : "") : r.cc.unknown ? "unverified (taught or derived)" : "recorded, not scored"} (via ${r.reading.rec.label}${r.reading.rec.desc ? ", " + r.reading.rec.desc : ""})`).join(" · ") +
            (ranked.length > CFG.RIVALS_SHOWN + 1 ? ` · ${ranked.length - CFG.RIVALS_SHOWN - 1} more` : ""),
            ranked: ranked.map(r => ({ answer: endLabel(r), p: r.cc.p, via: r.reading.rec.label, desc: r.reading.rec.desc })) };
    // CONTEXT: when readings disagree, which reading fits the question? Three declared criteria,
    // in order: words of the question that match a reading's description; the measured kind of
    // thing that carries the first relation; and only then the best-connected reading (a prior).
    const byReading = new Map();
    for (const r of results) { const k = r.reading.qid; if (!byReading.has(k)) byReading.set(k, r); }
    let chosen = null, decidedBy = null;
    if (byReading.size > 1 && new Set([...byReading.values()].map(endKey)).size > 1) {
      // context words: the question minus its framing, minus the subject's own words, minus the
      // relation words (they name what is asked, not which reading is meant)
      const qWords = new Set((normKey(plan.raw || "") || "").split(" ").filter(w => w.length > 2 && !L.FRAMING.has(w) && !(normKey(plan.entity) || "").split(" ").includes(w) && !(plan.relWords || []).includes(w)));
      const types = this.store.propTypes && this.store.propTypes[String(this.hopPid(plan.hops[0]))];
      const scored = [...byReading.values()].map(r => {
        const hay = normKey((r.reading.rec.desc || "") + " " + (r.reading.rec.aliases || []).join(" ")) || "";
        const ctx = [...qWords].filter(w => hay.includes(w));
        const typed = types ? r.reading.rec.types.some(t => types.some(x => x[0] === t)) : null;
        return { r, ctx, typed, deg: r.reading.deg };
      });
      const withCtx = scored.filter(s => s.ctx.length);
      if (withCtx.length === 1) { chosen = withCtx[0].r; decidedBy = `the question's own words (${withCtx[0].ctx.map(w => `"${w}"`).join(", ")}) match the description of ${chosen.reading.rec.label} (${chosen.reading.rec.desc})`; }
      else if (types && scored.filter(s => s.typed).length === 1) { chosen = scored.find(s => s.typed).r; decidedBy = `only ${chosen.reading.rec.label} is the measured kind of thing that carries ${this.store.propLabel(this.hopPid(plan.hops[0]))} (${types.slice(0, 3).map(x => x[2] || "Q" + x[0]).join(", ")}...)`; }
      yield { step: "CONTEXT", text: (chosen ? `reading chosen: ${chosen.reading.rec.label} - ${decidedBy}` : `nothing in the question picks a reading; the best-connected reading (${byReading.values().next().value.reading.rec.label}, ${byReading.values().next().value.reading.deg} facts) leads, which is a prior, not evidence - so I ask`) +
              "; scored: " + scored.map(s => `${s.r.reading.rec.label}[words ${s.ctx.length}${s.typed != null ? ", kind " + (s.typed ? "yes" : "no") : ""}, ${s.deg} facts]`).join(" · "), decidedBy: decidedBy || "prior" };
      if (!chosen) {
        yield { step: "ASK", text: `"${plan.entity}" has more than one reading and they end at different answers - which did you mean?`,
                options: [...byReading.values()].map(r => ({ qid: r.reading.qid, label: r.reading.rec.label, desc: r.reading.rec.desc, answer: endLabel(r), p: r.cc.p })) };
      }
    }
    if (chosen) results.sort((a, b) => (a.reading.qid === chosen.reading.qid ? 0 : 1) - (b.reading.qid === chosen.reading.qid ? 0 : 1));
    const best = results[0];
    const ans = best.hops[best.hops.length - 1];
    yield { step: "CONCLUDE", text: `${ans.label || "Q" + ans.to}` + (best.cc.p != null ? ` - ${(best.cc.p * 100).toFixed(1)}%${best.cc.unscored ? ` over ${best.cc.scored} scored hop${best.cc.scored === 1 ? "" : "s"} (${best.cc.unscored} on Wikidata alone)` : ""}` : best.cc.unknown ? " - rests on a taught or derived fact, unverified" : " - every hop rests on Wikidata alone; recorded, not scored") +
            ` via ${best.reading.rec.label} (${best.reading.rec.desc || "no description"}); ${results.length} complete chain${results.length === 1 ? "" : "s"}, ${distinctAnswers.size} distinct answer${distinctAnswers.size === 1 ? "" : "s"}`,
            answer: { qid: ans.to, label: ans.label }, chain: best.hops.map(h => this.fmtEdge(h).text), p: best.cc.p, note: best.cc.note,
            rivals: results.slice(1, 1 + CFG.RIVALS_SHOWN).map(r => ({ answer: r.hops[r.hops.length - 1].label || "Q" + r.hops[r.hops.length - 1].to, p: r.cc.p, via: r.reading.rec.label, chain: r.hops.map(h => this.fmtEdge(h).text) })),
            rivalsTotal: results.length - 1 };
  }

  async *walk(rec, hops, sofar, results, reading, plan) {
    const hop = hops[sofar.length]; const pid = this.hopPid(hop);
    const edges = this.hopEdges(rec, hop);
    if (!edges.length) {
      // a literal-valued relation (population, a date) ends the chain with a value, not a node
      const lits = rec.lits.filter(v => v[0] === pid);
      if (lits.length && sofar.length === hops.length - 1) {
        // several values of one quantity are usually the same measure at different dates: the
        // dated ones lead, most recent first, and the date travels with the value
        const dated = lits.filter(v => v[5]).length;
        lits.sort((a, b) => String(b[5] || "").localeCompare(String(a[5] || "")));
        if (lits.length > 1 && dated) yield { step: "CONTEXT", text: `${lits.length} values of ${this.store.propLabel(pid)}, ${dated} dated by a point-in-time qualifier - the most recent leads (${lits[0][5]}); the rest are earlier readings, not rivals`, decidedBy: "most recent dated value" };
        for (const v of lits.slice(0, CFG.OBJ_PER_HOP)) {
          const shown = (v[1] || v[2]) + (v[5] ? ` (as of ${v[5]})` : "");
          const e = { pid, from: rec.qid, fromLabel: rec.label, to: null, src: v[3], sup: 1, label: shown, value: v[2], iso: v[1], asof: v[5] || null, dir: "lit" };
          e.conf = edgeConfidence(e.src, this.store.index);
          yield { step: "LOOKUP", text: this.fmtEdge(e).text, edge: e };
          results.push({ reading, hops: [...sofar, e] });
        }
        if (lits.length > CFG.OBJ_PER_HOP) yield { step: "NOTE", text: `${lits.length} values recorded; ${CFG.OBJ_PER_HOP} shown (a bound)` };
        return;
      }
      this.lastDead = { qid: rec.qid, pid, label: rec.label, desc: rec.desc };
      yield { step: "BACKTRACK", text: `${rec.label || "Q" + rec.qid} has no ${this.store.propLabel(pid)} edge - dead end after ${sofar.length} hop${sofar.length === 1 ? "" : "s"}` };
      return;
    }
    edges.sort((a, b) => b.sup - a.sup);
    const use = edges.slice(0, CFG.OBJ_PER_HOP);
    if (edges.length > use.length) yield { step: "NOTE", text: `${edges.length} ${this.store.propLabel(pid)} edges on ${rec.label}; following the ${use.length} best-supported (a bound, the rest are in the record)` };
    for (const e of use) {
      e.fromLabel = rec.label; e.conf = edgeConfidence(e.src, this.store.index);
      const f = this.fmtEdge(e);
      yield { step: "LOOKUP", text: f.text, edge: e };
      const next = [...sofar, e];
      if (next.length === hops.length) { results.push({ reading, hops: next }); continue; }
      const nrec = await this.store.entity(e.to);
      if (!nrec) { yield { step: "BACKTRACK", text: `Q${e.to} has no record in this store` }; continue; }
      // CHECK: does the object carry the next hop at all?
      const np = hops[next.length]; const npid = this.hopPid(np);
      const carries = this.hopEdges(nrec, np).length + (sofar.length + 2 === hops.length ? nrec.lits.filter(v => v[0] === npid).length : 0);
      // a type hint from the question ("the COUNTRY whose capital is Ottawa"): say whether the
      // node reached is that kind of thing, from its recorded instance-of labels
      if (plan && plan.typeHint && sofar.length === 0) {
        const verdict = await this.isKind(nrec, plan.typeHint);
        yield { step: "CHECK", text: `${nrec.label} is ${verdict.types.length ? "instance of " + verdict.types.slice(0, 3).join(", ") + (verdict.types.length > 3 ? ` (3 of ${verdict.types.length} types shown)` : "") : "of no recorded type"} - ${verdict.ok ? `matches the question's "${plan.typeHint}"${verdict.via ? " (" + verdict.via + ")" : ""}` : `does NOT match the question's "${plan.typeHint}" within ${CFG.KIND_DEPTH} subclass steps; this route is set aside`}` };
        if (!verdict.ok) continue;   // the question said what kind of thing it wants; a node of another kind is not it
      }
      yield { step: "CHECK", text: `${nrec.label || "Q" + nrec.qid} (${nrec.desc || "no description"}) ${carries ? `carries ${carries} ${this.store.propLabel(npid)} ${sofar.length + 2 === hops.length && nrec.lits.some(v => v[0] === npid) ? "value" : "edge"}${carries === 1 ? "" : "s"} - continue` : `has no ${this.store.propLabel(npid)} edge - this route stops here`}` };
      if (!carries) { this.lastDead = { qid: nrec.qid, pid: npid, label: nrec.label, desc: nrec.desc }; continue; }
      yield* this.walk(nrec, hops, next, results, reading, plan);
    }
  }

  /* ---- DEFINE ------------------------------------------------------------------------------ */
  async *define(plan) {
    const readings = yield* this.link(plan.entity, null);
    const concept = await this.store.concept(plan.entity);
    if (!readings.length && !concept) { yield { step: "REFUSE", text: `nothing in this store is named "${plan.entity}"`, reason: "subject absent" }; return; }
    // CONTEXT for a bare "what is X": the WORD's senses in ConceptNet (is-a, related) are the
    // common reading of the word; a thing whose description matches them fits the question better
    // than the best-connected namesake ("car" the vehicle over CAR the Central African Republic)
    let pick = readings[0], decided = null;
    if (readings.length > 1) {
      yield { step: "RANK", text: readings.map(r => `${r.rec.label} (${r.rec.desc || "no description"}, ${r.deg} facts)`).join(" · "), ranked: readings.map(r => ({ answer: r.rec.label, via: r.rec.label, desc: r.rec.desc, p: null })) };
      const senses = concept ? concept.e.filter(x => (x.rel === "IsA" || x.rel === "RelatedTo" || x.rel === "Synonym") && x.dir === 0).map(x => normKey(x.other)).filter(Boolean) : [];
      const qWords = new Set((normKey(plan.raw || "") || "").split(" ").filter(w => w.length > 2 && !L.FRAMING.has(w) && !(normKey(plan.entity) || "").split(" ").includes(w)));
      const scored = readings.map(r => {
        const hay = " " + (normKey((r.rec.desc || "") + " " + r.rec.types.map(t => "").join(" ")) || "") + " ";
        const typeLabels = r.rec.out.filter(e => e[0] === 31).map(e => normKey(e[4] || "")).filter(Boolean);
        const sensesHit = senses.filter(s => hay.includes(" " + s + " ") || typeLabels.some(t => t === s || t.includes(s)));
        const ctx = [...qWords].filter(w => hay.includes(w));
        const exact = normKey(r.rec.label) === normKey(plan.entity);
        return { r, sensesHit, ctx, exact };
      });
      const byCtx = scored.filter(s => s.ctx.length);
      const bySense = scored.filter(s => s.sensesHit.length);
      if (byCtx.length === 1) { pick = byCtx[0].r; decided = `the question's own words (${byCtx[0].ctx.map(w => `"${w}"`).join(", ")}) match its description`; }
      else if (bySense.length >= 1 && (bySense.length === 1 || bySense[0].r !== readings[0])) { pick = bySense[0].r; decided = `the word "${plan.entity}" means ${bySense[0].sensesHit.slice(0, 3).join(", ")} in ConceptNet, and this reading is that kind of thing`; }
      else if (scored.filter(s => s.exact).length === 1 && !scored[0].exact) { pick = scored.find(s => s.exact).r; decided = `its label is exactly "${plan.entity}"; the better-connected readings only carry it as an alias`; }
      yield { step: "CONTEXT", text: (decided ? `reading chosen: ${pick.rec.label} (${pick.rec.desc || "no description"}) - ${decided}` : `nothing in the question or the word's senses picks a reading; showing the best-connected, ${pick.rec.label}, which is a prior, not evidence`) + "; scored: " + scored.map(s => `${s.r.rec.label}[words ${s.ctx.length}, senses ${s.sensesHit.length}, ${s.r.deg} facts]`).join(" · "), decidedBy: decided || "prior" };
      yield { step: "ASK", text: `"${plan.entity}" names ${readings.length} things - pick another reading if this is not the one you meant:`,
        options: readings.map(r => ({ qid: r.qid, label: r.rec.label, desc: r.rec.desc, deg: r.deg })) };
    }
    if (readings.length) {
      const r = pick.rec;
      const types = r.out.filter(e => e[0] === 31).map(e => e[4] || "Q" + e[1]);
      const classes = r.out.filter(e => e[0] === 279).map(e => e[4] || "Q" + e[1]);
      yield { step: "LOOKUP", text: `${r.label} - ${r.desc || "no description"}` + (types.length ? `; instance of ${types.join(", ")}` : "") + (classes.length ? `; subclass of ${classes.join(", ")}` : ""), entity: { qid: r.qid, label: r.label, desc: r.desc, types, classes } };
      const top = r.out.slice(0, CFG.DEFINE_EDGES);
      for (const e of top) { const ed = { pid: e[0], from: r.qid, fromLabel: r.label, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "out" }; ed.conf = edgeConfidence(e[2], this.store.index); yield { step: "LOOKUP", text: this.fmtEdge(ed).text, edge: ed }; }
      if (r.out.length > top.length) yield { step: "NOTE", text: `${r.out.length - top.length} more recorded facts about ${r.label} not shown (the record holds ${r.out.length})` };
      yield { step: "CONCLUDE", text: `${r.label}: ${r.desc || (types.length ? "an instance of " + types.join(", ") : "no description recorded")}`, answer: { qid: r.qid, label: r.label, desc: r.desc }, facts: r.out.length };
    }
    if (concept) {
      const isa = concept.e.filter(x => x.rel === "IsA" && x.dir === 0).slice(0, 5).map(x => x.other);
      const used = concept.e.filter(x => x.rel === "UsedFor" && x.dir === 0).slice(0, 5).map(x => x.other);
      yield { step: "NOTE", text: `the WORD "${plan.entity}" in ConceptNet (${concept.n} edges; a word, not the thing above)` + (isa.length ? `: is a ${isa.join(", ")}` : "") + (used.length ? `; used for ${used.join(", ")}` : ""), concept };
    }
  }

  /* ---- COUNT ------------------------------------------------------------------------------- */
  async *count(plan) {
    const readings = yield* this.link(plan.entity, null);
    if (!readings.length) { yield { step: "REFUSE", text: `no class named "${plan.entity}" in this store`, reason: "absent" }; return; }
    // the class reading is the one with the most recorded members
    let best = null;
    for (const r of readings) {
      let n = 0; const parts = {};
      for (const pid of L.MEMBER_RELS) { const m = await this.store.members(r.qid, pid); if (m) { n += m.n; parts[pid] = m; } }
      if (n && (!best || n > best.n)) best = { r, n, parts };
    }
    if (!best) { yield { step: "REFUSE", text: `nothing is recorded as a member, subclass or child taxon of any reading of "${plan.entity}" - a statement about this store, not the world`, reason: "no members" }; return; }
    const desc = Object.entries(best.parts).map(([pid, m]) => `${m.n} via ${this.store.propLabel(pid)}`).join(", ");
    yield { step: "LOOKUP", text: `${best.r.rec.label} (${best.r.rec.desc || "no description"}) has ${best.n} recorded direct members: ${desc}`, cls: { qid: best.r.qid, label: best.r.rec.label } };
    const members = new Map();
    for (const m of Object.values(best.parts)) for (const x of m.m) if (!members.has(x.qid)) members.set(x.qid, { ...x, depth: 1 });
    // depth 2: "types of bear" are species, and species hang off GENERA which hang off the family -
    // so one more level of the same hierarchical relations (subclass of, parent taxon), disclosed
    const direct = [...members.values()];
    let expanded = 0, expandedFrom = 0;
    for (const x of direct.slice(0, CFG.COUNT_EXPAND)) {
      for (const pid of [279, 171]) {
        if (!best.parts[pid]) continue;
        const m = await this.store.members(x.qid, pid);
        if (!m) continue;
        expandedFrom++;
        for (const y of m.m) if (!members.has(y.qid)) { members.set(y.qid, { ...y, depth: 2, via: x.label }); expanded++; }
      }
    }
    if (expanded) yield { step: "LOOKUP", text: `one level down: ${expanded} more members under ${expandedFrom} of the direct members (depth 2 - ${direct.length > CFG.COUNT_EXPAND ? `only the ${CFG.COUNT_EXPAND} best-connected direct members were expanded, a bound` : "every direct member expanded"})` };
    const listed = [...members.values()];
    const capped = best.n > direct.length;
    if (!plan.filter) {
      yield { step: "CONCLUDE", text: `${listed.length} recorded member${listed.length === 1 ? "" : "s"} of ${best.r.rec.label}: ${direct.length} direct` + (expanded ? ` + ${expanded} one level down` : "") + (capped ? ` (${direct.length} of ${best.n} direct members listed - the index caps at ${this.store.index.member_cap} per relation)` : ""),
              answer: { n: listed.length, direct: direct.length, depth2: expanded }, members: listed.slice(0, 80).map(x => (x.label || "Q" + x.qid) + (x.depth === 2 ? ` (under ${x.via})` : "")), membersTotal: listed.length };
      return;
    }
    // a filter must be a relation the store can test; otherwise the honest answer is that it cannot be tested
    const fplan = this.planner.plan("what " + plan.filter);
    const fpid = fplan.hops[0];
    if (!fpid) {
      // "how many types of bear have brown hair" asks which kinds COULD be born brown - a modal,
      // biological question no fact store records. No number is given. What the store CAN show
      // is said plainly: members whose name or description mentions the words (a mention, not
      // evidence), and what the WORD itself carries in ConceptNet.
      const words = plan.filter.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !L.FRAMING.has(w));
      const scan = listed.slice(0, CFG.NAME_SCAN); const named = [];
      for (const x of scan) {
        const r = await this.store.entity(x.qid); if (!r) continue;
        const hay = ((r.label || "") + " " + (r.desc || "") + " " + (r.aliases || []).join(" ")).toLowerCase();
        const hit = words.filter(w => hay.includes(w));
        if (hit.length) named.push({ label: r.label, desc: r.desc, hit });
      }
      if (named.length) yield { step: "NOTE", text: `${named.length} of the ${scan.length} members opened are NAMED or DESCRIBED with ${words.map(w => `"${w}"`).join(" / ")}: ${named.map(n => `${n.label}${n.desc ? " (" + n.desc + ")" : ""}`).join("; ")} - a name is what a thing is called, not a fact about it, so this is not a count` + (listed.length > scan.length ? ` (${listed.length - scan.length} members not opened - bound ${CFG.NAME_SCAN})` : "") };
      const cn = await this.store.concept(plan.entity);
      if (cn) {
        const rel = cn.e.filter(x => words.some(w => normKey(x.other) === w || (normKey(x.other) || "").split(" ").includes(w)));
        if (rel.length) yield { step: "NOTE", text: `the WORD "${plan.entity}" in ConceptNet: ${rel.slice(0, 6).map(x => `${x.dir ? x.other + " -" + x.rel + "-> " + plan.entity : plan.entity + " -" + x.rel + "-> " + x.other} (weight ${x.w})`).join("; ")}${rel.length > 6 ? ` and ${rel.length - 6} more` : ""} - common-sense association, not a per-species fact` };
      }
      yield { step: "REFUSE", text: `I cannot test "${plan.filter}": no property in this store expresses it, and "could have ${plan.filter}" is a question about what is biologically possible, which no fact store records. The unfiltered count is ${best.n}${named.length ? `; ${named.length} of them carry the words in their name or description (listed above, not counted)` : ""}. Testing the rest by matching letters in fact strings would be a guess, and this engine does not do that.`, reason: "untestable filter", unfiltered: best.n, named: named.map(n => n.label) };
      return;
    }
    const valueText = fplan.entity;
    const vals = valueText ? await this.store.candidates(valueText) : [];
    yield { step: "PLAN", text: `test each member for ${this.store.propLabel(fpid)}` + (vals.length ? ` = "${valueText}" (${vals.length} reading${vals.length === 1 ? "" : "s"})` : valueText ? ` = "${valueText}" - which names no entity, so any value will be shown` : "") };
    const read = listed.slice(0, CFG.COUNT_READ);
    let hits = 0, has = 0; const evidence = [];
    for (const x of read) {
      const r = await this.store.entity(x.qid); if (!r) continue;
      const es = r.out.filter(e => e[0] === fpid);
      if (!es.length) continue;
      has++;
      const ok = !vals.length || es.some(e => vals.some(v => v.qid === e[1]));
      if (ok) { hits++; evidence.push({ qid: x.qid, label: r.label, value: es.map(e => e[4] || "Q" + e[1]).join(", ") }); yield { step: "CHECK", text: `${r.label}: ${this.store.propLabel(fpid)} = ${es.map(e => e[4] || "Q" + e[1]).join(", ")} - PASS` }; }
      else yield { step: "CHECK", text: `${r.label}: ${this.store.propLabel(fpid)} = ${es.map(e => e[4] || "Q" + e[1]).join(", ")} - not "${valueText}"` };
    }
    yield { step: "CONCLUDE", text: `${hits} of the ${read.length} members read carry ${this.store.propLabel(fpid)}${vals.length ? ` = ${valueText}` : ""}; ${has} carry the property at all, ${read.length - has} record nothing for it` + (listed.length > read.length ? `; ${listed.length - read.length} members not read (bound ${CFG.COUNT_READ})` : ""),
            answer: { n: hits, read: read.length, has, total: best.n }, evidence };
  }

  /* ---- ISA --------------------------------------------------------------------------------- */
  async *isa(plan) {
    const a = yield* this.link(plan.entity, null);
    const b = yield* this.link(plan.entity2, null);
    if (!a.length || !b.length) { yield { step: "REFUSE", text: `one of the two names is not in this store`, reason: "absent" }; return; }
    const targets = new Set(b.map(x => x.qid));
    // BFS up the membership relations
    let frontier = a.map(x => ({ qid: x.qid, path: [x.rec.label] }));
    const seen = new Set(frontier.map(f => f.qid));
    for (let depth = 0; depth < CFG.ISA_DEPTH; depth++) {
      const next = [];
      for (const f of frontier) {
        const r = await this.store.entity(f.qid); if (!r) continue;
        for (const e of r.out) {
          if (!L.ISA_RELS.includes(e[0])) continue;
          const path = [...f.path, `-${this.store.propLabel(e[0])}-> ${e[4] || "Q" + e[1]}`];
          if (targets.has(e[1])) { yield { step: "LOOKUP", text: path.join(" ") }; yield { step: "CONCLUDE", text: `yes: ${path.join(" ")}`, answer: { yes: true, path } }; return; }
          if (!seen.has(e[1])) { seen.add(e[1]); next.push({ qid: e[1], path }); }
        }
      }
      yield { step: "CHECK", text: `depth ${depth + 1}: ${next.length} classes reached, target not among them` };
      frontier = next;
      if (!frontier.length) break;
    }
    yield { step: "REFUSE", text: `no membership path from "${plan.entity}" to "${plan.entity2}" within ${CFG.ISA_DEPTH} steps - not recorded here, which is not proof it is false`, reason: "no path" };
  }

  /* ---- PATH (two entities, no relation) ---------------------------------------------------- */
  async *path(plan) {
    const a = yield* this.link(plan.entity, null);
    const b = yield* this.link(plan.entity2, null);
    if (!a.length || !b.length) { yield { step: "REFUSE", text: "one of the two names is not in this store", reason: "absent" }; return; }
    const B = new Set(b.map(x => x.qid));
    if (a.length > CFG.PATH_READINGS) yield { step: "NOTE", text: `"${plan.entity}" has ${a.length} readings; trying the ${CFG.PATH_READINGS} best-connected (a bound)` };
    for (const x of a.slice(0, CFG.PATH_READINGS)) {
      const direct = x.rec.out.filter(e => B.has(e[1]));
      for (const e of direct) { const ed = { pid: e[0], from: x.qid, fromLabel: x.rec.label, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "out" }; ed.conf = edgeConfidence(e[2], this.store.index); yield { step: "LOOKUP", text: this.fmtEdge(ed).text, edge: ed }; }
      const back = x.rec.inn.filter(e => B.has(e[1]));
      for (const e of back) { const ed = { pid: e[0], from: x.qid, fromLabel: x.rec.label, to: e[1], src: e[2], sup: e[3], label: e[4], dir: "in" }; ed.conf = edgeConfidence(e[2], this.store.index); yield { step: "LOOKUP", text: this.fmtEdge(ed).text, edge: ed }; }
      if (direct.length || back.length) { yield { step: "CONCLUDE", text: `${direct.length + back.length} recorded fact${direct.length + back.length === 1 ? "" : "s"} connect ${x.rec.label} and "${plan.entity2}" directly`, answer: { n: direct.length + back.length } }; return; }
      // two hops: shared neighbours
      const bRec = await this.store.entity(b[0].qid);
      const bN = new Map(); for (const e of bRec.out) bN.set(e[1], e); for (const e of bRec.inn) bN.set(e[1], e);
      let found = 0;
      for (const e of x.rec.out.slice(0, CFG.PATH_FANOUT)) if (bN.has(e[1])) { found++; const f = bN.get(e[1]); yield { step: "LOOKUP", text: `${x.rec.label} -${this.store.propLabel(e[0])}-> ${e[4] || "Q" + e[1]} <-${this.store.propLabel(f[0])}- ${bRec.label}` }; }
      if (found) { yield { step: "CONCLUDE", text: `${found} shared neighbour${found === 1 ? "" : "s"} within one hop each - association, NOT an assertion about the two things`, answer: { n: found } }; return; }
    }
    yield { step: "REFUSE", text: `no recorded connection within two hops (${CFG.PATH_FANOUT} edges opened per side - a bound)`, reason: "no path" };
  }

  /* ---- EXISTS ("is there a X") ------------------------------------------------------------- */
  async *exists(plan) {
    const readings = yield* this.link(plan.entity, null);
    const concept = await this.store.concept(plan.entity);
    if (!readings.length && !concept) { yield { step: "REFUSE", text: `nothing named "${plan.entity}" is recorded - as a thing or as a word`, reason: "absent" }; return; }
    yield { step: "CONCLUDE", text: `${readings.length} thing${readings.length === 1 ? "" : "s"} named "${plan.entity}" recorded` + (readings.length ? `: ${readings.slice(0, 5).map(r => `${r.rec.label} (${r.rec.desc || "no description"})`).join("; ")}${readings.length > 5 ? `; and ${readings.length - 5} more (5 listed, a bound)` : ""}` : "") + (concept ? `; and the WORD has ${concept.n} ConceptNet edges` : "") + ". Whether one exists in the sense you mean is not something a store can settle.",
            answer: { n: readings.length, label: readings.length ? `${readings.length} recorded` : "none recorded" } };
  }

  /* ---- WHEN -------------------------------------------------------------------------------- */
  async *when(plan) {
    const readings = yield* this.link(plan.entity, null);
    if (!readings.length) { yield { step: "REFUSE", text: `no entity named "${plan.entity}"`, reason: "absent" }; return; }
    const pl = plan.hops.length ? this.store.propLabel(plan.hops[0]) : "date";
    const withDate = [], without = [];
    for (const r of readings.slice(0, CFG.LINK_TRY)) {
      const lits = r.rec.lits.filter(v => !plan.hops.length || v[0] === plan.hops[0]);
      if (lits.length) withDate.push({ r, lits }); else without.push(r);
    }
    for (const w of withDate) for (const v of w.lits) yield { step: "LOOKUP", text: `${w.r.rec.label} (${w.r.rec.desc || "no description"}) ${this.store.propLabel(v[0])} = ${v[1] || v[2]}  [${sourceNames(v[3], this.store.index).join(", ")}]` };
    for (const r of without) yield { step: "BACKTRACK", text: `${r.rec.label} (${r.rec.desc || "no description"}) records no ${pl}` };
    if (!withDate.length) {
      const r0 = readings[0];
      yield { step: "REFUSE", text: `no ${pl} recorded for any of the ${readings.length} reading${readings.length === 1 ? "" : "s"} of "${plan.entity}" opened`, reason: "no literal",
              missing: plan.hops.length ? { qid: r0.qid, pid: plan.hops[0], label: r0.rec.label, desc: r0.rec.desc } : undefined };
      return;
    }
    // RANK the readings that have a value; the best-connected reading leads, and if IT has no
    // value the engine says so and treats that as the missing fact instead of quietly answering
    // about a namesake
    yield { step: "RANK", text: withDate.map(w => `${w.r.rec.label} (${w.r.rec.desc || "no description"}, ${w.r.deg} facts): ${w.lits.map(v => v[1] || v[2]).join(" / ")}`).join(" · "), ranked: withDate.map(w => ({ answer: w.lits[0][1] || w.lits[0][2], via: w.r.rec.label, desc: w.r.rec.desc, p: null })) };
    const top = readings[0];
    const topHas = withDate.find(w => w.r.qid === top.qid);
    if (!topHas) {
      yield { step: "CONTEXT", text: `the best-connected reading, ${top.rec.label} (${top.rec.desc || "no description"}, ${top.deg} facts), has no ${pl} recorded; the values above belong to namesakes - so I do not answer with them. The missing fact is ${top.rec.label}'s ${pl}.`, decidedBy: "prior" };
      yield { step: "ASK", text: `Did you mean ${top.rec.label} (${top.rec.desc || "no description"})? Its ${pl} is not recorded here - or one of the namesakes above?`, options: [{ qid: top.qid, label: top.rec.label, desc: top.rec.desc }, ...withDate.map(w => ({ qid: w.r.qid, label: w.r.rec.label, desc: w.r.rec.desc, answer: w.lits[0][1] || w.lits[0][2] }))] };
      yield { step: "REFUSE", text: `${top.rec.label} (${top.rec.desc || "no description"}) has no ${pl} in this store - the missing fact is exactly that`, reason: "no literal", missing: { qid: top.qid, pid: plan.hops[0], label: top.rec.label, desc: top.rec.desc } };
      return;
    }
    const w = topHas;
    if (withDate.length > 1) yield { step: "CONTEXT", text: `answering for the best-connected reading, ${w.r.rec.label} (${w.r.rec.desc}); ${withDate.length - 1} namesake${withDate.length === 2 ? "" : "s"} with a ${pl} listed above - click one to switch`, decidedBy: "prior" };
    yield { step: "CONCLUDE", text: `${w.r.rec.label} (${w.r.rec.desc || "no description"}): ${this.store.propLabel(w.lits[0][0])} ${w.lits[0][1] || w.lits[0][2]}` + (w.lits.length > 1 ? ` (${w.lits.length} values recorded: ${w.lits.map(v => v[1] || v[2]).join(", ")})` : ""), answer: { qid: w.r.qid, label: w.r.rec.label, value: w.lits[0][1] || w.lits[0][2], pid: w.lits[0][0] } };
  }

  /* ---- WHERE ------------------------------------------------------------------------------- */
  async *where(plan) {
    if (!plan.ladder) { yield* this.chain({ ...plan, shape: "LOOKUP" }); return; }
    const readings = yield* this.link(plan.entity, null);
    if (!readings.length) { yield { step: "REFUSE", text: `no entity named "${plan.entity}"`, reason: "absent" }; return; }
    const r = readings[0];
    for (const pid of plan.hops) {
      const es = this.hopEdges(r.rec, pid);
      if (!es.length) { yield { step: "CHECK", text: `${r.rec.label}: no ${this.store.propLabel(pid)} edge, trying the next rung` }; continue; }
      es.sort((a, b) => b.sup - a.sup);
      for (const e of es.slice(0, CFG.WHERE_EDGES)) { e.fromLabel = r.rec.label; e.conf = edgeConfidence(e.src, this.store.index); yield { step: "LOOKUP", text: this.fmtEdge(e).text, edge: e }; }
      if (es.length > CFG.WHERE_EDGES) yield { step: "NOTE", text: `${es.length} ${this.store.propLabel(pid)} edges recorded; ${CFG.WHERE_EDGES} shown (a bound)` };
      yield { step: "CONCLUDE", text: `${r.rec.label} (${r.rec.desc || "no description"}): ${this.store.propLabel(pid)} ${es[0].label || "Q" + es[0].to}`, answer: { qid: es[0].to, label: es[0].label }, p: es[0].conf.p };
      return;
    }
    yield { step: "REFUSE", text: `${r.rec.label} has none of location / administrative territory / country / continent recorded`, reason: "no location edge", missing: { qid: r.qid, pid: 17, label: r.rec.label, desc: r.rec.desc } };
  }
}
