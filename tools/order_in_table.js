// order_in_table.js - a hand-written `*_ORDER` array must be a SUBSET of the table it indexes.
//
// Why this exists: WEAPON_ORDER (index.html) is a hand-maintained, cost-sorted list of weapon keys;
// WEAPONS is the table those keys index. A key that is in WEAPON_ORDER but NOT in WEAPONS makes
// `WEAPONS[key]` undefined, and the shop / rank-gate then crashes on buy (e.g. `${W.n}` on undefined,
// and `weapon <key>` at index.html:5099 reads WEAPONS[key].dmg/.cost). HULL_ORDER vs HULLS is the same
// contract (the hull command does `HULLS[k].cost` at :4993). Two agents edit the weapon roster, so a
// rename or removal in the table that misses the order array is exactly the silent drift this catches -
// and it is a hard crash, not a soft one, so it is worth a guard beside cmd_shadow/cfg_dupes.
//
// The REVERSE direction (a table key with no order entry) is benign and sometimes intentional: `flame`
// is a Hegemon-only weapon deliberately left out of the buyable order (comment at the WEAPON_ORDER def).
// So a table-key-not-in-order is reported as INFO, never a failure; only order-key-not-in-table fails.
//
//   node tools/order_in_table.js             # exit 1 and name any order key missing from its table
//   node tools/order_in_table.js --self-test # plant an order key with no table entry; the check MUST catch it
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BS = String.fromCharCode(92);
const PAIRS = [
  { order: 'WEAPON_ORDER', table: 'WEAPONS', benignOk: ['flame'] }, // flame = Hegemon-only, deliberately unbuyable
  { order: 'HULL_ORDER',   table: 'HULLS',   benignOk: [] },
];

// depth-1 `key:` names inside the object literal whose opening `{` is at `open`, skipping strings and
// both comment forms and any nested {}/[]/() (same robust walker as save_symmetry.js).
function topKeysOfBlock(src, open) {
  const keys = []; let depth = 0; const n = src.length;
  for (let i = open; i < n; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < n && src[i] !== q) { if (src[i] === BS) i++; i++; } continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 1; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; if (depth === 0) break; continue; }
    if (depth === 1 && /[A-Za-z_$]/.test(c) && (i === 0 || /[,{\s]/.test(src[i - 1]))) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(src.slice(i, i + 60));
      if (m) { keys.push(m[1]); i += m[0].length - 1; }
    }
  }
  return keys;
}
function tableKeys(src, name) {
  const decl = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*\\{');
  const m = decl.exec(src);
  if (!m) return null;
  return topKeysOfBlock(src, src.indexOf('{', m.index));
}
// the string keys of `const NAME=[ '...','...' ]` (order arrays are flat string lists; a ']' never
// appears inside a key, so the first ']' closes the array).
function orderKeys(src, name) {
  const decl = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*\\[');
  const m = decl.exec(src);
  if (!m) return null;
  const open = src.indexOf('[', m.index), close = src.indexOf(']', open);
  if (open < 0 || close < 0) return null;
  return src.slice(open + 1, close).split(',').map(s => s.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean);
}

function analyse(src) {
  const rows = [], errors = [];
  for (const p of PAIRS) {
    const order = orderKeys(src, p.order), table = tableKeys(src, p.table);
    if (order == null) { errors.push(`${p.order} array not found`); continue; }
    if (table == null) { errors.push(`${p.table} table not found`); continue; }
    const tset = new Set(table), oset = new Set(order);
    const missing = order.filter(k => !tset.has(k));                       // FAIL: order key with no table entry -> crash
    const unlisted = table.filter(k => !oset.has(k) && !p.benignOk.includes(k)); // INFO: table key not offered in order
    rows.push({ orderName: p.order, tableName: p.table, order, table, missing, unlisted });
  }
  return { rows, errors };
}

function main() {
  let src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  if (process.argv.includes('--self-test')) {
    // plant an order key that has no table entry; the check MUST flag it.
    const planted = src.replace(/(const\s+WEAPON_ORDER\s*=\s*\[)/, "$1'__NO_SUCH_WEAPON__',");
    const r = analyse(planted);
    const row = r.rows.find(x => x.orderName === 'WEAPON_ORDER');
    const caught = !!row && row.missing.includes('__NO_SUCH_WEAPON__');
    console.log(caught
      ? 'self-test PASS - the planted order-key-with-no-table-entry (__NO_SUCH_WEAPON__) was caught'
      : 'self-test FAIL - a planted order key with no table entry went unnoticed, this checker proves nothing');
    process.exit(caught ? 0 : 1);
  }

  const r = analyse(src);
  if (r.errors.length) { console.log('order_in_table: ' + r.errors.join('; ')); process.exit(2); }
  const bad = r.rows.filter(x => x.missing.length);
  for (const row of r.rows) {
    const info = row.unlisted.length ? `  [in ${row.tableName} but not offered in ${row.orderName}: ${row.unlisted.join(', ')}]` : '';
    if (!row.missing.length) console.log(`${row.orderName} (${row.order.length}) is a subset of ${row.tableName} (${row.table.length}) - all order keys resolve.${info}`);
  }
  if (!bad.length) { process.exit(0); }
  console.log('order_in_table: FAIL - an order key has no entry in its table (TABLE[key] is undefined -> crash on use):');
  for (const row of bad) for (const k of row.missing) console.log(`  ${row.orderName} lists "${k}" but ${row.tableName} has no such key`);
  process.exit(1);
}
main();
