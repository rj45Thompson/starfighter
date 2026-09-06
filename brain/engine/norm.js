/* norm.js - the ONE normalisation and the ONE hash, shared by the build (Python) and the engine.
 * build/10_link_names.py::norm_key and build/30_export.py::fnv1a must produce byte-identical
 * results; test/norm.test.mjs checks both against samples the build wrote. */

const OUTER = /^[ .,;:!?'"()\[\]]+|[ .,;:!?'"()\[\]]+$/g;

export function normKey(s) {
  if (s == null) return null;
  let t = String(s).normalize("NFKC").toLowerCase();
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(OUTER, "");
  return t || null;
}

/* 32-bit FNV-1a over UTF-16 code units (charCodeAt), matching Python's utf-16-le pairs. */
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const shardOfKey = (key, n) => fnv1a(key) % n;
export const shardOfQid = (qid, n) => Number(qid) % n;

export function bloomPositions(key, m, k) {
  const h1 = fnv1a(key), h2 = (fnv1a(key + "#") | 1) >>> 0;
  const out = [];
  for (let i = 0; i < k; i++) out.push(Number((BigInt(h1) + BigInt(i) * BigInt(h2)) & 0xffffffffn) % m);
  return out;
}
