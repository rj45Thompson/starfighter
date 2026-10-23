// rule_grader.js - grade the work against the rules in CLAUDE.md, and keep score on the rules themselves.
//
// Why this exists: CLAUDE.md says the agent that writes the code is also the one grading it. A rule nobody checks is
// a wish, so every rule there carries a tag ([R1], [R2], ...) and this file holds one cheap, mechanical test per tag
// - no model, no reading by eye, one line of output per rule. A rule with no test, or a test with no rule, fails this
// file: there has to be a test.
//
// Whether a rule HELPS or HURTS is kept in tools/rule_stats.json across runs:
//   flagged  distinct findings its test has ever raised
//   fixed    findings that went away while the file they were about still exists and this grader was unchanged
//            (the rule caught something and it got fixed - it helped)
//   gone     findings that went away for some other reason (file deleted, grader edited) - not counted as help
//   waived   findings marked a false alarm in tools/rule_waivers.json, with a reason (it cost attention for nothing)
//   reopened findings that came back after being fixed (the fix did not hold)
//   runs     distinct trees graded (commit, or commit+dirty) - re-running on the same tree does not count again
// and the verdict column reads them: HELPS, NOISY (mostly waived - fix the test or drop the rule), QUIET (never fired
// over 10+ graded trees), or NEW (not enough to say). The file is only rewritten when the score changes.
//
//   node tools/rule_grader.js              # grade, record stats, exit 1 on an open finding or an untested rule
//   node tools/rule_grader.js --list       # also name every open finding
//   node tools/rule_grader.js --no-record  # grade without touching rule_stats.json
//   node tools/rule_grader.js --self-test  # plant a violation for every rule and prove each test catches it
//
// Every run (not only --self-test) first plants a violation for each rule in memory and checks the test fires, so a
// green line here is never a test that cannot fail; a run where any test is BLIND records nothing, because a blind
// test would mark every finding it stopped seeing as resolved. A missing input (the scheduled runner, TASKS.md, the
// module list) is an ERROR, not an empty pass. A corrupt stats or waivers file fails the run instead of being replaced.
//
// R3 and R4 read prose, and only hold lines written AFTER the rule: a line counts as after when git blame puts it in
// the commit that added the rule's tag to CLAUDE.md or in a descendant of it, or it is not committed yet. That is
// ancestry, not clock time, so a backdated or rebased commit does not move a line across the line. If the history
// needed to decide is missing (no git, a shallow clone cut before the rule, a tree inside another repo) they FAIL -
// a check that silently stops checking is the thing R1 forbids.
//
// Known limits, so nobody mistakes them for coverage: the tests read source and prose, not behaviour (R1 cannot tell
// whether a failing exit is reachable, R3 cannot tell whether the quoted output is true, R2 trusts a self-test that
// says it planted something); R4 matches symbols per line, so one live symbol vouches for every citation on its line,
// and it cannot read a true negative claim ("there is NO `foo` in x.js:5") - waive those; R5 cannot tell a guard from
// a utility that exits 1 on bad arguments - waive or enroll it; a finding that goes away because its check was
// neutered (not deleted) still counts as fixed.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const STATS = 'tools/rule_stats.json';
const WAIVERS = 'tools/rule_waivers.json';
const CMD = 'tools/watch_upgrades.cmd';
const QUIET_RUNS = 10;
const SELFTEST_TIMEOUT_MS = 60000;   // same budget module_selftests.js gives a module
const ZERO = '0'.repeat(40);         // git blame's sha for a line not committed yet

// a failing exit: process.exit(1), exit(ok ? 0 : 1), exit(code), exitCode = 2 - anything but exit(0) / exit()
const FAIL_EXIT_JS = /process\.exit\(\s*(?!0?\s*\))|process\.exitCode\s*=\s*(?!0\b)/;
const FAIL_EXIT_PY = /sys\.exit\(\s*(?!0?\s*\))|return\s+[1-9]/;
// evidence in a claim: a backticked command, then -> (or prints / gives / exits ...) and what it printed
const EVIDENCE = /`(?:node|py|python3?|npm|npx|git|bash|sh|grep|rg|curl|cmd|pwsh|powershell)\s[^`]*`[^`\n]{0,4}(?:->|→|=>|\b(?:prints|printed|gives|gave|returns|returned|outputs|exits|exited)\b:?)\s*[^\s|]/;
const CITE = /(?<![\w.\/\\-])([A-Za-z0-9_.\/\\-]+\.(?:html|js|py)):(\d+)/g;
const CODE_SPAN = /`([^`\n]+)`/g;
const IDENT = /[A-Za-z_$][\w$]{2,}/g;
const KEYWORDS = new Set(('var let const function return if else for while new this true false null undefined typeof ' +
  'class extends import export default case break continue switch try catch finally throw await async yield delete ' +
  'void instanceof def self None True False elif lambda pass').split(' '));
// a line of watch_upgrades.cmd that runs a check: node / call node / py -3.13 ..., tools\x.js, tools/x.js, "%~dp0x.js"
const RUNS = /^\s*(?:call\s+)?(?:node(?:\.exe)?|py(?:thon3?)?(?:\.exe)?(?:\s+-[\d.]+)?)\s+"?(?:tools[\\/]|%~dp0)([\w.-]+\.(?:js|py))"?/i;

// ---- reading source ------------------------------------------------------------------------------------------------
// Two same-length views of JS source: `plain` has its comments blanked; `mask` also blanks the inside of every string,
// template and regex literal. Brackets, `if` and process.exit are looked for in `mask`, so "if(" or "{" inside a
// string, a regex such as /CFG\s*=\s*\{/, a `//` inside a string, or an exit that is only described in a comment or a
// string cannot fool them; text is read back from `plain` at the same index. Each of those fooled an earlier version.
function views(src) {
  const plain = src.split(''), mask = src.split('');
  const blank = (arr, a, b) => { for (let i = a; i < b; i++) if (arr[i] !== '\n') arr[i] = ' '; };
  let last = '';   // last significant code character: a regex literal can follow ( , = etc., a division cannot
  for (let k = 0; k < src.length; k++) {
    const c = src[k], d = src[k + 1];
    if (c === '/' && (d === '/' || d === '*')) {
      const e = d === '/' ? src.indexOf('\n', k) : src.indexOf('*/', k + 2);
      const end = e < 0 ? src.length : d === '/' ? e : e + 2;
      blank(plain, k, end); blank(mask, k, end); k = end - 1; continue;
    }
    let end = -1;
    if (c === '"' || c === "'" || c === '`') {
      for (let j = k + 1; j < src.length; j++) {
        if (src[j] === '\\') { j++; continue; }
        if (src[j] === c) { end = j; break; }
        if (src[j] === '\n' && c !== '`') break;
      }
    } else if (c === '/' && (!last || '(,=:[!&|?{};+-*%<>~^'.includes(last))) {
      let cls = false;
      for (let j = k + 1; j < src.length && src[j] !== '\n'; j++) {
        if (src[j] === '\\') { j++; continue; }
        if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) { end = j; break; }
      }
    }
    if (end > 0) { blank(mask, k + 1, end); k = end; last = 'a'; continue; }
    if (!/\s/.test(c)) last = c;
  }
  return { plain: plain.join(''), mask: mask.join('') };
}
// python is only read line by line: # comments dropped
const pyCode = src => src.split('\n').filter(l => !/^\s*#/.test(l)).map(l => l.replace(/(^|\s)#.*$/, '')).join('\n');
// index of the bracket closing the one at s[i] in a mask (no literals left to skip); -1 if unbalanced
function closing(s, i) {
  const open = s[i], close = open === '{' ? '}' : ')';
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === open) depth++;
    else if (s[k] === close && --depth === 0) return k;
  }
  return -1;
}
// what a normal run executes, as a mask: every `if (...) { }` whose condition is the --self-test flag (or a variable
// holding it) is blanked, so the planted-failure exit inside a self-test does not pass for the guard's own failing exit.
// A self-test written as a separate function is not recognised - its exit still counts.
function mainPath(src) {
  const v = views(src), mask = v.mask.split('');
  const flags = ['--self-test'].concat([...v.plain.matchAll(/(?:const|let|var)\s+(\w+)\s*=[^;\n]*--self-test/g)].map(m => m[1]));
  const isFlag = c => flags.some(f => (f[0] === '-' ? c.includes(f) : new RegExp('\\b' + f + '\\b').test(c)));
  const re = /\bif\s*\(/g;
  for (let h; (h = re.exec(v.mask));) {
    const p = h.index + h[0].length - 1, q = closing(v.mask, p);
    if (q < 0) continue;
    const b = q + 1 + v.mask.slice(q + 1).search(/\S/), e = v.mask[b] === '{' ? closing(v.mask, b) : -1;
    if (e < 0 || !isFlag(v.plain.slice(p, q + 1))) continue;
    for (let k = h.index; k <= e; k++) if (mask[k] !== '\n') mask[k] = ' ';
    re.lastIndex = e + 1;
  }
  return mask.join('');
}
const canFail = (file, src) => (file.endsWith('.py') ? FAIL_EXIT_PY.test(pyCode(src)) : FAIL_EXIT_JS.test(mainPath(src)));
const jsCode = src => views(src).plain;

// ---- the checks the unattended run trusts --------------------------------------------------------------------------
function enrolled(ctx) {
  const cmd = ctx.read(CMD);
  if (cmd == null) throw new Error(CMD + ' is missing - nothing says what the schedule runs');
  const lines = cmd.split(/\r?\n/), guards = [], ungated = [];
  lines.forEach((l, i) => {
    const m = l.match(RUNS);
    if (!m) return;
    const f = 'tools/' + m[1];
    guards.push(f);
    // its exit must be captured on the next line and checked before "all clear", or a failure is invisible
    const next = lines.slice(i + 1).find(x => x.trim()) || '';
    const v = next.match(/^\s*set\s+(\w+)=%errorlevel%\s*$/i);
    const gate = v && new RegExp('^\\s*if\\s+not\\s+"%' + v[1] + '%"\\s*==\\s*"0"\\s+exit\\b', 'i');
    if (!gate || !lines.some(x => gate.test(x))) ungated.push(f);
  });
  if (!guards.length) throw new Error(CMD + ' runs no checks that this grader can recognise');
  const ms = jsCode(ctx.read('tools/module_selftests.js') || '').match(/const MODULES = \[([\s\S]*?)\];/);
  const mods = ms ? [...ms[1].matchAll(/['"]([\w-]+)['"]/g)].map(m => m[1] + '.js') : [];
  if (!mods.length) throw new Error('tools/module_selftests.js MODULES list is missing or empty - no module would be checked');
  return { guards, ungated, mods };
}
function need(ctx, rel) {
  const s = ctx.read(rel);
  if (s == null) throw new Error(rel + ' is missing - this rule has nothing to read');
  return s;
}

// ---- one test per rule. Each returns [{id, why, subject}] - an empty list is a pass ---------------------------------
const RULES = {
  R1: {
    name: 'no check that cannot fail',
    test(ctx) {
      const { guards, mods } = enrolled(ctx);
      return guards.concat(mods).flatMap(f => {
        const src = ctx.read(f);
        if (src == null) return [{ id: 'R1:' + f, subject: f, why: 'enrolled but the file is missing' }];
        return canFail(f, src) ? [] : [{ id: 'R1:' + f, subject: f, why: 'no failing exit outside its self-test - it can only pass' }];
      });
    },
  },
  R2: {
    name: 'prove a check can go red',
    test(ctx) {
      return enrolled(ctx).guards.filter(f => f.endsWith('.js')).flatMap(f => {
        if (!jsCode(ctx.read(f) || '').includes('--self-test')) {
          return [{ id: 'R2:' + f, subject: f, why: 'no --self-test in its code (a comment mentioning one is not one)' }];
        }
        const r = ctx.selfTest(f);
        const why = r.code == null ? `--self-test did not finish in ${SELFTEST_TIMEOUT_MS / 1000}s`
          : r.code !== 0 ? `--self-test exits ${r.code} - the planted failure is not caught`
          : !/self-test|proven|planted/i.test(r.out) ? '--self-test exits 0 but never says it planted anything - the flag looks ignored'
          : null;
        return why ? [{ id: 'R2:' + f, subject: f, why }] : [];
      });
    },
  },
  R3: {
    name: 'report what you observed',
    // "done" is exactly what tools/upgrade_pass.py counts as done: a top-level `- [x]` line. The entry is that line plus
    // its indented continuation lines, and it is held to the rule when the `- [x]` line itself was written after it.
    test(ctx) {
      const lines = need(ctx, 'TASKS.md').split('\n');
      const after = ctx.after('TASKS.md', 'R3'), seen = {}, out = [];
      lines.forEach((l, i) => {
        const m = l.match(/^- \[x\]\s+(\S+)/);
        if (!m) return;
        seen[m[1]] = (seen[m[1]] || 0) + 1;
        let entry = l;
        for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) entry += '\n' + lines[j];
        if (!after[i] || EVIDENCE.test(entry)) return;
        out.push({ id: 'R3:TASKS.md:' + m[1] + (seen[m[1]] > 1 ? '#' + seen[m[1]] : ''), subject: 'TASKS.md',
          why: 'done, but quotes no `command` -> output' });
      });
      return out;
    },
  },
  R4: {
    name: 'fix earlier work that went wrong',
    // Symbols are the identifiers inside the line's code spans (`think()`, `var hid = S.nextId++`), matched per LINE
    // as tools/reanchor.py does: one live symbol on a line vouches for every citation on it. The line number is a hint
    // (upgrade_pass rewrites index.html while you work), but one past the end of the file is plainly stale. Fenced code
    // and URLs (http://host/app.js:8080) are not claims about this repo's lines.
    test(ctx) {
      const out = [], dup = new Set();
      for (const doc of ctx.list('.').filter(f => f.endsWith('.md'))) {
        const after = ctx.after(doc, 'R4');
        let fenced = false;
        (ctx.read(doc) || '').split('\n').forEach((l, i) => {
          if (/^\s*```/.test(l)) { fenced = !fenced; return; }
          if (fenced || !after[i]) return;
          const syms = [...l.matchAll(CODE_SPAN)].map(m => m[1]).filter(s => !/^[\w.\/\\-]+\.(?:html|js|py|md|json|cmd)(?::\d+)?$/.test(s))
            .flatMap(s => s.match(IDENT) || []).filter(t => !KEYWORDS.has(t));
          for (const m of l.matchAll(CITE)) {
            if (/[a-z][a-z0-9+.-]*:\/\/\S*$/i.test(l.slice(0, m.index) + m[1])) continue;   // the path ends inside a URL
            const file = ctx.resolve(m[1].replace(/\\/g, '/').replace(/^\/+/, '')), n = +m[2];
            const id = `R4:${doc}:${file || m[1]}:${n}`;
            if (dup.has(id)) continue;
            dup.add(id);
            const src = file && ctx.read(file);
            if (src == null) { out.push({ id, subject: doc, why: 'cites a file that does not exist' }); continue; }
            if (n > src.split('\n').length) { out.push({ id, subject: doc, why: `line ${n} is past the end of ${file} (${src.split('\n').length} lines)` }); continue; }
            if (!syms.length) { out.push({ id, subject: doc, why: 'bare line number - no `symbol` to re-check it against' }); continue; }
            if (!syms.some(s => new RegExp('(^|[^\\w$])' + s.replace(/\$/g, '\\$') + '(?![\\w$])').test(src))) {
              out.push({ id, subject: doc, why: `none of ${syms.slice(0, 3).join(', ')} is in ${file} any more - the claim went wrong` });
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
      const { guards, ungated } = enrolled(ctx);
      const hand = ctx.list('tools').filter(f => f.endsWith('.js')).flatMap(f => {
        if (!canFail(f, ctx.read('tools/' + f) || '') || guards.includes('tools/' + f)) return [];
        return [{ id: 'R5:tools/' + f, subject: 'tools/' + f, why: 'a check that only runs when someone runs it by hand' }];
      });
      return hand.concat(ungated.map(f => ({ id: 'R5:gate:' + f, subject: f, why: 'runs on the schedule, but its exit never fails the run' })));
    },
  },
};

// CLAUDE.md and RULES must name the same tags, one rule per tag: a rule with no test, two rules sharing one test, or a
// test for a rule that is gone, fails. The rules are the top-level bullets of the "In practice" section (a wrapped
// continuation belongs to its bullet); a tag anywhere else (prose, an example) is not a rule.
function untested(ctx) {
  const lines = (ctx.read('CLAUDE.md') || '').split(/\r?\n/);
  const start = lines.findIndex(l => /^In practice\b/.test(l));
  if (start < 0) return [{ id: 'META:no-rules', why: 'CLAUDE.md has no "In practice" rules section' }];
  const rules = [];
  for (const l of lines.slice(start + 1)) {
    if (/^#/.test(l)) break;
    if (/^[-*] /.test(l)) rules.push(l);
    else if (/^\s+\S/.test(l) && rules.length) rules[rules.length - 1] += ' ' + l.trim();
  }
  const count = {};
  for (const r of rules) for (const t of new Set([...r.matchAll(/\[(R\d+)\]/g)].map(m => m[1]))) count[t] = (count[t] || 0) + 1;
  const out = rules.filter(r => !/\[R\d+\]/.test(r)).map(r => ({ id: 'META:untagged', why: r.slice(0, 60) }));
  for (const t of Object.keys(count)) {
    if (!RULES[t]) out.push({ id: 'META:' + t, why: 'rule in CLAUDE.md with no test here' });
    else if (count[t] > 1) out.push({ id: 'META:' + t, why: `${count[t]} rules share one tag - each rule needs its own test` });
  }
  for (const t of Object.keys(RULES)) if (!count[t]) out.push({ id: 'META:' + t, why: 'test here for a rule CLAUDE.md no longer has' });
  return out;
}

// ---- the real repository -------------------------------------------------------------------------------------------
function git(args) {
  const r = cp.spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error('git ' + args[0] + ' failed: ' + (r.stderr || r.error || '').toString().trim().split('\n')[0]);
  return r.stdout;
}
function realCtx() {
  const read = rel => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; } };
  let repo = null, tracked = null;
  const memo = {};
  // the history R3/R4 need, checked once: this tree must BE the repository, and the rule commits must be in it
  function history() {
    if (repo) return repo;
    const top = git(['rev-parse', '--show-toplevel']).trim();
    // path.relative, not ===: on Windows git says D:/code/x and node says d:\code\x for the same folder
    if (path.relative(fs.realpathSync(top), fs.realpathSync(ROOT)) !== '') throw new Error(`this tree is inside another git repository (${top}) - its history is not this tree's`);
    const shallowFile = path.resolve(ROOT, git(['rev-parse', '--git-path', 'shallow']).trim());
    const shallow = new Set(fs.existsSync(shallowFile) ? fs.readFileSync(shallowFile, 'utf8').split(/\s+/).filter(Boolean) : []);
    return (repo = { shallow, rule: {} });
  }
  // the commits written at or after the rule: the one that added its tag to CLAUDE.md, and its descendants up to HEAD
  function afterSet(tag) {
    const h = history();
    if (h.rule[tag]) return h.rule[tag];
    const sha = git(['log', '--reverse', '--format=%H', '-S[' + tag + ']', '--', 'CLAUDE.md']).split('\n')[0].trim();
    if (sha && h.shallow.has(sha)) throw new Error(`shallow clone: the commit that added [${tag}] is cut off - run git fetch --unshallow`);
    const set = new Set(sha ? [sha].concat(git(['rev-list', '--ancestry-path', sha + '..HEAD']).split('\n').filter(Boolean)) : []);
    return (h.rule[tag] = set);
  }
  function blameShas(rel) {
    if (memo[rel]) return memo[rel];
    const text = read(rel) || '';
    const count = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    let shas;
    if (!git(['ls-files', '--', rel]).trim()) shas = Array(count).fill(ZERO);
    else {
      shas = [];
      let cur = null;
      for (const l of git(['blame', '--line-porcelain', '--', rel]).split('\n')) {
        const h = l.match(/^([0-9a-f]{40}) \d+ \d+/);
        if (h) cur = h[1];
        else if (l[0] === '\t') shas.push(cur);
      }
    }
    if (shas.length !== count || shas.some(s => !s)) throw new Error(`git blame gave ${shas.length} lines for ${rel}'s ${count}`);
    return (memo[rel] = shas);
  }
  return {
    read,
    list: dir => fs.readdirSync(path.join(ROOT, dir)),
    // a cited path that is not at the root may be elided (…\x.py); take it if exactly one repo file has that name
    resolve: rel => {
      if (fs.existsSync(path.join(ROOT, rel))) return rel;
      tracked = tracked || git(['ls-files', '--cached', '--others', '--exclude-standard']).split('\n').filter(Boolean);
      const hits = tracked.filter(f => f === rel || f.endsWith('/' + rel) || f.endsWith('/' + path.basename(rel)));
      return hits.length === 1 ? hits[0] : null;
    },
    selfTest: rel => {
      const r = cp.spawnSync(process.execPath, [path.join(ROOT, rel), '--self-test'], { cwd: ROOT, encoding: 'utf8', timeout: SELFTEST_TIMEOUT_MS });
      return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
    },
    after: (rel, tag) => { const set = afterSet(tag); return blameShas(rel).map(s => s === ZERO || set.has(s)); },
    tree: () => {
      let sha = '?';
      try {
        sha = git(['rev-parse', '--short', 'HEAD']).trim();
        const dirty = git(['status', '--porcelain']).split('\n').filter(l => l.trim() && !l.endsWith(STATS)).length;
        if (dirty) sha += '+dirty';
      } catch (e) { /* not a repo: '?' */ }
      return sha;
    },
  };
}

// ---- planted violations: a test that does not fire on its plant is blind ------------------------------------------
function fakeCtx(files, opts = {}) {
  return {
    read: rel => (rel in files ? files[rel] : null),
    list: dir => Object.keys(files).filter(f => path.dirname(f) === dir).map(f => path.basename(f)),
    resolve: rel => (rel in files ? rel : null),
    selfTest: rel => ({ code: 0, out: 'self-test PASS - planted', ...(opts.selfTest || {})[rel] }),
    after: rel => (files[rel] || '').split('\n').map(() => !opts.old),
  };
}
const gated = (f, v) => `node tools\\${f}\r\nset ${v}=%errorlevel%\r\n`;
const GATES = 'if not "%G%"=="0" exit /b %G%\r\nif not "%M%"=="0" exit /b %M%\r\n';
const CMD_OK = gated('g.js', 'G') + gated('module_selftests.js', 'M') + GATES;
const G_OK = "if (process.argv.includes('--self-test')) { plant(); process.exit(caught ? 0 : 1); }\nprocess.exit(bad ? 1 : 0);";
const BASE = {
  [CMD]: CMD_OK,
  'tools/g.js': G_OK,
  'tools/module_selftests.js': "const MODULES = ['m'];\nif (process.argv.includes('--self-test')) {}\nif (failed) process.exit(1);",
  'm.js': 'process.exit(ok ? 0 : 1);',
  'TASKS.md': '- [x] T1 done -> `node m.js` -> RESULT PASS',
  'a.md': 'see `process` at m.js:1',
};
const PLANTS = {
  R1: [{ ...BASE, 'm.js': 'console.log("PASS"); process.exit(0);' }, { ...BASE, 'm.js': '// on failure: process.exit(1)\nprocess.exit(0);' },
    { ...BASE, 'tools/g.js': "if (process.argv.includes('--self-test')) { process.exit(caught ? 0 : 1); }\nscan(); process.exit(0);" },
    { ...BASE, 'tools/g.js': "const st = process.argv.includes('--self-test');\nif (st) { process.exit(caught ? 0 : 1); }\nprocess.exit(0);" },
    { ...BASE, 'tools/g.js': "if (process.argv.indexOf('--self-test') >= 0) {\n  const at = src.search(/CFG\\s*=\\s*\\{/);\n  process.exit(caught ? 0 : 1);\n}\nscan(); process.exit(0);" },
    { ...BASE, 'tools/g.js': "const s = src.replace('if(x', 'y');\nif (process.argv.includes('--self-test')) {\n  scan('a = 1;   // a comment');\n  process.exit(caught ? 0 : 1);\n}\nprocess.exit(0);" },
    { ...BASE, 'm.js': "console.log('on failure we would process.exit(1)'); process.exit(0);" }],
  R2: [{ ...BASE, 'tools/g.js': 'process.exit(1);' }, { ...BASE, 'tools/g.js': '// run with --self-test\nprocess.exit(1);' },
    [BASE, { selfTest: { 'tools/g.js': { code: 1 } } }], [BASE, { selfTest: { 'tools/g.js': { code: null } } }],
    [BASE, { selfTest: { 'tools/g.js': { out: 'RESULT: PASS' } } }]],
  R3: [{ ...BASE, 'TASKS.md': '- [x] T2 done, trust me' }, { ...BASE, 'TASKS.md': '- [x] T2 done `node m.js` ->' }],
  R4: [{ ...BASE, 'a.md': 'see m.js:1' }, { ...BASE, 'a.md': 'see `goneSymbol` at m.js:1' }, { ...BASE, 'a.md': 'x.js:4 `a`' },
    { ...BASE, 'a.md': 'see `process` at m.js:99' }],
  R5: [{ ...BASE, 'tools/h.js': 'process.exit(1);' },
    { ...BASE, 'tools/h.js': 'process.exit(1);', [CMD]: CMD_OK + 'node tools\\h.js\r\n' },
    { ...BASE, 'tools/h.js': 'process.exit(1);', [CMD]: CMD_OK + gated('h.js', 'H') }],
};
// the clean base, plus rule-specific near misses that must NOT fire
const CLEAN = {
  R1: [BASE, { ...BASE, 'm.js': 'const code = bad ? 1 : 0; process.exit(code);' }],
  R2: [BASE],
  R3: [BASE, [{ ...BASE, 'TASKS.md': '- [x] T2 done, trust me' }, { old: true }],
    { ...BASE, 'TASKS.md': '- [x] T2 done\n  measured: `node m.js` printed RESULT PASS' }],
  R4: [BASE, [{ ...BASE, 'a.md': 'see m.js:1' }, { old: true }], { ...BASE, 'a.md': '`process()` at m.js:1' },
    { ...BASE, 'a.md': '(`var x = process.exit`, m.js:1)' },
    { ...BASE, 'a.md': 'served at http://host/app.js:8080' }, { ...BASE, 'a.md': '```\nsee x.js:3\n```' }],
  R5: [BASE, { ...BASE, 'tools/lib.js': 'module.exports = 1;' },
    { ...BASE, 'tools/h.js': 'process.exit(1);', [CMD]: CMD_OK + 'CALL NODE "%~dp0h.js"\r\nset H=%errorlevel%\r\nif not "%H%"=="0" exit /b %H%\r\n' }],
};
function plantsCaught() {
  const blind = [];
  const asCtx = p => (Array.isArray(p) ? fakeCtx(p[0], p[1]) : fakeCtx(p));
  for (const [k, rule] of Object.entries(RULES)) {
    const missed = (PLANTS[k] || []).filter(p => !rule.test(asCtx(p)).length).length;
    const falseAlarms = (CLEAN[k] || []).filter(p => rule.test(asCtx(p)).length).length;
    if (!PLANTS[k] || missed || falseAlarms) blind.push(`${k} ${PLANTS[k] ? `missed ${missed} plant(s), fired on ${falseAlarms} clean case(s)` : 'has no plant'}`);
  }
  const md = 'In practice:\n\n- **a** [R1]\n- b, a plain\n  bullet\n- c [R9]\n- d [R3]\n- e\n  wrapped [R3]\n\n## next\nprose [R2]';
  const meta = untested(fakeCtx({ 'CLAUDE.md': md })).map(f => f.id);
  if (['META:untagged', 'META:R9', 'META:R2', 'META:R3'].some(id => !meta.includes(id)) || meta.filter(id => id === 'META:untagged').length !== 1) {
    blind.push('META untagged/untested/shared/orphan not all caught: ' + meta.join(' '));
  }
  return blind;
}

// ---- stats ---------------------------------------------------------------------------------------------------------
// a missing file starts empty; a file that does not parse, or is not shaped like one, stops the run - replacing it
// would erase the score
function loadJson(rel, empty, shape) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return empty;
  let v;
  try { v = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { throw new Error(`${rel} is not valid JSON (${e.message.split('\n')[0]}) - fix or delete it; it was not overwritten`); }
  if (!shape(v)) throw new Error(`${rel} is not shaped like this grader's file - fix or delete it; it was not overwritten`);
  return v;
}
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const STATS_SHAPE = v => isObj(v) && isObj(v.rules) && isObj(v.items) && Array.isArray(v.history);
function record(stats, results, waivers, tree, at, version) {
  const newTree = stats.tree !== tree;
  stats.tree = tree;
  const graderChanged = stats.grader && stats.grader !== version;
  stats.grader = version;
  for (const [k, r] of Object.entries(results)) {
    const s = stats.rules[k] || (stats.rules[k] = { runs: 0, ms: 0 });
    if (newTree) { s.runs++; s.ms = r.ms; }
    const live = new Set(r.items.map(f => f.id));
    for (const f of r.items) {
      const it = stats.items[f.id];
      const status = waivers[f.id] ? 'waived' : 'open';
      if (!it) stats.items[f.id] = { rule: k, status, why: f.why, subject: f.subject, first: at, first_sha: tree, reopened: 0 };
      else {
        if (it.status === 'fixed') { it.reopened++; delete it.fixed; delete it.fixed_sha; }
        Object.assign(it, { status, why: f.why, subject: f.subject });
      }
    }
    for (const it of Object.values(stats.items)) {
      // only an OPEN finding can be fixed, and only if what it was about still exists and the grader did not change
      if (it.rule !== k || it.status !== 'open' || live.has(Object.keys(stats.items).find(id => stats.items[id] === it))) continue;
      const fixed = !graderChanged && (!it.subject || fs.existsSync(path.join(ROOT, it.subject)));
      Object.assign(it, { status: fixed ? 'fixed' : 'gone', [fixed ? 'fixed' : 'gone']: at, [fixed ? 'fixed_sha' : 'gone_sha']: tree });
    }
  }
  const open = {};
  for (const it of Object.values(stats.items)) if (it.status === 'open' && RULES[it.rule]) open[it.rule] = (open[it.rule] || 0) + 1;
  const last = stats.history[stats.history.length - 1];
  if (!last || JSON.stringify(last.open) !== JSON.stringify(open)) stats.history.push({ at, sha: tree, open });
}
function tally(stats, k) {
  const t = { fixed: 0, gone: 0, waived: 0, flagged: 0, reopened: 0 };
  for (const it of Object.values(stats.items)) {
    if (it.rule !== k) continue;
    t.flagged++; if (it.status in t) t[it.status]++; t.reopened += it.reopened || 0;
  }
  const runs = (stats.rules[k] || {}).runs || 0;
  t.verdict = t.waived >= 2 && t.waived > t.fixed ? 'NOISY - fix the test or drop the rule'
    : t.fixed ? 'HELPS' : !t.flagged && runs >= QUIET_RUNS ? 'QUIET' : 'NEW';
  return { ...t, runs };
}
function writeStats(stats) {
  const p = path.join(ROOT, STATS), text = JSON.stringify(stats, null, 1) + '\n';
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === text) return;
  fs.writeFileSync(p + '.tmp', text);
  fs.renameSync(p + '.tmp', p);   // never a half-written score, even if two runs overlap
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
  let waivers, stats;
  try {
    waivers = loadJson(WAIVERS, {}, isObj);
    stats = loadJson(STATS, null, STATS_SHAPE) || { note: 'written by tools/rule_grader.js - see its header', rules: {}, items: {}, history: [] };
  } catch (e) { console.log('rule_grader: FAIL - ' + e.message); process.exit(1); }
  // a waiver needs a reason; `_`-prefixed keys are notes
  for (const k of Object.keys(waivers)) if (k[0] === '_' || typeof waivers[k] !== 'string' || !waivers[k].trim()) delete waivers[k];

  const ctx = realCtx();
  const meta = untested(ctx);
  const results = {};
  let errors = 0;
  for (const [k, rule] of Object.entries(RULES)) {
    const s = Date.now();
    try { results[k] = { items: rule.test(ctx), ms: Date.now() - s }; }
    catch (e) { errors++; results[k] = { error: e.message.split('\n')[0], items: [], ms: Date.now() - s }; }
  }
  const ok = Object.fromEntries(Object.entries(results).filter(([, r]) => !r.error));
  const version = crypto.createHash('sha1').update(fs.readFileSync(__filename)).digest('hex').slice(0, 12);
  if (!blind.length) {
    record(stats, ok, waivers, ctx.tree(), new Date().toISOString().slice(0, 16), version);
    if (!argv.includes('--no-record')) writeStats(stats);
  }

  const lines = [`rule_grader: ${n} rules, plants caught ${n - blind.length}/${n}`];
  for (const b of blind) lines.push('  BLIND ' + b);
  if (blind.length) lines.push('  stats NOT recorded: a blind test would mark what it stopped seeing as resolved');
  for (const f of meta) lines.push(`  UNTESTED ${f.id}  ${f.why}`);
  let open = 0;
  const openBy = [], live = new Set();
  for (const [k, rule] of Object.entries(RULES)) {
    const r = results[k];
    if (r.error) { lines.push(`  ${k} ${rule.name.padEnd(33)} ERROR ${r.error}`); continue; }
    r.items.forEach(f => live.add(f.id));
    const mine = r.items.filter(f => !waivers[f.id]);
    const t = tally(stats, k);
    open += mine.length;
    if (mine.length) openBy.push(`${k}:${mine.length}`);
    const extra = (t.gone ? `  gone ${t.gone}` : '') + (t.reopened ? `  reopened ${t.reopened}` : '');
    lines.push(`  ${k} ${rule.name.padEnd(33)} open ${mine.length}  fixed ${t.fixed}  waived ${t.waived}${extra}  runs ${t.runs}  ${r.ms}ms  ${t.verdict}`);
    if (argv.includes('--list')) for (const f of mine) lines.push(`      ${f.id}  ${f.why}`);
  }
  const stale = Object.keys(waivers).filter(id => !live.has(id) && RULES[id.split(':')[0]] && !results[id.split(':')[0]].error);
  if (stale.length) lines.push(`  note: ${stale.length} waiver(s) match no finding any more, remove them: ${stale.slice(0, 3).join(', ')}`);
  const bad = blind.length + meta.length + errors + open;
  const why = [open && `${open} open (${openBy.join(' ')})`, meta.length && `${meta.length} untested`,
    blind.length && `${blind.length} blind`, errors && `${errors} errored`].filter(Boolean).join(', ');
  const hint = open && !argv.includes('--list') ? '; --list names them' : '';
  lines.push(`rule_grader: ${bad ? 'FAIL - ' + why + hint : 'all rules hold'}  [${Date.now() - t0}ms]`);
  console.log(lines.join('\n'));
  process.exit(bad ? 1 : 0);
}
main();
