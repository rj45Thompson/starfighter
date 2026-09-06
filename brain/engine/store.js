/* store.js - read access to the static store (site/data). Runs in node and in the browser: the
 * two byte loaders are injected. Every shard fetch is reported through onEvent so the page can
 * show it - a trace line here is emitted by the code that did the fetch, never narrated.
 *
 *   const store = new Store({ base, loadGz, loadJson, onEvent });
 *   await store.init();
 *   await store.entity(3141)      -> record or null       (e shards, key qid)
 *   await store.candidates(key)   -> [[qid,deg,kind,desc?]...] or []   (a shards)
 *   await store.members(qid, pid) -> {n, m:[[child,deg,label]...]} or null   (m shards)
 *   await store.concept(term)     -> {n, e:[[rel,other,w,dir]...]} or null   (c shards)
 *   await store.mightExist(key)   -> false = PROVEN absent (bloom, zero false negatives)
 */
import { normKey, shardOfKey, shardOfQid, bloomPositions } from "./norm.js";
import { edgeConfidence } from "./confidence.js";

const CFG = { CACHE_SHARDS: 96 };

export class Store {
  constructor({ base, loadGz, loadJson, onEvent, overlay }) {
    this.base = base.replace(/\/?$/, "/");
    this.loadGz = loadGz;       // (url) -> Promise<string>  (gunzipped text)
    this.loadJson = loadJson;   // (url) -> Promise<object>
    this.onEvent = onEvent || (() => {});
    this.overlay = overlay || null;   // learned facts (engine/learn.js Overlay), read on every lookup
    this.cache = new Map();     // "e/017" -> parsed shard
    this.index = null; this.bloom = null; this.bloomBits = null; this.propTypes = null;
    this.fetches = 0; this.bytes = 0;
  }

  async init() {
    const t = Date.now();
    this.index = await this.loadJson(this.base + "index.json");
    this.bloom = this.index.bloom;
    this.onEvent({ kind: "fetch", what: "index.json", ms: Date.now() - t });
    try { this.propTypes = await this.loadJson(this.base + "prop_types.json"); }
    catch (err) { this.propTypes = null; this.onEvent({ kind: "note", what: "prop_types.json not available - the CONTEXT step cannot use measured subject types: " + err.message }); }
    return this.index;
  }

  get nshard() { return this.index.nshard; }
  prop(pid) { return this.index.props[String(pid)] || null; }
  propLabel(pid) { const p = this.prop(pid); return p && p.l ? p.l : "P" + pid; }
  confOf(src) { return edgeConfidence(src, this.index); }

  async shard(sub, n) {
    const key = sub + "/" + String(n).padStart(3, "0");
    if (this.cache.has(key)) { const v = this.cache.get(key); this.cache.delete(key); this.cache.set(key, v); return v; }
    const t = Date.now();
    const text = await this.loadGz(this.base + key + ".json.gz");
    const data = JSON.parse(text);
    this.fetches++; this.bytes += text.length;
    this.onEvent({ kind: "fetch", what: key, ms: Date.now() - t, chars: text.length, keys: Object.keys(data).length });
    this.cache.set(key, data);
    if (this.cache.size > CFG.CACHE_SHARDS) this.cache.delete(this.cache.keys().next().value);
    return data;
  }

  async entity(qid) {
    qid = Number(qid);
    // negative ids are reader-created things: they live in the overlay only, there is no shard
    const d = qid < 0 ? {} : await this.shard("e", shardOfQid(qid, this.nshard));
    const r = d[String(qid)];
    const ov = this.overlay;
    const oe = ov ? ov.entities[qid] : null;
    const oo = ov ? ov.outOf(qid) : [], oi = ov ? ov.inOf(qid) : [], ol = ov ? ov.litsOf(qid) : [];
    if (!r && !oe && !oo.length && !oi.length && !ol.length) return null;
    const rec = { qid, label: (r && r.l) || (oe && oe.l) || null, desc: (r && r.d) || (oe && oe.d) || null,
                  aliases: (r && r.a) || (oe && oe.a) || [], aliasTotal: (r && (r.an || (r.a || []).length)) || 0,
                  types: (r && r.t) || [], classes: (r && r.c) || [], out: (r && r.o) ? r.o.slice() : [], inn: (r && r.i) ? r.i.slice() : [],
                  inTotal: (r && r.in) || {}, lits: (r && r.v) ? r.v.slice() : [], learned: !r };
    // learned facts join the record with their own source bits, so every reader sees provenance
    for (const f of oo) { rec.out.push([f.p, f.o, f.src, f.sup || 1, f.olabel || (ov.entities[f.o] && ov.entities[f.o].l) || null, f.how]); if (f.p === 31) rec.types.push(f.o); if (f.p === 279) rec.classes.push(f.o); }
    for (const f of oi) rec.inn.push([f.p, f.s, f.src, f.sup || 1, (ov.entities[f.s] && ov.entities[f.s].l) || null, f.how]);
    for (const f of ol) rec.lits.push([f.p, f.iso, f.value, f.src, f.how, f.asof || null]);
    return rec;
  }

  async candidates(text) {
    const key = normKey(text);
    if (!key) return [];
    const d = await this.shard("a", shardOfKey(key, this.nshard));
    const base = (d[key] || []).map(c => ({ qid: c[0], deg: c[1], kind: c[2], desc: c[3] || null }));
    if (this.overlay) {
      const seen = new Set(base.map(c => c.qid));
      for (const c of this.overlay.aliasesFor(key)) if (!seen.has(c.qid)) base.push(c);
    }
    return base;
  }

  async members(qid, pid) {
    const d = await this.shard("m", shardOfQid(qid, this.nshard));
    const r = d[String(qid)];
    if (!r || !r[String(pid)]) return null;
    const x = r[String(pid)];
    return { n: x.n, m: x.m.map(y => ({ qid: y[0], deg: y[1], label: y[2] })) };
  }

  async concept(term) {
    const key = normKey(term);
    if (!key) return null;
    const d = await this.shard("c", shardOfKey(key, this.nshard));
    const r = d[key];
    return r ? { n: r.n, e: r.e.map(y => ({ rel: y[0], other: y[1], w: y[2], dir: y[3] })) } : null;
  }

  async mightExist(text) {
    const key = normKey(text);
    if (!key) return false;
    if (!this.bloomBits) {
      const t = Date.now();
      const raw = await this.loadGz(this.base + "bloom.bin.gz", true);   // true = bytes
      this.bloomBits = raw;
      this.onEvent({ kind: "fetch", what: "bloom.bin.gz", ms: Date.now() - t, chars: raw.length });
    }
    for (const pos of bloomPositions(key, this.bloom.m, this.bloom.k)) {
      if (!(this.bloomBits[pos >> 3] & (1 << (pos & 7)))) return false;
    }
    return true;
  }
}

/* Node loaders (used by the test harness). The browser page defines its own with fetch +
 * DecompressionStream; both must return the same strings. */
export async function nodeLoaders(dir) {
  const fs = await import("node:fs");
  const zlib = await import("node:zlib");
  const path = await import("node:path");
  const local = (url) => path.default.join(dir, url.replace(/^.*?data\//, ""));
  return {
    base: "data/",
    loadJson: async (url) => JSON.parse(fs.default.readFileSync(local(url), "utf8")),
    loadGz: async (url, bytes) => {
      const buf = zlib.default.gunzipSync(fs.default.readFileSync(local(url)));
      return bytes ? new Uint8Array(buf) : buf.toString("utf8");
    },
  };
}
