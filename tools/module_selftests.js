// module_selftests.js - run the node-safe module self-tests so the SCHEDULED watch_upgrades.cmd
// enforces them, not just an interactive sweep. Each listed module has a `require.main === module`
// harness that prints its results and `process.exit(1)` on any failure - so a regression (e.g. the
// conquest.js T11 slow-tick-error guard, or power_panel's power/shield-arc contract) fails the pass
// here instead of sitting unnoticed until someone happens to run the module by hand.
//
// EXCLUDED on purpose: inhabitant.js / speech_tier.js are browser-only (top-level addEventListener /
// location.search) and crash under node BY DESIGN, not on a regression; knowledge.js has no exit-1
// self-test. Add a module here only after confirming `node <mod>.js` exits non-zero on a planted failure.
//
//   node tools/module_selftests.js             # exit 1 and name any module whose self-test fails
//   node tools/module_selftests.js --self-test # prove a non-zero module exit is detected as a failure
const cp = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MODULES = ['conquest', 'power_panel', 'textquests', 'kripke_mind', 'sober_gate', 'tom_test', 'centroid_mind'];

function run(modPath, extraArgs) {
  const r = cp.spawnSync(process.execPath, [modPath].concat(extraArgs || []), { encoding: 'utf8', timeout: 60000 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  const lastLine = out.split('\n').filter(Boolean).pop() || '';
  return { code: r.status, lastLine };
}

function main() {
  if (process.argv.includes('--self-test')) {
    // the mechanism this guard depends on: a module that exits non-zero MUST be seen as a failure.
    const fail = run('-e', ['console.log("PLANTED FAIL"); process.exit(1)']);
    const ok = run('-e', ['console.log("PLANTED OK"); process.exit(0)']);
    const caught = fail.code === 1 && ok.code === 0;
    console.log(caught
      ? 'self-test PASS - a non-zero module exit is detected as a failure, a zero exit as a pass'
      : `self-test FAIL - detection is broken (fail.code=${fail.code}, ok.code=${ok.code})`);
    process.exit(caught ? 0 : 1);
  }

  let failed = 0;
  for (const m of MODULES) {
    const { code, lastLine } = run(path.join(ROOT, m + '.js'));
    if (code !== 0) { failed++; console.log(`  ${m}.js  FAIL (exit ${code})  ${lastLine.slice(0, 90)}`); }
    else console.log(`  ${m}.js  ok  ${lastLine.slice(0, 70)}`);
  }
  if (failed) { console.log(`module_selftests: FAIL - ${failed}/${MODULES.length} module self-test(s) failed`); process.exit(1); }
  console.log(`module_selftests: all ${MODULES.length} node-safe module self-tests pass.`);
  process.exit(0);
}
main();
