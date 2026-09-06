#!/usr/bin/env node
// run_selftests.js - THE CI GATE for every self-verifying module in this repo.
//
// Each AGI module carries its own suite under `require.main === module` and is meant to be run as
// `node <module>.js`. This runner discovers them, runs them all, and decides the build.
//
// WHY THIS IS NOT JUST `node <file> && node <file> && ...`:
// A self-test that cannot fail is worse than no self-test - it reports green forever and the repo
// believes it is covered. Three modules in this tree (hullmodels, knowledge_hud, sound) print
// human-readable OK lines but never call process.exit(1), so a real regression inside them would
// still exit 0. So the runner judges each module on TWO independent signals and a module must clear
// BOTH:
//   1. EXIT CODE  - the module's own verdict, when it enforces one.
//   2. REPORTED COUNTS - the FAIL tally parsed out of its stdout, whatever format it prints in.
// A module that prints failures but exits 0 is reported as FALSE-GREEN and fails the build. This is
// the same law the gate modules apply to themselves: never let a soft check short-circuit a hard one.
//
// Modules that enforce no exit code at all are classified SMOKE rather than GATE. They still run and
// their output is still scanned, but the report names them so nobody mistakes their green for proof.
//
// OUTPUT: a table on stdout, ::error:: annotations for CI, a GitHub step-summary table when
// GITHUB_STEP_SUMMARY is set, and selftest-report.json for artifact upload.
// EXIT: 0 only when every module passes; 1 otherwise.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TIMEOUT_MS = 120000;

// Vendored third-party bundles - not ours, no self-tests, never run.
const VENDOR = new Set(['three.min.js', 'fflate.min.js', 'fbxloader.js']);

// ---- discovery: any top-level .js that runs a suite under require.main -------------------------
function discover() {
  return fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.js') && !VENDOR.has(f))
    .filter(f => fs.statSync(path.join(ROOT, f)).isFile())
    .map(f => ({ file: f, src: fs.readFileSync(path.join(ROOT, f), 'utf8') }))
    .filter(m => m.src.includes('require.main === module'))
    .map(m => ({
      file: m.file,
      // A module that never exits non-zero cannot fail on its own - classify it honestly.
      // Both forms count: process.exit(1) terminates immediately, process.exitCode = 1 sets the
      // status for a normal exit. Checking only the first misreports a real gate as smoke -
      // which is the mirror image of the false-green bug this runner exists to catch, so it
      // gets the same scrutiny.
      kind: /process\.exit\s*\(\s*1\s*\)|process\.exitCode\s*=\s*[1-9]/.test(m.src) ? 'gate' : 'smoke',
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

// ---- parse whatever tally the module printed ---------------------------------------------------
// The suites in this repo print in four different shapes; all four are read rather than
// standardised, because rewriting 22 working suites to satisfy a runner is the tail wagging the dog.
function parseCounts(out) {
  let m;
  // "TOTAL: 8  PASS: 8  FAIL: 0"
  if ((m = out.match(/TOTAL:\s*(\d+)\s+PASS:\s*(\d+)\s+FAIL:\s*(\d+)/))) {
    return { total: +m[1], pass: +m[2], fail: +m[3] };
  }
  // "=== 83 PASS, 0 FAIL ==="
  if ((m = out.match(/(\d+)\s+PASS,\s*(\d+)\s+FAIL/))) {
    return { total: +m[1] + +m[2], pass: +m[1], fail: +m[2] };
  }
  // "ALL 10 PASS"
  if ((m = out.match(/ALL\s+(\d+)\s+PASS/))) {
    return { total: +m[1], pass: +m[1], fail: 0 };
  }
  // no tally printed (smoke modules) - count nothing, but still scan for failure words below
  return null;
}

// A module with no tally is still failed if it announced a failure in prose.
// Anchoring FAIL to the start of a line is not enough: suites print trailing verdicts such as
// "  build() guards missing THREE: FAIL", where the word sits mid-line after a label. Match a
// standalone FAIL token anywhere, but require a word boundary on both sides so ordinary words
// (FAILURE, FAILED, failing) do not trip it.
function announcesFailure(out) {
  return /RESULT:\s*FAIL\b/.test(out) || /(^|[\s:>\-])FAIL(?![A-Za-z])/m.test(out);
}

// ---- run one module -----------------------------------------------------------------------------
function run(mod) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [mod.file], {
    cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS,
  });
  const ms = Date.now() - started;
  const out = (r.stdout || '') + (r.stderr || '');
  const counts = parseCounts(out);
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  const exitCode = timedOut ? null : r.status;

  const reasons = [];
  if (timedOut) reasons.push(`timed out after ${TIMEOUT_MS}ms`);
  else if (exitCode !== 0) reasons.push(`exit code ${exitCode}`);
  if (counts && counts.fail > 0) {
    reasons.push(`${counts.fail} failing assertion${counts.fail === 1 ? '' : 's'}`);
    // the case this runner exists for: the module reported failures but told CI everything was fine
    if (exitCode === 0) reasons.push('FALSE-GREEN: reported failures but exited 0');
  }
  if (!counts && announcesFailure(out)) reasons.push('announced failure in output');

  return {
    file: mod.file, kind: mod.kind, ms, exitCode,
    total: counts ? counts.total : null,
    pass: counts ? counts.pass : null,
    fail: counts ? counts.fail : null,
    ok: reasons.length === 0,
    reasons,
    // keep the tail of output for the artifact so a red build is diagnosable without a re-run
    tail: out.split('\n').filter(Boolean).slice(-25).join('\n'),
  };
}

// ---- report -------------------------------------------------------------------------------------
function main() {
  const mods = discover();
  if (!mods.length) {
    console.error('::error::no self-testing modules discovered - runner is misconfigured');
    process.exit(1);
  }

  console.log(`Running ${mods.length} self-testing modules (node ${process.version})\n`);
  const results = mods.map(m => {
    const r = run(m);
    const tally = r.total === null ? 'no tally' : `${r.pass}/${r.total}`;
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'}  ${r.file.padEnd(24)} ${String(tally).padStart(9)}  ` +
      `${String(r.ms + 'ms').padStart(7)}  ${r.kind}${r.ok ? '' : '  <- ' + r.reasons.join('; ')}`
    );
    return r;
  });

  const failed = results.filter(r => !r.ok);
  const assertions = results.reduce((n, r) => n + (r.total || 0), 0);
  const gates = results.filter(r => r.kind === 'gate').length;
  const smoke = results.filter(r => r.kind === 'smoke');

  console.log(
    `\n${results.length} modules  ${assertions} assertions  ` +
    `${gates} exit-code gates  ${smoke.length} smoke-only  ${failed.length} failing`
  );

  for (const r of failed) {
    console.log(`::error file=${r.file}::${r.file}: ${r.reasons.join('; ')}`);
  }
  // Not a build failure, but say it out loud every run so it never becomes invisible.
  for (const r of smoke) {
    console.log(
      `::warning file=${r.file}::${r.file} never calls process.exit(1) - its green is a smoke ` +
      `signal, not a verified pass`
    );
  }

  const report = {
    generated: new Date().toISOString(),
    node: process.version,
    modules: results.length,
    assertions,
    gates,
    smoke_only: smoke.map(r => r.file),
    failing: failed.length,
    results,
  };
  fs.writeFileSync(path.join(ROOT, 'selftest-report.json'), JSON.stringify(report, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map(r =>
      `| ${r.ok ? 'pass' : '**fail**'} | \`${r.file}\` | ${r.total === null ? '&ndash;' : r.pass + '/' + r.total} | ` +
      `${r.ms} ms | ${r.kind} | ${r.reasons.join('; ') || ''} |`
    ).join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## Module self-tests\n\n` +
      `**${assertions} assertions** across **${results.length} modules** ` +
      `(${gates} enforce an exit code, ${smoke.length} are smoke-only). ` +
      `**${failed.length} failing.**\n\n` +
      `| | Module | Assertions | Time | Kind | Notes |\n|---|---|---|---|---|---|\n${rows}\n`);
  }

  process.exit(failed.length ? 1 : 0);
}

main();
