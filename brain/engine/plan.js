/* plan.js - question -> plan. A plan is a small program the executor runs; the RESTATE line of the
 * transcript prints it, so a wrong reading is visible before any search happens.
 *
 *   { shape: 'LOOKUP'|'CHAIN'|'DEFINE'|'COUNT'|'WHEN'|'WHERE'|'ISA'|'PATH'|'EMPTY',
 *     hops: [pid...]         applied in order (first hop leaves the entity)
 *     entity: 'text'         the mention to link (or two for PATH / ISA)
 *     entity2, filter, unplaced: [words], notes: [strings] }
 *
 * Relation words are resolved through the property alias table shipped in index.json (thousands
 * of Wikidata aliases) plus lexicon.js VERB_RELATIONS for verb forms. A relation phrase is
 * consumed before entity spans are formed, longest phrase first. Anything left that is not framing
 * is reported as unplaced - the reader sees exactly which words the plan could not account for.
 */
import { normKey } from "./norm.js";
import * as L from "./lexicon.js";

const MAX_REL_WORDS = 9;   // "located in or next to body of water" is eight words

export class Planner {
  constructor(index) {
    this.index = index;
    // property phrase -> pid, longest phrases first; label beats alias when both exist
    this.relPhrases = new Map();
    for (const [pid, p] of Object.entries(index.props)) {
      if (!p.l) continue;
      const put = (s, kind) => { const k = normKey(s); if (!k || k.split(" ").length > MAX_REL_WORDS || L.GRAMMAR_ALIASES.has(k)) return;
        const cur = this.relPhrases.get(k);
        if (!cur || (kind === 0 && cur.kind === 1) || (cur.kind === kind && p.n > cur.n)) this.relPhrases.set(k, { pid: Number(pid), kind, n: p.n }); };
      put(p.l, 0);
      for (const a of p.a || []) put(a, 1);
    }
  }

  tokens(q) {
    // possessives are stripped for relation reading ("Melbourne's country") but remembered, because
    // inside a title they are part of the name ("Women's Doubles"): plan() offers the restored form
    const raw = q.replace(/[?!.]+$/, "").replace(/[,;:"()]/g, " ");
    const marked = raw.replace(/(\w)'s\b/g, "$1\u0001");
    const toks = (normKey(marked) || "").split(" ").filter(Boolean);
    this.possessive = new Set(); const out = [];
    toks.forEach((t, i) => { if (t.includes("\u0001")) this.possessive.add(i); out.push(t.replace(/\u0001/g, "")); });
    // the words as WRITTEN, punctuation kept: the name index keys keep inner punctuation
    // ("paris, france", "(+)-humulone", "makai kingdom: chronicles of the sacred tome") and the
    // tokens above have lost it, so a span's written form is offered too (rawSpan). Each written
    // word is mapped to the token range it produced ("(+)-humulone" is one word, two tokens);
    // when a word's tokens do not match the token list the map is dropped and no written form is
    // offered, rather than a wrong one.
    const words = q.replace(/[?!.]+$/, "").normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);
    const map = []; let t = 0, aligned = true;
    for (const w of words) {
      const parts = (normKey(w.replace(/[,;:"()]/g, " ").replace(/(\w)'s\b/g, "$1")) || "").split(" ").filter(Boolean);
      if (!parts.every((x, j) => out[t + j] === x)) { aligned = false; break; }
      map.push({ t0: t, t1: t + parts.length }); t += parts.length;
    }
    this.rawWords = aligned && t === out.length ? words : null;
    this.rawMap = this.rawWords ? map : null;
    return out;
  }
  /* the written form of tokens [start, end) with its punctuation, normalised like an index key;
   * null when the written words could not be aligned with the tokens, or the span cuts a word */
  rawSpan(start, end) {
    if (!this.rawWords) return null;
    const i0 = this.rawMap.findIndex(m => m.t0 === start);
    let i1 = -1; for (let i = this.rawMap.length - 1; i >= 0; i--) if (this.rawMap[i].t1 === end) { i1 = i; break; }
    if (i0 < 0 || i1 < i0) return null;
    return normKey(this.rawWords.slice(i0, i1 + 1).join(" "));
  }
  restorePossessive(span) {   // span text with 's put back on the tokens that had it
    return span.text.split(" ").map((w, j) => this.possessive && this.possessive.has(span.start + j) ? w + "'s" : w).join(" ");
  }

  /* which tokens were Capitalised in the question (position 0 excluded: sentence-initial capitals
   * are grammar). A capitalised word is a name, never a relation: "who directed Inception". */
  capsOf(q, toks) {
    const raw = q.replace(/[?!.]+$/, "").replace(/'s\b/g, " ").replace(/[,;:"()]/g, " ").normalize("NFKC").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (raw.length !== toks.length) return new Set();
    const caps = new Set();
    raw.forEach((w, i) => { if (i > 0 && /^[A-Z]/.test(w) && normKey(w) === toks[i]) caps.add(i); });
    return caps;
  }

  /* find relation phrases (longest first, non-overlapping); returns [{start,end,pid,text,via}] */
  findRelations(toks, ql, caps = new Set()) {
    const found = []; const used = new Array(toks.length).fill(false);
    // multi-word verb forms first ("language is spoken"): they span framing words a phrase pass
    // would split; single-word verbs come after the property phrases so "official language"
    // (a property) is not pre-empted by "language" (a verb-rule word)
    const verbPass = (multiOnly) => {
      for (const v of L.VERB_RELATIONS) {
        const re = new RegExp(v.re.source, "g");
        let m, first = null;
        while ((m = re.exec(ql))) {
          const w = normKey(m[0]).split(" ");
          if (multiOnly !== (w.length > 1)) continue;
          for (let i = 0; i + w.length <= toks.length; i++) {
            // a verb match may not cut a two-word property phrase in half: "has part of X" is
            // has part (P527) + "of", not "has" + part of (P361)
            const straddles = i > 0 && !used[i - 1] && this.relPhrases.has(toks[i - 1] + " " + toks[i]);
            if (!straddles && w.every((x, j) => toks[i + j] === x) && !used.slice(i, i + w.length).some(Boolean) && !w.every((x, j) => caps.has(i + j))) {
              for (let j = i; j < i + w.length; j++) used[j] = true;
              if (!first) { first = { start: i, end: i + w.length, pid: v.pid, alts: v.alts, text: m[0], via: v.why, date: v.date }; found.push(first); }
              break;
            }
          }
        }
      }
    };
    // order: long property phrases (3+ words, "part of the series"), then multi-word verb rules
    // ("language is spoken", which spans framing words no phrase can), then short phrases, then
    // single-word verbs - so no rule pre-empts a longer, more specific one
    const phrasePass = (nMax, nMin) => { for (let n = nMax; n >= nMin; n--) {
      for (let i = 0; i + n <= toks.length; i++) {
        if (used.slice(i, i + n).some(Boolean)) continue;
        // a phrase made only of capitalised words is a name ("Inception" the film, not the date relation)
        let allCaps = true; for (let j = i; j < i + n; j++) if (!caps.has(j)) allCaps = false;
        if (allCaps) continue;
        const phrase = toks.slice(i, i + n).join(" ");
        let hit = this.relPhrases.get(phrase);
        if (!hit) continue;
        // a single framing word that happens to be a property alias ("in", "of") is not a relation
        if (n === 1 && L.FRAMING.has(phrase)) continue;
        // "capital of France": Wikidata names the INVERSE property "capital of" (P1376), which
        // would beat "capital" (P36) as the longer phrase. When a phrase ends in " of" and the
        // phrase without it is itself a property, the "of" is the question's grammar, not the
        // property's name - unless the bare form is not a property at all ("part of", "member of").
        let text = phrase, end = i + n;
        if (n > 1 && phrase.endsWith(" of")) {
          const bare = this.relPhrases.get(phrase.slice(0, -3));
          if (bare) { hit = bare; text = phrase.slice(0, -3); end = i + n - 1; }
        }
        found.push({ start: i, end, pid: hit.pid, text, via: hit.kind === 0 ? "property label" : "property alias" });
        for (let j = i; j < end; j++) used[j] = true;
      }
    } };
    phrasePass(MAX_REL_WORDS, 3);
    verbPass(true);
    phrasePass(2, 1);
    verbPass(false);
    found.sort((a, b) => a.start - b.start);
    return { found, used };
  }

  hopOf(f) { return f.alts ? { pid: f.pid, alts: f.alts } : f.pid; }

  /* hop order from positions. Relations BEFORE the subject nest, innermost last ("capital of the
   * country X" -> country, then capital). Relations AFTER the subject apply to the subject itself
   * when the subject opens a clause ("the country where Toyota is headquartered" -> headquarters,
   * then country) and to the chain's result when the subject is the object of "of" ("the author
   * of Hamlet born" -> author, then place of birth). The token before the subject decides. */
  hopOrder(found, entSpan, toks) {
    if (!entSpan) return found.map(f => this.hopOf(f)).reverse();
    const before = found.filter(f => f.end <= entSpan.start).map(f => this.hopOf(f)).reverse();
    const after = found.filter(f => f.start >= entSpan.end).map(f => this.hopOf(f));
    const prev = toks && entSpan.start > 0 ? toks[entSpan.start - 1] : null;
    const objectOfOf = prev === "of";
    return objectOfOf ? [...before, ...after] : [...after, ...before];
  }

  /* "the film Inception" -> the name is "Inception"; "film" becomes a context word */
  stripTypeWord(span) {
    const w = span.text.split(" ");
    if (w.length > 1 && L.TYPE_WORDS.has(w[0])) return { ...span, text: w.slice(1).join(" "), start: span.start + 1, typeWord: w[0] };
    return span;
  }

  /* the words that are left, grouped into contiguous spans of non-framing tokens */
  leftoverSpans(toks, used) {
    const spans = []; let cur = [];
    toks.forEach((t, i) => {
      if (used[i] || L.FRAMING.has(t)) { if (cur.length) spans.push(cur); cur = []; }
      else cur.push({ t, i });
    });
    if (cur.length) spans.push(cur);
    return spans.map(s => ({ text: s.map(x => x.t).join(" "), start: s[0].i, end: s[s.length - 1].i + 1 }));
  }

  /* names carry function words inside them ("Statue of Christopher Columbus", "Lord of the
   * Rings"): spans separated by ONE joining word are offered joined, longest first, and the
   * executor takes the longest joined form the store actually knows (v1's B1: only the question's
   * framing is trimmed, never the inside of a name) */
  joinedAlts(spans, toks, used) {
    // any framing word can sit inside a name ("Murder Being Once Done", "And the Crowd Goes Wild",
    // "Stokke AS"): spans joined across one or two framing tokens, and spans extended by up to two
    // framing tokens on either side, are all offered; the executor keeps the longest the store knows
    const isJoin = i => i >= 0 && i < toks.length && !used[i] && L.FRAMING.has(toks[i]);
    const alts = [];
    const push = (text, start, end) => {
      if (text && !alts.some(a => a.text === text)) alts.push({ text, start, end });
      // and the same span as written, when punctuation inside it makes that a different key
      const written = this.rawSpan(start, end);
      if (written && written !== text && !alts.some(a => a.text === written)) alts.push({ text: written, start, end });
    };
    for (let i = 0; i < spans.length; i++) {
      let text = spans[i].text, start = spans[i].start, end = spans[i].end;
      for (let j = i + 1; j < spans.length; j++) {
        const gap = toks.slice(end, spans[j].start);
        if (gap.length >= 1 && gap.length <= 2 && gap.every((g, k) => isJoin(end + k))) { text += " " + gap.join(" ") + " " + spans[j].text; end = spans[j].end; push(text, start, end); }
        else break;
      }
      // extensions by adjacent framing tokens (leading "the"/"and the", trailing "as")
      for (let lead = 1; lead <= 2; lead++) {
        if (![...Array(lead).keys()].every(k => isJoin(start - 1 - k))) break;
        push(toks.slice(start - lead, end).join(" "), start - lead, end);
      }
      for (let tail = 1; tail <= 2; tail++) {
        if (![...Array(tail).keys()].every(k => isJoin(end + k))) break;
        push(toks.slice(start, end + tail).join(" "), start, end + tail);
      }
      // the possessive form of the span itself, and the span itself as written - never the bare
      // span: that would offer the OTHER spans of the question as the subject ("has" for
      // "what is the has part of pentachloroethane")
      const poss = this.restorePossessive(spans[i]);
      if (poss !== spans[i].text) push(poss, start, end);
      const written = this.rawSpan(spans[i].start, spans[i].end);
      if (written && written !== spans[i].text) push(written, spans[i].start, spans[i].end);
    }
    return alts.sort((a, b) => b.text.length - a.text.length);
  }

  plan(question) {
    const raw = String(question).trim();
    const ql = " " + normKey(raw.replace(/[?!.]+$/, "")) + " ";
    const toks = this.tokens(raw);
    const notes = [];
    if (!toks.length || !toks[0]) return { shape: "EMPTY", hops: [], entity: null, unplaced: [], notes: ["nothing to read"] };

    // COUNT: "how many types of X (have P)"
    const cm = ql.trim().match(L.COUNT_RE);
    if (cm) {
      let cls = cm[1], filter = null;
      const fm = cls.match(L.COUNT_FILTER_RE);
      if (fm) { cls = fm[1]; filter = fm[2]; }
      return { shape: "COUNT", hops: [], entity: cls, filter, unplaced: [], notes,
               restate: `count the recorded members of "${cls}"` + (filter ? ` and test each for "${filter}"` : "") };
    }

    const caps = this.capsOf(raw, toks);

    // EXISTS: "is there a X" - a question about whether anything named X is recorded, never a
    // question about one thing's relation; answered with the readings, no growth. Before ISA,
    // or "is there a favorite color" reads as is-a(there, favorite color).
    const xm = ql.trim().match(/^(?:is|are) there (?:a |an |any )?(.+)$/);
    if (xm) {
      return { shape: "EXISTS", hops: [], entity: xm[1], unplaced: [], notes: ["\"is there\": report what is recorded under that name"], restate: `is anything named "${xm[1]}" recorded?` };
    }
    // ISA: "is X a Y" / "is X a kind of Y" - checked before relation matching, because "is a" is
    // also a Wikidata alias of `instance of` and would otherwise be read as a relation
    const im = ql.trim().match(/^(?:is|are|was|were) (.+?) (?:a|an|a kind of|a type of|a sort of|kinds of|types of) (.+)$/);
    if (im) {
      const strip = s => s.replace(/^(?:a|an|the) /, "");
      const e1 = strip(im[1]), e2 = strip(im[2]);
      return { shape: "ISA", hops: L.ISA_RELS.slice(), entity: e1, entity2: e2, unplaced: [], notes: ["membership: instance of / subclass of / parent taxon, walked upward (the depth bound is stated in the transcript)"],
               restate: `is "${e1}" a "${e2}"?` };
    }
    // a subject that STARTS with a pronoun ("my name", "your age") is about the reader or the
    // system, which this store has no facts about - said plainly, never linked to a namesake
    // ("My Name", a 2004 album)
    {
      const { used: u0 } = this.findRelations(toks, ql, caps);
      const s0 = this.leftoverSpans(toks, u0);
      const pr = s0.find(s => L.PRONOUNS.has(s.text.split(" ")[0]));
      if (pr && s0.every(s => s === pr || L.PRONOUNS.has(s.text.split(" ")[0]))) {
        const w = pr.text.split(" ")[0];
        return { shape: "EMPTY", hops: [], entity: null, unplaced: [],
                 notes: [`"${pr.text}" is about ${/^(you|your|yours|yourself)$/.test(w) ? "this system" : "the person asking"}, and this store holds facts about the world only - no search could answer that honestly`],
                 restate: "about the reader or the system, not the world" };
      }
    }

    // WHEN: the verb picks the date property
    if (/^\s*when\b/.test(ql)) {
      const hit = L.WHEN_RELATIONS.find(w => w.re.test(ql));
      const { found, used } = this.findRelations(toks, ql, caps);
      const spans = this.leftoverSpans(toks, used).filter(s => !/^(when|was|did|is|were|born|die|died|founded|established|created|published|released|start|started|begin|began|end|ended)$/.test(s.text));
      const ent = spans.sort((a, b) => b.text.length - a.text.length)[0];
      return { shape: "WHEN", hops: hit ? [hit.pid] : [], entity: ent ? ent.text : null,
               unplaced: spans.filter(s => s !== ent).map(s => s.text), notes: hit ? [hit.why] : ["no date verb recognised - every recorded date of the subject will be shown"],
               restate: `when: ${hit ? (this.index.props[hit.pid]?.l || "P" + hit.pid) : "any date"} of "${ent ? ent.text : "?"}"` };
    }

    const { found, used } = this.findRelations(toks, ql, caps);
    const spans = this.leftoverSpans(toks, used);

    // WHERE: bare "where is X" -> location ladder; "where was X born" -> P19 via VERB_RELATIONS;
    // "where was the author of Hamlet born" -> author, then place of birth
    if (/^\s*where\b/.test(ql)) {
      const ent0 = spans.slice().sort((a, b) => b.text.length - a.text.length)[0];
      const ent = ent0 ? this.stripTypeWord(ent0) : null;
      const rels = found.filter(f => f.pid !== 276);
      const hops = rels.length ? this.hopOrder(rels, ent, toks) : L.WHERE_LADDER.slice();
      const chain = hops.map(p => this.index.props[typeof p === "object" ? p.pid : p]?.l || "P" + (typeof p === "object" ? p.pid : p));
      return { shape: "WHERE", hops, ladder: !rels.length, entity: ent ? ent.text : null, relWords: rels.flatMap(f => f.text.split(" ")),
               unplaced: spans.filter(s => s !== ent0).map(s => s.text), notes: rels.length ? rels.map(f => f.via) : ["bare where: try location, then administrative territory, then country"],
               restate: rels.length ? chain.reduce((acc, r) => `${r}( ${acc} )`, `"${ent ? ent.text : "?"}"`) : `where: location ladder of "${ent ? ent.text : "?"}"` };
    }
    // "the country whose capital is Ottawa": the relation runs BACKWARDS from the named thing
    // (capital of, the declared inverse, or the in-edges of that relation), and the noun before
    // "whose" is what the answer must be (a type hint checked in the transcript, not a hop)
    const wm = ql.trim().match(/^(.*?)\b(\w+) whose (.+?) (?:is|was|are|were) (.+)$/);
    if (wm) {
      const [, prefix, typeNoun, relText, entText] = wm;
      const relHit = this.relPhrases.get(normKey(relText)) || this.relPhrases.get(normKey(relText).replace(/ of$/, ""));
      if (relHit) {
        const ptoks = this.tokens(prefix); const { found: pf } = this.findRelations(ptoks, " " + ptoks.join(" ") + " ", new Set());
        const inverse = { pid: relHit.pid, inv: true };
        const hops = [inverse, ...pf.map(f => this.hopOf(f)).reverse()];
        const chain = hops.map(h => typeof h === "object" ? `${this.index.props[h.pid]?.l || "P" + h.pid} of` : (this.index.props[h]?.l || "P" + h));
        return { shape: hops.length > 1 ? "CHAIN" : "LOOKUP", hops, entity: entText, typeHint: typeNoun, relWords: [...relText.split(" "), ...pf.flatMap(f => f.text.split(" "))], unplaced: [],
                 notes: [`"whose ${relText} is ${entText}": walk ${this.index.props[relHit.pid]?.l || "P" + relHit.pid} backwards from "${entText}"; the result should be a ${typeNoun}`],
                 restate: chain.reduce((acc, r) => `${r}( ${acc} )`, `"${entText}"`) };
      }
    }

    // a pronoun is never the subject: the store has no representation of the reader or of itself
    const pron = spans.filter(s => s.text.split(" ").every(w => L.PRONOUNS.has(w)));
    if (pron.length && pron.length === spans.length) {
      return { shape: "EMPTY", hops: found.map(f => f.pid).reverse(), entity: null, unplaced: [],
               notes: [...notes, `"${pron[0].text}" refers to ${/^(you|your|yours|yourself)$/.test(pron[0].text) ? "this system" : "the person asking"}, and this store holds facts about the world only - no search could answer that honestly`],
               restate: "about the reader or the system, not the world" };
    }
    // ordinary: relations + one entity (or two -> PATH)
    const ents = spans.filter(s => !pron.includes(s)).sort((a, b) => b.text.length - a.text.length).map(s => this.stripTypeWord(s));
    const entity = ents[0] ? ents[0].text : null;
    const entity2 = ents[1] ? ents[1].text : null;
    const unplaced = ents.slice(entity2 ? 2 : 1).map(s => s.text);
    if (ents[0] && ents[0].typeWord) unplaced.push(ents[0].typeWord);   // a context word, reported as such
    // hop order from positions (see hopOrder): nested before the subject, sequential after it
    const hops = this.hopOrder(found, ents[0], toks);
    const relWords = found.flatMap(f => f.text.split(" "));
    for (const f of found) notes.push(`"${f.text}" -> ${this.index.props[f.pid]?.l || "P" + f.pid} (${f.via})`);
    if (!entity) return { shape: "EMPTY", hops, entity: null, unplaced, notes: [...notes, "no subject found in the question"], restate: "no subject" };
    if (!hops.length && entity2) return { shape: "PATH", hops: [], entity, entity2, unplaced, notes: [...notes, "two subjects, no relation: look for a recorded connection"], restate: `how are "${entity}" and "${entity2}" connected` };
    if (!hops.length) return { shape: "DEFINE", hops: [], entity, entity2: null, entityAlts: this.joinedAlts(spans, toks, used).map(a => a.text).filter(t => t !== entity), unplaced: entity2 ? [entity2, ...unplaced] : unplaced, notes: [...notes, "no relation named: describe the subject"], restate: `what is "${entity}"` };
    const chain = hops.map(p => this.index.props[typeof p === "object" ? p.pid : p]?.l || "P" + (typeof p === "object" ? p.pid : p));
    // hops run inner to outer, so the restatement nests the LAST hop outermost: capital( country( X ) )
    const restate = chain.reduce((acc, r) => `${r}( ${acc} )`, `"${entity}"`);
    if (ents[0] && ents[0].typeWord) notes.push(`"${ents[0].typeWord}" read as the kind of thing "${entity}" is - a context word, not part of the name`);
    const entityAlts = this.joinedAlts(spans, toks, used).map(a => a.text).filter(t => t !== entity);
    return { shape: hops.length > 1 ? "CHAIN" : "LOOKUP", hops, entity, entity2: entity2 || null, relWords, entityAlts,
             unplaced: entity2 ? [entity2, ...unplaced] : unplaced, notes, restate };
  }
}
