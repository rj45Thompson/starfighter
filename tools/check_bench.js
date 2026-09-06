#!/usr/bin/env node
// check_bench.js - THE BENCH AUDIT GATE.
//
// bench_results.json is the capability suite's committed record: 78 benches, each carrying an audit
// block of independently-named boolean flags plus a green verdict. This gate re-reads that record
// and refuses to let a red or a silently-shrunken suite through CI.
//
// It checks the record the way the suite's own law demands - on the FLAGS, not on the summary:
//   1. every bench claiming green must have flags_true === flags_total (a green with an unmet flag
//      is the exact failure the flag breakdown exists to catch);
//   2. no bench may be red;
//   3. the aggregate flag tally must match the sum of the per-bench tallies (a summary that has
//      drifted from its own rows is not evidence);
//   4. the suite must not shrink below the committed floor - deleting a failing bench is not a fix.
//
// Bench COUNT is asserted against a floor rather than an equality so that adding capabilities is
// never blocked, while quietly dropping one is.
//
// EXIT: 0 when the record is internally consistent and fully green; 1 otherwise.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'bench_results.json');
const MIN_BENCHES = 78;   // the committed floor - raise it when the suite genuinely grows

const errors = [];
const note = m => console.log(m);

if (!fs.existsSync(FILE)) {
  console.log('::error::bench_results.json is missing - the capability record is the evidence, it cannot be absent');
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.log(`::error file=bench_results.json::unparseable: ${e.message}`);
  process.exit(1);
}

const benches = doc.benches || {};
const names = Object.keys(benches);

// 4. suite size floor
if (names.length < MIN_BENCHES) {
  errors.push(`suite shrank to ${names.length} benches, below the committed floor of ${MIN_BENCHES}`);
}

// 1 + 2. per-bench: green, and every flag actually true
let flagsTrue = 0, flagsTotal = 0;
const red = [], partial = [];
for (const name of names) {
  const b = benches[name] || {};
  const t = b.flags_true || 0, n = b.flags_total || 0;
  flagsTrue += t; flagsTotal += n;

  if (!b.green) red.push(name);
  else if (n === 0) partial.push(`${name} (green with no flags to prove it)`);
  else if (t !== n) partial.push(`${name} (${t}/${n} flags true but marked green)`);
}
if (red.length) errors.push(`${red.length} red bench(es): ${red.join(', ')}`);
for (const p of partial) errors.push(`inconsistent verdict: ${p}`);

// 3. summary must agree with the rows it summarises
if (typeof doc.claims_total === 'number' && doc.claims_total !== flagsTrue) {
  errors.push(`claims_total says ${doc.claims_total} but the per-bench flags sum to ${flagsTrue}`);
}
if (typeof doc.suite === 'string') {
  const m = doc.suite.match(/^(\d+)\s*\/\s*(\d+)$/);
  const greenCount = names.length - red.length;
  if (m && (+m[1] !== greenCount || +m[2] !== names.length)) {
    errors.push(`suite field says ${doc.suite} but the rows are ${greenCount}/${names.length}`);
  }
}

note(`bench_results.json generated ${doc.generated || 'unknown'}`);
note(`${names.length} benches, ${names.length - red.length} green, ${flagsTrue}/${flagsTotal} audit flags true`);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## Capability bench audit\n\n` +
    `**${names.length - red.length}/${names.length}** benches green &middot; ` +
    `**${flagsTrue}/${flagsTotal}** audit flags true &middot; ` +
    `record generated ${doc.generated || 'unknown'}\n\n` +
    (errors.length
      ? errors.map(e => `- **${e}**`).join('\n') + '\n'
      : `No red benches, and every green bench has all of its flags true.\n`));
}

if (errors.length) {
  for (const e of errors) console.log(`::error file=bench_results.json::${e}`);
  console.log(`\nFAIL: ${errors.length} problem(s) in the bench record`);
  process.exit(1);
}
console.log('\nPASS: bench record is fully green and internally consistent');
