// rule_grader.js - grade the work against the rules in CLAUDE.md, and keep score on the rules themselves.
//
// Why this exists: CLAUDE.md says the agent that writes the code is also the one grading it. A rule nobody checks is
// a wish, so every rule there carries a tag ([R1], [R2], ...) and this file holds one cheap, mechanical test per tag
// - no model, no reading by eye, one line of output per rule. A rule with no test, or a test with no rule, fails this
// file: there has to be a test.
//
// Whether a rule HELPS or HURTS is kept in tools/rule_stats.json across runs:
//   flagged  distinct findings its test has ever raised
//   fixed    findings that later disappeared - the rule caught something and it got fixed (it helped)
//   waived   findings marked a false alarm in tools/rule_waivers.json, with a reason (it cost attention for nothing)
//   reopened findings that came back after being fixed (the fix did not hold)
//   ms       what the test costs to run
// and the verdict column reads them: HELPS, NOISY (mostly waived - fix the test or drop the rule), QUIET (never fired
// in 10+ runs), or NEW (not enough runs to say).
//
//   node tools/rule_grader.js              # grade, record stats, exit 1 on an open finding or an untested rule
//   node tools/rule_grader.js --list       # also name every open finding
//   node tools/rule_grader.js --no-record  # grade without touching rule_stats.json
//   node tools/rule_grader.js --self-test  # plant a violation for every rule and prove each test catches it
//
// Every run (not only --self-test) first plants a violation for each rule in memory and checks the test fires, so a
// green line here is never a test that cannot fail. R3 and R4 read prose, and only hold lines written AFTER the rule
// was committed (by git blame) to it: a rule does not convict work done before it existed. If git is unavailable they
// FAIL rather than skip - a check that silently stops checking is the thing R1 forbids.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const STATS = 'tools/rule_stats.json';
const WAIVERS = 'tools/rule_waivers.json';
const CMD = 'tools/watch_upgrades.cmd';
const QUIET_RUNS = 10;

// a source line that can end the process with a failing code: process.exit(1), exit(ok ? 0 : 1), exitCode = 2 ...
const FAIL_EXIT_JS = /process\.exit(?:Code\s*=|\()[^;\n]*[1-9]/;
const FAIL_EXIT_PY = /sys\.exit\(\s*(?!0\s*\))[^)\s]|return\s+[1-9]/;
// evidence in a claim: a backticked command, then -> and what it printed
const EVIDENCE = /`(?:node|py|python3?|npm|npx|git|bash|sh)\s[^`]*`[^`\n]{0,4}(?:->|→)/;
const CITE = /\b([A-Za-z0-9_.\/-]+\.(?:html|js|py)):(\d+)/g;
const SYMBOL = /`([A-Za-z_$][A-Za-z0-9_$.]{2,})`/g;

// ---- the checks the unattended run trusts --------------------------------------------------------------------------
function enrolled(ctx) {
  const cmd = ctx.read(CMD) || '';
  const guards = [...cmd.matchAll(/^\s*(?:node|py[^\r\n]*?)\s+tools\\([\w.]+\.(?:js|py))/gm)].map(m => 'tools/' + m[1]);
  const ms = (ctx.read('tools/module_selftests.js') || '').match(/const MODULES = \[([^\]]*)\]/);
  const mods = ms ? [...ms[1].matchAll(/'([\w-]+)'/g)].map(m => m[1] + '.js') : [];
  return { guards, mods };
}
const canFail = (file, src) => (file.endsWith('.py') ? FAIL_EXIT_PY : FAIL_EXIT_JS).test(src);

// ---- one test per rule. Each returns [{id, why}] - an empty list is a pass ------------------------------------------
const RULES = {
  R1: {
    name: 'no check that cannot fail',
    test(ctx) {
      const { guards, mods } = enrolled(ctx);
      return guards.concat(mods).flatMap(f => {
        const src = ctx.read(f);
        if (src == null) return [{ id: 'R1:' + f, why: 'enrolled but the file is missing' }];
        return canFail(f, src) ? [] : [{ id: 'R1:' + f, why: 'no failing exit anywhere in it - it can only pass' }];
      });
    },
  },
  R2: {
    name: 'prove a check can go red',
    test(ctx) {
      return enrolled(ctx).guards.filter(f => f.endsWith('.js')).flatMap(f => {
        const src = ctx.read(f) || '';
        if (!src.includes('--self-test')) return [{ id: 'R2:' + f, why: 'no --self-test that plants a failure' }];
        const code = ctx.selfTest(f);
        return code === 0 ? [] : [{ id: 'R2:' + f, why: `--self-test exits ${code} - the planted failure is not caught` }];
      });
    },
  },
  R3: {
    name: 'report what you observed',
    test(ctx) {
      const lines = (ctx.read('TASKS.md') || '').split('\n');
      const times = ctx.blameTimes('TASKS.md'), since = ctx.since('R3'), seen = {}, out = [];
      lines.forEach((l, i) => {
        const m = l.match(/^- \[x\]\s+(\S+)/);
        if (!m) return;
        seen[m[1]] = (seen[m[1]] || 0) + 1;
        if (times[i] < since || EVIDENCE.test(l)) return;
        out.push({ id: 'R3:TASKS.md:' + m[1] + (seen[m[1]] > 1 ? '#' + seen[m[1]] : ''),
          why: 'done, but quotes no `command` -> output' });
      });
      return out;
    },
  },
  R4: {
    name: 'fix earlier work that went wrong',
    // Symbols are matched per LINE, as tools/reanchor.py does: one live symbol on a line vouches for every
    // citation on it. The first real-repo plant put a bare, a dead and a live citation on one line and this test
    // passed all three, so the plants in this file keep one citation per line and the limit is stated here.
    test(ctx) {
      const since = ctx.since('R4'), out = [], dup = new Set();
      for (const doc of ctx.list('.').filter(f => f.endsWith('.md'))) {
        const times = ctx.blameTimes(doc);
        (ctx.read(doc) || '').split('\n').forEach((l, i) => {
          if (times[i] < since) return;
          // a backticked file name is not a symbol: `combat_probe.js` would 'resolve' as js anywhere
          const syms = [...l.matchAll(SYMBOL)].map(m => m[1]).filter(t => !/\.(?:html|js|py|md|json|cmd)$/.test(t)).map(t => t.split('.').pop());
          for (const [, file, n] of l.matchAll(CITE)) {
            const id = `R4:${doc}:${file}:${n}`;
            if (dup.has(id)) continue;
            dup.add(id);
            const src = ctx.read(file);
            if (src == null) { out.push({ id, why: 'cites a file that does not exist' }); continue; }
            if (!syms.length) { out.push({ id, why: 'bare line number - no `symbol` to re-check it against' }); continue; }
            if (!syms.some(s => new RegExp('(^|[^\\w$])' + s.replace(/\$/g, '\\$') + '(?![\\w$])').test(src))) {
              out.push({ id, why: `none of ${syms.slice(0, 3).join(', ')} is in ${file} any more - the claim went wrong` });
            }
          }
        });
      }
      return out;
    },
  },
  R5: {
    name: 'same standard unwatched',
    test(ctx) {
      const { guards } = enrolled(ctx);
      return ctx.list('tools').filter(f => f.endsWith('.js')).flatMap(f => {
        const src = ctx.read('tools/' + f) || '';
        if (!canFail(f, src) || guards.includes('tools/' + f)) return [];
        return [{ id: 'R5:tools/' + f, why: 'a check that only runs when someone runs it by hand' }];
      });
    },
  },
};

// CLAUDE.md and RULES must name the same tags: a rule with no test, or a test for a rule that is gone, fails.
function untested(ctx) {
  const md = ctx.read('CLAUDE.md') || '';
  const bullets = md.split('\n').filter(l => /^- \*\*/.test(l));
  const tags = new Set([...md.matchAll(/\[(R\d+)\]/g)].map(m => m[1]));
  const out = bullets.filter(l => !/\[R\d+\]/.test(l)).map(l => ({ id: 'META:untagged', why: l.slice(0, 60) }));
  for (const t of tags) if (!RULES[t]) out.push({ id: 'META:' + t, why: 'rule in CLAUDE.md with no test here' });
  for (const t of Object.keys(RULES)) if (!tags.has(t)) out.push({ id: 'META:' + t, why: 'test here for a rule CLAUDE.md no longer has' });
  return out;
}

// ---- the real repository -------------------------------------------------------------------------------------------
function git(args) {
  const r = cp.spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error('git ' + args[0] + ' failed: ' + (r.stderr || r.error || '').toString().trim());
  return r.stdout;
}
function realCtx() {
  const blame = {}, since = {};
  const now = Math.floor(Date.now() / 1000);
  const ctx_read = rel => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; } };
  return {
    read: ctx_read,
    list: dir => fs.readdirSync(path.join(ROOT, dir)),
    selfTest: rel => cp.spawnSync(process.execPath, [path.join(ROOT, rel), '--self-test'],
      { cwd: ROOT, encoding: 'utf8', timeout: 120000 }).status,
    // the commit that first put the tag in CLAUDE.md; a tag not committed yet applies from now
    since: tag => since[tag] || (since[tag] =
      +git(['log', '--reverse', '--format=%ct', '-S[' + tag + ']', '--', 'CLAUDE.md']).split('\n')[0] || now),
    // committer time of every line; lines not committed yet, or a whole file git does not track yet, get now
    blameTimes: rel => blame[rel] || (blame[rel] = !git(['ls-files', '--', rel]).trim()
      ? (ctx_read(rel) || '').split('\n').map(() => now)
      : [...git(['blame', '--line-porcelain', '--', rel]).matchAll(/^committer-time (\d+)$/gm)].map(m => +m[1])),
  };
}

// ---- planted violations: a test that does not fire on its plant is blind ------------------------------------------
function fakeCtx(files, opts = {}) {
  return {
    read: rel => (rel in files ? files[rel] : null),
    list: dir => Object.keys(files).filter(f => path.dirname(f) === dir).map(f => path.basename(f)),
    selfTest: rel => (opts.selfTest || {})[rel] ?? 0,
    since: () => 1000,
    blameTimes: rel => (files[rel] || '').split('\n').map(() => (opts.old ? 1 : 2000)),
  };
}
const CMD_OK = 'node tools\\g.js\r\nnode tools\\module_selftests.js\r\n';
const BASE = {
  [CMD]: CMD_OK,
  'tools/g.js': "if (process.argv.includes('--self-test')) {}\nprocess.exit(bad ? 1 : 0);",
  'tools/module_selftests.js': "const MODULES = ['m'];\n// --self-test\nprocess.exit(1);",
  'm.js': 'process.exit(ok ? 0 : 1);',
  'TASKS.md': '- [x] T1 done -> `node m.js` -> RESULT PASS',
  'a.md': 'see `process` at m.js:1',
};
const PLANTS = {
  R1: [{ ...BASE, 'm.js': 'console.log("PASS"); process.exit(0);' }],
  R2: [{ ...BASE, 'tools/g.js': 'process.exit(1);' }, [BASE, { selfTest: { 'tools/g.js': 1 } }]],
  R3: [{ ...BASE, 'TASKS.md': '- [x] T2 done, trust me' }],
  R4: [{ ...BASE, 'a.md': 'see m.js:1' }, { ...BASE, 'a.md': 'see `goneSymbol` at m.js:1' }, { ...BASE, 'a.md': 'x.js:4 `a`' }],
  R5: [{ ...BASE, 'tools/h.js': 'process.exit(1);' }],
};
// the clean base, plus rule-specific near misses that must NOT fire
const CLEAN = {
  R1: [BASE], R2: [BASE], R5: [BASE, { ...BASE, 'tools/lib.js': 'module.exports = 1;' }],
  R3: [BASE, [{ ...BASE, 'TASKS.md': '- [x] T2 done, trust me' }, { old: true }]],
  R4: [BASE, [{ ...BASE, 'a.md': 'see m.js:1' }, { old: true }]],
};
function plantsCaught() {
  const blind = [];
  const asCtx = p => (Array.isArray(p) ? fakeCtx(p[0], p[1]) : fakeCtx(p));
  for (const [k, rule] of Object.entries(RULES)) {
    const missed = (PLANTS[k] || []).filter(p => !rule.test(asCtx(p)).length).length;
    const falseAlarms = (CLEAN[k] || []).filter(p => rule.test(asCtx(p)).length).length;
    if (!PLANTS[k] || missed || falseAlarms) blind.push(`${k} ${PLANTS[k] ? `missed ${missed} plant(s), fired on ${falseAlarms} clean case(s)` : 'has no plant'}`);
  }
  const md = '- **a** [R1]\n- **b**\n[R9]';
  const meta = untested(fakeCtx({ 'CLAUDE.md': md })).map(f => f.id);
  if (!meta.includes('META:untagged') || !meta.includes('META:R9') || !meta.includes('META:R2')) blind.push('META untagged/untested/orphan not all caught');
  return blind;
}

// ---- stats ---------------------------------------------------------------------------------------------------------
function loadJson(rel, empty) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { return empty; }
}
function record(stats, results, waivers, sha, at) {
  for (const [k, r] of Object.entries(results)) {
    const s = stats.rules[k] || (stats.rules[k] = { runs: 0, ms: 0 });
    s.runs++; s.ms += r.ms;
    const live = new Set(r.items.map(f => f.id));
    for (const f of r.items) {
      const it = stats.items[f.id];
      const status = waivers[f.id] ? 'waived' : 'open';
      if (!it) stats.items[f.id] = { rule: k, status, why: f.why, first: at, first_sha: sha, reopened: 0 };
      else {
        if (it.status === 'fixed') { it.reopened++; delete it.fixed; delete it.fixed_sha; }
        it.status = status; it.why = f.why;
      }
    }
    for (const [id, it] of Object.entries(stats.items)) {
      // only an OPEN finding can become fixed: a waived false alarm that goes away was never a catch
      if (it.rule === k && it.status === 'open' && !live.has(id)) Object.assign(it, { status: 'fixed', fixed: at, fixed_sha: sha });
    }
  }
  const open = {};
  for (const it of Object.values(stats.items)) if (it.status === 'open') open[it.rule] = (open[it.rule] || 0) + 1;
  const last = stats.history[stats.history.length - 1];
  if (!last || JSON.stringify(last.open) !== JSON.stringify(open)) stats.history.push({ at, sha, open });
}
function tally(stats, k) {
  const t = { open: 0, fixed: 0, waived: 0, flagged: 0, reopened: 0 };
  for (const it of Object.values(stats.items)) {
    if (it.rule !== k) continue;
    t.flagged++; t[it.status]++; t.reopened += it.reopened;
  }
  const runs = (stats.rules[k] || {}).runs || 0;
  t.verdict = t.waived >= 2 && t.waived > t.fixed ? 'NOISY - fix the test or drop the rule'
    : t.fixed ? 'HELPS' : !t.flagged && runs >= QUIET_RUNS ? 'QUIET' : 'NEW';
  return { ...t, runs };
}

function main() {
  const argv = process.argv.slice(2);
  const t0 = Date.now();
  const blind = plantsCaught();
  const n = Object.keys(RULES).length;
  if (argv.includes('--self-test')) {
    console.log(blind.length ? 'self-test FAIL - ' + blind.join('; ')
      : `self-test PASS - all ${n} rule tests and the untested-rule check caught their plants, quiet on clean and pre-rule cases`);
    process.exit(blind.length ? 1 : 0);
  }
  const ctx = realCtx();
  const meta = untested(ctx);
  const results = {};
  let errors = 0;
  for (const [k, rule] of Object.entries(RULES)) {
    const s = Date.now();
    try { results[k] = { items: rule.test(ctx), ms: Date.now() - s }; }
    catch (e) { errors++; results[k] = { error: e.message.split('\n')[0], items: [], ms: Date.now() - s }; }
  }
  const waivers = loadJson(WAIVERS, {});
  const stats = loadJson(STATS, null) || { note: 'written by tools/rule_grader.js - see its header', rules: {}, items: {}, history: [] };
  let sha = '?';
  try { sha = git(['rev-parse', '--short', 'HEAD']).trim(); } catch (e) { /* stats keep '?' */ }
  const ok = Object.fromEntries(Object.entries(results).filter(([, r]) => !r.error));
  record(stats, ok, waivers, sha, new Date().toISOString().slice(0, 16));
  if (!argv.includes('--no-record')) fs.writeFileSync(path.join(ROOT, STATS), JSON.stringify(stats, null, 1) + '\n');

  const lines = [`rule_grader: ${n} rules, plants caught ${n - blind.length}/${n}`];
  for (const b of blind) lines.push('  BLIND ' + b);
  for (const f of meta) lines.push(`  UNTESTED ${f.id}  ${f.why}`);
  let open = 0;
  const openBy = [];
  for (const [k, rule] of Object.entries(RULES)) {
    const r = results[k];
    if (r.error) { lines.push(`  ${k} ${rule.name.padEnd(33)} ERROR ${r.error}`); continue; }
    const t = tally(stats, k);
    open += t.open;
    if (t.open) openBy.push(`${k}:${t.open}`);
    lines.push(`  ${k} ${rule.name.padEnd(33)} open ${t.open}  fixed ${t.fixed}  waived ${t.waived}${t.reopened ? `  reopened ${t.reopened}` : ''}  runs ${t.runs}  ${r.ms}ms  ${t.verdict}`);
    if (argv.includes('--list')) for (const f of r.items) if (!waivers[f.id]) lines.push(`      ${f.id}  ${f.why}`);
  }
  const bad = blind.length + meta.length + errors + open;
  const why = [open && `${open} open (${openBy.join(' ')})`, meta.length && `${meta.length} untested`,
    blind.length && `${blind.length} blind`, errors && `${errors} errored`].filter(Boolean).join(', ');
  const hint = open && !argv.includes('--list') ? '; --list names them' : '';
  lines.push(`rule_grader: ${bad ? 'FAIL - ' + why + hint : 'all rules hold'}  [${Date.now() - t0}ms]`);
  console.log(lines.join('\n'));
  process.exit(bad ? 1 : 0);
}
main();
