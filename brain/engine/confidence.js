/* confidence.js - families -> a measured probability, read from the curve the build measured on
 * THIS store (index.json -> curve, test half). Nothing here is a constant.
 */
const FAM_WIKIDATA = 1;

export function popcount(x) { let n = 0; x = x >>> 0; while (x) { n += x & 1; x >>>= 1; } return n; }

export function familiesOf(src, index) {
  // src bits -> family bits, using the same table 15_merge.py used (1,2,16 -> wikidata; 4 -> rebel; 8 -> dbpedia)
  // plus the run-time sources: 32 live wikidata.org -> wikidata family; 64 the reader -> 8; 128 derived -> 16
  let fam = 0;
  if (src & (1 | 2 | 16 | 32)) fam |= 1;
  if (src & 4) fam |= 2;
  if (src & 8) fam |= 4;
  if (src & 64) fam |= 8;
  if (src & 128) fam |= 16;
  // GAME TIER (starfighter brain, 2026-09-06): source bits from 256 up are the game's own canon families (novel, lore,
  // live game state), declared in that index's `families`; each counts as its own independent family
  for (let bit = 256; bit <= 4096; bit <<= 1) if (src & bit) fam |= bit;
  return fam;
}

const RUNTIME_SOURCES = { 32: "wikidata.org (fetched live)", 64: "the reader (taught)", 128: "derived by rule" };

export function sourceNames(src, index) {
  const out = [];
  for (const [bit, name] of Object.entries(index.sources)) if (src & Number(bit)) out.push(name);
  for (const [bit, name] of Object.entries(RUNTIME_SOURCES)) if (src & Number(bit)) out.push(name);
  return out;
}

/* Returns { k, wikidata, p, n, measured, basis } for one edge. */
export function edgeConfidence(src, index) {
  const fam = familiesOf(src, index);
  // the reader and derivation are not calibrated families: they never count toward k
  const k = popcount(fam & ~(FAM_WIKIDATA | 8 | 16));
  const wd = !!(fam & FAM_WIKIDATA);
  if (!wd && !k) {
    if (fam & 16) return { k: 0, wikidata: false, p: null, n: 0, measured: false, derived: true, basis: "derived by a declared rule from recorded facts - confidence is the product shown with the chain, not a measured curve value" };
    if (fam & 8) return { k: 0, wikidata: false, p: null, n: 0, measured: false, taught: true, basis: "taught by the reader - unverified; it will show a measured value only once an independent family agrees" };
  }
  const c = index.curve && index.curve.k && index.curve.k[String(k)] && index.curve.k[String(k)].test;
  if (k === 0) {
    return { k, wikidata: wd, p: wd ? null : 0, n: 0, measured: false,
             basis: wd ? "recorded in Wikidata; no independent family corroborates it (the curve measures agreement WITH Wikidata, so it cannot score Wikidata itself)"
                       : "no source at all - should not occur" };
  }
  if (!c || !c.measured) {
    return { k, wikidata: wd, p: null, n: c ? c.n : 0, measured: false,
             basis: `k=${k} independent famil${k === 1 ? "y" : "ies"}; not enough held-out cases to measure (n=${c ? c.n : 0} < ${index.curve.min_n})` };
  }
  return { k, wikidata: wd, p: c.p, n: c.n, measured: true,
           basis: c.basis || `k=${k} independent famil${k === 1 ? "y" : "ies"} -> ${(c.p * 100).toFixed(1)}% agreement with held-out Wikidata (n=${c.n.toLocaleString()})` };   // an index may state its own basis (the game tier's canon is true by construction, not a measured agreement)
}

/* A chain: the product of the hops the curve can score. A hop that rests on Wikidata alone has no
 * curve value (the curve measures agreement WITH Wikidata) - it is counted as "recorded, unscored"
 * rather than sinking the whole chain to "unmeasurable"; the count of such hops travels with the
 * number. A hop with no source at all (reader-taught, derived) leaves p null. */
export function chainConfidence(hops) {
  let p = 1, scored = 0, unscored = 0, unknown = 0, wd = 0, weakest = null;
  for (const h of hops) {
    if (h.conf.wikidata) wd++;
    if (h.conf.p != null) { p *= h.conf.p; scored++; if (!weakest || h.conf.p < weakest.conf.p) weakest = h; }
    else if (h.conf.wikidata) unscored++;
    else unknown++;
  }
  const ok = unknown === 0 && scored > 0;
  // wd: hops the reference source itself records - at equal curve value, a fact Wikidata records
  // outranks one only a text extractor asserts (the curve says how often the latter would agree)
  return { p: ok ? p : null, wd, allMeasured: unscored === 0 && unknown === 0, scored, unscored, unknown, weakest,
           note: "product assumes the hops are independent - an assumption, not a measurement" +
                 (unscored ? `; ${unscored} hop${unscored === 1 ? "" : "s"} rest${unscored === 1 ? "s" : ""} on Wikidata alone and ${unscored === 1 ? "is" : "are"} not scored (the curve cannot score Wikidata against itself)` : "") +
                 (unknown ? `; ${unknown} hop${unknown === 1 ? "" : "s"} taught or derived, unverified` : "") };
}
